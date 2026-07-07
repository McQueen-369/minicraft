import { BlockId } from '../core/blocks'
import { blockKey, worldToChunk } from '../core/coords'
import type { FurnitureManager } from '../entities/furnitureManager'
import type { Terrain } from './terrain'
import type { World } from './world'

/** Whether chunk (cx,cz) is the one that triggers building the island plaza. */
export function isIslandAnchorChunk(terrain: Terrain, cx: number, cz: number): boolean {
  return worldToChunk(terrain.island.x) === cx && worldToChunk(terrain.island.z) === cz
}

/**
 * Stamp the secret island's arcade plaza: a flattened circle with a stone
 * ring path, a campfire in the middle, four mini-game kiosks facing the
 * centre, and a couple of mystery boxes as an extra reward for explorers.
 * Furniture uses fixed ids so re-building on every session stays idempotent.
 */
export function buildIsland(world: World, furniture: FurnitureManager): void {
  const ix = world.terrain.island.x
  const iz = world.terrain.island.z
  const floorY = world.terrain.heightAt(ix, iz)
  const set = (x: number, y: number, z: number, id: number) => world.edits.set(blockKey(x, y, z), id)

  // Flatten the plaza and clear the air above it.
  const R = 10
  for (let dx = -R; dx <= R; dx++) {
    for (let dz = -R; dz <= R; dz++) {
      if (dx * dx + dz * dz > R * R) continue
      const x = ix + dx
      const z = iz + dz
      set(x, floorY - 1, z, BlockId.Dirt)
      set(x, floorY, z, BlockId.Grass)
      for (let y = floorY + 1; y <= floorY + 5; y++) set(x, y, z, BlockId.Air)
    }
  }

  // Stone ring path connecting the four kiosks.
  const ringR = 6.5
  for (let a = 0; a < 64; a++) {
    const ang = (a / 64) * Math.PI * 2
    set(ix + Math.round(Math.cos(ang) * ringR), floorY, iz + Math.round(Math.sin(ang) * ringR), BlockId.Stone)
  }

  furniture.place('campfire', ix, floorY + 1, iz, 0, 'isle-campfire')

  // Kiosks on the ring, each rotated to face the campfire.
  furniture.place('arcadePuzzle', ix, floorY + 1, iz - 7, 0, 'isle-arcade-puzzle')
  furniture.place('arcadeRunner', ix, floorY + 1, iz + 7, Math.PI, 'isle-arcade-runner')
  furniture.place('arcadeMath', ix - 7, floorY + 1, iz, Math.PI / 2, 'isle-arcade-math')
  furniture.place('arcadeWord', ix + 7, floorY + 1, iz, -Math.PI / 2, 'isle-arcade-word')

  // Bonus mystery boxes tucked at the plaza edge (they respawn per session —
  // the island refreshes its little prizes for returning explorers).
  for (const { x, z } of [{ x: ix + 8, z: iz + 8 }, { x: ix - 8, z: iz - 8 }]) {
    const h = world.terrain.heightAt(x, z)
    set(x, h + 1, z, BlockId.MysteryBoxRare)
  }
}
