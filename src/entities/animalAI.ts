import { stepPhysics, type SolidSampler, type Vec3 } from '../player/physics'
import { ANIMAL_DIMS, ANIMAL_SPEED, type Animal } from './animal'

export interface AnimalContext {
  isSolid: SolidSampler
  /** Position of this animal's owner, when following. */
  ownerPos: Vec3 | null
  /** Random source — inject a seeded PRNG for deterministic tests. */
  rand: () => number
}

const FOLLOW_STOP = 2.5
const FOLLOW_TELEPORT = 24
const HOP_SPEED = 7

/** Advance one animal by dt seconds. Pure given its context. */
export function stepAnimal(a: Animal, dt: number, ctx: AnimalContext): void {
  if (a.mode === 'ridden') {
    const rv = a.riderVel ?? { x: 0, z: 0 }
    const jump = a.riderJump ?? false
    a.riderJump = false
    stepPhysics(a, { moveX: rv.x, moveZ: rv.z, jump, fly: false, flyMoveY: 0 }, dt, ctx.isSolid, ANIMAL_DIMS[a.kind])
    if (a.hitWall && a.onGround) a.vel.y = HOP_SPEED
    a.walkPhase = Math.hypot(rv.x, rv.z) > 0.1 ? a.walkPhase + dt * 4 : 0
    return
  }

  let speed = 0
  if (a.mode === 'follow' && ctx.ownerPos) {
    const dx = ctx.ownerPos.x - a.pos.x
    const dz = ctx.ownerPos.z - a.pos.z
    const d = Math.hypot(dx, dz)
    if (d > FOLLOW_TELEPORT) {
      a.pos = { x: ctx.ownerPos.x, y: ctx.ownerPos.y + 1, z: ctx.ownerPos.z }
      a.vel = { x: 0, y: 0, z: 0 }
      return
    }
    if (d > FOLLOW_STOP) {
      a.yaw = Math.atan2(dx, dz)
      speed = ANIMAL_SPEED[a.kind] * 1.6
    }
  } else if (a.mode === 'wander') {
    a.decideIn -= dt
    if (a.decideIn <= 0) {
      a.decideIn = 2 + ctx.rand() * 4
      a.walking = ctx.rand() < 0.6
      if (a.walking) a.yaw = ctx.rand() * Math.PI * 2
    }
    if (a.walking) speed = ANIMAL_SPEED[a.kind]
  }
  // 'stay' (and follow-in-range) keeps speed 0.

  stepPhysics(
    a,
    {
      moveX: Math.sin(a.yaw) * speed,
      moveZ: Math.cos(a.yaw) * speed,
      jump: false,
      fly: false,
      flyMoveY: 0,
    },
    dt,
    ctx.isSolid,
    ANIMAL_DIMS[a.kind],
  )
  // Hop over one-block obstacles.
  if (a.hitWall && a.onGround && speed > 0) a.vel.y = HOP_SPEED
  a.walkPhase = speed > 0 ? a.walkPhase + dt * speed * 4 : 0
}
