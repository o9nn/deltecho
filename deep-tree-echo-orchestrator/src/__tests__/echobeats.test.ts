import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Echobeats, EchobeatsTick, StreamPhase } from '../echobeats.js';

describe('Echobeats', () => {
  let echobeats: Echobeats;

  afterEach(() => {
    if (echobeats?.isRunning()) {
      echobeats.stop();
    }
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      echobeats = new Echobeats();
      const stats = echobeats.getStats();

      expect(stats.running).toBe(false);
      expect(stats.globalStep).toBe(0);
      expect(stats.cycleNumber).toBe(0);
      expect(stats.streams).toHaveLength(3);
      expect(stats.shells).toHaveLength(3); // global, organization, process
    });

    it('should initialize 3 named streams', () => {
      echobeats = new Echobeats();
      const streams = echobeats.getStreams();

      expect(streams[0].name).toBe('perception');
      expect(streams[1].name).toBe('action');
      expect(streams[2].name).toBe('simulation');

      for (const stream of streams) {
        expect(stream.tickCount).toBe(0);
        expect(stream.energy).toBe(1.0);
        expect(stream.currentPhase).toBe('perceive');
      }
    });

    it('should initialize nested shells with OEIS A000081 term counts', () => {
      echobeats = new Echobeats();
      const shells = echobeats.getShells();

      expect(shells[0]).toMatchObject({ name: 'global', level: 0, termCount: 1 });
      expect(shells[1]).toMatchObject({ name: 'organization', level: 1, termCount: 2 });
      expect(shells[2]).toMatchObject({ name: 'process', level: 2, termCount: 4 });
    });

    it('should use single global shell when nested shells disabled', () => {
      echobeats = new Echobeats({ enableNestedShells: false });
      const shells = echobeats.getShells();

      expect(shells).toHaveLength(1);
      expect(shells[0].name).toBe('global');
      expect(shells[0].activeStreams).toEqual([0, 1, 2]);
    });

    it('should accept custom config', () => {
      echobeats = new Echobeats({
        cycleInterval: 500,
        streamCount: 3,
        stepsPerCycle: 12,
      });

      const stats = echobeats.getStats();
      expect(stats.streams).toHaveLength(3);
    });
  });

  describe('lifecycle', () => {
    it('should start and stop cleanly', () => {
      echobeats = new Echobeats({ cycleInterval: 10000 });

      expect(echobeats.isRunning()).toBe(false);
      echobeats.start();
      expect(echobeats.isRunning()).toBe(true);
      echobeats.stop();
      expect(echobeats.isRunning()).toBe(false);
    });

    it('should emit started and stopped events', () => {
      echobeats = new Echobeats({ cycleInterval: 10000 });

      const events: string[] = [];
      echobeats.on('started', () => events.push('started'));
      echobeats.on('stopped', () => events.push('stopped'));

      echobeats.start();
      echobeats.stop();

      expect(events).toEqual(['started', 'stopped']);
    });

    it('should not start twice', () => {
      echobeats = new Echobeats({ cycleInterval: 10000 });
      echobeats.start();
      echobeats.start(); // Should be no-op
      expect(echobeats.isRunning()).toBe(true);
      echobeats.stop();
    });
  });

  describe('12-step cycle', () => {
    it('should emit tick events with correct phase progression', async () => {
      echobeats = new Echobeats({ cycleInterval: 10 });
      const ticks: EchobeatsTick[] = [];

      echobeats.on('tick', (tick: EchobeatsTick) => {
        ticks.push(tick);
      });

      echobeats.start();
      await new Promise(resolve => setTimeout(resolve, 200));
      echobeats.stop();

      expect(ticks.length).toBeGreaterThan(0);

      // Verify first 12 ticks follow the phase map
      const expectedPhases: StreamPhase[] = [
        'perceive', 'perceive', 'perceive',
        'reflect', 'reflect', 'reflect',
        'plan', 'plan', 'plan',
        'act', 'act', 'act',
      ];

      for (let i = 0; i < Math.min(12, ticks.length); i++) {
        expect(ticks[i].phase).toBe(expectedPhases[i]);
        expect(ticks[i].cycleStep).toBe(i + 1);
      }
    });

    it('should cycle streams round-robin (0, 1, 2, 0, 1, 2...)', async () => {
      echobeats = new Echobeats({ cycleInterval: 10 });
      const streamIds: number[] = [];

      echobeats.on('tick', (tick: EchobeatsTick) => {
        streamIds.push(tick.stream.id);
      });

      echobeats.start();
      await new Promise(resolve => setTimeout(resolve, 200));
      echobeats.stop();

      // First 12 ticks should cycle through streams
      for (let i = 0; i < Math.min(12, streamIds.length); i++) {
        expect(streamIds[i]).toBe(i % 3);
      }
    });

    it('should emit cycle_start and cycle_end events', async () => {
      echobeats = new Echobeats({ cycleInterval: 10 });
      const cycleStarts: number[] = [];
      const cycleEnds: number[] = [];

      echobeats.on('cycle_start', (e: { cycleNumber: number }) => cycleStarts.push(e.cycleNumber));
      echobeats.on('cycle_end', (e: { cycleNumber: number }) => cycleEnds.push(e.cycleNumber));

      echobeats.start();
      await new Promise(resolve => setTimeout(resolve, 300));
      echobeats.stop();

      expect(cycleStarts.length).toBeGreaterThan(0);
      expect(cycleStarts[0]).toBe(1);
    });
  });

  describe('thread multiplexing', () => {
    it('should cycle through 6 dyadic permutations', async () => {
      echobeats = new Echobeats({ cycleInterval: 10, enableMultiplexing: true });
      const permutations: Array<[number, number]> = [];

      echobeats.on('tick', (tick: EchobeatsTick) => {
        if (tick.permutation) {
          permutations.push(tick.permutation.pair);
        }
      });

      echobeats.start();
      await new Promise(resolve => setTimeout(resolve, 200));
      echobeats.stop();

      // Should have permutations
      expect(permutations.length).toBeGreaterThan(0);

      // First 6 should be the 6 dyadic permutations
      const expected: Array<[number, number]> = [
        [1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4],
      ];

      for (let i = 0; i < Math.min(6, permutations.length); i++) {
        expect(permutations[i]).toEqual(expected[i]);
      }
    });

    it('should alternate between MP1 and MP2 triads', async () => {
      echobeats = new Echobeats({ cycleInterval: 10, enableMultiplexing: true });
      const triads: string[] = [];

      echobeats.on('tick', (tick: EchobeatsTick) => {
        if (tick.permutation) {
          triads.push(tick.permutation.triad);
        }
      });

      echobeats.start();
      await new Promise(resolve => setTimeout(resolve, 300));
      echobeats.stop();

      // First 6 ticks should be MP1, next 6 should be MP2
      if (triads.length >= 12) {
        const first6 = triads.slice(0, 6);
        const next6 = triads.slice(6, 12);
        expect(first6.every(t => t === 'MP1')).toBe(true);
        expect(next6.every(t => t === 'MP2')).toBe(true);
      }
    });
  });

  describe('energy flow (1/7 sequence)', () => {
    it('should apply 1/7 = 0.142857 energy flow', async () => {
      echobeats = new Echobeats({ cycleInterval: 10 });
      const energies: number[] = [];

      echobeats.on('tick', (tick: EchobeatsTick) => {
        energies.push(tick.energyFlow);
      });

      echobeats.start();
      await new Promise(resolve => setTimeout(resolve, 150));
      echobeats.stop();

      // Energy flow values should be from the 1/7 sequence: [1,4,2,8,5,7]/9
      const expectedFlow = [1, 4, 2, 8, 5, 7].map(v => v / 9);

      for (let i = 0; i < Math.min(6, energies.length); i++) {
        expect(energies[i]).toBeCloseTo(expectedFlow[i], 5);
      }
    });

    it('should keep stream energy in [0.5, 1.0] range', async () => {
      echobeats = new Echobeats({ cycleInterval: 10 });
      const streamEnergies: number[] = [];

      echobeats.on('tick', (tick: EchobeatsTick) => {
        streamEnergies.push(tick.stream.energy);
      });

      echobeats.start();
      await new Promise(resolve => setTimeout(resolve, 200));
      echobeats.stop();

      for (const energy of streamEnergies) {
        expect(energy).toBeGreaterThanOrEqual(0.5);
        expect(energy).toBeLessThanOrEqual(1.0);
      }
    });
  });

  describe('tick handler', () => {
    it('should call registered tick handler for each step', async () => {
      echobeats = new Echobeats({ cycleInterval: 10 });
      let handlerCalls = 0;

      echobeats.onTick(async () => {
        handlerCalls++;
      });

      echobeats.start();
      await new Promise(resolve => setTimeout(resolve, 150));
      echobeats.stop();

      expect(handlerCalls).toBeGreaterThan(0);
    });

    it('should handle tick handler errors gracefully', async () => {
      echobeats = new Echobeats({ cycleInterval: 10 });
      const errors: string[] = [];

      echobeats.onTick(async () => {
        throw new Error('test error');
      });

      echobeats.on('error', (e: { error: string }) => {
        errors.push(e.error);
      });

      echobeats.start();
      await new Promise(resolve => setTimeout(resolve, 100));
      echobeats.stop();

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('test error');
      // Should still be running despite errors
    });
  });

  describe('statistics', () => {
    it('should track global step and cycle number', async () => {
      echobeats = new Echobeats({ cycleInterval: 10 });

      echobeats.start();
      await new Promise(resolve => setTimeout(resolve, 200));
      echobeats.stop();

      const stats = echobeats.getStats();
      expect(stats.globalStep).toBeGreaterThan(0);
      expect(stats.cycleNumber).toBeGreaterThan(0);
    });

    it('should track per-stream tick counts', async () => {
      echobeats = new Echobeats({ cycleInterval: 10 });

      echobeats.start();
      await new Promise(resolve => setTimeout(resolve, 200));
      echobeats.stop();

      const stats = echobeats.getStats();
      for (const stream of stats.streams) {
        expect(stream.tickCount).toBeGreaterThan(0);
      }
    });
  });
});
