/**
 * Lummo Studio - Git IPC Controller
 * Proporciona detección nativa de Git, visor de ramas, historial de commits y sincronización.
 */
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const { safeHandle } = require('./ipcUtils.cjs');

function runGit(folderPath, args, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    if (!folderPath || !fs.existsSync(folderPath)) {
      return resolve({ stdout: '', stderr: 'Folder not found', code: 1 });
    }

    execFile('git', args, {
      cwd: folderPath,
      timeout: timeoutMs,
      maxBuffer: 10 * 1024 * 1024,
      windowsHide: true
    }, (err, stdout, stderr) => {
      if (err) {
        return resolve({ stdout: stdout || '', stderr: stderr || err.message, code: err.code || 1 });
      }
      resolve({ stdout: stdout || '', stderr: stderr || '', code: 0 });
    });
  });
}

function registerGitHandlers() {
  // 1. Obtener estado general de Git (Rama, Cambios, Ahead/Behind)
  safeHandle('git-get-status', async (event, folderPath) => {
    if (!folderPath) return { hasGit: false };

    const gitDir = path.join(folderPath, '.git');
    if (!fs.existsSync(gitDir)) {
      return { hasGit: false };
    }

    // Verificar si es work tree válido
    const check = await runGit(folderPath, ['rev-parse', '--is-inside-work-tree']);
    if (check.code !== 0 || !check.stdout.trim().includes('true')) {
      return { hasGit: false };
    }

    // Obtener rama actual
    const branchRes = await runGit(folderPath, ['branch', '--show-current']);
    let currentBranch = branchRes.stdout.trim();
    if (!currentBranch) {
      // Fallback si está en detached HEAD
      const headRes = await runGit(folderPath, ['rev-parse', '--short', 'HEAD']);
      currentBranch = headRes.stdout.trim() ? `HEAD (${headRes.stdout.trim()})` : 'main';
    }

    // Obtener archivos modificados (git status --porcelain=v1)
    const statusRes = await runGit(folderPath, ['status', '--porcelain=v1']);
    const files = [];
    if (statusRes.stdout) {
      const lines = statusRes.stdout.split(/\r?\n/).filter(Boolean);
      for (const line of lines) {
        const indexStatus = line.substring(0, 1);
        const workTreeStatus = line.substring(1, 2);
        const filePath = line.substring(3).trim();

        let statusType = 'MODIFIED';
        if (indexStatus === '?' || workTreeStatus === '?') statusType = 'UNTRACKED';
        else if (indexStatus === 'A' || workTreeStatus === 'A') statusType = 'ADDED';
        else if (indexStatus === 'D' || workTreeStatus === 'D') statusType = 'DELETED';
        else if (indexStatus === 'R' || workTreeStatus === 'R') statusType = 'RENAMED';

        files.push({
          path: filePath,
          status: statusType,
          isStaged: indexStatus !== ' ' && indexStatus !== '?'
        });
      }
    }

    // Ahead / Behind de commits respecto al remoto
    let ahead = 0;
    let behind = 0;
    const trackingRes = await runGit(folderPath, ['rev-list', '--left-right', '--count', 'HEAD...@{upstream}']);
    if (trackingRes.code === 0 && trackingRes.stdout.trim()) {
      const parts = trackingRes.stdout.trim().split(/\s+/);
      ahead = parseInt(parts[0], 10) || 0;
      behind = parseInt(parts[1], 10) || 0;
    }

    // Remote Origin URL
    const remoteRes = await runGit(folderPath, ['remote', 'get-url', 'origin']);
    const remoteUrl = remoteRes.code === 0 ? remoteRes.stdout.trim() : null;

    return {
      hasGit: true,
      currentBranch,
      files,
      ahead,
      behind,
      remoteUrl,
      uncommittedCount: files.length
    };
  });

  // 2. Historial de commits con detalles y grafo
  safeHandle('git-get-history', async (event, { folderPath, limit = 50 }) => {
    if (!folderPath) return { commits: [] };

    // Format: Hash | ShortHash | Author | Email | DateRelative | Subject | Refs
    const logRes = await runGit(folderPath, [
      'log',
      `-n`, String(limit),
      '--pretty=format:%H||%h||%an||%ae||%cr||%s||%d'
    ]);

    if (logRes.code !== 0 || !logRes.stdout) {
      return { commits: [] };
    }

    const commits = logRes.stdout.split(/\r?\n/).filter(Boolean).map((line) => {
      const [hash, shortHash, author, email, date, subject, refs] = line.split('||');
      
      let cleanRefs = [];
      if (refs) {
        cleanRefs = refs
          .replace(/[()]/g, '')
          .split(',')
          .map(r => r.trim())
          .filter(Boolean);
      }

      return {
        hash,
        shortHash,
        author: author || 'Developer',
        email: email || '',
        date: date || 'recent',
        message: subject || 'Commit',
        refs: cleanRefs
      };
    });

    return { commits };
  });

  // 3. Obtener lista de ramas locales y remotas
  safeHandle('git-get-branches', async (event, folderPath) => {
    if (!folderPath) return { branches: [] };

    const res = await runGit(folderPath, ['branch', '-a']);
    if (res.code !== 0) return { branches: [] };

    const branches = [];
    const lines = res.stdout.split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      const isCurrent = line.startsWith('*');
      const cleanName = line.replace('*', '').trim();
      const isRemote = cleanName.startsWith('remotes/');
      
      branches.push({
        name: cleanName,
        isCurrent,
        isRemote
      });
    }

    return { branches };
  });

  // 4. Cambiar de rama (Checkout)
  safeHandle('git-checkout-branch', async (event, { folderPath, branchName }) => {
    if (!folderPath || !branchName) return { success: false, error: 'Parámetros inválidos' };

    const res = await runGit(folderPath, ['checkout', branchName]);
    if (res.code !== 0) {
      return { success: false, error: res.stderr || 'No se pudo cambiar de rama' };
    }
    return { success: true };
  });

  // 5. Preparar archivos (Stage All)
  safeHandle('git-stage-all', async (event, folderPath) => {
    if (!folderPath) return { success: false };
    const res = await runGit(folderPath, ['add', '-A']);
    return { success: res.code === 0, error: res.stderr };
  });

  // 6. Hacer commit
  safeHandle('git-commit', async (event, { folderPath, message }) => {
    if (!folderPath || !message) return { success: false, error: 'Mensaje requerido' };

    // Auto stage all before commit
    await runGit(folderPath, ['add', '-A']);

    const res = await runGit(folderPath, ['commit', '-m', message]);
    if (res.code !== 0) {
      return { success: false, error: res.stderr || 'Error al crear commit' };
    }
    return { success: true };
  });

  // 7. Push
  safeHandle('git-push', async (event, folderPath) => {
    if (!folderPath) return { success: false, error: 'Ruta no válida' };
    const res = await runGit(folderPath, ['push'], 20000);
    if (res.code !== 0) {
      return { success: false, error: res.stderr || 'Error al ejecutar git push' };
    }
    return { success: true };
  });

  // 8. Pull
  safeHandle('git-pull', async (event, folderPath) => {
    if (!folderPath) return { success: false, error: 'Ruta no válida' };
    const res = await runGit(folderPath, ['pull'], 20000);
    if (res.code !== 0) {
      return { success: false, error: res.stderr || 'Error al ejecutar git pull' };
    }
    return { success: true };
  });
}

module.exports = {
  registerGitHandlers
};
