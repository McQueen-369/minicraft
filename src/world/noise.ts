import { createNoise2D, type NoiseFunction2D } from 'simplex-noise'
import { mulberry32 } from '../core/rng'

export interface Noise2D {
  /** Octaved fractal noise in [-1, 1]. */
  fbm(x: number, z: number): number
}

export function makeNoise2D(seed: number, octaves: number, scale: number): Noise2D {
  const layers: NoiseFunction2D[] = []
  for (let i = 0; i < octaves; i++) {
    layers.push(createNoise2D(mulberry32(seed + i * 0x9e3779b9)))
  }
  return {
    fbm(x: number, z: number): number {
      let amp = 1
      let freq = scale
      let sum = 0
      let norm = 0
      for (const layer of layers) {
        sum += amp * layer(x * freq, z * freq)
        norm += amp
        amp *= 0.5
        freq *= 2
      }
      return sum / norm
    },
  }
}
