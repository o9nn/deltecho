import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { LucyVMDeployment, type LucyVMConfig } from '../lucy-vm-deployment.js';

describe('LucyVMDeployment', () => {
  let deployment: LucyVMDeployment;

  beforeEach(() => {
    deployment = new LucyVMDeployment({
      modelDir: '/tmp/test-dte-models',
      port: 18080,
      healthCheckIntervalMs: 0, // Disable for tests
      startupTimeoutMs: 5000,
    });
  });

  afterEach(async () => {
    await deployment.shutdown();
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      const d = new LucyVMDeployment();
      const status = d.getStatus();
      expect(status.state).toBe('stopped');
      expect(status.serverPid).toBeNull();
      expect(status.restartCount).toBe(0);
      expect(status.consecutiveFailures).toBe(0);
      expect(status.error).toBeNull();
    });

    it('should accept custom configuration', () => {
      const custom = new LucyVMDeployment({
        port: 9999,
        host: '0.0.0.0',
        contextLength: 8192,
        nGpuLayers: 0,
        nParallel: 4,
      });
      expect(custom.getServerUrl()).toBe('http://0.0.0.0:9999');
    });

    it('should report not running initially', () => {
      expect(deployment.isRunning()).toBe(false);
    });
  });

  describe('getServerUrl', () => {
    it('should return correct URL from config', () => {
      expect(deployment.getServerUrl()).toBe('http://127.0.0.1:18080');
    });

    it('should reflect custom host and port', () => {
      const d = new LucyVMDeployment({ host: 'localhost', port: 3000 });
      expect(d.getServerUrl()).toBe('http://localhost:3000');
    });
  });

  describe('getStatus', () => {
    it('should return comprehensive status object', () => {
      const status = deployment.getStatus();
      expect(status).toHaveProperty('state');
      expect(status).toHaveProperty('modelPath');
      expect(status).toHaveProperty('modelSizeBytes');
      expect(status).toHaveProperty('serverPid');
      expect(status).toHaveProperty('serverUrl');
      expect(status).toHaveProperty('uptime');
      expect(status).toHaveProperty('restartCount');
      expect(status).toHaveProperty('lastHealthCheck');
      expect(status).toHaveProperty('consecutiveFailures');
      expect(status).toHaveProperty('error');
    });

    it('should report stopped state initially', () => {
      const status = deployment.getStatus();
      expect(status.state).toBe('stopped');
      expect(status.uptime).toBe(0);
    });

    it('should report null model path when model not downloaded', () => {
      const status = deployment.getStatus();
      expect(status.modelPath).toBeNull();
      expect(status.modelSizeBytes).toBe(0);
    });
  });

  describe('event emission', () => {
    it('should emit server_stopped on shutdown', async () => {
      const events: string[] = [];
      deployment.on('server_stopped', () => events.push('stopped'));
      await deployment.shutdown();
      expect(events).toContain('stopped');
    });

    it('should emit server_error when deploy fails without model', async () => {
      const errors: unknown[] = [];
      deployment.on('server_error', (e) => errors.push(e));

      // Deploy will fail because model doesn't exist and HF download will fail
      await expect(deployment.deploy()).rejects.toThrow();
      expect(errors.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('shutdown', () => {
    it('should be idempotent', async () => {
      await deployment.shutdown();
      await deployment.shutdown();
      expect(deployment.getStatus().state).toBe('stopped');
    });

    it('should handle shutdown when never started', async () => {
      await expect(deployment.shutdown()).resolves.not.toThrow();
    });
  });

  describe('deploy error handling', () => {
    it('should set error state when deploy fails', async () => {
      const d = new LucyVMDeployment({
        hfRepo: 'nonexistent/model',
        ggufFilename: 'nonexistent.gguf',
        modelDir: '/tmp/test-dte-nonexistent',
        startupTimeoutMs: 1000,
      });

      await expect(d.deploy()).rejects.toThrow();
      expect(d.getStatus().state).toBe('error');
      expect(d.getStatus().error).toBeTruthy();
    });
  });
});
