import * as THREE from 'three'
import { isSolid } from '../core/blocks'
import type { AnimalKind } from '../items/items'
import { mulberry32 } from '../core/rng'
import type { Vec3 } from '../player/physics'
import type { World } from '../world/world'
import { ANIMAL_DIMS, animalsForChunk, type Animal, type AnimalMode } from './animal'
import { stepAnimal } from './animalAI'
import { buildAnimalModel, disposeModel, type AnimalModel } from './animalModels'

const SIM_DISTANCE = 56
const VIEW_DISTANCE = 96

export interface SavedAnimal {
  id: string
  kind: AnimalKind
  pos: Vec3
  yaw: number
  mode: AnimalMode
  owner: string | null
}

export class EntityManager {
  readonly animals = new Map<string, Animal>()
  /** Chunks whose wild spawns were already consumed (persisted). */
  readonly spawnedChunks = new Set<string>()
  private readonly models = new Map<string, AnimalModel>()
  private readonly rand = mulberry32(Date.now() & 0xffffffff)
  private releaseCounter = 0

  constructor(
    private readonly scene: THREE.Scene,
    private readonly world: World,
  ) {}

  /**
   * Spawn wild animals from newly generated chunks, advance AI (when
   * simulating — guests instead receive host state), and update models.
   */
  update(dt: number, viewerPos: Vec3, ownerPositions: Map<string, Vec3>, simulate: boolean): void {
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
    }

    const isSolidAt = (x: number, y: number, z: number) => isSolid(this.world.getBlock(x, y, z))
    for (const animal of this.animals.values()) {
      if (simulate) {
        const nearAnyone =
          dist2(animal.pos, viewerPos) < SIM_DISTANCE * SIM_DISTANCE ||
          [...ownerPositions.values()].some((p) => dist2(animal.pos, p) < SIM_DISTANCE * SIM_DISTANCE)
        if (nearAnyone) {
          const ownerPos = animal.owner !== null ? (ownerPositions.get(animal.owner) ?? null) : null
          stepAnimal(animal, dt, { isSolid: isSolidAt, ownerPos, rand: this.rand })
        }
      }
      this.syncModel(animal, viewerPos)
    }
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
        mode: a.mode,
        owner: a.owner,
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
      })
    }
  }
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
