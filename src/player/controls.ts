const LOOK_SPEED = 0.0023
const MAX_PITCH = Math.PI / 2 - 0.01

/**
 * Pointer-lock mouse look + keyboard state. Gameplay systems read `keys`,
 * `yaw`, `pitch`; UI systems add their own listeners.
 * On touch/mobile devices, `touchLook` and `joystickDir` provide camera and
 * movement input without pointer lock.
 */
export class Controls {
  yaw = 0
  pitch = 0
  fly = false
  readonly keys = new Set<string>()
  /** Set false by UI when a panel (inventory/chest/menu) is open. */
  gameplayInput = true
  /** Normalised joystick direction from mobile controls; null = no touch input active. */
  joystickDir: { x: number; z: number } | null = null

  private locked = false

  constructor(private readonly element: HTMLElement) {
    document.addEventListener('keydown', (e) => {
      if (e.repeat) return
      this.keys.add(e.code)
      if (e.code === 'KeyF' && this.gameplayInput && (this.locked || this.isTouchDevice)) this.fly = !this.fly
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

  get isTouchDevice(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0
  }

  requestLock(): void {
    if (!this.isTouchDevice) this.element.requestPointerLock()
  }

  releaseLock(): void {
    if (this.locked) document.exitPointerLock()
  }

  /** Apply a touch-drag delta to yaw/pitch (used by mobile look area). */
  touchLook(dx: number, dy: number): void {
    if (!this.gameplayInput) return
    this.yaw -= dx * LOOK_SPEED * 1.5
    this.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, this.pitch - dy * LOOK_SPEED * 1.5))
  }

  /** Desired horizontal movement direction (unit or zero) in world space. */
  moveDirection(): { x: number; z: number } {
    if (!this.gameplayInput) return { x: 0, z: 0 }

    // Mobile joystick takes priority over keyboard.
    if (this.joystickDir) return this.joystickDir

    let f = 0
    let s = 0
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) f += 1
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) f -= 1
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) s += 1
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) s -= 1
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
