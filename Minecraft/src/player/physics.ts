import { GRAVITY, JUMP_SPEED, MAX_DT, PLAYER_HEIGHT, PLAYER_WIDTH } from '../constants'

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface PhysicsState {
  /** Feet-center position. */
  pos: Vec3
  vel: Vec3
  onGround: boolean
  /** Set when the last step was blocked horizontally (used for animal hops). */
  hitWall?: boolean
}

export interface PhysicsInput {
  /** Desired horizontal velocity in blocks/second. */
  moveX: number
  moveZ: number
  jump: boolean
  fly: boolean
  /** Desired vertical velocity while flying. */
  flyMoveY: number
}

export type SolidSampler = (x: number, y: number, z: number) => boolean

export interface BoxDims {
  width: number
  height: number
}

export const PLAYER_DIMS: BoxDims = { width: PLAYER_WIDTH, height: PLAYER_HEIGHT }

const EPS = 1e-3
const TERMINAL_VELOCITY = 50
/** Max movement per collision substep, to prevent tunneling. */
const MAX_STEP = 0.45

export function stepPhysics(
  p: PhysicsState,
  input: PhysicsInput,
  rawDt: number,
  isSolid: SolidSampler,
  dims: BoxDims = PLAYER_DIMS,
): void {
  const dt = Math.min(rawDt, MAX_DT)
  if (input.fly) {
    p.vel.x = input.moveX
    p.vel.z = input.moveZ
    p.vel.y = input.flyMoveY
  } else {
    p.vel.x = input.moveX
    p.vel.z = input.moveZ
    if (input.jump && p.onGround) p.vel.y = JUMP_SPEED
    p.vel.y = Math.max(p.vel.y - GRAVITY * dt, -TERMINAL_VELOCITY)
  }

  const maxDelta = Math.max(Math.abs(p.vel.x), Math.abs(p.vel.y), Math.abs(p.vel.z)) * dt
  const substeps = Math.max(1, Math.ceil(maxDelta / MAX_STEP))
  const h = dt / substeps
  p.onGround = false
  let hitWall = false
  for (let i = 0; i < substeps; i++) {
    if (moveAxis(p, 'x', p.vel.x * h, isSolid, dims)) hitWall = true
    if (moveAxis(p, 'z', p.vel.z * h, isSolid, dims)) hitWall = true
    const hitY = moveAxis(p, 'y', p.vel.y * h, isSolid, dims)
    if (hitY && p.vel.y <= 0) p.onGround = true
    if (hitY) p.vel.y = 0
  }
  p.hitWall = hitWall
}

export function boxIntersects(pos: Vec3, isSolid: SolidSampler, dims: BoxDims = PLAYER_DIMS): boolean {
  const half = dims.width / 2
  const minX = Math.floor(pos.x - half)
  const maxX = Math.floor(pos.x + half - EPS / 2)
  const minY = Math.floor(pos.y)
  const maxY = Math.floor(pos.y + dims.height - EPS / 2)
  const minZ = Math.floor(pos.z - half)
  const maxZ = Math.floor(pos.z + half - EPS / 2)
  for (let y = minY; y <= maxY; y++) {
    for (let z = minZ; z <= maxZ; z++) {
      for (let x = minX; x <= maxX; x++) {
        if (isSolid(x, y, z)) return true
      }
    }
  }
  return false
}

/** Whether a box AABB at pos overlaps the given voxel. */
export function boxOverlapsVoxel(pos: Vec3, vx: number, vy: number, vz: number, dims: BoxDims = PLAYER_DIMS): boolean {
  const half = dims.width / 2
  return (
    pos.x - half < vx + 1 &&
    pos.x + half > vx &&
    pos.y < vy + 1 &&
    pos.y + dims.height > vy &&
    pos.z - half < vz + 1 &&
    pos.z + half > vz
  )
}

function moveAxis(p: PhysicsState, axis: 'x' | 'y' | 'z', delta: number, isSolid: SolidSampler, dims: BoxDims): boolean {
  if (delta === 0) return false
  p.pos[axis] += delta
  if (!boxIntersects(p.pos, isSolid, dims)) return false
  if (axis === 'y') {
    p.pos.y = delta > 0 ? Math.floor(p.pos.y + dims.height) - dims.height - EPS : Math.floor(p.pos.y) + 1 + EPS
  } else {
    const half = dims.width / 2
    p.pos[axis] =
      delta > 0 ? Math.floor(p.pos[axis] + half) - half - EPS : Math.floor(p.pos[axis] - half) + 1 + half + EPS
    p.vel[axis] = 0
  }
  return true
}
