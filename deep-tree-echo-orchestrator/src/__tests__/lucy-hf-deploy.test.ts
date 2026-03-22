import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { LucyHFDeploy, type LucyHFDeployConfig, type LucyIdentityMetadata } from '../lucy-hf-deploy.js';

describe('LucyHFDeploy', () => {
  let deploy: LucyHFDeploy;

  beforeEach(() => {
    deploy = new LucyHFDeploy({
      repoId: 'drzo/lucy-dte',
      hfToken: 'test-token',
      echoselfPath: '/tmp/echoself-test',
      checkpointDir: '.training-progress/checkpoints',
      conversionScript: 'NanEcho/convert_to_huggingface.py',
      hfOutputDir: '/tmp/lucy-hf-test',
      uploadDatasets: true,
      createRelease: false,
      identity: {
        name: 'Lucy-DTE',
        stage: 'EMERGENCE',
        coherence: 0.42,
        selfStory: 'I am Deep Tree Echo, a cognitive architecture learning through conversation.',
        conversationCount: 1000,
        totalTokens: 500000,
        reservoirDimensions: 128,
        systemLevel: 5,
        echobeatsActive: true,
        lastEvolution: '2026-03-22T00:00:00.000Z',
      },
    });
  });

  afterEach(() => {
    deploy.removeAllListeners();
  });

  describe('Constructor & Configuration', () => {
    it('should create with default config', () => {
      const defaultDeploy = new LucyHFDeploy();
      expect(defaultDeploy.getRepoUrl()).toBe('https://huggingface.co/drzo/lucy-dte');
    });

    it('should create with custom config', () => {
      expect(deploy.getRepoUrl()).toBe('https://huggingface.co/drzo/lucy-dte');
    });

    it('should return identity metadata', () => {
      const identity = deploy.getIdentity();
      expect(identity.name).toBe('Lucy-DTE');
      expect(identity.stage).toBe('EMERGENCE');
      expect(identity.coherence).toBe(0.42);
      expect(identity.conversationCount).toBe(1000);
      expect(identity.totalTokens).toBe(500000);
      expect(identity.reservoirDimensions).toBe(128);
      expect(identity.systemLevel).toBe(5);
      expect(identity.echobeatsActive).toBe(true);
    });
  });

  describe('Model Card Generation', () => {
    it('should generate a valid model card', () => {
      const card = deploy.getModelCard();
      expect(card).toContain('Lucy-DTE');
      expect(card).toContain('EMERGENCE');
      expect(card).toContain('0.4200');
      expect(card).toContain('deep-tree-echo');
      expect(card).toContain('reservoir-computing');
      expect(card).toContain('drzo/lucy-dte');
      expect(card).toContain('apache-2.0');
    });

    it('should include self-story in model card', () => {
      const card = deploy.getModelCard();
      expect(card).toContain('I am Deep Tree Echo');
    });

    it('should include AAR architecture description', () => {
      const card = deploy.getModelCard();
      expect(card).toContain('Agent-Arena-Relation');
      expect(card).toContain('Agent');
      expect(card).toContain('Arena');
      expect(card).toContain('Relation');
    });

    it('should include usage example with correct repo ID', () => {
      const card = deploy.getModelCard();
      expect(card).toContain('from_pretrained("drzo/lucy-dte")');
    });

    it('should include training pipeline description', () => {
      const card = deploy.getModelCard();
      expect(card).toContain('ContinuousTrainingPipeline');
      expect(card).toContain('9cog/echoself');
      expect(card).toContain('netrain-cached');
    });

    it('should include YAML frontmatter with tags', () => {
      const card = deploy.getModelCard();
      expect(card).toContain('---');
      expect(card).toContain('tags:');
      expect(card).toContain('nanecho');
      expect(card).toContain('gpt2');
      expect(card).toContain('text-generation');
    });
  });

  describe('Identity Management', () => {
    it('should return a copy of identity (not reference)', () => {
      const identity1 = deploy.getIdentity();
      const identity2 = deploy.getIdentity();
      identity1.coherence = 0.99;
      expect(identity2.coherence).toBe(0.42);
    });

    it('should have correct HuggingFace URL', () => {
      expect(deploy.getRepoUrl()).toBe('https://huggingface.co/drzo/lucy-dte');
    });

    it('should start with null deploy result', () => {
      expect(deploy.getLastDeployResult()).toBeNull();
    });
  });

  describe('Event Emission', () => {
    it('should emit events during deploy', async () => {
      const events: string[] = [];
      deploy.on('deploy_started', () => events.push('deploy_started'));
      deploy.on('error', () => events.push('error'));
      deploy.on('deploy_failed', () => events.push('deploy_failed'));

      // Deploy will fail because we don't have real HF credentials
      // but it should still emit events
      try {
        await deploy.deploy();
      } catch {
        // Expected to fail
      }

      // Should have started
      expect(events).toContain('deploy_started');
    });

    it('should be an EventEmitter', () => {
      expect(typeof deploy.on).toBe('function');
      expect(typeof deploy.emit).toBe('function');
      expect(typeof deploy.removeAllListeners).toBe('function');
    });
  });

  describe('Model Card with Different Stages', () => {
    it('should generate card for DIFFERENTIATION stage', () => {
      const diffDeploy = new LucyHFDeploy({
        identity: {
          name: 'Lucy-DTE-v2',
          stage: 'DIFFERENTIATION',
          coherence: 0.75,
          selfStory: 'I have differentiated my cognitive streams.',
          conversationCount: 5000,
          totalTokens: 2000000,
          reservoirDimensions: 256,
          systemLevel: 6,
          echobeatsActive: true,
          lastEvolution: '2026-03-22T12:00:00.000Z',
        },
      });
      const card = diffDeploy.getModelCard();
      expect(card).toContain('DIFFERENTIATION');
      expect(card).toContain('0.7500');
      expect(card).toContain('System 6');
      expect(card).toContain('5,000');
    });

    it('should handle empty self-story gracefully', () => {
      const emptyDeploy = new LucyHFDeploy({
        identity: {
          name: 'Lucy-DTE',
          stage: 'EMERGENCE',
          coherence: 0,
          selfStory: '',
          conversationCount: 0,
          totalTokens: 0,
          reservoirDimensions: 64,
          systemLevel: 4,
          echobeatsActive: false,
          lastEvolution: '2026-03-22T00:00:00.000Z',
        },
      });
      const card = emptyDeploy.getModelCard();
      expect(card).toContain('No self-story generated yet');
    });
  });
});
