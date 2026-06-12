import { describe, expect, it } from 'vitest'
import { CHUNK_SIZE, WORLD_HEIGHT } from '../constants'
import { blockKey, chunkKey, localIndex, parseBlockKey, parseChunkKey, worldToChunk, worldToLocal } from './coords'

describe('coords', () => {
  it('maps positive world coords to chunk/local', () => {
    expect(worldToChunk(0)).toBe(0)
    expect(worldToChunk(15)).toBe(0)
    expect(worldToChunk(16)).toBe(1)
    expect(worldToLocal(0)).toBe(0)
    expect(worldToLocal(15)).toBe(15)
    expect(worldToLocal(16)).toBe(0)
  })

  it('maps negative world coords to chunk/local', () => {
    expect(worldToChunk(-1)).toBe(-1)
    expect(worldToChunk(-16)).toBe(-1)
    expect(worldToChunk(-17)).toBe(-2)
    expect(worldToLocal(-1)).toBe(15)
    expect(worldToLocal(-16)).toBe(0)
    expect(worldToLocal(-17)).toBe(15)
  })

  it('roundtrips chunk + local back to world coords', () => {
    for (const x of [-33, -17, -16, -1, 0, 1, 15, 16, 31, 100]) {
      expect(worldToChunk(x) * CHUNK_SIZE + worldToLocal(x)).toBe(x)
    }
  })

  it('roundtrips keys', () => {
    expect(parseChunkKey(chunkKey(-3, 7))).toEqual({ cx: -3, cz: 7 })
    expect(parseBlockKey(blockKey(-5, 60, 12))).toEqual({ x: -5, y: 60, z: 12 })
  })

  it('produces unique in-range indices for all local coords', () => {
    const seen = new Set<number>()
    for (let y = 0; y < WORLD_HEIGHT; y++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        for (let lx = 0; lx < CHUNK_SIZE; lx++) {
          const i = localIndex(lx, y, lz)
          expect(i).toBeGreaterThanOrEqual(0)
          expect(i).toBeLessThan(CHUNK_SIZE * CHUNK_SIZE * WORLD_HEIGHT)
          seen.add(i)
        }
      }
    }
    expect(seen.size).toBe(CHUNK_SIZE * CHUNK_SIZE * WORLD_HEIGHT)
  })
})
