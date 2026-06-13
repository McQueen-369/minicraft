import { CHEST_SLOTS } from '../constants'
import { BlockId } from '../core/blocks'
import { blockKey } from '../core/coords'
import { ItemId, type Slot } from '../items/items'
import type { World } from './world'

/**
 * Build a starter house + animal farm at the given spawn column and populate
 * two chests with building materials and animal food.  Called once per new
 * world (save === null).
 *
 * House:  9×9 footprint centred on (sx, sz), walls 3 high, Wood roof.
 * Farm:   fenced 11×9 area immediately to the east of the house.
 */
export function buildStarterHouse(world: World, sx: number, sz: number): void {
  const h = world.terrain.heightAt(sx, sz)

  // ── clear terrain features inside house + farm footprint ──────────────────
  for (let dx = -4; dx <= 16; dx++) {
    for (let dz = -4; dz <= 4; dz++) {
      for (let dy = 1; dy <= 12; dy++) {
        const block = world.terrain.generateBlock(sx + dx, h + dy, sz + dz)
        if (block !== BlockId.Air) world.setBlock(sx + dx, h + dy, sz + dz, BlockId.Air)
      }
    }
  }

  // ── floor (Plank) ─────────────────────────────────────────────────────────
  for (let dx = -4; dx <= 4; dx++) {
    for (let dz = -4; dz <= 4; dz++) {
      world.setBlock(sx + dx, h, sz + dz, BlockId.Plank)
    }
  }

  // ── walls (Brick) ─────────────────────────────────────────────────────────
  for (let y = h + 1; y <= h + 3; y++) {
    for (let dx = -4; dx <= 4; dx++) {
      world.setBlock(sx + dx, y, sz - 4, BlockId.Brick) // north wall
      world.setBlock(sx + dx, y, sz + 4, BlockId.Brick) // south wall
    }
    for (let dz = -3; dz <= 3; dz++) {
      world.setBlock(sx - 4, y, sz + dz, BlockId.Brick) // west wall
      world.setBlock(sx + 4, y, sz + dz, BlockId.Brick) // east wall
    }
  }

  // ── roof (Wood log) ───────────────────────────────────────────────────────
  for (let dx = -4; dx <= 4; dx++) {
    for (let dz = -4; dz <= 4; dz++) {
      world.setBlock(sx + dx, h + 4, sz + dz, BlockId.Wood)
    }
  }

  // ── windows (Glass) ───────────────────────────────────────────────────────
  world.setBlock(sx - 2, h + 2, sz + 4, BlockId.Glass) // south wall, left
  world.setBlock(sx + 2, h + 2, sz + 4, BlockId.Glass) // south wall, right
  world.setBlock(sx,     h + 2, sz - 4, BlockId.Glass) // north wall, centre
  world.setBlock(sx - 4, h + 2, sz,     BlockId.Glass) // west wall, centre
  world.setBlock(sx + 4, h + 2, sz,     BlockId.Glass) // east wall, centre

  // ── door opening (south face, centre) ────────────────────────────────────
  world.setBlock(sx, h + 1, sz + 4, BlockId.Air)
  world.setBlock(sx, h + 2, sz + 4, BlockId.Air)

  // ── interior fixtures ─────────────────────────────────────────────────────
  world.setBlock(sx - 2, h + 1, sz - 2, BlockId.Bed)    // bed in north-west corner
  world.setBlock(sx + 2, h + 1, sz - 2, BlockId.Desk)   // desk in north-east corner
  world.setBlock(sx + 2, h + 1, sz - 1, BlockId.Chair)  // chair at desk
  world.setBlock(sx,     h + 3, sz,     BlockId.Light)  // ceiling lantern

  // ── chests ────────────────────────────────────────────────────────────────
  const c1 = { x: sx - 2, y: h + 1, z: sz + 2 } // south-west: building items
  const c2 = { x: sx + 2, y: h + 1, z: sz + 2 } // south-east: food / tools
  world.setBlock(c1.x, c1.y, c1.z, BlockId.Chest)
  world.setBlock(c2.x, c2.y, c2.z, BlockId.Chest)

  const building: (Slot | null)[] = new Array(CHEST_SLOTS).fill(null)
  let i = 0
  const put = (arr: (Slot | null)[], id: number, count: number) => { if (i < CHEST_SLOTS) arr[i++] = { itemId: id, count } }

  i = 0
  put(building, ItemId.Door,  10)
  put(building, ItemId.Glass, 10)  // windows
  put(building, ItemId.Bed,    5)
  put(building, ItemId.Desk,   5)
  put(building, ItemId.Chair,  5)
  put(building, ItemId.Light, 20)
  world.chests.set(blockKey(c1.x, c1.y, c1.z), building)

  const food: (Slot | null)[] = new Array(CHEST_SLOTS).fill(null)
  i = 0
  put(food, ItemId.StonePickaxe, 1)
  put(food, ItemId.Axe,          1)
  put(food, ItemId.Shears,       1)
  put(food, ItemId.Wheat,       10) // sheep food
  put(food, ItemId.Carrot,      10) // pig food
  put(food, ItemId.Seeds,       10) // chicken food
  put(food, ItemId.Apple,       10) // rabbit food
  put(food, ItemId.Fish,        10) // cat food
  put(food, ItemId.Bone,        10) // dog food
  world.chests.set(blockKey(c2.x, c2.y, c2.z), food)

  // ── animal farm (fenced area to the east) ─────────────────────────────────
  const fx0 = sx + 6
  const fx1 = sx + 16
  const fz0 = sz - 4
  const fz1 = sz + 4

  // north & south fence rails
  for (let fx = fx0; fx <= fx1; fx++) {
    world.setBlock(fx, h + 1, fz0, BlockId.Plank)
    world.setBlock(fx, h + 1, fz1, BlockId.Plank)
  }
  // west & east fence rails (without corners, already set above)
  for (let fz = fz0 + 1; fz <= fz1 - 1; fz++) {
    world.setBlock(fx0, h + 1, fz, BlockId.Plank)
    world.setBlock(fx1, h + 1, fz, BlockId.Plank)
  }
  // Farm entrance: gap in west fence at centre z
  world.setBlock(fx0, h + 1, sz, BlockId.Air)
}
