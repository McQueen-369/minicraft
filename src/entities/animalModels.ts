import * as THREE from 'three'
import type { AnimalKind } from '../items/items'

export interface AnimalModel {
  group: THREE.Group
  legs: THREE.Object3D[]
}

function box(w: number, h: number, d: number, color: number): THREE.Mesh {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }))
}

function leg(w: number, h: number, color: number, x: number, z: number, bodyBottom: number): THREE.Object3D {
  // Pivot at the hip so rotation swings the leg.
  const pivot = new THREE.Group()
  pivot.position.set(x, bodyBottom, z)
  const m = box(w, h, w, color)
  m.position.y = -h / 2
  pivot.add(m)
  return pivot
}

function buildPig(): AnimalModel {
  const group = new THREE.Group()
  const body = box(0.6, 0.5, 0.9, 0xeaa8a0)
  body.position.y = 0.55
  const head = box(0.45, 0.45, 0.35, 0xf0b4ac)
  head.position.set(0, 0.65, 0.55)
  const snout = box(0.2, 0.15, 0.08, 0xd98880)
  snout.position.set(0, 0.58, 0.75)
  group.add(body, head, snout)
  const legs = [
    leg(0.16, 0.3, 0xeaa8a0, -0.18, 0.3, 0.3),
    leg(0.16, 0.3, 0xeaa8a0, 0.18, 0.3, 0.3),
    leg(0.16, 0.3, 0xeaa8a0, -0.18, -0.3, 0.3),
    leg(0.16, 0.3, 0xeaa8a0, 0.18, -0.3, 0.3),
  ]
  group.add(...legs)
  return { group, legs }
}

function buildSheep(): AnimalModel {
  const group = new THREE.Group()
  const body = box(0.7, 0.6, 1.0, 0xf2f2ee)
  body.position.y = 0.75
  const head = box(0.32, 0.34, 0.3, 0xcfc4b8)
  head.position.set(0, 0.95, 0.6)
  group.add(body, head)
  const legs = [
    leg(0.14, 0.45, 0xcfc4b8, -0.2, 0.32, 0.45),
    leg(0.14, 0.45, 0xcfc4b8, 0.2, 0.32, 0.45),
    leg(0.14, 0.45, 0xcfc4b8, -0.2, -0.32, 0.45),
    leg(0.14, 0.45, 0xcfc4b8, 0.2, -0.32, 0.45),
  ]
  group.add(...legs)
  return { group, legs }
}

function buildChicken(): AnimalModel {
  const group = new THREE.Group()
  const body = box(0.35, 0.35, 0.45, 0xf7f7f2)
  body.position.y = 0.4
  const head = box(0.2, 0.25, 0.18, 0xf7f7f2)
  head.position.set(0, 0.66, 0.22)
  const beak = box(0.1, 0.07, 0.1, 0xe9b44c)
  beak.position.set(0, 0.64, 0.35)
  const comb = box(0.08, 0.08, 0.1, 0xc0392b)
  comb.position.set(0, 0.8, 0.22)
  group.add(body, head, beak, comb)
  const legs = [
    leg(0.06, 0.22, 0xe9b44c, -0.09, 0, 0.22),
    leg(0.06, 0.22, 0xe9b44c, 0.09, 0, 0.22),
  ]
  group.add(...legs)
  return { group, legs }
}

export function buildAnimalModel(kind: AnimalKind): AnimalModel {
  if (kind === 'pig') return buildPig()
  if (kind === 'sheep') return buildSheep()
  return buildChicken()
}

export function disposeModel(model: AnimalModel): void {
  model.group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose()
      ;(obj.material as THREE.Material).dispose()
    }
  })
}
