import * as THREE from 'three'
import { BlockId } from '../core/blocks'
import { hash2D } from '../core/rng'
import type { Vec3 } from '../player/physics'
import type { World } from '../world/world'

const FLOWER_SEED = 0xf10a
const FLOWER_PROB = 0.04
const FLOWER_RADIUS = 20 // world blocks scanned around the viewer
const RESCAN_INTERVAL = 0.5
const BUTTERFLY_COUNT = 8
const BUTTERFLY_RANGE = 26

const PETALS = [0xff5d8f, 0xffd34d, 0xff8c42, 0xc792ff, 0xffffff, 0x6fc3ff]

interface Butterfly {
  group: THREE.Group
  wingL: THREE.Object3D
  wingR: THREE.Object3D
  pos: THREE.Vector3
  target: THREE.Vector3
  phase: number
  speed: number
}

/**
 * Purely decorative ambient life: deterministic flowers on nearby grass and a
 * handful of butterflies fluttering around the player. Nothing here is saved
 * or interactive — flowers regenerate from the world seed, butterflies drift.
 */
export class DecorationManager {
  private readonly flowers = new Map<string, THREE.Group>()
  private readonly butterflies: Butterfly[] = []
  private rescanIn = 0

  constructor(
    private readonly scene: THREE.Scene,
    private readonly seed: number,
  ) {}

  update(world: World, viewer: Vec3, dt: number): void {
    this.rescanIn -= dt
    if (this.rescanIn <= 0) {
      this.rescanIn = RESCAN_INTERVAL
      this.rescanFlowers(world, viewer)
    }
    this.updateButterflies(world, viewer, dt)
  }

  // ------------------------------------------------------------------ flowers

  private rescanFlowers(world: World, viewer: Vec3): void {
    const cx = Math.round(viewer.x)
    const cz = Math.round(viewer.z)
    const wanted = new Set<string>()
    for (let dz = -FLOWER_RADIUS; dz <= FLOWER_RADIUS; dz++) {
      for (let dx = -FLOWER_RADIUS; dx <= FLOWER_RADIUS; dx++) {
        if (dx * dx + dz * dz > FLOWER_RADIUS * FLOWER_RADIUS) continue
        const x = cx + dx
        const z = cz + dz
        if (hash2D(this.seed ^ FLOWER_SEED, x, z) >= FLOWER_PROB) continue
        const h = world.terrain.heightAt(x, z)
        if (world.getBlock(x, h, z) !== BlockId.Grass || world.getBlock(x, h + 1, z) !== BlockId.Air) continue
        const key = `${x},${z}`
        wanted.add(key)
        if (!this.flowers.has(key)) {
          const model = buildFlower(hash2D(this.seed ^ 0x9e3, x, z))
          model.position.set(x + 0.5, h + 1, z + 0.5)
          this.flowers.set(key, model)
          this.scene.add(model)
        }
      }
    }
    for (const [key, model] of this.flowers) {
      if (!wanted.has(key)) {
        this.scene.remove(model)
        disposeGroup(model)
        this.flowers.delete(key)
      }
    }
  }

  // -------------------------------------------------------------- butterflies

  private updateButterflies(world: World, viewer: Vec3, dt: number): void {
    while (this.butterflies.length < BUTTERFLY_COUNT) {
      const b = buildButterfly()
      this.scene.add(b.group)
      this.butterflies.push(b)
      this.retarget(b, world, viewer, true)
    }
    for (const b of this.butterflies) {
      const toTarget = b.target.clone().sub(b.pos)
      const dist = toTarget.length()
      const dxz = Math.hypot(b.pos.x - viewer.x, b.pos.z - viewer.z)
      if (dist < 0.6 || dxz > BUTTERFLY_RANGE * 1.5) {
        this.retarget(b, world, viewer, dxz > BUTTERFLY_RANGE * 1.5)
      } else {
        toTarget.normalize().multiplyScalar(b.speed * dt)
        b.pos.add(toTarget)
      }
      b.phase += dt * 14
      b.pos.y += Math.sin(b.phase * 0.5) * dt * 0.4 // gentle bob
      b.group.position.copy(b.pos)
      if (dist > 0.001) b.group.rotation.y = Math.atan2(b.target.x - b.pos.x, b.target.z - b.pos.z)
      const flap = Math.sin(b.phase) * 0.9
      b.wingL.rotation.z = flap
      b.wingR.rotation.z = -flap
    }
  }

  private retarget(b: Butterfly, world: World, viewer: Vec3, reposition: boolean): void {
    const ang = Math.random() * Math.PI * 2
    const r = 4 + Math.random() * BUTTERFLY_RANGE
    const tx = viewer.x + Math.cos(ang) * r
    const tz = viewer.z + Math.sin(ang) * r
    const ground = world.terrain.heightAt(Math.round(tx), Math.round(tz))
    const ty = ground + 1.4 + Math.random() * 2
    b.target.set(tx, ty, tz)
    if (reposition) {
      b.pos.copy(b.target)
      b.group.position.copy(b.pos)
    }
  }
}

function buildFlower(rand: number): THREE.Group {
  const g = new THREE.Group()
  const stem = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.4, 0.05), new THREE.MeshLambertMaterial({ color: 0x3d7a2e }))
  stem.position.y = 0.2
  g.add(stem)
  const color = PETALS[Math.floor(rand * PETALS.length) % PETALS.length]
  const petalMat = new THREE.MeshLambertMaterial({ color })
  for (let i = 0; i < 4; i++) {
    const petal = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.12), petalMat)
    const a = (i / 4) * Math.PI * 2
    petal.position.set(Math.cos(a) * 0.09, 0.42, Math.sin(a) * 0.09)
    g.add(petal)
  }
  const center = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.09), new THREE.MeshLambertMaterial({ color: 0xffe066 }))
  center.position.y = 0.43
  g.add(center)
  return g
}

function buildButterfly(): Butterfly {
  const group = new THREE.Group()
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.18), new THREE.MeshLambertMaterial({ color: 0x2a2a2a }))
  group.add(body)
  const color = PETALS[Math.floor(Math.random() * PETALS.length)]
  const wingMat = new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide })
  const wingL = new THREE.Group()
  const wingR = new THREE.Group()
  const meshL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.16), wingMat)
  meshL.position.x = 0.11
  wingL.add(meshL)
  const meshR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.16), wingMat)
  meshR.position.x = -0.11
  wingR.add(meshR)
  group.add(wingL, wingR)
  return {
    group,
    wingL,
    wingR,
    pos: new THREE.Vector3(),
    target: new THREE.Vector3(),
    phase: Math.random() * Math.PI * 2,
    speed: 1.6 + Math.random() * 1.2,
  }
}

function disposeGroup(group: THREE.Group): void {
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose()
      const mat = obj.material as THREE.Material | THREE.Material[]
      for (const m of Array.isArray(mat) ? mat : [mat]) m.dispose()
    }
  })
}
