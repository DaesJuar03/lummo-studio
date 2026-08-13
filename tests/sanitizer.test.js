import { describe, it, expect } from 'vitest';

function sanitizeShellCommand(cmd) {
  if (typeof cmd !== 'string') return '';
  // Remover caracteres de control nulos o no imprimibles
  let clean = cmd.replace(/[\x00-\x08\x0E-\x1F\x7F]/g, '').trim();
  return clean;
}

function validateAndSanitizeGitUrl(repoUrl) {
  if (typeof repoUrl !== 'string') {
    return { valid: false, error: 'URL del repositorio no válida.' };
  }
  const cleanUrl = repoUrl.trim();
  if (!cleanUrl) {
    return { valid: false, error: 'Por favor ingresa una URL de repositorio Git.' };
  }
  if (cleanUrl.startsWith('-')) {
    return { valid: false, error: 'URL inválida. No se permiten opciones de comando en la URL.' };
  }
  if (/[\x00-\x1F\x7F\r\n]/.test(cleanUrl)) {
    return { valid: false, error: 'La URL contiene caracteres prohibidos o saltos de línea.' };
  }
  const validGitProtocol = /^(https?:\/\/|git@|ssh:\/\/|git:\/\/)/i;
  if (!validGitProtocol.test(cleanUrl)) {
    return { 
      valid: false, 
      error: 'Formato de URL no soportado. Debe comenzar con https://, http://, git@, ssh:// o git://' 
    };
  }
  return { valid: true, cleanUrl };
}

describe('Shell Command Sanitizer', () => {
  it('debería mantener comandos válidos intactos', () => {
    expect(sanitizeShellCommand('npm run dev')).toBe('npm run dev');
    expect(sanitizeShellCommand('php artisan serve --port=8000')).toBe('php artisan serve --port=8000');
  });

  it('debería purgar caracteres nulos y de control no imprimibles', () => {
    const maliciousCmd = 'npm run dev\x00; rm -rf /';
    const cleaned = sanitizeShellCommand(maliciousCmd);
    expect(cleaned).not.toContain('\x00');
    expect(cleaned).toBe('npm run dev; rm -rf /');
  });

  it('debería retornar cadena vacía para entradas no válidas', () => {
    expect(sanitizeShellCommand(null)).toBe('');
    expect(sanitizeShellCommand(undefined)).toBe('');
    expect(sanitizeShellCommand(12345)).toBe('');
  });
});

describe('Git URL Sanitizer & Security Validator', () => {
  it('debería aceptar URLs de Git válidas', () => {
    expect(validateAndSanitizeGitUrl('https://github.com/usuario/repo.git').valid).toBe(true);
    expect(validateAndSanitizeGitUrl('http://gitlab.com/usuario/repo').valid).toBe(true);
    expect(validateAndSanitizeGitUrl('git@github.com:usuario/repo.git').valid).toBe(true);
    expect(validateAndSanitizeGitUrl('ssh://git@github.com/user/repo.git').valid).toBe(true);
  });

  it('debería rechazar inyección de opciones que comienzan con guion (-)', () => {
    const res = validateAndSanitizeGitUrl('--upload-pack=calc.exe');
    expect(res.valid).toBe(false);
    expect(res.error).toContain('No se permiten opciones');
  });

  it('debería rechazar protocolos no soportados o entradas peligrosas', () => {
    expect(validateAndSanitizeGitUrl('ftp://example.com/repo.git').valid).toBe(false);
    expect(validateAndSanitizeGitUrl('file:///etc/passwd').valid).toBe(false);
    expect(validateAndSanitizeGitUrl('javascript:alert(1)').valid).toBe(false);
  });

  it('debería rechazar entradas con saltos de línea o caracteres nulos', () => {
    expect(validateAndSanitizeGitUrl('https://github.com/repo.git\r\ncalc.exe').valid).toBe(false);
    expect(validateAndSanitizeGitUrl('https://github.com/repo.git\x00').valid).toBe(false);
  });
});

