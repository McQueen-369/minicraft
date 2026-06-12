import { describe, expect, it } from 'vitest'
import { BlockId } from '../core/blocks'
import { meshChunk, type BlockSampler } from './mesher'

function samplerFrom(blocks: Record<string, number>): BlockSampler {
  return (x, y, z) => blocks[`${x},${y},${z}`] ?? BlockId.Air
}

describe('meshChunk', () => {
  it('emits 6 faces for an isolated block', () => {
    const data = meshChunk(0, 0, samplerFrom({ '5,10,5': BlockId.Stone }))
    expect(data.faceCount).toBe(6)
    expect(data.positions.length).toBe(6 * 4 * 3)
    expect(data.indices.length).toBe(6 * 2 * 3)
  })

  it('culls the shared face between two adjacent opaque blocks', () => {
    const data = meshChunk(0, 0, samplerFrom({ '5,10,5': BlockId.Stone, '6,10,5': BlockId.Stone }))
    expect(data.faceCount).toBe(10)
  })

  it('does not cull against transparent neighbors of a different type', () => {
    const data = meshChunk(0, 0, samplerFrom({ '5,10,5': BlockId.Stone, '6,10,5': BlockId.Glass }))
    // Stone keeps all 6 faces; glass keeps 5 (its face against stone is culled).
    expect(data.faceCount).toBe(11)
  })

  it('culls internal faces between same-type transparent blocks', () => {
    const data = meshChunk(0, 0, samplerFrom({ '5,10,5': BlockId.Leaves, '6,10,5': BlockId.Leaves }))
    expect(data.faceCount).toBe(10)
  })

  it('culls faces against neighbor chunks via the world sampler', () => {
    // Block at the chunk border with a neighbor outside the chunk.
    const data = meshChunk(0, 0, samplerFrom({ '15,10,5': BlockId.Stone, '16,10,5': BlockId.Stone }))
    // Only the in-chunk block is meshed; its +X face is culled by the neighbor.
    expect(data.faceCount).toBe(5)
  })

  it('produces equal-length attribute arrays', () => {
    const data = meshChunk(0, 0, samplerFrom({ '1,1,1': BlockId.Grass, '2,1,1': BlockId.Dirt, '1,2,1': BlockId.Wood }))
    const verts = data.positions.length / 3
    expect(data.normals.length / 3).toBe(verts)
    expect(data.uvs.length / 2).toBe(verts)
    expect(Math.max(...data.indices)).toBe(verts - 1)
  })
})
