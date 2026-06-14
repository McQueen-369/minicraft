import * as THREE from 'three'
import type { Vec3 } from '../player/physics'
import { FURNITURE_HEIGHT, type Furniture, type FurnitureKind, type SavedFurniture } from './furniture'
import { buildFurnitureModel, disposeFurnitureModel, type FurnitureModel } from './furnitureModels'

const OPEN_ANGLE = Math.PI / 2 * 0.95
const VIEW_DISTANCE = 96

/** Holds placed furniture (doors, desks, beds, …) as 3D scene objects. */
export class FurnitureManager {
  readonly items = new Map<string, Furniture>()
  private readonly models = new Map<string, FurnitureModel>()
  private counter = 0

  constructor(private readonly scene: THREE.Scene) {}

  place(kind: FurnitureKind, x: number, y: number, z: number, yaw: number, id?: string): Furniture {
    const f: Furniture = { id: id ?? `f-${Date.now()}-${this.counter++}`, kind, x, y, z, yaw, open: false }
    this.items.set(f.id, f)
    return f
  }

  remove(id: string): Furniture | undefined {
    const f = this.items.get(id)
    if (f) {
      this.items.delete(id)
      const model = this.models.get(id)
      if (model) {
        this.scene.remove(model.group)
        disposeFurnitureModel(model)
        this.models.delete(id)
      }
    }
    return f
  }

  toggleDoor(id: string): boolean {
    const f = this.items.get(id)
    if (!f || f.kind !== 'door') return false
    f.open = !f.open
    return true
  }

  /** Is the cell already occupied by a piece of furniture? */
  occupied(x: number, y: number, z: number): boolean {
    for (const f of this.items.values()) if (f.x === x && f.y === y && f.z === z) return true
    return false
  }

  /** Sync models with state each frame: spawn/cull by distance and animate doors. */
  update(viewerPos: Vec3, dt: number): void {
    for (const f of this.items.values()) {
      const dx = f.x + 0.5 - viewerPos.x
      const dz = f.z + 0.5 - viewerPos.z
      const visible = dx * dx + dz * dz < VIEW_DISTANCE * VIEW_DISTANCE
      let model = this.models.get(f.id)
      if (!visible) {
        if (model) {
          this.scene.remove(model.group)
          disposeFurnitureModel(model)
          this.models.delete(f.id)
        }
        continue
      }
      if (!model) {
        model = buildFurnitureModel(f.kind)
        model.group.position.set(f.x + 0.5, f.y, f.z + 0.5)
        model.group.rotation.y = f.yaw
        this.models.set(f.id, model)
        this.scene.add(model.group)
      }
      if (model.pivot) {
        const target = f.open ? OPEN_ANGLE : 0
        const cur = model.pivot.rotation.y
        model.pivot.rotation.y = cur + (target - cur) * Math.min(1, dt * 10)
      }
    }
  }

  /** Nearest furniture whose pick box the ray hits, within maxDist. */
  raycast(origin: THREE.Vector3, dir: THREE.Vector3, maxDist: number): { furniture: Furniture; distance: number } | null {
    let best: { furniture: Furniture; distance: number } | null = null
    for (const f of this.items.values()) {
      const half = 0.48
      const h = FURNITURE_HEIGHT[f.kind]
      const t = rayBox(origin, dir, f.x + 0.5 - half, f.y, f.z + 0.5 - half, f.x + 0.5 + half, f.y + h, f.z + 0.5 + half)
      if (t !== null && t <= maxDist && (!best || t < best.distance)) best = { furniture: f, distance: t }
    }
    return best
  }

  serialize(): SavedFurniture[] {
    return [...this.items.values()].map((f) => ({ ...f }))
  }

  load(list: SavedFurniture[]): void {
    for (const model of this.models.values()) {
      this.scene.remove(model.group)
      disposeFurnitureModel(model)
    }
    this.models.clear()
    this.items.clear()
    for (const f of list) this.items.set(f.id, { ...f })
  }
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
