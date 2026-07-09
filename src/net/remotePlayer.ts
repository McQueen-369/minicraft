import * as THREE from 'three'
import { appearanceKey, drawFace, sanitizeAppearance, type Appearance } from '../player/appearance'

export interface RemoteAvatar {
  group: THREE.Group
  head: THREE.Object3D
  target: { x: number; y: number; z: number; yaw: number; pitch: number }
  lastSeen: number
  name: string
  /** appearanceKey() of the look this avatar was built with. */
  lookKey: string
}

/** Hash a player name to a hue in [0, 1). */
function nameToHue(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (Math.imul(h, 31) + name.charCodeAt(i)) | 0
  return ((h >>> 0) % 360) / 360
}

/** Convert HSL to a packed RGB integer for Three.js colors. */
function hslInt(hue: number, sat: number, lit: number): number {
  const c = (1 - Math.abs(2 * lit - 1)) * sat
  const x = c * (1 - Math.abs(((hue * 6) % 2) - 1))
  const m = lit - c / 2
  const idx = Math.floor(hue * 6) % 6
  const pairs: [number, number, number][] = [
    [c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x],
  ]
  const [r, g, b] = pairs[idx]
  return (Math.round((r + m) * 255) << 16) | (Math.round((g + m) * 255) << 8) | Math.round((b + m) * 255)
}

function box(w: number, h: number, d: number, color: number | string): THREE.Mesh {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }))
}

function nameSprite(name: string): THREE.Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 64
  const ctx = canvas.getContext('2d')!
  ctx.font = 'bold 28px monospace'
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(0,0,0,0.45)'
  const w = Math.min(240, ctx.measureText(name).width + 20)
  ctx.fillRect(128 - w / 2, 12, w, 40)
  ctx.fillStyle = '#fff'
  ctx.fillText(name, 128, 41)
  const texture = new THREE.CanvasTexture(canvas)
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }))
  sprite.scale.set(2, 0.5, 1)
  sprite.position.y = 2.3
  return sprite
}

/** Head with the face texture on the front (+Z) side. */
function buildHead(a: Appearance): THREE.Mesh {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')!
  drawFace(ctx, a, 64)
  const faceTex = new THREE.CanvasTexture(canvas)
  faceTex.magFilter = THREE.NearestFilter
  faceTex.minFilter = THREE.NearestFilter
  const skin = new THREE.MeshLambertMaterial({ color: a.skin })
  const face = new THREE.MeshLambertMaterial({ map: faceTex })
  // BoxGeometry material order: +x, -x, +y, -y, +z (front), -z
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.46, 0.46), [skin, skin, skin, skin, face, skin])
  head.position.y = 1.66
  return head
}

/** Hair meshes attached to the head (so they pitch with it). */
function addHair(head: THREE.Object3D, a: Appearance): void {
  const c = a.hairColor
  const parts: THREE.Mesh[] = []
  switch (a.hair) {
    case 'none':
      break
    case 'short': {
      const top = box(0.5, 0.12, 0.5, c)
      top.position.y = 0.27
      const back = box(0.5, 0.2, 0.12, c)
      back.position.set(0, 0.14, -0.2)
      parts.push(top, back)
      break
    }
    case 'long': {
      const top = box(0.5, 0.14, 0.5, c)
      top.position.y = 0.27
      const back = box(0.5, 0.55, 0.12, c)
      back.position.set(0, -0.05, -0.24)
      const sideL = box(0.1, 0.4, 0.42, c)
      sideL.position.set(-0.26, 0.02, -0.04)
      const sideR = sideL.clone()
      sideR.position.x = 0.26
      parts.push(top, back, sideL, sideR)
      break
    }
    case 'spiky': {
      const base = box(0.5, 0.1, 0.5, c)
      base.position.y = 0.26
      parts.push(base)
      for (let i = 0; i < 4; i++) {
        const spike = box(0.09, 0.18, 0.09, c)
        spike.position.set(-0.15 + i * 0.1, 0.38, (i % 2 === 0 ? -1 : 1) * 0.08)
        parts.push(spike)
      }
      break
    }
    case 'bowl': {
      const top = box(0.52, 0.18, 0.52, c)
      top.position.y = 0.24
      const rim = box(0.52, 0.14, 0.52, c)
      rim.position.y = 0.1
      rim.scale.set(0.98, 1, 0.98)
      const front = box(0.52, 0.1, 0.08, c)
      front.position.set(0, 0.14, 0.23)
      parts.push(top, rim, front)
      break
    }
    case 'ponytail': {
      const top = box(0.5, 0.14, 0.5, c)
      top.position.y = 0.27
      const tail = box(0.14, 0.5, 0.14, c)
      tail.position.set(0, -0.02, -0.3)
      parts.push(top, tail)
      break
    }
    case 'mohawk': {
      const crest = box(0.12, 0.22, 0.5, c)
      crest.position.y = 0.32
      parts.push(crest)
      break
    }
  }
  for (const p of parts) head.add(p)
}

/** Fallback look for players on older clients: colours from the name hash. */
function legacyAppearance(name: string): Appearance {
  const hue = nameToHue(name)
  const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`
  return {
    ...sanitizeAppearance({}),
    shirt: hex(hslInt(hue, 0.72, 0.38)),
    pants: hex(hslInt(hue, 0.72, 0.22)),
  }
}

/** Simple blocky avatar with a name tag; positioned at the feet center.
 *  Renders the player's customised appearance when provided, otherwise a
 *  legacy per-name colour scheme. */
export function buildAvatar(name: string, appearance?: Appearance): RemoteAvatar {
  const a = appearance ?? legacyAppearance(name)
  const group = new THREE.Group()
  const body = box(0.5, 0.75, 0.28, a.shirt)
  body.position.y = 1.05
  const legL = box(0.22, 0.68, 0.26, a.pants)
  legL.position.set(-0.13, 0.34, 0)
  const legR = legL.clone()
  legR.position.x = 0.13
  const armL = box(0.18, 0.7, 0.24, a.shirt)
  armL.position.set(-0.36, 1.05, 0)
  const armR = armL.clone()
  armR.position.x = 0.36
  const handL = box(0.18, 0.16, 0.24, a.skin)
  handL.position.set(-0.36, 0.72, 0)
  const handR = handL.clone()
  handR.position.x = 0.36
  const head = buildHead(a)
  addHair(head, a)
  group.add(body, legL, legR, armL, armR, handL, handR, head, nameSprite(name))
  return {
    group,
    head,
    target: { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 },
    lastSeen: performance.now() / 1000,
    name,
    lookKey: appearanceKey(a),
  }
}

export function updateAvatar(avatar: RemoteAvatar, dt: number): void {
  // Smooth toward the last received network state.
  const k = Math.min(1, dt * 12)
  avatar.group.position.x += (avatar.target.x - avatar.group.position.x) * k
  avatar.group.position.y += (avatar.target.y - avatar.group.position.y) * k
  avatar.group.position.z += (avatar.target.z - avatar.group.position.z) * k
  avatar.group.rotation.y += shortestAngle(avatar.group.rotation.y, avatar.target.yaw) * k
  avatar.head.rotation.x = -avatar.target.pitch
}

export function disposeAvatar(avatar: RemoteAvatar): void {
  avatar.group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose()
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
      for (const m of mats) {
        if (m instanceof THREE.MeshLambertMaterial) m.map?.dispose()
        m.dispose()
      }
    }
    if (obj instanceof THREE.Sprite) {
      obj.material.map?.dispose()
      obj.material.dispose()
    }
  })
}

function shortestAngle(from: number, to: number): number {
  let d = (to - from) % (Math.PI * 2)
  if (d > Math.PI) d -= Math.PI * 2
  if (d < -Math.PI) d += Math.PI * 2
  return d
}
