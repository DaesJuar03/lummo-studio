const express = require('express');
const http = require('http');

let proxyApp = null;
let proxyServer = null;
let proxyPort = 3838; // Puerto estático para el proxy inverso local
const domainRoutes = new Map(); // domainName -> targetPort (ej. "blog.test" -> 3000)

function initProxyServer() {
  if (proxyServer) return;

  proxyApp = express();

  // Middleware proxy retransmisor
  proxyApp.use((req, res) => {
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
        <div style="font-family: sans-serif; text-align: center; padding: 50px; background: #0f172a; color: #f8fafc; height: 100vh;">
          <h2 style="color: #ef4444;">404 - Dominio Local No Encontrado</h2>
          <p>El dominio <strong>${hostHeader}</strong> no está asignado a ningún proyecto activo en <strong>Lummo Studio</strong>.</p>
          <p style="color: #64748b;">Asegúrate de que el servidor del proyecto esté encendido y el dominio configurado en el panel.</p>
        </div>
      `);
      return;
    }

    // Proxy HTTP hacia localhost:<targetPort>
    const options = {
      hostname: '127.0.0.1',
      port: targetPort,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: `localhost:${targetPort}` }
    };

    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', (err) => {
      res.status(502).send(`
        <div style="font-family: sans-serif; text-align: center; padding: 50px; background: #0f172a; color: #f8fafc; height: 100vh;">
          <h2 style="color: #f59e0b;">502 - Bad Gateway</h2>
          <p>No se pudo conectar con el proyecto en el puerto <strong>${targetPort}</strong>.</p>
          <p style="color: #94a3b8;">${err.message}</p>
        </div>
      `);
    });

    req.pipe(proxyReq, { end: true });
  });

  try {
    proxyServer = proxyApp.listen(proxyPort, () => {
      console.log(`[Lummo Proxy] Proxy inverso activo en http://localhost:${proxyPort}`);
    });
  } catch (e) {
    console.error(`[Lummo Proxy Error] No se pudo iniciar proxy en puerto ${proxyPort}:`, e);
  }
}

const fs = require('fs');
const path = require('path');

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

function registerDomain(domain, port) {
  if (!domain || !port) return;
  const cleanDomain = domain.toLowerCase().trim();
  domainRoutes.set(cleanDomain, Number(port));
  initProxyServer();
}

function unregisterDomain(domain) {
  if (!domain) return;
  domainRoutes.delete(domain.toLowerCase().trim());
}

function getRegisteredDomains() {
  const list = [];
  domainRoutes.forEach((port, domain) => {
    list.push({ domain, port, proxyUrl: `http://localhost:${proxyPort}/proxy/${port}` });
  });
  return list;
}

function setLocalDomain(domain, port) {
  if (!domain || !port) return { success: false, error: 'Dominio o puerto no especificado' };
  const cleanDomain = domain.toLowerCase().trim();
  registerDomain(cleanDomain, port);
  const hostsRes = updateWindowsHostsFile(cleanDomain);
  return {
    success: true,
    domain: cleanDomain,
    port: Number(port),
    proxyUrl: `http://localhost:${proxyPort}/proxy/${port}`,
    localUrl: `http://${cleanDomain}:${proxyPort}`,
    ...hostsRes
  };
}

module.exports = {
  initProxyServer,
  registerDomain,
  unregisterDomain,
  getRegisteredDomains,
  setLocalDomain,
  updateWindowsHostsFile,
  proxyPort
};
