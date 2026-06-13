import { describe, expect, it } from 'vitest'
import { CHUNK_SIZE } from '../constants'
import { BlockId } from '../core/blocks'
import { blockKey, chunkKey } from '../core/coords'
import { Terrain } from './terrain'
import { World } from './world'

function makeWorld(): World {
  return new World(new Terrain(42))
}

describe('World', () => {
  it('gets generated blocks without loading chunks', () => {
    const w = makeWorld()
    const t = new Terrain(42)
    expect(w.getBlock(5, 3, 5)).toBe(t.generateBlock(5, 3, 5))
    expect(w.chunks.size).toBe(0)
  })

  it('records edit diffs and removes them when reverted', () => {
    const w = makeWorld()
    w.ensureChunk(0, 0)
    const original = w.getBlock(4, 50, 4)
    w.setBlock(4, 50, 4, BlockId.Brick)
    expect(w.getBlock(4, 50, 4)).toBe(BlockId.Brick)
    expect(w.edits.get(blockKey(4, 50, 4))).toBe(BlockId.Brick)
    w.setBlock(4, 50, 4, original)
    expect(w.edits.has(blockKey(4, 50, 4))).toBe(false)
  })

  it('applies saved edits when a chunk generates', () => {
    const edits = new Map<string, number>([[blockKey(-3, 60, -3), BlockId.Glass]])
    const w = new World(new Terrain(42), { edits })
    expect(w.getBlock(-3, 60, -3)).toBe(BlockId.Glass)
    w.ensureChunk(-1, -1)
    expect(w.getBlock(-3, 60, -3)).toBe(BlockId.Glass)
  })

  it('marks neighbor chunks dirty when editing border blocks', () => {
    const w = makeWorld()
    w.ensureChunk(0, 0)
    w.dirtyChunks.clear()
    w.setBlock(0, 50, 5, BlockId.Stone)
    expect(w.dirtyChunks.has(chunkKey(0, 0))).toBe(true)
    expect(w.dirtyChunks.has(chunkKey(-1, 0))).toBe(true)
    w.dirtyChunks.clear()
    w.setBlock(CHUNK_SIZE - 1, 50, CHUNK_SIZE - 1, BlockId.Stone)
    expect(w.dirtyChunks.has(chunkKey(1, 0))).toBe(true)
    expect(w.dirtyChunks.has(chunkKey(0, 1))).toBe(true)
  })

  it('edits across chunk borders with negative coords', () => {
    const w = makeWorld()
    w.ensureChunk(-1, 0)
    w.setBlock(-1, 40, 8, BlockId.Plank)
    expect(w.getBlock(-1, 40, 8)).toBe(BlockId.Plank)
    expect(w.getChunk(-1, 0)!.get(15, 40, 8)).toBe(BlockId.Plank)
  })

  it('stocks naturally generated chests with loot once', () => {
    const t = new Terrain(7)
    let chest: { x: number; z: number } | null = null
    outer: for (let cx = -10; cx <= 10; cx++) {
      for (let cz = -10; cz <= 10; cz++) {
        const found = t.naturalChestsIn(cx, cz)
        if (found.length > 0) {
          chest = found[0]
          break outer
        }
      }
    }
    expect(chest).not.toBeNull()
    const loot = [{ itemId: 1, count: 3 }]
    const w = new World(new Terrain(7), { chestLoot: () => loot.map((s) => ({ ...s })) })
    const { x, z } = chest!
    const y = t.heightAt(x, z) + 1
    w.ensureChunk(Math.floor(x / CHUNK_SIZE), Math.floor(z / CHUNK_SIZE))
    expect(w.getBlock(x, y, z)).toBe(BlockId.Chest)
    expect(w.getChestContents(x, y, z)).toEqual(loot)
  })

  it('loads and unloads chunks around the player', () => {
    const w = makeWorld()
    w.updateLoadedChunks(0, 0)
    expect(w.hasChunk(0, 0)).toBe(true)
    const before = w.chunks.size
    expect(before).toBeGreaterThan(100)
    const { unloaded } = w.updateLoadedChunks(1000, 0)
    expect(unloaded.length).toBeGreaterThan(0)
    expect(w.hasChunk(0, 0)).toBe(false)
  })
})
