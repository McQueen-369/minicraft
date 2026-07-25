import { describe, expect, it } from 'vitest'
import { WATER_LEVEL } from '../constants'
import { BlockId } from '../core/blocks'
import { flattenSite, supportColumn } from './ground'
import type { Terrain } from './terrain'

/** Terrain stub with a controllable surface height. */
function terrainAt(heightAt: (x: number, z: number) => number): Terrain {
  return { heightAt } as unknown as Terrain
}

function recorder() {
  const blocks = new Map<string, number>()
  return {
    blocks,
    set: (x: number, y: number, z: number, id: number) => blocks.set(`${x},${y},${z}`, id),
    at: (x: number, y: number, z: number) => blocks.get(`${x},${y},${z}`),
  }
}

describe('flattenSite', () => {
  it('packs a column from the natural surface up to the floor', () => {
    const rec = recorder()
    flattenSite(terrainAt(() => 40), rec.set, { x0: 0, x1: 0, z0: 0, z1: 0, floorY: 45 })
    for (let y = 41; y <= 44; y++) expect(rec.at(0, y, 0)).toBe(BlockId.Dirt)
    expect(rec.at(0, 45, 0)).toBe(BlockId.Grass)
    expect(rec.at(0, 40, 0)).toBeUndefined() // natural ground is left alone
  })

  it('uses sand for the part of the embankment below the waterline', () => {
    const rec = recorder()
    const floorY = WATER_LEVEL + 3
    flattenSite(terrainAt(() => WATER_LEVEL - 4), rec.set, { x0: 0, x1: 0, z0: 0, z1: 0, floorY })
    expect(rec.at(0, WATER_LEVEL - 1, 0)).toBe(BlockId.Sand)
    expect(rec.at(0, WATER_LEVEL, 0)).toBe(BlockId.Sand)
    expect(rec.at(0, WATER_LEVEL + 1, 0)).toBe(BlockId.Dirt)
  })

  it('cuts away ground and trees standing above the floor', () => {
    const rec = recorder()
    flattenSite(terrainAt(() => 50), rec.set, { x0: 0, x1: 0, z0: 0, z1: 0, floorY: 45, clearance: 1 })
    expect(rec.at(0, 45, 0)).toBe(BlockId.Grass)
    for (let y = 46; y <= 55; y++) expect(rec.at(0, y, 0)).toBe(BlockId.Air)
  })

  it('honours the footprint mask', () => {
    const rec = recorder()
    flattenSite(terrainAt(() => 40), rec.set, {
      x0: -2,
      x1: 2,
      z0: 0,
      z1: 0,
      floorY: 44,
      inside: (x) => x === 0,
    })
    expect(rec.at(0, 44, 0)).toBe(BlockId.Grass)
    expect(rec.at(1, 44, 0)).toBeUndefined()
  })

  it('takes a custom surface cap', () => {
    const rec = recorder()
    flattenSite(terrainAt(() => 40), rec.set, { x0: 0, x1: 0, z0: 0, z1: 0, floorY: 42, cap: BlockId.Stone })
    expect(rec.at(0, 42, 0)).toBe(BlockId.Stone)
  })
})

describe('supportColumn', () => {
  it('bridges the gap under a single block', () => {
    const rec = recorder()
    supportColumn(terrainAt(() => 30), rec.set, 5, 6, 34)
    expect([31, 32, 33].map((y) => rec.at(5, y, 6))).toEqual([BlockId.Dirt, BlockId.Dirt, BlockId.Dirt])
    expect(rec.at(5, 34, 6)).toBeUndefined()
  })

  it('writes nothing when the ground is already at the floor', () => {
    const rec = recorder()
    supportColumn(terrainAt(() => 34), rec.set, 0, 0, 34)
    expect(rec.blocks.size).toBe(0)
  })
})
