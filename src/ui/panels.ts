import type { Inventory } from '../items/inventory'
import { Inventory as Inv } from '../items/inventory'
import { itemDef, type Slot } from '../items/items'
import { drawItemIcon } from './icons'

const STYLE = `
.mc-panel-backdrop {
  position: absolute; inset: 0; background: rgba(0,0,0,0.5); z-index: 10;
  display: flex; align-items: center; justify-content: center;
}
.mc-panel {
  background: #c6c6c6; border: 3px solid; border-color: #fff #555 #555 #fff;
  padding: 12px; color: #333; font-family: 'Courier New', monospace;
}
.mc-panel h3 { margin: 0 0 8px; font-size: 15px; }
.mc-grid { display: grid; grid-template-columns: repeat(9, 44px); gap: 3px; margin-bottom: 10px; }
.mc-pslot {
  width: 44px; height: 44px; background: #8b8b8b; border: 2px solid;
  border-color: #373737 #fff #fff #373737; position: relative; cursor: pointer;
}
.mc-pslot.picked { outline: 3px solid #ffd34d; }
.mc-pslot canvas { width: 100%; height: 100%; image-rendering: pixelated; }
.mc-pslot .count {
  position: absolute; right: 2px; bottom: 0; color: #fff; font-size: 13px;
  font-weight: bold; text-shadow: 1px 1px 0 #000; pointer-events: none;
}
`

interface Picked {
  slots: (Slot | null)[]
  index: number
}

/**
 * Inventory / chest panel. Click a slot to pick it up, click another to
 * move/merge/swap. Operates directly on slot arrays so it works for both the
 * player inventory and chest contents.
 */
export class Panels {
  private readonly backdrop: HTMLDivElement
  private readonly panel: HTMLDivElement
  private picked: Picked | null = null
  private chestSlots: (Slot | null)[] | null = null
  /** Notified after any change while a chest is open (multiplayer sync). */
  onChestChange: () => void = () => {}
  onClose: () => void = () => {}

  constructor(
    root: HTMLElement,
    private readonly inventory: Inventory,
    private readonly atlasCanvas: HTMLCanvasElement,
  ) {
    const style = document.createElement('style')
    style.textContent = STYLE
    document.head.appendChild(style)
    this.backdrop = document.createElement('div')
    this.backdrop.className = 'mc-panel-backdrop'
    this.backdrop.style.display = 'none'
    this.panel = document.createElement('div')
    this.panel.className = 'mc-panel'
    this.backdrop.appendChild(this.panel)
    root.appendChild(this.backdrop)
    this.backdrop.addEventListener('mousedown', (e) => {
      if (e.target === this.backdrop) this.close()
    })
  }

  get isOpen(): boolean {
    return this.backdrop.style.display !== 'none'
  }

  openInventory(): void {
    this.chestSlots = null
    this.picked = null
    this.render()
    this.backdrop.style.display = 'flex'
  }

  openChest(contents: (Slot | null)[]): void {
    this.chestSlots = contents
    this.picked = null
    this.render()
    this.backdrop.style.display = 'flex'
  }

  close(): void {
    if (!this.isOpen) return
    this.backdrop.style.display = 'none'
    this.chestSlots = null
    this.picked = null
    this.onClose()
  }

  private render(): void {
    this.panel.innerHTML = ''
    if (this.chestSlots) {
      this.panel.appendChild(this.title('Chest'))
      this.panel.appendChild(this.grid(this.chestSlots, 0, this.chestSlots.length))
    }
    this.panel.appendChild(this.title(this.chestSlots ? 'Inventory' : 'Inventory (1-9 = hotbar)'))
    // Main inventory rows first, hotbar row last (like the classic layout).
    this.panel.appendChild(this.grid(this.inventory.slots, 9, this.inventory.slots.length))
    this.panel.appendChild(this.grid(this.inventory.slots, 0, 9))
  }

  private title(text: string): HTMLElement {
    const h = document.createElement('h3')
    h.textContent = text
    return h
  }

  private grid(slots: (Slot | null)[], start: number, end: number): HTMLElement {
    const grid = document.createElement('div')
    grid.className = 'mc-grid'
    for (let i = start; i < end; i++) {
      const el = document.createElement('div')
      el.className = 'mc-pslot'
      if (this.picked && this.picked.slots === slots && this.picked.index === i) el.classList.add('picked')
      const slot = slots[i]
      if (slot) {
        const canvas = document.createElement('canvas')
        canvas.width = 32
        canvas.height = 32
        drawItemIcon(canvas, slot.itemId, this.atlasCanvas)
        el.appendChild(canvas)
        const count = document.createElement('span')
        count.className = 'count'
        count.textContent = slot.count > 1 ? String(slot.count) : ''
        el.appendChild(count)
        el.title = itemDef(slot.itemId)?.name ?? ''
      }
      el.addEventListener('mousedown', () => this.clickSlot(slots, i))
      grid.appendChild(el)
    }
    return grid
  }

  private clickSlot(slots: (Slot | null)[], index: number): void {
    if (!this.picked) {
      if (slots[index]) this.picked = { slots, index }
    } else {
      const touchedChest = this.picked.slots === this.chestSlots || slots === this.chestSlots
      Inv.transfer(this.picked.slots, this.picked.index, slots, index)
      this.picked = null
      this.inventory.onChange()
      if (touchedChest) this.onChestChange()
    }
    this.render()
  }
}
