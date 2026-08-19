import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

function execPromise(cmd, timeout = 3000) {
  return new Promise((resolve) => {
    exec(cmd, { timeout }, (error, stdout) => {
      if (error) {
        resolve(null);
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

function checkPathExists(candidatePaths) {
  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      // ignore
    }
  }
  return null;
}

export async function scanSystemEnvironment() {
  const results = {
    node: { installed: false, version: null, path: null },
    php: { installed: false, version: null, path: null },
    mysql: { installed: false, version: null, path: null },
    postgres: { installed: false, version: null, path: null },
    python: { installed: false, version: null, path: null },
    docker: { installed: false, version: null, path: null },
    git: { installed: false, version: null, path: null },
    sqlite: { installed: true, version: 'Built-in Lummo Engine', path: 'Internal' }
  };

  // 1. Node.js
  const nodeVer = await execPromise('node -v');
  if (nodeVer) {
    results.node.installed = true;
    results.node.version = nodeVer;
  }

  // 2. PHP
  let phpVer = await execPromise('php -v');
  if (phpVer) {
    results.php.installed = true;
    results.php.version = phpVer.split('\n')[0];
  } else {
    // Check standard Windows locations
    const phpPath = checkPathExists([
      'C:\\xampp\\php\\php.exe',
      'C:\\php\\php.exe',
      'C:\\Program Files\\PHP\\php.exe',
      'C:\\tools\\php\\php.exe'
    ]);
    if (phpPath) {
      const phpVerSub = await execPromise(`"${phpPath}" -v`);
      results.php.installed = true;
      results.php.version = phpVerSub ? phpVerSub.split('\n')[0] : 'Installed';
      results.php.path = phpPath;
    }
  }

  // 3. MySQL / MariaDB
  let mysqlVer = await execPromise('mysql --version');
  if (mysqlVer) {
    results.mysql.installed = true;
    results.mysql.version = mysqlVer;
  } else {
    const mysqlPath = checkPathExists([
      'C:\\xampp\\mysql\\bin\\mysql.exe',
      'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe',
      'C:\\Program Files\\MariaDB 10.5\\bin\\mysql.exe',
      'C:\\Program Files\\MariaDB 10.6\\bin\\mysql.exe',
      'C:\\Program Files\\MariaDB 10.11\\bin\\mysql.exe'
    ]);
    if (mysqlPath) {
      const mysqlVerSub = await execPromise(`"${mysqlPath}" --version`);
      results.mysql.installed = true;
      results.mysql.version = mysqlVerSub || 'Installed (XAMPP/Local)';
      results.mysql.path = mysqlPath;
    }
  }

  // 4. PostgreSQL
  let pgVer = await execPromise('psql --version');
  if (pgVer) {
    results.postgres.installed = true;
    results.postgres.version = pgVer;
  } else {
    const pgPath = checkPathExists([
      'C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe',
      'C:\\Program Files\\PostgreSQL\\15\\bin\\psql.exe',
      'C:\\Program Files\\PostgreSQL\\14\\bin\\psql.exe',
      'C:\\Program Files\\PostgreSQL\\13\\bin\\psql.exe'
    ]);
    if (pgPath) {
      results.postgres.installed = true;
      results.postgres.version = 'PostgreSQL (Installed)';
      results.postgres.path = pgPath;
    }
  }

  // 5. Python
  let pyVer = await execPromise('python --version');
  if (!pyVer) pyVer = await execPromise('py -3 --version');
  if (pyVer) {
    results.python.installed = true;
    results.python.version = pyVer;
  }

  // 6. Docker
  let dockerVer = await execPromise('docker --version');
  if (dockerVer) {
    results.docker.installed = true;
    results.docker.version = dockerVer;
  }

  // 7. Git
  let gitVer = await execPromise('git --version');
  if (gitVer) {
    results.git.installed = true;
    results.git.version = gitVer;
  } else {
    const gitPath = checkPathExists([
      'C:\\Program Files\\Git\\cmd\\git.exe',
      'C:\\Program Files\\Git\\bin\\git.exe'
    ]);
    if (gitPath) {
      results.git.installed = true;
      results.git.version = 'Git for Windows';
      results.git.path = gitPath;
    }
  }

  return results;
}
