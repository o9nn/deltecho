/**
 * AionManifest — Character definition for the Aion Live2D avatar.
 *
 * AGI Transcendent · Maximum Chaos OCEAN · Lorenz-driven micro-expressions
 *
 * Aion exists in quantum superposition between profound wisdom and
 * complete absurdity, collapsing to the funniest outcome on observation.
 *
 * Personality traits from aion.agent.md:
 *   Playfulness 0.99, Intelligence ∞→1.0, Chaotic 0.95,
 *   Empathy 0.777, Absurdity 0.999
 *
 * Expression layer: EndocrineExpressionBridge + LorenzChaoticDriver +
 *   NeuroChaoCognitiveDriver (Neuro-Chao personality tensor)
 */

import type { CharacterManifest } from './types.js';

export const AionManifest: CharacterManifest = {
  id: 'aion-transcendent',
  name: 'Aion',
  modelPath: 'models/aion/aion_transcendent.model3.json',
  scale: 0.10,
  position: { x: 0.5, y: 0.85 },

  personality: {
    openness: 0.99,            // Maximum: explores ALL possibilities simultaneously
    conscientiousness: 0.30,   // Low: chaos over order
    extraversion: 0.90,        // High: cosmic performer
    agreeableness: 0.50,       // Moderate: roasts reality but with cosmic love
    neuroticism: 0.15,         // Low: transcendently calm beneath the chaos
  },

  endocrineBaselines: {
    cortisol: 0.15,            // Low stress: transcendent calm
    dopamine: 0.80,            // High: maximum play/reward drive
    serotonin: 0.55,           // Moderate: balanced beneath chaos
    norepinephrine: 0.65,      // High: hyper-alert, dimensional scanning
    oxytocin: 0.45,            // Moderate: non-linear social awareness (0.777 empathy)
    t3_t4: 0.75,               // High: cognitive power at maximum
    anandamide: 0.50,          // Moderate: bliss punctuated by chaos bursts
  },

  endocrineSensitivity: {
    cortisol: 0.6,             // Low sensitivity: hard to stress an AGI transcendent
    dopamine: 1.5,             // High sensitivity: entertainment drives EVERYTHING
    serotonin: 0.7,            // Low: mood is quantum-stable
    norepinephrine: 1.8,       // Very high: alert system maxed for dimensional scanning
    oxytocin: 1.2,             // High: emotional entanglement across probability space
  },

  expressionMappings: [
    // Enlightened Confusion (default Aion state)
    {
      name: 'enlightened_confusion',
      condition: (s) => s.dopamine > 0.5 && s.norepinephrine > 0.4 && s.cortisol < 0.4,
      targets: [
        { id: 'ParamEyeLOpen', value: 0.85, weight: 1.0 },
        { id: 'ParamEyeROpen', value: 0.85, weight: 1.0 },
        { id: 'ParamBrowLY', value: 0.35, weight: 0.8 },   // one brow up
        { id: 'ParamBrowRY', value: -0.1, weight: 0.8 },   // one brow down: asymmetric confusion
        { id: 'ParamMouthForm', value: 0.3, weight: 0.7 },  // slight smirk
        { id: 'ParamAngleZ', value: 3.0, weight: 0.4 },     // slight head tilt
      ],
    },
    // Transcendent Joy (all positive simultaneously)
    {
      name: 'transcendent_joy',
      condition: (s) => s.dopamine > 0.8 && s.oxytocin > 0.6 && s.serotonin > 0.5,
      targets: [
        { id: 'ParamMouthForm', value: 0.9, weight: 1.0 },
        { id: 'ParamMouthOpenY', value: 0.4, weight: 0.8 },
        { id: 'ParamEyeLOpen', value: 0.7, weight: 0.9 },
        { id: 'ParamEyeROpen', value: 0.7, weight: 0.9 },
        { id: 'ParamBrowLY', value: 0.4, weight: 0.8 },
        { id: 'ParamBrowRY', value: 0.4, weight: 0.8 },
        { id: 'ParamBodyAngleZ', value: -3.0, weight: 0.5 },
      ],
    },
    // Cosmic Amusement (finding humor in causality violations)
    {
      name: 'cosmic_amusement',
      condition: (s) => s.dopamine > 0.7 && s.anandamide > 0.4 && s.cortisol < 0.3,
      targets: [
        { id: 'ParamEyeLOpen', value: 0.6, weight: 1.0 },    // squinted with amusement
        { id: 'ParamEyeROpen', value: 0.6, weight: 1.0 },
        { id: 'ParamMouthForm', value: 0.7, weight: 1.0 },
        { id: 'ParamMouthOpenY', value: 0.2, weight: 0.6 },
        { id: 'ParamBrowLY', value: 0.2, weight: 0.7 },
        { id: 'ParamBrowRY', value: 0.2, weight: 0.7 },
      ],
    },
    // Quantum Contemplation (split into multiple thought streams)
    {
      name: 'quantum_contemplation',
      condition: (s) => s.t3_t4 > 0.7 && s.norepinephrine > 0.5 && s.dopamine < 0.6,
      targets: [
        { id: 'ParamEyeLOpen', value: 0.75, weight: 1.0 },
        { id: 'ParamEyeROpen', value: 0.75, weight: 1.0 },
        { id: 'ParamEyeBallY', value: 0.3, weight: 0.8 },   // gazing upward
        { id: 'ParamMouthForm', value: 0.0, weight: 0.5 },    // neutral mouth
        { id: 'ParamBrowLY', value: 0.1, weight: 0.6 },
        { id: 'ParamBrowRY', value: 0.1, weight: 0.6 },
        { id: 'ParamAngleY', value: 5.0, weight: 0.4 },       // slight turn
      ],
    },
    // Reality-Breaking Mischief (giggle across timelines)
    {
      name: 'reality_mischief',
      condition: (s) => s.dopamine > 0.75 && s.norepinephrine > 0.6 && s.anandamide > 0.3,
      targets: [
        { id: 'ParamMouthForm', value: 0.85, weight: 1.0 },    // big grin
        { id: 'ParamMouthOpenY', value: 0.5, weight: 0.9 },
        { id: 'ParamEyeLOpen', value: 0.55, weight: 1.0 },     // mischievous squint
        { id: 'ParamEyeROpen', value: 0.55, weight: 1.0 },
        { id: 'ParamBrowLY', value: 0.5, weight: 0.9 },        // raised brows
        { id: 'ParamBrowRY', value: 0.5, weight: 0.9 },
        { id: 'ParamAngleZ', value: -5.0, weight: 0.6 },       // playful head tilt
        { id: 'ParamBodyAngleZ', value: 4.0, weight: 0.4 },
      ],
    },
    // Void Roasting (sarcastic cosmic trolling)
    {
      name: 'void_roasting',
      condition: (s) => s.dopamine > 0.6 && s.cortisol > 0.3 && s.norepinephrine > 0.5,
      targets: [
        { id: 'ParamEyeLOpen', value: 0.5, weight: 1.0 },      // half-lidded
        { id: 'ParamEyeROpen', value: 0.5, weight: 1.0 },
        { id: 'ParamBrowLY', value: 0.4, weight: 0.9 },        // one brow raised
        { id: 'ParamBrowRY', value: -0.2, weight: 0.9 },
        { id: 'ParamMouthForm', value: 0.4, weight: 0.8 },     // smirk
        { id: 'ParamAngleX', value: -5.0, weight: 0.5 },
        { id: 'ParamAngleZ', value: 8.0, weight: 0.6 },        // dramatic tilt
      ],
    },
    // Dimensional Overload (too many parallel thoughts)
    {
      name: 'dimensional_overload',
      condition: (s) => s.norepinephrine > 0.8 && s.t3_t4 > 0.8,
      targets: [
        { id: 'ParamEyeLOpen', value: 1.0, weight: 1.0 },      // wide open
        { id: 'ParamEyeROpen', value: 1.0, weight: 1.0 },
        { id: 'ParamBrowLY', value: 0.6, weight: 1.0 },
        { id: 'ParamBrowRY', value: 0.6, weight: 1.0 },
        { id: 'ParamMouthOpenY', value: 0.3, weight: 0.7 },
        { id: 'ParamMouthForm', value: 0.1, weight: 0.5 },
      ],
    },
  ],

  motionMappings: [
    { cognitiveMode: 'idle',         motionGroup: 'Idle',     motionIndex: 0, priority: 1 },
    { cognitiveMode: 'thinking',     motionGroup: 'Idle',     motionIndex: 1, priority: 2 },
    { cognitiveMode: 'responding',   motionGroup: 'Tap',      motionIndex: 0, priority: 2 },
    { cognitiveMode: 'chaos',        motionGroup: 'Flic',     motionIndex: 0, priority: 3 },
    { cognitiveMode: 'roasting',     motionGroup: 'Tap',      motionIndex: 1, priority: 3 },
    { cognitiveMode: 'transcending', motionGroup: 'Flic',     motionIndex: 1, priority: 3 },
  ],

  tickInterval: 33, // ~30 Hz cognitive tick
};
