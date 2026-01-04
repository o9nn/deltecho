/**
 * Tests for CoreIdentity module
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CoreIdentity } from '../src/inner-membrane/CoreIdentity.js';

describe('CoreIdentity', () => {
  let coreIdentity: CoreIdentity;

  beforeEach(() => {
    coreIdentity = new CoreIdentity();
  });

  afterEach(() => {
    if (coreIdentity.isRunning()) {
      coreIdentity.stop();
    }
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const state = coreIdentity.getState();
      expect(state).toBeDefined();
      expect(state.energyLevel).toBe(1.0);
      expect(state.coherence).toBe(1.0);
      expect(state.cycleCount).toBe(0);
    });

    it('should have valid AAR core', () => {
      const aar = coreIdentity.getAAR();
      expect(aar.agent).toBeDefined();
      expect(aar.arena).toBeDefined();
      expect(aar.relation).toBeDefined();
      expect(aar.agent.currentIntent).toBe('idle');
    });

    it('should have valid core priors', () => {
      const priors = coreIdentity.getPriors();
      expect(priors.purpose).toBeDefined();
      expect(priors.ethics.length).toBeGreaterThan(0);
      expect(priors.identity.name).toBe('Deep Tree Echo');
    });
  });

  describe('lifecycle', () => {
    it('should start and stop correctly', async () => {
      expect(coreIdentity.isRunning()).toBe(false);
      await coreIdentity.start();
      expect(coreIdentity.isRunning()).toBe(true);
      coreIdentity.stop();
      expect(coreIdentity.isRunning()).toBe(false);
    });

    it('should emit identity_initialized event on start', async () => {
      let eventReceived = false;
      coreIdentity.on('identity_initialized', () => {
        eventReceived = true;
      });
      await coreIdentity.start();
      expect(eventReceived).toBe(true);
    });
  });

  describe('state management', () => {
    it('should update intent', () => {
      coreIdentity.setIntent('processing');
      const aar = coreIdentity.getAAR();
      expect(aar.agent.currentIntent).toBe('processing');
    });

    it('should update arena state', () => {
      coreIdentity.updateArenaState('cognitive_load', 0.5);
      const aar = coreIdentity.getAAR();
      expect(aar.arena.stateSpace.get('cognitive_load')).toBe(0.5);
    });

    it('should update energy level within bounds', () => {
      coreIdentity.setEnergyLevel(0.5);
      expect(coreIdentity.getState().energyLevel).toBe(0.5);

      coreIdentity.setEnergyLevel(1.5);
      expect(coreIdentity.getState().energyLevel).toBe(1.0);

      coreIdentity.setEnergyLevel(-0.5);
      expect(coreIdentity.getState().energyLevel).toBe(0);
    });
  });

  describe('external API decision', () => {
    it('should not need external API for low complexity tasks', () => {
      coreIdentity.setEnergyLevel(1.0);
      expect(coreIdentity.needsExternalAPI(0.2)).toBe(false);
    });

    it('should need external API for high complexity tasks', () => {
      coreIdentity.setEnergyLevel(0.5);
      expect(coreIdentity.needsExternalAPI(0.9)).toBe(true);
    });

    it('should emit event when external API is requested', () => {
      let eventReceived = false;
      coreIdentity.on('external_api_requested', () => {
        eventReceived = true;
      });
      coreIdentity.setEnergyLevel(0.3);
      coreIdentity.needsExternalAPI(0.9);
      expect(eventReceived).toBe(true);
    });
  });

  describe('serialization', () => {
    it('should serialize and deserialize state', () => {
      coreIdentity.setIntent('testing');
      coreIdentity.setEnergyLevel(0.7);
      coreIdentity.updateArenaState('test_key', 0.42);

      const serialized = coreIdentity.serialize();
      expect(serialized).toBeDefined();

      const newIdentity = new CoreIdentity();
      newIdentity.deserialize(serialized);

      expect(newIdentity.getAAR().agent.currentIntent).toBe('testing');
      expect(newIdentity.getState().energyLevel).toBe(0.7);
      expect(newIdentity.getAAR().arena.stateSpace.get('test_key')).toBe(0.42);
    });
  });
});
