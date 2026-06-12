import { describe, expect, it } from 'vitest'
import { raycastVoxels, type HitTest } from './raycast'

const single = (bx: number, by: number, bz: number): HitTest => (x, y, z) => x === bx && y === by && z === bz

describe('raycastVoxels', () => {
  it('hits a block straight ahead on +x with the -x face normal', () => {
    const hit = raycastVoxels(0.5, 0.5, 0.5, 1, 0, 0, 10, single(5, 0, 0))
    expect(hit).toMatchObject({ x: 5, y: 0, z: 0, nx: -1, ny: 0, nz: 0 })
    expect(hit!.distance).toBeCloseTo(4.5)
  })

  it('hits along negative axes with positive face normals', () => {
    const hit = raycastVoxels(0.5, 0.5, 0.5, 0, -1, 0, 10, single(0, -4, 0))
    expect(hit).toMatchObject({ x: 0, y: -4, z: 0, ny: 1 })
  })

  it('works with negative coordinates and diagonal rays', () => {
    const hit = raycastVoxels(-0.5, 0.5, -0.5, -1, 0, -1, 10, single(-3, 0, -3))
    expect(hit).not.toBeNull()
    expect(hit).toMatchObject({ x: -3, y: 0, z: -3 })
    expect(Math.abs(hit!.nx) + Math.abs(hit!.nz)).toBe(1)
  })

  it('returns null when nothing is hit within maxDist', () => {
    expect(raycastVoxels(0.5, 0.5, 0.5, 1, 0, 0, 4, single(5, 0, 0))).toBeNull()
    expect(raycastVoxels(0.5, 0.5, 0.5, 0, 0, 0, 10, single(5, 0, 0))).toBeNull()
  })

  it('reports the origin voxel with a zero normal', () => {
    const hit = raycastVoxels(2.5, 3.5, 4.5, 1, 0, 0, 10, single(2, 3, 4))
    expect(hit).toMatchObject({ x: 2, y: 3, z: 4, nx: 0, ny: 0, nz: 0, distance: 0 })
  })

  it('handles a ray starting exactly on a voxel boundary', () => {
    const hit = raycastVoxels(2, 0.5, 0.5, 1, 0, 0, 10, single(4, 0, 0))
    expect(hit).toMatchObject({ x: 4, y: 0, z: 0, nx: -1 })
    expect(hit!.distance).toBeCloseTo(2)
  })

  it('picks the correct face on a glancing diagonal', () => {
    // Ray going mostly +x, slightly +z, hits the block's -x face first.
    const hit = raycastVoxels(0.5, 0.5, 0.5, 1, 0, 0.01, 10, single(5, 0, 0))
    expect(hit).toMatchObject({ nx: -1, ny: 0, nz: 0 })
  })
})
