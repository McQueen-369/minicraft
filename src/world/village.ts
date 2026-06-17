import { BlockId } from '../core/blocks'
import { blockKey } from '../core/coords'
import { hash2D } from '../core/rng'
import type { EntityManager } from '../entities/entityManager'
import type { FurnitureManager } from '../entities/furnitureManager'
import { CHUNK_SIZE } from '../constants'
import type { World } from './world'

/** Size of a village cell in chunks. ~20% of cells spawn a village. */
export const VCELL = 14
const VILLAGE_SEED = 0xb4a91c

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

/**
 * Stamp a small village centered at the given chunk.
 * Three houses with gabled roofs, a campfire, stone paths, and five villager NPCs.
 */
export function buildVillage(
  world: World,
  furniture: FurnitureManager,
  entities: EntityManager,
  cx: number,
  cz: number,
): void {
  const sx = cx * CHUNK_SIZE + Math.floor(CHUNK_SIZE / 2)
  const sz = cz * CHUNK_SIZE + Math.floor(CHUNK_SIZE / 2)
  const floorY = world.terrain.heightAt(sx, sz)
  const set = (x: number, y: number, z: number, id: number) => world.edits.set(blockKey(x, y, z), id)

  // Flatten a 26×26 area
  for (let x = sx - 13; x <= sx + 13; x++) {
    for (let z = sz - 13; z <= sz + 13; z++) {
      const h = world.terrain.heightAt(x, z)
      set(x, floorY - 1, z, BlockId.Dirt)
      set(x, floorY, z, BlockId.Grass)
      for (let y = floorY + 1; y <= h + 2; y++) set(x, y, z, BlockId.Air)
    }
  }

  // Stone paths through center
  for (let i = -10; i <= 10; i++) {
    set(sx + i, floorY, sz, BlockId.Stone)
    set(sx, floorY, sz + i, BlockId.Stone)
  }

  // Campfire at the centre
  furniture.place('campfire', sx, floorY + 1, sz, 0)

  // Three houses: north, east, west
  const houses = [
    { ox: 0,  oz: -9, yaw: 0 },         // north: door faces south
    { ox: -10, oz: 4, yaw: Math.PI },    // west: door faces north
    { ox: 10,  oz: 4, yaw: Math.PI },    // east: door faces north
  ]
  for (const { ox, oz, yaw } of houses) {
    buildHouse(world, furniture, sx + ox, sz + oz, floorY, set, yaw)
  }

  // Five villagers: 3 near campfire + 1 per east/west house
  const villagerSpots = [
    { dx:  2, dz:  1 },
    { dx: -2, dz:  2 },
    { dx:  1, dz: -2 },
    { dx: -9, dz:  4 },
    { dx:  9, dz:  4 },
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

/**
 * Build a house with brick walls, plank floor, and a gabled plank roof.
 * The house is 9 wide × 7 deep (outer dimensions).
 * yaw=0 → door faces +Z (south); yaw=π → door faces -Z (north).
 */
function buildHouse(
  _world: World,
  furniture: FurnitureManager,
  hx: number,
  hz: number,
  floorY: number,
  set: (x: number, y: number, z: number, id: number) => void,
  yaw: number,
): void {
  const hw = 4  // half-width along X  (9 blocks wide: hx-4..hx+4)
  const hd = 3  // half-depth along Z  (7 blocks deep: hz-3..hz+3)
  const wallH = 4  // wall height (y+1 to y+4 above floor)

  // ---- Floor ----
  for (let x = hx - hw; x <= hx + hw; x++)
    for (let z = hz - hd; z <= hz + hd; z++)
      set(x, floorY, z, BlockId.Plank)

  // ---- Walls (brick) ----
  for (let y = floorY + 1; y <= floorY + wallH; y++) {
    for (let x = hx - hw; x <= hx + hw; x++) {
      set(x, y, hz - hd, BlockId.Brick)
      set(x, y, hz + hd, BlockId.Brick)
    }
    for (let z = hz - hd + 1; z <= hz + hd - 1; z++) {
      set(hx - hw, y, z, BlockId.Brick)
      set(hx + hw, y, z, BlockId.Brick)
    }
  }

  // ---- Gabled roof (planks) ----
  // Hip (pyramid) roof: each level insets by 1 in both X and Z.
  // Level 0 (roof base, y = floorY + wallH + 1): full 9×7 overhang
  // Level 1 (y + 1): 7×5
  // Level 2 (y + 2): 5×3
  // Level 3 (y + 3): 3×1  (ridge)
  const roofBase = floorY + wallH + 1
  const roofLevels = [
    { dx: hw,     dz: hd },
    { dx: hw - 1, dz: hd - 1 },
    { dx: hw - 2, dz: hd - 2 },
    { dx: hw - 3, dz: Math.max(0, hd - 3) },
  ]
  for (let lvl = 0; lvl < roofLevels.length; lvl++) {
    const { dx, dz } = roofLevels[lvl]
    const ry = roofBase + lvl
    if (dx < 0) break
    for (let x = hx - dx; x <= hx + dx; x++) {
      for (let z = hz - dz; z <= hz + dz; z++) {
        set(x, ry, z, BlockId.Plank)
      }
    }
  }

  // Gable end-walls (brick triangles above wallH on north and south faces)
  for (let lvl = 0; lvl < roofLevels.length; lvl++) {
    const { dx } = roofLevels[lvl]
    const ry = roofBase + lvl
    if (dx < 0) break
    for (let x = hx - dx; x <= hx + dx; x++) {
      set(x, ry, hz - hd, BlockId.Brick)
      set(x, ry, hz + hd, BlockId.Brick)
    }
  }

  // ---- Doorway (2 tall, on the face determined by yaw) ----
  // yaw=0 → south face (hz+hd); yaw=π → north face (hz-hd)
  const doorZ = yaw === 0 ? hz + hd : hz - hd
  set(hx, floorY + 1, doorZ, BlockId.Air)
  set(hx, floorY + 2, doorZ, BlockId.Air)

  // ---- Windows (1 block, on side walls, mid height) ----
  set(hx - hw, floorY + 2, hz, BlockId.Glass)
  set(hx + hw, floorY + 2, hz, BlockId.Glass)
  // Small window on opposite face from door
  const windowZ = yaw === 0 ? hz - hd : hz + hd
  set(hx, floorY + 2, windowZ, BlockId.Glass)

  // ---- Chimney (stone, top-left corner, 2 blocks above roof) ----
  const chimneyX = hx - hw + 1
  const chimneyZ = yaw === 0 ? hz - hd + 1 : hz + hd - 1
  set(chimneyX, roofBase,     chimneyZ, BlockId.Stone)
  set(chimneyX, roofBase + 1, chimneyZ, BlockId.Stone)
  set(chimneyX, roofBase + 2, chimneyZ, BlockId.Stone)
  set(chimneyX, roofBase + 3, chimneyZ, BlockId.Stone)

  // ---- Interior furniture ----
  // Door on south/north face
  const dz2 = yaw === 0 ? hz + hd - 1 : hz - hd + 1
  furniture.place('door', hx, floorY + 1, dz2, yaw)
  // Desk on the back wall
  const deskZ = yaw === 0 ? hz - hd + 1 : hz + hd - 1
  furniture.place('desk', hx - 1, floorY + 1, deskZ, yaw)
  // Bed inside near a wall
  furniture.place('bed', hx + 2, floorY + 1, hz, yaw === 0 ? Math.PI / 2 : -Math.PI / 2)
}
