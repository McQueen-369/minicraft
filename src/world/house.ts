import { BlockId } from '../core/blocks'
import { blockKey } from '../core/coords'
import type { FurnitureManager } from '../entities/furnitureManager'
import type { World } from './world'

/**
 * Stamp a furnished starter house (bedroom + living room) with an adjoining
 * fenced animal farm at the given column, and return a spawn point inside it.
 * The whole yard is flattened to one level so the player can walk in and out of
 * the door without mining or being blocked. Blocks are written as edits (so
 * they materialize when chunks generate); furniture is placed directly.
 */
export function buildStarterHouse(world: World, furniture: FurnitureManager, sx: number, sz: number): { x: number; y: number; z: number } {
  const floorY = world.terrain.heightAt(sx, sz)
  const set = (x: number, y: number, z: number, id: number) => world.edits.set(blockKey(x, y, z), id)

  // House footprint (roughly double the original size).
  const x0 = sx - 8
  const x1 = sx + 8
  const z0 = sz - 6
  const z1 = sz + 6
  const wallTop = floorY + 3
  const roofY = floorY + 4

  // Farm pen, just to the +x side of the house.
  const farmX0 = x1 + 2
  const farmX1 = x1 + 13
  const farmZ0 = sz - 5
  const farmZ1 = sz + 5
  const fenceTop = floorY + 2 // 2 tall so animals (which hop 1 block) stay in

  // Flatten the whole yard (house + farm + a margin) to floorY: grass on top,
  // solid dirt below, clear air above. Walls/floors are stamped over this.
  const yx0 = x0 - 3
  const yx1 = farmX1 + 3
  const yz0 = Math.min(z0, farmZ0) - 3
  const yz1 = Math.max(z1, farmZ1) + 3
  for (let x = yx0; x <= yx1; x++) {
    for (let z = yz0; z <= yz1; z++) {
      set(x, floorY - 1, z, BlockId.Dirt)
      set(x, floorY, z, BlockId.Grass)
      for (let y = floorY + 1; y <= roofY + 1; y++) set(x, y, z, BlockId.Air)
    }
  }

  // ---- House -------------------------------------------------------------
  for (let x = x0; x <= x1; x++) {
    for (let z = z0; z <= z1; z++) {
      set(x, floorY, z, BlockId.Plank) // interior floor
      set(x, roofY, z, BlockId.Plank) // roof
    }
  }
  for (let y = floorY + 1; y <= wallTop; y++) {
    for (let x = x0; x <= x1; x++) {
      set(x, y, z0, BlockId.Brick)
      set(x, y, z1, BlockId.Brick)
    }
    for (let z = z0; z <= z1; z++) {
      set(x0, y, z, BlockId.Brick)
      set(x1, y, z, BlockId.Brick)
    }
  }
  // Interior partition along z = sz with a 2-wide doorway around x = sx - 1.
  for (let y = floorY + 1; y <= wallTop; y++) {
    for (let x = x0 + 1; x <= x1 - 1; x++) {
      if ((x === sx - 1 || x === sx - 2) && y <= floorY + 2) continue
      set(x, y, sz, BlockId.Plank)
    }
  }
  // Front doorway (2 tall) in the z1 wall at x = sx.
  set(sx, floorY + 1, z1, BlockId.Air)
  set(sx, floorY + 2, z1, BlockId.Air)
  furniture.place('door', sx, floorY + 1, z1, 0)

  // Windows on side and back walls at eye height.
  const windows: { x: number; y: number; z: number; yaw: number }[] = [
    { x: x0, y: floorY + 2, z: sz - 3, yaw: Math.PI / 2 },
    { x: x0, y: floorY + 2, z: sz + 3, yaw: Math.PI / 2 },
    { x: x1, y: floorY + 2, z: sz - 3, yaw: Math.PI / 2 },
    { x: x1, y: floorY + 2, z: sz + 3, yaw: Math.PI / 2 },
    { x: sx - 3, y: floorY + 2, z: z0, yaw: 0 },
    { x: sx + 3, y: floorY + 2, z: z0, yaw: 0 },
  ]
  for (const w of windows) {
    set(w.x, w.y, w.z, BlockId.Air)
    furniture.place('window', w.x, w.y, w.z, w.yaw)
  }

  // Living room (entrance side: z > sz).
  furniture.place('sofa', sx - 4, floorY + 1, z1 - 1, 0)
  furniture.place('sofa', sx + 3, floorY + 1, z1 - 1, 0)
  furniture.place('desk', sx + 5, floorY + 1, sz + 2, 0)
  furniture.place('chair', sx + 5, floorY + 1, sz + 3, Math.PI)
  furniture.place('chair', sx - 6, floorY + 1, sz + 2, 0)

  // Bedroom (behind the partition: z < sz).
  furniture.place('bed', x0 + 2, floorY + 1, z0 + 1, 0)
  furniture.place('bed', x1 - 2, floorY + 1, z0 + 1, 0)
  furniture.place('desk', sx, floorY + 1, z0 + 1, 0)
  furniture.place('chair', sx, floorY + 1, z0 + 2, Math.PI)

  // ---- Farm pen ----------------------------------------------------------
  for (let y = floorY + 1; y <= fenceTop; y++) {
    for (let x = farmX0; x <= farmX1; x++) {
      set(x, y, farmZ0, BlockId.Plank)
      set(x, y, farmZ1, BlockId.Plank)
    }
    for (let z = farmZ0; z <= farmZ1; z++) {
      set(farmX1, y, z, BlockId.Plank)
      // Gate opening on the house-facing wall at z = sz.
      if (z === sz || z === sz - 1) continue
      set(farmX0, y, z, BlockId.Plank)
    }
  }
  // A door as the farm gate.
  furniture.place('door', farmX0, floorY + 1, sz, Math.PI / 2)

  // Spawn standing on the living-room floor, just inside the front door.
  return { x: sx + 0.5, y: floorY + 1.01, z: sz + 2.5 }
}
