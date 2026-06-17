import { BlockId } from '../core/blocks'
import { blockKey } from '../core/coords'
import { hash2D } from '../core/rng'
import type { EntityManager } from '../entities/entityManager'
import type { FurnitureManager } from '../entities/furnitureManager'
import { CHUNK_SIZE } from '../constants'
import type { World } from './world'

/** Size of a village cell in chunks. ~15% of cells spawn a village. */
export const VCELL = 14
const VILLAGE_SEED = 0xb4a91c

/** Returns the [cellX, cellZ, anchorCX, anchorCZ] for a village if chunk (cx,cz) is its anchor. */
export function villageAnchorForChunk(seed: number, cx: number, cz: number): boolean {
  const cellX = Math.floor(cx / VCELL)
  const cellZ = Math.floor(cz / VCELL)
  const chance = hash2D(seed ^ VILLAGE_SEED, cellX, cellZ)
  if (chance >= 0.15) return false
  // Determine anchor chunk within cell (keep it 2 chunks from the edge)
  const margin = 2
  const range = VCELL - margin * 2
  const lx = Math.floor(hash2D(seed ^ (VILLAGE_SEED + 1), cellX, cellZ) * range) + margin
  const lz = Math.floor(hash2D(seed ^ (VILLAGE_SEED + 2), cellX, cellZ) * range) + margin
  const anchorCX = cellX * VCELL + lx
  const anchorCZ = cellZ * VCELL + lz
  return cx === anchorCX && cz === anchorCZ
}

/**
 * Stamp a small village centered at the given chunk (cx, cz).
 * Writes block edits and places furniture and villager NPCs.
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

  // Flatten a 22×22 area
  for (let x = sx - 11; x <= sx + 11; x++) {
    for (let z = sz - 11; z <= sz + 11; z++) {
      const h = world.terrain.heightAt(x, z)
      // Fill any holes or raise dips
      set(x, floorY - 1, z, BlockId.Dirt)
      set(x, floorY, z, BlockId.Grass)
      for (let y = floorY + 1; y <= h + 2; y++) set(x, y, z, BlockId.Air)
    }
  }

  // Stone path running north-south and east-west through center
  for (let i = -8; i <= 8; i++) {
    set(sx + i, floorY, sz, BlockId.Stone)
    set(sx, floorY, sz + i, BlockId.Stone)
  }

  // Place campfire at the center
  furniture.place('campfire', sx, floorY + 1, sz, 0)

  // 3 small stone huts: north, east, west
  const huts = [
    { ox: 0, oz: -7 },
    { ox: -8, oz: 3 },
    { ox: 8, oz: 3 },
  ]

  for (const { ox, oz } of huts) {
    const hx = sx + ox
    const hz = sz + oz
    buildHut(world, hx, hz, floorY, set)
  }

  // Spawn 3 villagers near the campfire
  const offsets = [
    { dx: 2, dz: 1 },
    { dx: -2, dz: 2 },
    { dx: 1, dz: -2 },
  ]
  for (const { dx, dz } of offsets) {
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

function buildHut(
  _world: World,
  hx: number,
  hz: number,
  floorY: number,
  set: (x: number, y: number, z: number, id: number) => void,
): void {
  const w = 4 // half-width (footprint is 9×9)
  const wallTop = floorY + 3
  const roofY = floorY + 4

  // Floor and roof
  for (let x = hx - w; x <= hx + w; x++) {
    for (let z = hz - w; z <= hz + w; z++) {
      set(x, floorY, z, BlockId.Plank)
      set(x, roofY, z, BlockId.Stone)
    }
  }
  // Walls
  for (let y = floorY + 1; y <= wallTop; y++) {
    for (let x = hx - w; x <= hx + w; x++) {
      set(x, y, hz - w, BlockId.Stone)
      set(x, y, hz + w, BlockId.Stone)
    }
    for (let z = hz - w; z <= hz + w; z++) {
      set(hx - w, y, z, BlockId.Stone)
      set(hx + w, y, z, BlockId.Stone)
    }
  }
  // Doorway (south face, 2 tall)
  set(hx, floorY + 1, hz + w, BlockId.Air)
  set(hx, floorY + 2, hz + w, BlockId.Air)
  // Window (north face)
  set(hx, floorY + 2, hz - w, BlockId.Air)
}
