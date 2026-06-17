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

function buildMarket(): FurnitureModel {
  const g = new THREE.Group()
  const wood = 0x7a5326
  const darkWood = 0x5a3c1a
  const awningColor = 0xcc3333 // red awning

  // Four corner posts
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      part(g, 0.1, 2.2, 0.1, sx * 0.9, 1.1, sz * 0.45, darkWood)
    }
  }
  // Counter / table top
  part(g, 2.0, 0.1, 1.0, 0, 0.85, 0, 0x9a7136)
  // Counter front panel
  part(g, 2.0, 0.8, 0.08, 0, 0.45, 0.46, wood)
  // Back wall shelf
  part(g, 2.0, 1.2, 0.08, 0, 1.5, -0.46, darkWood)
  // Small shelf on back wall
  part(g, 1.8, 0.08, 0.2, 0, 1.2, -0.38, 0x8a6030)
  // Awning / canopy
  part(g, 2.2, 0.08, 1.3, 0, 2.2, 0, awningColor)
  // Awning stripe detail (slightly darker bands)
  for (let xi = -0.8; xi <= 0.8; xi += 0.4) {
    part(g, 0.08, 0.09, 1.3, xi, 2.2, 0, 0x992222)
  }
  // A sign hanging below the awning
  part(g, 0.8, 0.3, 0.04, 0, 1.95, 0.52, 0xf4d88a)
  // Sign "M" decoration (dark marks)
  part(g, 0.06, 0.18, 0.05, -0.25, 1.95, 0.55, darkWood)
  part(g, 0.06, 0.18, 0.05, 0.25, 1.95, 0.55, darkWood)
  part(g, 0.36, 0.06, 0.05, 0, 2.04, 0.55, darkWood)
  // A few decorative item blocks on the counter
  part(g, 0.18, 0.18, 0.18, -0.55, 0.99, -0.1, 0xe8a400) // gold nugget
  part(g, 0.16, 0.16, 0.16, 0.4, 0.99, -0.05, 0x9b45d4)  // purple box
  part(g, 0.14, 0.22, 0.14, -0.1, 1.01, -0.15, 0x4a8a3a) // green item

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
    case 'market':
      return buildMarket()
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
