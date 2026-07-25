import * as THREE from 'three'
import type { FurnitureKind } from './furniture'

export interface FurnitureModel {
  group: THREE.Group
  /** Doors only: the hinged group that swings when the door opens. */
  pivot: THREE.Object3D | null
}

/** Add a box centered at (cx, cy, cz) to a group. */
function part(
  group: THREE.Group,
  w: number,
  h: number,
  d: number,
  cx: number,
  cy: number,
  cz: number,
  color: number,
  opts?: { opacity?: number },
): THREE.Mesh {
  const mat = new THREE.MeshLambertMaterial({ color })
  if (opts?.opacity !== undefined) {
    mat.transparent = true
    mat.opacity = opts.opacity
  }
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
  mesh.position.set(cx, cy, cz)
  group.add(mesh)
  return mesh
}

function legsAt(group: THREE.Group, h: number, halfX: number, halfZ: number, w: number, color: number): void {
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      part(group, w, h, w, sx * halfX, h / 2, sz * halfZ, color)
    }
  }
}

function buildChair(): FurnitureModel {
  const g = new THREE.Group()
  const wood = 0x8a5a2b
  legsAt(g, 0.45, 0.28, 0.28, 0.07, wood)
  part(g, 0.7, 0.08, 0.7, 0, 0.49, 0, wood) // seat
  part(g, 0.7, 0.5, 0.08, 0, 0.74, -0.31, wood) // backrest
  return { group: g, pivot: null }
}

function buildDesk(): FurnitureModel {
  const g = new THREE.Group()
  const wood = 0x6b4a2a
  legsAt(g, 0.74, 0.4, 0.3, 0.08, wood)
  part(g, 0.95, 0.08, 0.72, 0, 0.78, 0, 0x7a572f) // top
  return { group: g, pivot: null }
}

function buildBed(): FurnitureModel {
  const g = new THREE.Group()
  const frame = 0x6b4a2a
  // Double bed: occupies its cell plus the next cell in +z (head at the anchor).
  for (const sx of [-1, 1]) {
    for (const cz of [-0.35, 1.2]) part(g, 0.12, 0.18, 0.12, sx * 0.42, 0.09, cz, frame)
  }
  part(g, 1.0, 0.26, 1.9, 0, 0.31, 0.45, frame) // frame
  part(g, 0.9, 0.16, 1.7, 0, 0.5, 0.45, 0xe6e2d8) // mattress
  part(g, 0.9, 0.12, 1.0, 0, 0.6, 0.9, 0x4f7fae) // blanket (foot end)
  part(g, 0.82, 0.16, 0.36, 0, 0.62, -0.2, 0xf6f4ee) // pillow (head end)
  return { group: g, pivot: null }
}

function buildSofa(): FurnitureModel {
  const g = new THREE.Group()
  const fabric = 0x5b6e8c
  part(g, 0.95, 0.26, 0.8, 0, 0.2, 0.04, fabric) // seat
  part(g, 0.95, 0.46, 0.18, 0, 0.46, -0.32, fabric) // back
  for (const sx of [-1, 1]) part(g, 0.14, 0.36, 0.8, sx * 0.4, 0.36, 0.04, 0x4e5f79) // arms
  return { group: g, pivot: null }
}

function buildWindow(): FurnitureModel {
  const g = new THREE.Group()
  const frame = 0xb08d5a
  // Frame ring, thin in z so it sits inside a wall plane.
  part(g, 1, 0.12, 0.16, 0, 0.06, 0, frame) // bottom
  part(g, 1, 0.12, 0.16, 0, 0.94, 0, frame) // top
  part(g, 0.12, 1, 0.16, -0.44, 0.5, 0, frame) // left
  part(g, 0.12, 1, 0.16, 0.44, 0.5, 0, frame) // right
  part(g, 0.12, 1, 0.1, 0, 0.5, 0, frame) // mullion
  part(g, 0.88, 0.88, 0.06, 0, 0.5, 0, 0xcfeff4, { opacity: 0.4 }) // glass pane
  return { group: g, pivot: null }
}

function buildDoor(): FurnitureModel {
  const g = new THREE.Group()
  // Hinge on the left edge of the cell; the panel swings around it.
  const pivot = new THREE.Group()
  pivot.position.set(-0.45, 0, 0)
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2, 0.12), new THREE.MeshLambertMaterial({ color: 0x7a5326 }))
  panel.position.set(0.45, 1, 0) // centered relative to hinge, 2 tall
  pivot.add(panel)
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), new THREE.MeshLambertMaterial({ color: 0xd9c27a }))
  handle.position.set(0.78, 1, 0.1)
  pivot.add(handle)
  g.add(pivot)
  return { group: g, pivot }
}

function buildCampfire(): FurnitureModel {
  const g = new THREE.Group()
  const log = 0x6b3a1a
  const coal = 0x222222
  const ember = 0xff6600
  const flame = 0xff4400
  // Two crossed logs
  const log1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.18), new THREE.MeshLambertMaterial({ color: log }))
  log1.position.set(0, 0.05, 0)
  log1.rotation.y = Math.PI / 4
  g.add(log1)
  const log2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.18), new THREE.MeshLambertMaterial({ color: log }))
  log2.position.set(0, 0.05, 0)
  log2.rotation.y = -Math.PI / 4
  g.add(log2)
  // Coal base
  part(g, 0.3, 0.06, 0.3, 0, 0.03, 0, coal)
  // Ember glow layer
  const emberMat = new THREE.MeshLambertMaterial({ color: ember, emissive: new THREE.Color(0.4, 0.1, 0) })
  const emberMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.18), emberMat)
  emberMesh.position.set(0, 0.1, 0)
  g.add(emberMesh)
  // Flame cone (tapered box)
  const flameMat = new THREE.MeshLambertMaterial({ color: flame, emissive: new THREE.Color(0.6, 0.1, 0), transparent: true, opacity: 0.85 })
  const flameMesh = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.36, 6), flameMat)
  flameMesh.position.set(0, 0.36, 0)
  g.add(flameMesh)
  return { group: g, pivot: null }
}

/** Warm hanging lantern: iron cage, glass panes and a glowing core. */
function buildLantern(): FurnitureModel {
  const g = new THREE.Group()
  const iron = 0x3b3b42
  // Cap and base.
  part(g, 0.34, 0.06, 0.34, 0, 0.62, 0, iron)
  part(g, 0.3, 0.05, 0.3, 0, 0.16, 0, iron)
  // Corner bars.
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) part(g, 0.04, 0.42, 0.04, sx * 0.13, 0.4, sz * 0.13, iron)
  }
  // Glass housing.
  part(g, 0.24, 0.4, 0.24, 0, 0.4, 0, 0xfff0c0, { opacity: 0.45 })
  // The flame itself: emissive, so it reads as a light source after dark.
  const coreMat = new THREE.MeshLambertMaterial({
    color: 0xffcc55,
    emissive: new THREE.Color(1.0, 0.72, 0.25),
  })
  const core = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.14), coreMat)
  core.position.set(0, 0.38, 0)
  g.add(core)
  // Hanging ring.
  part(g, 0.04, 0.1, 0.04, 0, 0.7, 0, iron)
  return { group: g, pivot: null }
}

function buildMarket(): FurnitureModel {
  const g = new THREE.Group()
  const wood = 0x7a5326
  const darkWood = 0x5a3c1a
  const cloth = 0xcc3333 // red-and-cream striped awning
  const clothPale = 0xf0e2cd

  // Four corner posts with feet.
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      part(g, 0.1, 2.2, 0.1, sx * 0.9, 1.1, sz * 0.45, darkWood)
      part(g, 0.18, 0.06, 0.18, sx * 0.9, 0.03, sz * 0.45, 0x4a3014)
    }
  }
  // Counter top with a worn plank seam and a front panel of boards.
  part(g, 2.0, 0.1, 1.0, 0, 0.85, 0, 0x9a7136)
  part(g, 2.0, 0.03, 0.05, 0, 0.91, -0.12, 0x8a6330)
  for (let i = -3; i <= 3; i++) part(g, 0.26, 0.78, 0.06, i * 0.28, 0.45, 0.47, i % 2 === 0 ? wood : 0x6f4a20)
  // Back wall with shelving.
  part(g, 2.0, 1.2, 0.08, 0, 1.5, -0.46, darkWood)
  for (const [y, w] of [[1.2, 1.8], [1.68, 1.8]] as const) part(g, w, 0.06, 0.22, 0, y, -0.36, 0x8a6030)

  // Awning: alternating cloth panels with a scalloped valance.
  for (let i = -5; i <= 5; i++) {
    part(g, 0.2, 0.07, 1.3, i * 0.2, 2.2, 0, i % 2 === 0 ? cloth : clothPale)
    // Valance teeth hanging off the front lip.
    part(g, 0.18, 0.14, 0.06, i * 0.2, 2.11, 0.66, i % 2 === 0 ? cloth : clothPale)
  }
  part(g, 2.24, 0.05, 0.06, 0, 2.24, -0.64, darkWood)

  // Hanging shop sign with painted marks.
  part(g, 0.05, 0.16, 0.05, -0.3, 2.06, 0.52, darkWood)
  part(g, 0.05, 0.16, 0.05, 0.3, 2.06, 0.52, darkWood)
  part(g, 0.86, 0.32, 0.05, 0, 1.86, 0.52, 0xf4d88a)
  part(g, 0.06, 0.18, 0.06, -0.22, 1.86, 0.55, darkWood)
  part(g, 0.06, 0.18, 0.06, 0.22, 1.86, 0.55, darkWood)
  part(g, 0.34, 0.06, 0.06, 0, 1.95, 0.55, darkWood)

  // Goods on the counter: a coin tray, fruit crate, bottles and a wheel of cheese.
  part(g, 0.34, 0.05, 0.24, -0.62, 0.93, -0.06, 0x6b4a2a)
  for (const [dx, dz] of [[-0.7, -0.1], [-0.6, -0.02], [-0.54, -0.12]] as const) {
    part(g, 0.09, 0.04, 0.09, dx, 0.97, dz, 0xe8a400)
  }
  part(g, 0.34, 0.16, 0.3, -0.1, 1.0, -0.08, 0x8a6030)
  for (const [dx, dz] of [[-0.18, -0.14], [-0.02, -0.14], [-0.1, -0.02]] as const) {
    part(g, 0.11, 0.11, 0.11, dx, 1.13, dz, 0xcc2214)
  }
  for (const [dx, c] of [[0.36, 0x3f7a3a], [0.48, 0x2f6fa0], [0.6, 0x8a4f9e]] as const) {
    part(g, 0.09, 0.24, 0.09, dx, 1.02, -0.14, c)
    part(g, 0.04, 0.06, 0.04, dx, 1.17, -0.14, 0xd9c27a)
  }
  part(g, 0.26, 0.12, 0.26, 0.72, 0.96, 0.08, 0xf0d070)

  // Shelf stock behind the counter.
  for (const [dx, c] of [[-0.7, 0x9b45d4], [-0.45, 0x4a8a3a], [0.45, 0xe8a400], [0.72, 0x2f6fa0]] as const) {
    part(g, 0.2, 0.2, 0.16, dx, 1.33, -0.36, c)
  }
  part(g, 0.5, 0.22, 0.18, 0.05, 1.34, -0.36, 0xb08d5a)

  // A lantern hung from the awning so the stall stays inviting at night.
  const lantern = buildLantern().group
  lantern.scale.setScalar(0.72)
  lantern.position.set(-0.82, 1.42, 0.4)
  g.add(lantern)

  return { group: g, pivot: null }
}

/**
 * Mini-game arcade kiosk for the secret island: a bright cabinet with a
 * glowing screen and a per-game accent colour + screen doodle.
 */
function buildArcade(kind: 'arcadePuzzle' | 'arcadeRunner' | 'arcadeMath' | 'arcadeWord'): FurnitureModel {
  const accents: Record<string, number> = {
    arcadePuzzle: 0x2e86de,
    arcadeRunner: 0x27ae60,
    arcadeMath: 0xe67e22,
    arcadeWord: 0x9b59b6,
  }
  const accent = accents[kind]
  const g = new THREE.Group()
  const dark = 0x2c2c34

  // Cabinet body
  part(g, 1.0, 1.5, 0.7, 0, 0.75, -0.1, dark)
  // Accent side panels
  part(g, 0.06, 1.5, 0.7, -0.53, 0.75, -0.1, accent)
  part(g, 0.06, 1.5, 0.7, 0.53, 0.75, -0.1, accent)
  // Glowing screen (front face)
  const screenMat = new THREE.MeshLambertMaterial({ color: 0x0a1a2a, emissive: new THREE.Color(0.05, 0.15, 0.2) })
  const screen = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.06), screenMat)
  screen.position.set(0, 1.35, 0.26)
  screen.rotation.x = -0.15
  g.add(screen)
  // Screen doodle per game, glowing in the accent colour.
  const doodleMat = new THREE.MeshLambertMaterial({ color: accent, emissive: new THREE.Color(accent).multiplyScalar(0.5) })
  const doodle = (w: number, h: number, x: number, y: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.03), doodleMat)
    m.position.set(x, y, 0.32)
    m.rotation.x = -0.15
    g.add(m)
  }
  if (kind === 'arcadePuzzle') {
    doodle(0.16, 0.16, -0.14, 1.44)
    doodle(0.16, 0.16, 0.06, 1.44)
    doodle(0.16, 0.16, -0.14, 1.24)
    doodle(0.16, 0.16, 0.1, 1.28)
  } else if (kind === 'arcadeRunner') {
    doodle(0.1, 0.28, -0.1, 1.35)
    doodle(0.12, 0.1, 0.14, 1.22)
    doodle(0.3, 0.04, 0, 1.14)
  } else if (kind === 'arcadeMath') {
    doodle(0.3, 0.08, -0.1, 1.38)
    doodle(0.08, 0.3, -0.1, 1.38)
    doodle(0.2, 0.06, 0.18, 1.28)
  } else {
    doodle(0.12, 0.2, -0.2, 1.35)
    doodle(0.12, 0.2, 0, 1.35)
    doodle(0.12, 0.2, 0.2, 1.35)
  }
  // Control deck with two buttons and a joystick
  part(g, 0.9, 0.08, 0.35, 0, 0.98, 0.32, 0x3c3c46)
  part(g, 0.1, 0.06, 0.1, -0.18, 1.04, 0.34, 0xd63031)
  part(g, 0.1, 0.06, 0.1, 0.02, 1.04, 0.34, 0xf6e58d)
  part(g, 0.05, 0.16, 0.05, 0.24, 1.1, 0.34, 0x999999)
  part(g, 0.1, 0.06, 0.1, 0.24, 1.18, 0.34, accent)
  // Marquee top
  part(g, 1.1, 0.3, 0.5, 0, 1.85, -0.12, accent)
  part(g, 0.9, 0.18, 0.05, 0, 1.85, 0.14, 0xf6f4ee)
  return { group: g, pivot: null }
}

export function buildFurnitureModel(kind: FurnitureKind): FurnitureModel {
  switch (kind) {
    case 'chair':
      return buildChair()
    case 'desk':
      return buildDesk()
    case 'bed':
      return buildBed()
    case 'sofa':
      return buildSofa()
    case 'window':
      return buildWindow()
    case 'door':
      return buildDoor()
    case 'campfire':
      return buildCampfire()
    case 'lantern':
      return buildLantern()
    case 'market':
      return buildMarket()
    case 'arcadePuzzle':
    case 'arcadeRunner':
    case 'arcadeMath':
    case 'arcadeWord':
      return buildArcade(kind)
  }
}

export function disposeFurnitureModel(model: FurnitureModel): void {
  model.group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose()
      const mat = obj.material as THREE.Material | THREE.Material[]
      for (const m of Array.isArray(mat) ? mat : [mat]) m.dispose()
    }
  })
}
