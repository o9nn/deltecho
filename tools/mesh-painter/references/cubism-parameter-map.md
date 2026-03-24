# Cubism Parameter Map for Mesh Painter

This reference defines how aesthetic traits and FACS Action Units map to Live2D Cubism parameters.

## Expression Mapping (FACS to Cubism)

| Emotion / Expression | Key AUs | Cubism Parameters | Values |
|----------------------|---------|-------------------|--------|
| Duchenne Smile (Genuine) | AU6 + AU12 | `ParamMouthForm`, `ParamEyeLOpen`, `ParamEyeROpen`, `ParamBrowLY`, `ParamBrowRY` | MouthForm: 0.8-1.0, EyeOpen: 0.6-0.7, BrowY: 0.3 |
| Laughter | AU6 + AU12 + AU25 + AU26 | `ParamMouthForm`, `ParamMouthOpenY`, `ParamEyeLOpen`, `ParamEyeROpen`, `ParamBrowLY`, `ParamBrowRY` | MouthForm: 1.0, MouthOpenY: 0.7-1.0, EyeOpen: 0.5, BrowY: 0.4 |
| Surprise / Awe | AU1 + AU2 + AU5 + AU26 | `ParamEyeLOpen`, `ParamEyeROpen`, `ParamBrowLY`, `ParamBrowRY`, `ParamMouthOpenY` | EyeOpen: 1.0, BrowY: 0.5-0.6, MouthOpenY: 0.4-0.5 |
| Sadness | AU1 + AU4 + AU15 | `ParamMouthForm`, `ParamBrowLY`, `ParamBrowRY`, `ParamEyeLOpen`, `ParamEyeROpen` | MouthForm: -0.4, BrowY: -0.4, EyeOpen: 0.5 |
| Anger | AU4 + AU5 + AU7 + AU23 | `ParamMouthForm`, `ParamBrowLY`, `ParamBrowRY`, `ParamEyeLOpen`, `ParamEyeROpen` | MouthForm: -0.6, BrowY: -0.6, EyeOpen: 0.8 |
| Contemplative / Focused | AU4 + AU7 | `ParamEyeBallY`, `ParamBrowLY`, `ParamBrowRY`, `ParamEyeLOpen`, `ParamEyeROpen` | EyeBallY: 0.3, BrowY: -0.15, EyeOpen: 0.85 |

## Dynamic Effects Mapping

| Aesthetic Trait | Custom Parameter | Range | Description |
|-----------------|------------------|-------|-------------|
| Bioluminescent Glow | `ParamExtra01` | 0.0 - 1.0 | Controls opacity of glow layers (e.g., mushroom headphones) |
| LED Pulse | `ParamExtra02` | 0.0 - 1.0 | Controls color cycle or intensity of LED elements (e.g., choker) |
| Particle Sparkle | `ParamExtra03` | 0.0 - 1.0 | Controls visibility and movement of particle effects (e.g., face decals) |
| Hair Gradient Shift | `ParamExtra04` | 0.0 - 1.0 | Shifts the gradient map on hair textures |

## Base Mesh Parameters (Miara)

| Parameter | Range | Purpose |
|-----------|-------|---------|
| `ParamAngleX` | -30 to 30 | Head yaw |
| `ParamAngleY` | -30 to 30 | Head pitch |
| `ParamAngleZ` | -30 to 30 | Head roll |
| `ParamEyeLOpen` | 0 to 1 | Left eye openness |
| `ParamEyeROpen` | 0 to 1 | Right eye openness |
| `ParamEyeBallX` | -1 to 1 | Eye gaze horizontal |
| `ParamEyeBallY` | -1 to 1 | Eye gaze vertical |
| `ParamBrowLY` | -1 to 1 | Left brow height |
| `ParamBrowRY` | -1 to 1 | Right brow height |
| `ParamMouthOpenY` | 0 to 1 | Mouth open amount |
| `ParamMouthForm` | -1 to 1 | Mouth shape (-1=frown, 1=smile) |
| `ParamBodyAngleX` | -10 to 10 | Body sway |
| `ParamBreath` | 0 to 1 | Breathing animation |
