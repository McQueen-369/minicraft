import * as THREE from 'three'
import type { WeatherType } from './sky'

const CLOUD_COUNT = 9
const STAR_COUNT = 420

/** Visualises sun disk, moon, star field, and drifting clouds in the scene. */
export class SkyObjects {
  private readonly sunMesh: THREE.Mesh
  private readonly sunGlow: THREE.Mesh
  private readonly moonMesh: THREE.Mesh
  private readonly starPoints: THREE.Points
  private readonly cloudGroups: THREE.Group[] = []
  private readonly cloudOffsets: { x: number; z: number; speed: number }[] = []
  private readonly cloudMat: THREE.MeshLambertMaterial
  private starAngle = 0

  constructor(private readonly scene: THREE.Scene) {
    // ── Sun ──────────────────────────────────────────────────────────────────
    const sunGeo = new THREE.SphereGeometry(5, 12, 12)
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffffc8 })
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat)
    scene.add(this.sunMesh)

    const glowGeo = new THREE.SphereGeometry(8.5, 12, 12)
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffee80,
      transparent: true,
      opacity: 0.22,
      side: THREE.BackSide,
      depthWrite: false,
    })
    this.sunGlow = new THREE.Mesh(glowGeo, glowMat)
    this.sunMesh.add(this.sunGlow)

    // ── Moon ──────────────────────────────────────────────────────────────────
    const moonGeo = new THREE.SphereGeometry(3.2, 10, 10)
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xd8ddf2 })
    this.moonMesh = new THREE.Mesh(moonGeo, moonMat)
    scene.add(this.moonMesh)

    // ── Stars ─────────────────────────────────────────────────────────────────
    const rng = (n: number): number => (((Math.sin(n * 127.1 + 0.5) * 43758.5453) % 1) + 1) % 1
    const starPos: number[] = []
    const starColors: number[] = []
    for (let i = 0; i < STAR_COUNT; i++) {
      const theta = rng(i * 2) * Math.PI * 2
      const phi = Math.acos(2 * rng(i * 2 + 1) - 1)
      const r = 90
      starPos.push(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi))
      const bright = 0.55 + rng(i + 800) * 0.45
      const tint = rng(i + 900)
      if (tint < 0.2) starColors.push(bright * 0.82, bright * 0.88, bright)       // blue-white
      else if (tint < 0.35) starColors.push(bright, bright * 0.88, bright * 0.7)  // warm yellow
      else starColors.push(bright, bright, bright)
    }
    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3))
    starGeo.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3))
    const starMat = new THREE.PointsMaterial({
      size: 2,
      sizeAttenuation: false,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    })
    this.starPoints = new THREE.Points(starGeo, starMat)
    scene.add(this.starPoints)

    // ── Clouds ────────────────────────────────────────────────────────────────
    this.cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })
    const cr = (n: number): number => (((Math.sin(n * 397.1 + 0.3) * 9837.6) % 1) + 1) % 1
    for (let c = 0; c < CLOUD_COUNT; c++) {
      const cloud = new THREE.Group()
      const parts = 3 + Math.floor(cr(c) * 3)
      for (let p = 0; p < parts; p++) {
        const w = 5 + cr(c * 137 + p) * 14
        const h = 2 + cr(c * 137 + p + 1) * 2.5
        const d = 4 + cr(c * 137 + p + 2) * 9
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this.cloudMat)
        mesh.position.set(
          (cr(c * 137 + p + 3) - 0.5) * 12,
          (cr(c * 137 + p + 4) - 0.5) * 3,
          (cr(c * 137 + p + 5) - 0.5) * 10,
        )
        cloud.add(mesh)
      }
      this.cloudOffsets.push({
        x: (cr(c + 11) - 0.5) * 220,
        z: (cr(c + 22) - 0.5) * 220,
        speed: 1.5 + cr(c + 33) * 4,
      })
      this.cloudGroups.push(cloud)
      scene.add(cloud)
    }
  }

  update(
    skyTime: number,
    center: THREE.Vector3,
    daylight: number,
    weather: WeatherType,
    dt: number,
  ): void {
    const angle = skyTime * Math.PI * 2
    const elevation = Math.sin(angle)
    const r = 90

    // Sun — follows DirectionalLight position arc
    this.sunMesh.position.set(
      center.x + Math.cos(angle) * r,
      center.y + elevation * r,
      center.z + 30,
    )
    this.sunMesh.visible = elevation > -0.08 && weather !== 'rain'

    // Moon — opposite arc
    this.moonMesh.position.set(
      center.x - Math.cos(angle) * r,
      center.y - elevation * r,
      center.z + 30,
    )
    this.moonMesh.visible = elevation < 0.12

    // Stars — centred on camera, slow rotation
    this.starPoints.position.copy(center)
    this.starAngle += dt * 0.004
    this.starPoints.rotation.y = this.starAngle
    const starAlpha = Math.max(0, 1 - daylight * 3)
    ;(this.starPoints.material as THREE.PointsMaterial).opacity = starAlpha
    this.starPoints.visible = starAlpha > 0.02

    // Clouds — drift east, wrap
    const showClouds = weather !== 'rain' && daylight > 0.05
    const cloudBaseY = center.y + 48
    for (let c = 0; c < CLOUD_COUNT; c++) {
      const off = this.cloudOffsets[c]
      off.x += off.speed * dt
      if (off.x > 130) off.x -= 260
      this.cloudGroups[c].position.set(center.x + off.x, cloudBaseY + (c % 3) * 5, center.z + off.z)
      this.cloudGroups[c].visible = showClouds
    }
  }

  dispose(): void {
    ;([this.sunMesh, this.moonMesh] as THREE.Mesh[]).forEach((m) => {
      this.scene.remove(m)
      m.geometry.dispose()
      ;(m.material as THREE.Material).dispose()
    })
    this.sunGlow.geometry.dispose()
    ;(this.sunGlow.material as THREE.Material).dispose()
    this.scene.remove(this.starPoints)
    this.starPoints.geometry.dispose()
    ;(this.starPoints.material as THREE.Material).dispose()
    for (const cloud of this.cloudGroups) {
      cloud.traverse((obj) => {
        if (obj instanceof THREE.Mesh) obj.geometry.dispose()
      })
      this.scene.remove(cloud)
    }
    this.cloudMat.dispose()
  }
}
