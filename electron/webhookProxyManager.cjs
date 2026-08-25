const http = require('http');
const https = require('https');
const { URL } = require('url');

// Ring buffer of events per project: projectId -> Array<WebhookEvent>
const projectEvents = new Map();
const activeInterceptors = new Map(); // projectId -> { server, port, targetPort }
const MAX_EVENTS_PER_PROJECT = 200;

/**
 * Obtiene el historial de eventos interceptados para un proyecto
 */
function getWebhookEvents(projectId) {
  return projectEvents.get(projectId) || [];
}

/**
 * Limpia el historial de eventos para un proyecto
 */
function clearWebhookEvents(projectId) {
  projectEvents.set(projectId, []);
  return { success: true };
}

/**
 * Agrega un evento al almacén en memoria
 */
function recordEvent(projectId, eventObj) {
  let list = projectEvents.get(projectId) || [];
  list.unshift(eventObj); // Más reciente primero
  if (list.length > MAX_EVENTS_PER_PROJECT) {
    list = list.slice(0, MAX_EVENTS_PER_PROJECT);
  }
  projectEvents.set(projectId, list);
}

/**
 * Inicia o retorna el proxy interceptor para un proyecto.
 * @param {string} projectId 
 * @param {number} targetPort - Puerto local del servidor real (ej: 3000)
 * @param {function} emitEvent - Callback para emitir evento a la UI
 * @returns {Promise<{ port: number }>} Puerto en el que escucha el interceptor
 */
function ensureInterceptor(projectId, targetPort, emitEvent) {
  return new Promise((resolve, reject) => {
    if (activeInterceptors.has(projectId)) {
      const existing = activeInterceptors.get(projectId);
      existing.targetPort = targetPort;
      return resolve({ port: existing.port });
    }

    const server = http.createServer((req, res) => {
      const startTime = Date.now();
      const chunks = [];

      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => {
        const rawBody = Buffer.concat(chunks).toString('utf-8');
        let parsedBody = rawBody;
        try {
          if (rawBody && (req.headers['content-type'] || '').includes('application/json')) {
            parsedBody = JSON.parse(rawBody);
          }
        } catch (e) {
          parsedBody = rawBody;
        }

        const currentTargetPort = activeInterceptors.get(projectId)?.targetPort || targetPort;

        // Opciones para reenviar al servidor local real
        const forwardOptions = {
          hostname: '127.0.0.1',
          port: currentTargetPort,
          path: req.url,
          method: req.method,
          headers: {
            ...req.headers,
            host: `localhost:${currentTargetPort}`,
            'x-forwarded-for': req.socket.remoteAddress || '127.0.0.1',
            'x-lummo-interceptor': 'v3.0'
          }
        };

        const proxyReq = http.request(forwardOptions, (proxyRes) => {
          const respChunks = [];
          proxyRes.on('data', (c) => respChunks.push(c));
          proxyRes.on('end', () => {
            const durationMs = Date.now() - startTime;
            const rawRespBody = Buffer.concat(respChunks).toString('utf-8');
            let parsedRespBody = rawRespBody;
            try {
              if (rawRespBody && (proxyRes.headers['content-type'] || '').includes('application/json')) {
                parsedRespBody = JSON.parse(rawRespBody);
              }
            } catch (e) {
              parsedRespBody = rawRespBody;
            }

            const eventObj = {
              id: 'wh_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
              projectId,
              timestamp: new Date().toISOString(),
              method: req.method,
              url: req.url,
              path: req.url.split('?')[0],
              headers: req.headers,
              body: parsedBody,
              rawBody,
              statusCode: proxyRes.statusCode || 200,
              statusMessage: proxyRes.statusMessage || 'OK',
              responseHeaders: proxyRes.headers,
              responseBody: parsedRespBody,
              durationMs,
              clientIp: req.socket.remoteAddress || '127.0.0.1',
              isReplay: false
            };

            recordEvent(projectId, eventObj);
            if (typeof emitEvent === 'function') {
              emitEvent(projectId, eventObj);
            }

            // Responder al cliente original (Stripe, GitHub, etc.)
            res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
            res.end(rawRespBody);
          });
        });

        proxyReq.on('error', (err) => {
          const durationMs = Date.now() - startTime;
          const eventObj = {
            id: 'wh_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            projectId,
            timestamp: new Date().toISOString(),
            method: req.method,
            url: req.url,
            path: req.url.split('?')[0],
            headers: req.headers,
            body: parsedBody,
            rawBody,
            statusCode: 502,
            statusMessage: 'Bad Gateway (Servidor local no responde)',
            responseHeaders: { 'content-type': 'application/json' },
            responseBody: { error: 'No se pudo conectar con el servidor local en puerto ' + currentTargetPort, detail: err.message },
            durationMs,
            clientIp: req.socket.remoteAddress || '127.0.0.1',
            isReplay: false
          };

          recordEvent(projectId, eventObj);
          if (typeof emitEvent === 'function') {
            emitEvent(projectId, eventObj);
          }

          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Bad Gateway', message: err.message }));
        });

        if (rawBody) {
          proxyReq.write(rawBody);
        }
        proxyReq.end();
      });
    });

    // Escuchar en un puerto libre automático (puerto 0)
    server.listen(0, '127.0.0.1', () => {
      const assignedPort = server.address().port;
      activeInterceptors.set(projectId, { server, port: assignedPort, targetPort });
      resolve({ port: assignedPort });
    });

    server.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Detiene el interceptor de un proyecto
 */
function stopInterceptor(projectId) {
  if (activeInterceptors.has(projectId)) {
    const { server } = activeInterceptors.get(projectId);
    try {
      server.close();
    } catch (e) {}
    activeInterceptors.delete(projectId);
  }
}

/**
 * Reenvía un webhook guardado hacia el servidor local (Replay)
 */
function replayEvent(projectId, eventData, targetPort, emitEvent) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const port = targetPort || (activeInterceptors.get(projectId)?.targetPort) || 3000;
    const bodyStr = typeof eventData.body === 'object' ? JSON.stringify(eventData.body) : String(eventData.rawBody || eventData.body || '');

    const cleanHeaders = { ...(eventData.headers || {}) };
    delete cleanHeaders.host;
    delete cleanHeaders['content-length'];
    cleanHeaders['host'] = `localhost:${port}`;
    cleanHeaders['x-lummo-replay'] = 'true';
    if (bodyStr && !cleanHeaders['content-type']) {
      cleanHeaders['content-type'] = 'application/json';
    }

    const options = {
      hostname: '127.0.0.1',
      port,
      path: eventData.url || eventData.path || '/',
      method: eventData.method || 'POST',
      headers: cleanHeaders
    };

    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const durationMs = Date.now() - startTime;
        const rawResp = Buffer.concat(chunks).toString('utf-8');
        let parsedResp = rawResp;
        try {
          parsedResp = JSON.parse(rawResp);
        } catch (e) {}

        const replayEventObj = {
          id: 'wh_rep_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          projectId,
          timestamp: new Date().toISOString(),
          method: options.method,
          url: options.path,
          path: options.path.split('?')[0],
          headers: cleanHeaders,
          body: eventData.body,
          rawBody: bodyStr,
          statusCode: res.statusCode || 200,
          statusMessage: res.statusMessage || 'OK',
          responseHeaders: res.headers,
          responseBody: parsedResp,
          durationMs,
          clientIp: '127.0.0.1 (Lummo Replay)',
          isReplay: true,
          originalEventId: eventData.id
        };

        recordEvent(projectId, replayEventObj);
        if (typeof emitEvent === 'function') {
          emitEvent(projectId, replayEventObj);
        }

        resolve({ success: true, event: replayEventObj });
      });
    });

    req.on('error', (err) => {
      const durationMs = Date.now() - startTime;
      const replayEventObj = {
        id: 'wh_rep_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        projectId,
        timestamp: new Date().toISOString(),
        method: options.method,
        url: options.path,
        path: options.path.split('?')[0],
        headers: cleanHeaders,
        body: eventData.body,
        rawBody: bodyStr,
        statusCode: 500,
        statusMessage: 'Connection Error',
        responseHeaders: {},
        responseBody: { error: err.message },
        durationMs,
        clientIp: '127.0.0.1 (Lummo Replay)',
        isReplay: true,
        originalEventId: eventData.id
      };

      recordEvent(projectId, replayEventObj);
      if (typeof emitEvent === 'function') {
        emitEvent(projectId, replayEventObj);
      }

      resolve({ success: false, error: err.message, event: replayEventObj });
    });

    if (bodyStr) {
      req.write(bodyStr);
    }
    req.end();
  });
}

/**
 * Catálogo de plantillas Mock para simulación de Webhooks
 */
const MOCK_TEMPLATES = {
  stripe_payment_success: {
    name: 'Stripe: payment_intent.succeeded',
    defaultEndpoint: '/api/webhooks/stripe',
    headers: {
      'content-type': 'application/json',
      'stripe-signature': 't=' + Math.floor(Date.now() / 1000) + ',v1=lummo_mock_signature_test_984fba2'
    },
    payload: {
      id: 'evt_test_' + Math.random().toString(36).substring(2, 10),
      object: 'event',
      type: 'payment_intent.succeeded',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: 'pi_3Mtw' + Math.random().toString(36).substring(2, 10),
          amount: 4999,
          currency: 'usd',
          status: 'succeeded',
          customer: 'cus_991283',
          payment_method_types: ['card']
        }
      }
    }
  },
  stripe_subscription_deleted: {
    name: 'Stripe: customer.subscription.deleted',
    defaultEndpoint: '/api/webhooks/stripe',
    headers: {
      'content-type': 'application/json',
      'stripe-signature': 't=' + Math.floor(Date.now() / 1000) + ',v1=lummo_mock_signature_test_sub'
    },
    payload: {
      id: 'evt_sub_' + Math.random().toString(36).substring(2, 10),
      object: 'event',
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_1N3x' + Math.random().toString(36).substring(2, 10),
          status: 'canceled',
          customer: 'cus_991283'
        }
      }
    }
  },
  mercadopago_payment_approved: {
    name: 'Mercado Pago: payment.approved',
    defaultEndpoint: '/api/webhooks/mercadopago',
    headers: {
      'content-type': 'application/json',
      'x-signature': 'ts=' + Date.now() + ',v1=lummo_mp_signature_hash'
    },
    payload: {
      id: Math.floor(1000000000 + Math.random() * 9000000000),
      live_mode: false,
      type: 'payment',
      date_created: new Date().toISOString(),
      action: 'payment.created',
      data: {
        id: '123456789'
      }
    }
  },
  github_push: {
    name: 'GitHub: push (main branch)',
    defaultEndpoint: '/api/webhooks/github',
    headers: {
      'content-type': 'application/json',
      'x-github-event': 'push',
      'x-hub-signature-256': 'sha256=lummo_gh_hash_mock'
    },
    payload: {
      ref: 'refs/heads/main',
      repository: {
        name: 'lummo-app',
        full_name: 'developer/lummo-app',
        html_url: 'https://github.com/developer/lummo-app'
      },
      pusher: {
        name: 'Developer Lummo',
        email: 'dev@lummo.studio'
      },
      commits: [
        {
          id: 'b7c43df' + Math.random().toString(36).substring(2, 6),
          message: 'feat: add Lummo v3.0 Webhook Inspector',
          timestamp: new Date().toISOString()
        }
      ]
    }
  },
  shopify_order_created: {
    name: 'Shopify: orders/create',
    defaultEndpoint: '/api/webhooks/shopify',
    headers: {
      'content-type': 'application/json',
      'x-shopify-topic': 'orders/create',
      'x-shopify-shop-domain': 'mytienda.myshopify.com'
    },
    payload: {
      id: 82098291194,
      email: 'customer@example.com',
      total_price: '120.00',
      currency: 'USD',
      financial_status: 'paid',
      line_items: [
        {
          title: 'Plan Pro Lummo Studio',
          price: '120.00',
          quantity: 1
        }
      ]
    }
  }
};

module.exports = {
  getWebhookEvents,
  clearWebhookEvents,
  ensureInterceptor,
  stopInterceptor,
  replayEvent,
  MOCK_TEMPLATES
};
