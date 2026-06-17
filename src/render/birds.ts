import * as THREE from 'three'
import { WATER_LEVEL } from '../constants'
import { mulberry32 } from '../core/rng'

const BIRD_COUNT = 6
const BIRD_COLORS = [0xff4444, 0x44cc44, 0x4488ff, 0xffaa00, 0xff44cc, 0x44eedd, 0xffdd22, 0xaa44ff]
const BIRD_ALTITUDE = 26

interface BirdState {
  group: THREE.Group
  leftWing: THREE.Object3D
  rightWing: THREE.Object3D
  phase: number
  radius: number
  speed: number
  height: number
  flapSpeed: number
}

export class BirdFlock {
  private readonly flockGroup: THREE.Group
  private readonly birds: BirdState[] = []
  private time = 0

  constructor(scene: THREE.Scene, seed: number) {
    this.flockGroup = new THREE.Group()
    scene.add(this.flockGroup)

    const rng = mulberry32(seed ^ 0xb17d5a)

    for (let i = 0; i < BIRD_COUNT; i++) {
      const color = BIRD_COLORS[Math.floor(rng() * BIRD_COLORS.length)]
      const wingColor = new THREE.Color(color).multiplyScalar(0.72).getHex()

      const birdGroup = new THREE.Group()

      // Body
      const bodyGeo = new THREE.BoxGeometry(0.16, 0.1, 0.3)
      const bodyMat = new THREE.MeshLambertMaterial({ color })
      const body = new THREE.Mesh(bodyGeo, bodyMat)
      birdGroup.add(body)

      // Tail feather
      const tailGeo = new THREE.BoxGeometry(0.1, 0.04, 0.14)
      const tailMat = new THREE.MeshLambertMaterial({ color: wingColor })
      const tail = new THREE.Mesh(tailGeo, tailMat)
      tail.position.z = -0.22
      birdGroup.add(tail)

      // Left wing pivot (at body left side, wing fans outward)
      const lwPivot = new THREE.Group()
      lwPivot.position.set(-0.08, 0, 0)
      const lwGeo = new THREE.BoxGeometry(0.34, 0.04, 0.2)
      const lwMat = new THREE.MeshLambertMaterial({ color: wingColor })
      const lw = new THREE.Mesh(lwGeo, lwMat)
      lw.position.x = -0.17
      lwPivot.add(lw)
      birdGroup.add(lwPivot)

      // Right wing pivot (mirror)
      const rwPivot = new THREE.Group()
      rwPivot.position.set(0.08, 0, 0)
      const rwGeo = new THREE.BoxGeometry(0.34, 0.04, 0.2)
      const rwMat = new THREE.MeshLambertMaterial({ color: wingColor })
      const rw = new THREE.Mesh(rwGeo, rwMat)
      rw.position.x = 0.17
      rwPivot.add(rw)
      birdGroup.add(rwPivot)

      this.flockGroup.add(birdGroup)

      this.birds.push({
        group: birdGroup,
        leftWing: lwPivot,
        rightWing: rwPivot,
        phase: rng() * Math.PI * 2,
        radius: 10 + rng() * 14,
        speed: 0.25 + rng() * 0.35,
        height: BIRD_ALTITUDE + rng() * 8 - 4,
        flapSpeed: 3.5 + rng() * 3,
      })
    }
  }

  update(dt: number, playerX: number, playerZ: number): void {
    this.time += dt
    this.flockGroup.position.set(playerX, WATER_LEVEL, playerZ)

    for (const b of this.birds) {
      const angle = b.phase + this.time * b.speed
      const x = Math.cos(angle) * b.radius
      const y = b.height + Math.sin(this.time * 0.18 + b.phase) * 2.5
      const z = Math.sin(angle) * b.radius

      b.group.position.set(x, y, z)
      b.group.rotation.y = -angle - Math.PI / 2

      // Flap wings
      const flapAngle = Math.sin(this.time * b.flapSpeed + b.phase) * 0.65
      b.leftWing.rotation.z = flapAngle
      b.rightWing.rotation.z = -flapAngle
    }
  }
}
