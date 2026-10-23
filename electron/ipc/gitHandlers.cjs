/**
 * Lummo Studio - Git IPC Controller
 * Proporciona detección nativa de Git, visor de ramas, historial de commits con topología para grafo,
 * soporte de staging/unstaging, diffs unificados/divididos y acciones de ramas/commits.
 */
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const { safeHandle } = require('./ipcUtils.cjs');

function runGit(folderPath, args, timeoutMs = 15000) {
  return new Promise((resolve) => {
    if (!folderPath || !fs.existsSync(folderPath)) {
      return resolve({ stdout: '', stderr: 'Carpeta no encontrada', code: 1 });
    }

    execFile('git', args, {
      cwd: folderPath,
      timeout: timeoutMs,
      maxBuffer: 15 * 1024 * 1024,
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
  // 1. Obtener estado general de Git (Rama, Cambios Staged/Unstaged, Ahead/Behind)
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
    const stagedFiles = [];
    const unstagedFiles = [];

    if (statusRes.stdout) {
      const lines = statusRes.stdout.split(/\r?\n/).filter(Boolean);
      for (const line of lines) {
        if (line.length < 3) continue;
        const indexStatus = line.substring(0, 1);
        const workTreeStatus = line.substring(1, 2);
        let rawPath = line.substring(3).trim();

        if (rawPath.startsWith('"') && rawPath.endsWith('"')) {
          rawPath = rawPath.slice(1, -1);
        }

        let currentPath = rawPath;
        let oldPath = null;
        if (rawPath.includes(' -> ')) {
          const parts = rawPath.split(' -> ');
          oldPath = parts[0];
          currentPath = parts[1];
        }

        // Staged changes (Index)
        if (indexStatus !== ' ' && indexStatus !== '?' && indexStatus !== '!') {
          let stType = 'MODIFIED';
          let letter = indexStatus;
          if (indexStatus === 'A') { stType = 'ADDED'; letter = 'A'; }
          else if (indexStatus === 'D') { stType = 'DELETED'; letter = 'D'; }
          else if (indexStatus === 'R') { stType = 'RENAMED'; letter = 'R'; }
          else if (indexStatus === 'M') { stType = 'MODIFIED'; letter = 'M'; }

          stagedFiles.push({
            path: currentPath,
            oldPath,
            status: stType,
            letter,
            isStaged: true
          });
        }

        // Unstaged changes (Working Tree & Untracked)
        if (indexStatus === '?' || workTreeStatus !== ' ') {
          let wtType = 'MODIFIED';
          let letter = workTreeStatus;
          if (indexStatus === '?' || workTreeStatus === '?') {
            wtType = 'UNTRACKED';
            letter = '?';
          } else if (workTreeStatus === 'D') {
            wtType = 'DELETED';
            letter = 'D';
          } else if (workTreeStatus === 'M') {
            wtType = 'MODIFIED';
            letter = 'M';
          } else if (workTreeStatus === 'A') {
            wtType = 'ADDED';
            letter = 'A';
          }

          unstagedFiles.push({
            path: currentPath,
            oldPath,
            status: wtType,
            letter,
            isStaged: false
          });
        }

        // Legacy compatibility
        let generalStatus = 'MODIFIED';
        if (indexStatus === '?' || workTreeStatus === '?') generalStatus = 'UNTRACKED';
        else if (indexStatus === 'A' || workTreeStatus === 'A') generalStatus = 'ADDED';
        else if (indexStatus === 'D' || workTreeStatus === 'D') generalStatus = 'DELETED';
        else if (indexStatus === 'R' || workTreeStatus === 'R') generalStatus = 'RENAMED';

        files.push({
          path: currentPath,
          oldPath,
          status: generalStatus,
          isStaged: indexStatus !== ' ' && indexStatus !== '?'
        });
      }
    }

    // Ahead / Behind de commits respecto al upstream
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
      stagedFiles,
      unstagedFiles,
      stagedCount: stagedFiles.length,
      unstagedCount: unstagedFiles.length,
      ahead,
      behind,
      remoteUrl,
      uncommittedCount: stagedFiles.length + unstagedFiles.length
    };
  });

  // 2. Historial de commits con topología para grafo y paginación
  safeHandle('git-get-history', async (event, payload) => {
    const folderPath = typeof payload === 'string' ? payload : payload?.folderPath;
    const limit = (typeof payload === 'object' && payload?.limit) ? payload.limit : 40;
    const skip = (typeof payload === 'object' && payload?.skip) ? payload.skip : 0;
    const branchFilter = (typeof payload === 'object' && payload?.branchFilter) ? payload.branchFilter : 'all';

    if (!folderPath) return { commits: [], totalCount: 0 };

    const args = ['log'];
    if (branchFilter === 'all') {
      args.push('--all');
    }
    args.push('--topo-order');
    args.push('-n', String(limit));
    if (skip > 0) {
      args.push(`--skip=${skip}`);
    }
    // Format: Hash | ShortHash | Parents | Author | Email | DateRelative | Subject | Refs
    args.push('--pretty=format:%H||%h||%P||%an||%ae||%cr||%s||%d');

    const logRes = await runGit(folderPath, args);

    // Conteo total para paginación / scroll progresivo
    const countArgs = ['rev-list', '--count'];
    if (branchFilter === 'all') {
      countArgs.push('--all');
    } else {
      countArgs.push('HEAD');
    }
    const countRes = await runGit(folderPath, countArgs);
    const totalCount = countRes.code === 0 ? parseInt(countRes.stdout.trim(), 10) || 0 : 0;

    if (logRes.code !== 0 || !logRes.stdout) {
      return { commits: [], totalCount };
    }

    const commits = logRes.stdout.split(/\r?\n/).filter(Boolean).map((line) => {
      const parts = line.split('||');
      const hash = parts[0] || '';
      const shortHash = parts[1] || '';
      const parentsRaw = parts[2] || '';
      const author = parts[3] || 'Developer';
      const email = parts[4] || '';
      const date = parts[5] || 'recent';
      const subject = parts[6] || 'Commit';
      const refs = parts[7] || '';

      let cleanRefs = [];
      if (refs) {
        cleanRefs = refs
          .replace(/[()]/g, '')
          .split(',')
          .map(r => r.trim())
          .filter(Boolean);
      }

      const parents = parentsRaw.trim() ? parentsRaw.trim().split(/\s+/).filter(Boolean) : [];

      return {
        hash,
        shortHash,
        parents,
        author,
        email,
        date,
        message: subject,
        refs: cleanRefs
      };
    });

    return { commits, totalCount };
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

  // 4. Cambiar de rama o ref (Checkout)
  safeHandle('git-checkout-branch', async (event, { folderPath, branchName }) => {
    if (!folderPath || !branchName) return { success: false, error: 'Parámetros inválidos' };

    const res = await runGit(folderPath, ['checkout', branchName]);
    if (res.code !== 0) {
      return { success: false, error: res.stderr || 'No se pudo cambiar de rama' };
    }
    return { success: true };
  });

  safeHandle('git-checkout', async (event, { folderPath, ref }) => {
    if (!folderPath || !ref) return { success: false, error: 'Referencia requerida' };
    const res = await runGit(folderPath, ['checkout', ref]);
    return { success: res.code === 0, error: res.stderr };
  });

  // 5. Staging individual y global
  safeHandle('git-stage-file', async (event, { folderPath, filePath }) => {
    if (!folderPath || !filePath) return { success: false, error: 'Parámetros inválidos' };
    const res = await runGit(folderPath, ['add', '--', filePath]);
    return { success: res.code === 0, error: res.stderr };
  });

  safeHandle('git-unstage-file', async (event, { folderPath, filePath }) => {
    if (!folderPath || !filePath) return { success: false, error: 'Parámetros inválidos' };
    let res = await runGit(folderPath, ['restore', '--staged', '--', filePath]);
    if (res.code !== 0) {
      res = await runGit(folderPath, ['reset', 'HEAD', '--', filePath]);
    }
    return { success: res.code === 0, error: res.stderr };
  });

  safeHandle('git-stage-all', async (event, folderPath) => {
    if (!folderPath) return { success: false };
    const res = await runGit(folderPath, ['add', '-A']);
    return { success: res.code === 0, error: res.stderr };
  });

  safeHandle('git-unstage-all', async (event, folderPath) => {
    if (!folderPath) return { success: false };
    let res = await runGit(folderPath, ['restore', '--staged', '.']);
    if (res.code !== 0) {
      res = await runGit(folderPath, ['reset', 'HEAD']);
    }
    return { success: res.code === 0, error: res.stderr };
  });

  // 6. Descartar cambios
  safeHandle('git-discard-file', async (event, { folderPath, filePath, isUntracked }) => {
    if (!folderPath || !filePath) return { success: false, error: 'Parámetros inválidos' };
    if (isUntracked) {
      const fullPath = path.resolve(folderPath, filePath);
      try {
        if (fs.existsSync(fullPath)) {
          fs.rmSync(fullPath, { recursive: true, force: true });
          return { success: true };
        }
      } catch {
        const cleanRes = await runGit(folderPath, ['clean', '-f', '-d', '--', filePath]);
        return { success: cleanRes.code === 0, error: cleanRes.stderr };
      }
    }
    let res = await runGit(folderPath, ['restore', '--', filePath]);
    if (res.code !== 0) {
      res = await runGit(folderPath, ['checkout', '--', filePath]);
    }
    return { success: res.code === 0, error: res.stderr };
  });

  safeHandle('git-discard-all', async (event, folderPath) => {
    if (!folderPath) return { success: false };
    let res = await runGit(folderPath, ['restore', '.']);
    if (res.code !== 0) {
      res = await runGit(folderPath, ['checkout', '--', '.']);
    }
    return { success: res.code === 0, error: res.stderr };
  });

  // 7. Visor de Diferencias (Diff)
  safeHandle('git-get-diff', async (event, { folderPath, filePath, staged = false }) => {
    if (!folderPath || !filePath) return { diff: '', error: 'Parámetros inválidos' };

    let args = staged ? ['diff', '--cached', '--', filePath] : ['diff', '--', filePath];
    const res = await runGit(folderPath, args);
    let diff = res.stdout;

    // Si no es staged y está vacío, podría ser archivo nuevo (Untracked)
    if (!staged && (!diff || !diff.trim())) {
      const fullPath = path.resolve(folderPath, filePath);
      if (fs.existsSync(fullPath)) {
        try {
          const stat = fs.statSync(fullPath);
          if (stat.isFile()) {
            if (stat.size > 2 * 1024 * 1024) {
              return { diff: 'Archivo demasiado grande para mostrar vista previa de diferencias.', isLarge: true };
            }
            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.split(/\r?\n/);
            diff = `diff --git a/${filePath} b/${filePath}\nnew file mode 100644\n--- /dev/null\n+++ b/${filePath}\n@@ -0,0 +1,${lines.length} @@\n` +
              lines.map(l => `+${l}`).join('\n');
          }
        } catch {
          // Ignorar fallo de lectura
        }
      }
    }

    return { diff: diff || '', error: res.code !== 0 ? res.stderr : null };
  });

  // 8. Hacer commit (Solo lo que esté en staging)
  safeHandle('git-commit', async (event, payload) => {
    const folderPath = payload?.folderPath;
    const message = payload?.message;
    const body = payload?.body;
    if (!folderPath || !message) return { success: false, error: 'Título de commit requerido' };

    const args = ['commit', '-m', message];
    if (body && typeof body === 'string' && body.trim()) {
      args.push('-m', body.trim());
    }

    const res = await runGit(folderPath, args);
    if (res.code !== 0) {
      return { success: false, error: res.stderr || 'Error al crear commit' };
    }
    return { success: true };
  });

  // 9. Acciones contextuales: Crear rama y Revertir commit
  safeHandle('git-create-branch', async (event, { folderPath, branchName, startPoint }) => {
    if (!folderPath || !branchName) return { success: false, error: 'Nombre de rama requerido' };
    const args = ['checkout', '-b', branchName];
    if (startPoint) args.push(startPoint);
    const res = await runGit(folderPath, args);
    return { success: res.code === 0, error: res.stderr };
  });

  safeHandle('git-revert-commit', async (event, { folderPath, hash }) => {
    if (!folderPath || !hash) return { success: false, error: 'Hash de commit requerido' };
    const res = await runGit(folderPath, ['revert', '--no-edit', hash]);
    return { success: res.code === 0, error: res.stderr };
  });

  // 10. Push & Pull
  safeHandle('git-push', async (event, folderPath) => {
    if (!folderPath) return { success: false, error: 'Ruta no válida' };
    const res = await runGit(folderPath, ['push'], 25000);
    if (res.code !== 0) {
      return { success: false, error: res.stderr || 'Error al ejecutar git push' };
    }
    return { success: true };
  });

  safeHandle('git-pull', async (event, folderPath) => {
    if (!folderPath) return { success: false, error: 'Ruta no válida' };
    const res = await runGit(folderPath, ['pull'], 25000);
    if (res.code !== 0) {
      return { success: false, error: res.stderr || 'Error al ejecutar git pull' };
    }
    return { success: true };
  });
}

module.exports = {
  registerGitHandlers
};
