import { describe, it, expect } from 'vitest';
import sslManager from '../electron/managers/sslManager.cjs';
import fs from 'fs';

describe('Trusted Local SSL & Root CA Manager Suite', () => {
  it('debería retornar las rutas estructuradas de almacenamiento de certificados', () => {
    const { sslDir, certsDir, caCertPath, caPfxPath } = sslManager.getCaPaths();
    expect(sslDir).toBeDefined();
    expect(certsDir).toBeDefined();
    expect(caCertPath).toContain('LummoCA.crt');
    expect(caPfxPath).toContain('LummoCA.pfx');
    expect(fs.existsSync(sslDir)).toBe(true);
    expect(fs.existsSync(certsDir)).toBe(true);
  });

  it('debería consultar el estado del subsistema SSL correctamente', () => {
    const status = sslManager.getSslStatus();
    expect(status).toBeDefined();
    expect(typeof status.caInstalled).toBe('boolean');
    expect(status.caName).toBe('Lummo Local Development CA');
    expect(status.sslDefaultPort).toBe(8443);
    expect(typeof status.generatedCertCount).toBe('number');
  });

  it('debería contener la constante de nombre común para la Autoridad Raíz de Lummo', () => {
    expect(sslManager.CA_COMMON_NAME).toBe('Lummo Local Development CA');
    expect(sslManager.DEFAULT_PASSPHRASE).toBeDefined();
  });
});
