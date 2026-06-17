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

function buildRabbit(): AnimalModel {
  const group = new THREE.Group()
  const body = box(0.28, 0.22, 0.38, 0xd4b896)
  body.position.y = 0.28
  const head = box(0.22, 0.2, 0.22, 0xd4b896)
  head.position.set(0, 0.44, 0.16)
  const earL = box(0.06, 0.28, 0.05, 0xd4b896)
  earL.position.set(-0.07, 0.66, 0.16)
  const earR = box(0.06, 0.28, 0.05, 0xd4b896)
  earR.position.set(0.07, 0.66, 0.16)
  const tail = box(0.1, 0.1, 0.1, 0xfaf0e6)
  tail.position.set(0, 0.3, -0.2)
  group.add(body, head, earL, earR, tail)
  const legs = [
    leg(0.1, 0.15, 0xd4b896, -0.08, 0.15, 0.17),
    leg(0.1, 0.15, 0xd4b896, 0.08, 0.15, 0.17),
    leg(0.1, 0.18, 0xd4b896, -0.08, -0.15, 0.17),
    leg(0.1, 0.18, 0xd4b896, 0.08, -0.15, 0.17),
  ]
  group.add(...legs)
  return { group, legs }
}

function buildCat(): AnimalModel {
  const group = new THREE.Group()
  const body = box(0.28, 0.26, 0.48, 0xf4a460)
  body.position.y = 0.38
  const head = box(0.26, 0.24, 0.26, 0xf4a460)
  head.position.set(0, 0.58, 0.26)
  const earL = box(0.08, 0.1, 0.04, 0xf4a460)
  earL.position.set(-0.08, 0.76, 0.26)
  const earR = box(0.08, 0.1, 0.04, 0xf4a460)
  earR.position.set(0.08, 0.76, 0.26)
  const tail1 = box(0.07, 0.22, 0.07, 0xe8935a)
  tail1.position.set(0, 0.44, -0.28)
  const tail2 = box(0.06, 0.16, 0.06, 0xe8935a)
  tail2.position.set(0, 0.62, -0.26)
  tail2.rotation.x = 0.5
  group.add(body, head, earL, earR, tail1, tail2)
  const legs = [
    leg(0.09, 0.2, 0xf4a460, -0.09, 0.18, 0.25),
    leg(0.09, 0.2, 0xf4a460, 0.09, 0.18, 0.25),
    leg(0.09, 0.2, 0xf4a460, -0.09, -0.18, 0.25),
    leg(0.09, 0.2, 0xf4a460, 0.09, -0.18, 0.25),
  ]
  group.add(...legs)
  return { group, legs }
}

function buildDog(): AnimalModel {
  const group = new THREE.Group()
  const body = box(0.44, 0.4, 0.72, 0xa0522d)
  body.position.y = 0.52
  const head = box(0.38, 0.34, 0.38, 0xa0522d)
  head.position.set(0, 0.7, 0.44)
  const snout = box(0.2, 0.16, 0.18, 0x8b4513)
  snout.position.set(0, 0.62, 0.6)
  const earL = box(0.1, 0.2, 0.14, 0x8b4513)
  earL.position.set(-0.2, 0.66, 0.42)
  const earR = box(0.1, 0.2, 0.14, 0x8b4513)
  earR.position.set(0.2, 0.66, 0.42)
  const tail = box(0.09, 0.28, 0.09, 0xa0522d)
  tail.position.set(0, 0.72, -0.4)
  tail.rotation.x = -0.6
  group.add(body, head, snout, earL, earR, tail)
  const legs = [
    leg(0.13, 0.32, 0xa0522d, -0.15, 0.28, 0.36),
    leg(0.13, 0.32, 0xa0522d, 0.15, 0.28, 0.36),
    leg(0.13, 0.32, 0xa0522d, -0.15, -0.28, 0.36),
    leg(0.13, 0.32, 0xa0522d, 0.15, -0.28, 0.36),
  ]
  group.add(...legs)
  return { group, legs }
}

function buildVillager(): AnimalModel {
  const group = new THREE.Group()
  const skin = 0xffcc99
  const robe = 0x5a3e1a
  const dark = 0x3d2a0e
  // Body (brown robe)
  const body = box(0.5, 0.75, 0.3, robe)
  body.position.y = 1.05
  // Head
  const head = box(0.42, 0.42, 0.42, skin)
  head.position.set(0, 1.67, 0)
  // Nose
  const nose = box(0.1, 0.1, 0.12, 0xcc9966)
  nose.position.set(0, 1.63, 0.24)
  // Arms
  const armL = box(0.16, 0.6, 0.16, robe)
  armL.position.set(-0.33, 1.1, 0)
  const armR = box(0.16, 0.6, 0.16, robe)
  armR.position.set(0.33, 1.1, 0)
  group.add(body, head, nose, armL, armR)
  const legs = [
    leg(0.18, 0.62, dark, -0.12, 0, 0.62),
    leg(0.18, 0.62, dark, 0.12, 0, 0.62),
  ]
  group.add(...legs)
  return { group, legs }
}

function buildHorse(): AnimalModel {
  const group = new THREE.Group()
  // Body (bay brown)
  const body = box(0.65, 0.6, 1.3, 0x8b5a2b)
  body.position.y = 1.05
  // Neck
  const neck = box(0.28, 0.5, 0.28, 0x8b5a2b)
  neck.position.set(0, 1.42, 0.55)
  // Head
  const head = box(0.28, 0.32, 0.6, 0x8b5a2b)
  head.position.set(0, 1.52, 0.88)
  // Mane (dark strip on neck/head)
  const mane = box(0.1, 0.44, 0.22, 0x5a3019)
  mane.position.set(0, 1.64, 0.5)
  // Tail
  const tail = box(0.12, 0.45, 0.14, 0x5a3019)
  tail.position.set(0, 1.0, -0.72)
  tail.rotation.x = 0.45
  group.add(body, neck, head, mane, tail)
  const legs = [
    leg(0.2, 0.72, 0x7a4a22, -0.2, 0.42, 0.72),
    leg(0.2, 0.72, 0x7a4a22, 0.2, 0.42, 0.72),
    leg(0.2, 0.72, 0x7a4a22, -0.2, -0.42, 0.72),
    leg(0.2, 0.72, 0x7a4a22, 0.2, -0.42, 0.72),
  ]
  group.add(...legs)
  return { group, legs }
}

export function buildAnimalModel(kind: AnimalKind): AnimalModel {
  if (kind === 'pig') return buildPig()
  if (kind === 'sheep') return buildSheep()
  if (kind === 'rabbit') return buildRabbit()
  if (kind === 'cat') return buildCat()
  if (kind === 'dog') return buildDog()
  if (kind === 'villager') return buildVillager()
  if (kind === 'horse') return buildHorse()
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
