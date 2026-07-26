import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../core/rng'
import { blockDef, BlockId } from '../core/blocks'
import { RECIPES } from '../items/crafting'
import { itemDef, ItemId } from '../items/items'
import type { SolidSampler } from '../player/physics'
import { Terrain } from '../world/terrain'
import { WATER_LEVEL } from '../constants'
import type { Animal } from './animal'
import { stepAnimal, HOSTILE_AGGRO_RANGE, type AnimalContext } from './animalAI'

const floor: SolidSampler = (_x, y) => y < 10

function zombie(): Animal {
  return {
    id: 'z1',
    kind: 'zombie',
    pos: { x: 0.5, y: 10.01, z: 0.5 },
    vel: { x: 0, y: 0, z: 0 },
    yaw: 0,
    mode: 'wander',
    owner: null,
    onGround: true,
    decideIn: 0,
    walking: false,
    walkPhase: 0,
    health: 24,
  }
}

function ctx(overrides: Partial<AnimalContext> = {}): AnimalContext {
  return { isSolid: floor, ownerPos: null, rand: mulberry32(7), ...overrides }
}

describe('zombie AI', () => {
  it('chases the hunted player when within aggro range', () => {
    const z = zombie()
    const c = ctx({ huntPos: { x: 12.5, y: 10, z: 0.5 } })
    for (let i = 0; i < 600; i++) stepAnimal(z, 1 / 30, c)
    const d = Math.hypot(12.5 - z.pos.x, 0.5 - z.pos.z)
    expect(d).toBeLessThan(2) // closed most of the gap
  })

  it('stops advancing at striking distance instead of standing inside the player', () => {
    const z = zombie()
    const c = ctx({ huntPos: { x: 3.5, y: 10, z: 0.5 } })
    for (let i = 0; i < 900; i++) stepAnimal(z, 1 / 30, c)
    const d = Math.hypot(3.5 - z.pos.x, 0.5 - z.pos.z)
    expect(d).toBeGreaterThan(0.5)
  })

  it('does not chase players beyond its aggro range', () => {
    const z = zombie()
    const far = HOSTILE_AGGRO_RANGE + 20
    const c = ctx({ huntPos: { x: far + 0.5, y: 10, z: 0.5 } })
    for (let i = 0; i < 300; i++) stepAnimal(z, 1 / 30, c)
    // Shambling randomly, it should not have closed in on the distant target.
    const d = Math.hypot(far + 0.5 - z.pos.x, 0.5 - z.pos.z)
    expect(d).toBeGreaterThan(far - 15)
  })
})

describe('swords and diamonds', () => {
  it('gives every sword tier increasing damage', () => {
    const sword = itemDef(ItemId.Sword)!
    const iron = itemDef(ItemId.IronSword)!
    const diamond = itemDef(ItemId.DiamondSword)!
    expect(sword.damage!).toBeGreaterThan(1)
    expect(iron.damage!).toBeGreaterThan(sword.damage!)
    expect(diamond.damage!).toBeGreaterThan(iron.damage!)
  })

  it('drops a diamond gem when diamond ore is mined', () => {
    expect(blockDef(BlockId.DiamondOre)!.drops).toBe(ItemId.Diamond)
  })

  it('has forging recipes that upgrade the sword via bought materials', () => {
    const iron = RECIPES.find((r) => r.id === 'iron-sword')!
    expect(iron.inputs).toContainEqual({ itemId: ItemId.Sword, count: 1 })
    expect(iron.inputs).toContainEqual({ itemId: ItemId.IronBlade, count: 1 })
    expect(iron.output.itemId).toBe(ItemId.IronSword)
    const diamond = RECIPES.find((r) => r.id === 'diamond-sword')!
    expect(diamond.inputs).toContainEqual({ itemId: ItemId.IronSword, count: 1 })
    expect(diamond.inputs).toContainEqual({ itemId: ItemId.DiamondEdge, count: 1 })
    expect(diamond.output.itemId).toBe(ItemId.DiamondSword)
  })

  it('generates diamond ore deep underground but never near the surface', () => {
    const terrain = new Terrain(1234)
    let deepDiamonds = 0
    for (let x = -64; x < 64; x += 2) {
      for (let z = -64; z < 64; z += 2) {
        const h = terrain.heightAt(x, z)
        if (h <= WATER_LEVEL + 1) continue
        // The shallow band must stay diamond-free.
        for (let y = h - 5; y <= h; y++) {
          expect(terrain.generateBlock(x, y, z)).not.toBe(BlockId.DiamondOre)
        }
        for (let y = 2; y < h - 6; y++) {
          if (terrain.generateBlock(x, y, z) === BlockId.DiamondOre) deepDiamonds++
        }
      }
    }
    expect(deepDiamonds).toBeGreaterThan(0)
  })
})
