import { describe, it, expect } from 'vitest';

function sanitizeShellCommand(cmd) {
  if (typeof cmd !== 'string') return '';
  // Remover caracteres de control nulos o no imprimibles
  let clean = cmd.replace(/[\x00-\x08\x0E-\x1F\x7F]/g, '').trim();
  return clean;
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
