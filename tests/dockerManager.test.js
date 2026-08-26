import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import dockerManager from '../electron/managers/dockerManager.cjs';

describe('Docker Compose Manager & Generator Suite', () => {
  const tempDir = path.join(os.tmpdir(), `lummo-docker-test-${Date.now()}`);

  afterEach(() => {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (e) {}
  });

  it('checkDockerAvailable should return a structured status object', async () => {
    const res = await dockerManager.checkDockerAvailable();
    expect(res).toBeDefined();
    expect(typeof res.installed).toBe('boolean');
    expect(typeof res.hasCompose).toBe('boolean');
  });

  it('detectDockerFiles should return false on empty directory', () => {
    fs.mkdirSync(tempDir, { recursive: true });
    const res = dockerManager.detectDockerFiles(tempDir);
    expect(res.hasDocker).toBe(false);
    expect(res.composeFile).toBeNull();
    expect(res.hasDockerfile).toBe(false);
  });

  it('detectDockerFiles should detect docker-compose.yml and Dockerfile correctly', () => {
    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'docker-compose.yml'), 'version: "3.8"\nservices:\n  redis:\n    image: redis:7-alpine\n');
    fs.writeFileSync(path.join(tempDir, 'Dockerfile'), 'FROM node:20\n');

    const res = dockerManager.detectDockerFiles(tempDir);
    expect(res.hasDocker).toBe(true);
    expect(res.composeFile).toBe('docker-compose.yml');
    expect(res.hasDockerfile).toBe(true);
  });

  it('generateComposeYaml should generate standard YAML with PostgreSQL and Redis', () => {
    fs.mkdirSync(tempDir, { recursive: true });
    const res = dockerManager.generateComposeYaml(tempDir, ['postgres', 'redis'], {
      postgresPort: 5432,
      postgresUser: 'admin',
      postgresPassword: 'secretpassword',
      postgresDb: 'test_db',
      redisPort: 6379
    });

    expect(res.success).toBe(true);
    expect(fs.existsSync(res.filePath)).toBe(true);
    expect(res.servicesCount).toBe(2);

    const content = fs.readFileSync(res.filePath, 'utf-8');
    expect(content).toContain('postgres:16-alpine');
    expect(content).toContain('redis:7-alpine');
    expect(content).toContain('"5432:5432"');
    expect(content).toContain('"6379:6379"');
    expect(content).toContain('POSTGRES_USER: "admin"');
    expect(content).toContain('POSTGRES_PASSWORD: "secretpassword"');
    expect(content).toContain('postgres_data:');
    expect(content).toContain('redis_data:');
  });

  it('generateComposeYaml should generate Mailpit and RabbitMQ services without error', () => {
    fs.mkdirSync(tempDir, { recursive: true });
    const res = dockerManager.generateComposeYaml(tempDir, ['mailpit', 'rabbitmq'], {
      mailpitHttpPort: 8025,
      rabbitPort: 5672
    });

    expect(res.success).toBe(true);
    const content = fs.readFileSync(res.filePath, 'utf-8');
    expect(content).toContain('axllent/mailpit:latest');
    expect(content).toContain('rabbitmq:3-management-alpine');
  });

  it('getComposeStatus should safely return error when no compose file exists', async () => {
    fs.mkdirSync(tempDir, { recursive: true });
    const res = await dockerManager.getComposeStatus(tempDir);
    expect(res.success).toBe(false);
    expect(res.services).toEqual([]);
  });
});
