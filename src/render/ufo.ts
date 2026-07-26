import * as THREE from 'three'
import { mulberry32 } from '../core/rng'

/**
 * The robot world's mothership: a saucer that circles high overhead, spinning
 * its light ring and sweeping a soft beam beneath it.
 *
 * Purely scenery — like the birds and the fish, it is anchored to the player so
 * it is always somewhere in the sky, and nothing about it is saved.
 */

/** How high above the water line the saucers cruise. */
const ALTITUDE = 52
/** Hull radius. Big enough to read as a craft from the ground, not a speck. */
const HULL_R = 6.5
/** Colours the ring lamps cycle through. */
const LAMP_COLORS = [0x2fd4d4, 0xff3b30, 0xffd040, 0x6fe3ff]
const LAMPS_PER_RING = 8

interface Saucer {
  group: THREE.Group
  ring: THREE.Object3D
  beam: THREE.Mesh
  lamps: THREE.MeshBasicMaterial[]
  phase: number
  radius: number
  speed: number
  height: number
  bob: number
}

export class UfoFleet {
  private readonly root: THREE.Group
  private readonly saucers: Saucer[] = []
  private time = 0

  constructor(scene: THREE.Scene, seed: number, count = 2) {
    this.root = new THREE.Group()
    scene.add(this.root)
    const rng = mulberry32(seed ^ 0x0f0f5a)
    for (let i = 0; i < count; i++) {
      const saucer = buildSaucer(rng)
      saucer.phase = rng() * Math.PI * 2
      saucer.radius = 45 + rng() * 55
      saucer.speed = 0.055 + rng() * 0.05
      saucer.height = ALTITUDE + rng() * 14
      saucer.bob = 1.5 + rng() * 2.5
      this.root.add(saucer.group)
      this.saucers.push(saucer)
    }
  }

  update(dt: number, playerX: number, playerZ: number): void {
    this.time += dt
    this.root.position.set(playerX, 0, playerZ)
    for (const s of this.saucers) {
      const angle = s.phase + this.time * s.speed
      s.group.position.set(
        Math.cos(angle) * s.radius,
        s.height + Math.sin(this.time * 0.25 + s.phase) * s.bob,
        Math.sin(angle) * s.radius,
      )
      // Bank into the turn, and keep the hull spinning slowly under its dome.
      s.group.rotation.z = Math.sin(this.time * 0.25 + s.phase) * 0.08
      s.ring.rotation.y += dt * 0.9
      // Lamps chase around the ring; the beam breathes in and out.
      for (let i = 0; i < s.lamps.length; i++) {
        const lit = (Math.sin(this.time * 3 - i * 0.8 + s.phase) + 1) / 2
        s.lamps[i].opacity = 0.35 + lit * 0.65
      }
      const beamMat = s.beam.material as THREE.MeshBasicMaterial
      beamMat.opacity = 0.06 + (Math.sin(this.time * 0.8 + s.phase) + 1) * 0.05
    }
  }

  dispose(): void {
    this.root.parent?.remove(this.root)
    this.root.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose()
        const mat = obj.material as THREE.Material | THREE.Material[]
        for (const m of Array.isArray(mat) ? mat : [mat]) m.dispose()
      }
    })
  }
}

function buildSaucer(rng: () => number): Saucer {
  const group = new THREE.Group()
  const hull = 0x9aa6b2
  const dark = 0x4f5a66

  // Hull: two stacked discs give the classic saucer profile without a texture.
  const lower = new THREE.Mesh(
    new THREE.CylinderGeometry(HULL_R * 0.32, HULL_R, 1.7, 14),
    new THREE.MeshLambertMaterial({ color: dark }),
  )
  lower.position.y = -0.85
  const upper = new THREE.Mesh(
    new THREE.CylinderGeometry(HULL_R, HULL_R * 0.65, 1.3, 14),
    new THREE.MeshLambertMaterial({ color: hull }),
  )
  upper.position.y = 0.65
  // Cockpit dome.
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(HULL_R * 0.44, 14, 9, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: 0x6fe3ff, transparent: true, opacity: 0.55 }),
  )
  dome.position.y = 1.3
  group.add(lower, upper, dome)

  // Light ring: lamps set into the rim, spinning as a unit.
  const ring = new THREE.Group()
  const lamps: THREE.MeshBasicMaterial[] = []
  for (let i = 0; i < LAMPS_PER_RING; i++) {
    const a = (i / LAMPS_PER_RING) * Math.PI * 2
    const mat = new THREE.MeshBasicMaterial({
      color: LAMP_COLORS[Math.floor(rng() * LAMP_COLORS.length)],
      transparent: true,
      opacity: 0.8,
    })
    const lampMesh = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), mat)
    lampMesh.position.set(Math.cos(a) * (HULL_R * 0.92), -0.2, Math.sin(a) * (HULL_R * 0.92))
    ring.add(lampMesh)
    lamps.push(mat)
  }
  group.add(ring)

  // Tractor beam: a wide, very soft cone hanging under the hull.
  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(HULL_R * 0.95, 20, 14, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0x9fe8ff,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  )
  beam.position.y = -10.6
  group.add(beam)

  return { group, ring, beam, lamps, phase: 0, radius: 0, speed: 0, height: 0, bob: 0 }
}
