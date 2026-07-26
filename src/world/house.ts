import { BlockId } from '../core/blocks'
import type { FurnitureManager } from '../entities/furnitureManager'
import { flattenSite, type SetBlock } from './ground'
import { buildPalette } from './palette'
import type { World } from './world'

/**
 * Stamp a furnished starter house (bedroom + living room) with an adjoining
 * fenced animal farm at the given column, and return a spawn point inside it.
 * The house reads like a real cottage: plank walls with wood corner posts and
 * a pitched, overhanging shingle gable roof; the farm pen next door is ringed
 * by fences instead of solid walls. A robot world builds the same cottage out
 * of alloy panelling, hull sheeting and steel railings. The whole yard is flattened
 * to one level so the player can walk in and out of the door without mining.
 * Blocks are written as edits (so they materialize when chunks generate);
 * furniture is placed directly.
 */
export function buildStarterHouse(world: World, furniture: FurnitureManager, sx: number, sz: number): { x: number; y: number; z: number } {
  const floorY = world.terrain.heightAt(sx, sz)
  const set: SetBlock = (x, y, z, id) => world.setBlock(x, y, z, id)
  const mat = buildPalette(world.terrain.kind)

  // House footprint (roughly double the original size).
  const x0 = sx - 8
  const x1 = sx + 8
  const z0 = sz - 6
  const z1 = sz + 6
  const wallTop = floorY + 3
  /** Roof rises 1 block per row of depth, capped at the ridge. */
  const ROOF_PITCH_MAX = 4
  const roofPeak = wallTop + ROOF_PITCH_MAX

  // Farm pen, just to the +x side of the house.
  const farmX0 = x1 + 2
  const farmX1 = x1 + 13
  const farmZ0 = sz - 5
  const farmZ1 = sz + 5
  const fenceTop = floorY + 2 // 2 tall so animals (which hop 1 block) stay in

  // Flatten the whole yard (house + farm + a margin) to floorY: grass on top,
  // solid dirt below, clear air above (high enough to clear the roof peak).
  const yx0 = x0 - 3
  const yx1 = farmX1 + 3
  const yz0 = Math.min(z0, farmZ0) - 3
  const yz1 = Math.max(z1, farmZ1) + 3
  // flattenSite packs each column from the natural surface up to the floor, so
  // the yard never ends up as a shelf of grass hanging over open air.
  flattenSite(world.terrain, set, { x0: yx0, x1: yx1, z0: yz0, z1: yz1, floorY, clearance: roofPeak - floorY + 2 })

  // ---- House shell ---------------------------------------------------------
  // Floor.
  for (let x = x0; x <= x1; x++) {
    for (let z = z0; z <= z1; z++) {
      set(x, floorY, z, mat.floor)
    }
  }
  // Walls: cladding with sturdy posts on the corners.
  for (let y = floorY + 1; y <= wallTop; y++) {
    for (let x = x0; x <= x1; x++) {
      set(x, y, z0, mat.floor)
      set(x, y, z1, mat.floor)
    }
    for (let z = z0; z <= z1; z++) {
      set(x0, y, z, mat.floor)
      set(x1, y, z, mat.floor)
    }
    for (const [cx, cz] of [[x0, z0], [x0, z1], [x1, z0], [x1, z1]] as const) {
      set(cx, y, cz, mat.post)
    }
  }

  // Pitched gable roof: "shingle" rows climbing from both z-sides toward
  // a flat ridge over the middle, overhanging the walls by one block.
  for (let z = z0 - 1; z <= z1 + 1; z++) {
    const stepsFromEdge = Math.min(z - (z0 - 1), (z1 + 1) - z)
    const ry = wallTop + 1 + Math.min(stepsFromEdge, ROOF_PITCH_MAX)
    for (let x = x0 - 1; x <= x1 + 1; x++) {
      set(x, ry, z, mat.roof)
    }
  }
  // Gable end walls: fill the triangles under the roof line on the
  // x0 / x1 walls so the attic is closed in.
  for (let z = z0; z <= z1; z++) {
    const stepsFromEdge = Math.min(z - (z0 - 1), (z1 + 1) - z)
    const ry = wallTop + 1 + Math.min(stepsFromEdge, ROOF_PITCH_MAX)
    for (let y = wallTop + 1; y < ry; y++) {
      set(x0, y, z, mat.floor)
      set(x1, y, z, mat.floor)
    }
  }
  // Ceiling over the rooms (attic floor) so the interior feels finished.
  for (let x = x0 + 1; x <= x1 - 1; x++) {
    for (let z = z0 + 1; z <= z1 - 1; z++) {
      set(x, wallTop + 1, z, mat.floor)
    }
  }

  // Interior partition along z = sz with a 2-wide doorway around x = sx - 1.
  for (let y = floorY + 1; y <= wallTop; y++) {
    for (let x = x0 + 1; x <= x1 - 1; x++) {
      if ((x === sx - 1 || x === sx - 2) && y <= floorY + 2) continue
      set(x, y, sz, mat.floor)
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

  // Chimney (an exhaust stack in a robot world) poking through the roof.
  const chimX = x0 + 2
  const chimZ = z0 + 1
  for (let y = wallTop + 1; y <= roofPeak + 1; y++) set(chimX, y, chimZ, mat.stack)

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

  // ---- Farm pen: a proper fenced yard with corner posts -------------------
  for (let y = floorY + 1; y <= fenceTop; y++) {
    for (let x = farmX0; x <= farmX1; x++) {
      set(x, y, farmZ0, mat.fence)
      set(x, y, farmZ1, mat.fence)
    }
    for (let z = farmZ0; z <= farmZ1; z++) {
      set(farmX1, y, z, mat.fence)
      // Gate opening on the house-facing wall at z = sz.
      if (z === sz || z === sz - 1) continue
      set(farmX0, y, z, mat.fence)
    }
    for (const [cx, cz] of [[farmX0, farmZ0], [farmX0, farmZ1], [farmX1, farmZ0], [farmX1, farmZ1]] as const) {
      set(cx, y, cz, mat.post)
    }
  }
  // A door as the farm gate.
  furniture.place('door', farmX0, floorY + 1, sz, Math.PI / 2)

  // Spawn standing on the living-room floor, just inside the front door.
  return { x: sx + 0.5, y: floorY + 1.01, z: sz + 2.5 }
}
