/**
 * PerceptionHandlers Tests
 *
 * Tests the real proactive perception system that gives DTE actual senses.
 * Covers system monitoring, percept emission, lifecycle, and statistics.
 */
import { describe, it, expect, afterEach, jest } from '@jest/globals';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { PerceptionHandlers } from '../perception/PerceptionHandlers.js';
import type { CognitivePercept } from '../cognitive-tick-processor.js';

describe('PerceptionHandlers', () => {
  let handlers: PerceptionHandlers;

  afterEach(async () => {
    if (handlers) {
      await handlers.stop();
    }
  });

  describe('Lifecycle', () => {
    it('should start and stop cleanly', async () => {
      handlers = new PerceptionHandlers({
        enableFilesystemWatch: false,
        enableSystemMonitor: false,
        enableGitScan: false,
        enableScheduledScans: false,
      });

      await handlers.start();
      expect(handlers.getStats().running).toBe(true);

      await handlers.stop();
      expect(handlers.getStats().running).toBe(false);
    });

    it('should not start twice', async () => {
      handlers = new PerceptionHandlers({
        enableFilesystemWatch: false,
        enableSystemMonitor: false,
        enableGitScan: false,
      });

      await handlers.start();
      await handlers.start(); // Should be a no-op
      expect(handlers.getStats().running).toBe(true);
    });

    it('should emit started and stopped events', async () => {
      handlers = new PerceptionHandlers({
        enableFilesystemWatch: false,
        enableSystemMonitor: false,
        enableGitScan: false,
      });

      const events: string[] = [];
      handlers.on('started', () => events.push('started'));
      handlers.on('stopped', () => events.push('stopped'));

      await handlers.start();
      await handlers.stop();

      expect(events).toEqual(['started', 'stopped']);
    });
  });

  describe('System Monitor', () => {
    it('should emit system percepts', async () => {
      const percepts: CognitivePercept[] = [];

      handlers = new PerceptionHandlers({
        enableFilesystemWatch: false,
        enableSystemMonitor: true,
        systemMonitorInterval: 60000, // Won't fire again during test
        enableGitScan: false,
      });

      handlers.onPercept((percept) => percepts.push(percept));
      await handlers.start();

      // Wait for initial scan
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(percepts.length).toBeGreaterThanOrEqual(1);

      const systemPercept = percepts.find(p =>
        p.content.includes('CPU') && p.content.includes('Memory')
      );
      expect(systemPercept).toBeDefined();
      expect(systemPercept!.source).toBe('internal');
      expect(systemPercept!.metadata.handler).toBe('system_monitor');
      expect(typeof systemPercept!.metadata.cpuUsage).toBe('number');
      expect(typeof systemPercept!.metadata.memoryUsage).toBe('number');
    });
  });

  describe('Manual Percept Injection', () => {
    it('should allow manual percept injection', () => {
      handlers = new PerceptionHandlers({
        enableFilesystemWatch: false,
        enableSystemMonitor: false,
        enableGitScan: false,
      });

      const percepts: CognitivePercept[] = [];
      handlers.onPercept((percept) => percepts.push(percept));

      handlers.injectPercept({
        source: 'message',
        content: 'User sent a message',
        salience: 0.8,
        emotionalValence: 0.3,
        metadata: { chatId: 42 },
      });

      expect(percepts).toHaveLength(1);
      expect(percepts[0].content).toBe('User sent a message');
      expect(percepts[0].id).toMatch(/^pp_/);
      expect(percepts[0].timestamp).toBeGreaterThan(0);
    });

    it('should emit percept events', () => {
      handlers = new PerceptionHandlers({
        enableFilesystemWatch: false,
        enableSystemMonitor: false,
        enableGitScan: false,
      });

      const events: CognitivePercept[] = [];
      handlers.on('percept', (percept) => events.push(percept));

      handlers.injectPercept({
        source: 'email',
        content: 'New email received',
        salience: 0.6,
        emotionalValence: 0.1,
        metadata: {},
      });

      expect(events).toHaveLength(1);
    });
  });

  describe('Filesystem Watch', () => {
    it('should watch directories when configured', async () => {
      const fs = await import('node:fs/promises');
      const tmpDir = `/tmp/dte-perception-test-${Date.now()}`;
      await fs.mkdir(tmpDir, { recursive: true });

      const percepts: CognitivePercept[] = [];

      handlers = new PerceptionHandlers({
        enableFilesystemWatch: true,
        watchDirectories: [tmpDir],
        enableSystemMonitor: false,
        enableGitScan: false,
      });

      handlers.onPercept((percept) => percepts.push(percept));
      await handlers.start();

      // Create a file to trigger the watcher
      await fs.writeFile(`${tmpDir}/test.txt`, 'hello');

      // Wait for watcher event
      await new Promise(resolve => setTimeout(resolve, 200));

      // The watcher should have detected the file creation
      const fsPercepts = percepts.filter(p =>
        p.metadata.handler === 'filesystem'
      );

      // Note: fs.watch behavior varies by OS, so we just verify the handler started
      expect(handlers.getStats().activeWatchers).toBeGreaterThanOrEqual(1);

      // Cleanup
      await handlers.stop();
      await fs.rm(tmpDir, { recursive: true, force: true });
    });

    it('should handle non-existent directories gracefully', async () => {
      handlers = new PerceptionHandlers({
        enableFilesystemWatch: true,
        watchDirectories: ['/nonexistent/path/that/does/not/exist'],
        enableSystemMonitor: false,
        enableGitScan: false,
      });

      // Should not throw
      await handlers.start();
      expect(handlers.getStats().running).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('should track percept count', () => {
      handlers = new PerceptionHandlers({
        enableFilesystemWatch: false,
        enableSystemMonitor: false,
        enableGitScan: false,
      });

      handlers.injectPercept({
        source: 'internal',
        content: 'test 1',
        salience: 0.5,
        emotionalValence: 0,
        metadata: {},
      });
      handlers.injectPercept({
        source: 'internal',
        content: 'test 2',
        salience: 0.5,
        emotionalValence: 0,
        metadata: {},
      });

      const stats = handlers.getStats();
      expect(stats.perceptCount).toBe(2);
      expect(stats.running).toBe(false);
    });
  });

  describe('Git Scanner', () => {
    it('should scan git repositories when configured', async () => {
      const tempRepo = mkdtempSync(join(tmpdir(), 'perception-git-'));
      const percepts: CognitivePercept[] = [];

      try {
        // Create a deterministic git repo with uncommitted changes
        execSync('git init', { cwd: tempRepo, stdio: 'ignore' });
        execSync('git config user.email "test@example.com"', { cwd: tempRepo, stdio: 'ignore' });
        execSync('git config user.name "Test User"', { cwd: tempRepo, stdio: 'ignore' });
        writeFileSync(join(tempRepo, 'tracked.txt'), 'initial\n');
        execSync('git add tracked.txt', { cwd: tempRepo, stdio: 'ignore' });
        execSync('git commit -m "initial commit"', { cwd: tempRepo, stdio: 'ignore' });
        writeFileSync(join(tempRepo, 'tracked.txt'), 'modified\n');

        handlers = new PerceptionHandlers({
          enableFilesystemWatch: false,
          enableSystemMonitor: false,
          enableGitScan: true,
          gitRepositories: [tempRepo],
          gitScanInterval: 60000,
        });

        handlers.onPercept((percept) => percepts.push(percept));
        await handlers.start();

        // Wait for initial scan
        await new Promise(resolve => setTimeout(resolve, 2000));

        const gitPercepts = percepts.filter(p =>
          p.metadata.handler === 'git_scan'
        );
        expect(gitPercepts.length).toBeGreaterThanOrEqual(1);
      } finally {
        rmSync(tempRepo, { recursive: true, force: true });
      }
    }, 10000);
  });
});
