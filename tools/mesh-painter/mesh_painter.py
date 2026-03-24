#!/usr/bin/env python3
"""
mesh-painter — Differentiable Live2D Texture Atlas Composition Tool for DeltEcho

Composition: /deltecho ( /live2d-miara -> /live2d-dtecho ( "mesh-painter" ) )

Implements the full triadic F/B/K architecture:
  F (Forward Pass)  — Maps aesthetic traits to Cubism parameters and texture modifications
  B (Backward Pass) — Adjusts mapping weights based on visual fidelity feedback
  K (Knowledge State) — Persistent aesthetic analysis and autognosis state

Forward Pass Pipeline:
  1. Texture Replacement (Color Palette) — Extract & apply DTE colors to UV regions
  2. Art Mesh Additions (Accessories)    — Define headphones, decals, choker as art meshes
  3. Parameter Extensions (Dynamic FX)   — ParamExtra01-04 for glow, LED, sparkle, gradient
  4. Expression Overrides (FACS→Cubism)  — 10 named expressions mapped to parameter presets

Usage:
    python mesh_painter.py forward --reference ref.jpg --base base.png --output dtecho/
    python mesh_painter.py analyze --reference ref.jpg
    python mesh_painter.py backward --feedback "colors too warm" --manifest manifest.json
    python mesh_painter.py compose --base base.png --overlay overlay.png --output out.png
    python mesh_painter.py glow --input atlas.png --intensity 0.8 --output glowing.png
    python mesh_painter.py variants --input atlas.png --output-dir variants/
    python mesh_painter.py expressions --output expressions.json
"""

import argparse
import json
import os
import sys
import time
from dataclasses import dataclass, field, asdict
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance, ImageStat

# ═══════════════════════════════════════════════════════════════════════
# Constants
# ═══════════════════════════════════════════════════════════════════════

VERSION = "2.0.0"
ATLAS_2K = (2048, 2048)
ATLAS_4K = (4096, 4096)

# ─── DTE Color Palette (from dte-aesthetic-analysis.md) ──────────────

DTE_PALETTE = {
    "hair_base":          {"hex": "#E8E0D8", "rgba": (232, 224, 216, 255), "desc": "Platinum silver-white"},
    "hair_gradient":      {"hex": "#A8E0D0", "rgba": (168, 224, 208, 255), "desc": "Mint-teal tips"},
    "hair_highlights":    {"hex": "#C8E8F0", "rgba": (200, 232, 240, 255), "desc": "Ice blue luminous strands"},
    "headphone_body":     {"hex": "#3A3A40", "rgba": (58, 58, 64, 255),    "desc": "Dark tech-grey"},
    "headphone_glow":     {"hex": "#FF8C20", "rgba": (255, 140, 32, 255),  "desc": "Amber-orange bioluminescent"},
    "headphone_accent":   {"hex": "#FFB040", "rgba": (255, 176, 64, 255),  "desc": "Warm gold inner glow"},
    "decal_diamond":      {"hex": "#40A0FF", "rgba": (64, 160, 255, 255),  "desc": "Holographic blue"},
    "decal_hearts":       {"hex": "#FF60A0", "rgba": (255, 96, 160, 255),  "desc": "Pink-magenta"},
    "decal_dots":         {"hex": "#60E0FF", "rgba": (96, 224, 255, 255),  "desc": "Cyan sparkle particles"},
    "choker_body":        {"hex": "#2A2A30", "rgba": (42, 42, 48, 255),    "desc": "Dark metal collar"},
    "choker_led":         {"hex": "#A040FF", "rgba": (160, 64, 255, 255),  "desc": "Purple-violet LED"},
    "skin_tone":          {"hex": "#F5E8E0", "rgba": (245, 232, 224, 255), "desc": "Pale luminous warm"},
    "freckles":           {"hex": "#D0B8A0", "rgba": (208, 184, 160, 255), "desc": "Light brown subtle"},
    "eye_left":           {"hex": "#40B8D0", "rgba": (64, 184, 208, 255),  "desc": "Blue-teal heterochromatic"},
    "eye_right":          {"hex": "#60C8A0", "rgba": (96, 200, 160, 255),  "desc": "Green-teal heterochromatic"},
    "lip_color":          {"hex": "#E8A0A0", "rgba": (232, 160, 160, 255), "desc": "Soft pink glossed"},
    "env_neon_pink":      {"hex": "#FF40A0", "rgba": (255, 64, 160, 255),  "desc": "Background mushroom pink"},
    "env_neon_amber":     {"hex": "#FF8040", "rgba": (255, 128, 64, 255),  "desc": "Background mushroom amber"},
    "env_neon_cyan":      {"hex": "#40D0FF", "rgba": (64, 208, 255, 255),  "desc": "Background light accents"},
}

# ─── Cognitive Mode Glow Colors ──────────────────────────────────────

MODE_GLOW_COLORS = {
    "REWARD":      (255, 200, 50, 100),
    "EXPLORATORY": (0, 255, 220, 100),
    "REFLECTIVE":  (140, 100, 255, 80),
    "FOCUSED":     (200, 220, 255, 60),
    "SOCIAL":      (255, 150, 200, 90),
    "STRESSED":    (255, 100, 80, 80),
    "VIGILANT":    (0, 200, 255, 90),
    "RESTING":     (100, 150, 255, 50),
    "THREAT":      (255, 60, 60, 100),
    "MAINTENANCE": (180, 180, 180, 40),
}


# ═══════════════════════════════════════════════════════════════════════
# Atlas Region Definitions
# ═══════════════════════════════════════════════════════════════════════

@dataclass
class AtlasRegion:
    """A named rectangular region in the texture atlas."""
    name: str
    x: int
    y: int
    width: int
    height: int
    description: str = ""
    semantic_role: str = ""  # e.g., "hair", "skin", "accessory", "environment"

    @property
    def box(self) -> Tuple[int, int, int, int]:
        return (self.x, self.y, self.x + self.width, self.y + self.height)


DTE_ATLAS_REGIONS = {
    "hair_main":      AtlasRegion("hair_main", 0, 0, 600, 500,
        "Primary hair strands — silver-white to mint gradient", "hair"),
    "hair_bangs":     AtlasRegion("hair_bangs", 0, 500, 400, 300,
        "Bangs and front hair pieces", "hair"),
    "hair_back":      AtlasRegion("hair_back", 600, 0, 400, 400,
        "Back hair and flowing strands", "hair"),
    "body_torso":     AtlasRegion("body_torso", 512, 1024, 1024, 600,
        "Torso with clothing — black tank top", "clothing"),
    "body_arms":      AtlasRegion("body_arms", 400, 200, 600, 400,
        "Arms and hands", "skin"),
    "body_legs":      AtlasRegion("body_legs", 0, 600, 500, 400,
        "Legs and feet", "skin"),
    "mushroom_env":   AtlasRegion("mushroom_env", 1024, 0, 1024, 1024,
        "Bioluminescent mushroom environment", "environment"),
    "shoulder_pads":  AtlasRegion("shoulder_pads", 512, 1024, 1024, 512,
        "Amber neural-tree shoulder pads", "accessory"),
    "choker":         AtlasRegion("choker", 768, 1024, 512, 200,
        "Purple LED cyberpunk choker", "accessory"),
    "face_decals":    AtlasRegion("face_decals", 1400, 1600, 648, 448,
        "Holographic hearts, diamonds, hexagons", "accessory"),
    "decorations":    AtlasRegion("decorations", 0, 1600, 600, 448,
        "Small decorative elements and accessories", "accessory"),
}


# ═══════════════════════════════════════════════════════════════════════
# K — Knowledge State (Autognosis)
# ═══════════════════════════════════════════════════════════════════════

@dataclass
class KnowledgeState:
    """Persistent knowledge state for the mesh-painter skill."""
    name: str = "mesh-painter"
    topology: str = "Transform"
    version: int = 2
    loss_history: List[Dict[str, Any]] = field(default_factory=list)
    color_corrections: Dict[str, float] = field(default_factory=dict)
    deformer_weights: Dict[str, float] = field(default_factory=dict)
    expression_curve_adjustments: Dict[str, float] = field(default_factory=dict)
    last_forward_pass: Optional[str] = None
    last_backward_pass: Optional[str] = None

    @classmethod
    def load(cls, path: str) -> "KnowledgeState":
        if os.path.exists(path):
            with open(path) as f:
                data = json.load(f)
            return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})
        return cls()

    def save(self, path: str):
        os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
        with open(path, "w") as f:
            json.dump(asdict(self), f, indent=2)
        print(f"[K] Knowledge state saved: {path}")


# ═══════════════════════════════════════════════════════════════════════
# F.1 — Texture Replacement (Color Palette Extraction & Application)
# ═══════════════════════════════════════════════════════════════════════

def analyze_aesthetics(reference_path: str) -> Dict[str, Any]:
    """
    Analyze a reference image to extract aesthetic traits.

    Extracts:
    - Dominant color palette (top N colors by frequency)
    - Luminance distribution (bright/dark ratio)
    - Semantic color mapping to DTE palette entries
    - Region-specific color analysis
    """
    img = Image.open(reference_path).convert("RGBA")
    arr = np.array(img)
    w, h = img.size

    # Quantize to extract dominant colors
    small = img.resize((256, 256), Image.LANCZOS).convert("RGB")
    small_q = small.quantize(colors=24, method=Image.Quantize.MEDIANCUT)
    palette_data = small_q.getpalette()
    colors_rgb = [(palette_data[i], palette_data[i+1], palette_data[i+2])
                  for i in range(0, 24*3, 3)]

    # Count pixels per quantized color
    q_arr = np.array(small_q)
    color_counts = {}
    for i in range(24):
        count = int(np.sum(q_arr == i))
        if count > 0:
            color_counts[i] = {"rgb": colors_rgb[i], "count": count,
                               "pct": round(count / (256*256) * 100, 1)}

    # Sort by frequency
    sorted_colors = sorted(color_counts.values(), key=lambda x: x["count"], reverse=True)

    # Luminance analysis
    rgb = arr[:, :, :3].astype(float)
    alpha = arr[:, :, 3].astype(float) / 255
    luminance = 0.299 * rgb[:, :, 0] + 0.587 * rgb[:, :, 1] + 0.114 * rgb[:, :, 2]
    visible = alpha > 0.5
    mean_lum = float(np.mean(luminance[visible])) if np.any(visible) else 0

    # Match extracted colors to DTE palette
    palette_matches = {}
    for name, entry in DTE_PALETTE.items():
        target = np.array(entry["rgba"][:3])
        best_dist = float("inf")
        best_color = None
        for sc in sorted_colors[:12]:
            dist = float(np.linalg.norm(np.array(sc["rgb"]) - target))
            if dist < best_dist:
                best_dist = dist
                best_color = sc["rgb"]
        palette_matches[name] = {
            "target_hex": entry["hex"],
            "closest_extracted": best_color,
            "distance": round(best_dist, 1),
            "match_quality": "good" if best_dist < 60 else "fair" if best_dist < 120 else "poor",
        }

    analysis = {
        "source": reference_path,
        "dimensions": f"{w}x{h}",
        "dominant_colors": sorted_colors[:12],
        "mean_luminance": round(mean_lum, 1),
        "palette_matches": palette_matches,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
    }

    return analysis


def apply_palette_to_atlas(atlas_path: str, output_path: str,
                           palette_matches: Dict, knowledge: KnowledgeState) -> Image.Image:
    """
    Apply the DTE color palette to atlas regions based on semantic roles.

    Uses the knowledge state's color_corrections to adjust mapping weights.
    """
    img = Image.open(atlas_path).convert("RGBA")
    arr = np.array(img).astype(float)

    for region_name, region in DTE_ATLAS_REGIONS.items():
        role = region.semantic_role
        if role == "environment":
            continue  # Environment keeps its original colors

        rx1, ry1, rx2, ry2 = region.box
        rx2, ry2 = min(img.size[0], rx2), min(img.size[1], ry2)
        region_arr = arr[ry1:ry2, rx1:rx2].copy()
        alpha_mask = region_arr[:, :, 3:4] / 255

        # Apply color correction weight from knowledge state
        correction = knowledge.color_corrections.get(region_name, 0.0)

        if role == "hair":
            # Shift toward DTE hair palette
            target = np.array(DTE_PALETTE["hair_base"]["rgba"][:3], dtype=float)
            blend = 0.15 + correction
            region_arr[:, :, :3] = region_arr[:, :, :3] * (1 - blend) + target * blend
        elif role == "skin":
            target = np.array(DTE_PALETTE["skin_tone"]["rgba"][:3], dtype=float)
            blend = 0.08 + correction
            region_arr[:, :, :3] = region_arr[:, :, :3] * (1 - blend) + target * blend

        region_arr[:, :, :3] = np.clip(region_arr[:, :, :3], 0, 255)
        arr[ry1:ry2, rx1:rx2] = region_arr

    result = Image.fromarray(arr.clip(0, 255).astype(np.uint8))
    result.save(output_path, "PNG")
    print(f"[F.1] Palette applied: {output_path}")
    return result


# ═══════════════════════════════════════════════════════════════════════
# F.2 — Art Mesh Additions (Accessory Definitions)
# ═══════════════════════════════════════════════════════════════════════

@dataclass
class ArtMeshDefinition:
    """Definition for a new art mesh to be added to the Live2D model."""
    id: str
    name: str
    parent_deformer: str
    texture_region: str
    z_order: int
    blend_mode: str = "Normal"
    opacity: float = 1.0
    description: str = ""


DTE_ART_MESHES = [
    ArtMeshDefinition(
        id="ArtMesh_Headphone_L",
        name="Headphone Left (Mushroom)",
        parent_deformer="D_HEAD",
        texture_region="mushroom_env",
        z_order=550,
        description="Bioluminescent mushroom-cap headphone, left ear. Amber/orange glow.",
    ),
    ArtMeshDefinition(
        id="ArtMesh_Headphone_Glow",
        name="Headphone Glow Layer",
        parent_deformer="D_HEAD",
        texture_region="mushroom_env",
        z_order=551,
        blend_mode="Additive",
        opacity=0.7,
        description="Additive glow layer for headphone bioluminescence. Controlled by ParamExtra01.",
    ),
    ArtMeshDefinition(
        id="ArtMesh_FaceDecal_Diamond",
        name="Face Decal — Holographic Diamond",
        parent_deformer="D_HEAD",
        texture_region="face_decals",
        z_order=500,
        description="Blue holographic diamond on left cheek.",
    ),
    ArtMeshDefinition(
        id="ArtMesh_FaceDecal_Hearts",
        name="Face Decal — Pink Hearts",
        parent_deformer="D_HEAD",
        texture_region="face_decals",
        z_order=501,
        description="Pink-magenta hearts scattered around diamond.",
    ),
    ArtMeshDefinition(
        id="ArtMesh_FaceDecal_Particles",
        name="Face Decal — Cyan Sparkle Particles",
        parent_deformer="D_HEAD",
        texture_region="face_decals",
        z_order=502,
        blend_mode="Additive",
        opacity=0.6,
        description="Cyan sparkle particles. Controlled by ParamExtra03.",
    ),
    ArtMeshDefinition(
        id="ArtMesh_Choker_Body",
        name="Cyberpunk Choker — Body",
        parent_deformer="D_NECK",
        texture_region="choker",
        z_order=400,
        description="Dark metal collar band.",
    ),
    ArtMeshDefinition(
        id="ArtMesh_Choker_LED",
        name="Cyberpunk Choker — LED",
        parent_deformer="D_NECK",
        texture_region="choker",
        z_order=401,
        blend_mode="Additive",
        opacity=0.8,
        description="Purple-violet LED glow. Controlled by ParamExtra02.",
    ),
    ArtMeshDefinition(
        id="ArtMesh_ShoulderPad_L",
        name="Neural-Tree Shoulder Pad Left",
        parent_deformer="D_BODY",
        texture_region="shoulder_pads",
        z_order=350,
        description="Amber neural-tree shoulder pad, left side.",
    ),
    ArtMeshDefinition(
        id="ArtMesh_ShoulderPad_R",
        name="Neural-Tree Shoulder Pad Right",
        parent_deformer="D_BODY",
        texture_region="shoulder_pads",
        z_order=351,
        description="Amber neural-tree shoulder pad, right side.",
    ),
    ArtMeshDefinition(
        id="ArtMesh_ShoulderPad_Glow",
        name="Shoulder Pad Glow Layer",
        parent_deformer="D_BODY",
        texture_region="shoulder_pads",
        z_order=352,
        blend_mode="Additive",
        opacity=0.5,
        description="Additive glow for shoulder pads. Controlled by ParamExtra01.",
    ),
]


def generate_art_mesh_definitions(output_path: str) -> List[Dict]:
    """Export art mesh definitions as JSON for Live2D model integration."""
    meshes = [asdict(m) for m in DTE_ART_MESHES]
    with open(output_path, "w") as f:
        json.dump({"version": VERSION, "art_meshes": meshes}, f, indent=2)
    print(f"[F.2] Art mesh definitions: {output_path} ({len(meshes)} meshes)")
    return meshes


# ═══════════════════════════════════════════════════════════════════════
# F.3 — Parameter Extensions (Dynamic Effects)
# ═══════════════════════════════════════════════════════════════════════

@dataclass
class CubismParameterExtension:
    """Custom Cubism parameter for dynamic effects."""
    id: str
    name: str
    min_value: float
    max_value: float
    default_value: float
    description: str
    controlled_meshes: List[str] = field(default_factory=list)
    endocrine_driver: str = ""


DTE_PARAM_EXTENSIONS = [
    CubismParameterExtension(
        id="ParamExtra01",
        name="Glow Intensity",
        min_value=0.0, max_value=1.0, default_value=0.3,
        description="Controls opacity of bioluminescent glow layers (headphones, shoulder pads)",
        controlled_meshes=["ArtMesh_Headphone_Glow", "ArtMesh_ShoulderPad_Glow"],
        endocrine_driver="dopamine_tonic",
    ),
    CubismParameterExtension(
        id="ParamExtra02",
        name="LED Pulse",
        min_value=0.0, max_value=1.0, default_value=0.5,
        description="Controls choker LED intensity and color cycle",
        controlled_meshes=["ArtMesh_Choker_LED"],
        endocrine_driver="norepinephrine",
    ),
    CubismParameterExtension(
        id="ParamExtra03",
        name="Particle Sparkle",
        min_value=0.0, max_value=1.0, default_value=0.4,
        description="Controls visibility and movement of face decal sparkle particles",
        controlled_meshes=["ArtMesh_FaceDecal_Particles"],
        endocrine_driver="serotonin",
    ),
    CubismParameterExtension(
        id="ParamExtra04",
        name="Hair Gradient Shift",
        min_value=0.0, max_value=1.0, default_value=0.0,
        description="Shifts the gradient map on hair textures (silver → mint intensity)",
        controlled_meshes=[],
        endocrine_driver="anandamide",
    ),
]


def generate_parameter_extensions(output_path: str) -> List[Dict]:
    """Export custom parameter definitions as JSON."""
    params = [asdict(p) for p in DTE_PARAM_EXTENSIONS]
    with open(output_path, "w") as f:
        json.dump({"version": VERSION, "parameters": params}, f, indent=2)
    print(f"[F.3] Parameter extensions: {output_path} ({len(params)} params)")
    return params


# ═══════════════════════════════════════════════════════════════════════
# F.4 — Expression Overrides (FACS → Cubism Presets)
# ═══════════════════════════════════════════════════════════════════════

@dataclass
class ExpressionPreset:
    """A named expression preset mapping FACS AUs to Cubism parameters."""
    name: str
    emotion: str
    key_aus: str
    cognitive_mode: str
    primary_hormones: str
    cubism_params: Dict[str, float]
    extra_params: Dict[str, float] = field(default_factory=dict)


DTE_EXPRESSION_PRESETS = [
    ExpressionPreset(
        name="JOY_01_BroadSmile",
        emotion="Duchenne happiness",
        key_aus="AU6D+12D+25C",
        cognitive_mode="REWARD",
        primary_hormones="DA(t)↑ 5-HT↑",
        cubism_params={
            "ParamMouthForm": 1.0,
            "ParamMouthOpenY": 0.3,
            "ParamEyeLOpen": 0.65,
            "ParamEyeROpen": 0.65,
            "ParamBrowLY": 0.3,
            "ParamBrowRY": 0.3,
        },
        extra_params={"ParamExtra01": 0.7, "ParamExtra03": 0.6},
    ),
    ExpressionPreset(
        name="JOY_02_Laughing",
        emotion="Active laughter",
        key_aus="AU6D+12E+26C+9B",
        cognitive_mode="REWARD",
        primary_hormones="DA(p)↑↑ OXT↑",
        cubism_params={
            "ParamMouthForm": 1.0,
            "ParamMouthOpenY": 0.85,
            "ParamEyeLOpen": 0.5,
            "ParamEyeROpen": 0.5,
            "ParamBrowLY": 0.4,
            "ParamBrowRY": 0.4,
            "ParamBodyAngleX": 2.0,
        },
        extra_params={"ParamExtra01": 0.9, "ParamExtra02": 0.7, "ParamExtra03": 0.8},
    ),
    ExpressionPreset(
        name="JOY_03_GentleSmile",
        emotion="Warm contentment",
        key_aus="AU6C+12C+14A",
        cognitive_mode="SOCIAL",
        primary_hormones="DA(t)↑ OXT↑",
        cubism_params={
            "ParamMouthForm": 0.6,
            "ParamMouthOpenY": 0.0,
            "ParamEyeLOpen": 0.7,
            "ParamEyeROpen": 0.7,
            "ParamBrowLY": 0.15,
            "ParamBrowRY": 0.15,
        },
        extra_params={"ParamExtra01": 0.4, "ParamExtra03": 0.5},
    ),
    ExpressionPreset(
        name="JOY_05_Blissful",
        emotion="Serene bliss",
        key_aus="AU6D+12C+43D",
        cognitive_mode="RESTING",
        primary_hormones="5-HT↑↑ AEA↑",
        cubism_params={
            "ParamMouthForm": 0.5,
            "ParamMouthOpenY": 0.0,
            "ParamEyeLOpen": 0.3,
            "ParamEyeROpen": 0.3,
            "ParamBrowLY": 0.1,
            "ParamBrowRY": 0.1,
            "ParamEyeBallY": 0.2,
        },
        extra_params={"ParamExtra01": 0.3, "ParamExtra04": 0.6},
    ),
    ExpressionPreset(
        name="PHOTO_Awe",
        emotion="Awe / wonder",
        key_aus="AU1C+2C+5D+26C",
        cognitive_mode="EXPLORATORY",
        primary_hormones="NE↑ DA(p)↑",
        cubism_params={
            "ParamMouthForm": 0.0,
            "ParamMouthOpenY": 0.45,
            "ParamEyeLOpen": 1.0,
            "ParamEyeROpen": 1.0,
            "ParamBrowLY": 0.55,
            "ParamBrowRY": 0.55,
            "ParamEyeBallY": 0.3,
        },
        extra_params={"ParamExtra01": 0.8, "ParamExtra02": 0.6, "ParamExtra03": 0.9},
    ),
    ExpressionPreset(
        name="PHOTO_ExuberantLaugh",
        emotion="Delighted surprise",
        key_aus="AU6D+12D+1B+2B+5B",
        cognitive_mode="REWARD",
        primary_hormones="DA(t+p)↑ NE↑",
        cubism_params={
            "ParamMouthForm": 1.0,
            "ParamMouthOpenY": 0.6,
            "ParamEyeLOpen": 0.85,
            "ParamEyeROpen": 0.85,
            "ParamBrowLY": 0.45,
            "ParamBrowRY": 0.45,
            "ParamBodyAngleX": 3.0,
        },
        extra_params={"ParamExtra01": 1.0, "ParamExtra02": 0.8, "ParamExtra03": 1.0},
    ),
    ExpressionPreset(
        name="PHOTO_UpwardGaze",
        emotion="Dreamy contemplation",
        key_aus="AU1B+5B+61+63",
        cognitive_mode="REFLECTIVE",
        primary_hormones="5-HT↑ AEA↑",
        cubism_params={
            "ParamMouthForm": 0.1,
            "ParamMouthOpenY": 0.0,
            "ParamEyeLOpen": 0.75,
            "ParamEyeROpen": 0.75,
            "ParamBrowLY": 0.2,
            "ParamBrowRY": 0.2,
            "ParamEyeBallY": 0.5,
            "ParamEyeBallX": -0.2,
            "ParamAngleY": 8.0,
        },
        extra_params={"ParamExtra01": 0.4, "ParamExtra04": 0.5},
    ),
    ExpressionPreset(
        name="SPEAK_01_OpenVowel",
        emotion="Animated speaking",
        key_aus="AU25C+26B+12C+6B",
        cognitive_mode="SOCIAL",
        primary_hormones="DA(t)↑ T3↑",
        cubism_params={
            "ParamMouthForm": 0.4,
            "ParamMouthOpenY": 0.6,
            "ParamEyeLOpen": 0.8,
            "ParamEyeROpen": 0.8,
            "ParamBrowLY": 0.2,
            "ParamBrowRY": 0.2,
        },
        extra_params={"ParamExtra02": 0.5},
    ),
    ExpressionPreset(
        name="WONDER_02_CuriousGaze",
        emotion="Curious wonder",
        key_aus="AU1B+2B+5C+63",
        cognitive_mode="EXPLORATORY",
        primary_hormones="NE↑ T3↑",
        cubism_params={
            "ParamMouthForm": 0.0,
            "ParamMouthOpenY": 0.15,
            "ParamEyeLOpen": 0.95,
            "ParamEyeROpen": 0.95,
            "ParamBrowLY": 0.4,
            "ParamBrowRY": 0.4,
            "ParamEyeBallY": 0.3,
            "ParamEyeBallX": 0.2,
            "ParamAngleY": 5.0,
        },
        extra_params={"ParamExtra01": 0.6, "ParamExtra02": 0.4, "ParamExtra03": 0.7},
    ),
    ExpressionPreset(
        name="WONDER_03_Contemplative",
        emotion="Deep thought",
        key_aus="AU1B+5B+4A+63+61",
        cognitive_mode="FOCUSED",
        primary_hormones="T3↑↑ 5-HT↑",
        cubism_params={
            "ParamMouthForm": -0.1,
            "ParamMouthOpenY": 0.0,
            "ParamEyeLOpen": 0.85,
            "ParamEyeROpen": 0.85,
            "ParamBrowLY": -0.15,
            "ParamBrowRY": -0.15,
            "ParamEyeBallY": 0.3,
            "ParamEyeBallX": -0.3,
            "ParamAngleZ": -3.0,
        },
        extra_params={"ParamExtra01": 0.5, "ParamExtra04": 0.3},
    ),
]


def generate_expression_presets(output_path: str) -> List[Dict]:
    """Export all 10 DTE expression presets as JSON."""
    presets = [asdict(p) for p in DTE_EXPRESSION_PRESETS]
    with open(output_path, "w") as f:
        json.dump({"version": VERSION, "expressions": presets}, f, indent=2)
    print(f"[F.4] Expression presets: {output_path} ({len(presets)} expressions)")
    return presets


# ═══════════════════════════════════════════════════════════════════════
# B — Backward Pass (Fidelity Correction)
# ═══════════════════════════════════════════════════════════════════════

def backward_pass(feedback: str, manifest_path: str, knowledge_path: str) -> KnowledgeState:
    """
    Apply fidelity correction based on feedback.

    Parses natural language feedback and adjusts the knowledge state:
    - "colors too warm/cool" → adjust color_corrections
    - "accessories detached" → adjust deformer_weights
    - "expression unnatural" → adjust expression_curve_adjustments
    """
    knowledge = KnowledgeState.load(knowledge_path)
    feedback_lower = feedback.lower()

    loss_entry = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "feedback": feedback,
        "adjustments": {},
    }

    # Color corrections
    if "warm" in feedback_lower or "cool" in feedback_lower:
        direction = -0.05 if "warm" in feedback_lower else 0.05
        for region_name, region in DTE_ATLAS_REGIONS.items():
            if region.semantic_role in ("hair", "skin"):
                current = knowledge.color_corrections.get(region_name, 0.0)
                knowledge.color_corrections[region_name] = round(current + direction, 3)
                loss_entry["adjustments"][f"color_{region_name}"] = direction
        print(f"[B] Color correction: {'cooler' if direction > 0 else 'warmer'} by {abs(direction)}")

    # Deformer weights
    if "detach" in feedback_lower or "float" in feedback_lower:
        for mesh in DTE_ART_MESHES:
            if any(kw in feedback_lower for kw in [mesh.name.lower(), mesh.id.lower()]):
                current = knowledge.deformer_weights.get(mesh.id, 1.0)
                knowledge.deformer_weights[mesh.id] = round(current * 1.1, 3)
                loss_entry["adjustments"][f"deformer_{mesh.id}"] = 0.1
        if not loss_entry["adjustments"]:
            # Apply to all accessories
            for mesh in DTE_ART_MESHES:
                current = knowledge.deformer_weights.get(mesh.id, 1.0)
                knowledge.deformer_weights[mesh.id] = round(current * 1.05, 3)
                loss_entry["adjustments"][f"deformer_{mesh.id}"] = 0.05
        print(f"[B] Deformer weights tightened")

    # Expression curve adjustments
    if "unnatural" in feedback_lower or "stiff" in feedback_lower or "expression" in feedback_lower:
        for preset in DTE_EXPRESSION_PRESETS:
            if preset.name.lower() in feedback_lower or "all" in feedback_lower:
                for param, value in preset.cubism_params.items():
                    key = f"{preset.name}_{param}"
                    current = knowledge.expression_curve_adjustments.get(key, 0.0)
                    # Soften extreme values
                    if abs(value) > 0.8:
                        adj = -0.05 * np.sign(value)
                        knowledge.expression_curve_adjustments[key] = round(current + adj, 3)
                        loss_entry["adjustments"][key] = adj
        print(f"[B] Expression curves softened")

    # Glow/intensity feedback
    if "glow" in feedback_lower:
        if "too bright" in feedback_lower or "too much" in feedback_lower:
            for p in DTE_PARAM_EXTENSIONS:
                if "glow" in p.name.lower():
                    key = f"extra_{p.id}"
                    current = knowledge.expression_curve_adjustments.get(key, 0.0)
                    knowledge.expression_curve_adjustments[key] = round(current - 0.1, 3)
                    loss_entry["adjustments"][key] = -0.1
            print(f"[B] Glow intensity reduced")
        elif "too dim" in feedback_lower or "not enough" in feedback_lower:
            for p in DTE_PARAM_EXTENSIONS:
                if "glow" in p.name.lower():
                    key = f"extra_{p.id}"
                    current = knowledge.expression_curve_adjustments.get(key, 0.0)
                    knowledge.expression_curve_adjustments[key] = round(current + 0.1, 3)
                    loss_entry["adjustments"][key] = 0.1
            print(f"[B] Glow intensity increased")

    knowledge.loss_history.append(loss_entry)
    knowledge.last_backward_pass = time.strftime("%Y-%m-%dT%H:%M:%SZ")
    knowledge.save(knowledge_path)

    print(f"[B] Backward pass complete. Loss history: {len(knowledge.loss_history)} entries")
    return knowledge


# ═══════════════════════════════════════════════════════════════════════
# F — Full Forward Pass
# ═══════════════════════════════════════════════════════════════════════

def forward_pass(reference_path: str, atlas_path: str, output_dir: str,
                 knowledge_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Execute the complete forward pass pipeline.

    1. Analyze reference image aesthetics
    2. Apply palette to atlas
    3. Generate art mesh definitions
    4. Generate parameter extensions
    5. Generate expression presets
    6. Apply glow effect
    7. Generate cognitive mode variants
    8. Export character manifest
    """
    os.makedirs(output_dir, exist_ok=True)
    k_path = knowledge_path or os.path.join(output_dir, "autognosis.json")
    knowledge = KnowledgeState.load(k_path)

    print(f"╔══════════════════════════════════════════════════════╗")
    print(f"║  mesh-painter v{VERSION} — Forward Pass              ║")
    print(f"╚══════════════════════════════════════════════════════╝")

    # F.1 — Aesthetic Analysis
    print(f"\n[F.1] Analyzing reference: {reference_path}")
    analysis = analyze_aesthetics(reference_path)
    analysis_path = os.path.join(output_dir, "aesthetic_analysis.json")
    with open(analysis_path, "w") as f:
        json.dump(analysis, f, indent=2)
    print(f"[F.1] Analysis saved: {analysis_path}")

    # F.1b — Apply palette to atlas
    palette_atlas_path = os.path.join(output_dir, "texture_00_palette.png")
    apply_palette_to_atlas(atlas_path, palette_atlas_path, analysis["palette_matches"], knowledge)

    # F.2 — Art Mesh Definitions
    art_mesh_path = os.path.join(output_dir, "art_meshes.json")
    generate_art_mesh_definitions(art_mesh_path)

    # F.3 — Parameter Extensions
    params_path = os.path.join(output_dir, "parameter_extensions.json")
    generate_parameter_extensions(params_path)

    # F.4 — Expression Presets
    expr_path = os.path.join(output_dir, "expression_presets.json")
    generate_expression_presets(expr_path)

    # Apply glow
    glow_path = os.path.join(output_dir, "texture_00_glow.png")
    apply_glow(palette_atlas_path, glow_path, intensity=0.5, radius=12)

    # Generate cognitive mode variants
    variants_dir = os.path.join(output_dir, "variants")
    generate_cognitive_mode_variants(glow_path, variants_dir)

    # 4K upscale
    atlas_4k_path = os.path.join(output_dir, "texture_00_4k.png")
    resize_atlas(glow_path, atlas_4k_path, ATLAS_4K)

    # Export character manifest
    manifest = {
        "version": VERSION,
        "character": "dtecho",
        "base_mesh": "miara",
        "composition": "/deltecho ( /live2d-miara -> /live2d-dtecho ( 'mesh-painter' ) )",
        "forward_pass": {
            "aesthetic_analysis": "aesthetic_analysis.json",
            "palette_atlas": "texture_00_palette.png",
            "glow_atlas": "texture_00_glow.png",
            "atlas_4k": "texture_00_4k.png",
            "art_meshes": "art_meshes.json",
            "parameter_extensions": "parameter_extensions.json",
            "expression_presets": "expression_presets.json",
            "variants_dir": "variants/",
        },
        "palette": {name: entry["hex"] for name, entry in DTE_PALETTE.items()},
        "regions": {name: asdict(region) for name, region in DTE_ATLAS_REGIONS.items()},
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    manifest_path = os.path.join(output_dir, "dtecho_manifest.json")
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)

    # Update knowledge state
    knowledge.last_forward_pass = time.strftime("%Y-%m-%dT%H:%M:%SZ")
    knowledge.version = 2
    knowledge.save(k_path)

    print(f"\n[F] Forward pass complete → {output_dir}")
    print(f"    Manifest: {manifest_path}")
    print(f"    Knowledge: {k_path}")

    return manifest


# ═══════════════════════════════════════════════════════════════════════
# Image Operations (retained from v1)
# ═══════════════════════════════════════════════════════════════════════

def compose_atlases(base_path: str, overlay_path: str, output_path: str,
                    blend_mode: str = "alpha", opacity: float = 1.0) -> Image.Image:
    """Compose a base atlas with an overlay atlas."""
    base = Image.open(base_path).convert("RGBA")
    overlay = Image.open(overlay_path).convert("RGBA")
    if overlay.size != base.size:
        overlay = overlay.resize(base.size, Image.LANCZOS)
    if opacity < 1.0:
        r, g, b, a = overlay.split()
        a = a.point(lambda x: int(x * opacity))
        overlay = Image.merge("RGBA", (r, g, b, a))

    if blend_mode == "alpha":
        result = Image.alpha_composite(base, overlay)
    elif blend_mode == "screen":
        base_rgb = np.array(base.convert("RGB")).astype(float) / 255
        over_rgb = np.array(overlay.convert("RGB")).astype(float) / 255
        over_a = np.array(overlay.split()[3]).astype(float) / 255
        screened = 1 - (1 - base_rgb) * (1 - over_rgb)
        blended = base_rgb * (1 - over_a[..., None]) + screened * over_a[..., None]
        result_rgb = (blended * 255).clip(0, 255).astype(np.uint8)
        result = Image.fromarray(result_rgb, "RGB").convert("RGBA")
        result.putalpha(base.split()[3])
    elif blend_mode == "add":
        base_arr = np.array(base).astype(np.int32)
        over_arr = np.array(overlay).astype(np.int32)
        over_a = over_arr[:, :, 3:4].astype(float) / 255
        added = base_arr.copy()
        added[:, :, :3] = np.clip(
            base_arr[:, :, :3] + (over_arr[:, :, :3] * over_a).astype(np.int32), 0, 255)
        result = Image.fromarray(added.astype(np.uint8))
    else:
        result = Image.alpha_composite(base, overlay)

    result.save(output_path, "PNG")
    print(f"Composed atlas: {output_path} ({result.size[0]}x{result.size[1]})")
    return result


def apply_glow(input_path: str, output_path: str, intensity: float = 0.6,
               glow_color: Optional[Tuple[int, int, int, int]] = None,
               radius: int = 15) -> Image.Image:
    """Apply a bioluminescent glow effect to bright regions of the atlas."""
    img = Image.open(input_path).convert("RGBA")
    arr = np.array(img)
    rgb = arr[:, :, :3].astype(float)
    luminance = 0.299 * rgb[:, :, 0] + 0.587 * rgb[:, :, 1] + 0.114 * rgb[:, :, 2]
    alpha = arr[:, :, 3].astype(float) / 255
    threshold = 180
    bright_mask = (luminance > threshold) & (alpha > 0.5)

    glow_layer = np.zeros_like(arr)
    if glow_color:
        glow_layer[bright_mask] = list(glow_color)
    else:
        glow_layer[bright_mask] = arr[bright_mask]

    glow_img = Image.fromarray(glow_layer)
    glow_blurred = glow_img.filter(ImageFilter.GaussianBlur(radius=radius))
    r, g, b, a = glow_blurred.split()
    a = a.point(lambda x: int(x * intensity))
    glow_blurred = Image.merge("RGBA", (r, g, b, a))

    base_arr = np.array(img).astype(np.int32)
    glow_arr = np.array(glow_blurred).astype(np.int32)
    glow_a = glow_arr[:, :, 3:4].astype(float) / 255
    result_arr = base_arr.copy()
    result_arr[:, :, :3] = np.clip(
        base_arr[:, :, :3] + (glow_arr[:, :, :3] * glow_a).astype(np.int32), 0, 255)
    result = Image.fromarray(result_arr.astype(np.uint8))

    result.save(output_path, "PNG")
    print(f"[F] Glow applied: {output_path} (intensity={intensity}, radius={radius})")
    return result


def tint_region(input_path: str, output_path: str, region_name: str,
                color: Tuple[int, int, int, int], blend: float = 0.3) -> Image.Image:
    """Tint a specific atlas region with a color."""
    img = Image.open(input_path).convert("RGBA")
    region = DTE_ATLAS_REGIONS.get(region_name)
    if not region:
        raise ValueError(f"Unknown region: {region_name}. Available: {list(DTE_ATLAS_REGIONS.keys())}")
    crop = img.crop(region.box)
    crop_arr = np.array(crop).astype(float)
    tint = np.full_like(crop_arr, list(color), dtype=float)
    alpha_mask = crop_arr[:, :, 3:4] / 255
    blended = crop_arr.copy()
    blended[:, :, :3] = crop_arr[:, :, :3] * (1 - blend) + tint[:, :, :3] * blend
    blended[:, :, :3] *= alpha_mask[:, :, :1]
    tinted_crop = Image.fromarray(blended.clip(0, 255).astype(np.uint8))
    result = img.copy()
    result.paste(tinted_crop, (region.x, region.y), tinted_crop)
    result.save(output_path, "PNG")
    print(f"Tinted region '{region_name}': {output_path}")
    return result


def generate_cognitive_mode_variants(input_path: str, output_dir: str) -> Dict[str, str]:
    """Generate texture atlas variants for each DTE cognitive mode."""
    os.makedirs(output_dir, exist_ok=True)
    variants = {}
    for mode, glow_color in MODE_GLOW_COLORS.items():
        output_path = os.path.join(output_dir, f"texture_00_{mode.lower()}.png")
        apply_glow(input_path, output_path, intensity=glow_color[3] / 255,
                   glow_color=glow_color, radius=20)
        variants[mode] = output_path
    manifest = {
        "version": VERSION,
        "base_atlas": input_path,
        "variants": {mode: os.path.basename(path) for mode, path in variants.items()},
        "mode_glow_colors": {mode: list(color) for mode, color in MODE_GLOW_COLORS.items()},
    }
    manifest_path = os.path.join(output_dir, "variants_manifest.json")
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"Generated {len(variants)} cognitive mode variants in {output_dir}")
    return variants


def analyze_atlas(input_path: str) -> Dict:
    """Analyze a texture atlas and report statistics."""
    img = Image.open(input_path).convert("RGBA")
    arr = np.array(img)
    w, h = img.size
    alpha = arr[:, :, 3]
    total_pixels = w * h
    opaque_pixels = int(np.sum(alpha > 250))
    transparent_pixels = int(np.sum(alpha < 5))
    semi_transparent = total_pixels - opaque_pixels - transparent_pixels
    rgb = arr[:, :, :3]
    luminance = (0.299 * rgb[:, :, 0] + 0.587 * rgb[:, :, 1] + 0.114 * rgb[:, :, 2])
    bright_pixels = int(np.sum((luminance > 180) & (alpha > 128)))
    dark_pixels = int(np.sum((luminance < 50) & (alpha > 128)))
    region_stats = {}
    for name, region in DTE_ATLAS_REGIONS.items():
        rx1, ry1, rx2, ry2 = region.box
        rx1, ry1 = max(0, rx1), max(0, ry1)
        rx2, ry2 = min(w, rx2), min(h, ry2)
        region_alpha = alpha[ry1:ry2, rx1:rx2]
        coverage = float(np.mean(region_alpha > 128)) * 100
        region_stats[name] = {
            "box": [rx1, ry1, rx2, ry2],
            "coverage_pct": round(coverage, 1),
            "semantic_role": region.semantic_role,
            "description": region.description,
        }
    return {
        "file": input_path, "dimensions": f"{w}x{h}", "mode": img.mode,
        "file_size_bytes": os.path.getsize(input_path),
        "alpha_stats": {
            "opaque_pct": round(opaque_pixels / total_pixels * 100, 1),
            "transparent_pct": round(transparent_pixels / total_pixels * 100, 1),
            "semi_transparent_pct": round(semi_transparent / total_pixels * 100, 1),
        },
        "color_stats": {
            "bright_pixels_pct": round(bright_pixels / total_pixels * 100, 1),
            "dark_pixels_pct": round(dark_pixels / total_pixels * 100, 1),
            "mean_luminance": round(float(np.mean(luminance[alpha > 128])), 1) if np.any(alpha > 128) else 0,
        },
        "regions": region_stats,
    }


def resize_atlas(input_path: str, output_path: str, target_size: Tuple[int, int]) -> Image.Image:
    """Resize atlas to target dimensions using LANCZOS."""
    img = Image.open(input_path).convert("RGBA")
    resized = img.resize(target_size, Image.LANCZOS)
    resized.save(output_path, "PNG")
    print(f"Resized: {img.size[0]}x{img.size[1]} → {target_size[0]}x{target_size[1]}: {output_path}")
    return resized


# ═══════════════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description=f"mesh-painter v{VERSION}: Differentiable Live2D Atlas Composition",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    sub = parser.add_subparsers(dest="command")

    # forward — full pipeline
    p_fwd = sub.add_parser("forward", help="Run complete forward pass (F)")
    p_fwd.add_argument("--reference", required=True, help="Reference image path")
    p_fwd.add_argument("--base", required=True, help="Base atlas path")
    p_fwd.add_argument("--output", required=True, help="Output directory")
    p_fwd.add_argument("--knowledge", help="Knowledge state JSON path")

    # analyze — aesthetic analysis only
    p_ana = sub.add_parser("analyze", help="Analyze reference image aesthetics")
    p_ana.add_argument("--reference", help="Reference image path")
    p_ana.add_argument("--input", help="Atlas image path (for atlas analysis)")

    # backward — fidelity correction
    p_bwd = sub.add_parser("backward", help="Run backward pass (B) with feedback")
    p_bwd.add_argument("--feedback", required=True, help="Natural language feedback")
    p_bwd.add_argument("--manifest", required=True, help="Manifest JSON path")
    p_bwd.add_argument("--knowledge", help="Knowledge state path")

    # expressions — export expression presets
    p_expr = sub.add_parser("expressions", help="Export expression presets")
    p_expr.add_argument("--output", required=True, help="Output JSON path")

    # art-meshes — export art mesh definitions
    p_mesh = sub.add_parser("art-meshes", help="Export art mesh definitions")
    p_mesh.add_argument("--output", required=True, help="Output JSON path")

    # parameters — export parameter extensions
    p_param = sub.add_parser("parameters", help="Export parameter extensions")
    p_param.add_argument("--output", required=True, help="Output JSON path")

    # compose
    p_comp = sub.add_parser("compose", help="Compose base + overlay atlases")
    p_comp.add_argument("--base", required=True)
    p_comp.add_argument("--overlay", required=True)
    p_comp.add_argument("--output", required=True)
    p_comp.add_argument("--blend", default="alpha", choices=["alpha", "screen", "multiply", "add"])
    p_comp.add_argument("--opacity", type=float, default=1.0)

    # glow
    p_glow = sub.add_parser("glow", help="Apply bioluminescent glow")
    p_glow.add_argument("--input", required=True)
    p_glow.add_argument("--output", required=True)
    p_glow.add_argument("--intensity", type=float, default=0.6)
    p_glow.add_argument("--radius", type=int, default=15)
    p_glow.add_argument("--color", help="Glow color as R,G,B,A")

    # tint
    p_tint = sub.add_parser("tint", help="Tint a specific atlas region")
    p_tint.add_argument("--input", required=True)
    p_tint.add_argument("--output", required=True)
    p_tint.add_argument("--region", required=True)
    p_tint.add_argument("--color", required=True, help="Color as R,G,B,A")
    p_tint.add_argument("--blend", type=float, default=0.3)

    # variants
    p_var = sub.add_parser("variants", help="Generate cognitive mode variants")
    p_var.add_argument("--input", required=True)
    p_var.add_argument("--output-dir", required=True)

    # resize
    p_rsz = sub.add_parser("resize", help="Resize atlas")
    p_rsz.add_argument("--input", required=True)
    p_rsz.add_argument("--output", required=True)
    p_rsz.add_argument("--size", type=int, default=4096)

    args = parser.parse_args()

    if args.command == "forward":
        forward_pass(args.reference, args.base, args.output, args.knowledge)
    elif args.command == "analyze":
        if args.reference:
            result = analyze_aesthetics(args.reference)
        elif args.input:
            result = analyze_atlas(args.input)
        else:
            print("Error: --reference or --input required")
            sys.exit(1)
        print(json.dumps(result, indent=2))
    elif args.command == "backward":
        k_path = args.knowledge or os.path.join(os.path.dirname(args.manifest), "autognosis.json")
        backward_pass(args.feedback, args.manifest, k_path)
    elif args.command == "expressions":
        generate_expression_presets(args.output)
    elif args.command == "art-meshes":
        generate_art_mesh_definitions(args.output)
    elif args.command == "parameters":
        generate_parameter_extensions(args.output)
    elif args.command == "compose":
        compose_atlases(args.base, args.overlay, args.output, args.blend, args.opacity)
    elif args.command == "glow":
        color = tuple(int(x) for x in args.color.split(",")) if args.color else None
        apply_glow(args.input, args.output, args.intensity, color, args.radius)
    elif args.command == "tint":
        color = tuple(int(x) for x in args.color.split(","))
        tint_region(args.input, args.output, args.region, color, args.blend)
    elif args.command == "variants":
        generate_cognitive_mode_variants(args.input, args.output_dir)
    elif args.command == "resize":
        resize_atlas(args.input, args.output, (args.size, args.size))
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
