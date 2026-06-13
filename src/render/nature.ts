import * as THREE from 'three'
import { WATER_LEVEL } from '../constants'

const FLOWER_POOL = 50
const BUTTERFLY_COUNT = 7
const DRAGONFLY_COUNT = 5
const BIRD_COUNT = 6

const FLOWER_COLORS = [0xff4488, 0xff8800, 0xffdd00, 0xaa44ff, 0xff2222, 0x44aaff, 0xffffff, 0xff99cc]
const BUTTERFLY_COLORS = [0xff6600, 0x1166ff, 0xffcc00, 0xffffff, 0xff44aa, 0x00cc44, 0xaa22ff]
const DRAGONFLY_COLORS = [0x44aaff, 0x00cc88, 0xaa44ff, 0xff4400, 0x00aacc]
const BIRD_COLORS = [0x333333, 0x884422, 0x1133aa, 0x226633, 0x553311, 0x666666]

function cellRng(x: number, z: number): number {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453
  return ((s % 1) + 1) % 1
}

export class NatureManager {
  private readonly flowerGroups: THREE.Group[] = []
  private readonly flowerStemMat: THREE.MeshBasicMaterial
  private readonly flowerPetalMats: THREE.MeshBasicMaterial[]

  private readonly bfGroups: THREE.Group[] = []
  private readonly bfWingL: THREE.Mesh[] = []
  private readonly bfWingR: THREE.Mesh[] = []
  private readonly bfMats: THREE.MeshBasicMaterial[] = []

  private readonly dfGroups: THREE.Group[] = []
  private readonly dfWings: THREE.Mesh[][] = []
  private readonly dfMats: THREE.MeshBasicMaterial[] = []

  private readonly birdGroups: THREE.Group[] = []
  private readonly birdWingL: THREE.Mesh[] = []
  private readonly birdWingR: THREE.Mesh[] = []
  private readonly birdMats: THREE.MeshBasicMaterial[] = []

  private time = 0
  private lastCX = NaN
  private lastCZ = NaN

  constructor(
    private readonly scene: THREE.Scene,
    private readonly getHeight: (x: number, z: number) => number,
  ) {
    this.flowerStemMat = new THREE.MeshBasicMaterial({ color: 0x228822 })
    this.flowerPetalMats = FLOWER_COLORS.map(
      (c) => new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }),
    )

    this.initFlowers()
    this.initButterflies()
    this.initDragonflies()
    this.initBirds()
  }

  private initFlowers(): void {
    const petalGeo = new THREE.PlaneGeometry(0.4, 0.4)
    const stemGeo = new THREE.BoxGeometry(0.05, 0.4, 0.05)

    for (let i = 0; i < FLOWER_POOL; i++) {
      const group = new THREE.Group()
      group.visible = false

      const stem = new THREE.Mesh(stemGeo, this.flowerStemMat)
      stem.position.y = 0.2
      group.add(stem)

      const mat = this.flowerPetalMats[i % this.flowerPetalMats.length]
      const p1 = new THREE.Mesh(petalGeo, mat)
      p1.position.y = 0.62
      const p2 = new THREE.Mesh(petalGeo, mat)
      p2.position.y = 0.62
      p2.rotation.y = Math.PI / 2
      group.add(p1, p2)

      this.flowerGroups.push(group)
      this.scene.add(group)
    }
  }

  private initButterflies(): void {
    const bodyGeo = new THREE.BoxGeometry(0.07, 0.07, 0.32)
    const wingGeo = new THREE.PlaneGeometry(0.42, 0.28)

    for (let i = 0; i < BUTTERFLY_COUNT; i++) {
      const group = new THREE.Group()

      const bodyMat = new THREE.MeshBasicMaterial({ color: 0x111111 })
      this.bfMats.push(bodyMat)
      group.add(new THREE.Mesh(bodyGeo, bodyMat))

      const wingColor = BUTTERFLY_COLORS[i % BUTTERFLY_COLORS.length]
      const wingMat = new THREE.MeshBasicMaterial({
        color: wingColor,
        transparent: true,
        opacity: 0.88,
        side: THREE.DoubleSide,
      })
      this.bfMats.push(wingMat)

      const wL = new THREE.Mesh(wingGeo, wingMat)
      wL.position.set(-0.24, 0.04, 0)
      const wR = new THREE.Mesh(wingGeo, wingMat)
      wR.position.set(0.24, 0.04, 0)

      group.add(wL, wR)
      this.bfWingL.push(wL)
      this.bfWingR.push(wR)
      this.bfGroups.push(group)
      this.scene.add(group)
    }
  }

  private initDragonflies(): void {
    const bodyGeo = new THREE.BoxGeometry(0.07, 0.07, 0.52)
    const fwGeo = new THREE.PlaneGeometry(0.48, 0.17)
    const hwGeo = new THREE.PlaneGeometry(0.38, 0.14)

    for (let i = 0; i < DRAGONFLY_COUNT; i++) {
      const group = new THREE.Group()

      const bodyMat = new THREE.MeshBasicMaterial({ color: DRAGONFLY_COLORS[i % DRAGONFLY_COLORS.length] })
      this.dfMats.push(bodyMat)
      group.add(new THREE.Mesh(bodyGeo, bodyMat))

      const wingMat = new THREE.MeshBasicMaterial({
        color: 0xccddff,
        transparent: true,
        opacity: 0.58,
        side: THREE.DoubleSide,
      })
      this.dfMats.push(wingMat)

      const wings: THREE.Mesh[] = []
      const configs = [
        { geo: fwGeo, x: -0.27, z: -0.1 },
        { geo: fwGeo, x: +0.27, z: -0.1 },
        { geo: hwGeo, x: -0.22, z: +0.1 },
        { geo: hwGeo, x: +0.22, z: +0.1 },
      ]
      for (const cfg of configs) {
        const w = new THREE.Mesh(cfg.geo, wingMat)
        w.position.set(cfg.x, 0, cfg.z)
        group.add(w)
        wings.push(w)
      }

      this.dfWings.push(wings)
      this.dfGroups.push(group)
      this.scene.add(group)
    }
  }

  private initBirds(): void {
    const bodyGeo = new THREE.BoxGeometry(0.24, 0.18, 0.52)
    const headGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18)
    const wingGeo = new THREE.BoxGeometry(0.52, 0.04, 0.28)

    for (let i = 0; i < BIRD_COUNT; i++) {
      const group = new THREE.Group()

      const mat = new THREE.MeshBasicMaterial({ color: BIRD_COLORS[i % BIRD_COLORS.length] })
      this.birdMats.push(mat)

      group.add(new THREE.Mesh(bodyGeo, mat))

      const head = new THREE.Mesh(headGeo, mat)
      head.position.set(0, 0.08, -0.29)
      group.add(head)

      const wL = new THREE.Mesh(wingGeo, mat)
      wL.position.set(-0.38, 0, 0)
      const wR = new THREE.Mesh(wingGeo, mat)
      wR.position.set(0.38, 0, 0)
      group.add(wL, wR)

      this.birdWingL.push(wL)
      this.birdWingR.push(wR)
      this.birdGroups.push(group)
      this.scene.add(group)
    }
  }

  update(dt: number, center: THREE.Vector3, daylight: number): void {
    this.time += dt
    const t = this.time

    const cx = Math.round(center.x)
    const cz = Math.round(center.z)
    if (Math.abs(cx - this.lastCX) > 12 || Math.abs(cz - this.lastCZ) > 12) {
      this.lastCX = cx
      this.lastCZ = cz
      this.placeFlowers(cx, cz)
    }

    const alive = daylight > 0.08

    // Butterflies: gentle orbit, slow bob, wing flap
    for (let i = 0; i < BUTTERFLY_COUNT; i++) {
      const group = this.bfGroups[i]
      group.visible = alive
      if (!alive) continue

      const r = 4.5 + i * 1.1
      const ang = t * (0.38 + i * 0.07) + (i * Math.PI * 2) / BUTTERFLY_COUNT
      const wx = center.x + Math.cos(ang) * r
      const wz = center.z + Math.sin(ang) * r
      const gh = this.getHeight(Math.floor(wx), Math.floor(wz))
      const wy = Math.max(gh, WATER_LEVEL) + 1.6 + Math.sin(t * 1.4 + i * 1.3) * 0.35

      group.position.set(wx, wy, wz)
      group.rotation.y = -(ang - Math.PI / 2)

      const flap = Math.sin(t * 5.5 + i) * 0.85
      this.bfWingL[i].rotation.z = flap + 0.2
      this.bfWingR[i].rotation.z = -(flap + 0.2)
    }

    // Dragonflies: tighter orbit, rapid wing vibration
    for (let i = 0; i < DRAGONFLY_COUNT; i++) {
      const group = this.dfGroups[i]
      group.visible = alive
      if (!alive) continue

      const r = 3.0 + i * 0.9
      const ang = t * (0.6 + i * 0.12) + (i * Math.PI * 2) / DRAGONFLY_COUNT + 1.1
      const wx = center.x + Math.cos(ang) * r
      const wz = center.z + Math.sin(ang) * r
      const gh = this.getHeight(Math.floor(wx), Math.floor(wz))
      const wy = Math.max(gh, WATER_LEVEL) + 1.3 + Math.sin(t * 2.1 + i * 0.9) * 0.28

      group.position.set(wx, wy, wz)
      group.rotation.y = -(ang - Math.PI / 2)

      const vib = Math.sin(t * 22 + i) * 0.28
      for (const w of this.dfWings[i]) {
        w.rotation.z = vib * (w.position.x > 0 ? -1 : 1)
      }
    }

    // Birds: wide lazy circles at high altitude, slow wing flap
    for (let i = 0; i < BIRD_COUNT; i++) {
      const group = this.birdGroups[i]
      group.visible = alive
      if (!alive) continue

      const r = 14 + i * 3.5
      const ang = t * (0.16 + i * 0.03) + (i * Math.PI * 2) / BIRD_COUNT
      const wx = center.x + Math.cos(ang) * r
      const wz = center.z + Math.sin(ang) * r
      const wy = center.y + 14 + (i % 3) * 3 + Math.sin(t * 0.45 + i) * 1.4

      group.position.set(wx, wy, wz)
      group.rotation.y = -(ang - Math.PI / 2)

      const flap = Math.sin(t * 1.7 + i * 0.8) * 0.48
      this.birdWingL[i].rotation.z = flap + 0.12
      this.birdWingR[i].rotation.z = -(flap + 0.12)
    }
  }

  private placeFlowers(cx: number, cz: number): void {
    let slot = 0
    const R = 14
    outer: for (let dx = -R; dx <= R; dx++) {
      for (let dz = -R; dz <= R; dz++) {
        const wx = cx + dx
        const wz = cz + dz
        if (cellRng(wx, wz) > 0.7) {
          const h = this.getHeight(wx, wz)
          if (h > WATER_LEVEL) {
            const jx = cellRng(wx + 0.5, wz) - 0.5
            const jz = cellRng(wx, wz + 0.5) - 0.5
            this.flowerGroups[slot].position.set(wx + jx, h, wz + jz)
            this.flowerGroups[slot].rotation.y = cellRng(wx * 7, wz * 11) * Math.PI * 2
            this.flowerGroups[slot].visible = true
            if (++slot >= FLOWER_POOL) break outer
          }
        }
      }
    }
    for (; slot < FLOWER_POOL; slot++) {
      this.flowerGroups[slot].visible = false
    }
  }

  dispose(): void {
    const allGroups = [...this.flowerGroups, ...this.bfGroups, ...this.dfGroups, ...this.birdGroups]
    const geosSeen = new Set<THREE.BufferGeometry>()
    const matsSeen = new Set<THREE.Material>()

    for (const group of allGroups) {
      group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          if (!geosSeen.has(obj.geometry)) {
            obj.geometry.dispose()
            geosSeen.add(obj.geometry)
          }
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
          for (const m of mats) {
            if (!matsSeen.has(m)) {
              m.dispose()
              matsSeen.add(m)
            }
          }
        }
      })
      this.scene.remove(group)
    }
  }
}
