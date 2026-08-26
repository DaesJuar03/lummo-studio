import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { scaffoldNewProject } from '../electron/processManager.js';

describe('Project Scaffolding Wizard Suite', () => {
  const tempDir = path.join(os.tmpdir(), `lummo-scaffold-test-${Date.now()}`);

  afterEach(() => {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (e) {}
  });

  it('should scaffold an Express REST API template correctly', async () => {
    fs.mkdirSync(tempDir, { recursive: true });
    const logs = [];
    const res = await scaffoldNewProject({
      template: 'express-api',
      projectName: 'test-express-api',
      targetDirectory: tempDir,
      packageManager: 'npm'
    }, (log) => logs.push(log));

    expect(res.success).toBe(true);
    expect(fs.existsSync(res.projectPath)).toBe(true);
    expect(fs.existsSync(path.join(res.projectPath, 'package.json'))).toBe(true);
    expect(fs.existsSync(path.join(res.projectPath, 'server.js'))).toBe(true);
    expect(fs.existsSync(path.join(res.projectPath, '.env'))).toBe(true);

    const pkg = JSON.parse(fs.readFileSync(path.join(res.projectPath, 'package.json'), 'utf8'));
    expect(pkg.name).toBe('test-express-api');
  });

  it('should scaffold a Python FastAPI template correctly', async () => {
    fs.mkdirSync(tempDir, { recursive: true });
    const logs = [];
    const res = await scaffoldNewProject({
      template: 'python-fastapi',
      projectName: 'test-fastapi',
      targetDirectory: tempDir,
      packageManager: 'npm'
    }, (log) => logs.push(log));

    expect(res.success).toBe(true);
    expect(fs.existsSync(res.projectPath)).toBe(true);
    expect(fs.existsSync(path.join(res.projectPath, 'main.py'))).toBe(true);
    expect(fs.existsSync(path.join(res.projectPath, 'requirements.txt'))).toBe(true);
  });

  it('should scaffold a static HTML5 template correctly', async () => {
    fs.mkdirSync(tempDir, { recursive: true });
    const res = await scaffoldNewProject({
      template: 'html-static',
      projectName: 'test-static-web',
      targetDirectory: tempDir,
      packageManager: 'npm'
    });

    expect(res.success).toBe(true);
    expect(fs.existsSync(path.join(res.projectPath, 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(res.projectPath, 'style.css'))).toBe(true);
    expect(fs.existsSync(path.join(res.projectPath, 'app.js'))).toBe(true);
  });
});
