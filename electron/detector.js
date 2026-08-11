import fs from 'fs';
import path from 'path';

export function detectProjectType(folderPath) {
  const folderName = path.basename(folderPath);
  let result = {
    name: folderName,
    path: folderPath,
    techStack: 'Proyectos Varios',
    icon: 'code',
    command: 'lummo:static',
    defaultPort: 8080,
    hasPackageJson: false,
    availableCommands: []
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
      } else if (deps['vite']) {
        result.techStack = deps['react'] ? 'Vite + React' : deps['vue'] ? 'Vite + Vue' : 'Vite Web App';
        result.icon = 'react';
        result.command = scripts.dev ? 'npm run dev' : 'npm start';
        result.defaultPort = 5173;
      } else if (deps['react']) {
        result.techStack = 'React App';
        result.icon = 'react';
        result.command = scripts.start ? 'npm start' : 'npm run dev';
        result.defaultPort = 3000;
      } else if (deps['express'] || deps['nest'] || deps['@nestjs/core'] || deps['fastify']) {
        result.techStack = deps['nest'] ? 'NestJS Backend' : 'Express Node Server';
        result.icon = 'node';
        result.command = scripts.dev ? 'npm run dev' : scripts.start ? 'npm start' : 'node index.js';
        result.defaultPort = 3000;
      } else {
        result.techStack = 'Node.js Application';
        result.icon = 'node';
        result.command = scripts.dev ? 'npm run dev' : scripts.start ? 'npm start' : 'node index.js';
        result.defaultPort = 3000;
      }
      return result;
    } catch {
      // Fallback if package.json fails to parse
    }
  }

  // Check for PHP files
  const hasPhpFiles = files.some(f => f.endsWith('.php') || f === 'index.php');
  if (hasPhpFiles) {
    result.techStack = 'PHP Web Application';
    result.icon = 'php';
    result.command = 'php -S localhost:{port}';
    result.defaultPort = 8000;
    return result;
  }

  // Check for Python files
  const hasPython = files.some(f => f === 'app.py' || f === 'main.py' || f === 'requirements.txt' || f.endsWith('.py'));
  if (hasPython) {
    result.techStack = 'Python Application';
    result.icon = 'python';
    if (files.includes('app.py')) {
      result.command = 'python app.py';
    } else if (files.includes('main.py')) {
      result.command = 'python main.py';
    } else {
      result.command = 'python -m http.server {port}';
    }
    result.defaultPort = 5000;
    return result;
  }

  // Check for HTML file
  const hasHtml = files.some(f => f === 'index.html' || f.endsWith('.html'));
  if (hasHtml) {
    result.techStack = 'Sitio Web HTML/CSS/JS';
    result.icon = 'html';
    result.command = 'lummo:static';
    result.defaultPort = 8080;
    return result;
  }

  // Docker
  if (files.includes('docker-compose.yml') || files.includes('Dockerfile')) {
    result.techStack = 'Docker Container';
    result.icon = 'docker';
    result.command = 'docker compose up';
    result.defaultPort = 8080;
    return result;
  }

  return result;
}
