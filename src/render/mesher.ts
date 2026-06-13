import { CHUNK_SIZE, WORLD_HEIGHT } from '../constants'
import { blockDef, isOpaque, isTransparent } from '../core/blocks'
import { uvRect } from './atlas'

export interface ChunkMeshData {
  positions: Float32Array
  normals: Float32Array
  uvs: Float32Array
  indices: Uint32Array
  faceCount: number
  /** Transparent (glass) faces rendered with alpha blending. */
  tPositions: Float32Array
  tNormals: Float32Array
  tUvs: Float32Array
  tIndices: Uint32Array
  tFaceCount: number
}

interface FaceDef {
  dir: [number, number, number]
  /** Corner offsets c0..c3, CCW viewed from outside; uv = (u0,v0),(u1,v0),(u1,v1),(u0,v1). */
  corners: [number, number, number][]
  kind: 'top' | 'bottom' | 'side'
}

const FACES: FaceDef[] = [
  { dir: [1, 0, 0], corners: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], kind: 'side' },
  { dir: [-1, 0, 0], corners: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], kind: 'side' },
  { dir: [0, 1, 0], corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], kind: 'top' },
  { dir: [0, -1, 0], corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], kind: 'bottom' },
  { dir: [0, 0, 1], corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], kind: 'side' },
  { dir: [0, 0, -1], corners: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], kind: 'side' },
]

export type BlockSampler = (x: number, y: number, z: number) => number

/**
 * Build geometry for one chunk with hidden-face culling. The sampler takes
 * world coordinates so faces at chunk borders cull against neighbor chunks.
 */
function pushFace(
  pos: number[], nrm: number[], uvArr: number[], idx: number[],
  wx: number, y: number, wz: number,
  face: FaceDef, tile: number,
): void {
  const [u0, v0, u1, v1] = uvRect(tile)
  const base = pos.length / 3
  for (const [ox, oy, oz] of face.corners) {
    pos.push(wx + ox, y + oy, wz + oz)
    nrm.push(face.dir[0], face.dir[1], face.dir[2])
  }
  uvArr.push(u0, v0, u1, v0, u1, v1, u0, v1)
  idx.push(base, base + 1, base + 2, base, base + 2, base + 3)
}

export function meshChunk(cx: number, cz: number, getBlock: BlockSampler): ChunkMeshData {
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  let faceCount = 0

  const tPositions: number[] = []
  const tNormals: number[] = []
  const tUvs: number[] = []
  const tIndices: number[] = []
  let tFaceCount = 0

  const x0 = cx * CHUNK_SIZE
  const z0 = cz * CHUNK_SIZE
  for (let y = 0; y < WORLD_HEIGHT; y++) {
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const wx = x0 + lx
        const wz = z0 + lz
        const id = getBlock(wx, y, wz)
        if (id === 0) continue
        const def = blockDef(id)
        if (!def) continue
        const transp = isTransparent(id)
        for (const face of FACES) {
          const neighbor = getBlock(wx + face.dir[0], y + face.dir[1], wz + face.dir[2])
          if (isOpaque(neighbor) || neighbor === id) continue
          // Opaque neighbors also hide transparent faces; transparent next to opaque = visible
          const tile = def.tiles[face.kind === 'top' ? 'top' : face.kind === 'bottom' ? 'bottom' : 'side']
          if (transp) {
            pushFace(tPositions, tNormals, tUvs, tIndices, wx, y, wz, face, tile)
            tFaceCount++
          } else {
            pushFace(positions, normals, uvs, indices, wx, y, wz, face, tile)
            faceCount++
          }
        }
      }
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    indices: new Uint32Array(indices),
    faceCount,
    tPositions: new Float32Array(tPositions),
    tNormals: new Float32Array(tNormals),
    tUvs: new Float32Array(tUvs),
    tIndices: new Uint32Array(tIndices),
    tFaceCount,
  }
}
