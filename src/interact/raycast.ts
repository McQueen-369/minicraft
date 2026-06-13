export interface RayHit {
  /** The solid voxel that was hit. */
  x: number
  y: number
  z: number
  /** Unit normal of the face the ray entered through. */
  nx: number
  ny: number
  nz: number
  distance: number
}

export type HitTest = (x: number, y: number, z: number) => boolean

/**
 * Voxel traversal raycast (Amanatides & Woo DDA). Returns the first voxel for
 * which isHit is true, with the entered face normal, or null within maxDist.
 */
export function raycastVoxels(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  maxDist: number,
  isHit: HitTest,
): RayHit | null {
  const len = Math.hypot(dx, dy, dz)
  if (len === 0) return null
  dx /= len
  dy /= len
  dz /= len

  let x = Math.floor(ox)
  let y = Math.floor(oy)
  let z = Math.floor(oz)

  const stepX = dx > 0 ? 1 : -1
  const stepY = dy > 0 ? 1 : -1
  const stepZ = dz > 0 ? 1 : -1

  // Distance along the ray to cross one voxel on each axis (Infinity when parallel).
  const tDeltaX = dx !== 0 ? Math.abs(1 / dx) : Infinity
  const tDeltaY = dy !== 0 ? Math.abs(1 / dy) : Infinity
  const tDeltaZ = dz !== 0 ? Math.abs(1 / dz) : Infinity

  // Distance along the ray to the first voxel boundary on each axis.
  const distToBoundary = (o: number, v: number, step: number): number =>
    step > 0 ? v + 1 - o : o - v
  let tMaxX = dx !== 0 ? distToBoundary(ox, x, stepX) * tDeltaX : Infinity
  let tMaxY = dy !== 0 ? distToBoundary(oy, y, stepY) * tDeltaY : Infinity
  let tMaxZ = dz !== 0 ? distToBoundary(oz, z, stepZ) * tDeltaZ : Infinity

  // The voxel containing the origin counts as a hit with no meaningful normal.
  if (isHit(x, y, z)) return { x, y, z, nx: 0, ny: 0, nz: 0, distance: 0 }

  let t = 0
  while (t <= maxDist) {
    let nx = 0
    let ny = 0
    let nz = 0
    if (tMaxX <= tMaxY && tMaxX <= tMaxZ) {
      t = tMaxX
      tMaxX += tDeltaX
      x += stepX
      nx = -stepX
    } else if (tMaxY <= tMaxZ) {
      t = tMaxY
      tMaxY += tDeltaY
      y += stepY
      ny = -stepY
    } else {
      t = tMaxZ
      tMaxZ += tDeltaZ
      z += stepZ
      nz = -stepZ
    }
    if (t > maxDist) break
    if (isHit(x, y, z)) return { x, y, z, nx, ny, nz, distance: t }
  }
  return null
}
