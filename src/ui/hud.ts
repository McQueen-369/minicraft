import { HOTBAR_SIZE } from '../constants'
import type { Inventory } from '../items/inventory'
import { itemDef } from '../items/items'
import { drawItemIcon } from './icons'

const STYLE = `
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
  display: flex; gap: 4px; z-index: 5;
}
.mc-slot {
  width: 48px; height: 48px; background: rgba(20,20,20,0.6);
  border: 2px solid #555; position: relative; image-rendering: pixelated;
}
.mc-slot.selected { border-color: #fff; }
.mc-slot canvas { width: 100%; height: 100%; image-rendering: pixelated; }
.mc-slot .count {
  position: absolute; right: 3px; bottom: 1px; color: #fff; font-size: 14px;
  font-weight: bold; text-shadow: 1px 1px 0 #000; pointer-events: none;
}
.mc-debug {
  position: absolute; left: 8px; top: 8px; color: #fff; font-size: 12px;
  text-shadow: 1px 1px 0 #000; z-index: 5; white-space: pre; pointer-events: none;
}
.mc-toast {
  position: absolute; left: 50%; bottom: 76px; transform: translateX(-50%);
  color: #fff; font-size: 14px; text-shadow: 1px 1px 0 #000; z-index: 5;
  pointer-events: none; transition: opacity 0.5s; opacity: 0;
}
`

export class HUD {
  private readonly hotbarSlots: HTMLDivElement[] = []
  private readonly miningBar: HTMLDivElement
  private readonly miningFill: HTMLDivElement
  private readonly debug: HTMLDivElement
  private readonly toast: HTMLDivElement
  private toastTimer = 0

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
    }
    root.appendChild(hotbar)

    this.debug = document.createElement('div')
    this.debug.className = 'mc-debug'
    root.appendChild(this.debug)

    this.toast = document.createElement('div')
    this.toast.className = 'mc-toast'
    root.appendChild(this.toast)

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

  update(dt: number, debugText: string, miningProgress: number | null): void {
    this.debug.textContent = debugText
    if (miningProgress !== null) {
      this.miningBar.style.display = 'block'
      this.miningFill.style.width = `${Math.round(miningProgress * 100)}%`
    } else {
      this.miningBar.style.display = 'none'
    }
    if (this.toastTimer > 0) {
      this.toastTimer -= dt
      if (this.toastTimer <= 0) this.toast.style.opacity = '0'
    }
  }

  showToast(text: string): void {
    this.toast.textContent = text
    this.toast.style.opacity = '1'
    this.toastTimer = 3
  }
}
