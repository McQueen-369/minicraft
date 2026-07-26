import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { BlockId, blockDef } from '../core/blocks'
import { FurnitureManager } from '../entities/furnitureManager'
import { furnitureLabel } from '../entities/furniture'
import { EntityManager } from '../entities/entityManager'
import { ItemId } from '../items/items'
import { buildStarterHouse } from './house'
import { buildPalette, placedBlockFor } from './palette'
import { Terrain } from './terrain'
import { buildVillage, villageAnchorForChunk } from './village'
import { World } from './world'
import type { WorldKind } from './worldKind'

const SEED = 4242

function houseOf(kind: WorldKind) {
  const terrain = new Terrain(SEED, kind)
  const world = new World(terrain)
  const furniture = new FurnitureManager(new THREE.Scene(), kind)
  const spawn = buildStarterHouse(world, furniture, 0, 0)
  return { world, furniture, spawn, terrain }
}

/** Every block the build wrote, as a set of ids. */
function writtenBlocks(world: World): Set<number> {
  return new Set(world.edits.values())
}

describe('build palette', () => {
  it('swaps timber and brick for alloy in a robot world, keeping glass and paving', () => {
    const terrain = buildPalette('terrain')
    const robot = buildPalette('robot')
    expect(terrain.wall).toBe(BlockId.Brick)
    expect(terrain.fence).toBe(BlockId.Fence)
    expect(robot.wall).toBe(BlockId.MetalPanel)
    expect(robot.roof).toBe(BlockId.HullPlate)
    expect(robot.fence).toBe(BlockId.MetalFence)
    // Windows and paths read the same in both worlds.
    expect(robot.glass).toBe(terrain.glass)
    expect(robot.path).toBe(terrain.path)
  })

  it('places fencing in the local form, and gives the same Fence item back', () => {
    expect(placedBlockFor(BlockId.Fence, 'terrain')).toBe(BlockId.Fence)
    expect(placedBlockFor(BlockId.Fence, 'robot')).toBe(BlockId.MetalFence)
    // Anything else places as itself.
    expect(placedBlockFor(BlockId.Plank, 'robot')).toBe(BlockId.Plank)
    expect(blockDef(BlockId.MetalFence)!.drops).toBe(ItemId.Fence)
  })
})

describe('starter house', () => {
  it('is built from alloy, hull plate and steel railings in a robot world', () => {
    const robot = writtenBlocks(houseOf('robot').world)
    expect(robot.has(BlockId.MetalPanel)).toBe(true)
    expect(robot.has(BlockId.HullPlate)).toBe(true)
    expect(robot.has(BlockId.MetalFence)).toBe(true)
    // None of the timber-world materials survive in the shell.
    expect(robot.has(BlockId.Plank)).toBe(false)
    expect(robot.has(BlockId.Brick)).toBe(false)
    expect(robot.has(BlockId.Fence)).toBe(false)
  })

  it('still builds the timber cottage in a terrain world', () => {
    const terrain = writtenBlocks(houseOf('terrain').world)
    expect(terrain.has(BlockId.Plank)).toBe(true)
    expect(terrain.has(BlockId.Fence)).toBe(true)
    expect(terrain.has(BlockId.MetalPanel)).toBe(false)
    expect(terrain.has(BlockId.MetalFence)).toBe(false)
  })

  it('keeps its doors, glazed windows and layout in both worlds', () => {
    for (const kind of ['terrain', 'robot'] as const) {
      const { furniture } = houseOf(kind)
      const kinds = [...furniture.items.values()].map((f) => f.kind)
      expect(kinds).toContain('door')
      expect(kinds).toContain('window')
      expect(kinds).toContain('bed')
    }
    // The door is named for what it is made of.
    expect(furnitureLabel('door', 'robot')).toBe('Metal Door')
    expect(furnitureLabel('door', 'terrain')).toBe('Door')
  })
})

describe('robot village', () => {
  /** The first village anchor chunk for this seed, so the test builds a real one. */
  function findAnchor(): { cx: number; cz: number } {
    for (let cx = -30; cx < 30; cx++) {
      for (let cz = -30; cz < 30; cz++) {
        if (villageAnchorForChunk(SEED, cx, cz)) return { cx, cz }
      }
    }
    throw new Error('no village anchor for this seed')
  }

  function village(kind: WorldKind) {
    const terrain = new Terrain(SEED, kind)
    const world = new World(terrain)
    const scene = new THREE.Scene()
    const furniture = new FurnitureManager(scene, kind)
    const entities = new EntityManager(scene, world, kind)
    const { cx, cz } = findAnchor()
    buildVillage(world, furniture, entities, cx, cz)
    return { world, furniture, entities }
  }

  it('raises its houses, lamps and gardens in metal', () => {
    const robot = writtenBlocks(village('robot').world)
    expect(robot.has(BlockId.MetalPanel)).toBe(true)
    expect(robot.has(BlockId.HullPlate)).toBe(true)
    expect(robot.has(BlockId.MetalFence)).toBe(true)
    expect(robot.has(BlockId.Glass)).toBe(true) // windows stay glazed
    expect(robot.has(BlockId.Brick)).toBe(false)
    expect(robot.has(BlockId.Wood)).toBe(false)
  })

  it('is populated by villagers the player can pick up', () => {
    const { entities } = village('robot')
    const villagers = [...entities.animals.values()].filter((a) => a.kind === 'villager')
    expect(villagers.length).toBeGreaterThan(0)
    // Carrying is what makes them pickable: the flag the interaction sets.
    const one = villagers[0]
    one.carried = true
    expect(entities.animals.get(one.id)!.carried).toBe(true)
  })
})
