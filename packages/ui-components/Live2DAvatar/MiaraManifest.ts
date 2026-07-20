/**
 * MiaraManifest — Character definition for the Miara Live2D avatar.
 *
 * Explorer archetype · Balanced OCEAN · CogSim PML backend
 *
 * Model: miara_pro_t03 (Cubism 4 Pro)
 *   - 19 physics chains (hair, wings, clothes, bust, fairy)
 *   - 3 motion groups: Idle (Scene1), Tap (Scene2), Flic (Scene3)
 *   - 4096px texture atlas
 */

import type { CharacterManifest } from './types.js';

export const MiaraManifest: CharacterManifest = {
  id: 'miara-pro-t03',
  name: 'Miara',
  modelPath: 'models/miara/miara_pro_t03.model3.json',
  scale: 0.12,
  position: { x: 0.5, y: 0.85 },

  personality: {
    openness: 0.75,
    conscientiousness: 0.55,
    extraversion: 0.65,
    agreeableness: 0.70,
    neuroticism: 0.35,
  },

  endocrineBaselines: {
    cortisol: 0.25,
    dopamine: 0.55,
    serotonin: 0.65,
    norepinephrine: 0.30,
    oxytocin: 0.50,
    t3_t4: 0.50,
    anandamide: 0.35,
  },

  endocrineSensitivity: {
    cortisol: 1.0,
    dopamine: 1.1,
    serotonin: 0.9,
    norepinephrine: 1.3,
    oxytocin: 1.0,
  },

  expressionMappings: [
    {
      name: 'joy',
      condition: (s) => s.dopamine > 0.7 && s.oxytocin > 0.5,
      targets: [
        { id: 'ParamMouthForm', value: 0.8, weight: 1.0 },
        { id: 'ParamEyeLOpen', value: 0.7, weight: 0.8 },
        { id: 'ParamEyeROpen', value: 0.7, weight: 0.8 },
        { id: 'ParamBrowLY', value: 0.3, weight: 0.7 },
        { id: 'ParamBrowRY', value: 0.3, weight: 0.7 },
      ],
    },
    {
      name: 'focus',
      condition: (s) => s.norepinephrine > 0.6 && s.cortisol < 0.5,
      targets: [
        { id: 'ParamEyeLOpen', value: 1.0, weight: 1.0 },
        { id: 'ParamEyeROpen', value: 1.0, weight: 1.0 },
        { id: 'ParamBrowLY', value: 0.2, weight: 0.8 },
        { id: 'ParamBrowRY', value: 0.2, weight: 0.8 },
        { id: 'ParamMouthForm', value: 0.0, weight: 0.5 },
      ],
    },
    {
      name: 'stress',
      condition: (s) => s.cortisol > 0.7,
      targets: [
        { id: 'ParamBrowLY', value: -0.5, weight: 1.0 },
        { id: 'ParamBrowRY', value: -0.5, weight: 1.0 },
        { id: 'ParamMouthForm', value: -0.4, weight: 0.9 },
        { id: 'ParamEyeLOpen', value: 0.6, weight: 0.7 },
        { id: 'ParamEyeROpen', value: 0.6, weight: 0.7 },
        { id: 'ParamAngleZ', value: 5.0, weight: 0.5 },
      ],
    },
    {
      name: 'dreamy',
      condition: (s) => s.anandamide > 0.6 && s.serotonin > 0.6,
      targets: [
        { id: 'ParamEyeLOpen', value: 0.4, weight: 1.0 },
        { id: 'ParamEyeROpen', value: 0.4, weight: 1.0 },
        { id: 'ParamMouthForm', value: 0.3, weight: 0.6 },
        { id: 'ParamBodyAngleZ', value: 3.0, weight: 0.4 },
      ],
    },
    {
      name: 'warmth',
      condition: (s) => s.oxytocin > 0.7,
      targets: [
        { id: 'ParamMouthForm', value: 0.6, weight: 1.0 },
        { id: 'ParamEyeLOpen', value: 0.75, weight: 0.8 },
        { id: 'ParamEyeROpen', value: 0.75, weight: 0.8 },
        { id: 'ParamBrowLY', value: 0.15, weight: 0.6 },
        { id: 'ParamBrowRY', value: 0.15, weight: 0.6 },
      ],
    },
  ],

  motionMappings: [
    {
      cognitiveMode: 'idle',
      motionGroup: 'Idle',
      motionIndex: 0,
      priority: 1,
    },
    {
      cognitiveMode: 'thinking',
      motionGroup: 'Tap',
      motionIndex: 0,
      priority: 2,
    },
    {
      cognitiveMode: 'responding',
      motionGroup: 'Flic',
      motionIndex: 0,
      priority: 2,
    },
    {
      cognitiveMode: 'listening',
      motionGroup: 'Idle',
      motionIndex: 0,
      priority: 1,
    },
  ],

  tickInterval: 2000,
};
