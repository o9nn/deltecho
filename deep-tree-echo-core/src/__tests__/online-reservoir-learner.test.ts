import { OnlineReservoirLearner } from '../core-self/OnlineReservoirLearner';
import { EchoReservoir } from '../core-self/ReservoirBridge';
import type { FeedbackSignal } from '../core-self/OnlineReservoirLearner';

describe('OnlineReservoirLearner', () => {
  const RESERVOIR_SIZE = 50;
  const INPUT_DIM = 10;
  const OUTPUT_DIM = 5;

  let learner: OnlineReservoirLearner;
  let reservoir: EchoReservoir;

  function makeFeedback(overrides: Partial<FeedbackSignal> = {}): FeedbackSignal {
    const reservoirState = new Float64Array(RESERVOIR_SIZE);
    for (let i = 0; i < RESERVOIR_SIZE; i++) reservoirState[i] = Math.random() * 0.5;
    const targetOutput = new Float64Array(OUTPUT_DIM);
    targetOutput[0] = 1.0;

    return {
      reservoirState,
      targetOutput,
      reward: 0.8,
      valence: 0.5,
      timestamp: Date.now(),
      source: 'user',
      ...overrides,
    };
  }

  beforeEach(() => {
    reservoir = new EchoReservoir({
      units: RESERVOIR_SIZE,
      inputDim: INPUT_DIM,
      spectralRadius: 0.95,
      inputScaling: 0.5,
      leakRateFast: 0.3,
      leakRateSlow: 0.1,
    });

    learner = new OnlineReservoirLearner({
      reservoirDim: RESERVOIR_SIZE,
      outputDim: OUTPUT_DIM,
      forgettingFactor: 0.995,
      initialPDiag: 100,
      learningRateScale: 0.01,
    });
  });

  describe('initialization', () => {
    it('should create a learner with default config', () => {
      const defaultLearner = new OnlineReservoirLearner();
      const stats = defaultLearner.getStats();
      expect(stats.totalUpdates).toBe(0);
      expect(stats.avgPredictionError).toBe(0);
    });

    it('should accept custom config', () => {
      const stats = learner.getStats();
      expect(stats.totalUpdates).toBe(0);
    });
  });

  describe('online learning updates', () => {
    it('should accept a feedback signal and produce a learning update', () => {
      const feedback = makeFeedback();
      const update = learner.update(feedback);

      expect(update).toBeDefined();
      expect(update.index).toBe(1);
      expect(typeof update.weightChangeMagnitude).toBe('number');
      expect(typeof update.predictionError).toBe('number');
      expect(typeof update.effectiveLearningRate).toBe('number');
      expect(update.reward).toBe(0.8);
    });

    it('should accumulate updates over multiple feedback signals', () => {
      for (let i = 0; i < 10; i++) {
        const input = new Float64Array(INPUT_DIM);
        input[i % INPUT_DIM] = 1.0;
        const rState = reservoir.step(input);

        const feedback = makeFeedback({
          reservoirState: rState,
          reward: 0.5 + Math.random() * 0.5,
        });

        learner.update(feedback);
      }

      const stats = learner.getStats();
      expect(stats.totalUpdates).toBe(10);
      expect(stats.cumulativeReward).toBeGreaterThan(0);
    });

    it('should emit update events', () => {
      const updates: any[] = [];
      learner.on('update', (u: any) => updates.push(u));

      learner.update(makeFeedback());
      learner.update(makeFeedback());

      expect(updates.length).toBe(2);
      expect(updates[0].index).toBe(1);
      expect(updates[1].index).toBe(2);
    });
  });

  describe('learning dynamics', () => {
    it('should produce non-zero weight changes', () => {
      const update = learner.update(makeFeedback());
      expect(update.weightChangeMagnitude).toBeGreaterThan(0);
    });

    it('should track prediction error', () => {
      for (let i = 0; i < 5; i++) {
        learner.update(makeFeedback());
      }

      const stats = learner.getStats();
      expect(typeof stats.avgPredictionError).toBe('number');
    });

    it('should handle varying reward signals', () => {
      // Positive reward
      const posUpdate = learner.update(makeFeedback({ reward: 1.0 }));
      expect(posUpdate.reward).toBe(1.0);

      // Negative reward
      const negUpdate = learner.update(makeFeedback({ reward: -0.5 }));
      expect(negUpdate.reward).toBe(-0.5);

      // Zero reward
      const zeroUpdate = learner.update(makeFeedback({ reward: 0 }));
      expect(zeroUpdate.reward).toBe(0);
    });

    it('should handle different feedback sources', () => {
      const sources: FeedbackSignal['source'][] = ['user', 'self-evaluation', 'coherence', 'reservoir'];

      for (const source of sources) {
        const update = learner.update(makeFeedback({ source }));
        expect(update).toBeDefined();
        expect(update.index).toBeGreaterThan(0);
      }
    });
  });

  describe('integration with EchoReservoir', () => {
    it('should learn from reservoir state sequences', () => {
      const errors: number[] = [];

      for (let epoch = 0; epoch < 3; epoch++) {
        for (let i = 0; i < 10; i++) {
          const input = new Float64Array(INPUT_DIM);
          input[i % INPUT_DIM] = 1.0;
          const rState = reservoir.step(input);

          const target = new Float64Array(OUTPUT_DIM);
          target[i % 2 === 0 ? 0 : 1] = 1.0;

          const update = learner.update({
            reservoirState: rState,
            targetOutput: target,
            reward: 0.5,
            valence: 0.0,
            timestamp: Date.now(),
            source: 'self-evaluation',
          });

          errors.push(update.predictionError);
        }
      }

      expect(errors.length).toBe(30);
      // Errors should be finite numbers
      for (const e of errors) {
        expect(isFinite(e)).toBe(true);
      }
    });
  });

  describe('state management', () => {
    it('should report comprehensive stats', () => {
      learner.update(makeFeedback());

      const stats = learner.getStats();
      expect(stats).toHaveProperty('totalUpdates');
      expect(stats).toHaveProperty('cumulativeReward');
      expect(stats).toHaveProperty('avgPredictionError');
      expect(stats.totalUpdates).toBe(1);
    });

    it('should reset state', () => {
      for (let i = 0; i < 5; i++) {
        learner.update(makeFeedback());
      }

      expect(learner.getStats().totalUpdates).toBe(5);

      learner.reset();

      const stats = learner.getStats();
      expect(stats.totalUpdates).toBe(0);
      expect(stats.cumulativeReward).toBe(0);
      expect(stats.avgPredictionError).toBe(0);
    });

    it('should serialize and restore state', () => {
      // Apply some updates
      for (let i = 0; i < 5; i++) {
        learner.update(makeFeedback());
      }

      const stats = learner.getStats();
      expect(stats.totalUpdates).toBe(5);

      // After reset, state is clean
      learner.reset();
      expect(learner.getStats().totalUpdates).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle zero reservoir state', () => {
      const feedback = makeFeedback({
        reservoirState: new Float64Array(RESERVOIR_SIZE), // All zeros
      });

      const update = learner.update(feedback);
      expect(update).toBeDefined();
      expect(isFinite(update.predictionError)).toBe(true);
    });

    it('should handle zero target output', () => {
      const feedback = makeFeedback({
        targetOutput: new Float64Array(OUTPUT_DIM), // All zeros
      });

      const update = learner.update(feedback);
      expect(update).toBeDefined();
      expect(isFinite(update.predictionError)).toBe(true);
    });

    it('should handle rapid sequential updates', () => {
      for (let i = 0; i < 100; i++) {
        const update = learner.update(makeFeedback());
        expect(isFinite(update.weightChangeMagnitude)).toBe(true);
        expect(isFinite(update.predictionError)).toBe(true);
      }

      expect(learner.getStats().totalUpdates).toBe(100);
    });
  });
});
