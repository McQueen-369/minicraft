import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { BlockId } from '../core/blocks'
import { FurnitureManager } from '../entities/furnitureManager'
import { buildStarterHouse } from './house'
import { Terrain } from './terrain'
import { World } from './world'

describe('buildStarterHouse', () => {
  it('stamps a furnished house and returns a spawn inside it', () => {
    const world = new World(new Terrain(99))
    const fm = new FurnitureManager(new THREE.Scene())
    const spawn = buildStarterHouse(world, fm, 0, 0)

    // Furniture: a door, windows, and room pieces are present.
    const kinds = [...fm.items.values()].map((f) => f.kind)
    expect(kinds).toContain('door')
    expect(kinds).toContain('bed')
    expect(kinds).toContain('sofa')
    expect(kinds.filter((k) => k === 'window').length).toBeGreaterThanOrEqual(2)

    // The floor under the spawn is a solid plank.
    const floorY = world.terrain.heightAt(0, 0)
    expect(world.getBlock(0, floorY, 0)).toBe(BlockId.Plank)

    // Spawn sits just above the floor.
    expect(spawn.y).toBeGreaterThan(floorY)
    expect(spawn.y).toBeLessThan(floorY + 2)
  })
})
