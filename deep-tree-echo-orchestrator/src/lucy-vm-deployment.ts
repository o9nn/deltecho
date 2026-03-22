/**
 * @fileoverview LucyVMDeployment — Manages the lifecycle of a local llama.cpp
 * inference server for the Lucy GGUF model.
 *
 * This module handles:
 *   1. Model discovery and download from HuggingFace Hub
 *   2. llama.cpp server process management (start/stop/restart)
 *   3. Health monitoring with automatic restart on failure
 *   4. Connection to LucyInferenceDriver once server is ready
 *   5. Graceful shutdown with process cleanup
 *
 * Three-Layer Hosting Pattern:
 *   Layer 3: API LLMs (Cloud) — enhancement, not required
 *   Layer 2: Lucy GGUF (VM)   — persistent voice, llama.cpp, HuggingFace ← THIS
 *   Layer 1: Identity State (Git) — <2MB JSON+binary, survives anything
 *
 * The deployment module is the bridge between Layer 1 (identity) and Layer 2
 * (inference), ensuring Lucy is always available for the CoreSelfEngine.
 */
import { EventEmitter } from 'events';
import { spawn, type ChildProcess } from 'child_process';
import { existsSync, mkdirSync, createWriteStream, statSync } from 'fs';
import { join, basename } from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { getLogger } from 'deep-tree-echo-core';

const log = getLogger('deep-tree-echo-orchestrator/LucyVMDeployment');

// ─── Types ─────────────────────────────────────────────────────────────

export interface LucyVMConfig {
  /** Directory to store GGUF model files */
  modelDir: string;
  /** HuggingFace model repository (e.g., 'drzo/lucy-dte') */
  hfRepo: string;
  /** GGUF filename within the repo */
  ggufFilename: string;
  /** Path to llama-server binary (or 'llama-server' if on PATH) */
  llamaServerBin: string;
  /** Host to bind the server to */
  host: string;
  /** Port for the llama.cpp HTTP server */
  port: number;
  /** Number of GPU layers to offload (-1 = all) */
  nGpuLayers: number;
  /** Context length */
  contextLength: number;
  /** Number of parallel slots */
  nParallel: number;
  /** Health check interval in ms */
  healthCheckIntervalMs: number;
  /** Max consecutive health check failures before restart */
  maxHealthFailures: number;
  /** Startup timeout in ms */
  startupTimeoutMs: number;
  /** Additional llama-server arguments */
  extraArgs: string[];
}

export interface DeploymentStatus {
  state: 'stopped' | 'downloading' | 'starting' | 'running' | 'unhealthy' | 'restarting' | 'error';
  modelPath: string | null;
  modelSizeBytes: number;
  serverPid: number | null;
  serverUrl: string;
  uptime: number;
  restartCount: number;
  lastHealthCheck: number;
  consecutiveFailures: number;
  error: string | null;
}

export type DeploymentEvent =
  | 'download_start'
  | 'download_progress'
  | 'download_complete'
  | 'server_starting'
  | 'server_ready'
  | 'server_unhealthy'
  | 'server_restarting'
  | 'server_stopped'
  | 'server_error'
  | 'server_output';

// ─── Default Configuration ─────────────────────────────────────────────

const DEFAULT_CONFIG: LucyVMConfig = {
  modelDir: join(process.env.HOME ?? '/home/ubuntu', '.dte', 'models'),
  hfRepo: 'drzo/lucy-dte',
  ggufFilename: 'lucy-128k-q4_k_m.gguf',
  llamaServerBin: 'llama-server',
  host: '127.0.0.1',
  port: 8080,
  nGpuLayers: -1,
  contextLength: 131072,
  nParallel: 1,
  healthCheckIntervalMs: 15000,
  maxHealthFailures: 3,
  startupTimeoutMs: 120000,
  extraArgs: [],
};

// ─── Lucy VM Deployment ────────────────────────────────────────────────

export class LucyVMDeployment extends EventEmitter {
  private config: LucyVMConfig;
  private serverProcess: ChildProcess | null = null;
  private healthTimer: ReturnType<typeof setInterval> | null = null;
  private startedAt: number = 0;
  private restartCount: number = 0;
  private consecutiveFailures: number = 0;
  private currentState: DeploymentStatus['state'] = 'stopped';
  private lastError: string | null = null;

  constructor(config: Partial<LucyVMConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ─── Public API ──────────────────────────────────────────────────

  /**
   * Deploy Lucy: download model if needed, start server, wait for ready.
   * Returns the base URL for the LucyInferenceDriver.
   */
  async deploy(): Promise<string> {
    try {
      // Step 1: Ensure model is available
      const modelPath = await this.ensureModel();

      // Step 2: Start llama-server
      await this.startServer(modelPath);

      // Step 3: Wait for server to be ready
      await this.waitForReady();

      // Step 4: Start health monitoring
      this.startHealthMonitor();

      const url = this.getServerUrl();
      log.info(`Lucy VM deployed successfully at ${url}`);
      return url;
    } catch (err) {
      this.currentState = 'error';
      this.lastError = err instanceof Error ? err.message : String(err);
      this.emit('server_error', { error: this.lastError });
      throw err;
    }
  }

  /**
   * Gracefully stop the Lucy VM.
   */
  async shutdown(): Promise<void> {
    log.info('Shutting down Lucy VM...');

    // Stop health monitoring
    if (this.healthTimer) {
      clearInterval(this.healthTimer);
      this.healthTimer = null;
    }

    // Kill server process
    if (this.serverProcess) {
      await this.killServer();
    }

    this.currentState = 'stopped';
    this.emit('server_stopped');
    log.info('Lucy VM shutdown complete');
  }

  /**
   * Get the HTTP base URL for the inference server.
   */
  getServerUrl(): string {
    return `http://${this.config.host}:${this.config.port}`;
  }

  /**
   * Get comprehensive deployment status.
   */
  getStatus(): DeploymentStatus {
    const modelPath = this.getModelPath();
    let modelSizeBytes = 0;
    try {
      if (existsSync(modelPath)) {
        modelSizeBytes = statSync(modelPath).size;
      }
    } catch { /* ignore */ }

    return {
      state: this.currentState,
      modelPath: existsSync(modelPath) ? modelPath : null,
      modelSizeBytes,
      serverPid: this.serverProcess?.pid ?? null,
      serverUrl: this.getServerUrl(),
      uptime: this.startedAt > 0 ? Date.now() - this.startedAt : 0,
      restartCount: this.restartCount,
      lastHealthCheck: Date.now(),
      consecutiveFailures: this.consecutiveFailures,
      error: this.lastError,
    };
  }

  /**
   * Check if the server is currently running and healthy.
   */
  isRunning(): boolean {
    return this.currentState === 'running';
  }

  // ─── Model Management ────────────────────────────────────────────

  private getModelPath(): string {
    return join(this.config.modelDir, this.config.ggufFilename);
  }

  /**
   * Ensure the GGUF model file exists locally.
   * Downloads from HuggingFace Hub if not present.
   */
  async ensureModel(): Promise<string> {
    const modelPath = this.getModelPath();

    if (existsSync(modelPath)) {
      const size = statSync(modelPath).size;
      log.info(`Model found: ${modelPath} (${(size / 1024 / 1024).toFixed(1)} MB)`);
      return modelPath;
    }

    // Create model directory
    mkdirSync(this.config.modelDir, { recursive: true });

    // Download from HuggingFace
    this.currentState = 'downloading';
    this.emit('download_start', {
      repo: this.config.hfRepo,
      filename: this.config.ggufFilename,
    });

    log.info(`Downloading model from ${this.config.hfRepo}/${this.config.ggufFilename}...`);

    const url = `https://huggingface.co/${this.config.hfRepo}/resolve/main/${this.config.ggufFilename}`;

    try {
      const response = await fetch(url, { redirect: 'follow' });
      if (!response.ok || !response.body) {
        throw new Error(`Download failed: HTTP ${response.status}`);
      }

      const totalSize = parseInt(response.headers.get('content-length') ?? '0', 10);
      let downloadedSize = 0;

      const fileStream = createWriteStream(modelPath);
      const nodeReadable = Readable.fromWeb(response.body as any);

      // Track progress
      nodeReadable.on('data', (chunk: Buffer) => {
        downloadedSize += chunk.length;
        if (totalSize > 0) {
          const progress = (downloadedSize / totalSize) * 100;
          this.emit('download_progress', {
            downloaded: downloadedSize,
            total: totalSize,
            percent: progress,
          });
          if (Math.floor(progress) % 10 === 0) {
            log.info(`Download progress: ${progress.toFixed(1)}%`);
          }
        }
      });

      await pipeline(nodeReadable, fileStream);

      this.emit('download_complete', { path: modelPath, size: downloadedSize });
      log.info(`Model downloaded: ${modelPath} (${(downloadedSize / 1024 / 1024).toFixed(1)} MB)`);

      return modelPath;
    } catch (err) {
      // Clean up partial download
      try {
        const { unlinkSync } = await import('fs');
        if (existsSync(modelPath)) unlinkSync(modelPath);
      } catch { /* ignore */ }
      throw new Error(`Model download failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ─── Server Process Management ───────────────────────────────────

  /**
   * Start the llama-server process with the given model.
   */
  private async startServer(modelPath: string): Promise<void> {
    this.currentState = 'starting';
    this.emit('server_starting', { modelPath });

    const args = [
      '--model', modelPath,
      '--host', this.config.host,
      '--port', String(this.config.port),
      '--ctx-size', String(this.config.contextLength),
      '--n-gpu-layers', String(this.config.nGpuLayers),
      '--parallel', String(this.config.nParallel),
      '--log-disable',
      ...this.config.extraArgs,
    ];

    log.info(`Starting llama-server: ${this.config.llamaServerBin} ${args.join(' ')}`);

    this.serverProcess = spawn(this.config.llamaServerBin, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    });

    // Capture stdout/stderr
    this.serverProcess.stdout?.on('data', (data: Buffer) => {
      const line = data.toString().trim();
      if (line) {
        this.emit('server_output', { stream: 'stdout', line });
      }
    });

    this.serverProcess.stderr?.on('data', (data: Buffer) => {
      const line = data.toString().trim();
      if (line) {
        this.emit('server_output', { stream: 'stderr', line });
      }
    });

    // Handle process exit
    this.serverProcess.on('exit', (code, signal) => {
      log.warn(`llama-server exited: code=${code}, signal=${signal}`);
      this.serverProcess = null;
      if (this.currentState === 'running') {
        this.currentState = 'unhealthy';
        this.emit('server_unhealthy', { code, signal });
      }
    });

    this.serverProcess.on('error', (err) => {
      log.error(`llama-server process error: ${err.message}`);
      this.lastError = err.message;
      this.currentState = 'error';
      this.emit('server_error', { error: err.message });
    });
  }

  /**
   * Wait for the server to respond to health checks.
   */
  private async waitForReady(): Promise<void> {
    const startTime = Date.now();
    const pollInterval = 1000;

    while (Date.now() - startTime < this.config.startupTimeoutMs) {
      if (!this.serverProcess) {
        throw new Error('Server process exited before becoming ready');
      }

      const healthy = await this.checkServerHealth();
      if (healthy) {
        this.currentState = 'running';
        this.startedAt = Date.now();
        this.consecutiveFailures = 0;
        this.emit('server_ready', { url: this.getServerUrl() });
        return;
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    // Timeout — kill the process
    await this.killServer();
    throw new Error(`Server failed to become ready within ${this.config.startupTimeoutMs}ms`);
  }

  /**
   * Kill the server process gracefully, then forcefully if needed.
   */
  private async killServer(): Promise<void> {
    if (!this.serverProcess) return;

    const proc = this.serverProcess;
    this.serverProcess = null;

    // Try SIGTERM first
    proc.kill('SIGTERM');

    // Wait up to 5 seconds for graceful exit
    const exited = await new Promise<boolean>(resolve => {
      const timer = setTimeout(() => resolve(false), 5000);
      proc.on('exit', () => {
        clearTimeout(timer);
        resolve(true);
      });
    });

    // Force kill if needed
    if (!exited) {
      try {
        proc.kill('SIGKILL');
      } catch { /* process may already be dead */ }
    }
  }

  // ─── Health Monitoring ───────────────────────────────────────────

  /**
   * Check if the server responds to health endpoint.
   */
  private async checkServerHealth(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.getServerUrl()}/health`, {
        signal: controller.signal,
      }).catch(() =>
        fetch(`${this.getServerUrl()}/v1/models`, {
          signal: controller.signal,
        }),
      );

      clearTimeout(timeout);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Start periodic health monitoring with automatic restart.
   */
  private startHealthMonitor(): void {
    if (this.config.healthCheckIntervalMs <= 0) return;

    this.healthTimer = setInterval(async () => {
      const healthy = await this.checkServerHealth();

      if (healthy) {
        this.consecutiveFailures = 0;
        return;
      }

      this.consecutiveFailures++;
      log.warn(`Health check failed (${this.consecutiveFailures}/${this.config.maxHealthFailures})`);

      if (this.consecutiveFailures >= this.config.maxHealthFailures) {
        log.error('Max health failures reached — restarting server...');
        this.currentState = 'restarting';
        this.emit('server_restarting', { restartCount: this.restartCount + 1 });

        try {
          await this.killServer();
          this.restartCount++;

          const modelPath = this.getModelPath();
          if (existsSync(modelPath)) {
            await this.startServer(modelPath);
            await this.waitForReady();
            log.info('Server restarted successfully');
          } else {
            throw new Error('Model file missing — cannot restart');
          }
        } catch (err) {
          this.currentState = 'error';
          this.lastError = err instanceof Error ? err.message : String(err);
          this.emit('server_error', { error: this.lastError });
        }
      }
    }, this.config.healthCheckIntervalMs);
  }
}
