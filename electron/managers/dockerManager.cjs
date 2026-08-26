const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function execPromise(cmd, cwd) {
  return new Promise((resolve) => {
    exec(cmd, { cwd: cwd || process.cwd(), maxBuffer: 1024 * 1024 * 5 }, (err, stdout, stderr) => {
      if (err) {
        resolve({ success: false, error: err.message, stderr: (stderr || '').trim(), stdout: (stdout || '').trim() });
      } else {
        resolve({ success: true, stdout: (stdout || '').trim(), stderr: (stderr || '').trim() });
      }
    });
  });
}

/**
 * Comprueba si Docker y Docker Compose están instalados y disponibles en el PATH
 */
async function checkDockerAvailable() {
  const dockerRes = await execPromise('docker --version');
  const composeRes = await execPromise('docker compose version');

  const isInstalled = dockerRes.success;
  const hasCompose = composeRes.success;

  return {
    installed: isInstalled,
    dockerVersion: isInstalled ? dockerRes.stdout : null,
    composeVersion: hasCompose ? composeRes.stdout : null,
    hasCompose
  };
}

/**
 * Detecta archivos Docker en el proyecto
 */
function detectDockerFiles(folderPath) {
  if (!folderPath || !fs.existsSync(folderPath)) {
    return { hasDocker: false, composeFile: null, hasDockerfile: false };
  }

  const composeCandidates = [
    'docker-compose.yml',
    'docker-compose.yaml',
    'compose.yml',
    'compose.yaml'
  ];

  let foundCompose = null;
  for (const candidate of composeCandidates) {
    const fullPath = path.join(folderPath, candidate);
    if (fs.existsSync(fullPath)) {
      foundCompose = candidate;
      break;
    }
  }

  const hasDockerfile = fs.existsSync(path.join(folderPath, 'Dockerfile'));

  return {
    hasDocker: Boolean(foundCompose || hasDockerfile),
    composeFile: foundCompose,
    hasDockerfile
  };
}

/**
 * Obtiene el estado actual de los contenedores de Docker Compose
 */
async function getComposeStatus(folderPath) {
  const detection = detectDockerFiles(folderPath);
  if (!detection.composeFile) {
    return { success: false, error: 'No se encontró archivo docker-compose en este proyecto.', services: [] };
  }

  const res = await execPromise('docker compose ps --format json', folderPath);

  if (!res.success) {
    // Si docker daemon no está corriendo o docker compose ps falla
    return {
      success: false,
      error: res.error || res.stderr || 'No se pudo conectar al daemon de Docker.',
      composeFile: detection.composeFile,
      services: []
    };
  }

  let services = [];

  if (res.stdout) {
    try {
      // Docker compose ps --format json returns either a JSON array or newline-delimited JSON objects
      const trimmed = res.stdout.trim();
      if (trimmed.startsWith('[')) {
        services = JSON.parse(trimmed);
      } else if (trimmed.length > 0) {
        services = trimmed.split('\n').map(line => {
          try {
            return JSON.parse(line);
          } catch (e) {
            return null;
          }
        }).filter(Boolean);
      }
    } catch (e) {
      console.warn('Error parseando JSON de docker compose ps:', e);
    }
  }

  // Normalizar campos para la UI
  const normalizedServices = services.map(s => ({
    name: s.Name || s.name || s.Service || 'servicio',
    service: s.Service || s.service || s.Name || 'servicio',
    state: (s.State || s.state || s.Status || '').toLowerCase(),
    status: s.Status || s.status || s.State || 'Desconocido',
    ports: s.Publishers ? s.Publishers.map(p => `${p.PublishedPort || ''}:${p.TargetPort || ''}`).join(', ') : (s.Ports || s.ports || ''),
    image: s.Image || s.image || ''
  }));

  return {
    success: true,
    composeFile: detection.composeFile,
    services: normalizedServices,
    rawCount: normalizedServices.length
  };
}

/**
 * Ejecuta una acción de Docker Compose (up, stop, restart, down)
 */
async function runComposeAction(folderPath, action = 'up', serviceName = '') {
  const detection = detectDockerFiles(folderPath);
  if (!detection.composeFile) {
    return { success: false, error: 'No existe archivo docker-compose en el directorio.' };
  }

  let cmd = '';
  switch (action) {
    case 'up':
      cmd = serviceName ? `docker compose up -d ${serviceName}` : `docker compose up -d`;
      break;
    case 'stop':
      cmd = serviceName ? `docker compose stop ${serviceName}` : `docker compose stop`;
      break;
    case 'restart':
      cmd = serviceName ? `docker compose restart ${serviceName}` : `docker compose restart`;
      break;
    case 'down':
      cmd = `docker compose down`;
      break;
    default:
      cmd = `docker compose up -d`;
      break;
  }

  const res = await execPromise(cmd, folderPath);
  if (res.success) {
    return {
      success: true,
      action,
      serviceName,
      message: `Comando "${cmd}" ejecutado exitosamente.`,
      output: res.stdout || res.stderr
    };
  } else {
    return {
      success: false,
      action,
      serviceName,
      error: res.stderr || res.error || 'Fallo al ejecutar comando de Docker Compose'
    };
  }
}

/**
 * Obtiene los logs de un servicio o de todo el compose
 */
async function getComposeLogs(folderPath, serviceName = '', tail = 100) {
  const detection = detectDockerFiles(folderPath);
  if (!detection.composeFile) {
    return { success: false, error: 'No existe archivo docker-compose.', logs: [] };
  }

  const cmd = serviceName 
    ? `docker compose logs --tail=${tail} ${serviceName}` 
    : `docker compose logs --tail=${tail}`;

  const res = await execPromise(cmd, folderPath);
  return {
    success: res.success,
    logs: (res.stdout || res.stderr || '').split('\n'),
    error: res.success ? null : res.stderr || res.error
  };
}

/**
 * Generador de archivos docker-compose.yml preconfigurados
 * @param {string} folderPath - Directorio donde guardar el archivo
 * @param {Array<string>} selectedServices - ['postgres', 'mysql', 'redis', 'mongodb', 'mailpit', 'rabbitmq', 'minio']
 * @param {object} customConfig - Puertos y nombres de BD personalizados
 */
function generateComposeYaml(folderPath, selectedServices = [], customConfig = {}) {
  if (!folderPath) {
    return { success: false, error: 'Ruta de carpeta inválida' };
  }

  const services = {};
  const volumes = {};

  const projectName = (path.basename(folderPath) || 'app').toLowerCase().replace(/[^a-z0-9_-]/g, '_');

  selectedServices.forEach((svc) => {
    switch (svc) {
      case 'postgres':
        services['postgres'] = {
          image: 'postgres:16-alpine',
          container_name: `${projectName}_postgres`,
          restart: 'unless-stopped',
          environment: {
            POSTGRES_USER: customConfig.postgresUser || 'postgres',
            POSTGRES_PASSWORD: customConfig.postgresPassword || 'postgres',
            POSTGRES_DB: customConfig.postgresDb || `${projectName}_db`
          },
          ports: [`${customConfig.postgresPort || 5432}:5432`],
          volumes: ['postgres_data:/var/lib/postgresql/data']
        };
        volumes['postgres_data'] = { driver: 'local' };
        break;

      case 'mysql':
        services['mysql'] = {
          image: 'mysql:8.0',
          container_name: `${projectName}_mysql`,
          restart: 'unless-stopped',
          environment: {
            MYSQL_ROOT_PASSWORD: customConfig.mysqlRootPassword || 'root',
            MYSQL_DATABASE: customConfig.mysqlDb || `${projectName}_db`,
            MYSQL_USER: customConfig.mysqlUser || 'user',
            MYSQL_PASSWORD: customConfig.mysqlPassword || 'password'
          },
          ports: [`${customConfig.mysqlPort || 3306}:3306`],
          volumes: ['mysql_data:/var/lib/mysql']
        };
        volumes['mysql_data'] = { driver: 'local' };
        break;

      case 'redis':
        services['redis'] = {
          image: 'redis:7-alpine',
          container_name: `${projectName}_redis`,
          restart: 'unless-stopped',
          command: 'redis-server --appendonly yes',
          ports: [`${customConfig.redisPort || 6379}:6379`],
          volumes: ['redis_data:/data']
        };
        volumes['redis_data'] = { driver: 'local' };
        break;

      case 'mongodb':
        services['mongodb'] = {
          image: 'mongo:7.0',
          container_name: `${projectName}_mongodb`,
          restart: 'unless-stopped',
          environment: {
            MONGO_INITDB_ROOT_USERNAME: customConfig.mongoUser || 'root',
            MONGO_INITDB_ROOT_PASSWORD: customConfig.mongoPassword || 'root'
          },
          ports: [`${customConfig.mongoPort || 27017}:27017`],
          volumes: ['mongodb_data:/data/db']
        };
        volumes['mongodb_data'] = { driver: 'local' };
        break;

      case 'mailpit':
        services['mailpit'] = {
          image: 'axllent/mailpit:latest',
          container_name: `${projectName}_mailpit`,
          restart: 'unless-stopped',
          ports: [
            `${customConfig.mailpitSmtpPort || 1025}:1025`,
            `${customConfig.mailpitHttpPort || 8025}:8025`
          ]
        };
        break;

      case 'rabbitmq':
        services['rabbitmq'] = {
          image: 'rabbitmq:3-management-alpine',
          container_name: `${projectName}_rabbitmq`,
          restart: 'unless-stopped',
          environment: {
            RABBITMQ_DEFAULT_USER: customConfig.rabbitUser || 'guest',
            RABBITMQ_DEFAULT_PASS: customConfig.rabbitPass || 'guest'
          },
          ports: [
            `${customConfig.rabbitPort || 5672}:5672`,
            `${customConfig.rabbitMgmtPort || 15672}:15672`
          ]
        };
        break;

      case 'minio':
        services['minio'] = {
          image: 'minio/minio:latest',
          container_name: `${projectName}_minio`,
          restart: 'unless-stopped',
          command: 'server /data --console-address ":9001"',
          environment: {
            MINIO_ROOT_USER: customConfig.minioUser || 'minioadmin',
            MINIO_ROOT_PASSWORD: customConfig.minioPassword || 'minioadmin'
          },
          ports: [
            `${customConfig.minioPort || 9000}:9000`,
            `${customConfig.minioConsolePort || 9001}:9001`
          ],
          volumes: ['minio_data:/data']
        };
        volumes['minio_data'] = { driver: 'local' };
        break;
    }
  });

  // Convert to clean standard YAML
  let yamlContent = `# ====================================================================\n# Docker Compose generado automáticamente por Lummo Studio\n# Proyecto: ${projectName}\n# ====================================================================\n\nversion: '3.8'\n\nservices:\n`;

  for (const [sName, sDef] of Object.entries(services)) {
    yamlContent += `  ${sName}:\n`;
    yamlContent += `    image: ${sDef.image}\n`;
    yamlContent += `    container_name: ${sDef.container_name}\n`;
    yamlContent += `    restart: ${sDef.restart}\n`;
    if (sDef.command) {
      yamlContent += `    command: ${sDef.command}\n`;
    }
    if (sDef.environment) {
      yamlContent += `    environment:\n`;
      for (const [k, v] of Object.entries(sDef.environment)) {
        yamlContent += `      ${k}: "${v}"\n`;
      }
    }
    if (sDef.ports && sDef.ports.length > 0) {
      yamlContent += `    ports:\n`;
      sDef.ports.forEach(p => {
        yamlContent += `      - "${p}"\n`;
      });
    }
    if (sDef.volumes && sDef.volumes.length > 0) {
      yamlContent += `    volumes:\n`;
      sDef.volumes.forEach(v => {
        yamlContent += `      - ${v}\n`;
      });
    }
    yamlContent += `\n`;
  }

  if (Object.keys(volumes).length > 0) {
    yamlContent += `volumes:\n`;
    for (const vName of Object.keys(volumes)) {
      yamlContent += `  ${vName}:\n    driver: local\n`;
    }
  }

  const targetFile = path.join(folderPath, 'docker-compose.yml');
  try {
    fs.writeFileSync(targetFile, yamlContent, 'utf-8');
    return {
      success: true,
      filePath: targetFile,
      servicesCount: Object.keys(services).length,
      yamlContent
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = {
  checkDockerAvailable,
  detectDockerFiles,
  getComposeStatus,
  runComposeAction,
  getComposeLogs,
  generateComposeYaml
};
