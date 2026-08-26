const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const sslManager = require('./managers/sslManager.cjs');

let proxyApp = null;
let httpProxyServer = null;
let httpsProxyServer = null;

let httpProxyPort = 3838;
let httpsProxyPort = 8443; // Standard local dev HTTPS port

const domainRoutes = new Map(); // domainName -> targetPort (ej. "blog.test" -> 3000)

function createProxyMiddleware() {
  return (req, res) => {
    const hostHeader = (req.headers.host || '').split(':')[0].toLowerCase();
    const urlPath = req.url;

    // Buscar coincidencia por dominio o por ruta directa `/proxy/<port>/...`
    let targetPort = domainRoutes.get(hostHeader);

    // Fallback: verificar si la ruta es /proxy/<port>/...
    if (!targetPort) {
      const pathMatch = urlPath.match(/^\/proxy\/(\d+)(\/.*)?$/);
      if (pathMatch) {
        targetPort = parseInt(pathMatch[1], 10);
        req.url = pathMatch[2] || '/';
      }
    }

    if (!targetPort) {
      res.status(404).send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="utf-8"/>
          <title>404 - Dominio Local No Asignado | Lummo Studio</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #090A0F; color: #F3F4F6; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #12141F; border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; padding: 40px; max-width: 520px; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
            h2 { color: #F43F5E; margin-top: 0; }
            code { background: #181B28; padding: 3px 8px; border-radius: 6px; color: #38BDF8; font-family: monospace; }
            p { color: #94A3B8; font-size: 14px; line-height: 1.6; }
            .badge { display: inline-block; background: rgba(59,130,246,0.15); color: #60A5FA; border: 1px solid rgba(59,130,246,0.3); padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: bold; margin-bottom: 16px; }
          </style>
        </head>
        <body>
          <div class="card">
            <span class="badge">Lummo Studio Local Proxy</span>
            <h2>Dominio No Encontrado</h2>
            <p>El dominio <code>${hostHeader}</code> no está asignado a ningún proyecto activo en <strong>Lummo Studio</strong>.</p>
            <p>Asegúrate de que el servidor del proyecto esté encendido y el dominio configurado en el panel de red.</p>
          </div>
        </body>
        </html>
      `);
      return;
    }

    // Proxy HTTP hacia 127.0.0.1:<targetPort>
    const options = {
      hostname: '127.0.0.1',
      port: targetPort,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        host: `localhost:${targetPort}`,
        'x-forwarded-host': hostHeader,
        'x-forwarded-proto': req.socket.encrypted ? 'https' : 'http',
        'x-forwarded-for': req.socket.remoteAddress || '127.0.0.1'
      }
    };

    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', (err) => {
      res.status(502).send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="utf-8"/>
          <title>502 - Bad Gateway | Lummo Studio</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #090A0F; color: #F3F4F6; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #12141F; border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; padding: 40px; max-width: 520px; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
            h2 { color: #F59E0B; margin-top: 0; }
            code { background: #181B28; padding: 3px 8px; border-radius: 6px; color: #F59E0B; font-family: monospace; }
            p { color: #94A3B8; font-size: 14px; line-height: 1.6; }
            .badge { display: inline-block; background: rgba(245,158,11,0.15); color: #FBBF24; border: 1px solid rgba(245,158,11,0.3); padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: bold; margin-bottom: 16px; }
          </style>
        </head>
        <body>
          <div class="card">
            <span class="badge">502 Bad Gateway</span>
            <h2>Servidor Local Inactivo</h2>
            <p>No se pudo conectar con el proyecto asignado en el puerto <code>:${targetPort}</code>.</p>
            <p style="font-size: 12px; color: #64748B;">Detalle técnico: ${err.message}</p>
          </div>
        </body>
        </html>
      `);
    });

    req.pipe(proxyReq, { end: true });
  };
}

function handleWebSocketUpgrade(req, socket, head) {
  const hostHeader = (req.headers.host || '').split(':')[0].toLowerCase();
  let targetPort = domainRoutes.get(hostHeader);

  if (!targetPort) {
    const pathMatch = req.url.match(/^\/proxy\/(\d+)(\/.*)?$/);
    if (pathMatch) targetPort = parseInt(pathMatch[1], 10);
  }

  if (!targetPort) {
    socket.destroy();
    return;
  }

  const proxySocket = http.request({
    hostname: '127.0.0.1',
    port: targetPort,
    path: req.url,
    headers: req.headers,
    method: 'GET'
  });

  proxySocket.on('upgrade', (proxyRes, proxySock, proxyHead) => {
    socket.write(`HTTP/1.1 101 Switching Protocols\r\n` +
      Object.keys(proxyRes.headers).map(k => `${k}: ${proxyRes.headers[k]}`).join('\r\n') +
      '\r\n\r\n');
    
    proxySock.pipe(socket);
    socket.pipe(proxySock);
  });

  proxySocket.on('error', () => {
    socket.destroy();
  });

  proxySocket.end();
}

function initProxyServers() {
  if (!proxyApp) {
    proxyApp = express();
    proxyApp.use(createProxyMiddleware());
  }

  // 1. Start HTTP Proxy Server
  if (!httpProxyServer) {
    try {
      httpProxyServer = http.createServer(proxyApp);
      httpProxyServer.on('upgrade', handleWebSocketUpgrade);
      httpProxyServer.listen(httpProxyPort, () => {
        console.log(`[Lummo Proxy] HTTP activo en http://localhost:${httpProxyPort}`);
      });
      httpProxyServer.on('error', (e) => {
        console.warn(`[Lummo Proxy] HTTP port ${httpProxyPort} ocupado o error:`, e.message);
      });
    } catch (e) {
      console.error('[Lummo Proxy Error HTTP]:', e);
    }
  }

  // 2. Start HTTPS SSL Proxy Server with Dynamic SNI
  if (!httpsProxyServer) {
    try {
      const httpsOptions = {
        SNICallback: async (servername, cb) => {
          try {
            const domainName = (servername || 'localhost').toLowerCase();
            const { secureContext } = await sslManager.getOrCreateDomainCertificate(domainName);
            cb(null, secureContext);
          } catch (err) {
            console.error('[Lummo SSL SNICallback Error]:', err);
            cb(err);
          }
        }
      };

      httpsProxyServer = https.createServer(httpsOptions, proxyApp);
      httpsProxyServer.on('upgrade', handleWebSocketUpgrade);
      httpsProxyServer.listen(httpsProxyPort, () => {
        console.log(`[Lummo SSL Proxy] HTTPS Seguro activo en https://localhost:${httpsProxyPort}`);
      });
      httpsProxyServer.on('error', (e) => {
        console.warn(`[Lummo SSL Proxy] HTTPS port ${httpsProxyPort} ocupado o error:`, e.message);
      });
    } catch (e) {
      console.error('[Lummo Proxy Error HTTPS]:', e);
    }
  }
}

function updateWindowsHostsFile(domain) {
  if (process.platform !== 'win32') return { hostsUpdated: false, reason: 'Not Windows' };
  const hostsPath = 'C:\\Windows\\System32\\drivers\\etc\\hosts';
  try {
    if (fs.existsSync(hostsPath)) {
      const content = fs.readFileSync(hostsPath, 'utf-8');
      const cleanDomain = domain.toLowerCase().trim();
      if (!content.toLowerCase().includes(cleanDomain)) {
        fs.appendFileSync(hostsPath, `\n127.0.0.1       ${cleanDomain}\n`, 'utf-8');
        return { hostsUpdated: true, message: `Dominio ${cleanDomain} agregado a hosts file.` };
      }
      return { hostsUpdated: true, message: `Dominio ${cleanDomain} ya existía en hosts file.` };
    }
  } catch (err) {
    return { hostsUpdated: false, error: err.message, manualLine: `127.0.0.1       ${domain}` };
  }
  return { hostsUpdated: false };
}

async function registerDomain(domain, port, enableSsl = true) {
  if (!domain || !port) return;
  const cleanDomain = domain.toLowerCase().trim();
  domainRoutes.set(cleanDomain, Number(port));
  
  initProxyServers();

  if (enableSsl) {
    try {
      await sslManager.getOrCreateDomainCertificate(cleanDomain);
    } catch (e) {
      console.warn(`[Lummo SSL] No se pudo pre-generar cert para ${cleanDomain}:`, e.message);
    }
  }
}

function unregisterDomain(domain) {
  if (!domain) return;
  domainRoutes.delete(domain.toLowerCase().trim());
}

function getRegisteredDomains() {
  const list = [];
  const caInstalled = sslManager.isCaInstalled();
  domainRoutes.forEach((port, domain) => {
    list.push({ 
      domain, 
      port, 
      httpUrl: `http://${domain}:${httpProxyPort}`,
      httpsUrl: `https://${domain}:${httpsProxyPort}`,
      directHttpUrl: `http://localhost:${httpProxyPort}/proxy/${port}`,
      sslReady: caInstalled
    });
  });
  return list;
}

async function setLocalDomain(domain, port, enableSsl = true) {
  if (!domain || !port) return { success: false, error: 'Dominio o puerto no especificado' };
  const cleanDomain = domain.toLowerCase().trim();
  
  await registerDomain(cleanDomain, port, enableSsl);
  const hostsRes = updateWindowsHostsFile(cleanDomain);
  const caInstalled = sslManager.isCaInstalled();

  return {
    success: true,
    domain: cleanDomain,
    port: Number(port),
    httpUrl: `http://${cleanDomain}:${httpProxyPort}`,
    httpsUrl: `https://${cleanDomain}:${httpsProxyPort}`,
    proxyUrl: `http://localhost:${httpProxyPort}/proxy/${port}`,
    sslActive: caInstalled,
    httpsPort: httpsProxyPort,
    httpPort: httpProxyPort,
    ...hostsRes
  };
}

module.exports = {
  initProxyServers,
  registerDomain,
  unregisterDomain,
  getRegisteredDomains,
  setLocalDomain,
  updateWindowsHostsFile,
  httpProxyPort,
  httpsProxyPort
};

