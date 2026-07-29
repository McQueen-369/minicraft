// @vitest-environment jsdom
import * as THREE from 'three'
import { beforeEach, describe, expect, it } from 'vitest'
import { BlockId } from '../core/blocks'
import { Inventory } from '../items/inventory'
import { ItemId } from '../items/items'
import type { EntityManager } from '../entities/entityManager'
import type { FurnitureManager } from '../entities/furnitureManager'
import type { Player } from '../player/player'
import type { Controls } from '../player/controls'
import type { World } from '../world/world'
import { BlockInteraction } from './blockInteraction'

/**
 * A sparse voxel world keyed by "x,y,z". Only the handful of World members
 * BlockInteraction actually reaches for are implemented.
 */
class FakeWorld {
  readonly blocks = new Map<string, number>()
  readonly terrain = { kind: 'terrain' as const }

  getBlock(x: number, y: number, z: number): number {
    return this.blocks.get(`${x},${y},${z}`) ?? BlockId.Air
  }
  setBlock(x: number, y: number, z: number, id: number): void {
    if (id === BlockId.Air) this.blocks.delete(`${x},${y},${z}`)
    else this.blocks.set(`${x},${y},${z}`, id)
  }
  getChestContents(): never[] { return [] }
  isTreasureChest(): boolean { return false }
}

const noEntities = {
  animals: new Map(),
  raycastAnimal: () => null,
} as unknown as EntityManager

const noFurniture = {
  raycast: () => null,
  occupied: () => false,
} as unknown as FurnitureManager

/**
 * Player standing at the origin looking straight down the +x axis, so the
 * first block at x >= 1 on the y = 0 row is what the crosshair picks up.
 */
function makeHarness() {
  const world = new FakeWorld()
  const inventory = new Inventory()
  const player = {
    state: { pos: { x: 0.5, y: 0, z: 0.5 } },
    eyePosition: new THREE.Vector3(0.5, 0.5, 0.5),
  } as unknown as Player
  const controls = {
    isLocked: true,
    isTouchDevice: false,
    gameplayInput: true,
    yaw: 0,
    keys: new Set<string>(),
  } as unknown as Controls
  const camera = new THREE.PerspectiveCamera()
  // Look down +x: rotating -90° about Y turns the camera's -z forward onto +x.
  camera.rotation.set(0, -Math.PI / 2, 0)
  camera.updateMatrixWorld(true)

  const interaction = new BlockInteraction(
    world as unknown as World,
    inventory,
    noEntities,
    noFurniture,
    player,
    controls,
    camera,
    new THREE.Scene(),
    'p1',
  )
  return { world, inventory, interaction }
}

/** Press and release the mine button (the ignite / dig action). */
function mineClick(): void {
  document.dispatchEvent(new MouseEvent('mousedown', { button: 0 }))
  document.dispatchEvent(new MouseEvent('mouseup', { button: 0 }))
}

/** Press the use button (place / interact). */
function useClick(): void {
  document.dispatchEvent(new MouseEvent('mousedown', { button: 2 }))
}

describe('TNT', () => {
  let h: ReturnType<typeof makeHarness>

  beforeEach(() => {
    h = makeHarness()
  })

  it('does not light a fuse when TNT is placed', () => {
    // A stone block to aim at, with the placement landing on its -x face.
    h.world.setBlock(3, 0, 0, BlockId.Stone)
    h.inventory.add(ItemId.TNT, 5)
    h.interaction.update(0)
    useClick()

    expect(h.world.getBlock(2, 0, 0)).toBe(BlockId.TNT)
    // Far longer than the 2s fuse: an unlit stick just sits there.
    h.interaction.update(10)
    expect(h.world.getBlock(2, 0, 0)).toBe(BlockId.TNT)
  })

  it('stacks TNT on top of placed TNT instead of igniting it', () => {
    h.world.setBlock(3, 0, 0, BlockId.Stone)
    h.inventory.add(ItemId.TNT, 5)
    h.interaction.update(0)
    useClick() // places at (2,0,0)
    h.interaction.update(0)
    useClick() // aims at the new TNT, places against its -x face

    expect(h.world.getBlock(2, 0, 0)).toBe(BlockId.TNT)
    expect(h.world.getBlock(1, 0, 0)).toBe(BlockId.TNT)
    h.interaction.update(10)
    expect(h.world.getBlock(2, 0, 0)).toBe(BlockId.TNT)
    expect(h.world.getBlock(1, 0, 0)).toBe(BlockId.TNT)
  })

  it('lights the fuse with the mining action, and detonates after it burns down', () => {
    h.world.setBlock(3, 0, 0, BlockId.TNT)
    h.interaction.update(0)

    let primed = 0
    h.interaction.onTntPrimed = () => { primed++ }
    mineClick()
    expect(primed).toBe(1)

    h.interaction.update(1)
    expect(h.world.getBlock(3, 0, 0)).toBe(BlockId.TNT) // fuse still burning
    h.interaction.update(1.5)
    expect(h.world.getBlock(3, 0, 0)).toBe(BlockId.Air)
  })

  it('sets off a whole stack from one lit stick', () => {
    for (let y = 0; y <= 2; y++) h.world.setBlock(3, y, 0, BlockId.TNT)
    h.interaction.update(0)
    mineClick()

    h.interaction.update(2.5) // first stick blows, lighting its neighbours
    h.interaction.update(1) // their short chain fuses run out
    for (let y = 0; y <= 2; y++) expect(h.world.getBlock(3, y, 0)).toBe(BlockId.Air)
  })

  it('does not mine the block whose fuse the same press just lit', () => {
    h.world.setBlock(3, 0, 0, BlockId.TNT)
    h.interaction.update(0)
    document.dispatchEvent(new MouseEvent('mousedown', { button: 0 }))

    // Hold well past TNT's break time — the arming press is spent, not a swing.
    h.interaction.update(1)
    expect(h.world.getBlock(3, 0, 0)).toBe(BlockId.TNT)
    expect(h.inventory.countOf(ItemId.TNT)).toBe(0)
  })

  it('defuses a lit stick when it is mined, returning it to the bag', () => {
    h.world.setBlock(3, 0, 0, BlockId.TNT)
    h.interaction.update(0)
    mineClick() // light it

    // A second press on an already-lit stick falls through to normal mining.
    document.dispatchEvent(new MouseEvent('mousedown', { button: 0 }))
    h.interaction.update(1)
    expect(h.world.getBlock(3, 0, 0)).toBe(BlockId.Air)
    expect(h.inventory.countOf(ItemId.TNT)).toBe(1)

    // The fuse died with the block: nothing detonates where it stood.
    h.interaction.update(5)
    expect(h.world.getBlock(3, 0, 0)).toBe(BlockId.Air)
  })

  it('gives a re-placed stick a fresh, unlit fuse', () => {
    h.world.setBlock(3, 0, 0, BlockId.TNT)
    h.world.setBlock(4, 0, 0, BlockId.Stone)
    h.interaction.update(0)
    mineClick() // light the TNT at (3,0,0)

    document.dispatchEvent(new MouseEvent('mousedown', { button: 0 }))
    h.interaction.update(1) // mine it back out, defusing it
    document.dispatchEvent(new MouseEvent('mouseup', { button: 0 }))
    expect(h.inventory.countOf(ItemId.TNT)).toBe(1)

    h.interaction.update(0)
    useClick() // place it back against the stone at (4,0,0)
    expect(h.world.getBlock(3, 0, 0)).toBe(BlockId.TNT)
    h.interaction.update(10)
    expect(h.world.getBlock(3, 0, 0)).toBe(BlockId.TNT)
  })
})
