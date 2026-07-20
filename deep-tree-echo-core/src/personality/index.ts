export { PersonaCore, AvatarConfig } from './PersonaCore.js';

// Cognitive entity system
export {
  AionEntity,
  EntityRegistry,
  type CognitiveEntityConfig,
  // Renamed on re-export: persona/index.js also exports a CommunicationStyle,
  // and both barrels are star-exported from src/index.ts
  type CommunicationStyle as EntityCommunicationStyle,
  type MemorySeed,
  type EntityRelationship,
  type CognitivePipelineStep,
} from './entities/index.js';

// Placeholder exports for modules to be fully implemented
// export { AdaptivePersonality } from './AdaptivePersonality.js'
// export { EmotionalIntelligence } from './EmotionalIntelligence.js'
// export { SelfReflection } from './SelfReflection.js'
