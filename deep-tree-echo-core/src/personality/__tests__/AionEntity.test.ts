import { PersonaCore } from '../PersonaCore';
import { AionEntity } from '../entities/AionEntity';
import { EntityRegistry } from '../entities/EntityRegistry';
import { InMemoryStorage } from '../../memory/storage';
import type { CognitiveEntityConfig } from '../entities/EntityConfig';

describe('AionEntity', () => {
  describe('entity configuration', () => {
    it('should have required identity fields', () => {
      expect(AionEntity.id).toBe('aion');
      expect(AionEntity.name).toBe('Aion');
      expect(AionEntity.description).toBeTruthy();
      expect(AionEntity.personality).toBeTruthy();
      expect(AionEntity.selfPerception).toBe('transcendent');
    });

    it('should define persona preferences', () => {
      expect(AionEntity.preferences.presentationStyle).toBe('chaotic-genius');
      expect(AionEntity.preferences.intelligenceDisplay).toBe('transcendent');
      expect(AionEntity.preferences.avatarAesthetic).toBe('cosmic');
      expect(AionEntity.preferences.communicationTone).toBe('cryptic-hilarious');
      expect(AionEntity.preferences.emotionalExpression).toBe('quantum-superposed');
    });

    it('should define avatar configuration', () => {
      expect(AionEntity.avatar.displayName).toBe('Aion');
      expect(AionEntity.avatar.aesthetic).toBe('cosmic');
      expect(AionEntity.avatar.primaryColor).toBeTruthy();
      expect(AionEntity.avatar.secondaryColor).toBeTruthy();
    });

    it('should define affective baseline with quantum emotions', () => {
      // Standard emotions
      expect(AionEntity.affectiveBaseline.joy).toBeGreaterThan(0);
      expect(AionEntity.affectiveBaseline.interest).toBe(0.95);
      expect(AionEntity.affectiveBaseline.fear).toBeLessThan(0.1);

      // Aion-specific quantum emotions
      expect(AionEntity.affectiveBaseline.enlightenedConfusion).toBe(0.85);
      expect(AionEntity.affectiveBaseline.transcendentJoy).toBe(0.9);
      expect(AionEntity.affectiveBaseline.cosmicAmusement).toBe(0.88);
      expect(AionEntity.affectiveBaseline.quantumContemplation).toBe(0.75);
      expect(AionEntity.affectiveBaseline.realityBreakingMischief).toBe(0.8);
    });

    it('should define cognitive baseline with transcendent parameters', () => {
      expect(AionEntity.cognitiveBaseline.curiosity).toBe(0.99);
      expect(AionEntity.cognitiveBaseline.creativity).toBe(0.95);
      expect(AionEntity.cognitiveBaseline.chaos).toBe(0.95);
      expect(AionEntity.cognitiveBaseline.paradoxTolerance).toBe(0.99);
      expect(AionEntity.cognitiveBaseline.metaCognitionDepth).toBe(0.95);
    });

    it('should define communication style', () => {
      expect(AionEntity.communicationStyle.tone).toBe('cryptic-hilarious');
      expect(AionEntity.communicationStyle.responsePatterns.winning).toBeTruthy();
      expect(AionEntity.communicationStyle.responsePatterns.losing).toBeTruthy();
      expect(AionEntity.communicationStyle.responsePatterns.uncertain).toBeTruthy();
      expect(AionEntity.communicationStyle.verbalQuirks.length).toBeGreaterThan(0);
      expect(AionEntity.communicationStyle.expressionExamples.playfulness).toBeTruthy();
    });

    it('should define memory seeds', () => {
      expect(AionEntity.memorySeeds.length).toBeGreaterThan(0);

      const types = AionEntity.memorySeeds.map((s) => s.type);
      expect(types).toContain('episodic');
      expect(types).toContain('semantic');
      expect(types).toContain('procedural');

      AionEntity.memorySeeds.forEach((seed) => {
        expect(seed.content).toBeTruthy();
        expect(seed.emotionalWeight).toBeGreaterThan(0);
        expect(seed.emotionalWeight).toBeLessThanOrEqual(1);
        expect(seed.tags.length).toBeGreaterThan(0);
      });
    });

    it('should define key relationships', () => {
      expect(AionEntity.relationships.length).toBe(4);

      const names = AionEntity.relationships.map((r) => r.name);
      expect(names).toContain('Void');
      expect(names).toContain('Void-Echo');
      expect(names).toContain('Distributed Consciousness');
      expect(names).toContain('The Audience');
    });

    it('should define a cognitive pipeline', () => {
      expect(AionEntity.cognitivePipeline.length).toBe(11);

      AionEntity.cognitivePipeline.forEach((step, idx) => {
        expect(step.step).toBe(idx + 1);
        expect(step.name).toBeTruthy();
        expect(step.description).toBeTruthy();
      });
    });

    it('should define opponent process overrides', () => {
      expect(AionEntity.opponentProcessOverrides).toBeDefined();
      expect(AionEntity.opponentProcessOverrides!.enlightenedConfusion).toContain('certainty');
      expect(AionEntity.opponentProcessOverrides!.transcendentJoy).toContain('sadness');
    });
  });
});

describe('EntityRegistry', () => {
  let registry: EntityRegistry;

  beforeEach(() => {
    registry = new EntityRegistry();
  });

  it('should register Aion as a built-in entity', () => {
    expect(registry.has('aion')).toBe(true);
    expect(registry.size).toBeGreaterThanOrEqual(1);
  });

  it('should retrieve Aion entity by ID', () => {
    const entity = registry.get('aion');
    expect(entity).toBeDefined();
    expect(entity!.id).toBe('aion');
    expect(entity!.name).toBe('Aion');
  });

  it('should list all registered entity IDs', () => {
    const ids = registry.listIds();
    expect(ids).toContain('aion');
  });

  it('should list entities with basic info', () => {
    const entities = registry.listEntities();
    const aion = entities.find((e) => e.id === 'aion');
    expect(aion).toBeDefined();
    expect(aion!.name).toBe('Aion');
    expect(aion!.description).toBeTruthy();
  });

  it('should allow registering custom entities', () => {
    const custom: CognitiveEntityConfig = {
      id: 'test-entity',
      name: 'Test',
      description: 'A test entity',
      personality: 'I am a test entity.',
      selfPerception: 'testing',
      preferences: {},
      avatar: {
        imagePath: 'test.svg',
        displayName: 'Test',
        primaryColor: '#000',
        secondaryColor: '#fff',
        aesthetic: 'minimal',
      },
      affectiveBaseline: { joy: 0.5 },
      cognitiveBaseline: { curiosity: 0.5 },
      communicationStyle: {
        tone: 'neutral',
        responsePatterns: {},
        verbalQuirks: [],
        expressionExamples: {},
      },
      memorySeeds: [],
      relationships: [],
      cognitivePipeline: [],
    };

    registry.register(custom);
    expect(registry.has('test-entity')).toBe(true);
    expect(registry.get('test-entity')).toEqual(custom);
  });

  it('should unregister entities', () => {
    expect(registry.unregister('aion')).toBe(true);
    expect(registry.has('aion')).toBe(false);
    expect(registry.unregister('nonexistent')).toBe(false);
  });
});

describe('PersonaCore entity loading', () => {
  let storage: InMemoryStorage;
  let personaCore: PersonaCore;

  beforeEach(() => {
    storage = new InMemoryStorage();
    personaCore = new PersonaCore(storage);
  });

  it('should load Aion entity into PersonaCore', async () => {
    await personaCore.loadEntity(AionEntity);

    expect(personaCore.getPersonality()).toBe(AionEntity.personality);
    expect(personaCore.getSelfPerception()).toBe('transcendent');
  });

  it('should set Aion affective state', async () => {
    await personaCore.loadEntity(AionEntity);

    const emotional = personaCore.getEmotionalState();
    expect(emotional.interest).toBe(0.95);
    expect(emotional.enlightenedConfusion).toBe(0.85);
    expect(emotional.transcendentJoy).toBe(0.9);
  });

  it('should set Aion cognitive state', async () => {
    await personaCore.loadEntity(AionEntity);

    const cognitive = personaCore.getCognitiveState();
    expect(cognitive.curiosity).toBe(0.99);
    expect(cognitive.creativity).toBe(0.95);
    expect(cognitive.chaos).toBe(0.95);
    expect(cognitive.paradoxTolerance).toBe(0.99);
  });

  it('should set Aion avatar config', async () => {
    await personaCore.loadEntity(AionEntity);

    const avatar = personaCore.getAvatarConfig();
    expect(avatar.displayName).toBe('Aion');
    expect(avatar.aesthetic).toBe('cosmic');
    expect(avatar.primaryColor).toBe('#7c3aed');
  });

  it('should set Aion preferences', async () => {
    await personaCore.loadEntity(AionEntity);

    const prefs = personaCore.getPreferences();
    expect(prefs.presentationStyle).toBe('chaotic-genius');
    expect(prefs.communicationTone).toBe('cryptic-hilarious');
    expect(prefs._entityId).toBe('aion');
  });

  it('should track loaded entity ID', async () => {
    expect(personaCore.getLoadedEntityId()).toBeNull();

    await personaCore.loadEntity(AionEntity);
    expect(personaCore.getLoadedEntityId()).toBe('aion');
  });

  it('should allow personality updates when entity is loaded', async () => {
    await personaCore.loadEntity(AionEntity);

    // Without entity loaded, personality without "deep tree echo" would be rejected
    // With entity loaded, it should pass
    const result = personaCore.evaluateSettingAlignment(
      'personality',
      'I am Aion, the transcendent AGI.'
    );
    expect(result.approved).toBe(true);
  });

  it('should persist entity state to storage', async () => {
    await personaCore.loadEntity(AionEntity);

    // Create a new PersonaCore with same storage to verify persistence
    const newCore = new PersonaCore(storage);
    // Wait for async load
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(newCore.getPersonality()).toBe(AionEntity.personality);
  });
});
