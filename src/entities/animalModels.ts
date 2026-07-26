import * as THREE from 'three'
import type { AnimalKind } from '../items/items'
import type { WorldKind } from '../world/worldKind'

export interface AnimalModel {
  group: THREE.Group
  legs: THREE.Object3D[]
}

/**
 * Steel every colour is mixed toward when the world is mechanical, and how far.
 * Keeping a little of the original hue is deliberate: a robot pig still reads
 * as the pink one, so players can tell the herd apart at a glance.
 */
const CHASSIS = 0x8f9aa6
const CHASSIS_MIX = 0.62
/** Warning-light red: eyes, power cores and antenna lamps. */
const LAMP = 0xff3b30

/**
 * Which skin the builders below are painting with. Set once at the top of
 * buildAnimalModel and read by every helper in this module, so each builder
 * stays a plain shape list instead of threading a palette through every call.
 */
let metal = false

/** A body colour, run through the world's skin. */
function hue(color: number): number {
  if (!metal) return color
  return new THREE.Color(color).lerp(new THREE.Color(CHASSIS), CHASSIS_MIX).getHex()
}

function box(w: number, h: number, d: number, color: number): THREE.Mesh {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color: hue(color) }))
}

/** A part painted exactly as asked, with no world tint: optics, lamps, plating. */
function lamp(w: number, h: number, d: number, color = LAMP): THREE.Mesh {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }))
}

/**
 * Turn a finished animal into its machine version: a lit optic strip across the
 * muzzle, an antenna with a signal lamp above the head, and a power core on the
 * flank. Positions come from the animal's own head/body, so every species keeps
 * its silhouette and just gains hardware.
 */
function robotize(
  group: THREE.Group,
  head: { x: number; y: number; z: number },
  body: { y: number; z: number },
  scale: number,
): void {
  if (!metal) return
  const eye = lamp(0.11 * scale + 0.03, 0.05 * scale + 0.02, 0.04)
  eye.position.set(head.x, head.y, head.z)
  const mast = box(0.03, 0.16 * scale + 0.05, 0.03, 0x3a424b)
  mast.position.set(head.x, head.y + 0.16 * scale + 0.12, head.z - 0.12 * scale)
  const signal = lamp(0.07, 0.07, 0.07)
  signal.position.set(head.x, head.y + 0.3 * scale + 0.16, head.z - 0.12 * scale)
  const core = lamp(0.09 * scale + 0.03, 0.09 * scale + 0.03, 0.03, 0x2fd4d4)
  core.position.set(0, body.y, body.z)
  group.add(eye, mast, signal, core)
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
  robotize(group, { x: 0, y: 0.7, z: 0.78 }, { y: 0.6, z: 0.46 }, 1)
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
  robotize(group, { x: 0, y: 1.0, z: 0.76 }, { y: 0.8, z: 0.51 }, 1)
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
  robotize(group, { x: 0, y: 0.7, z: 0.32 }, { y: 0.44, z: 0.23 }, 0.6)
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
  robotize(group, { x: 0, y: 0.47, z: 0.28 }, { y: 0.3, z: 0.2 }, 0.6)
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
  robotize(group, { x: 0, y: 0.6, z: 0.4 }, { y: 0.4, z: 0.25 }, 0.6)
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
  robotize(group, { x: 0, y: 0.72, z: 0.7 }, { y: 0.56, z: 0.37 }, 0.8)
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
  // A robot resident is built out of the same alloy as its village, rather
  // than a steel-washed version of a person.
  const skin = metal ? 0xa5b0bb : 0xffcc99
  const robe = metal ? 0x6b7681 : 0x5a3e1a
  const dark = metal ? 0x3a424b : 0x3d2a0e
  // Body (robe, or a plated torso)
  const body = metal ? lamp(0.5, 0.75, 0.3, robe) : box(0.5, 0.75, 0.3, robe)
  body.position.y = 1.05
  // Head
  const head = metal ? lamp(0.42, 0.42, 0.42, skin) : box(0.42, 0.42, 0.42, skin)
  head.position.set(0, 1.67, 0)
  // Arms
  const arm = () => (metal ? lamp(0.16, 0.6, 0.16, robe) : box(0.16, 0.6, 0.16, robe))
  const armL = arm()
  armL.position.set(-0.33, 1.1, 0)
  const armR = arm()
  armR.position.set(0.33, 1.1, 0)
  group.add(body, head, armL, armR)
  if (metal) {
    // A robot resident: a lit face screen instead of a nose, shoulder collar
    // and a friendly cyan signal — the colour that tells it apart from the
    // hostile night robots at a glance.
    const face = lamp(0.3, 0.14, 0.04, 0x6fe3ff)
    face.position.set(0, 1.68, 0.22)
    const collar = box(0.56, 0.08, 0.36, 0x3a424b)
    collar.position.y = 1.44
    const mast = box(0.04, 0.18, 0.04, 0x3a424b)
    mast.position.set(0.12, 1.97, 0)
    const signal = lamp(0.08, 0.08, 0.08, 0x6fe3ff)
    signal.position.set(0.12, 2.1, 0)
    const core = lamp(0.12, 0.12, 0.03, 0x2fd4d4)
    core.position.set(0, 1.12, 0.16)
    group.add(face, collar, mast, signal, core)
  } else {
    const nose = box(0.1, 0.1, 0.12, 0xcc9966)
    nose.position.set(0, 1.63, 0.24)
    group.add(nose)
  }
  const legs = [
    leg(0.18, 0.62, metal ? 0x8f9aa6 : dark, -0.12, 0, 0.62),
    leg(0.18, 0.62, metal ? 0x8f9aa6 : dark, 0.12, 0, 0.62),
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
  robotize(group, { x: 0, y: 1.56, z: 1.19 }, { y: 1.15, z: 0.66 }, 1.2)
  const legs = [
    leg(0.2, 0.72, 0x7a4a22, -0.2, 0.42, 0.72),
    leg(0.2, 0.72, 0x7a4a22, 0.2, 0.42, 0.72),
    leg(0.2, 0.72, 0x7a4a22, -0.2, -0.42, 0.72),
    leg(0.2, 0.72, 0x7a4a22, 0.2, -0.42, 0.72),
  ]
  group.add(...legs)
  return { group, legs }
}

function buildZombie(): AnimalModel {
  const group = new THREE.Group()
  const skin = 0x6aa84f
  const shirt = 0x2f6f4f
  const pants = 0x3a4a6b
  // Torso
  const body = box(0.5, 0.75, 0.3, shirt)
  body.position.y = 1.05
  // Head (green, with dark sunken eyes)
  const head = box(0.42, 0.42, 0.42, skin)
  head.position.set(0, 1.67, 0)
  const eyeL = box(0.09, 0.07, 0.03, 0x1a1a1a)
  eyeL.position.set(-0.1, 1.72, 0.22)
  const eyeR = box(0.09, 0.07, 0.03, 0x1a1a1a)
  eyeR.position.set(0.1, 1.72, 0.22)
  // Arms stretched out forward, zombie-style
  const armL = box(0.14, 0.14, 0.55, skin)
  armL.position.set(-0.3, 1.32, 0.32)
  const armR = box(0.14, 0.14, 0.55, skin)
  armR.position.set(0.3, 1.32, 0.32)
  group.add(body, head, eyeL, eyeR, armL, armR)
  const legs = [
    leg(0.18, 0.62, pants, -0.12, 0, 0.62),
    leg(0.18, 0.62, pants, 0.12, 0, 0.62),
  ]
  group.add(...legs)
  return { group, legs }
}

/**
 * The robot world's night mob: a boxy chassis with a visor of red optics, a
 * blinking antenna and grabber arms held out like a zombie's, so its silhouette
 * still reads as "hostile" at a distance.
 */
function buildRobot(): AnimalModel {
  const group = new THREE.Group()
  const shell = 0x8f9aa6
  const dark = 0x4d565f
  const glow = 0xff3b30
  const torso = box(0.56, 0.75, 0.34, shell)
  torso.position.y = 1.05
  // Chest panel with a power core.
  const panel = box(0.3, 0.3, 0.04, dark)
  panel.position.set(0, 1.12, 0.19)
  const core = box(0.12, 0.12, 0.04, glow)
  core.position.set(0, 1.12, 0.21)
  // Head: a visor band of optics across a metal skull.
  const head = box(0.44, 0.4, 0.42, shell)
  head.position.set(0, 1.67, 0)
  const visor = box(0.38, 0.14, 0.04, dark)
  visor.position.set(0, 1.7, 0.22)
  const eyeL = box(0.1, 0.08, 0.05, glow)
  eyeL.position.set(-0.1, 1.7, 0.23)
  const eyeR = box(0.1, 0.08, 0.05, glow)
  eyeR.position.set(0.1, 1.7, 0.23)
  // Antenna with a signal lamp.
  const mast = box(0.05, 0.22, 0.05, dark)
  mast.position.set(0.12, 1.98, 0)
  const lamp = box(0.1, 0.1, 0.1, glow)
  lamp.position.set(0.12, 2.13, 0)
  // Grabber arms reaching forward.
  const armL = box(0.15, 0.15, 0.55, shell)
  armL.position.set(-0.33, 1.32, 0.3)
  const armR = box(0.15, 0.15, 0.55, shell)
  armR.position.set(0.33, 1.32, 0.3)
  const clawL = box(0.17, 0.17, 0.1, dark)
  clawL.position.set(-0.33, 1.32, 0.6)
  const clawR = box(0.17, 0.17, 0.1, dark)
  clawR.position.set(0.33, 1.32, 0.6)
  group.add(torso, panel, core, head, visor, eyeL, eyeR, mast, lamp, armL, armR, clawL, clawR)
  const legs = [
    leg(0.19, 0.62, dark, -0.13, 0, 0.62),
    leg(0.19, 0.62, dark, 0.13, 0, 0.62),
  ]
  group.add(...legs)
  return { group, legs }
}

/**
 * Build the 3D model for a mob. In a robot world every creature is a machine:
 * bodies are steel-tinted, optics and power cores glow, and an antenna sits
 * above the head — the same silhouettes, rebuilt in hardware.
 */
export function buildAnimalModel(kind: AnimalKind, worldKind: WorldKind = 'terrain'): AnimalModel {
  metal = worldKind === 'robot'
  if (kind === 'pig') return buildPig()
  if (kind === 'sheep') return buildSheep()
  if (kind === 'rabbit') return buildRabbit()
  if (kind === 'cat') return buildCat()
  if (kind === 'dog') return buildDog()
  if (kind === 'villager') return buildVillager()
  if (kind === 'horse') return buildHorse()
  if (kind === 'zombie') return buildZombie()
  if (kind === 'robot') return buildRobot()
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
