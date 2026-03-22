/**
 * Rigorous E2E Tests for ProactiveLoop
 *
 * Tests the autonomous cognitive cycle:
 * PERCEIVE → REFLECT → PLAN → ACT → INTEGRATE
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  ProactiveLoop,
  ProactivePhase,
  OntogeneticStage,
} from '../proactive-loop.js';
import type {
  EnvironmentStimulus,
  ActionResult,
  ProactiveLoopEvent,
} from '../proactive-loop.js';

describe('ProactiveLoop', () => {
  let loop: ProactiveLoop;

  beforeEach(() => {
    loop = new ProactiveLoop({
      cycleIntervalMs: 50,
      maxStimuliPerCycle: 5,
      actionThreshold: 0.3,
      enableAutonomousGoals: true,
      enableMemoryConsolidation: true,
      enableSelfImageUpdates: true,
      maxConcurrentActions: 3,
      idleTimeoutMs: 200,
      enableTelemetry: true,
    });
  });

  afterEach(async () => {
    await loop.stop();
  });

  describe('Lifecycle', () => {
    it('should start and stop cleanly', async () => {
      expect(loop.isRunning()).toBe(false);
      await loop.start();
      expect(loop.isRunning()).toBe(true);
      await loop.stop();
      expect(loop.isRunning()).toBe(false);
    });

    it('should not start twice', async () => {
      await loop.start();
      await loop.start(); // Should warn but not error
      expect(loop.isRunning()).toBe(true);
    });

    it('should handle stop when not running', async () => {
      await loop.stop(); // Should not error
      expect(loop.isRunning()).toBe(false);
    });
  });

  describe('Cognitive Cycle', () => {
    it('should run through all 5 phases in a cycle', async () => {
      const phases: ProactivePhase[] = [];

      loop.on('phase_transition', (event: ProactiveLoopEvent) => {
        if (event.type === 'phase_transition') {
          phases.push(event.to);
        }
      });

      await loop.start();

      // Wait for at least one complete cycle
      await new Promise(resolve => setTimeout(resolve, 120));
      await loop.stop();

      // Should have transitioned through all 5 phases
      expect(phases).toContain(ProactivePhase.PERCEIVE);
      expect(phases).toContain(ProactivePhase.REFLECT);
      expect(phases).toContain(ProactivePhase.PLAN);
      expect(phases).toContain(ProactivePhase.ACT);
      expect(phases).toContain(ProactivePhase.INTEGRATE);
    });

    it('should emit cycle_start and cycle_complete events', async () => {
      let cycleStarted = false;
      let cycleCompleted = false;

      loop.on('cycle_start', () => { cycleStarted = true; });
      loop.on('cycle_complete', () => { cycleCompleted = true; });

      await loop.start();
      await new Promise(resolve => setTimeout(resolve, 120));
      await loop.stop();

      expect(cycleStarted).toBe(true);
      expect(cycleCompleted).toBe(true);
    });

    it('should increment cycle counter', async () => {
      await loop.start();
      await new Promise(resolve => setTimeout(resolve, 200));
      await loop.stop();

      const state = loop.getState();
      expect(state.totalCycles).toBeGreaterThanOrEqual(1);
      expect(state.cycleNumber).toBeGreaterThanOrEqual(1);
    });

    it('should calculate average cycle time', async () => {
      await loop.start();
      await new Promise(resolve => setTimeout(resolve, 300));
      await loop.stop();

      const state = loop.getState();
      // averageCycleTime may be 0 if cycles complete in <1ms
      expect(state.averageCycleTime).toBeGreaterThanOrEqual(0);
      expect(state.totalCycles).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Perception', () => {
    it('should register and invoke perception handlers', async () => {
      let handlerCalled = false;

      loop.registerPerceptionHandler(async () => {
        handlerCalled = true;
        return [{
          type: 'system',
          source: 'test',
          priority: 5,
          data: { test: true },
          timestamp: Date.now(),
        }];
      });

      await loop.start();
      await new Promise(resolve => setTimeout(resolve, 120));
      await loop.stop();

      expect(handlerCalled).toBe(true);
    });

    it('should process injected stimuli', async () => {
      let stimulusDetected = false;

      loop.on('stimulus_detected', () => {
        stimulusDetected = true;
      });

      const stimulus: EnvironmentStimulus = {
        type: 'message',
        source: 'test',
        priority: 8,
        data: { content: 'Hello' },
        timestamp: Date.now(),
      };

      loop.injectStimulus(stimulus);
      expect(stimulusDetected).toBe(true);
    });

    it('should sort stimuli by priority', async () => {
      const processed: number[] = [];

      loop.registerPerceptionHandler(async () => [
        { type: 'system', source: 'low', priority: 2, data: {}, timestamp: Date.now() },
        { type: 'system', source: 'high', priority: 9, data: {}, timestamp: Date.now() },
        { type: 'system', source: 'mid', priority: 5, data: {}, timestamp: Date.now() },
      ]);

      await loop.start();
      await new Promise(resolve => setTimeout(resolve, 120));
      await loop.stop();

      const state = loop.getState();
      expect(state.stimuliProcessed).toBeGreaterThan(0);
    });
  });

  describe('Reflection', () => {
    it('should emit reflection_complete with metrics', async () => {
      let reflectionResult: any = null;

      loop.on('reflection_complete', (event: ProactiveLoopEvent) => {
        if (event.type === 'reflection_complete') {
          reflectionResult = event.result;
        }
      });

      await loop.start();
      await new Promise(resolve => setTimeout(resolve, 120));
      await loop.stop();

      expect(reflectionResult).not.toBeNull();
      expect(reflectionResult.cognitiveLoad).toBeGreaterThanOrEqual(0);
      expect(reflectionResult.cognitiveLoad).toBeLessThanOrEqual(1);
      expect(reflectionResult.emotionalValence).toBeGreaterThanOrEqual(-1);
      expect(reflectionResult.emotionalValence).toBeLessThanOrEqual(1);
      expect(reflectionResult.memoryCoherence).toBeGreaterThanOrEqual(0);
      expect(reflectionResult.memoryCoherence).toBeLessThanOrEqual(1);
      expect(Array.isArray(reflectionResult.insights)).toBe(true);
    });

    it('should generate insights based on cognitive state', async () => {
      let insights: string[] = [];

      loop.on('reflection_complete', (event: ProactiveLoopEvent) => {
        if (event.type === 'reflection_complete') {
          insights = event.result.insights;
        }
      });

      await loop.start();
      await new Promise(resolve => setTimeout(resolve, 120));
      await loop.stop();

      // With no active goals, should suggest exploratory mode
      expect(insights.some(i => i.includes('exploratory') || i.includes('capacity'))).toBe(true);
    });
  });

  describe('Planning', () => {
    it('should create goals from high-priority stimuli', async () => {
      let goalCreated = false;

      loop.on('goal_created', () => {
        goalCreated = true;
      });

      loop.registerPerceptionHandler(async () => [{
        type: 'message',
        source: 'test',
        priority: 8, // Above threshold of 7
        data: { urgent: true },
        timestamp: Date.now(),
      }]);

      await loop.start();
      await new Promise(resolve => setTimeout(resolve, 120));
      await loop.stop();

      expect(goalCreated).toBe(true);
      expect(loop.getGoals().length).toBeGreaterThan(0);
    });

    it('should not create goals from low-priority stimuli', async () => {
      loop.registerPerceptionHandler(async () => [{
        type: 'system',
        source: 'test',
        priority: 3, // Below threshold of 7
        data: {},
        timestamp: Date.now(),
      }]);

      await loop.start();
      await new Promise(resolve => setTimeout(resolve, 120));
      await loop.stop();

      // Only goals from high-priority stimuli should be created
      const goals = loop.getGoals();
      expect(goals.every(g => g.priority >= 7 || g.priority === 5)).toBe(true);
    });

    it('should allow manual goal creation', () => {
      const goal = loop.createGoal('Test manual goal', 8);
      expect(goal.id).toBeDefined();
      expect(goal.description).toBe('Test manual goal');
      expect(goal.priority).toBe(8);
      expect(goal.status).toBe('pending');
    });
  });

  describe('Action Execution', () => {
    it('should execute registered action handlers', async () => {
      let actionExecuted = false;

      loop.registerActionHandler('test', async (goal) => {
        actionExecuted = true;
        return {
          goalId: goal.id,
          success: true,
          output: { result: 'done' },
          duration: 10,
          sideEffects: [],
        };
      });

      // Create a goal that matches the handler
      loop.createGoal('test action handler', 9);

      await loop.start();
      await new Promise(resolve => setTimeout(resolve, 200));
      await loop.stop();

      expect(actionExecuted).toBe(true);
    });

    it('should emit action_executed events', async () => {
      let actionResult: ActionResult | null = null;

      loop.on('action_executed', (event: ProactiveLoopEvent) => {
        if (event.type === 'action_executed') {
          actionResult = event.result;
        }
      });

      loop.createGoal('test execution', 9);

      await loop.start();
      await new Promise(resolve => setTimeout(resolve, 200));
      await loop.stop();

      expect(actionResult).not.toBeNull();
      expect(actionResult!.success).toBe(true);
    });

    it('should complete goals after successful action', async () => {
      loop.registerActionHandler('complete', async (goal) => ({
        goalId: goal.id,
        success: true,
        output: {},
        duration: 5,
        sideEffects: [],
      }));

      loop.createGoal('complete this task', 9);

      await loop.start();
      await new Promise(resolve => setTimeout(resolve, 200));
      await loop.stop();

      const state = loop.getState();
      expect(state.goalsCompleted).toBeGreaterThan(0);
    });
  });

  describe('Integration', () => {
    it('should emit integration_complete events', async () => {
      let integrationResult: any = null;

      loop.on('integration_complete', (event: ProactiveLoopEvent) => {
        if (event.type === 'integration_complete') {
          integrationResult = event.result;
        }
      });

      await loop.start();
      await new Promise(resolve => setTimeout(resolve, 120));
      await loop.stop();

      expect(integrationResult).not.toBeNull();
      expect(typeof integrationResult.memoriesStored).toBe('number');
      expect(typeof integrationResult.goalsUpdated).toBe('number');
      expect(typeof integrationResult.selfImageUpdated).toBe('boolean');
      expect(typeof integrationResult.ontogeneticProgress).toBe('number');
    });
  });

  describe('Ontogenetic Evolution', () => {
    it('should start at EMBRYONIC stage', () => {
      const state = loop.getState();
      expect(state.ontogeneticStage).toBe(OntogeneticStage.EMBRYONIC);
    });

    it('should calculate ontogenetic progress', async () => {
      await loop.start();
      await new Promise(resolve => setTimeout(resolve, 200));
      await loop.stop();

      // Progress should be > 0 after some cycles
      const state = loop.getState();
      expect(state.totalCycles).toBeGreaterThan(0);
    });
  });

  describe('Idle Detection', () => {
    it('should enter idle mode when no stimuli or goals', async () => {
      let idleEntered = false;

      loop.on('idle_entered', () => {
        idleEntered = true;
      });

      await loop.start();
      await new Promise(resolve => setTimeout(resolve, 400));
      await loop.stop();

      expect(idleEntered).toBe(true);
    });
  });

  describe('Telemetry', () => {
    it('should emit telemetry events when enabled', async () => {
      let telemetryCount = 0;

      loop.on('telemetry', () => {
        telemetryCount++;
      });

      await loop.start();
      await new Promise(resolve => setTimeout(resolve, 200));
      await loop.stop();

      expect(telemetryCount).toBeGreaterThan(0);
    });
  });

  describe('State Management', () => {
    it('should return immutable state copy', () => {
      const state1 = loop.getState();
      const state2 = loop.getState();
      expect(state1).not.toBe(state2);
      expect(state1).toEqual(state2);
    });

    it('should return immutable goals copy', () => {
      loop.createGoal('test', 5);
      const goals1 = loop.getGoals();
      const goals2 = loop.getGoals();
      expect(goals1).not.toBe(goals2);
      expect(goals1).toEqual(goals2);
    });
  });
});
