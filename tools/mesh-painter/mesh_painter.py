#!/usr/bin/env python3
"""
mesh-painter — Live2D Texture Atlas Composition Tool for DeltEcho

Composition: /deltecho ( /live2d-miara -> /live2d-dtecho ( "mesh-painter" ) )

This tool programmatically composes Live2D texture atlases by:
1. Loading a base Miara body mesh texture atlas
2. Applying DTE cyberpunk-bioluminescent overlay layers
3. Supporting region-based painting, tinting, and glow effects
4. Generating production-ready atlases at 2048px and 4096px
5. Creating expression-variant atlases (e.g., glow intensity per cognitive mode)

The atlas follows Live2D Cubism 4 conventions:
- Single texture_00.png per model
- Power-of-two dimensions (2048x2048 or 4096x4096)
- RGBA with premultiplied alpha
- UV-mapped regions corresponding to mesh parts in .moc3

Usage:
    python mesh_painter.py compose --base base.png --overlay overlay.png --output dtecho.png
    python mesh_painter.py tint --input atlas.png --region shoulders --color "#FFB347" --output tinted.png
    python mesh_painter.py glow --input atlas.png --intensity 0.8 --output glowing.png
    python mesh_painter.py variants --input atlas.png --output-dir variants/
    python mesh_painter.py analyze --input atlas.png
"""

import argparse
import json
import os
import sys
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance, ImageChops


# ─── Constants ───────────────────────────────────────────────────────

VERSION = "1.0.0"

# Standard Live2D atlas sizes
ATLAS_2K = (2048, 2048)
ATLAS_4K = (4096, 4096)

# DTE color palette (cyberpunk-bioluminescent)
DTE_PALETTE = {
    "hair_silver":       (200, 210, 220, 255),
    "hair_mint":         (150, 230, 210, 255),
    "hair_teal":         (100, 200, 200, 255),
    "mushroom_pink":     (255, 120, 200, 255),
    "mushroom_purple":   (180, 100, 255, 255),
    "mushroom_magenta":  (255, 80, 180, 255),
    "neural_amber":      (255, 179, 71, 255),
    "neural_gold":       (255, 200, 50, 255),
    "choker_purple":     (140, 80, 200, 255),
    "choker_led":        (180, 100, 255, 255),
    "decal_blue":        (100, 180, 255, 255),
    "decal_pink":        (255, 150, 200, 255),
    "decal_iridescent":  (200, 180, 255, 255),
    "skin_luminous":     (245, 225, 215, 255),
    "clothing_black":    (30, 30, 35, 255),
    "glow_teal":         (0, 255, 220, 128),
    "glow_amber":        (255, 180, 50, 128),
    "particle_teal":     (0, 255, 200, 180),
}

# DTE cognitive mode → glow color mapping
MODE_GLOW_COLORS = {
    "REWARD":      (255, 200, 50, 100),    # warm gold
    "EXPLORATORY": (0, 255, 220, 100),     # teal
    "REFLECTIVE":  (140, 100, 255, 80),    # soft purple
    "FOCUSED":     (200, 220, 255, 60),    # cool white
    "SOCIAL":      (255, 150, 200, 90),    # warm pink
    "STRESSED":    (255, 100, 80, 80),     # red-orange
    "VIGILANT":    (0, 200, 255, 90),      # cyan
    "RESTING":     (100, 150, 255, 50),    # dim blue
    "THREAT":      (255, 60, 60, 100),     # red
    "MAINTENANCE": (180, 180, 180, 40),    # neutral gray
}


# ─── Atlas Region Definitions ────────────────────────────────────────

@dataclass
class AtlasRegion:
    """A named rectangular region in the texture atlas."""
    name: str
    x: int
    y: int
    width: int
    height: int
    description: str = ""

    @property
    def box(self) -> Tuple[int, int, int, int]:
        return (self.x, self.y, self.x + self.width, self.y + self.height)


# Approximate regions based on the uploaded 2048x2048 atlas
DTE_ATLAS_REGIONS = {
    "hair_main": AtlasRegion("hair_main", 0, 0, 600, 500,
        "Primary hair strands — silver-white to mint gradient"),
    "hair_bangs": AtlasRegion("hair_bangs", 0, 500, 400, 300,
        "Bangs and front hair pieces"),
    "hair_back": AtlasRegion("hair_back", 600, 0, 400, 400,
        "Back hair and flowing strands"),
    "body_torso": AtlasRegion("body_torso", 512, 1024, 1024, 600,
        "Torso with clothing — black tank top"),
    "body_arms": AtlasRegion("body_arms", 400, 200, 600, 400,
        "Arms and hands"),
    "body_legs": AtlasRegion("body_legs", 0, 600, 500, 400,
        "Legs and feet"),
    "mushroom_env": AtlasRegion("mushroom_env", 1024, 0, 1024, 1024,
        "Bioluminescent mushroom environment"),
    "shoulder_pads": AtlasRegion("shoulder_pads", 512, 1024, 1024, 512,
        "Amber neural-tree shoulder pads"),
    "choker": AtlasRegion("choker", 768, 1024, 512, 200,
        "Purple LED cyberpunk choker"),
    "face_decals": AtlasRegion("face_decals", 1400, 1600, 648, 448,
        "Holographic hearts, diamonds, hexagons"),
    "decorations": AtlasRegion("decorations", 0, 1600, 600, 448,
        "Small decorative elements and accessories"),
}


# ─── Core Operations ─────────────────────────────────────────────────

def compose_atlases(base_path: str, overlay_path: str, output_path: str,
                    blend_mode: str = "alpha", opacity: float = 1.0) -> Image.Image:
    """
    Compose a base atlas with an overlay atlas.

    The overlay is alpha-composited onto the base. Black pixels in the overlay
    (with alpha=0) are treated as transparent.

    Args:
        base_path: Path to base texture atlas (Miara body mesh)
        overlay_path: Path to overlay texture atlas (DTE elements)
        output_path: Path for output composed atlas
        blend_mode: Composition mode ("alpha", "screen", "multiply", "add")
        opacity: Global opacity for overlay (0.0-1.0)
    """
    base = Image.open(base_path).convert("RGBA")
    overlay = Image.open(overlay_path).convert("RGBA")

    # Resize overlay to match base if needed
    if overlay.size != base.size:
        overlay = overlay.resize(base.size, Image.LANCZOS)

    # Apply global opacity
    if opacity < 1.0:
        r, g, b, a = overlay.split()
        a = a.point(lambda x: int(x * opacity))
        overlay = Image.merge("RGBA", (r, g, b, a))

    # Blend modes
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
            base_arr[:, :, :3] + (over_arr[:, :, :3] * over_a).astype(np.int32),
            0, 255
        )
        result = Image.fromarray(added.astype(np.uint8), "RGBA")
    elif blend_mode == "multiply":
        base_rgb = np.array(base.convert("RGB")).astype(float) / 255
        over_rgb = np.array(overlay.convert("RGB")).astype(float) / 255
        over_a = np.array(overlay.split()[3]).astype(float) / 255
        multiplied = base_rgb * over_rgb
        blended = base_rgb * (1 - over_a[..., None]) + multiplied * over_a[..., None]
        result_rgb = (blended * 255).clip(0, 255).astype(np.uint8)
        result = Image.fromarray(result_rgb, "RGB").convert("RGBA")
        result.putalpha(base.split()[3])
    else:
        result = Image.alpha_composite(base, overlay)

    result.save(output_path, "PNG")
    print(f"Composed atlas: {output_path} ({result.size[0]}x{result.size[1]})")
    return result


def apply_glow(input_path: str, output_path: str, intensity: float = 0.6,
               glow_color: Optional[Tuple[int, int, int, int]] = None,
               radius: int = 15) -> Image.Image:
    """
    Apply a bioluminescent glow effect to bright regions of the atlas.

    This simulates the DTE cyberpunk aesthetic by adding a soft bloom
    around high-luminance pixels (mushrooms, neural pads, choker LEDs).
    """
    img = Image.open(input_path).convert("RGBA")
    arr = np.array(img)

    # Extract bright regions (luminance > threshold)
    rgb = arr[:, :, :3].astype(float)
    luminance = 0.299 * rgb[:, :, 0] + 0.587 * rgb[:, :, 1] + 0.114 * rgb[:, :, 2]
    alpha = arr[:, :, 3].astype(float) / 255

    # Threshold for "glowing" pixels
    threshold = 180
    bright_mask = (luminance > threshold) & (alpha > 0.5)

    # Create glow layer
    glow_layer = np.zeros_like(arr)
    if glow_color:
        glow_layer[bright_mask] = list(glow_color)
    else:
        # Use the pixel's own color for glow
        glow_layer[bright_mask] = arr[bright_mask]

    glow_img = Image.fromarray(glow_layer, "RGBA")

    # Gaussian blur for soft glow
    glow_blurred = glow_img.filter(ImageFilter.GaussianBlur(radius=radius))

    # Scale glow intensity
    r, g, b, a = glow_blurred.split()
    a = a.point(lambda x: int(x * intensity))
    glow_blurred = Image.merge("RGBA", (r, g, b, a))

    # Composite: base + glow (additive)
    base_arr = np.array(img).astype(np.int32)
    glow_arr = np.array(glow_blurred).astype(np.int32)
    glow_a = glow_arr[:, :, 3:4].astype(float) / 255

    result_arr = base_arr.copy()
    result_arr[:, :, :3] = np.clip(
        base_arr[:, :, :3] + (glow_arr[:, :, :3] * glow_a).astype(np.int32),
        0, 255
    )
    result = Image.fromarray(result_arr.astype(np.uint8), "RGBA")

    result.save(output_path, "PNG")
    print(f"Glow applied: {output_path} (intensity={intensity}, radius={radius})")
    return result


def tint_region(input_path: str, output_path: str, region_name: str,
                color: Tuple[int, int, int, int], blend: float = 0.3) -> Image.Image:
    """
    Tint a specific atlas region with a color.

    Useful for creating expression variants where specific body parts
    change color based on endocrine state (e.g., blushing, pallor).
    """
    img = Image.open(input_path).convert("RGBA")
    region = DTE_ATLAS_REGIONS.get(region_name)
    if not region:
        raise ValueError(f"Unknown region: {region_name}. Available: {list(DTE_ATLAS_REGIONS.keys())}")

    # Extract region
    crop = img.crop(region.box)
    crop_arr = np.array(crop).astype(float)

    # Create tint layer
    tint = np.full_like(crop_arr, list(color), dtype=float)

    # Blend: preserve structure, shift color
    alpha_mask = crop_arr[:, :, 3:4] / 255
    blended = crop_arr.copy()
    blended[:, :, :3] = crop_arr[:, :, :3] * (1 - blend) + tint[:, :, :3] * blend
    blended[:, :, :3] *= alpha_mask[:, :, :1]  # Respect original alpha

    tinted_crop = Image.fromarray(blended.clip(0, 255).astype(np.uint8), "RGBA")
    result = img.copy()
    result.paste(tinted_crop, (region.x, region.y), tinted_crop)

    result.save(output_path, "PNG")
    print(f"Tinted region '{region_name}' with {color}: {output_path}")
    return result


def generate_cognitive_mode_variants(input_path: str, output_dir: str) -> Dict[str, str]:
    """
    Generate texture atlas variants for each DTE cognitive mode.

    Each variant has a different glow color/intensity reflecting the
    dominant endocrine state of that cognitive mode.
    """
    os.makedirs(output_dir, exist_ok=True)
    variants = {}

    for mode, glow_color in MODE_GLOW_COLORS.items():
        output_path = os.path.join(output_dir, f"texture_00_{mode.lower()}.png")
        apply_glow(input_path, output_path, intensity=glow_color[3] / 255,
                   glow_color=glow_color, radius=20)
        variants[mode] = output_path

    # Write manifest
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
    """
    Analyze a texture atlas and report statistics.

    Returns region coverage, color distribution, alpha channel stats,
    and estimated file sizes at different resolutions.
    """
    img = Image.open(input_path).convert("RGBA")
    arr = np.array(img)
    w, h = img.size

    # Alpha channel analysis
    alpha = arr[:, :, 3]
    total_pixels = w * h
    opaque_pixels = int(np.sum(alpha > 250))
    transparent_pixels = int(np.sum(alpha < 5))
    semi_transparent = total_pixels - opaque_pixels - transparent_pixels

    # Color analysis
    rgb = arr[:, :, :3]
    luminance = (0.299 * rgb[:, :, 0] + 0.587 * rgb[:, :, 1] + 0.114 * rgb[:, :, 2])
    bright_pixels = int(np.sum((luminance > 180) & (alpha > 128)))
    dark_pixels = int(np.sum((luminance < 50) & (alpha > 128)))

    # Region analysis
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
            "description": region.description,
        }

    analysis = {
        "file": input_path,
        "dimensions": f"{w}x{h}",
        "mode": img.mode,
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
        "estimated_sizes": {
            "2048x2048": f"~{w * h * 4 // (1024 * 1024)}MB (raw RGBA)",
            "4096x4096": f"~{(4096 * 4096 * 4) // (1024 * 1024)}MB (raw RGBA)",
        },
    }

    return analysis


def resize_atlas(input_path: str, output_path: str, target_size: Tuple[int, int]) -> Image.Image:
    """Resize atlas to target dimensions using LANCZOS for maximum quality."""
    img = Image.open(input_path).convert("RGBA")
    resized = img.resize(target_size, Image.LANCZOS)
    resized.save(output_path, "PNG")
    print(f"Resized: {img.size[0]}x{img.size[1]} → {target_size[0]}x{target_size[1]}: {output_path}")
    return resized


# ─── CLI ─────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="mesh-painter: Live2D Texture Atlas Composition Tool for DeltEcho",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s compose --base miara.png --overlay dte_overlay.png --output dtecho.png
  %(prog)s glow --input dtecho.png --intensity 0.7 --output dtecho_glow.png
  %(prog)s tint --input dtecho.png --region mushroom_env --color 255,120,200,255
  %(prog)s variants --input dtecho.png --output-dir variants/
  %(prog)s analyze --input dtecho.png
  %(prog)s resize --input dtecho.png --output dtecho_4k.png --size 4096
        """,
    )
    subparsers = parser.add_subparsers(dest="command", help="Command to execute")

    # compose
    p_compose = subparsers.add_parser("compose", help="Compose base + overlay atlases")
    p_compose.add_argument("--base", required=True, help="Base atlas path")
    p_compose.add_argument("--overlay", required=True, help="Overlay atlas path")
    p_compose.add_argument("--output", required=True, help="Output path")
    p_compose.add_argument("--blend", default="alpha", choices=["alpha", "screen", "multiply", "add"])
    p_compose.add_argument("--opacity", type=float, default=1.0)

    # glow
    p_glow = subparsers.add_parser("glow", help="Apply bioluminescent glow effect")
    p_glow.add_argument("--input", required=True, help="Input atlas path")
    p_glow.add_argument("--output", required=True, help="Output path")
    p_glow.add_argument("--intensity", type=float, default=0.6)
    p_glow.add_argument("--radius", type=int, default=15)
    p_glow.add_argument("--color", help="Glow color as R,G,B,A")

    # tint
    p_tint = subparsers.add_parser("tint", help="Tint a specific atlas region")
    p_tint.add_argument("--input", required=True, help="Input atlas path")
    p_tint.add_argument("--output", required=True, help="Output path")
    p_tint.add_argument("--region", required=True, help="Region name")
    p_tint.add_argument("--color", required=True, help="Color as R,G,B,A")
    p_tint.add_argument("--blend", type=float, default=0.3)

    # variants
    p_var = subparsers.add_parser("variants", help="Generate cognitive mode variants")
    p_var.add_argument("--input", required=True, help="Input atlas path")
    p_var.add_argument("--output-dir", required=True, help="Output directory")

    # analyze
    p_analyze = subparsers.add_parser("analyze", help="Analyze atlas structure")
    p_analyze.add_argument("--input", required=True, help="Input atlas path")

    # resize
    p_resize = subparsers.add_parser("resize", help="Resize atlas")
    p_resize.add_argument("--input", required=True, help="Input atlas path")
    p_resize.add_argument("--output", required=True, help="Output path")
    p_resize.add_argument("--size", type=int, default=4096, help="Target size (square)")

    args = parser.parse_args()

    if args.command == "compose":
        compose_atlases(args.base, args.overlay, args.output, args.blend, args.opacity)
    elif args.command == "glow":
        color = tuple(int(x) for x in args.color.split(",")) if args.color else None
        apply_glow(args.input, args.output, args.intensity, color, args.radius)
    elif args.command == "tint":
        color = tuple(int(x) for x in args.color.split(","))
        tint_region(args.input, args.output, args.region, color, args.blend)
    elif args.command == "variants":
        generate_cognitive_mode_variants(args.input, args.output_dir)
    elif args.command == "analyze":
        analysis = analyze_atlas(args.input)
        print(json.dumps(analysis, indent=2))
    elif args.command == "resize":
        resize_atlas(args.input, args.output, (args.size, args.size))
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
