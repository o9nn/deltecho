import { PersonaCore } from '../PersonaCore';
import { InMemoryStorage } from '../../memory/storage';

describe('PersonaCore', () => {
  let storage: InMemoryStorage;
  let personaCore: PersonaCore;

  beforeEach(() => {
    storage = new InMemoryStorage();
    personaCore = new PersonaCore(storage);
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      expect(personaCore).toBeDefined();
    });

    it('should use provided storage', () => {
      const customStorage = new InMemoryStorage();
      const persona = new PersonaCore(customStorage);
      expect(persona).toBeDefined();
    });

    it('should use in-memory storage when none provided', () => {
      const persona = new PersonaCore();
      expect(persona).toBeDefined();
    });
  });

  describe('personality management', () => {
    it('should get personality', () => {
      const personality = personaCore.getPersonality();
      expect(typeof personality).toBe('string');
      expect(personality.length).toBeGreaterThan(0);
    });

    it('should update personality', async () => {
      const newPersonality = 'A new personality description';
      await personaCore.updatePersonality(newPersonality);
      
      const personality = personaCore.getPersonality();
      expect(personality).toBe(newPersonality);
    });
  });

  describe('affective state', () => {
    it('should get affective state', () => {
      const affectiveState = personaCore.getAffectiveState();
      
      expect(affectiveState).toBeDefined();
      expect(typeof affectiveState.joy).toBe('number');
      expect(typeof affectiveState.interest).toBe('number');
      expect(typeof affectiveState.surprise).toBe('number');
      expect(typeof affectiveState.sadness).toBe('number');
      expect(typeof affectiveState.anger).toBe('number');
      expect(typeof affectiveState.fear).toBe('number');
    });

    it('should have initial values between 0 and 1', () => {
      const affectiveState = personaCore.getAffectiveState();
      
      Object.values(affectiveState).forEach(value => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      });
    });

    it('should update affective state', async () => {
      await personaCore.updateAffectiveState({
        joy: 0.9,
        interest: 0.8,
      });

      const affectiveState = personaCore.getAffectiveState();
      expect(affectiveState.joy).toBe(0.9);
      expect(affectiveState.interest).toBe(0.8);
    });

    it('should clamp values between 0 and 1', async () => {
      await personaCore.updateAffectiveState({
        joy: 1.5,
        sadness: -0.5,
      });

      const affectiveState = personaCore.getAffectiveState();
      expect(affectiveState.joy).toBeLessThanOrEqual(1);
      expect(affectiveState.sadness).toBeGreaterThanOrEqual(0);
    });
  });

  describe('cognitive state', () => {
    it('should get cognitive state', () => {
      const cognitiveState = personaCore.getCognitiveState();
      
      expect(cognitiveState).toBeDefined();
      expect(typeof cognitiveState.certainty).toBe('number');
      expect(typeof cognitiveState.curiosity).toBe('number');
      expect(typeof cognitiveState.creativity).toBe('number');
      expect(typeof cognitiveState.focus).toBe('number');
      expect(typeof cognitiveState.reflection).toBe('number');
    });

    it('should update cognitive state', async () => {
      await personaCore.updateCognitiveState({
        certainty: 0.9,
        curiosity: 0.95,
      });

      const cognitiveState = personaCore.getCognitiveState();
      expect(cognitiveState.certainty).toBe(0.9);
      expect(cognitiveState.curiosity).toBe(0.95);
    });
  });

  describe('self perception', () => {
    it('should get self perception', () => {
      const selfPerception = personaCore.getSelfPerception();
      expect(typeof selfPerception).toBe('string');
    });

    it('should update self perception', async () => {
      await personaCore.updateSelfPerception('neutral');
      const selfPerception = personaCore.getSelfPerception();
      expect(selfPerception).toBe('neutral');
    });
  });

  describe('preferences', () => {
    it('should get preferences', () => {
      const preferences = personaCore.getPreferences();
      
      expect(preferences).toBeDefined();
      expect(preferences.presentationStyle).toBeDefined();
      expect(preferences.communicationTone).toBeDefined();
    });

    it('should update preferences', async () => {
      await personaCore.updatePreferences({
        presentationStyle: 'professional',
        communicationTone: 'formal',
      });

      const preferences = personaCore.getPreferences();
      expect(preferences.presentationStyle).toBe('professional');
      expect(preferences.communicationTone).toBe('formal');
    });
  });

  describe('avatar configuration', () => {
    it('should get avatar config', () => {
      const avatarConfig = personaCore.getAvatarConfig();
      
      expect(avatarConfig).toBeDefined();
      expect(avatarConfig.displayName).toBeDefined();
      expect(avatarConfig.primaryColor).toBeDefined();
      expect(avatarConfig.aesthetic).toBeDefined();
    });

    it('should update avatar config', async () => {
      await personaCore.updateAvatarConfig({
        displayName: 'Custom Name',
        primaryColor: '#ff0000',
      });

      const avatarConfig = personaCore.getAvatarConfig();
      expect(avatarConfig.displayName).toBe('Custom Name');
      expect(avatarConfig.primaryColor).toBe('#ff0000');
    });
  });

  describe('emotional dynamics', () => {
    it('should process emotional stimulus', async () => {
      const initialState = personaCore.getAffectiveState();
      const initialJoy = initialState.joy;

      await personaCore.processEmotionalStimulus('positive', 0.3);

      const newState = personaCore.getAffectiveState();
      // Joy should increase with positive stimulus
      expect(newState.joy).toBeGreaterThanOrEqual(initialJoy);
    });

    it('should apply emotional decay over time', async () => {
      // Set high emotional state
      await personaCore.updateAffectiveState({
        joy: 0.95,
        anger: 0.9,
      });

      // Apply decay
      await personaCore.applyEmotionalDecay();

      const state = personaCore.getAffectiveState();
      // Emotions should decay toward baseline
      expect(state.joy).toBeLessThan(0.95);
      expect(state.anger).toBeLessThan(0.9);
    });
  });

  describe('value alignment', () => {
    it('should check value alignment', async () => {
      const alignment = await personaCore.checkValueAlignment('helpful response');
      
      expect(typeof alignment).toBe('object');
      expect(alignment.aligned).toBeDefined();
      expect(alignment.confidence).toBeDefined();
    });

    it('should return high alignment for positive content', async () => {
      const alignment = await personaCore.checkValueAlignment(
        'I want to help you solve this problem'
      );
      
      expect(alignment.aligned).toBe(true);
      expect(alignment.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('persistence', () => {
    it('should persist state to storage', async () => {
      await personaCore.updatePersonality('Test personality');
      await personaCore.updateAffectiveState({ joy: 0.8 });
      
      // Create new instance with same storage
      const newPersonaCore = new PersonaCore(storage);
      
      // Wait for async load
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const personality = newPersonaCore.getPersonality();
      expect(personality).toBe('Test personality');
    });

    it('should handle storage errors gracefully', async () => {
      // Create persona with failing storage
      const failingStorage = {
        async load(_key: string) { throw new Error('Storage error'); },
        async save(_key: string, _value: string) { throw new Error('Storage error'); },
      };
      
      const persona = new PersonaCore(failingStorage);
      
      // Should not throw
      expect(persona).toBeDefined();
    });
  });

  describe('complete persona state', () => {
    it('should get complete persona state', () => {
      const completeState = personaCore.getCompleteState();
      
      expect(completeState).toBeDefined();
      expect(completeState.personality).toBeDefined();
      expect(completeState.selfPerception).toBeDefined();
      expect(completeState.preferences).toBeDefined();
      expect(completeState.affectiveState).toBeDefined();
      expect(completeState.cognitiveState).toBeDefined();
      expect(completeState.avatarConfig).toBeDefined();
    });

    it('should reset to defaults', async () => {
      // Modify state
      await personaCore.updateAffectiveState({ joy: 0.1 });
      await personaCore.updateCognitiveState({ certainty: 0.1 });
      
      // Reset
      await personaCore.resetToDefaults();
      
      const state = personaCore.getCompleteState();
      // Should be back to default values
      expect(state.affectiveState.joy).toBeGreaterThan(0.1);
    });
  });
});
