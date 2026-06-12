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

const HALF_W = PLAYER_WIDTH / 2
const EPS = 1e-3
const TERMINAL_VELOCITY = 50
/** Max movement per collision substep, to prevent tunneling. */
const MAX_STEP = 0.45

export function stepPhysics(p: PhysicsState, input: PhysicsInput, rawDt: number, isSolid: SolidSampler): void {
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
  for (let i = 0; i < substeps; i++) {
    moveAxis(p, 'x', p.vel.x * h, isSolid)
    moveAxis(p, 'z', p.vel.z * h, isSolid)
    const hitY = moveAxis(p, 'y', p.vel.y * h, isSolid)
    if (hitY && p.vel.y <= 0) p.onGround = true
    if (hitY) p.vel.y = 0
  }
}

export function boxIntersects(pos: Vec3, isSolid: SolidSampler): boolean {
  const minX = Math.floor(pos.x - HALF_W)
  const maxX = Math.floor(pos.x + HALF_W - EPS / 2)
  const minY = Math.floor(pos.y)
  const maxY = Math.floor(pos.y + PLAYER_HEIGHT - EPS / 2)
  const minZ = Math.floor(pos.z - HALF_W)
  const maxZ = Math.floor(pos.z + HALF_W - EPS / 2)
  for (let y = minY; y <= maxY; y++) {
    for (let z = minZ; z <= maxZ; z++) {
      for (let x = minX; x <= maxX; x++) {
        if (isSolid(x, y, z)) return true
      }
    }
  }
  return false
}

/** Whether the player AABB at pos overlaps the given voxel. */
export function boxOverlapsVoxel(pos: Vec3, vx: number, vy: number, vz: number): boolean {
  return (
    pos.x - HALF_W < vx + 1 &&
    pos.x + HALF_W > vx &&
    pos.y < vy + 1 &&
    pos.y + PLAYER_HEIGHT > vy &&
    pos.z - HALF_W < vz + 1 &&
    pos.z + HALF_W > vz
  )
}

function moveAxis(p: PhysicsState, axis: 'x' | 'y' | 'z', delta: number, isSolid: SolidSampler): boolean {
  if (delta === 0) return false
  p.pos[axis] += delta
  if (!boxIntersects(p.pos, isSolid)) return false
  if (axis === 'y') {
    p.pos.y = delta > 0 ? Math.floor(p.pos.y + PLAYER_HEIGHT) - PLAYER_HEIGHT - EPS : Math.floor(p.pos.y) + 1 + EPS
  } else {
    const half = HALF_W
    p.pos[axis] =
      delta > 0 ? Math.floor(p.pos[axis] + half) - half - EPS : Math.floor(p.pos[axis] - half) + 1 + half + EPS
    p.vel[axis] = 0
  }
  return true
}
