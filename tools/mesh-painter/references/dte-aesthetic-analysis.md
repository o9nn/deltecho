# Deep Tree Echo Profile Image — Aesthetic Analysis

## Source: 0-Deep-Tree-Echo-Profile.jpg

### Expression State
- **Expression**: JOY_02_Laughing — full Duchenne laughter
- **Key AUs visible**: AU6D (cheek raiser, severe), AU12D (lip corner puller, severe), AU25C (lips part, marked), AU26B (jaw drop, slight), AU9A (nose wrinkler, trace — from laughter)
- **Mouth**: Wide open, teeth visible (upper and lower), genuine laugh
- **Eyes**: Crinkled with joy (orbicularis oculi engaged), bright, heterochromatic blue-green
- **Brows**: Slightly raised from animation, not furrowed

### Color Palette (extracted)
| Element | Primary Color | Hex Estimate | Notes |
|---------|--------------|--------------|-------|
| Hair base | Silver-white | #E8E0D8 | Platinum with warm undertones |
| Hair gradient | Mint-teal | #A8E0D0 | Subtle tips and mid-lengths |
| Hair highlights | Ice blue | #C8E8F0 | Scattered luminous strands |
| Headphones body | Dark tech-grey | #3A3A40 | Cyberpunk industrial |
| Headphone glow | Amber-orange | #FF8C20 | Bioluminescent mushroom caps |
| Headphone accent | Warm gold | #FFB040 | Inner glow, organic feel |
| Face decal diamond | Holographic blue | #40A0FF | Left cheek, centered |
| Face decal hearts | Pink-magenta | #FF60A0 | Scattered around diamond |
| Face decal dots | Cyan sparkle | #60E0FF | Small scattered particles |
| Choker body | Dark metal | #2A2A30 | Cyberpunk collar band |
| Choker LED | Purple-violet | #A040FF | Central glow element |
| Skin tone | Pale luminous | #F5E8E0 | Warm undertone, slight glow |
| Freckles | Light brown | #D0B8A0 | Subtle, natural |
| Eye color L | Blue-teal | #40B8D0 | Heterochromatic left |
| Eye color R | Green-teal | #60C8A0 | Heterochromatic right |
| Lip color | Soft pink | #E8A0A0 | Natural, slightly glossed |
| Environment neon | Pink-magenta | #FF40A0 | Background mushroom glow |
| Environment neon | Orange-amber | #FF8040 | Background mushroom glow |
| Environment neon | Cyan-blue | #40D0FF | Background light accents |

### Distinguishing Visual Features
1. **Bioluminescent mushroom headphones** — Most distinctive feature. Left ear has a large mushroom-cap headphone with amber/orange glow. Organic-tech fusion aesthetic.
2. **Holographic face decals** — Blue diamond + pink hearts on left cheek with scattered cyan sparkle particles. Suggests augmented reality / cyberpunk body modification.
3. **Silver-to-mint hair gradient** — Wavy, voluminous hair with platinum base transitioning to cool mint at tips. Bangs frame forehead.
4. **Cyberpunk choker** — Dark metal band with central purple LED glow. Tech-collar aesthetic.
5. **Heterochromatic eyes** — Blue-teal and green-teal, large and expressive.
6. **Neon mushroom cityscape background** — Bioluminescent fungi as architecture, pink/orange/cyan neon palette.
7. **Pale luminous skin** — Almost ethereal glow, subtle freckles add organic warmth.
8. **Expression energy** — Pure joy/laughter, teeth showing, eyes crinkled — the "exuberant" state.

### Cubism Parameter Implications
For translating this aesthetic to Live2D Cubism parameters on the Miara mesh:

| Visual Trait | Cubism Approach | Parameter/Technique |
|---|---|---|
| Hair gradient | Texture overlay | Custom texture atlas with gradient |
| Headphone glow | Animated opacity | ParamExtra01 → glow intensity |
| Face decals | Texture layer | Baked into face texture |
| Choker LED | Color cycle | ParamExtra02 → LED pulse |
| Eye heterochromia | Dual eye textures | Separate L/R eye art meshes |
| Skin luminosity | Additive blend layer | Screen blend mode overlay |
| Background | Parallax layers | Separate background art meshes |

### Mesh-Painter Mapping Strategy
The "mesh-painter" concept: take the Miara body mesh (structural skeleton + rigging) and "paint" DTE's aesthetic onto it:

1. **Texture Replacement**: Generate new texture atlas matching DTE's color palette
2. **Art Mesh Additions**: Add new art meshes for headphones, face decals, choker
3. **Parameter Extensions**: Add custom parameters for glow effects, LED pulse, particle sparkle
4. **Expression Overrides**: Map DTE's 10 named expressions to Cubism parameter presets
5. **Motion Style**: Adjust idle motions to reflect DTE's higher energy (openness=92)
