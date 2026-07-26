import { BlockId } from '../core/blocks'
import { hash2D } from '../core/rng'
import type { EntityManager } from '../entities/entityManager'
import type { FurnitureManager } from '../entities/furnitureManager'
import { CHUNK_SIZE, WATER_LEVEL } from '../constants'
import { flattenSite, supportColumn, type SetBlock } from './ground'
import type { Terrain } from './terrain'
import type { World } from './world'

/** Size of a village cell in chunks. ~20% of cells spawn a village. */
export const VCELL = 14
const VILLAGE_SEED = 0xb4a91c

/** House outer half-extents: 9 wide (X) × 7 deep (Z). */
export const HOUSE_HW = 4
export const HOUSE_HD = 3
const WALL_H = 4

/** House positions relative to the village centre; yaw points the door outward. */
export const HOUSES = [
  { ox: 0, oz: -11, yaw: 0 }, // north of the square, door faces south
  { ox: -11, oz: 6, yaw: Math.PI }, // west, door faces north
  { ox: 11, oz: 6, yaw: Math.PI }, // east, door faces north
] as const

/** Market stall, south of the campfire and facing the square. */
export const MARKET = { ox: 0, oz: 11 }
/** Village well, tucked between the square and the west house. */
const WELL = { ox: -7, oz: -5 }
/** Fenced kitchen gardens, kept clear of the houses and the market forecourt. */
const GARDENS = [
  { ox: 7, oz: -5, w: 3, d: 2 },
  { ox: -8, oz: 12, w: 3, d: 2 },
] as const
/** Lamp posts stand on the sand shoulders of the two lanes. */
const LAMPS = [[2, 6], [-2, -6], [6, -2], [-6, 2]] as const
/** Radius of the flattened village square around the campfire. */
const SQUARE_R = 12

/** Returns true if chunk (cx,cz) is the anchor chunk for a village in its cell. */
export function villageAnchorForChunk(seed: number, cx: number, cz: number): boolean {
  const cellX = Math.floor(cx / VCELL)
  const cellZ = Math.floor(cz / VCELL)
  const chance = hash2D(seed ^ VILLAGE_SEED, cellX, cellZ)
  if (chance >= 0.20) return false
  const margin = 2
  const range = VCELL - margin * 2
  const lx = Math.floor(hash2D(seed ^ (VILLAGE_SEED + 1), cellX, cellZ) * range) + margin
  const lz = Math.floor(hash2D(seed ^ (VILLAGE_SEED + 2), cellX, cellZ) * range) + margin
  const anchorCX = cellX * VCELL + lx
  const anchorCZ = cellZ * VCELL + lz
  return cx === anchorCX && cz === anchorCZ
}

export interface VillageSite {
  /** Village centre column. */
  sx: number
  sz: number
  /** Y of the village's walking surface. */
  floorY: number
  /** Inclusive world-space bounds of everything the village stamps. */
  x0: number
  x1: number
  z0: number
  z1: number
  /** Whether a column belongs to the levelled village footprint. */
  inside(x: number, z: number): boolean
}

/**
 * Where a village lands and how far it reaches. Buildings are laid out from
 * these bounds, and the whole footprint is levelled before anything is built.
 */
export function villageSite(terrain: Terrain, cx: number, cz: number): VillageSite {
  const sx = cx * CHUNK_SIZE + Math.floor(CHUNK_SIZE / 2)
  const sz = cz * CHUNK_SIZE + Math.floor(CHUNK_SIZE / 2)
  // Keep the village floor on dry land: if the centre sits in or near water,
  // raise the whole platform above the waterline so houses stand on ground.
  const floorY = Math.max(terrain.heightAt(sx, sz), WATER_LEVEL + 1)
  const rects = siteRects()
  const bounds = rects.reduce(
    (b, r) => ({
      x0: Math.min(b.x0, r.x0),
      x1: Math.max(b.x1, r.x1),
      z0: Math.min(b.z0, r.z0),
      z1: Math.max(b.z1, r.z1),
    }),
    { x0: -SQUARE_R, x1: SQUARE_R, z0: -SQUARE_R, z1: SQUARE_R },
  )
  return {
    sx,
    sz,
    floorY,
    x0: sx + bounds.x0,
    x1: sx + bounds.x1,
    z0: sz + bounds.z0,
    z1: sz + bounds.z1,
    inside(x: number, z: number): boolean {
      const dx = x - sx
      const dz = z - sz
      if (dx * dx + dz * dz <= SQUARE_R * SQUARE_R) return true
      return rects.some((r) => dx >= r.x0 && dx <= r.x1 && dz >= r.z0 && dz <= r.z1)
    },
  }
}

/** Every rectangle the village stands on, in offsets from the centre. */
function siteRects(): { x0: number; x1: number; z0: number; z1: number }[] {
  const rects = HOUSES.map(({ ox, oz }) => ({
    x0: ox - HOUSE_HW - 2,
    x1: ox + HOUSE_HW + 2,
    z0: oz - HOUSE_HD - 2,
    z1: oz + HOUSE_HD + 2,
  }))
  rects.push({ x0: MARKET.ox - 4, x1: MARKET.ox + 4, z0: MARKET.oz - 3, z1: MARKET.oz + 3 })
  for (const g of GARDENS) rects.push({ x0: g.ox - g.w - 1, x1: g.ox + g.w + 1, z0: g.oz - g.d - 1, z1: g.oz + g.d + 1 })
  return rects
}

/**
 * Stamp a village centered at the given chunk: three furnished houses, a
 * market stall, a well, kitchen gardens, lamp-lit stone paths and villagers.
 *
 * Blocks go through world.setBlock so the village also appears in chunks that
 * are *already* loaded when the anchor chunk arrives — writing raw edits left
 * half-stamped villages (walls with no floor beneath them) in those chunks.
 */
export function buildVillage(
  world: World,
  furniture: FurnitureManager,
  entities: EntityManager,
  cx: number,
  cz: number,
): void {
  const site = villageSite(world.terrain, cx, cz)
  const { sx, sz, floorY } = site
  const set: SetBlock = (x, y, z, id) => world.setBlock(x, y, z, id)

  // ---- Ground the whole site ----------------------------------------------
  // The footprint is the square plus every building rectangle, so no wall ever
  // ends up hanging over un-levelled terrain.
  const inSite = (x: number, z: number) => site.inside(x, z)
  flattenSite(world.terrain, set, {
    x0: site.x0,
    x1: site.x1,
    z0: site.z0,
    z1: site.z1,
    floorY,
    clearance: 2,
    inside: inSite,
  })

  // ---- Paths --------------------------------------------------------------
  // Three-wide stone lanes from the square out to each door and the market.
  const path = (x: number, z: number) => {
    if (!inSite(x, z)) supportColumn(world.terrain, set, x, z, floorY)
    set(x, floorY, z, BlockId.Stone)
  }
  for (let i = -SQUARE_R; i <= SQUARE_R; i++) {
    for (let w = -1; w <= 1; w++) {
      path(sx + i, sz + w)
      path(sx + w, sz + i)
    }
  }
  // Cobbled plaza ring around the campfire.
  for (let dx = -4; dx <= 4; dx++) {
    for (let dz = -4; dz <= 4; dz++) {
      const d2 = dx * dx + dz * dz
      if (d2 > 16 || d2 < 4) continue
      set(sx + dx, floorY, sz + dz, BlockId.Stone)
    }
  }
  // Sand shoulders soften the edge where the lanes meet the open ground.
  const surface = world.terrain.surfaceBlock
  for (let i = -SQUARE_R; i <= SQUARE_R; i++) {
    for (const w of [-2, 2]) {
      if (world.getBlock(sx + i, floorY, sz + w) === surface) set(sx + i, floorY, sz + w, BlockId.Sand)
      if (world.getBlock(sx + w, floorY, sz + i) === surface) set(sx + w, floorY, sz + i, BlockId.Sand)
    }
  }

  // ---- Landmarks ----------------------------------------------------------
  furniture.place('campfire', sx, floorY + 1, sz, 0)
  buildWell(set, sx + WELL.ox, sz + WELL.oz, floorY)
  for (const g of GARDENS) buildGarden(set, sx + g.ox, sz + g.oz, floorY, g.w, g.d)

  // Lamp posts along the lanes light the village at night.
  for (const [lx, lz] of LAMPS) buildLamp(set, furniture, sx + lx, sz + lz, floorY)

  for (const { ox, oz, yaw } of HOUSES) {
    buildHouse(world, furniture, sx + ox, sz + oz, floorY, set, yaw)
  }

  // ---- Market -------------------------------------------------------------
  const mx = sx + MARKET.ox
  const mz = sz + MARKET.oz
  // A stone forecourt so the stall stands on a proper floor, not on grass.
  for (let dx = -3; dx <= 3; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      supportColumn(world.terrain, set, mx + dx, mz + dz, floorY)
      set(mx + dx, floorY, mz + dz, BlockId.Stone)
    }
  }
  furniture.place('market', mx, floorY + 1, mz, Math.PI)
  // Crates and barrels stacked beside the stall.
  set(mx - 3, floorY + 1, mz, BlockId.Plank)
  set(mx - 3, floorY + 2, mz, BlockId.Plank)
  set(mx - 3, floorY + 1, mz - 1, BlockId.Plank)
  set(mx + 3, floorY + 1, mz, BlockId.Plank)
  set(mx + 3, floorY + 1, mz + 1, BlockId.Wood)
  buildLamp(set, furniture, mx + 3, mz - 2, floorY)
  buildLamp(set, furniture, mx - 3, mz - 2, floorY)

  // ---- Villagers ----------------------------------------------------------
  // Three around the campfire, one per side house, and a trader at the stall.
  const villagerSpots = [
    { dx: 2, dz: 1 },
    { dx: -2, dz: 2 },
    { dx: 1, dz: -2 },
    // Just outside the porch of each side house (their doors face north).
    { dx: HOUSES[1].ox + 1, dz: HOUSES[1].oz - HOUSE_HD - 2 },
    { dx: HOUSES[2].ox - 1, dz: HOUSES[2].oz - HOUSE_HD - 2 },
    // The trader stands behind the counter, not in the customer's spot.
    { dx: MARKET.ox, dz: MARKET.oz + 1 },
  ]
  for (const { dx, dz } of villagerSpots) {
    const id = `villager-${cx},${cz},${dx},${dz}`
    if (!entities.animals.has(id)) {
      entities.animals.set(id, {
        id,
        kind: 'villager',
        pos: { x: sx + dx + 0.5, y: floorY + 1.01, z: sz + dz + 0.5 },
        vel: { x: 0, y: 0, z: 0 },
        yaw: Math.random() * Math.PI * 2,
        mode: 'wander',
        owner: null,
        onGround: false,
        decideIn: Math.random() * 3,
        walking: false,
        walkPhase: 0,
      })
    }
  }
}

/** A street lamp: wooden pole with a lit lantern sitting on top. */
function buildLamp(set: SetBlock, furniture: FurnitureManager, x: number, z: number, floorY: number): void {
  for (let y = floorY + 1; y <= floorY + 3; y++) set(x, y, z, BlockId.Wood)
  set(x, floorY + 4, z, BlockId.Air)
  furniture.place('lantern', x, floorY + 4, z, 0)
}

/** Stone-ringed well with a plank canopy on two posts. */
function buildWell(set: SetBlock, x: number, z: number, floorY: number): void {
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      if (dx === 0 && dz === 0) continue
      set(x + dx, floorY + 1, z + dz, BlockId.Stone)
    }
  }
  // Shaft: one block deep, so a villager that hops the rim can hop back out.
  set(x, floorY, z, BlockId.Air)
  set(x, floorY - 1, z, BlockId.Stone)
  // Canopy posts and roof.
  for (const dx of [-1, 1]) {
    set(x + dx, floorY + 2, z, BlockId.Wood)
    set(x + dx, floorY + 3, z, BlockId.Wood)
  }
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) set(x + dx, floorY + 4, z + dz, BlockId.Plank)
  }
}

/** A tilled plot ringed by a low fence. */
function buildGarden(set: SetBlock, x: number, z: number, floorY: number, w: number, d: number): void {
  for (let dx = -w; dx <= w; dx++) {
    for (let dz = -d; dz <= d; dz++) {
      const edge = Math.abs(dx) === w || Math.abs(dz) === d
      if (edge) {
        set(x + dx, floorY + 1, z + dz, BlockId.Fence)
      } else {
        set(x + dx, floorY, z + dz, BlockId.Dirt)
        // Rows of leafy crops between the furrows.
        if (dz % 2 === 0) set(x + dx, floorY + 1, z + dz, BlockId.Leaves)
      }
    }
  }
  // Gate: a gap in the fence facing the square.
  set(x, floorY + 1, z + d, BlockId.Air)
}

/**
 * Build a cottage: stone plinth, brick walls with wood corner posts, glazed
 * windows and a pitched gable roof whose ridge runs along X.
 * yaw=0 → door faces +Z (south); yaw=π → door faces -Z (north).
 */
function buildHouse(
  world: World,
  furniture: FurnitureManager,
  hx: number,
  hz: number,
  floorY: number,
  set: SetBlock,
  yaw: number,
): void {
  const hw = HOUSE_HW
  const hd = HOUSE_HD
  const wallH = WALL_H
  const roofBase = floorY + wallH + 1
  const front = yaw === 0 ? hz + hd : hz - hd // wall with the door
  const back = yaw === 0 ? hz - hd : hz + hd
  const outward = yaw === 0 ? 1 : -1

  // ---- Foundation & floor ----
  for (let x = hx - hw; x <= hx + hw; x++) {
    for (let z = hz - hd; z <= hz + hd; z++) {
      // Guarantee solid ground under every column of the house, even where the
      // footprint spills past the levelled village square.
      supportColumn(world.terrain, set, x, z, floorY)
      const edge = x === hx - hw || x === hx + hw || z === hz - hd || z === hz + hd
      set(x, floorY, z, edge ? BlockId.Stone : BlockId.Plank)
    }
  }

  // ---- Walls ----
  for (let y = floorY + 1; y <= floorY + wallH; y++) {
    // The top course is a wood beam, which reads as a timber-framed cottage.
    const material = y === floorY + wallH ? BlockId.Wood : BlockId.Brick
    for (let x = hx - hw; x <= hx + hw; x++) {
      set(x, y, hz - hd, material)
      set(x, y, hz + hd, material)
    }
    for (let z = hz - hd + 1; z <= hz + hd - 1; z++) {
      set(hx - hw, y, z, material)
      set(hx + hw, y, z, material)
    }
    // Corner posts.
    for (const x of [hx - hw, hx + hw]) {
      for (const z of [hz - hd, hz + hd]) set(x, y, z, BlockId.Wood)
    }
  }

  // ---- Gabled roof (ridge along X, eaves overhanging by one block) ----
  for (let lvl = 0; lvl <= hd; lvl++) {
    const ry = roofBase + lvl
    const zNear = hz - hd + lvl
    const zFar = hz + hd - lvl
    for (let x = hx - hw - 1; x <= hx + hw + 1; x++) {
      set(x, ry, zNear, BlockId.Plank)
      set(x, ry, zFar, BlockId.Plank)
    }
    // Brick triangles close the gable ends under the slope.
    if (lvl < hd) {
      for (const x of [hx - hw, hx + hw]) {
        for (let z = zNear + 1; z <= zFar - 1; z++) set(x, ry, z, BlockId.Brick)
      }
    }
  }

  // ---- Openings ----
  // Doorway, two blocks tall, in the middle of the front wall.
  set(hx, floorY + 1, front, BlockId.Air)
  set(hx, floorY + 2, front, BlockId.Air)
  // Tall two-pane windows on the long side walls.
  for (const x of [hx - hw, hx + hw]) {
    for (const dz of [-1, 1]) {
      set(x, floorY + 2, hz + dz, BlockId.Glass)
      set(x, floorY + 3, hz + dz, BlockId.Glass)
    }
  }
  // Windows flanking the door and matching ones on the back wall.
  for (const dx of [-2, 2]) {
    set(hx + dx, floorY + 2, front, BlockId.Glass)
    set(hx + dx, floorY + 3, front, BlockId.Glass)
    set(hx + dx, floorY + 2, back, BlockId.Glass)
  }

  // ---- Chimney ----
  const chimneyX = hx - hw + 1
  const chimneyZ = hz + (yaw === 0 ? -1 : 1)
  for (let y = floorY + 1; y <= roofBase + hd + 1; y++) set(chimneyX, y, chimneyZ, BlockId.Brick)
  set(chimneyX, roofBase + hd + 2, chimneyZ, BlockId.Stone)

  // ---- Porch ----
  for (let dx = -1; dx <= 1; dx++) {
    supportColumn(world.terrain, set, hx + dx, front + outward, floorY)
    set(hx + dx, floorY, front + outward, BlockId.Stone)
  }
  buildLamp(set, furniture, hx + 2, front + outward, floorY)

  // ---- Interior ----
  // The door sits in the doorway itself so the opening is actually closed.
  furniture.place('door', hx, floorY + 1, front, yaw)
  const inward = -outward
  furniture.place('desk', hx - 2, floorY + 1, hz + inward * (hd - 1), yaw)
  furniture.place('chair', hx - 2, floorY + 1, hz + inward * (hd - 2), yaw + Math.PI)
  furniture.place('bed', hx + 2, floorY + 1, hz - 1, yaw === 0 ? Math.PI / 2 : -Math.PI / 2)
  // Kept off-centre so it never blocks the doorway.
  furniture.place('sofa', hx + 2, floorY + 1, hz + outward * (hd - 1), yaw + Math.PI)
  // A lantern under the roof beam keeps the room readable after dark.
  furniture.place('lantern', hx - 1, floorY + 3, hz, 0)
}
