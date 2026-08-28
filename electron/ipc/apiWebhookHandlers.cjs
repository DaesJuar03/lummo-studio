const { ipcMain, app } = require('electron');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { URL } = require('url');
const webhookProxyManager = require('../webhookProxyManager.cjs');
const { safeHandle } = require('./ipcUtils.cjs');

function registerApiWebhookHandlers(getMainWindow, emitLogToProject) {
  const emitWebhookEvent = (projectId, eventObj) => {
    const { BrowserWindow } = require('electron');
    BrowserWindow.getAllWindows().forEach((win) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send('webhook-traffic-event', { projectId, event: eventObj });
      }
    });
  };

  // 1. API Client: Enviar Petición HTTP / GraphQL nativa
  safeHandle('api-send-request', async (event, requestData) => {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const {
        method = 'GET',
        url: targetUrlStr,
        headers = {},
        params = {},
        body = null,
        bodyType = 'json', // 'none' | 'json' | 'form' | 'raw'
        timeout = 30000
      } = requestData;

      if (!targetUrlStr) {
        return resolve({
          success: false,
          error: 'La URL no puede estar vacía.',
          durationMs: 0
        });
      }

      let parsedUrl;
      try {
        parsedUrl = new URL(targetUrlStr);
      } catch (e) {
        return resolve({
          success: false,
          error: `URL inválida: ${e.message}`,
          durationMs: 0
        });
      }

      // Añadir Query Params si los hay
      if (params && typeof params === 'object') {
        Object.entries(params).forEach(([k, v]) => {
          if (k && v !== undefined) parsedUrl.searchParams.append(k, String(v));
        });
      }

      const client = parsedUrl.protocol === 'https:' ? https : http;
      const cleanHeaders = { ...headers };

      let payloadData = null;
      if (method !== 'GET' && method !== 'HEAD' && body) {
        if (bodyType === 'json') {
          payloadData = typeof body === 'string' ? body : JSON.stringify(body);
          if (!cleanHeaders['content-type'] && !cleanHeaders['Content-Type']) {
            cleanHeaders['Content-Type'] = 'application/json';
          }
        } else if (bodyType === 'form' && typeof body === 'object') {
          const formParams = new URLSearchParams();
          Object.entries(body).forEach(([k, v]) => formParams.append(k, String(v)));
          payloadData = formParams.toString();
          if (!cleanHeaders['content-type'] && !cleanHeaders['Content-Type']) {
            cleanHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
          }
        } else {
          payloadData = String(body);
        }

        if (payloadData && !cleanHeaders['content-length'] && !cleanHeaders['Content-Length']) {
          cleanHeaders['Content-Length'] = Buffer.byteLength(payloadData);
        }
      }

      const reqOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: method.toUpperCase(),
        headers: cleanHeaders,
        timeout
      };

      const req = client.request(reqOptions, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const durationMs = Date.now() - startTime;
          const rawRespBody = Buffer.concat(chunks).toString('utf-8');
          const sizeBytes = Buffer.byteLength(rawRespBody);
          
          let parsedRespBody = rawRespBody;
          const contentType = res.headers['content-type'] || '';
          if (contentType.includes('application/json')) {
            try {
              parsedRespBody = JSON.parse(rawRespBody);
            } catch (e) {
              parsedRespBody = rawRespBody;
            }
          }

          resolve({
            success: true,
            status: res.statusCode,
            statusText: res.statusMessage,
            headers: res.headers,
            cookies: res.headers['set-cookie'] || [],
            body: parsedRespBody,
            rawBody: rawRespBody,
            sizeBytes,
            durationMs,
            contentType
          });
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          success: false,
          error: `Tiempo de espera agotado (${timeout}ms)`,
          durationMs: Date.now() - startTime
        });
      });

      req.on('error', (err) => {
        resolve({
          success: false,
          error: err.message || 'Error al conectar con el servidor',
          durationMs: Date.now() - startTime
        });
      });

      if (payloadData) {
        req.write(payloadData);
      }
      req.end();
    });
  });

  // 2. Persistencia de Colecciones de API (en .lummo/api-collections.json)
  safeHandle('api-get-collections', async (event, folderPath) => {
    try {
      let targetFile = null;
      if (folderPath && fs.existsSync(folderPath)) {
        targetFile = path.join(folderPath, '.lummo', 'api-collections.json');
      }
      if (!targetFile || !fs.existsSync(targetFile)) {
        targetFile = path.join(app.getPath('userData'), 'lummo-global-api-collections.json');
      }

      if (fs.existsSync(targetFile)) {
        const content = fs.readFileSync(targetFile, 'utf-8');
        return { success: true, collections: JSON.parse(content) };
      }
      return { success: true, collections: [] };
    } catch (err) {
      return { success: false, error: err.message, collections: [] };
    }
  });

  safeHandle('api-save-collections', async (event, { folderPath, collections }) => {
    try {
      let targetFolder = null;
      let targetFile = null;

      if (folderPath && fs.existsSync(folderPath)) {
        targetFolder = path.join(folderPath, '.lummo');
        if (!fs.existsSync(targetFolder)) {
          fs.mkdirSync(targetFolder, { recursive: true });
        }
        targetFile = path.join(targetFolder, 'api-collections.json');
      } else {
        targetFolder = app.getPath('userData');
        targetFile = path.join(targetFolder, 'lummo-global-api-collections.json');
      }

      fs.writeFileSync(targetFile, JSON.stringify(collections, null, 2), 'utf-8');
      return { success: true, filePath: targetFile };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // 3. Webhook Inspector: Historial y Acciones
  safeHandle('webhook-get-events', async (event, projectId) => {
    return webhookProxyManager.getWebhookEvents(projectId);
  });

  safeHandle('webhook-clear-events', async (event, projectId) => {
    return webhookProxyManager.clearWebhookEvents(projectId);
  });

  safeHandle('webhook-replay-event', async (event, { projectId, eventData, targetPort }) => {
    return await webhookProxyManager.replayEvent(projectId, eventData, targetPort, emitWebhookEvent);
  });

  safeHandle('webhook-get-mock-templates', async () => {
    return webhookProxyManager.MOCK_TEMPLATES;
  });

  safeHandle('webhook-send-mock', async (event, { projectId, targetPort, endpoint, method = 'POST', headers = {}, payload = {} }) => {
    const mockEventData = {
      id: 'mock_' + Date.now(),
      url: endpoint.startsWith('/') ? endpoint : `/${endpoint}`,
      path: endpoint.startsWith('/') ? endpoint : `/${endpoint}`,
      method: method.toUpperCase(),
      headers,
      body: payload,
      rawBody: JSON.stringify(payload, null, 2)
    };
    return await webhookProxyManager.replayEvent(projectId, mockEventData, targetPort, emitWebhookEvent);
  });
}

module.exports = { registerApiWebhookHandlers };
