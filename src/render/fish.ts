import * as THREE from 'three'
import { WATER_LEVEL } from '../constants'
import { mulberry32 } from '../core/rng'

const FISH_COUNT = 12
const FISH_COLORS = [0xff6b35, 0x2196f3, 0xffd700, 0x4caf50, 0xe91e63, 0xff9800, 0x00bcd4, 0xf06292]

interface FishState {
  group: THREE.Group
  phase: number
  speed: number
  radius: number
  bob: number
  schoolOffset: THREE.Vector3
}

export class FishSchool {
  private readonly schoolGroup: THREE.Group
  private readonly fish: FishState[] = []
  private time = 0

  constructor(scene: THREE.Scene, seed: number) {
    this.schoolGroup = new THREE.Group()
    scene.add(this.schoolGroup)

    const rng = mulberry32(seed ^ 0xf15ca4)

    for (let i = 0; i < FISH_COUNT; i++) {
      const color = FISH_COLORS[Math.floor(rng() * FISH_COLORS.length)]
      const tailColor = new THREE.Color(color).multiplyScalar(0.6).getHex()

      const fishGroup = new THREE.Group()

      // Body
      const bodyGeo = new THREE.BoxGeometry(0.38, 0.1, 0.16)
      const bodyMat = new THREE.MeshLambertMaterial({ color })
      const body = new THREE.Mesh(bodyGeo, bodyMat)
      fishGroup.add(body)

      // Tail fin (smaller, darker)
      const tailGeo = new THREE.BoxGeometry(0.14, 0.14, 0.06)
      const tailMat = new THREE.MeshLambertMaterial({ color: tailColor })
      const tail = new THREE.Mesh(tailGeo, tailMat)
      tail.position.set(-0.24, 0, 0)
      tail.rotation.z = Math.PI / 6
      fishGroup.add(tail)

      // Small eye
      const eyeGeo = new THREE.BoxGeometry(0.04, 0.04, 0.04)
      const eyeMat = new THREE.MeshLambertMaterial({ color: 0x111111 })
      const eye = new THREE.Mesh(eyeGeo, eyeMat)
      eye.position.set(0.16, 0.04, 0.09)
      fishGroup.add(eye)

      this.schoolGroup.add(fishGroup)

      // Spread fish across two loose sub-groups / clusters
      const cluster = Math.floor(rng() * 2)
      const clusterOffX = (cluster - 0.5) * 6
      const clusterOffZ = rng() * 4 - 2

      this.fish.push({
        group: fishGroup,
        phase: rng() * Math.PI * 2,
        speed: 0.4 + rng() * 0.6,
        radius: 1.5 + rng() * 3,
        bob: rng() * Math.PI * 2,
        schoolOffset: new THREE.Vector3(clusterOffX, rng() * 1.2 - 0.6, clusterOffZ),
      })
    }
  }

  update(dt: number, playerX: number, playerZ: number): void {
    this.time += dt

    // School drifts lazily near the player, always at water depth
    this.schoolGroup.position.set(playerX, WATER_LEVEL - 1.8, playerZ)

    for (const f of this.fish) {
      const angle = f.phase + this.time * f.speed
      const x = f.schoolOffset.x + Math.cos(angle) * f.radius
      const y = f.schoolOffset.y + Math.sin(this.time * 0.35 + f.bob) * 0.25
      const z = f.schoolOffset.z + Math.sin(angle) * f.radius

      f.group.position.set(x, y, z)
      // Face swimming direction (velocity is tangent to circle)
      f.group.rotation.y = -angle - Math.PI / 2
      // Gentle roll with the bob
      f.group.rotation.z = Math.sin(this.time * 0.5 + f.bob) * 0.12
    }
  }
}
