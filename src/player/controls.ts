const LOOK_SPEED = 0.0023
const MAX_PITCH = Math.PI / 2 - 0.01

/**
 * Pointer-lock mouse look + keyboard state. Gameplay systems read `keys`,
 * `yaw`, `pitch`; UI systems add their own listeners.
 */
export class Controls {
  yaw = 0
  pitch = 0
  fly = false
  readonly keys = new Set<string>()
  /** Set false by UI when a panel (inventory/chest/menu) is open. */
  gameplayInput = true

  private locked = false

  constructor(private readonly element: HTMLElement) {
    document.addEventListener('keydown', (e) => {
      if (e.repeat) return
      this.keys.add(e.code)
      if (e.code === 'KeyF' && this.gameplayInput && this.locked) this.fly = !this.fly
    })
    document.addEventListener('keyup', (e) => this.keys.delete(e.code))
    window.addEventListener('blur', () => this.keys.clear())
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.element
      if (!this.locked) this.keys.clear()
    })
    document.addEventListener('mousemove', (e) => {
      if (!this.locked || !this.gameplayInput) return
      this.yaw -= e.movementX * LOOK_SPEED
      this.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, this.pitch - e.movementY * LOOK_SPEED))
    })
  }

  get isLocked(): boolean {
    return this.locked
  }

  requestLock(): void {
    this.element.requestPointerLock()
  }

  releaseLock(): void {
    if (this.locked) document.exitPointerLock()
  }

  /** Desired horizontal movement direction (unit or zero) in world space. */
  moveDirection(): { x: number; z: number } {
    if (!this.gameplayInput) return { x: 0, z: 0 }
    let f = 0
    let s = 0
    if (this.keys.has('KeyW')) f += 1
    if (this.keys.has('KeyS')) f -= 1
    if (this.keys.has('KeyD')) s += 1
    if (this.keys.has('KeyA')) s -= 1
    if (f === 0 && s === 0) return { x: 0, z: 0 }
    const fx = -Math.sin(this.yaw)
    const fz = -Math.cos(this.yaw)
    const rx = Math.cos(this.yaw)
    const rz = -Math.sin(this.yaw)
    let x = fx * f + rx * s
    let z = fz * f + rz * s
    const len = Math.hypot(x, z)
    x /= len
    z /= len
    return { x, z }
  }
}
