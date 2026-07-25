import { CHUNK_SIZE, WORLD_HEIGHT } from '../constants'
import { blockDef, isOpaque } from '../core/blocks'
import { uvRect } from './atlas'

export interface ChunkMeshData {
  positions: Float32Array
  normals: Float32Array
  uvs: Float32Array
  /** Per-vertex RGB shade (face tint × ambient occlusion), multiplied into the texture. */
  colors: Float32Array
  indices: Uint32Array
  faceCount: number
}

interface FaceDef {
  dir: [number, number, number]
  /** Corner offsets c0..c3, CCW viewed from outside; uv = (u0,v0),(u1,v0),(u1,v1),(u0,v1). */
  corners: [number, number, number][]
  kind: 'top' | 'bottom' | 'side'
  /** Flat directional tint: light falls from above, so faces read with real form. */
  shade: number
}

const FACES: FaceDef[] = [
  { dir: [1, 0, 0], corners: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], kind: 'side', shade: 0.72 },
  { dir: [-1, 0, 0], corners: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], kind: 'side', shade: 0.72 },
  { dir: [0, 1, 0], corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], kind: 'top', shade: 1.0 },
  { dir: [0, -1, 0], corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], kind: 'bottom', shade: 0.5 },
  { dir: [0, 0, 1], corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], kind: 'side', shade: 0.86 },
  { dir: [0, 0, -1], corners: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], kind: 'side', shade: 0.86 },
]

/** Brightness for the four ambient-occlusion levels (3 = fully open, 0 = boxed in). */
const AO_LEVELS = [0.48, 0.66, 0.83, 1.0]

/** The two axes that span a face, given its normal axis. */
const TANGENTS: [number, number][] = [
  [1, 2], // normal along X → span Y,Z
  [0, 2], // normal along Y → span X,Z
  [0, 1], // normal along Z → span X,Y
]

export type BlockSampler = (x: number, y: number, z: number) => number

/**
 * Classic voxel corner occlusion: a vertex darkens for each solid block
 * touching it in the plane just outside the face, with the diagonal only
 * counting when it is not already hidden behind both edge neighbours.
 * Returns 3 (fully lit) down to 0 (three-way corner).
 */
function cornerAO(side1: boolean, side2: boolean, corner: boolean): number {
  if (side1 && side2) return 0
  return 3 - (Number(side1) + Number(side2) + Number(corner))
}

/**
 * Build geometry for one chunk with hidden-face culling and baked per-vertex
 * ambient occlusion. The sampler takes world coordinates so faces at chunk
 * borders cull and shade against neighbor chunks.
 */
export function meshChunk(cx: number, cz: number, getBlock: BlockSampler): ChunkMeshData {
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  let faceCount = 0

  const solid = (x: number, y: number, z: number) => isOpaque(getBlock(x, y, z))

  const x0 = cx * CHUNK_SIZE
  const z0 = cz * CHUNK_SIZE
  const ao = [0, 0, 0, 0]
  for (let y = 0; y < WORLD_HEIGHT; y++) {
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const wx = x0 + lx
        const wz = z0 + lz
        const id = getBlock(wx, y, wz)
        if (id === 0) continue
        const def = blockDef(id)
        if (!def) continue
        for (const face of FACES) {
          const neighbor = getBlock(wx + face.dir[0], y + face.dir[1], wz + face.dir[2])
          // A face is hidden when its neighbor is opaque, or is the same
          // transparent block (no internal faces inside leaf/glass clusters).
          if (isOpaque(neighbor) || neighbor === id) continue
          const tile = def.tiles[face.kind === 'top' ? 'top' : face.kind === 'bottom' ? 'bottom' : 'side']
          const [u0, v0, u1, v1] = uvRect(tile)
          const base = positions.length / 3

          // Occlusion is sampled in the block layer just outside this face.
          const normalAxis = face.dir[0] !== 0 ? 0 : face.dir[1] !== 0 ? 1 : 2
          const [t1, t2] = TANGENTS[normalAxis]
          const origin = [wx, y, wz]
          const outside = [wx + face.dir[0], y + face.dir[1], wz + face.dir[2]]
          const probe = [0, 0, 0]
          const at = (d1: number, d2: number) => {
            probe[0] = outside[0]
            probe[1] = outside[1]
            probe[2] = outside[2]
            probe[t1] += d1
            probe[t2] += d2
            return solid(probe[0], probe[1], probe[2])
          }

          for (let i = 0; i < 4; i++) {
            const corner = face.corners[i]
            // Corner offset 1 means the vertex sits on the +side of that axis.
            const s1 = corner[t1] === 1 ? 1 : -1
            const s2 = corner[t2] === 1 ? 1 : -1
            // Transparent blocks (glass, leaves, fences) neither occlude much
            // nor need self-shadowing; only opaque neighbours count.
            ao[i] = def.opaque ? cornerAO(at(s1, 0), at(0, s2), at(s1, s2)) : 3
            positions.push(origin[0] + corner[0], origin[1] + corner[1], origin[2] + corner[2])
            normals.push(face.dir[0], face.dir[1], face.dir[2])
            const shade = face.shade * AO_LEVELS[ao[i]]
            colors.push(shade, shade, shade)
          }

          uvs.push(u0, v0, u1, v0, u1, v1, u0, v1)
          // Split the quad along the diagonal that keeps the darkening smooth;
          // the naive split makes corner shadows look like torn triangles.
          if (ao[0] + ao[2] > ao[1] + ao[3]) {
            indices.push(base + 1, base + 2, base + 3, base + 1, base + 3, base)
          } else {
            indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
          }
          faceCount++
        }
      }
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    colors: new Float32Array(colors),
    indices: new Uint32Array(indices),
    faceCount,
  }
}
