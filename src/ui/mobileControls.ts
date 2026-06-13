import type { Controls } from '../player/controls'

const STYLE = `
.mc-mobile {
  position: absolute; inset: 0; pointer-events: none; z-index: 6; touch-action: none;
}
.mc-joystick-zone {
  position: absolute; bottom: 80px; left: 16px;
  width: 140px; height: 140px; pointer-events: all; touch-action: none;
}
.mc-joystick-base {
  width: 140px; height: 140px; border-radius: 50%;
  background: rgba(255,255,255,0.12); border: 2px solid rgba(255,255,255,0.3);
  position: relative;
}
.mc-joystick-knob {
  position: absolute; width: 54px; height: 54px; border-radius: 50%;
  background: rgba(255,255,255,0.4); border: 2px solid rgba(255,255,255,0.6);
  top: 50%; left: 50%; transform: translate(-50%,-50%);
}
.mc-look-zone {
  position: absolute; top: 0; bottom: 0; right: 0; left: 50%;
  pointer-events: all; touch-action: none;
}
.mc-action-btns {
  position: absolute; bottom: 80px; right: 16px;
  display: flex; flex-direction: column; gap: 8px; pointer-events: all;
}
.mc-btn {
  width: 60px; height: 60px; border-radius: 50%;
  background: rgba(255,255,255,0.18); border: 2px solid rgba(255,255,255,0.4);
  color: #fff; font-size: 11px; font-weight: bold;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; user-select: none; text-shadow: 0 1px 2px #000;
  -webkit-tap-highlight-color: transparent;
}
.mc-btn:active { background: rgba(255,255,255,0.35); }
.mc-jump-btn {
  position: absolute; bottom: 80px; right: 92px;
  width: 70px; height: 70px; border-radius: 50%;
  background: rgba(100,200,100,0.3); border: 2px solid rgba(100,200,100,0.6);
  color: #fff; font-size: 13px; font-weight: bold;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; user-select: none;
  -webkit-tap-highlight-color: transparent; pointer-events: all;
}
.mc-jump-btn:active { background: rgba(100,200,100,0.55); }
`

const BASE_RADIUS = 70
const KNOB_RADIUS = 27
const MAX_DIST = BASE_RADIUS - KNOB_RADIUS

export class MobileControls {
  private readonly container: HTMLDivElement
  private readonly knob: HTMLDivElement
  private joystickTouchId: number | null = null
  private joystickOrigin = { x: 0, y: 0 }
  private lookTouchId: number | null = null
  private lookLast = { x: 0, y: 0 }
  onInventory: () => void = () => {}

  constructor(
    root: HTMLElement,
    private readonly controls: Controls,
  ) {
    const style = document.createElement('style')
    style.textContent = STYLE
    document.head.appendChild(style)

    this.container = document.createElement('div')
    this.container.className = 'mc-mobile'

    // Joystick
    const jZone = document.createElement('div')
    jZone.className = 'mc-joystick-zone'
    const jBase = document.createElement('div')
    jBase.className = 'mc-joystick-base'
    this.knob = document.createElement('div')
    this.knob.className = 'mc-joystick-knob'
    jBase.appendChild(this.knob)
    jZone.appendChild(jBase)
    this.container.appendChild(jZone)

    jZone.addEventListener('touchstart', (e) => this.onJoystickStart(e), { passive: false })
    jZone.addEventListener('touchmove', (e) => this.onJoystickMove(e), { passive: false })
    jZone.addEventListener('touchend', (e) => this.onJoystickEnd(e), { passive: false })
    jZone.addEventListener('touchcancel', (e) => this.onJoystickEnd(e), { passive: false })

    // Look zone (right half of screen)
    const lookZone = document.createElement('div')
    lookZone.className = 'mc-look-zone'
    lookZone.addEventListener('touchstart', (e) => this.onLookStart(e), { passive: false })
    lookZone.addEventListener('touchmove', (e) => this.onLookMove(e), { passive: false })
    lookZone.addEventListener('touchend', (e) => this.onLookEnd(e), { passive: false })
    lookZone.addEventListener('touchcancel', (e) => this.onLookEnd(e), { passive: false })
    this.container.appendChild(lookZone)

    // Jump button
    const jumpBtn = document.createElement('div')
    jumpBtn.className = 'mc-jump-btn'
    jumpBtn.textContent = 'JUMP'
    jumpBtn.addEventListener('touchstart', (e) => {
      e.preventDefault()
      this.controls.keys.add('Space')
      setTimeout(() => this.controls.keys.delete('Space'), 120)
    }, { passive: false })
    this.container.appendChild(jumpBtn)

    // Inventory button
    const actionBtns = document.createElement('div')
    actionBtns.className = 'mc-action-btns'
    const invBtn = document.createElement('div')
    invBtn.className = 'mc-btn'
    invBtn.textContent = 'BAG'
    invBtn.addEventListener('touchstart', (e) => {
      e.preventDefault()
      this.onInventory()
    }, { passive: false })
    actionBtns.appendChild(invBtn)
    this.container.appendChild(actionBtns)

    root.appendChild(this.container)
  }

  private onJoystickStart(e: TouchEvent): void {
    e.preventDefault()
    if (this.joystickTouchId !== null) return
    const t = e.changedTouches[0]
    this.joystickTouchId = t.identifier
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    this.joystickOrigin = { x: rect.left + BASE_RADIUS, y: rect.top + BASE_RADIUS }
    this.updateJoystick(t.clientX, t.clientY)
  }

  private onJoystickMove(e: TouchEvent): void {
    e.preventDefault()
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === this.joystickTouchId) this.updateJoystick(t.clientX, t.clientY)
    }
  }

  private onJoystickEnd(e: TouchEvent): void {
    e.preventDefault()
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier !== this.joystickTouchId) continue
      this.joystickTouchId = null
      this.knob.style.transform = 'translate(-50%,-50%)'
      this.controls.joystickDir = null
    }
  }

  private updateJoystick(cx: number, cy: number): void {
    const dx = cx - this.joystickOrigin.x
    const dy = cy - this.joystickOrigin.y
    const dist = Math.hypot(dx, dy)
    const clamped = Math.min(dist, MAX_DIST)
    const nx = dist > 0 ? dx / dist : 0
    const ny = dist > 0 ? dy / dist : 0
    this.knob.style.transform = `translate(calc(-50% + ${nx * clamped}px), calc(-50% + ${ny * clamped}px))`

    if (dist < 8) {
      this.controls.joystickDir = null
      return
    }
    // ny positive = screen-down = move forward; nx positive = screen-right = strafe right
    const fwd = -ny
    const strafe = nx
    const yaw = this.controls.yaw
    let wx = -Math.sin(yaw) * fwd + Math.cos(yaw) * strafe
    let wz = -Math.cos(yaw) * fwd - Math.sin(yaw) * strafe
    const len = Math.hypot(wx, wz)
    if (len > 0) { wx /= len; wz /= len }
    this.controls.joystickDir = { x: wx, z: wz }
  }

  private onLookStart(e: TouchEvent): void {
    e.preventDefault()
    if (this.lookTouchId !== null) return
    const t = e.changedTouches[0]
    this.lookTouchId = t.identifier
    this.lookLast = { x: t.clientX, y: t.clientY }
  }

  private onLookMove(e: TouchEvent): void {
    e.preventDefault()
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier !== this.lookTouchId) continue
      const dx = t.clientX - this.lookLast.x
      const dy = t.clientY - this.lookLast.y
      this.lookLast = { x: t.clientX, y: t.clientY }
      this.controls.touchLook(dx, dy)
    }
  }

  private onLookEnd(e: TouchEvent): void {
    e.preventDefault()
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === this.lookTouchId) this.lookTouchId = null
    }
  }

  show(): void { this.container.style.display = '' }

  hide(): void {
    this.container.style.display = 'none'
    this.controls.joystickDir = null
    this.joystickTouchId = null
    this.lookTouchId = null
  }
}
