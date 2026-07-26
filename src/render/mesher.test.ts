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
    expect(data.colors.length / 3).toBe(verts)
    expect(Math.max(...data.indices)).toBe(verts - 1)
  })
})

/** Shade of the vertex at world position (x,y,z) on the face with the given normal. */
function shadeAt(
  data: ReturnType<typeof meshChunk>,
  normal: [number, number, number],
  x: number,
  y: number,
  z: number,
): number | null {
  for (let v = 0; v < data.positions.length / 3; v++) {
    if (
      data.positions[v * 3] === x &&
      data.positions[v * 3 + 1] === y &&
      data.positions[v * 3 + 2] === z &&
      data.normals[v * 3] === normal[0] &&
      data.normals[v * 3 + 1] === normal[1] &&
      data.normals[v * 3 + 2] === normal[2]
    ) {
      return data.colors[v * 3]
    }
  }
  return null
}

describe('meshChunk shading', () => {
  it('tints top faces brighter than sides and sides brighter than bottoms', () => {
    const data = meshChunk(0, 0, samplerFrom({ '5,10,5': BlockId.Stone }))
    const top = shadeAt(data, [0, 1, 0], 5, 11, 5)!
    const side = shadeAt(data, [1, 0, 0], 6, 10, 5)!
    const bottom = shadeAt(data, [0, -1, 0], 5, 10, 5)!
    expect(top).toBeGreaterThan(side)
    expect(side).toBeGreaterThan(bottom)
  })

  it('writes a uniform shade for a block with no neighbours', () => {
    const data = meshChunk(0, 0, samplerFrom({ '5,10,5': BlockId.Stone }))
    const topShades = [
      shadeAt(data, [0, 1, 0], 5, 11, 5),
      shadeAt(data, [0, 1, 0], 6, 11, 5),
      shadeAt(data, [0, 1, 0], 6, 11, 6),
      shadeAt(data, [0, 1, 0], 5, 11, 6),
    ]
    expect(new Set(topShades).size).toBe(1)
  })

  it('darkens the corner of a top face that an adjacent block occludes', () => {
    // A neighbour at +X shades the two top-face vertices along that edge.
    const data = meshChunk(0, 0, samplerFrom({ '5,10,5': BlockId.Stone, '6,11,5': BlockId.Stone }))
    const occluded = shadeAt(data, [0, 1, 0], 6, 11, 5)!
    const open = shadeAt(data, [0, 1, 0], 5, 11, 5)!
    expect(occluded).toBeLessThan(open)
  })

  it('darkens a corner most when both edges and the diagonal are filled', () => {
    const base = { '5,10,5': BlockId.Stone }
    const oneEdge = meshChunk(0, 0, samplerFrom({ ...base, '6,11,5': BlockId.Stone }))
    const bothEdges = meshChunk(
      0,
      0,
      samplerFrom({ ...base, '6,11,5': BlockId.Stone, '5,11,6': BlockId.Stone, '6,11,6': BlockId.Stone }),
    )
    expect(shadeAt(bothEdges, [0, 1, 0], 6, 11, 6)!).toBeLessThan(shadeAt(oneEdge, [0, 1, 0], 6, 11, 6)!)
  })

  it('leaves transparent blocks unoccluded so leaves and glass stay readable', () => {
    const data = meshChunk(0, 0, samplerFrom({ '5,10,5': BlockId.Glass, '6,11,5': BlockId.Stone }))
    const a = shadeAt(data, [0, 1, 0], 6, 11, 5)!
    const b = shadeAt(data, [0, 1, 0], 5, 11, 5)!
    expect(a).toBe(b)
  })

  it('flips the quad diagonal when occlusion is anisotropic', () => {
    // The two vertices shared by both triangles are the ends of the split
    // diagonal; it must run between the corners of matching brightness so the
    // shadow does not tear across the quad.
    const diagonalEnds = (blocks: Record<string, number>): Set<number> => {
      const data = meshChunk(0, 0, samplerFrom(blocks))
      const top: number[] = []
      // Only the top face of the block at (5,10,5) — an occluder has one too.
      for (let v = 0; v < data.positions.length / 3; v++) {
        if (data.normals[v * 3 + 1] === 1 && data.positions[v * 3 + 1] === 11 && data.positions[v * 3] >= 5) top.push(v)
      }
      const idx = [...data.indices].filter((i) => top.includes(i))
      expect(idx.length).toBe(6)
      return new Set(idx.filter((i) => idx.filter((j) => j === i).length === 2).map((i) => i - top[0]))
    }
    // Unoccluded: the default 0–2 diagonal.
    expect(diagonalEnds({ '5,10,5': BlockId.Stone })).toEqual(new Set([0, 2]))
    // One dark corner (index 3, the -X/-Z corner): the split flips to 1–3.
    expect(diagonalEnds({ '5,10,5': BlockId.Stone, '4,11,4': BlockId.Stone })).toEqual(new Set([1, 3]))
  })

  it('lights self-lit blocks evenly, ignoring face direction and occlusion', () => {
    // A lava block boxed in on three sides: every vertex of every face must
    // still come out at the same, above-ambient brightness.
    const data = meshChunk(0, 0, samplerFrom({
      '5,10,5': BlockId.Lava,
      '4,11,4': BlockId.Stone,
      '4,10,5': BlockId.Stone,
      '5,10,4': BlockId.Stone,
    }))
    // Self-lit vertices are the ones brighter than any shaded surface can be.
    const lit = [...data.colors].filter((_, i) => i % 3 === 0).filter((c) => c > 1)
    expect(new Set(lit).size).toBe(1)
    // Four faces survive (two are culled against the stone), 4 vertices each.
    expect(lit.length).toBe(4 * 4)
  })

  it('still shades and occludes ordinary blocks', () => {
    const data = meshChunk(0, 0, samplerFrom({ '5,10,5': BlockId.Stone }))
    const shades = new Set<number>()
    for (let v = 0; v < data.positions.length / 3; v++) shades.add(data.colors[v * 3])
    // Top, sides and bottom differ, and none exceed full brightness.
    expect(shades.size).toBeGreaterThan(1)
    expect(Math.max(...shades)).toBeLessThanOrEqual(1)
  })

})
