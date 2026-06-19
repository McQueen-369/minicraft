import { CHUNK_SIZE, WATER_LEVEL } from '../constants'
import { hash2D } from '../core/rng'
import type { AnimalKind } from '../items/items'
import type { BoxDims, PhysicsState } from '../player/physics'
import type { Terrain } from '../world/terrain'

export type AnimalMode = 'wander' | 'follow' | 'stay' | 'ridden'

export interface Animal extends PhysicsState {
  id: string
  kind: AnimalKind
  yaw: number
  mode: AnimalMode
  /** Player id that tamed this animal (null = wild). */
  owner: string | null
  /** Internal wander-AI timer (seconds until the next decision). */
  decideIn: number
  /** Whether the wander AI currently walks (vs. stands). */
  walking: boolean
  /** Walk-cycle phase for leg animation. */
  walkPhase: number
  /** For horses in 'ridden' mode: horizontal velocity set by the rider. */
  riderVel?: { x: number; z: number }
  /** For horses in 'ridden' mode: whether the rider is pressing jump this frame. */
  riderJump?: boolean
  /** When true, the player is carrying this NPC; its AI/physics are suspended. */
  carried?: boolean
}

export const ANIMAL_DIMS: Record<AnimalKind, BoxDims> = {
  pig: { width: 0.9, height: 0.9 },
  sheep: { width: 0.9, height: 1.1 },
  chicken: { width: 0.5, height: 0.7 },
  rabbit: { width: 0.4, height: 0.4 },
  cat: { width: 0.4, height: 0.55 },
  dog: { width: 0.65, height: 0.75 },
  villager: { width: 0.5, height: 1.8 },
  horse: { width: 1.0, height: 1.7 },
}

export const ANIMAL_SPEED: Record<AnimalKind, number> = {
  pig: 1.6,
  sheep: 1.4,
  chicken: 1.9,
  rabbit: 2.6,
  cat: 2.1,
  dog: 1.9,
  villager: 0.9,
  horse: 2.5,
}

const SPAWN_SEED = 0xa21
const KINDS: AnimalKind[] = ['pig', 'chicken', 'sheep', 'rabbit', 'cat', 'dog', 'horse']

/**
 * Deterministic wild animals for a chunk (so every client agrees on initial
 * spawns). Each spawn point is consumed once and the animal becomes dynamic.
 */
export function animalsForChunk(terrain: Terrain, cx: number, cz: number): Animal[] {
  const out: Animal[] = []
  for (let i = 0; i < 2; i++) {
    const r = hash2D(terrain.seed ^ (SPAWN_SEED + i * 977), cx, cz)
    if (r >= 0.18) continue
    const lx = Math.floor(hash2D(terrain.seed ^ (i + 3), cx * 31, cz * 17) * CHUNK_SIZE)
    const lz = Math.floor(hash2D(terrain.seed ^ (i + 7), cx * 13, cz * 41) * CHUNK_SIZE)
    const x = cx * CHUNK_SIZE + lx
    const z = cz * CHUNK_SIZE + lz
    const h = terrain.heightAt(x, z)
    if (h <= WATER_LEVEL + 1) continue
    const kind = KINDS[Math.floor((r / 0.18) * KINDS.length) % KINDS.length]
    out.push({
      id: `wild-${cx},${cz},${i}`,
      kind,
      pos: { x: x + 0.5, y: h + 1.01, z: z + 0.5 },
      vel: { x: 0, y: 0, z: 0 },
      yaw: r * Math.PI * 2,
      mode: 'wander',
      owner: null,
      onGround: false,
      decideIn: 0,
      walking: false,
      walkPhase: 0,
    })
  }
  return out
}
