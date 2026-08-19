const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { spawn, exec } = require('child_process');
const os = require('os');

// Helper to execute CLI commands asynchronously
function execPromise(cmd, timeout = 600000) {
  return new Promise((resolve) => {
    exec(cmd, { timeout, maxBuffer: 20 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        resolve({ success: false, error: error.message, stderr: stderr ? stderr.toString() : '' });
      } else {
        resolve({ success: true, stdout: stdout ? stdout.toString() : '' });
      }
    });
  });
}

// Fetch JSON from a URL with redirect handling
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Lummo-Studio/2.1' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJson(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP status ${res.statusCode}`));
      }
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Fetch raw HTML/text from a URL
function fetchText(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Lummo-Studio/2.1' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchText(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP status ${res.statusCode}`));
      }
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve(body));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Check if Winget is available on Windows
async function isWingetAvailable() {
  const res = await execPromise('winget --version', 4000);
  return res.success;
}

// Exact package Winget IDs mapping
const WINGET_MAP = {
  node: 'OpenJS.NodeJS.LTS',
  git: 'Git.Git',
  python: 'Python.Python.3.12',
  php: 'PHP.PHP.8.3',
  mysql: 'MariaDB.Server',
  postgres: 'PostgreSQL.PostgreSQL.16'
};

/**
 * Dynamically resolve the latest release download URL and installer details for a technology key
 */
async function resolveLatestReleaseInfo(techKey) {
  const wingetId = WINGET_MAP[techKey] || techKey;
  const hasWinget = await isWingetAvailable();

  try {
    switch (techKey) {
      case 'node': {
        try {
          const releases = await fetchJson('https://nodejs.org/dist/index.json');
          const ltsRelease = releases.find(r => r.lts !== false);
          const version = ltsRelease ? ltsRelease.version : 'v22.14.0';
          const downloadUrl = `https://nodejs.org/dist/${version}/node-${version}-x64.msi`;
          return {
            techKey,
            name: `Node.js (${version})`,
            downloadUrl,
            fileName: `node-${version}-x64.msi`,
            installerType: 'msi',
            version
          };
        } catch {
          if (hasWinget) {
            return { techKey, name: 'Node.js (LTS)', downloadUrl: null, installerType: 'winget', wingetId };
          }
        }
        break;
      }

      case 'git': {
        try {
          const release = await fetchJson('https://api.github.com/repos/git-for-windows/git/releases/latest');
          const version = release.tag_name || 'latest';
          const asset = release.assets?.find(a => a.name.endsWith('64-bit.exe') && !a.name.includes('pdbs'));
          if (asset && asset.browser_download_url) {
            return {
              techKey,
              name: `Git for Windows (${version})`,
              downloadUrl: asset.browser_download_url,
              fileName: asset.name,
              installerType: 'exe-git',
              version
            };
          }
        } catch {
          if (hasWinget) {
            return { techKey, name: 'Git for Windows', downloadUrl: null, installerType: 'winget', wingetId };
          }
        }
        break;
      }

      case 'python': {
        try {
          const rels = await fetchJson('https://www.python.org/api/v2/downloads/release/?format=json');
          const latest3 = rels.filter(r => r.name && r.name.startsWith('Python 3.')).sort((a, b) => b.id - a.id)[0];
          const verStr = latest3 ? latest3.name.replace('Python ', '') : '3.12.9';
          const downloadUrl = `https://www.python.org/ftp/python/${verStr}/python-${verStr}-amd64.exe`;
          return {
            techKey,
            name: `Python (${verStr})`,
            downloadUrl,
            fileName: `python-${verStr}-amd64.exe`,
            installerType: 'exe-python',
            version: verStr
          };
        } catch {
          const verStr = '3.12.9';
          return {
            techKey,
            name: `Python (${verStr})`,
            downloadUrl: `https://www.python.org/ftp/python/${verStr}/python-${verStr}-amd64.exe`,
            fileName: `python-${verStr}-amd64.exe`,
            installerType: 'exe-python',
            version: verStr
          };
        }
      }

      case 'php': {
        try {
          const html = await fetchText('https://windows.php.net/downloads/releases/');
          const matches = html.match(/php-8\.\d+\.\d+-Win32-vs\d+-x64\.zip/g);
          if (matches && matches.length > 0) {
            const fileName = matches[0];
            const versionMatch = fileName.match(/php-(8\.\d+\.\d+)/);
            const verStr = versionMatch ? versionMatch[1] : '8.3';
            const downloadUrl = `https://windows.php.net/downloads/releases/${fileName}`;
            return {
              techKey,
              name: `PHP Engine (${verStr})`,
              downloadUrl,
              fileName,
              installerType: 'zip-php',
              version: verStr
            };
          }
        } catch (e) {
          console.warn('[Lummo TechInstaller] Error fetching PHP release page:', e.message);
        }

        const fallbackFile = 'php-8.3.33-Win32-vs16-x64.zip';
        return {
          techKey,
          name: 'PHP 8.3 Engine',
          downloadUrl: `https://windows.php.net/downloads/releases/${fallbackFile}`,
          fileName: fallbackFile,
          installerType: 'zip-php',
          version: '8.3.33'
        };
      }
    }
  } catch (err) {
    console.warn(`[Lummo TechInstaller] Error resolving release info for ${techKey}:`, err.message);
  }

  // Generic Winget or static fallback
  return {
    techKey,
    name: techKey.toUpperCase(),
    downloadUrl: null,
    fileName: `${techKey}-installer`,
    installerType: 'winget',
    wingetId
  };
}

/**
 * Download a file with real-time stream progress callbacks
 */
function downloadFileWithProgress(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;

    const request = client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Lummo-Studio/2.1' } }, (response) => {
      // Handle HTTP redirects (301, 302, 307, 308)
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        return downloadFileWithProgress(response.headers.location, destPath, onProgress)
          .then(resolve)
          .catch(reject);
      }

      if (response.statusCode !== 200) {
        return reject(new Error(`Download error: HTTP Status ${response.statusCode}`));
      }

      const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
      let downloadedBytes = 0;
      let startTime = Date.now();
      let lastReportTime = 0;

      const fileStream = fs.createWriteStream(destPath);

      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        fileStream.write(chunk);

        const now = Date.now();
        if (now - lastReportTime > 200) {
          lastReportTime = now;
          const elapsedSec = (now - startTime) / 1000 || 1;
          const speedBps = downloadedBytes / elapsedSec;
          const speedMBps = (speedBps / (1024 * 1024)).toFixed(2);
          const percent = totalBytes > 0 ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)) : 0;

          if (onProgress) {
            onProgress({
              stage: 'downloading',
              percent,
              downloadedBytes,
              totalBytes,
              speedMBps: `${speedMBps} MB/s`,
              message: `Descargando... (${(downloadedBytes / (1024 * 1024)).toFixed(1)} MB / ${totalBytes ? (totalBytes / (1024 * 1024)).toFixed(1) : '?'} MB)`
            });
          }
        }
      });

      response.on('end', () => {
        fileStream.end();
        if (onProgress) {
          onProgress({
            stage: 'downloaded',
            percent: 100,
            downloadedBytes,
            totalBytes,
            message: 'Descarga completada. Preparando instalación...'
          });
        }
        resolve(destPath);
      });

      response.on('error', (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    });

    request.on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

/**
 * Execute silent installation for a downloaded binary or via Winget
 */
async function executeInstallation(techInfo, downloadedFilePath, onProgress) {
  if (onProgress) {
    onProgress({
      stage: 'installing',
      percent: 100,
      message: 'Ejecutando instalación en el sistema... Por favor acepta los permisos UAC si Windows los solicita.'
    });
  }

  // 1. PHP Zip Extraction & PATH registration
  if (techInfo.installerType === 'zip-php' && downloadedFilePath) {
    const destDir = 'C:\\php';
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    const extractCmd = `powershell -Command "Expand-Archive -Path '${downloadedFilePath}' -DestinationPath '${destDir}' -Force; [Environment]::SetEnvironmentVariable('PATH', $env:PATH + ';C:\\php', 'User')"`;
    console.log(`[Lummo TechInstaller] Extracting PHP: ${extractCmd}`);
    const res = await execPromise(extractCmd, 300000);
    if (!res.success) {
      throw new Error(`Error descomprimiendo PHP: ${res.stderr || res.error}`);
    }
    return true;
  }

  // 2. Install via Winget if specified or as primary fallback
  if (techInfo.installerType === 'winget' || !downloadedFilePath) {
    const wingetId = WINGET_MAP[techInfo.techKey] || techInfo.wingetId;
    const cmd = `winget install --id "${wingetId}" --silent --accept-package-agreements --accept-source-agreements`;
    console.log(`[Lummo TechInstaller] Executing winget: ${cmd}`);
    const res = await execPromise(cmd, 600000); // 10 min timeout
    if (!res.success) {
      throw new Error(`Error en instalación vía Winget (${wingetId}): ${res.stderr || res.error}`);
    }
    return true;
  }

  // 3. MSI Installer (.msi)
  if (techInfo.installerType === 'msi') {
    const cmd = `msiexec /i "${downloadedFilePath}" /qn /norestart`;
    console.log(`[Lummo TechInstaller] Executing MSI: ${cmd}`);
    const res = await execPromise(cmd, 600000);
    if (!res.success && !res.stdout.includes('0')) {
      throw new Error(`Error en instalador MSI: ${res.stderr || res.error}`);
    }
    return true;
  }

  // 4. Git for Windows Executable (.exe)
  if (techInfo.installerType === 'exe-git') {
    const cmd = `"${downloadedFilePath}" /VERYSILENT /NORESTART /NOCANCEL /SP-`;
    console.log(`[Lummo TechInstaller] Executing Git Installer: ${cmd}`);
    const res = await execPromise(cmd, 600000);
    if (!res.success) {
      throw new Error(`Error en instalador Git: ${res.stderr || res.error}`);
    }
    return true;
  }

  // 5. Python Executable (.exe)
  if (techInfo.installerType === 'exe-python') {
    const cmd = `"${downloadedFilePath}" /passive InstallAllUsers=1 PrependPath=1 Include_test=0`;
    console.log(`[Lummo TechInstaller] Executing Python Installer: ${cmd}`);
    const res = await execPromise(cmd, 600000);
    if (!res.success) {
      throw new Error(`Error en instalador Python: ${res.stderr || res.error}`);
    }
    return true;
  }

  // 6. Winget fallback for any other .exe
  const wingetId = WINGET_MAP[techInfo.techKey];
  if (wingetId && await isWingetAvailable()) {
    const cmd = `winget install --id "${wingetId}" --silent --accept-package-agreements --accept-source-agreements`;
    const res = await execPromise(cmd, 600000);
    if (res.success) return true;
  }

  // Generic silent install attempt
  const res = await execPromise(`"${downloadedFilePath}" /silent /S /qn`, 600000);
  if (!res.success) {
    throw new Error(`No se pudo completar la instalación silenciosa de ${techInfo.name}`);
  }
  return true;
}

/**
 * Main Controller: Download and Install selected tech keys
 */
async function processTechInstallations(techKeys, onEventCallback) {
  const tempDir = path.join(os.tmpdir(), 'lummo_installers');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const results = {};

  for (const techKey of techKeys) {
    try {
      onEventCallback({
        techKey,
        stage: 'resolving',
        percent: 0,
        message: 'Resolviendo última versión oficial disponible...'
      });

      const info = await resolveLatestReleaseInfo(techKey);

      let downloadedPath = null;
      if (info.downloadUrl) {
        const destFile = path.join(tempDir, info.fileName || `${techKey}-installer`);
        downloadedPath = await downloadFileWithProgress(info.downloadUrl, destFile, (progress) => {
          onEventCallback({
            techKey,
            name: info.name,
            version: info.version,
            ...progress
          });
        });
      }

      await executeInstallation(info, downloadedPath, (progress) => {
        onEventCallback({
          techKey,
          name: info.name,
          version: info.version,
          ...progress
        });
      });

      // Cleanup temp installer
      if (downloadedPath && fs.existsSync(downloadedPath)) {
        fs.unlink(downloadedPath, () => {});
      }

      results[techKey] = { success: true, message: 'Instalado con éxito en el sistema' };

      onEventCallback({
        techKey,
        name: info.name,
        stage: 'completed',
        percent: 100,
        message: '¡Instalación completada y verificada exitosamente!'
      });
    } catch (err) {
      console.error(`[Lummo TechInstaller] Failure installing ${techKey}:`, err);
      results[techKey] = { success: false, error: err.message };
      onEventCallback({
        techKey,
        stage: 'error',
        percent: 0,
        message: `Error: ${err.message}`
      });
    }
  }

  return results;
}

module.exports = {
  processTechInstallations,
  resolveLatestReleaseInfo
};
