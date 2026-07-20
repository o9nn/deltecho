/**
 * LorenzChaoticDriver
 *
 * Lorenz attractor system for generating unpredictable but bounded
 * micro-expressions on a Live2D avatar. Uses RK4 integration.
 *
 * Based on chaotic-dynamics.md reference specification.
 *
 * Equations:
 *   dx/dt = sigma * (y - x)
 *   dy/dt = x * (rho - z) - y
 *   dz/dt = x * y - beta * z
 *
 * The attractor output is mapped to micro-expression offsets that
 * are added on top of the endocrine-driven parameters.
 */

import type { CubismParameterTarget } from './types.js';

export interface LorenzConfig {
  /** Rate of chaotic divergence (default: 10.0) */
  sigma: number;
  /** System complexity (default: 28.0) */
  rho: number;
  /** Dissipation rate (default: 8/3) */
  beta: number;
  /** Integration timestep (default: 0.01) */
  dt: number;
  /** Amplitude scaling to morph targets (default: 0.15) */
  chaosIntensity: number;
}

interface LorenzState {
  x: number;
  y: number;
  z: number;
}

const DEFAULT_CONFIG: LorenzConfig = {
  sigma: 10.0,
  rho: 28.0,
  beta: 8 / 3,
  dt: 0.01,
  chaosIntensity: 0.15,
};

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export class LorenzChaoticDriver {
  private config: LorenzConfig;
  private state: LorenzState;
  private prevState: LorenzState;
  private lyapunovAccum: number = 0;
  private lyapunovCount: number = 0;
  private lyapunovExponent: number = 0;
  private accumDt: number = 0;

  constructor(config?: Partial<LorenzConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    // Start near the attractor (avoid transient)
    this.state = { x: 1.0, y: 1.0, z: 1.0 };
    this.prevState = { ...this.state };
  }

  /** RK4 derivatives for the Lorenz system. */
  private derivatives(s: LorenzState): LorenzState {
    const { sigma, rho, beta } = this.config;
    return {
      x: sigma * (s.y - s.x),
      y: s.x * (rho - s.z) - s.y,
      z: s.x * s.y - beta * s.z,
    };
  }

  /** Single RK4 integration step. */
  private rk4Step(): void {
    const { dt } = this.config;
    const s = this.state;

    const k1 = this.derivatives(s);
    const s2: LorenzState = {
      x: s.x + k1.x * dt * 0.5,
      y: s.y + k1.y * dt * 0.5,
      z: s.z + k1.z * dt * 0.5,
    };
    const k2 = this.derivatives(s2);
    const s3: LorenzState = {
      x: s.x + k2.x * dt * 0.5,
      y: s.y + k2.y * dt * 0.5,
      z: s.z + k2.z * dt * 0.5,
    };
    const k3 = this.derivatives(s3);
    const s4: LorenzState = {
      x: s.x + k3.x * dt,
      y: s.y + k3.y * dt,
      z: s.z + k3.z * dt,
    };
    const k4 = this.derivatives(s4);

    this.prevState = { ...this.state };
    this.state = {
      x: s.x + (dt / 6) * (k1.x + 2 * k2.x + 2 * k3.x + k4.x),
      y: s.y + (dt / 6) * (k1.y + 2 * k2.y + 2 * k3.y + k4.y),
      z: s.z + (dt / 6) * (k1.z + 2 * k2.z + 2 * k3.z + k4.z),
    };
  }

  /** Update Lyapunov exponent estimate from trajectory divergence. */
  private updateLyapunov(): void {
    const dx = this.state.x - this.prevState.x;
    const dy = this.state.y - this.prevState.y;
    const dz = this.state.z - this.prevState.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist > 1e-10) {
      this.lyapunovAccum += Math.log(dist);
      this.lyapunovCount++;
      if (this.lyapunovCount > 0) {
        this.lyapunovExponent = this.lyapunovAccum / this.lyapunovCount;
      }
    }
  }

  /**
   * Advance the attractor by real elapsed time and return
   * micro-expression Cubism parameter offsets.
   *
   * @param deltaTime  seconds since last frame (typically ~0.016)
   */
  tick(deltaTime: number): CubismParameterTarget[] {
    // Sub-step: advance internal clock by deltaTime using fixed dt steps
    this.accumDt += deltaTime;
    const { dt } = this.config;
    while (this.accumDt >= dt) {
      this.rk4Step();
      this.updateLyapunov();
      this.accumDt -= dt;
    }

    return this.computeMicroExpressions();
  }

  /** Map Lorenz XYZ to Cubism parameter offsets. */
  private computeMicroExpressions(): CubismParameterTarget[] {
    const { chaosIntensity } = this.config;
    // Normalize: Lorenz attractor values are roughly in [-30, 30] range
    const nx = this.state.x / 30;
    const ny = this.state.y / 30;
    const nz = this.state.z / 50; // z has larger range

    return [
      {
        id: 'ParamBrowLY',
        value: nx * chaosIntensity * 0.3,
        weight: 0.3,
      },
      {
        id: 'ParamBrowRY',
        value: nx * chaosIntensity * 0.25,
        weight: 0.3,
      },
      {
        id: 'ParamEyeLOpen',
        value: ny * chaosIntensity * 0.2,
        weight: 0.25,
      },
      {
        id: 'ParamEyeROpen',
        value: ny * chaosIntensity * 0.2,
        weight: 0.25,
      },
      {
        id: 'ParamMouthForm',
        value: nz * chaosIntensity * 0.15,
        weight: 0.2,
      },
      {
        id: 'ParamMouthOpenY',
        value: (nx + ny) * chaosIntensity * 0.1,
        weight: 0.15,
      },
      {
        id: 'ParamAngleZ',
        value: nz * chaosIntensity * 2.0,
        weight: 0.2,
      },
    ];
  }

  /**
   * Current Lyapunov exponent estimate.
   * - Positive → chaotic regime (creative, unpredictable)
   * - Near zero → edge of chaos (balanced, natural)
   * - Negative → periodic (repetitive)
   */
  getLyapunovExponent(): number {
    return this.lyapunovExponent;
  }

  /** Current regime classification. */
  getRegime(): 'chaotic' | 'edge' | 'periodic' {
    if (this.lyapunovExponent > 0.1) return 'chaotic';
    if (this.lyapunovExponent > -0.1) return 'edge';
    return 'periodic';
  }

  /** Dynamically adjust chaos intensity (e.g. from personality arousal). */
  setChaosIntensity(intensity: number): void {
    this.config.chaosIntensity = clamp(intensity, 0, 1);
  }

  /** Reset attractor to initial conditions. */
  reset(): void {
    this.state = { x: 1.0, y: 1.0, z: 1.0 };
    this.prevState = { ...this.state };
    this.lyapunovAccum = 0;
    this.lyapunovCount = 0;
    this.lyapunovExponent = 0;
    this.accumDt = 0;
  }

  /** Raw attractor state (for diagnostics). */
  getState(): Readonly<LorenzState> {
    return this.state;
  }
}
