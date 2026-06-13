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
  part(g, 0.92, 0.22, 0.96, 0, 0.11, 0, 0x6b4a2a) // frame
  part(g, 0.82, 0.14, 0.86, 0, 0.29, 0.03, 0xe6e2d8) // mattress
  part(g, 0.82, 0.1, 0.5, 0, 0.4, 0.18, 0x4f7fae) // blanket
  part(g, 0.74, 0.12, 0.22, 0, 0.41, -0.32, 0xf6f4ee) // pillow
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
