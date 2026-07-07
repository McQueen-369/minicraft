import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { WATER_LEVEL } from '../constants'
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
})
