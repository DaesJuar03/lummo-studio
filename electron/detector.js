import fs from 'fs';
import path from 'path';

function analyzeSingleFolder(folderPath) {
  const folderName = path.basename(folderPath);
  let result = {
    name: folderName,
    path: folderPath,
    techStack: 'Proyectos Varios',
    icon: 'code',
    command: 'lummo:static',
    defaultPort: 8080,
    hasPackageJson: false,
    availableCommands: [],
    isBackend: false,
    isFrontend: false
  };

  if (!fs.existsSync(folderPath)) {
    return result;
  }

  const files = fs.readdirSync(folderPath);
  const pkgPath = path.join(folderPath, 'package.json');

  if (fs.existsSync(pkgPath)) {
    result.hasPackageJson = true;
    try {
      const pkgRaw = fs.readFileSync(pkgPath, 'utf-8');
      const pkg = JSON.parse(pkgRaw);
      
      const scripts = pkg.scripts || {};
      result.availableCommands = Object.keys(scripts).map(s => `npm run ${s}`);

      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

      if (deps['next']) {
        result.techStack = 'Next.js App';
        result.icon = 'next';
        result.command = scripts.dev ? 'npm run dev' : 'npm start';
        result.defaultPort = 3000;
        result.isFrontend = true;
      } else if (deps['vite']) {
        result.techStack = deps['react'] ? 'Vite + React' : deps['vue'] ? 'Vite + Vue' : 'Vite Web App';
        result.icon = 'react';
        result.command = scripts.dev ? 'npm run dev' : 'npm start';
        result.defaultPort = 5173;
        result.isFrontend = true;
      } else if (deps['react']) {
        result.techStack = 'React App';
        result.icon = 'react';
        result.command = scripts.start ? 'npm start' : 'npm run dev';
        result.defaultPort = 3000;
        result.isFrontend = true;
      } else if (deps['express'] || deps['nest'] || deps['@nestjs/core'] || deps['fastify'] || deps['koa'] || deps['hono']) {
        result.techStack = deps['nest'] || deps['@nestjs/core'] ? 'NestJS Backend' : deps['fastify'] ? 'Fastify Server' : 'Express Node Server';
        result.icon = 'node';
        result.command = scripts.dev ? 'npm run dev' : scripts.start ? 'npm start' : 'node index.js';
        result.defaultPort = 5000;
        result.isBackend = true;
      } else {
        result.techStack = 'Node.js Application';
        result.icon = 'node';
        result.command = scripts.dev ? 'npm run dev' : scripts.start ? 'npm start' : 'node index.js';
        result.defaultPort = 3000;
      }
      return result;
    } catch {
      // Fallback
    }
  }

  // Check for PHP / Composer files
  const hasComposer = files.includes('composer.json');
  const hasPhpFiles = files.some(f => f.endsWith('.php') || f === 'index.php');
  if (hasComposer || hasPhpFiles) {
    result.techStack = hasComposer ? 'PHP / Laravel Application' : 'PHP Web Application';
    result.icon = 'php';
    result.command = hasComposer ? 'php artisan serve' : 'php -S localhost:{port}';
    result.defaultPort = 8000;
    result.isBackend = true;
    return result;
  }

  // Check for Python files
  const hasPython = files.some(f => f === 'app.py' || f === 'main.py' || f === 'requirements.txt' || f === 'Pipfile' || f.endsWith('.py'));
  if (hasPython) {
    result.techStack = 'Python Server / Application';
    result.icon = 'python';
    result.isBackend = true;
    if (files.includes('app.py')) {
      result.command = 'python app.py';
    } else if (files.includes('main.py')) {
      result.command = 'python main.py';
    } else {
      result.command = 'python -m http.server {port}';
    }
    result.defaultPort = 8000;
    return result;
  }

  // Check for HTML file
  const hasHtml = files.some(f => f === 'index.html' || f.endsWith('.html'));
  if (hasHtml) {
    result.techStack = 'Sitio Web HTML/CSS/JS';
    result.icon = 'html';
    result.command = 'lummo:static';
    result.defaultPort = 8080;
    result.isFrontend = true;
    return result;
  }

  // Docker
  if (files.includes('docker-compose.yml') || files.includes('Dockerfile')) {
    result.techStack = 'Docker Container Environment';
    result.icon = 'docker';
    result.command = 'docker compose up';
    result.defaultPort = 8080;
    result.isBackend = true;
    return result;
  }

  return result;
}

function parseEnvApiUrl(folderPath) {
  const envFiles = ['.env', '.env.local', '.env.development'];
  for (const envFile of envFiles) {
    const fullPath = path.join(folderPath, envFile);
    if (fs.existsSync(fullPath)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const [key, ...valParts] = trimmed.split('=');
            const k = key.trim();
            const val = valParts.join('=').trim().replace(/['"]/g, '');
            if (['VITE_API_URL', 'REACT_APP_API_URL', 'NEXT_PUBLIC_API_URL', 'BACKEND_URL', 'API_URL'].includes(k) && val) {
              return val;
            }
          }
        }
      } catch {
        // ignore
      }
    }
  }
  return null;
}

export function detectProjectType(folderPath) {
  if (!fs.existsSync(folderPath)) {
    return {
      name: path.basename(folderPath),
      path: folderPath,
      techStack: 'Proyectos Varios',
      icon: 'code',
      command: 'lummo:static',
      defaultPort: 8080,
      hasPackageJson: false,
      availableCommands: []
    };
  }

  const rootAnalysis = analyzeSingleFolder(folderPath);
  const subdirs = fs.readdirSync(folderPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.') && dirent.name !== 'node_modules' && dirent.name !== 'dist' && dirent.name !== 'build')
    .map(dirent => dirent.name);

  // Common names for backend subdirectories
  const backendFolderNames = ['backend', 'server', 'api', 'backend-api', 'services', 'srv', 'laravel'];
  const frontendFolderNames = ['frontend', 'client', 'web', 'ui', 'app'];

  let foundBackendFolder = subdirs.find(d => backendFolderNames.includes(d.toLowerCase()));
  let foundFrontendFolder = subdirs.find(d => frontendFolderNames.includes(d.toLowerCase()));

  let hasBackend = false;
  let backendData = null;

  // Case 1: Monorepo / Dual subfolder structure (e.g. root/frontend & root/backend)
  if (!rootAnalysis.hasPackageJson && foundFrontendFolder && foundBackendFolder) {
    const frontendPath = path.join(folderPath, foundFrontendFolder);
    const backendPath = path.join(folderPath, foundBackendFolder);

    const frontendAnalysis = analyzeSingleFolder(frontendPath);
    const backendAnalysis = analyzeSingleFolder(backendPath);

    hasBackend = true;
    backendData = {
      name: backendAnalysis.name || foundBackendFolder,
      path: backendPath,
      subfolder: foundBackendFolder,
      techStack: backendAnalysis.techStack,
      icon: backendAnalysis.icon,
      command: backendAnalysis.command,
      defaultPort: backendAnalysis.defaultPort || 5000,
      availableCommands: backendAnalysis.availableCommands || []
    };

    return {
      name: path.basename(folderPath),
      path: folderPath,
      techStack: `Entorno Dual: ${frontendAnalysis.techStack} + ${backendAnalysis.techStack}`,
      dualLabel: `Entorno Dual: Frontend (${foundFrontendFolder}) + Backend (${foundBackendFolder})`,
      icon: frontendAnalysis.icon || 'code',
      command: frontendAnalysis.command,
      defaultPort: frontendAnalysis.defaultPort || 5173,
      hasPackageJson: frontendAnalysis.hasPackageJson,
      availableCommands: frontendAnalysis.availableCommands,
      hasBackend: true,
      backend: backendData,
      envApiUrl: parseEnvApiUrl(frontendPath) || parseEnvApiUrl(folderPath)
    };
  }

  // Case 2: Root project is frontend/web, and contains a backend subfolder
  if (foundBackendFolder) {
    const backendPath = path.join(folderPath, foundBackendFolder);
    const backendAnalysis = analyzeSingleFolder(backendPath);

    hasBackend = true;
    backendData = {
      name: backendAnalysis.name || foundBackendFolder,
      path: backendPath,
      subfolder: foundBackendFolder,
      techStack: backendAnalysis.techStack,
      icon: backendAnalysis.icon,
      command: backendAnalysis.command,
      defaultPort: backendAnalysis.defaultPort || (rootAnalysis.defaultPort === 5000 ? 8000 : 5000),
      availableCommands: backendAnalysis.availableCommands || []
    };
  }

  // Case 3: Parse .env for backend API references if not detected via subfolders
  const envApiUrl = parseEnvApiUrl(folderPath);
  if (!hasBackend && envApiUrl) {
    let portMatch = envApiUrl.match(/:(\d+)/);
    let envPort = portMatch ? parseInt(portMatch[1], 10) : 5000;

    hasBackend = true;
    backendData = {
      name: 'Servidor Backend API',
      path: folderPath,
      subfolder: '',
      techStack: 'Backend Configurado en .env',
      icon: 'node',
      command: 'npm run dev:api',
      defaultPort: envPort,
      availableCommands: []
    };
  }

  return {
    ...rootAnalysis,
    dualLabel: hasBackend ? `Entorno Dual: ${rootAnalysis.techStack} + Backend` : null,
    hasBackend,
    backend: backendData,
    envApiUrl
  };
}
