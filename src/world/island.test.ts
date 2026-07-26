import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { WATER_LEVEL } from '../constants'
import { BlockId } from '../core/blocks'
import { FurnitureManager } from '../entities/furnitureManager'
import { buildIsland, isIslandAnchorChunk } from './island'
import { ISLAND_CORE, ISLAND_OUTER, Terrain } from './terrain'
import { World } from './world'

describe('secret island', () => {
  it('places a dry island core inside an underwater moat ring', () => {
    for (const seed of [1, 42, 987654]) {
      const t = new Terrain(seed)
      const { x, z } = t.island
      // Core is dry land.
      expect(t.heightAt(x, z)).toBeGreaterThan(WATER_LEVEL + 1)
      // The ring between core and outer edge is flooded on all four sides.
      const mid = Math.round((ISLAND_CORE + ISLAND_OUTER) / 2)
      for (const [dx, dz] of [[mid, 0], [-mid, 0], [0, mid], [0, -mid]]) {
        expect(t.heightAt(x + dx, z + dz)).toBeLessThan(WATER_LEVEL)
      }
      // Island sits a few hundred blocks from the origin.
      expect(Math.hypot(x, z)).toBeGreaterThan(200)
    }
  })

  it('is deterministic per seed', () => {
    expect(new Terrain(7).island).toEqual(new Terrain(7).island)
    expect(new Terrain(7).island).not.toEqual(new Terrain(8).island)
  })

  it('builds four arcade kiosks with stable ids on the anchor chunk', () => {
    const world = new World(new Terrain(7))
    const fm = new FurnitureManager(new THREE.Scene())
    buildIsland(world, fm)
    buildIsland(world, fm) // idempotent: fixed ids overwrite, not duplicate
    const kinds = [...fm.items.values()].map((f) => f.kind)
    expect(kinds.filter((k) => k.startsWith('arcade')).length).toBe(4)
    expect(kinds).toContain('arcadePuzzle')
    expect(kinds).toContain('arcadeRunner')
    expect(kinds).toContain('arcadeMath')
    expect(kinds).toContain('arcadeWord')

    const t = world.terrain
    const cx = Math.floor(t.island.x / 16)
    const cz = Math.floor(t.island.z / 16)
    expect(isIslandAnchorChunk(t, cx, cz)).toBe(true)
    expect(isIslandAnchorChunk(t, cx + 1, cz)).toBe(false)
  })

  it('dresses the plaza: paving, podiums, lamps, palms and a fenced rim', () => {
    const world = new World(new Terrain(11))
    const fm = new FurnitureManager(new THREE.Scene())
    buildIsland(world, fm)
    const { x: ix, z: iz } = world.terrain.island
    const floorY = world.terrain.heightAt(ix, iz)

    // Paved courtyard with a brick cross through the campfire.
    expect(world.getBlock(ix, floorY, iz + 2)).toBe(BlockId.Brick)
    expect(world.getBlock(ix + 2, floorY, iz + 2)).toBe(BlockId.Plank)
    // Beach rim blends the plaza into the shoreline.
    expect(world.getBlock(ix, floorY, iz + 13)).toBe(BlockId.Sand)
    // Each kiosk stands on a raised podium.
    expect(world.getBlock(ix, floorY + 1, iz - 7)).toBe(BlockId.Stone)
    expect(world.getBlock(ix + 1, floorY + 1, iz - 8)).toBe(BlockId.Brick)
    // Fence rim, with the diagonals left open as gates.
    expect(world.getBlock(ix, floorY + 1, iz - 13)).toBe(BlockId.Fence)
    expect(world.getBlock(ix + 9, floorY + 1, iz + 9)).not.toBe(BlockId.Fence)
    // A palm grove, off both the kiosk sightlines and the gate lanes.
    expect(world.getBlock(ix + 10, floorY + 3, iz + 4)).toBe(BlockId.Wood)
    // Lantern posts flank every kiosk (8), plus two at the beacon.
    const lanterns = [...fm.items.values()].filter((f) => f.kind === 'lantern')
    expect(lanterns.length).toBe(10)
  })
})
