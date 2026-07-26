import * as THREE from 'three'
import { WATER_LEVEL } from '../constants'
import { isSolid } from '../core/blocks'
import type { AnimalKind } from '../items/items'
import { mulberry32 } from '../core/rng'
import type { Vec3 } from '../player/physics'
import type { World } from '../world/world'
import { ANIMAL_DIMS, animalsForChunk, isHostile, type Animal, type AnimalMode } from './animal'
import { stepAnimal } from './animalAI'
import { buildAnimalModel, disposeModel, type AnimalModel } from './animalModels'

const SIM_DISTANCE = 56
const VIEW_DISTANCE = 96
/** Tamed chickens lay an egg every this many in-game days. */
export const EGG_INTERVAL_DAYS = 2

/** Most hostile mobs allowed alive at once (per simulating session). */
const HOSTILE_MAX = 8
/** Seconds between night-time hostile spawn attempts. */
const HOSTILE_SPAWN_INTERVAL = 5
/** Hostile mobs appear this far from the player (never right on top of them). */
const HOSTILE_SPAWN_MIN = 18
const HOSTILE_SPAWN_MAX = 36
/** Full health of a freshly spawned hostile mob. */
export const HOSTILE_HEALTH = 24
/** Horizontal reach of a hostile mob's strike. */
const HOSTILE_STRIKE_RANGE = 1.4
/** Seconds a hostile mob waits between strikes. */
const HOSTILE_STRIKE_COOLDOWN = 1.2

export interface SavedAnimal {
  id: string
  kind: AnimalKind
  pos: Vec3
  yaw: number
  mode: AnimalMode
  owner: string | null
  nextEggDay?: number
  eggReady?: boolean
  health?: number
}

export class EntityManager {
  readonly animals = new Map<string, Animal>()
  /** Chunks whose wild spawns were already consumed (persisted). */
  readonly spawnedChunks = new Set<string>()
  private readonly models = new Map<string, AnimalModel>()
  private readonly rand = mulberry32(Date.now() & 0xffffffff)
  private releaseCounter = 0
  private hostileCounter = 0
  private hostileSpawnTimer = 0
  /** Called when a tamed chicken finishes laying (egg is ready to collect). */
  onEggReady: (animal: Animal) => void = () => {}
  /** Called when a hostile mob lands a strike on the local player. */
  onHostileAttack: () => void = () => {}
  /** Called when the first hostile mob of a night rises. */
  onHostileNight: () => void = () => {}

  constructor(
    private readonly scene: THREE.Scene,
    private readonly world: World,
    /** Which mob comes out at night here: zombies, or a robot world's bad robots. */
    private readonly hostileKind: AnimalKind = 'zombie',
  ) {}

  /**
   * Spawn wild animals from newly generated chunks, advance AI (when
   * simulating — guests instead receive host state), and update models.
   */
  update(dt: number, viewerPos: Vec3, ownerPositions: Map<string, Vec3>, simulate: boolean, worldDay = 0, night = false): void {
    // Wild spawning is authoritative: only the simulating side (host or
    // singleplayer) consumes chunk spawn points; guests receive animals.
    if (simulate) {
      for (const key of this.world.chunks.keys()) {
        if (this.spawnedChunks.has(key)) continue
        this.spawnedChunks.add(key)
        const [cx, cz] = key.split(',').map(Number)
        for (const animal of animalsForChunk(this.world.terrain, cx, cz)) {
          this.animals.set(animal.id, animal)
        }
      }
      this.updateHostilePopulation(dt, viewerPos, night)
    }

    const isSolidAt = (x: number, y: number, z: number) => isSolid(this.world.getBlock(x, y, z))
    for (const animal of this.animals.values()) {
      if (simulate && animal.kind === 'chicken' && animal.owner !== null) {
        // Tamed chickens lay an egg every EGG_INTERVAL_DAYS in-game days.
        if (animal.nextEggDay === undefined) animal.nextEggDay = worldDay + EGG_INTERVAL_DAYS
        if (!animal.eggReady && worldDay >= animal.nextEggDay) {
          animal.eggReady = true
          this.onEggReady(animal)
        }
      }
      if (simulate) {
        const nearAnyone =
          dist2(animal.pos, viewerPos) < SIM_DISTANCE * SIM_DISTANCE ||
          [...ownerPositions.values()].some((p) => dist2(animal.pos, p) < SIM_DISTANCE * SIM_DISTANCE)
        if (nearAnyone) {
          const ownerPos = animal.owner !== null ? (ownerPositions.get(animal.owner) ?? null) : null
          const huntPos = isHostile(animal.kind) ? nearestOf(animal.pos, viewerPos, ownerPositions) : null
          stepAnimal(animal, dt, { isSolid: isSolidAt, ownerPos, huntPos, rand: this.rand })
        }
        if (isHostile(animal.kind)) this.updateHostileStrike(animal, dt, viewerPos)
      }
      this.syncModel(animal, viewerPos)
    }
  }

  /** Night: keep hostile mobs rising near the player. Day: they all crumble away. */
  private updateHostilePopulation(dt: number, viewerPos: Vec3, night: boolean): void {
    if (!night) {
      for (const [id, a] of [...this.animals]) {
        if (isHostile(a.kind)) this.capture(id)
      }
      this.hostileSpawnTimer = 0
      return
    }
    this.hostileSpawnTimer -= dt
    if (this.hostileSpawnTimer > 0) return
    this.hostileSpawnTimer = HOSTILE_SPAWN_INTERVAL
    let count = 0
    for (const a of this.animals.values()) if (isHostile(a.kind)) count++
    if (count >= HOSTILE_MAX) return
    const ang = this.rand() * Math.PI * 2
    const dist = HOSTILE_SPAWN_MIN + this.rand() * (HOSTILE_SPAWN_MAX - HOSTILE_SPAWN_MIN)
    const x = Math.floor(viewerPos.x + Math.cos(ang) * dist)
    const z = Math.floor(viewerPos.z + Math.sin(ang) * dist)
    const h = this.world.terrain.heightAt(x, z)
    if (h <= WATER_LEVEL + 1) return // nothing rises out of a lake
    const mob: Animal = {
      id: `hst-${Date.now()}-${this.hostileCounter++}`,
      kind: this.hostileKind,
      pos: { x: x + 0.5, y: h + 1.01, z: z + 0.5 },
      vel: { x: 0, y: 0, z: 0 },
      yaw: this.rand() * Math.PI * 2,
      mode: 'wander',
      owner: null,
      onGround: false,
      decideIn: 0,
      walking: false,
      walkPhase: 0,
      health: HOSTILE_HEALTH,
    }
    this.animals.set(mob.id, mob)
    if (count === 0) this.onHostileNight()
  }

  /** Let a hostile mob strike the local player when close enough. */
  private updateHostileStrike(mob: Animal, dt: number, viewerPos: Vec3): void {
    mob.attackCooldown = Math.max(0, (mob.attackCooldown ?? 0) - dt)
    const dx = mob.pos.x - viewerPos.x
    const dz = mob.pos.z - viewerPos.z
    const dy = mob.pos.y - viewerPos.y
    if (dx * dx + dz * dz > HOSTILE_STRIKE_RANGE * HOSTILE_STRIKE_RANGE || Math.abs(dy) > 2) return
    if (mob.attackCooldown > 0) return
    mob.attackCooldown = HOSTILE_STRIKE_COOLDOWN
    this.onHostileAttack()
  }

  /**
   * Apply weapon damage to a hostile mob, knocking it back from the attacker.
   * Returns 'died' when the hit finished it off, 'hurt' otherwise.
   */
  hurtHostile(id: string, damage: number, from: Vec3): 'died' | 'hurt' | null {
    const mob = this.animals.get(id)
    if (!mob || !isHostile(mob.kind)) return null
    mob.health = (mob.health ?? HOSTILE_HEALTH) - damage
    if (mob.health <= 0) {
      this.capture(id)
      return 'died'
    }
    // Knockback away from the attacker, with a little pop upward.
    const dx = mob.pos.x - from.x
    const dz = mob.pos.z - from.z
    const d = Math.hypot(dx, dz) || 1
    mob.vel.x = (dx / d) * 7
    mob.vel.z = (dz / d) * 7
    mob.vel.y = 4
    return 'hurt'
  }

  private syncModel(animal: Animal, viewerPos: Vec3): void {
    const visible = dist2(animal.pos, viewerPos) < VIEW_DISTANCE * VIEW_DISTANCE
    let model = this.models.get(animal.id)
    if (!visible) {
      if (model) {
        this.scene.remove(model.group)
        disposeModel(model)
        this.models.delete(animal.id)
      }
      return
    }
    if (!model) {
      model = buildAnimalModel(animal.kind)
      this.models.set(animal.id, model)
      this.scene.add(model.group)
    }
    model.group.position.set(animal.pos.x, animal.pos.y, animal.pos.z)
    model.group.rotation.y = animal.yaw
    const swing = Math.sin(animal.walkPhase) * 0.6
    for (let i = 0; i < model.legs.length; i++) {
      model.legs[i].rotation.x = i % 2 === 0 ? swing : -swing
    }
  }

  /** Nearest animal whose AABB the ray hits, within maxDist. */
  raycastAnimal(origin: THREE.Vector3, dir: THREE.Vector3, maxDist: number): { animal: Animal; distance: number } | null {
    let best: { animal: Animal; distance: number } | null = null
    for (const animal of this.animals.values()) {
      if (dist2(animal.pos, origin) > (maxDist + 2) * (maxDist + 2)) continue
      const dims = ANIMAL_DIMS[animal.kind]
      const half = dims.width / 2
      const t = rayBox(
        origin,
        dir,
        animal.pos.x - half,
        animal.pos.y,
        animal.pos.z - half,
        animal.pos.x + half,
        animal.pos.y + dims.height,
        animal.pos.z + half,
      )
      if (t !== null && t <= maxDist && (!best || t < best.distance)) {
        best = { animal, distance: t }
      }
    }
    return best
  }

  tame(id: string, owner: string): void {
    const animal = this.animals.get(id)
    if (!animal) return
    animal.owner = owner
    animal.mode = 'follow'
  }

  /**
   * Take the waiting egg from a tamed chicken and schedule the next one.
   * Returns whether an egg was actually collected.
   */
  collectEgg(id: string, worldDay: number): boolean {
    const animal = this.animals.get(id)
    if (!animal || animal.kind !== 'chicken' || !animal.eggReady) return false
    animal.eggReady = false
    animal.nextEggDay = worldDay + EGG_INTERVAL_DAYS
    return true
  }

  toggleStay(id: string): void {
    const animal = this.animals.get(id)
    if (!animal || animal.owner === null) return
    animal.mode = animal.mode === 'stay' ? 'follow' : 'stay'
  }

  /** Remove an animal (captured into an item). */
  capture(id: string): Animal | undefined {
    const animal = this.animals.get(id)
    if (animal) {
      this.animals.delete(id)
      const model = this.models.get(id)
      if (model) {
        this.scene.remove(model.group)
        disposeModel(model)
        this.models.delete(id)
      }
    }
    return animal
  }

  /** Place a (previously captured) animal back into the world. */
  release(kind: AnimalKind, pos: Vec3, owner: string | null, id?: string): Animal {
    const animal: Animal = {
      id: id ?? `rel-${owner ?? 'x'}-${Date.now()}-${this.releaseCounter++}`,
      kind,
      pos: { ...pos },
      vel: { x: 0, y: 0, z: 0 },
      yaw: 0,
      mode: owner ? 'follow' : 'wander',
      owner,
      onGround: false,
      decideIn: 0,
      walking: false,
      walkPhase: 0,
    }
    this.animals.set(animal.id, animal)
    return animal
  }

  serialize(): { animals: SavedAnimal[]; spawnedChunks: string[] } {
    return {
      animals: [...this.animals.values()].map((a) => ({
        id: a.id,
        kind: a.kind,
        pos: { ...a.pos },
        yaw: a.yaw,
        mode: a.mode === 'ridden' ? 'follow' : a.mode,
        owner: a.owner,
        nextEggDay: a.nextEggDay,
        eggReady: a.eggReady,
        health: a.health,
      })),
      spawnedChunks: [...this.spawnedChunks],
    }
  }

  load(data: { animals: SavedAnimal[]; spawnedChunks: string[] }): void {
    for (const model of this.models.values()) {
      this.scene.remove(model.group)
      disposeModel(model)
    }
    this.models.clear()
    this.animals.clear()
    this.spawnedChunks.clear()
    for (const key of data.spawnedChunks) this.spawnedChunks.add(key)
    for (const s of data.animals) {
      this.animals.set(s.id, {
        id: s.id,
        kind: s.kind,
        pos: { ...s.pos },
        vel: { x: 0, y: 0, z: 0 },
        yaw: s.yaw,
        mode: s.mode,
        owner: s.owner,
        onGround: false,
        decideIn: 0,
        walking: false,
        walkPhase: 0,
        nextEggDay: s.nextEggDay,
        eggReady: s.eggReady,
        health: s.health,
      })
    }
  }
}

/** The closest of the viewer and all peer positions to a given point. */
function nearestOf(pos: Vec3, viewerPos: Vec3, others: Map<string, Vec3>): Vec3 {
  let best = viewerPos
  let bestD = dist2(pos, viewerPos)
  for (const p of others.values()) {
    const d = dist2(pos, p)
    if (d < bestD) {
      bestD = d
      best = p
    }
  }
  return best
}

function dist2(a: Vec3, b: { x: number; y: number; z: number }): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  return dx * dx + dy * dy + dz * dz
}

/** Slab-method ray/AABB intersection; returns entry distance or null. */
function rayBox(
  origin: THREE.Vector3,
  dir: THREE.Vector3,
  minX: number,
  minY: number,
  minZ: number,
  maxX: number,
  maxY: number,
  maxZ: number,
): number | null {
  let tMin = 0
  let tMax = Infinity
  const axes: [number, number, number, number][] = [
    [origin.x, dir.x, minX, maxX],
    [origin.y, dir.y, minY, maxY],
    [origin.z, dir.z, minZ, maxZ],
  ]
  for (const [o, d, lo, hi] of axes) {
    if (d === 0) {
      if (o < lo || o > hi) return null
      continue
    }
    let t1 = (lo - o) / d
    let t2 = (hi - o) / d
    if (t1 > t2) [t1, t2] = [t2, t1]
    tMin = Math.max(tMin, t1)
    tMax = Math.min(tMax, t2)
    if (tMin > tMax) return null
  }
  return tMin
}
