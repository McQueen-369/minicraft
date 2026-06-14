import * as THREE from 'three'

export interface RemoteAvatar {
  group: THREE.Group
  head: THREE.Object3D
  target: { x: number; y: number; z: number; yaw: number; pitch: number }
  lastSeen: number
  name: string
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

function box(w: number, h: number, d: number, color: number): THREE.Mesh {
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

/** Simple blocky avatar with a name tag; positioned at the feet center.
 *  Each player gets a unique shirt colour derived from their name. */
export function buildAvatar(name: string): RemoteAvatar {
  const hue = nameToHue(name)
  const shirtColor = hslInt(hue, 0.72, 0.38)
  const pantsColor = hslInt(hue, 0.72, 0.22)
  const armColor   = hslInt(hue, 0.60, 0.52)

  const group = new THREE.Group()
  const body = box(0.5, 0.75, 0.28, shirtColor)
  body.position.y = 1.05
  const legL = box(0.22, 0.68, 0.26, pantsColor)
  legL.position.set(-0.13, 0.34, 0)
  const legR = legL.clone()
  legR.position.x = 0.13
  const armL = box(0.18, 0.7, 0.24, armColor)
  armL.position.set(-0.36, 1.05, 0)
  const armR = armL.clone()
  armR.position.x = 0.36
  const head = box(0.46, 0.46, 0.46, 0xe8c39e)
  head.position.y = 1.66
  group.add(body, legL, legR, armL, armR, head, nameSprite(name))
  return {
    group,
    head,
    target: { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 },
    lastSeen: performance.now() / 1000,
    name,
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
      ;(obj.material as THREE.Material).dispose()
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
