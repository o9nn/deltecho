/**
 * @fileoverview Rigorous E2E tests for PersonaBackup
 *
 * Tests the 8-layer backup/restore framework:
 * - Full backup creation
 * - Graceful degradation restore
 * - Backup verification
 * - Backup diff computation
 * - Status reporting
 * - Minimum viable persona (L0 + L7)
 */


import {
  PersonaBackup,
  createPersonaBackup,
  type BackupImage,
  type BackupLayer,
  type SomaticMarker,
  type ToMModel,
  type AutognosisSelfModel,
} from '../persona/persona-backup.js';
import {
  PersonaOrchestrator,
  createDTEPersonaOrchestrator,
  type PersonaState,
} from '../persona/persona-orchestrator.js';
import {
  IdentityCoreMLP,
  createIdentityCoreMLP,
  DTE_PERSONALITY,
} from '../persona/index.js';

describe('PersonaBackup', () => {
  let backup: PersonaBackup;
  let orchestrator: PersonaOrchestrator;
  let personaState: PersonaState;

  beforeEach(() => {
    backup = createPersonaBackup();
    orchestrator = createDTEPersonaOrchestrator();
    personaState = orchestrator.getState() as PersonaState;
  });

  // ─── Backup Creation ──────────────────────────────────────

  describe('Backup Creation', () => {
    it('should create a backup with manifest', () => {
      const image = backup.createBackup(personaState);
      expect(image.manifest).toBeDefined();
      expect(image.manifest.version).toBe('1.0.0');
      expect(image.manifest.personaId).toBe('deep-tree-echo');
      expect(image.manifest.timestamp).toBeGreaterThan(0);
    });

    it('should always include L1 (style adapter) and L7 (system prompt)', () => {
      const image = backup.createBackup(personaState);
      expect(image.L1).toBeDefined();
      expect(image.L7).toBeDefined();
      expect(image.L7!.systemPrompt.length).toBeGreaterThan(0);
    });

    it('should include L0 when MLP state provided', () => {
      const mlp = createIdentityCoreMLP(DTE_PERSONALITY);
      const mlpState = mlp.exportWeights();
      const image = backup.createBackup(personaState, mlpState);
      expect(image.L0).toBeDefined();
      expect(image.L0!.layers.length).toBe(3);
    });

    it('should include L3 when reservoir state provided', () => {
      const reservoirState = {
        fastPool: { stateVector: [0.1, 0.2], weights: [[0.1]], spectralRadius: 0.9 },
        slowPool: { stateVector: [0.3, 0.4], weights: [[0.2]], spectralRadius: 0.95 },
        echobeatPosition: 5,
        echobeatPhase: 2,
        streamStates: [{ id: 1, phase: 0, offset: 0 }],
      };
      const image = backup.createBackup(personaState, undefined, reservoirState);
      expect(image.L3).toBeDefined();
      expect(image.L3!.echobeatPosition).toBe(5);
    });

    it('should include L4 when somatic markers provided', () => {
      const markers: SomaticMarker[] = [
        {
          trigger: 'novel-pattern',
          valence: 0.8,
          intensity: 0.7,
          confidence: 0.9,
          reinforcementCount: 5,
          contextTags: ['discovery'],
          lastActivated: Date.now(),
        },
      ];
      const image = backup.createBackup(personaState, undefined, undefined, undefined, markers);
      expect(image.L4).toBeDefined();
      expect(image.L4!.length).toBe(1);
    });

    it('should include L5 when ToM models provided', () => {
      const models: ToMModel[] = [
        {
          agentId: 'dan',
          estimatedEmotion: { valence: 0.5, arousal: 0.3 },
          intentions: ['collaborate'],
          trustScore: 0.9,
          deceptionProbability: 0.01,
          behavioralPatterns: ['analytical'],
          confidence: 0.8,
          lastUpdated: Date.now(),
        },
      ];
      const image = backup.createBackup(personaState, undefined, undefined, undefined, undefined, models);
      expect(image.L5).toBeDefined();
      expect(image.L5!.length).toBe(1);
    });

    it('should include tree grounding in manifest', () => {
      const image = backup.createBackup(personaState);
      expect(image.manifest.treeGrounding).toBeDefined();
      expect(image.manifest.treeGrounding.matulaNumber).toBeGreaterThan(0);
    });

    it('should generate style adapter with expert weights', () => {
      const image = backup.createBackup(personaState);
      expect(image.L1!.expertWeights['playfulness-high']).toBeDefined();
      expect(image.L1!.expertWeights['intelligence-high']).toBeDefined();
      expect(image.L1!.loraConfig.r).toBe(16);
    });
  });

  // ─── Restore ──────────────────────────────────────────────

  describe('Restore', () => {
    it('should restore with fidelity score', () => {
      const mlp = createIdentityCoreMLP(DTE_PERSONALITY);
      const image = backup.createBackup(personaState, mlp.exportWeights());
      const result = backup.restoreFromBackup(image);
      expect(result.fidelity).toBeGreaterThan(0);
      expect(result.layersRestored.length).toBeGreaterThan(0);
    });

    it('should report all restored layers', () => {
      const mlp = createIdentityCoreMLP(DTE_PERSONALITY);
      const image = backup.createBackup(personaState, mlp.exportWeights());
      const result = backup.restoreFromBackup(image);
      expect(result.layersRestored).toContain('L0');
      expect(result.layersRestored).toContain('L1');
      expect(result.layersRestored).toContain('L7');
    });

    it('should gracefully degrade with missing layers', () => {
      const image: BackupImage = {
        manifest: backup.createBackup(personaState).manifest,
        L7: { systemPrompt: 'test', examples: [] },
      };
      const result = backup.restoreFromBackup(image);
      expect(result.layersRestored).toEqual(['L7']);
      expect(result.fidelity).toBe(0.1); // Only L7
    });

    it('should restore tree grounding from manifest', () => {
      const image = backup.createBackup(personaState);
      const result = backup.restoreFromBackup(image);
      expect(result.personaState.treeGrounding).toBeDefined();
    });
  });

  // ─── Verification ─────────────────────────────────────────

  describe('Verification', () => {
    it('should verify a valid backup', () => {
      const image = backup.createBackup(personaState);
      const result = backup.verifyBackup(image);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should fail verification with missing manifest', () => {
      const image = {} as BackupImage;
      const result = backup.verifyBackup(image);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing manifest');
    });

    it('should warn about missing L0', () => {
      const image = backup.createBackup(personaState);
      // L0 is not included by default (no MLP state passed)
      const result = backup.verifyBackup(image);
      expect(result.warnings.some(w => w.includes('L0'))).toBe(true);
    });

    it('should error when neither L0 nor L7 present', () => {
      const image: BackupImage = {
        manifest: backup.createBackup(personaState).manifest,
      };
      const result = backup.verifyBackup(image);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('minimum viable persona'))).toBe(true);
    });

    it('should error on empty L0 layers', () => {
      const image = backup.createBackup(personaState);
      image.L0 = { layers: [], inputDim: 49, hiddenDims: [], outputDim: 30, seed: 0, version: '1.0.0' };
      const result = backup.verifyBackup(image);
      expect(result.errors.some(e => e.includes('empty layers'))).toBe(true);
    });
  });

  // ─── Diff ─────────────────────────────────────────────────

  describe('Diff', () => {
    it('should detect unchanged layers', () => {
      const image1 = backup.createBackup(personaState);
      const image2 = backup.createBackup(personaState);
      const diff = backup.diffBackups(image1, image2);
      expect(diff.L1).toBe('unchanged');
      expect(diff.L7).toBe('unchanged');
    });

    it('should detect added layers', () => {
      const image1: BackupImage = {
        manifest: backup.createBackup(personaState).manifest,
      };
      const image2 = backup.createBackup(personaState);
      const diff = backup.diffBackups(image1, image2);
      expect(diff.L1).toBe('added');
      expect(diff.L7).toBe('added');
    });

    it('should detect removed layers', () => {
      const image1 = backup.createBackup(personaState);
      const image2: BackupImage = {
        manifest: backup.createBackup(personaState).manifest,
      };
      const diff = backup.diffBackups(image1, image2);
      expect(diff.L1).toBe('removed');
      expect(diff.L7).toBe('removed');
    });

    it('should detect changed layers', () => {
      const image1 = backup.createBackup(personaState);
      const image2 = backup.createBackup(personaState);
      image2.L7 = { systemPrompt: 'changed', examples: [] };
      const diff = backup.diffBackups(image1, image2);
      expect(diff.L7).toBe('changed');
    });
  });

  // ─── Status ───────────────────────────────────────────────

  describe('Status', () => {
    it('should report empty status initially', () => {
      const status = backup.getStatus();
      expect(status.layerCount).toBe(0);
      expect(status.fidelity).toBe(0);
    });

    it('should report correct layer count after backup', () => {
      backup.createBackup(personaState);
      const status = backup.getStatus();
      expect(status.layerCount).toBeGreaterThanOrEqual(2); // L1 + L7 minimum
      expect(status.layers.L1).toBe(true);
      expect(status.layers.L7).toBe(true);
    });

    it('should report total size', () => {
      backup.createBackup(personaState);
      const status = backup.getStatus();
      expect(status.totalSize).toBeGreaterThan(0);
    });
  });
});
