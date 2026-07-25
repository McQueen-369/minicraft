import { WATER_LEVEL } from '../constants'
import { BlockId } from '../core/blocks'
import type { Terrain } from './terrain'

export type SetBlock = (x: number, y: number, z: number, id: number) => void

/** Tallest thing terrain generation puts above a column (trunk + canopy). */
const CANOPY_CLEARANCE = 9

/** Packing material: sand at and below the waterline reads as a shoreline. */
function fillAt(y: number): number {
  return y <= WATER_LEVEL ? BlockId.Sand : BlockId.Dirt
}

export interface SiteOptions {
  /** Inclusive footprint bounds in world coordinates. */
  x0: number
  x1: number
  z0: number
  z1: number
  /** Y of the finished walking surface. */
  floorY: number
  /** Block laid on the surface (grass by default). */
  cap?: number
  /** Air is cleared this far above the floor, on top of any terrain overhead. */
  clearance?: number
  /** Optional footprint mask, e.g. to flatten a circle inside the bounds. */
  inside?: (x: number, z: number) => boolean
}

/**
 * Level a build site onto solid ground.
 *
 * Every column is packed with dirt from the natural surface up to the floor,
 * so a site that sits above the terrain it was placed on — a village raised
 * over a pond, a plaza on a slope — rests on a real embankment instead of
 * hanging in the air. Columns where the terrain is already higher are cut
 * down, and the air above is cleared of any trees the generator grew there.
 */
export function flattenSite(terrain: Terrain, set: SetBlock, opts: SiteOptions): void {
  const { x0, x1, z0, z1, floorY } = opts
  const cap = opts.cap ?? BlockId.Grass
  const clearance = opts.clearance ?? 4
  for (let x = x0; x <= x1; x++) {
    for (let z = z0; z <= z1; z++) {
      if (opts.inside && !opts.inside(x, z)) continue
      const h = terrain.heightAt(x, z)
      // Pack the gap between the natural surface and the floor.
      for (let y = h + 1; y < floorY; y++) set(x, y, z, fillAt(y))
      set(x, floorY, z, cap)
      const top = Math.max(h, floorY) + CANOPY_CLEARANCE + clearance
      for (let y = floorY + 1; y <= top; y++) set(x, y, z, BlockId.Air)
    }
  }
}

/**
 * Fill the column under a block down to the natural surface, so a structure
 * placed past the edge of a flattened site still meets the ground.
 */
export function supportColumn(terrain: Terrain, set: SetBlock, x: number, z: number, floorY: number, fill?: number): void {
  const h = terrain.heightAt(x, z)
  for (let y = h + 1; y < floorY; y++) set(x, y, z, fill ?? fillAt(y))
}
