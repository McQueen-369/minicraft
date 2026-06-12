import { CHUNK_SIZE, WATER_LEVEL, WORLD_HEIGHT } from '../constants'
import { BlockId } from '../core/blocks'
import { localIndex } from '../core/coords'
import { hash2D } from '../core/rng'
import { makeNoise2D, type Noise2D } from './noise'

const TREE_PROB = 0.008
const CHEST_PROB = 0.0006
const TREE_SEED = 0x7ee5
const CHEST_SEED = 0xc4e5
const MIN_TRUNK = 4
const MAX_TRUNK = 6
/** Max horizontal distance a tree canopy reaches from its trunk. */
export const TREE_RADIUS = 2

export interface TreeInfo {
  trunkHeight: number
}

export class Terrain {
  private readonly hills: Noise2D
  private readonly detail: Noise2D

  constructor(readonly seed: number) {
    this.hills = makeNoise2D(seed, 4, 1 / 160)
    this.detail = makeNoise2D(seed ^ 0x5eed, 2, 1 / 31)
  }

  /** Ground surface height (y of the topmost solid block) for a column. */
  heightAt(x: number, z: number): number {
    const base = 30 + this.hills.fbm(x, z) * 22 + this.detail.fbm(x, z) * 4
    return Math.max(2, Math.min(WORLD_HEIGHT - 16, Math.round(base)))
  }

  /** Deterministic tree at this column, if any. */
  treeAt(x: number, z: number): TreeInfo | null {
    const r = hash2D(this.seed ^ TREE_SEED, x, z)
    if (r >= TREE_PROB) return null
    const h = this.heightAt(x, z)
    if (h <= WATER_LEVEL + 1) return null
    if (this.chestAt(x, z)) return null
    const trunkHeight = MIN_TRUNK + Math.floor((r / TREE_PROB) * (MAX_TRUNK - MIN_TRUNK + 1))
    return { trunkHeight: Math.min(trunkHeight, MAX_TRUNK) }
  }

  /** Deterministic naturally generated chest (sits at heightAt + 1). */
  chestAt(x: number, z: number): boolean {
    if (hash2D(this.seed ^ CHEST_SEED, x, z) >= CHEST_PROB) return false
    return this.heightAt(x, z) > WATER_LEVEL + 1
  }

  /**
   * The generated (pre-edit) block at a world position. Pure and usable for
   * any coordinate; chunk filling uses the faster generateChunkData.
   */
  generateBlock(x: number, y: number, z: number): BlockId {
    if (y < 0 || y >= WORLD_HEIGHT) return BlockId.Air
    const h = this.heightAt(x, z)
    if (y <= h) {
      if (y >= h - 2 && h <= WATER_LEVEL + 1) return BlockId.Sand
      if (y === h) return BlockId.Grass
      if (y >= h - 2) return BlockId.Dirt
      return BlockId.Stone
    }
    if (this.chestAt(x, z) && y === h + 1) return BlockId.Chest
    // Trunk of a tree rooted in this column.
    const own = this.treeAt(x, z)
    if (own && y <= h + own.trunkHeight) return BlockId.Wood
    // Canopy leaves from trees rooted in nearby columns.
    for (let dx = -TREE_RADIUS; dx <= TREE_RADIUS; dx++) {
      for (let dz = -TREE_RADIUS; dz <= TREE_RADIUS; dz++) {
        const tree = this.treeAt(x + dx, z + dz)
        if (!tree) continue
        const top = this.heightAt(x + dx, z + dz) + tree.trunkHeight
        if (leafAt(-dx, y - top, -dz)) return BlockId.Leaves
      }
    }
    return BlockId.Air
  }

  /** Fill a whole chunk's voxel data (no edits applied). */
  generateChunkData(cx: number, cz: number): Uint8Array {
    const data = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * WORLD_HEIGHT)
    const x0 = cx * CHUNK_SIZE
    const z0 = cz * CHUNK_SIZE
    const pad = TREE_RADIUS
    const span = CHUNK_SIZE + pad * 2
    // Heightmap over the padded neighborhood, used for columns and trees.
    const heights = new Int16Array(span * span)
    for (let dz = 0; dz < span; dz++) {
      for (let dx = 0; dx < span; dx++) {
        heights[dx + dz * span] = this.heightAt(x0 + dx - pad, z0 + dz - pad)
      }
    }
    const heightOf = (wx: number, wz: number) => heights[wx - x0 + pad + (wz - z0 + pad) * span]

    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const wx = x0 + lx
        const wz = z0 + lz
        const h = heightOf(wx, wz)
        const sandy = h <= WATER_LEVEL + 1
        for (let y = 0; y <= h; y++) {
          let id: BlockId
          if (y >= h - 2 && sandy) id = BlockId.Sand
          else if (y === h) id = BlockId.Grass
          else if (y >= h - 2) id = BlockId.Dirt
          else id = BlockId.Stone
          data[localIndex(lx, y, lz)] = id
        }
        if (this.chestAt(wx, wz) && h + 1 < WORLD_HEIGHT) {
          data[localIndex(lx, h + 1, lz)] = BlockId.Chest
        }
      }
    }

    // Stamp trees rooted in the padded neighborhood (canopies cross borders).
    for (let dz = 0; dz < span; dz++) {
      for (let dx = 0; dx < span; dx++) {
        const wx = x0 + dx - pad
        const wz = z0 + dz - pad
        const tree = this.treeAt(wx, wz)
        if (!tree) continue
        const ground = heightOf(wx, wz)
        const top = ground + tree.trunkHeight
        for (let ox = -TREE_RADIUS; ox <= TREE_RADIUS; ox++) {
          for (let oz = -TREE_RADIUS; oz <= TREE_RADIUS; oz++) {
            const lx = wx + ox - x0
            const lz = wz + oz - z0
            if (lx < 0 || lx >= CHUNK_SIZE || lz < 0 || lz >= CHUNK_SIZE) continue
            for (let dy = -1; dy <= 2; dy++) {
              const y = top + dy
              if (y < 0 || y >= WORLD_HEIGHT) continue
              const idx = localIndex(lx, y, lz)
              if (leafAt(ox, dy, oz) && data[idx] === BlockId.Air) data[idx] = BlockId.Leaves
            }
          }
        }
        // Trunk overwrites leaves.
        if (wx >= x0 && wx < x0 + CHUNK_SIZE && wz >= z0 && wz < z0 + CHUNK_SIZE) {
          for (let y = ground + 1; y <= top && y < WORLD_HEIGHT; y++) {
            data[localIndex(wx - x0, y, wz - z0)] = BlockId.Wood
          }
        }
      }
    }
    return data
  }

  /** Natural chest positions whose column lies within the given chunk. */
  naturalChestsIn(cx: number, cz: number): { x: number; y: number; z: number }[] {
    const out: { x: number; y: number; z: number }[] = []
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const x = cx * CHUNK_SIZE + lx
        const z = cz * CHUNK_SIZE + lz
        if (this.chestAt(x, z)) out.push({ x, y: this.heightAt(x, z) + 1, z })
      }
    }
    return out
  }
}

/** Leaf shape relative to trunk top: dx/dz offset from trunk, dy offset from top. */
export function leafAt(dx: number, dy: number, dz: number): boolean {
  const ax = Math.abs(dx)
  const az = Math.abs(dz)
  if (dy === -1 || dy === 0) return ax <= 2 && az <= 2 && ax + az <= 3 && !(dx === 0 && dz === 0)
  if (dy === 1) return ax <= 1 && az <= 1
  if (dy === 2) return ax + az <= 1
  return false
}
