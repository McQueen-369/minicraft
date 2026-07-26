import { describe, expect, it } from 'vitest'
import { CHUNK_SIZE, WATER_LEVEL } from '../constants'
import { BlockId, blockDef } from '../core/blocks'
import { localIndex } from '../core/coords'
import { isHostile } from '../entities/animal'
import { chestLoot } from '../items/chest'
import { itemDef, ItemId } from '../items/items'
import { Terrain } from './terrain'
import { normalizeWorldKind, WORLD_KIND_LABEL } from './worldKind'

const SEED = 20260726

/** First column in the scanned range that generates a canned-food tin. */
function findCan(t: Terrain, span = 220): { x: number; z: number } | null {
  for (let x = -span; x < span; x++) {
    for (let z = -span; z < span; z++) {
      if (t.cannedFoodAt(x, z)) return { x, z }
    }
  }
  return null
}

describe('world kinds', () => {
  it('labels both kinds and reads anything unknown as terrain', () => {
    expect(WORLD_KIND_LABEL.terrain).toBe('Terrain World')
    expect(WORLD_KIND_LABEL.robot).toBe('Robot World')
    expect(normalizeWorldKind('robot')).toBe('robot')
    expect(normalizeWorldKind(undefined)).toBe('terrain')
    expect(normalizeWorldKind('nonsense')).toBe('terrain')
  })

  it('shares the terrain shape and the secret island between kinds', () => {
    const terrain = new Terrain(SEED)
    const robot = new Terrain(SEED, 'robot')
    expect(robot.island).toEqual(terrain.island)
    for (let x = -120; x < 120; x += 11) {
      for (let z = -120; z < 120; z += 11) {
        expect(robot.heightAt(x, z)).toBe(terrain.heightAt(x, z))
      }
    }
  })
})

describe('robot world surface', () => {
  it('caps dry land with metal panelling instead of grass', () => {
    const robot = new Terrain(SEED, 'robot')
    expect(robot.surfaceBlock).toBe(BlockId.MetalPanel)
    let checked = 0
    for (let x = -60; x < 60 && checked < 20; x += 7) {
      for (let z = -60; z < 60 && checked < 20; z += 7) {
        const h = robot.heightAt(x, z)
        if (h <= WATER_LEVEL + 2) continue
        const top = robot.generateBlock(x, h, z)
        if (top === BlockId.GoldOre) continue // rare surface outcrop
        expect(top).toBe(BlockId.MetalPanel)
        checked++
      }
    }
    expect(checked).toBeGreaterThan(0)
  })

  it('keeps stone, ore and lava underground exactly as a terrain world does', () => {
    const terrain = new Terrain(SEED)
    const robot = new Terrain(SEED, 'robot')
    for (let x = -40; x < 40; x += 9) {
      for (let z = -40; z < 40; z += 9) {
        const h = robot.heightAt(x, z)
        for (let y = 1; y < h - 3; y += 5) {
          expect(robot.generateBlock(x, y, z)).toBe(terrain.generateBlock(x, y, z))
        }
      }
    }
  })
})

describe('canned food', () => {
  it('only stands in robot worlds, and never in a terrain world', () => {
    expect(findCan(new Terrain(SEED))).toBeNull()
    expect(findCan(new Terrain(SEED, 'robot'))).not.toBeNull()
  })

  it('generates on top of the ground in both generation paths', () => {
    const robot = new Terrain(SEED, 'robot')
    const can = findCan(robot)!
    const h = robot.heightAt(can.x, can.z)
    expect(robot.generateBlock(can.x, h + 1, can.z)).toBe(BlockId.CannedFood)

    const cx = Math.floor(can.x / CHUNK_SIZE)
    const cz = Math.floor(can.z / CHUNK_SIZE)
    const data = robot.generateChunkData(cx, cz)
    const lx = can.x - cx * CHUNK_SIZE
    const lz = can.z - cz * CHUNK_SIZE
    expect(data[localIndex(lx, h + 1, lz)]).toBe(BlockId.CannedFood)
  })

  it('opens into an edible ration rather than a carryable tin', () => {
    const tin = blockDef(BlockId.CannedFood)!
    expect(tin.drops).toBe(ItemId.CannedFood)
    // The block itself is world-only: mining it yields food, not a placeable can.
    expect(itemDef(BlockId.CannedFood)).toBeNull()
    const food = itemDef(ItemId.CannedFood)!
    expect(food.name).toBe('Canned Food')
    expect(food.energy).toBeGreaterThan(0)
  })

  it('replaces apples in robot-world chest loot, since no apple trees grow there', () => {
    const robot = new Terrain(SEED, 'robot')
    for (let x = -80; x < 80; x += 13) {
      for (let z = -80; z < 80; z += 13) expect(robot.isAppleTree(x, z)).toBe(false)
    }
    const ids = (loot: ReturnType<typeof chestLoot>) => loot.filter(Boolean).map((s) => s!.itemId)
    expect(ids(chestLoot(SEED, 4, 4, 'robot'))).toContain(ItemId.CannedFood)
    expect(ids(chestLoot(SEED, 4, 4, 'robot'))).not.toContain(ItemId.Apple)
    expect(ids(chestLoot(SEED, 4, 4))).toContain(ItemId.Apple)
  })
})

describe('bad robots', () => {
  it('counts as a hostile night mob alongside zombies', () => {
    expect(isHostile('robot')).toBe(true)
    expect(isHostile('zombie')).toBe(true)
    expect(isHostile('pig')).toBe(false)
  })
})
