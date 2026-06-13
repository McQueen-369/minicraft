import { BlockId } from '../core/blocks'
import { blockKey } from '../core/coords'
import type { FurnitureManager } from '../entities/furnitureManager'
import type { World } from './world'

/**
 * Stamp a small furnished starter house (one bedroom + one living room) at the
 * given column and return a spawn point inside it. Blocks are written as edits
 * so they materialize when the surrounding chunks generate; furniture is placed
 * directly into the furniture manager.
 */
export function buildStarterHouse(world: World, furniture: FurnitureManager, sx: number, sz: number): { x: number; y: number; z: number } {
  const floorY = world.terrain.heightAt(sx, sz)
  const x0 = sx - 4
  const x1 = sx + 4
  const z0 = sz - 3
  const z1 = sz + 3
  const wallTop = floorY + 3
  const roofY = floorY + 4

  const set = (x: number, y: number, z: number, id: number) => world.edits.set(blockKey(x, y, z), id)

  // Clear the interior + wall volume (removes any tree intrusions), then lay the floor.
  for (let x = x0; x <= x1; x++) {
    for (let z = z0; z <= z1; z++) {
      set(x, floorY, z, BlockId.Plank)
      for (let y = floorY + 1; y <= roofY; y++) set(x, y, z, BlockId.Air)
      set(x, roofY, z, BlockId.Plank)
    }
  }

  // Outer walls.
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

  // Interior partition along z = sz, with a 1-wide doorway gap at x = sx - 1.
  for (let y = floorY + 1; y <= wallTop; y++) {
    for (let x = x0 + 1; x <= x1 - 1; x++) {
      if (x === sx - 1 && y <= floorY + 2) continue // interior doorway
      set(x, y, sz, BlockId.Plank)
    }
  }

  // Front doorway (2 tall) in the z1 wall at x = sx.
  set(sx, floorY + 1, z1, BlockId.Air)
  set(sx, floorY + 2, z1, BlockId.Air)

  // Window openings on the side and back walls at eye height.
  const windows: { x: number; y: number; z: number; yaw: number }[] = [
    { x: x0, y: floorY + 2, z: sz, yaw: Math.PI / 2 },
    { x: x1, y: floorY + 2, z: sz, yaw: Math.PI / 2 },
    { x: sx, y: floorY + 2, z: z0, yaw: 0 },
  ]
  for (const w of windows) {
    set(w.x, w.y, w.z, BlockId.Air)
    furniture.place('window', w.x, w.y, w.z, w.yaw)
  }

  // Front door.
  furniture.place('door', sx, floorY + 1, z1, 0)

  // Living room (entrance side: z > sz).
  furniture.place('sofa', sx - 2, floorY + 1, sz + 1, 0)
  furniture.place('desk', sx + 2, floorY + 1, sz + 1, 0)
  furniture.place('chair', sx + 2, floorY + 1, sz + 2, Math.PI)

  // Bedroom (behind the partition: z < sz).
  furniture.place('bed', x0 + 1, floorY + 1, z0 + 1, 0)
  furniture.place('desk', x1 - 1, floorY + 1, z0 + 1, 0)
  furniture.place('chair', x1 - 1, floorY + 1, z0 + 2, Math.PI)

  // Spawn standing on the living-room floor, just inside the door.
  return { x: sx + 0.5, y: floorY + 1.01, z: sz + 1.5 }
}
