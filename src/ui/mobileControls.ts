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

/* Coloured action cluster on the right, aligned with the joystick height. */
.mc-action-cluster {
  position: absolute; bottom: 200px; right: 16px;
  width: 150px; height: 140px; pointer-events: none;
}
.mc-cbtn {
  position: absolute; width: 64px; height: 64px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: #fff; cursor: pointer; user-select: none; pointer-events: all;
  -webkit-tap-highlight-color: transparent;
}
.mc-cbtn svg { width: 30px; height: 30px; pointer-events: none; }
.mc-jump-btn {
  top: 0; left: 50%; transform: translateX(-50%);
  background: rgba(100,200,100,0.32); border: 2px solid rgba(100,200,100,0.7);
}
.mc-jump-btn:active { background: rgba(100,200,100,0.6); }
.mc-mine-btn {
  bottom: 0; left: 0;
  background: rgba(220,100,80,0.32); border: 2px solid rgba(220,100,80,0.7);
}
.mc-mine-btn:active { background: rgba(220,100,80,0.65); }
.mc-down-btn {
  bottom: 0; right: 0;
  background: rgba(100,120,220,0.32); border: 2px solid rgba(100,120,220,0.7);
}
.mc-down-btn:active { background: rgba(100,120,220,0.65); }

/* FLY / USE row, underneath the coloured cluster. */
.mc-action-btns {
  position: absolute; bottom: 120px; right: 16px;
  display: flex; flex-direction: row; gap: 10px; pointer-events: all;
}
.mc-btn {
  width: 60px; height: 60px; border-radius: 50%;
  background: rgba(255,255,255,0.18); border: 2px solid rgba(255,255,255,0.4);
  color: #fff; font-size: 12px; font-weight: bold;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; user-select: none; text-shadow: 0 1px 2px #000;
  -webkit-tap-highlight-color: transparent;
}
.mc-btn:active { background: rgba(255,255,255,0.35); }
.mc-btn-active {
  background: rgba(255,220,50,0.45) !important; border-color: rgba(255,220,50,0.9) !important;
}
`

const SVG_NS = 'http://www.w3.org/2000/svg'

/** Build a small white-on-transparent icon for the action buttons. */
function makeIcon(paths: string[], filled: boolean): SVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  if (filled) {
    svg.setAttribute('fill', '#fff')
    svg.setAttribute('stroke', 'none')
  } else {
    svg.setAttribute('fill', 'none')
    svg.setAttribute('stroke', '#fff')
    svg.setAttribute('stroke-width', '2')
    svg.setAttribute('stroke-linecap', 'round')
    svg.setAttribute('stroke-linejoin', 'round')
  }
  for (const d of paths) {
    const p = document.createElementNS(SVG_NS, 'path')
    p.setAttribute('d', d)
    svg.appendChild(p)
  }
  return svg
}

const ICON_UP = ['M12 3 4 13h5v8h6v-8h5z']
const ICON_DOWN = ['M12 21 4 11h5V3h6v8h5z']
const ICON_PICK = [
  'M14.531 12.469 6.619 20.38a1 1 0 1 1-3-3l7.912-7.912',
  'M15.686 4.314A12.5 12.5 0 0 0 5.461 2.958 1 1 0 0 0 5.58 4.71a22 22 0 0 1 6.318 3.393',
  'M17.7 3.7a1 1 0 0 0-1.4 0l-4.6 4.6a1 1 0 0 0 0 1.4l2.6 2.6a1 1 0 0 0 1.4 0l4.6-4.6a1 1 0 0 0 0-1.4z',
  'M19.686 8.314a12.5 12.5 0 0 1 1.356 10.225 1 1 0 0 1-1.751-.119 22 22 0 0 0-3.393-6.319',
]

const BASE_RADIUS = 70
const KNOB_RADIUS = 27
const MAX_DIST = BASE_RADIUS - KNOB_RADIUS
const TAP_MAX_MS = 250
const TAP_MAX_MOVE = 10
const DOUBLE_TAP_MS = 300

export class MobileControls {
  private readonly container: HTMLDivElement
  private readonly knob: HTMLDivElement
  private flyBtn: HTMLDivElement | null = null
  private joystickTouchId: number | null = null
  private joystickOrigin = { x: 0, y: 0 }
  private lookTouchId: number | null = null
  private lookLast = { x: 0, y: 0 }
  private lookStart = { x: 0, y: 0 }
  private lookStartTime = 0
  private lookMoved = false
  private lastTapTime = 0
  private jumpHolds = 0
  onMineStart: () => void = () => {}
  onMineStop: () => void = () => {}
  onUse: () => void = () => {}
  /** Single tap on the look area — triggers right-click (feed/tame). */
  onTap: () => void = () => {}
  /** Double-tap on the look area — used to store the targeted animal in the bag. */
  onDoubleTap: () => void = () => {}

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

    // Look zone (right half of screen). A quick double-tap stores the targeted animal.
    const lookZone = document.createElement('div')
    lookZone.className = 'mc-look-zone'
    lookZone.addEventListener('touchstart', (e) => this.onLookStart(e), { passive: false })
    lookZone.addEventListener('touchmove', (e) => this.onLookMove(e), { passive: false })
    lookZone.addEventListener('touchend', (e) => this.onLookEnd(e), { passive: false })
    lookZone.addEventListener('touchcancel', (e) => this.onLookEnd(e), { passive: false })
    this.container.appendChild(lookZone)

    // Coloured action cluster (right side, aligned with the joystick height):
    // JUMP on top, MINE bottom-left, DOWN bottom-right.
    const cluster = document.createElement('div')
    cluster.className = 'mc-action-cluster'

    // Jump button (green, up arrow) — held while the finger is down so it also
    // works as fly-up.
    const jumpBtn = document.createElement('div')
    jumpBtn.className = 'mc-cbtn mc-jump-btn'
    jumpBtn.title = 'Jump / fly up'
    jumpBtn.appendChild(makeIcon(ICON_UP, true))
    jumpBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.addJump() }, { passive: false })
    jumpBtn.addEventListener('touchend', (e) => { e.preventDefault(); this.removeJump() }, { passive: false })
    jumpBtn.addEventListener('touchcancel', (e) => { e.preventDefault(); this.removeJump() }, { passive: false })
    cluster.appendChild(jumpBtn)

    // Mine / break button (red, pickaxe; hold = hold left-click).
    const mineBtn = document.createElement('div')
    mineBtn.className = 'mc-cbtn mc-mine-btn'
    mineBtn.title = 'Mine'
    mineBtn.appendChild(makeIcon(ICON_PICK, false))
    mineBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.onMineStart() }, { passive: false })
    mineBtn.addEventListener('touchend', (e) => { e.preventDefault(); this.onMineStop() }, { passive: false })
    mineBtn.addEventListener('touchcancel', (e) => { e.preventDefault(); this.onMineStop() }, { passive: false })
    cluster.appendChild(mineBtn)

    // Fly-down button (blue, down arrow; hold = sink while flying).
    const downBtn = document.createElement('div')
    downBtn.className = 'mc-cbtn mc-down-btn'
    downBtn.title = 'Fly down'
    downBtn.appendChild(makeIcon(ICON_DOWN, true))
    downBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.controls.keys.add('ShiftLeft') }, { passive: false })
    downBtn.addEventListener('touchend', (e) => { e.preventDefault(); this.controls.keys.delete('ShiftLeft') }, { passive: false })
    downBtn.addEventListener('touchcancel', (e) => { e.preventDefault(); this.controls.keys.delete('ShiftLeft') }, { passive: false })
    cluster.appendChild(downBtn)
    this.container.appendChild(cluster)

    // FLY / USE row, underneath the coloured cluster.
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
    this.lookStart = { x: t.clientX, y: t.clientY }
    this.lookStartTime = performance.now()
    this.lookMoved = false
  }

  private onLookMove(e: TouchEvent): void {
    e.preventDefault()
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier !== this.lookTouchId) continue
      const dx = t.clientX - this.lookLast.x
      const dy = t.clientY - this.lookLast.y
      this.lookLast = { x: t.clientX, y: t.clientY }
      if (Math.hypot(t.clientX - this.lookStart.x, t.clientY - this.lookStart.y) > TAP_MAX_MOVE) {
        this.lookMoved = true
      }
      this.controls.touchLook(dx, dy)
    }
  }

  private onLookEnd(e: TouchEvent): void {
    e.preventDefault()
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier !== this.lookTouchId) continue
      this.lookTouchId = null
      const now = performance.now()
      const wasTap = !this.lookMoved && now - this.lookStartTime < TAP_MAX_MS
      if (wasTap) {
        if (now - this.lastTapTime < DOUBLE_TAP_MS) {
          this.lastTapTime = 0
          this.onDoubleTap()
        } else {
          this.lastTapTime = now
          this.onTap()
        }
      }
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
    this.jumpHolds = 0
    this.controls.keys.delete('Space')
    this.controls.keys.delete('ShiftLeft')
    this.onMineStop()
  }
}
