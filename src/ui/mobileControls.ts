import type { Controls } from '../player/controls'

const STYLE = `
.mc-mobile {
  position: absolute; inset: 0; pointer-events: none; z-index: 6; touch-action: none;
}
.mc-joystick-zone {
  position: absolute; bottom: 200px; left: 16px;
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
  position: absolute; top: 0; bottom: 70px; right: 0; left: 50%;
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
.mc-mine-btn {
  position: absolute; bottom: 80px; right: 172px;
  width: 70px; height: 70px; border-radius: 50%;
  background: rgba(220,100,80,0.3); border: 2px solid rgba(220,100,80,0.6);
  color: #fff; font-size: 12px; font-weight: bold;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; user-select: none;
  -webkit-tap-highlight-color: transparent; pointer-events: all;
}
.mc-mine-btn:active { background: rgba(220,100,80,0.65); }
.mc-down-btn {
  position: absolute; bottom: 160px; right: 172px;
  width: 60px; height: 60px; border-radius: 50%;
  background: rgba(100,120,220,0.3); border: 2px solid rgba(100,120,220,0.6);
  color: #fff; font-size: 12px; font-weight: bold;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; user-select: none;
  -webkit-tap-highlight-color: transparent; pointer-events: all;
}
.mc-down-btn:active { background: rgba(100,120,220,0.65); }
.mc-btn-active {
  background: rgba(255,220,50,0.45) !important; border-color: rgba(255,220,50,0.9) !important;
}
`

const BASE_RADIUS = 70
const KNOB_RADIUS = 27
const MAX_DIST = BASE_RADIUS - KNOB_RADIUS

export class MobileControls {
  private readonly container: HTMLDivElement
  private readonly knob: HTMLDivElement
  private flyBtn: HTMLDivElement | null = null
  private joystickTouchId: number | null = null
  private joystickOrigin = { x: 0, y: 0 }
  private lookTouchId: number | null = null
  private lookLast = { x: 0, y: 0 }
  private jumpHolds = 0
  private joystickAutoJump = false
  onInventory: () => void = () => {}
  onMineStart: () => void = () => {}
  onMineStop: () => void = () => {}
  onUse: () => void = () => {}

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

    // Jump / fly-up button — held while finger is down so it also works as fly-up
    const jumpBtn = document.createElement('div')
    jumpBtn.className = 'mc-jump-btn'
    jumpBtn.textContent = 'JUMP'
    jumpBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.addJump() }, { passive: false })
    jumpBtn.addEventListener('touchend', (e) => { e.preventDefault(); this.removeJump() }, { passive: false })
    jumpBtn.addEventListener('touchcancel', (e) => { e.preventDefault(); this.removeJump() }, { passive: false })
    this.container.appendChild(jumpBtn)

    // Mine / break button (hold = hold left-click)
    const mineBtn = document.createElement('div')
    mineBtn.className = 'mc-mine-btn'
    mineBtn.textContent = 'MINE'
    mineBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.onMineStart() }, { passive: false })
    mineBtn.addEventListener('touchend', (e) => { e.preventDefault(); this.onMineStop() }, { passive: false })
    mineBtn.addEventListener('touchcancel', (e) => { e.preventDefault(); this.onMineStop() }, { passive: false })
    this.container.appendChild(mineBtn)

    // Fly-down button (hold = sink while flying)
    const downBtn = document.createElement('div')
    downBtn.className = 'mc-down-btn'
    downBtn.textContent = 'DOWN'
    downBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.controls.keys.add('ShiftLeft') }, { passive: false })
    downBtn.addEventListener('touchend', (e) => { e.preventDefault(); this.controls.keys.delete('ShiftLeft') }, { passive: false })
    downBtn.addEventListener('touchcancel', (e) => { e.preventDefault(); this.controls.keys.delete('ShiftLeft') }, { passive: false })
    this.container.appendChild(downBtn)

    // Action buttons column (right side, stacked top → bottom = FLY, USE, BAG)
    const actionBtns = document.createElement('div')
    actionBtns.className = 'mc-action-btns'

    // Fly toggle button
    const flyBtn = document.createElement('div')
    flyBtn.className = 'mc-btn'
    flyBtn.textContent = 'FLY'
    flyBtn.addEventListener('touchstart', (e) => {
      e.preventDefault()
      this.controls.fly = !this.controls.fly
      flyBtn.classList.toggle('mc-btn-active', this.controls.fly)
    }, { passive: false })
    this.flyBtn = flyBtn
    actionBtns.appendChild(flyBtn)

    // Use / interact button (tap = right-click: place block / open chest / feed / toggle animal)
    const useBtn = document.createElement('div')
    useBtn.className = 'mc-btn'
    useBtn.textContent = 'USE'
    useBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.onUse() }, { passive: false })
    actionBtns.appendChild(useBtn)

    // Inventory button
    const invBtn = document.createElement('div')
    invBtn.className = 'mc-btn'
    invBtn.textContent = 'BAG'
    invBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.onInventory() }, { passive: false })
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
      if (this.joystickAutoJump) {
        this.joystickAutoJump = false
        this.removeJump()
      }
    }
  }

  private addJump(): void {
    this.jumpHolds++
    this.controls.keys.add('Space')
  }

  private removeJump(): void {
    if (this.jumpHolds > 0) this.jumpHolds--
    if (this.jumpHolds === 0) this.controls.keys.delete('Space')
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
      if (this.joystickAutoJump) {
        this.joystickAutoJump = false
        this.removeJump()
      }
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

    // Auto-jump when joystick is pushed strongly forward (upward) and held there
    const isForwardJump = fwd > 0.8 && dist > 15
    if (isForwardJump && !this.joystickAutoJump) {
      this.joystickAutoJump = true
      this.addJump()
    } else if (!isForwardJump && this.joystickAutoJump) {
      this.joystickAutoJump = false
      this.removeJump()
    }
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

  show(): void {
    this.container.style.display = ''
    this.flyBtn?.classList.toggle('mc-btn-active', this.controls.fly)
  }

  hide(): void {
    this.container.style.display = 'none'
    this.controls.joystickDir = null
    this.joystickTouchId = null
    this.lookTouchId = null
    this.joystickAutoJump = false
    this.jumpHolds = 0
    this.controls.keys.delete('Space')
    this.controls.keys.delete('ShiftLeft')
    this.onMineStop()
  }
}
