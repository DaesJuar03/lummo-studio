import { describe, it, expect } from 'vitest';
import path from 'path';
import { detectProjectType } from '../electron/detector.js';

describe('Project Detector Module', () => {
  it('debería retornar una configuración por defecto para carpetas no existentes', () => {
    const nonExistentPath = path.join(__dirname, 'non_existent_folder_xyz_123');
    const result = detectProjectType(nonExistentPath);
    
    expect(result).toBeDefined();
    expect(result.techStack).toBe('Proyectos Varios');
    expect(result.command).toBe('lummo:static');
    expect(result.hasPackageJson).toBe(false);
  });

  it('debería detectar un proyecto Vite + React cuando package.json contiene vite y react', () => {
    // Probamos sobre el propio proyecto Lummo Studio
    const rootPath = path.resolve(__dirname, '..');
    const result = detectProjectType(rootPath);
    
    expect(result).toBeDefined();
    expect(result.hasPackageJson).toBe(true);
    expect(result.techStack).toContain('Vite');
  });
});
