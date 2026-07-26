import { CHUNK_SIZE, WATER_LEVEL, WORLD_HEIGHT } from '../constants'
import { BlockId } from '../core/blocks'
import { localIndex } from '../core/coords'
import { hash2D } from '../core/rng'
import { makeNoise2D, type Noise2D } from './noise'
import type { WorldKind } from './worldKind'

const TREE_PROB = 0.008
const CHEST_PROB = 0.0006
const TREE_SEED = 0x7ee5
const CHEST_SEED = 0xc4e5
const APPLE_TREE_SEED = 0x3e7a1b
const APPLE_TREE_PROB = 0.30
const CAN_SEED = 0xca77ed
/**
 * Robot worlds have no apple trees, so supply tins take their place as the
 * world's food source. They are far more common than loot chests — food has to
 * be findable by walking around, not by hunting.
 */
const CAN_PROB = 0.006
const MYSTERY_BOX_PROB = 0.0002
const MYSTERY_RARE_PROB = 0.00008
const MYSTERY_EPIC_PROB = 0.00002
const MYSTERY_SEED = 0xb05e
const GOLD_SEED = 0xf7a3c2
const GOLD_PROB = 0.04      // 4% of deep stone blocks contain gold ore
const GOLD_SURFACE_PROB = 0.004 // 0.4% of surface blocks show a gold-spotted outcrop
const DIAMOND_SEED = 0xd1a40d
/** Diamonds are rarer than gold and only appear in the deepest stone. */
const DIAMOND_PROB = 0.015
/** How far below the surface diamond ore starts appearing. */
const DIAMOND_DEPTH = 6
const MIN_TRUNK = 4
const MAX_TRUNK = 6
/** Max horizontal distance a tree canopy reaches from its trunk. */
export const TREE_RADIUS = 2

const LAVA_SEED = 0x1a7a
/** Highest Y molten rock ever reaches — everything above is plain stone. */
export const LAVA_MAX_Y = 12
/** Lowest Y of a lava pool's surface, so even the coolest regions hold a puddle. */
const LAVA_MIN_Y = 4
/**
 * How many blocks of stone always sit between the surface and any lava, so a
 * pool is something you dig down to rather than something you fall into.
 */
export const LAVA_MIN_COVER = 12
/** fbm value a column must beat before lava pools there at all. */
const LAVA_THRESHOLD = 0.1

const ISLAND_SEED = 0x15a7d
/** Distance from the origin at which the secret island is placed. */
const ISLAND_MIN_DIST = 280
const ISLAND_DIST_SPREAD = 80
/** Radius of the island's dry core. */
export const ISLAND_CORE = 24
/** Outer radius of the lake ring that surrounds (and hides) the island. */
export const ISLAND_OUTER = 60

export interface TreeInfo {
  trunkHeight: number
}

export class Terrain {
  private readonly hills: Noise2D
  private readonly detail: Noise2D
  private readonly lava: Noise2D
  /** Centre of the secret mini-game island (deterministic per seed). */
  readonly island: { x: number; z: number }
  /** Block laid on top of every dry column — grass, or alloy decking in a robot world. */
  readonly surfaceBlock: BlockId

  constructor(
    readonly seed: number,
    readonly kind: WorldKind = 'terrain',
  ) {
    this.surfaceBlock = kind === 'robot' ? BlockId.MetalPanel : BlockId.Grass
    this.hills = makeNoise2D(seed, 4, 1 / 160)
    this.detail = makeNoise2D(seed ^ 0x5eed, 2, 1 / 31)
    // Broad, smooth field: lava gathers in a few large basins rather than
    // freckling the whole underground with one-block pockets.
    this.lava = makeNoise2D(seed ^ LAVA_SEED, 3, 1 / 90)
    const angle = hash2D(seed ^ ISLAND_SEED, 17, 31) * Math.PI * 2
    const dist = ISLAND_MIN_DIST + hash2D(seed ^ ISLAND_SEED, 41, 7) * ISLAND_DIST_SPREAD
    this.island = { x: Math.round(Math.cos(angle) * dist), z: Math.round(Math.sin(angle) * dist) }
  }

  /** Ground surface height (y of the topmost solid block) for a column. */
  heightAt(x: number, z: number): number {
    const base = 30 + this.hills.fbm(x, z) * 22 + this.detail.fbm(x, z) * 4
    let h = base
    // Secret island: a dome of dry land inside a ring-shaped lake, blended
    // into the surrounding terrain so it reads as a hidden lagoon.
    const dx = x - this.island.x
    const dz = z - this.island.z
    if (dx > -ISLAND_OUTER && dx < ISLAND_OUTER && dz > -ISLAND_OUTER && dz < ISLAND_OUTER) {
      const d = Math.sqrt(dx * dx + dz * dz)
      if (d < ISLAND_OUTER) {
        const moat = WATER_LEVEL - 7
        if (d >= ISLAND_CORE) {
          const t = Math.min(1, (ISLAND_OUTER - d) / 12)
          h = base + (moat - base) * t
        } else {
          const isle = WATER_LEVEL + 3 + Math.cos((d / ISLAND_CORE) * (Math.PI / 2)) * 4
          const t = Math.min(1, (ISLAND_CORE - d) / 8)
          h = moat + (isle - moat) * t
        }
      }
    }
    return Math.max(2, Math.min(WORLD_HEIGHT - 16, Math.round(h)))
  }

  /**
   * Y of the lava surface in this column, or -1 where the deep stone stays
   * solid. Pools only form in the hottest basins, and their surface rises with
   * the noise so a lake bed reads as molten rather than a flat slab.
   */
  lavaTopAt(x: number, z: number): number {
    const n = this.lava.fbm(x, z)
    if (n < LAVA_THRESHOLD) return -1
    const heat = Math.min(1, (n - LAVA_THRESHOLD) / 0.45)
    return Math.round(LAVA_MIN_Y + heat * (LAVA_MAX_Y - LAVA_MIN_Y))
  }

  /**
   * Whether the generated block at (x,y,z) is molten. Lava replaces the deep
   * stone of a hot column, but never within LAVA_MIN_COVER of the surface —
   * players have to dig for it.
   */
  isLava(x: number, y: number, z: number, surfaceHeight = this.heightAt(x, z)): boolean {
    // The bottom layer stays stone, so a pool always has a floor to stand on.
    if (y < 1 || y > surfaceHeight - LAVA_MIN_COVER) return false
    return y <= this.lavaTopAt(x, z)
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

  /** Returns true if the tree at (x,z) is an apple tree (~30% of trees, terrain worlds only). */
  isAppleTree(x: number, z: number): boolean {
    if (this.kind === 'robot') return false
    return this.treeAt(x, z) !== null && hash2D(this.seed ^ APPLE_TREE_SEED, x, z) < APPLE_TREE_PROB
  }

  /**
   * Deterministic canned-food tin standing on the surface (robot worlds only,
   * sits at heightAt + 1, like a chest).
   */
  cannedFoodAt(x: number, z: number): boolean {
    if (this.kind !== 'robot') return false
    if (hash2D(this.seed ^ CAN_SEED, x, z) >= CAN_PROB) return false
    if (this.chestAt(x, z) || this.treeAt(x, z) || this.mysteryBoxAt(x, z) !== null) return false
    return this.heightAt(x, z) > WATER_LEVEL + 1
  }

  /** Deterministic naturally generated chest (sits at heightAt + 1). */
  chestAt(x: number, z: number): boolean {
    if (hash2D(this.seed ^ CHEST_SEED, x, z) >= CHEST_PROB) return false
    return this.heightAt(x, z) > WATER_LEVEL + 1
  }

  /** Deterministic naturally generated mystery box (sits at heightAt + 1). */
  mysteryBoxAt(x: number, z: number): BlockId | null {
    if (this.chestAt(x, z)) return null
    if (this.treeAt(x, z)) return null
    const h = this.heightAt(x, z)
    if (h <= WATER_LEVEL + 1) return null
    const r = hash2D(this.seed ^ MYSTERY_SEED, x, z)
    if (r < MYSTERY_EPIC_PROB) return BlockId.MysteryBoxEpic
    if (r < MYSTERY_RARE_PROB) return BlockId.MysteryBoxRare
    if (r < MYSTERY_BOX_PROB) return BlockId.MysteryBox
    return null
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
      if (y === h) {
        // Rare gold-spotted surface outcrop (visual hint for underground gold)
        if (h > WATER_LEVEL + 2 && hash2D(this.seed ^ (GOLD_SEED + 1), x, z) < GOLD_SURFACE_PROB) return BlockId.GoldOre
        return this.surfaceBlock
      }
      if (y >= h - 2) return BlockId.Dirt
      // Molten basins replace the deepest stone entirely, ore included.
      if (this.isLava(x, y, z, h)) return BlockId.Lava
      // Deepest stone — rare diamond ore (checked before gold so it wins ties)
      if (y < h - DIAMOND_DEPTH && hash2D(this.seed ^ DIAMOND_SEED ^ (y * 0x51F3A9 | 0), x, z) < DIAMOND_PROB) return BlockId.DiamondOre
      // Deep stone layer — scatter gold ore veins
      if (y < h - 3 && hash2D(this.seed ^ GOLD_SEED ^ (y * 0x8A3CB7 | 0), x, z) < GOLD_PROB) return BlockId.GoldOre
      return BlockId.Stone
    }
    if (this.chestAt(x, z) && y === h + 1) return BlockId.Chest
    const mbox = this.mysteryBoxAt(x, z)
    if (mbox !== null && y === h + 1) return mbox
    if (this.cannedFoodAt(x, z) && y === h + 1) return BlockId.CannedFood
    // Trunk of a tree rooted in this column.
    const own = this.treeAt(x, z)
    if (own && y <= h + own.trunkHeight) return BlockId.Wood
    // Canopy leaves from trees rooted in nearby columns.
    for (let dx = -TREE_RADIUS; dx <= TREE_RADIUS; dx++) {
      for (let dz = -TREE_RADIUS; dz <= TREE_RADIUS; dz++) {
        const tree = this.treeAt(x + dx, z + dz)
        if (!tree) continue
        const top = this.heightAt(x + dx, z + dz) + tree.trunkHeight
        if (leafAt(-dx, y - top, -dz)) {
          return this.isAppleTree(x + dx, z + dz) ? BlockId.AppleLeaves : BlockId.Leaves
        }
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
        // One noise lookup per column: everything at or below this Y (and deep
        // enough under the surface) is molten.
        const lavaTop = h - LAVA_MIN_COVER >= 1 ? Math.min(this.lavaTopAt(wx, wz), h - LAVA_MIN_COVER) : -1
        for (let y = 0; y <= h; y++) {
          let id: BlockId
          if (y >= h - 2 && sandy) id = BlockId.Sand
          else if (y === h) {
            if (!sandy && hash2D(this.seed ^ (GOLD_SEED + 1), wx, wz) < GOLD_SURFACE_PROB) id = BlockId.GoldOre
            else id = this.surfaceBlock
          }
          else if (y >= h - 2) id = BlockId.Dirt
          else if (y >= 1 && y <= lavaTop) id = BlockId.Lava
          else if (y < h - DIAMOND_DEPTH && hash2D(this.seed ^ DIAMOND_SEED ^ (y * 0x51F3A9 | 0), wx, wz) < DIAMOND_PROB) id = BlockId.DiamondOre
          else if (y < h - 3 && hash2D(this.seed ^ GOLD_SEED ^ (y * 0x8A3CB7 | 0), wx, wz) < GOLD_PROB) id = BlockId.GoldOre
          else id = BlockId.Stone
          data[localIndex(lx, y, lz)] = id
        }
        if (this.chestAt(wx, wz) && h + 1 < WORLD_HEIGHT) {
          data[localIndex(lx, h + 1, lz)] = BlockId.Chest
        }
        const mbox = this.mysteryBoxAt(wx, wz)
        if (mbox !== null && h + 1 < WORLD_HEIGHT) {
          data[localIndex(lx, h + 1, lz)] = mbox
        }
        if (this.cannedFoodAt(wx, wz) && h + 1 < WORLD_HEIGHT) {
          data[localIndex(lx, h + 1, lz)] = BlockId.CannedFood
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
              if (leafAt(ox, dy, oz) && data[idx] === BlockId.Air) {
                data[idx] = this.isAppleTree(wx, wz) ? BlockId.AppleLeaves : BlockId.Leaves
              }
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
