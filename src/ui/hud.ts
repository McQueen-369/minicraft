import { HOTBAR_SIZE } from '../constants'
import type { Inventory } from '../items/inventory'
import { itemDef } from '../items/items'
import { drawItemIcon } from './icons'
import type { InfoContent } from './info'

const STYLE = `
.mc-help-btn {
  position: absolute; top: 140px; right: 12px; z-index: 7;
  width: 52px; height: 52px; border-radius: 10px;
  background: rgba(20,20,20,0.65); border: 2px solid #888;
  color: #fff; font-size: 22px; font-weight: bold;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; user-select: none;
  -webkit-tap-highlight-color: transparent;
}
.mc-help-btn:hover, .mc-help-btn:active { border-color: #fff; background: rgba(60,60,60,0.7); }
.mc-music-btn {
  position: absolute; top: 140px; right: 72px; z-index: 7;
  width: 52px; height: 52px; border-radius: 10px;
  background: rgba(20,20,20,0.65); border: 2px solid #888;
  color: #fff; font-size: 22px; font-weight: bold;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; user-select: none;
  -webkit-tap-highlight-color: transparent;
}
.mc-music-btn:hover, .mc-music-btn:active { border-color: #fff; background: rgba(60,60,60,0.7); }
.mc-music-btn.muted { color: #888; }
.mc-instructions {
  position: absolute; inset: 0; background: rgba(0,0,0,0.75); z-index: 20;
  display: none; align-items: center; justify-content: center;
}
.mc-instructions-box {
  background: #c6c6c6; border: 3px solid; border-color: #fff #555 #555 #fff;
  padding: 16px; max-width: 480px; width: 90%; max-height: 80vh; overflow-y: auto;
  color: #333; font-family: 'Courier New', monospace; font-size: 13px; line-height: 1.6;
}
.mc-instructions-box h3 { margin: 10px 0 4px; font-size: 14px; color: #000; border-bottom: 1px solid #999; padding-bottom: 2px; }
.mc-instructions-box h3:first-child { margin-top: 0; }
.mc-instructions-box p { margin: 3px 0; }
.mc-instructions-close {
  float: right; cursor: pointer; background: #888; border: none; border-radius: 4px;
  font-size: 14px; font-weight: bold; color: #fff; padding: 2px 8px; margin-left: 8px;
  -webkit-tap-highlight-color: transparent;
}
.mc-crosshair {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  width: 18px; height: 18px; pointer-events: none; z-index: 5;
}
.mc-crosshair::before, .mc-crosshair::after {
  content: ''; position: absolute; background: rgba(255,255,255,0.85);
  mix-blend-mode: difference;
}
.mc-crosshair::before { left: 8px; top: 0; width: 2px; height: 18px; }
.mc-crosshair::after { left: 0; top: 8px; width: 18px; height: 2px; }
.mc-mining {
  position: absolute; left: 50%; top: calc(50% + 24px); transform: translateX(-50%);
  width: 80px; height: 8px; background: rgba(0,0,0,0.5); border: 1px solid #fff;
  z-index: 5; display: none;
}
.mc-mining > div { height: 100%; background: #fff; width: 0%; }
.mc-hotbar {
  position: absolute; left: 50%; bottom: 12px; transform: translateX(-50%);
  display: flex; gap: 4px; z-index: 7;
}
.mc-slot {
  width: 52px; height: 52px; background: rgba(20,20,20,0.6);
  border: 2px solid #555; position: relative; image-rendering: pixelated;
  cursor: pointer; -webkit-tap-highlight-color: transparent;
}
.mc-slot.selected { border-color: #fff; }
.mc-slot:active { background: rgba(60,60,60,0.8); }
.mc-slot canvas { width: 100%; height: 100%; image-rendering: pixelated; }
.mc-slot .count {
  position: absolute; right: 3px; bottom: 1px; color: #fff; font-size: 14px;
  font-weight: bold; text-shadow: 1px 1px 0 #000; pointer-events: none;
}
.mc-bag-slot {
  width: 52px; height: 52px; margin-left: 8px; border-radius: 8px;
  background: rgba(20,20,20,0.7); border: 2px solid #888; color: #fff;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 1px; font-size: 9px; font-weight: bold; cursor: pointer; user-select: none;
  -webkit-tap-highlight-color: transparent;
}
.mc-bag-slot:hover, .mc-bag-slot:active { border-color: #fff; background: rgba(60,60,60,0.85); }
.mc-bag-slot svg { width: 22px; height: 22px; }
.mc-nameplate {
  position: absolute; left: 50%; top: 40px; transform: translateX(-50%);
  z-index: 6; display: none; align-items: center; gap: 8px;
  background: rgba(0,0,0,0.55); border: 1px solid rgba(255,255,255,0.35);
  border-radius: 16px; padding: 4px 8px 4px 14px;
  font-family: 'Courier New', monospace; color: #fff; pointer-events: none;
}
.mc-nameplate-name { font-size: 14px; font-weight: bold; text-shadow: 1px 1px 0 #000; }
.mc-nameplate-info {
  width: 24px; height: 24px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.6);
  background: rgba(255,255,255,0.15); color: #fff; font-size: 14px; font-weight: bold;
  font-style: italic; font-family: Georgia, 'Times New Roman', serif;
  display: flex; align-items: center; justify-content: center; cursor: pointer;
  pointer-events: auto; -webkit-tap-highlight-color: transparent;
}
.mc-nameplate-info:hover, .mc-nameplate-info:active { background: rgba(255,220,80,0.5); }
.mc-debug {
  position: absolute; left: 8px; top: 8px; color: #fff; font-size: 12px;
  text-shadow: 1px 1px 0 #000; z-index: 5; white-space: pre; pointer-events: none;
}
.mc-toast {
  position: absolute; left: 50%; bottom: 76px; transform: translateX(-50%);
  color: #fff; font-size: 14px; text-shadow: 1px 1px 0 #000; z-index: 5;
  pointer-events: none; transition: opacity 0.5s; opacity: 0;
}
.mc-daytimer {
  position: absolute; left: 50%; top: 12px; transform: translateX(-50%);
  color: #fff; font-size: 14px; text-shadow: 1px 1px 0 #000; z-index: 5;
  pointer-events: none; font-family: 'Courier New', monospace; letter-spacing: 1px;
}
.mc-players {
  position: absolute; top: 200px; right: 12px; z-index: 5;
  color: #fff; font-size: 12px; text-shadow: 1px 1px 0 #000;
  pointer-events: none; text-align: right; line-height: 1.6; display: none;
}
`

export class HUD {
  private readonly hotbarSlots: HTMLDivElement[] = []
  private readonly miningBar: HTMLDivElement
  private readonly miningFill: HTMLDivElement
  private readonly debug: HTMLDivElement
  private readonly toast: HTMLDivElement
  private readonly dayTimer: HTMLDivElement
  private readonly playerList: HTMLDivElement
  private readonly instructionsOverlay: HTMLDivElement
  private readonly nameplate: HTMLDivElement
  private readonly nameplateName: HTMLSpanElement
  private readonly infoOverlay: HTMLDivElement
  private readonly infoBox: HTMLDivElement
  private currentInfo: InfoContent | null = null
  private toastTimer = 0
  /** Called when the inventory quick-access button is clicked. */
  onInventory: () => void = () => {}
  /** Called when a hotbar slot is tapped/clicked to select it. */
  onSelectHotbar: (index: number) => void = () => {}
  /** Called when the info card closes (so the game can re-lock the pointer). */
  onInfoClose: () => void = () => {}
  /** Called when the music button is toggled; returns the new muted state. */
  onToggleMusic: () => boolean = () => false

  constructor(
    root: HTMLElement,
    private readonly inventory: Inventory,
    private readonly atlasCanvas: HTMLCanvasElement,
  ) {
    const style = document.createElement('style')
    style.textContent = STYLE
    document.head.appendChild(style)

    const crosshair = document.createElement('div')
    crosshair.className = 'mc-crosshair'
    root.appendChild(crosshair)

    this.miningBar = document.createElement('div')
    this.miningBar.className = 'mc-mining'
    this.miningFill = document.createElement('div')
    this.miningBar.appendChild(this.miningFill)
    root.appendChild(this.miningBar)

    const hotbar = document.createElement('div')
    hotbar.className = 'mc-hotbar'
    for (let i = 0; i < HOTBAR_SIZE; i++) {
      const slot = document.createElement('div')
      slot.className = 'mc-slot'
      const canvas = document.createElement('canvas')
      canvas.width = 32
      canvas.height = 32
      slot.appendChild(canvas)
      const count = document.createElement('span')
      count.className = 'count'
      slot.appendChild(count)
      hotbar.appendChild(slot)
      this.hotbarSlots.push(slot)
      const idx = i
      slot.addEventListener('touchstart', (e) => { e.preventDefault(); this.onSelectHotbar(idx) }, { passive: false })
      slot.addEventListener('click', () => this.onSelectHotbar(idx))
    }
    // 10th touch area next to the last hotbar slot: open the bag / inspect items.
    const bagSlot = document.createElement('div')
    bagSlot.className = 'mc-bag-slot'
    bagSlot.title = 'Open bag (E)'
    const bagSvgNS = 'http://www.w3.org/2000/svg'
    const bagSvg = document.createElementNS(bagSvgNS, 'svg')
    bagSvg.setAttribute('viewBox', '0 0 24 24')
    bagSvg.setAttribute('fill', 'none')
    bagSvg.setAttribute('stroke', 'currentColor')
    bagSvg.setAttribute('stroke-width', '2')
    const bagBody = document.createElementNS(bagSvgNS, 'path')
    bagBody.setAttribute('d', 'M5 8h14l-1 12H6L5 8z')
    const bagHandle = document.createElementNS(bagSvgNS, 'path')
    bagHandle.setAttribute('d', 'M9 8a3 3 0 0 1 6 0')
    bagSvg.append(bagBody, bagHandle)
    const bagLabel = document.createElement('span')
    bagLabel.textContent = 'BAG'
    bagSlot.append(bagSvg, bagLabel)
    bagSlot.addEventListener('click', () => this.onInventory())
    bagSlot.addEventListener('touchstart', (e) => { e.preventDefault(); this.onInventory() }, { passive: false })
    hotbar.appendChild(bagSlot)
    root.appendChild(hotbar)

    this.debug = document.createElement('div')
    this.debug.className = 'mc-debug'
    root.appendChild(this.debug)

    this.toast = document.createElement('div')
    this.toast.className = 'mc-toast'
    root.appendChild(this.toast)

    this.dayTimer = document.createElement('div')
    this.dayTimer.className = 'mc-daytimer'
    root.appendChild(this.dayTimer)

    this.playerList = document.createElement('div')
    this.playerList.className = 'mc-players'
    root.appendChild(this.playerList)

    const helpBtn = document.createElement('div')
    helpBtn.className = 'mc-help-btn'
    helpBtn.title = 'Help / Instructions'
    helpBtn.textContent = '?'
    helpBtn.addEventListener('click', () => this.showInstructions())
    helpBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.showInstructions() }, { passive: false })
    root.appendChild(helpBtn)

    const musicBtn = document.createElement('div')
    musicBtn.className = 'mc-music-btn'
    musicBtn.title = 'Toggle music'
    musicBtn.textContent = '♪'
    const toggleMusic = () => {
      const muted = this.onToggleMusic()
      musicBtn.classList.toggle('muted', muted)
      musicBtn.textContent = muted ? '♪̸' : '♪'
    }
    musicBtn.addEventListener('click', toggleMusic)
    musicBtn.addEventListener('touchstart', (e) => { e.preventDefault(); toggleMusic() }, { passive: false })
    root.appendChild(musicBtn)

    const overlay = document.createElement('div')
    overlay.className = 'mc-instructions'
    const box = document.createElement('div')
    box.className = 'mc-instructions-box'
    box.innerHTML = `
      <button class="mc-instructions-close">✕ Close</button>
      <h3>Controls</h3>
      <p>WASD / Arrows — Move</p>
      <p>Space — Jump &nbsp; F — Toggle fly &nbsp; Shift (fly) — Down</p>
      <p>E — Inventory &nbsp; 1–9 — Select hotbar &nbsp; Scroll — Cycle hotbar</p>
      <p>Left-click (hold) — Mine &nbsp; Right-click — Place / Use / Open chest</p>
      <h3>Mobile Controls</h3>
      <p>Joystick — Move</p>
      <p>Swipe right side — Look around</p>
      <p>Green ▲ — Jump / fly up &nbsp; Red ⛏ (hold) — Mine &nbsp; Blue ▼ — Fly down</p>
      <p>USE — Place / Interact &nbsp; FLY — Toggle fly</p>
      <p>Double-tap the look area while aiming at your animal — Store it in the bag</p>
      <p>Tap the BAG slot by the hotbar — Open inventory &nbsp; Tap hotbar slot — Select item</p>
      <h3>Furniture & Home</h3>
      <p>New worlds start with a furnished house (bedroom + living room) and a fenced farm</p>
      <p>Release tamed animals into the farm pen — toggle them to "stay" to keep them in</p>
      <p>Place furniture (doors, windows, desk, chairs, bed, sofa) with USE; MINE to pick it back up</p>
      <p>USE a door to swing it open or closed</p>
      <h3>Map & Music</h3>
      <p>Mini-map sits top-right — tap it to open the full navigation map</p>
      <p>♪ button toggles the background music</p>
      <h3>Animals &amp; Taming</h3>
      <p>Apple → tame Pig &nbsp; Carrot → tame Rabbit &nbsp; Seeds → tame Chicken</p>
      <p>Wheat → tame Sheep &nbsp; Fish → tame Cat &nbsp; Bone → tame Dog</p>
      <p>Mine tree leaves — chance of finding Apples or Bones</p>
      <p>Hold the Fishing Net and right-click (USE) while aiming at a pond to catch Fish</p>
      <p>Shift + right-click your tamed animal — Capture it into the bag</p>
      <p>Select a captured-animal item and USE on open ground — Release the animal</p>
      <h3>Tips</h3>
      <p>Look at an animal or block — its name shows up top; tap the ⓘ (or press I) for how to tame/use it</p>
      <p>Open a treasure box to auto-collect its loot — the box is used up, not kept</p>
      <p>Open the BAG to browse items by category (Blocks, Tools, Food, Animals, Furniture)</p>
      <p>In multiplayer each player shows up in a unique shirt colour</p>
    `
    const closeBtn = box.querySelector('.mc-instructions-close')!
    closeBtn.addEventListener('click', () => { overlay.style.display = 'none' })
    closeBtn.addEventListener('touchstart', (e) => { e.preventDefault(); overlay.style.display = 'none' }, { passive: false })
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) overlay.style.display = 'none' })
    overlay.addEventListener('touchstart', (e) => {
      if (e.target === overlay) { e.preventDefault(); overlay.style.display = 'none' }
    }, { passive: false })
    overlay.appendChild(box)
    root.appendChild(overlay)
    this.instructionsOverlay = overlay

    // Nameplate for the animal / block under the crosshair, with an info button.
    this.nameplate = document.createElement('div')
    this.nameplate.className = 'mc-nameplate'
    this.nameplateName = document.createElement('span')
    this.nameplateName.className = 'mc-nameplate-name'
    const infoBtn = document.createElement('button')
    infoBtn.className = 'mc-nameplate-info'
    infoBtn.textContent = 'i'
    infoBtn.title = 'How to tame / use this'
    const openInfo = (e: Event) => { e.preventDefault(); e.stopPropagation(); this.openTargetInfo() }
    infoBtn.addEventListener('click', openInfo)
    infoBtn.addEventListener('touchstart', openInfo, { passive: false })
    this.nameplate.append(this.nameplateName, infoBtn)
    root.appendChild(this.nameplate)

    const infoOverlay = document.createElement('div')
    infoOverlay.className = 'mc-instructions'
    this.infoBox = document.createElement('div')
    this.infoBox.className = 'mc-instructions-box'
    infoOverlay.addEventListener('mousedown', (e) => { if (e.target === infoOverlay) this.closeInfo() })
    infoOverlay.addEventListener('touchstart', (e) => {
      if (e.target === infoOverlay) { e.preventDefault(); this.closeInfo() }
    }, { passive: false })
    infoOverlay.appendChild(this.infoBox)
    root.appendChild(infoOverlay)
    this.infoOverlay = infoOverlay

    this.refresh()
  }

  refresh(): void {
    for (let i = 0; i < this.hotbarSlots.length; i++) {
      const el = this.hotbarSlots[i]
      el.classList.toggle('selected', i === this.inventory.selected)
      const slot = this.inventory.slots[i]
      const canvas = el.querySelector('canvas')!
      const count = el.querySelector('.count')!
      if (slot) {
        drawItemIcon(canvas, slot.itemId, this.atlasCanvas)
        count.textContent = slot.count > 1 ? String(slot.count) : ''
        el.title = itemDef(slot.itemId)?.name ?? ''
      } else {
        canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
        count.textContent = ''
        el.title = ''
      }
    }
  }

  update(
    dt: number,
    debugText: string,
    miningProgress: number | null,
    phaseInfo?: { phase: 'day' | 'night'; remainingSecs: number },
  ): void {
    this.debug.textContent = debugText
    if (miningProgress !== null) {
      this.miningBar.style.display = 'block'
      this.miningFill.style.width = `${Math.round(miningProgress * 100)}%`
    } else {
      this.miningBar.style.display = 'none'
    }
    if (phaseInfo) {
      const mins = Math.floor(phaseInfo.remainingSecs / 60)
      const secs = Math.floor(phaseInfo.remainingSecs % 60)
      const icon = phaseInfo.phase === 'day' ? '☀' : '🌙'
      this.dayTimer.textContent = `${icon} ${mins}:${secs.toString().padStart(2, '0')}`
    }
    if (this.toastTimer > 0) {
      this.toastTimer -= dt
      if (this.toastTimer <= 0) this.toast.style.opacity = '0'
    }
  }

  private showInstructions(): void {
    this.instructionsOverlay.style.display = 'flex'
  }

  /** Show (or hide, when null) the nameplate for the targeted animal / block. */
  setTarget(name: string | null, info: InfoContent | null): void {
    if (!name) {
      // Keep the nameplate visible while its info card is open.
      if (this.infoOverlay.style.display !== 'flex') {
        this.nameplate.style.display = 'none'
        this.currentInfo = null
      }
      return
    }
    this.currentInfo = info
    this.nameplateName.textContent = name
    this.nameplate.style.display = 'flex'
  }

  get isInfoOpen(): boolean {
    return this.infoOverlay.style.display === 'flex'
  }

  private closeInfo(): void {
    if (!this.isInfoOpen) return
    this.infoOverlay.style.display = 'none'
    this.onInfoClose()
  }

  /** Open the info card for whatever the nameplate currently describes. Returns whether it opened. */
  openTargetInfo(): boolean {
    const info = this.currentInfo
    if (!info) return false
    const lines = info.lines.map((l) => `<p>${l}</p>`).join('')
    this.infoBox.innerHTML =
      `<button class="mc-instructions-close">✕ Close</button><h3>${info.title}</h3>${lines}`
    const closeBtn = this.infoBox.querySelector('.mc-instructions-close')!
    const close = (e: Event) => { e.preventDefault(); this.closeInfo() }
    closeBtn.addEventListener('click', close)
    closeBtn.addEventListener('touchstart', close, { passive: false })
    this.infoOverlay.style.display = 'flex'
    return true
  }

  showToast(text: string): void {
    this.toast.textContent = text
    this.toast.style.opacity = '1'
    this.toastTimer = 3
  }

  setPlayerList(names: string[]): void {
    if (names.length === 0) {
      this.playerList.style.display = 'none'
      return
    }
    this.playerList.style.display = ''
    this.playerList.textContent = names.join('\n')
  }
}
