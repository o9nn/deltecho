# DTEcho Cubism Editor Plugin

Real-time cognitive avatar controller for Live2D Cubism Editor via the
[External Application Integration API](https://docs.live2d.com/en/cubism-editor-manual/external-application-integration-api/).

## Requirements

- Live2D Cubism Editor 5.0+ (PRO or Indie with External API feature)
- Python 3.9+
- `websockets` package (`pip install websockets`)

## Quick Start

### 1. Standalone Demo (No Editor Required)

```bash
python dtecho_cubism_plugin.py --mode standalone
```

Runs the Echobeats 12-step cognitive cycle in the console, showing how
expressions and cognitive modes change as hormones are injected.

### 2. Connect to Cubism Editor

1. Open `dtecho_pro_t04.cmo3` in Cubism Editor
2. Enable External Application Integration:
   **File** > **Settings** > **External Application Integration** > check **Enable**
3. Run the plugin:

```bash
# Echobeats auto-cycle mode (drives expressions continuously)
python dtecho_cubism_plugin.py --mode cycle

# Expression demo (cycles through all 13 presets)
python dtecho_cubism_plugin.py --mode demo

# Interactive mode (type commands to control expressions)
python dtecho_cubism_plugin.py --mode interactive
```

4. When prompted, click **Allow** in Cubism Editor's approval dialog.

### 3. Interactive Commands

In `--mode interactive`:

| Command | Description |
|---------|-------------|
| `expr JOY_01_BroadSmile` | Set a specific expression |
| `inject dopamine 0.3` | Inject a hormone (+/-) |
| `mode` | Show current cognitive mode and hormone levels |
| `params` | Show current Cubism parameter values |
| `list` | List all available expressions |
| `quit` | Exit |

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  DTEcho Cognitive Controller                        │
│                                                     │
│  Echobeats 12-Step Cycle                            │
│    │                                                │
│    ▼                                                │
│  Virtual Endocrine System (12 hormone channels)     │
│    │                                                │
│    ▼                                                │
│  Cognitive Mode Resolver                            │
│    │  (REWARD, THREAT, SOCIAL, EXPLORATORY,         │
│    │   REST, CREATIVE, FOCUSED)                     │
│    ▼                                                │
│  Expression Preset Selector (13 FACS-aligned)       │
│    │                                                │
│    ▼                                                │
│  Parameter Interpolator (30 FPS smooth lerp)        │
│    │  + micro-expressions + breathing               │
│    ▼                                                │
│  WebSocket Client ──────► Cubism Editor (port 22033)│
│    (SetParameterValues)                             │
└─────────────────────────────────────────────────────┘
```

## Expression Presets

| Preset | Cognitive Mode | Key Parameters |
|--------|---------------|----------------|
| JOY_01_BroadSmile | REWARD | Mouth open, cheeks up, slight tilt |
| JOY_02_Laughing | REWARD+ | Full mouth, squinted eyes, body sway |
| JOY_03_GentleSmile | SOCIAL | Soft smile, relaxed eyes |
| JOY_05_Blissful | REST | Closed eyes, serene smile, head back |
| WONDER_02_CuriousGaze | EXPLORATORY | Wide eyes, head tilt, directed gaze |
| WONDER_03_Contemplative | FOCUSED | Downcast eyes, furrowed brow |
| SADNESS_01_Melancholy | — | Drooped brows, downturned mouth |
| SURPRISE_01_Startled | THREAT | Wide eyes, raised brows, open mouth |
| SPEAK_01_OpenVowel | — | Open mouth, engaged eyes |
| PHOTO_Awe | CREATIVE | Wide eyes, slight smile, upward gaze |
| PHOTO_ExuberantLaugh | — | Full laugh, body rotation |
| PHOTO_UpwardGaze | — | Upward eyes, gentle smile |
| NEUTRAL_Reset | — | All parameters at default |

## Hormone Channels

cortisol, dopamine, serotonin, norepinephrine, oxytocin, melatonin,
adrenaline, endorphin, gaba, glutamate, acetylcholine, anandamide
