import type { Inventory } from '../items/inventory'
import { Inventory as Inv } from '../items/inventory'
import { itemDef, itemCategory, itemIdsForCategory, type ItemCategory, type Slot } from '../items/items'
import { drawItemIcon } from './icons'

type Category = 'all' | ItemCategory

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'blocks', label: 'Blocks' },
  { id: 'tools', label: 'Tools' },
  { id: 'food', label: 'Food' },
  { id: 'animals', label: 'Animals' },
  { id: 'furniture', label: 'Furniture' },
]

const STYLE = `
.mc-panel-backdrop {
  position: absolute; inset: 0; background: rgba(0,0,0,0.5); z-index: 10;
  display: flex; align-items: center; justify-content: center;
}
.mc-panel {
  background: #c6c6c6; border: 3px solid; border-color: #fff #555 #555 #fff;
  color: #333; font-family: 'Courier New', monospace;
  max-height: 85vh; max-width: 95vw;
  display: flex; flex-direction: column; overflow: hidden;
}
.mc-panel-scroll {
  flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 12px;
}
.mc-hotbar-sticky {
  flex: 0 0 auto; padding: 4px 12px 10px; border-top: 2px solid #555;
  background: #c6c6c6;
}
.mc-hotbar-sticky .mc-grid { margin-bottom: 0; }
.mc-hotbar-label { font-size: 11px; color: #555; margin-bottom: 4px; }
.mc-panel h3 { margin: 0 0 8px; font-size: 15px; }
.mc-panel-body { display: flex; gap: 12px; align-items: flex-start; }
.mc-cats { display: flex; flex-direction: column; gap: 5px; flex: 0 0 auto; }
.mc-cat-btn {
  min-width: 72px; padding: 10px 8px; font-family: 'Courier New', monospace;
  font-size: 13px; font-weight: bold; color: #333; cursor: pointer;
  background: #8b8b8b; border: 2px solid; border-color: #fff #555 #555 #fff;
  -webkit-tap-highlight-color: transparent; text-align: left;
}
.mc-cat-btn.active { background: #e7d9a0; border-color: #555 #fff #fff #555; }
.mc-panel-main { flex: 1 1 auto; min-width: 0; }
.mc-grid { display: grid; grid-template-columns: repeat(9, 50px); gap: 4px; margin-bottom: 10px; }
.mc-pslot {
  width: 50px; height: 50px; background: #8b8b8b; border: 2px solid;
  border-color: #373737 #fff #fff #373737; position: relative; cursor: pointer;
}
.mc-pslot.picked { outline: 3px solid #ffd34d; }
.mc-pslot.catalog-empty { opacity: 0.32; cursor: default; }
.mc-pslot canvas { width: 100%; height: 100%; image-rendering: pixelated; }
.mc-pslot .count {
  position: absolute; right: 2px; bottom: 0; color: #fff; font-size: 13px;
  font-weight: bold; text-shadow: 1px 1px 0 #000; pointer-events: none;
}
.mc-empty { font-size: 13px; color: #555; margin: 4px 0 10px; }
.mc-summary-msg { font-size: 14px; margin: 0 0 10px; }
.mc-summary-names { font-size: 13px; margin: 4px 0 12px; line-height: 1.7; }
.mc-summary-close {
  cursor: pointer; background: #8b8b8b; border: 2px solid; border-color: #fff #555 #555 #fff;
  font-family: 'Courier New', monospace; font-size: 13px; font-weight: bold; color: #333;
  padding: 8px 16px; -webkit-tap-highlight-color: transparent;
}
.mc-take-all-btn {
  cursor: pointer; background: #5a9a5a; border: 2px solid; border-color: #8fd48f #2a5a2a #2a5a2a #8fd48f;
  font-family: 'Courier New', monospace; font-size: 13px; font-weight: bold; color: #fff;
  padding: 6px 14px; margin-bottom: 8px; -webkit-tap-highlight-color: transparent;
}
.mc-take-all-btn:hover { background: #6ab46a; }
.mc-take-all-btn:active { background: #4a8a4a; }
`

interface Picked {
  slots: (Slot | null)[]
  index: number
}

/**
 * Inventory / chest panel. Click a slot to pick it up, click another to
 * move/merge/swap. Operates directly on slot arrays so it works for both the
 * player inventory and chest contents. Also renders the read-only summary
 * shown after opening a treasure box.
 */
export class Panels {
  private readonly backdrop: HTMLDivElement
  private readonly panel: HTMLDivElement
  private picked: Picked | null = null
  private chestSlots: (Slot | null)[] | null = null
  private summary: Slot[] | null = null
  private summaryTitle = 'Treasure Box'
  private summaryAutoClose = false
  private summaryTimer: ReturnType<typeof setTimeout> | null = null
  private category: Category = 'all'
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
    this.summary = null
    this.picked = null
    this.category = 'all'
    this.render()
    this.backdrop.style.display = 'flex'
  }

  openChest(contents: (Slot | null)[]): void {
    this.chestSlots = contents
    this.summary = null
    this.picked = null
    this.category = 'all'
    this.render()
    this.backdrop.style.display = 'flex'
  }

  /** Show a read-only list of items collected from a box. Auto-closes after 3 s when autoClose is true. */
  openSummary(items: Slot[], title = 'Treasure Box', autoClose = false): void {
    this.chestSlots = null
    this.summary = items
    this.summaryTitle = title
    this.summaryAutoClose = autoClose
    this.picked = null
    if (this.summaryTimer) {
      clearTimeout(this.summaryTimer)
      this.summaryTimer = null
    }
    this.render()
    this.backdrop.style.display = 'flex'
    if (autoClose) {
      this.summaryTimer = setTimeout(() => this.close(), 3000)
    }
  }

  close(): void {
    if (!this.isOpen) return
    if (this.summaryTimer) {
      clearTimeout(this.summaryTimer)
      this.summaryTimer = null
    }
    this.backdrop.style.display = 'none'
    this.chestSlots = null
    this.summary = null
    this.summaryAutoClose = false
    this.picked = null
    this.onClose()
  }

  private render(): void {
    this.panel.innerHTML = ''
    if (this.summary) {
      const scroll = document.createElement('div')
      scroll.className = 'mc-panel-scroll'
      this.renderSummary(scroll)
      this.panel.appendChild(scroll)
      return
    }
    // Scrollable main area (chest + inventory rows).
    const scroll = document.createElement('div')
    scroll.className = 'mc-panel-scroll'
    const body = document.createElement('div')
    body.className = 'mc-panel-body'
    body.appendChild(this.categoryBar())
    const main = document.createElement('div')
    main.className = 'mc-panel-main'
    if (this.category === 'all') this.renderAll(main)
    else this.renderFiltered(main, this.category)
    body.appendChild(main)
    scroll.appendChild(body)
    this.panel.appendChild(scroll)
    // Sticky hotbar always visible at the bottom.
    const sticky = document.createElement('div')
    sticky.className = 'mc-hotbar-sticky'
    const label = document.createElement('div')
    label.className = 'mc-hotbar-label'
    label.textContent = 'Hotbar (1–9)'
    sticky.appendChild(label)
    sticky.appendChild(this.grid(this.inventory.slots, 0, 9))
    this.panel.appendChild(sticky)
  }

  private categoryBar(): HTMLElement {
    const bar = document.createElement('div')
    bar.className = 'mc-cats'
    for (const cat of CATEGORIES) {
      const btn = document.createElement('button')
      btn.className = 'mc-cat-btn' + (cat.id === this.category ? ' active' : '')
      btn.textContent = cat.label
      btn.addEventListener('click', () => {
        this.category = cat.id
        this.render()
      })
      bar.appendChild(btn)
    }
    return bar
  }

  private renderAll(main: HTMLElement): void {
    if (this.chestSlots) {
      main.appendChild(this.title('Chest'))
      const takeAllBtn = document.createElement('button')
      takeAllBtn.className = 'mc-take-all-btn'
      takeAllBtn.textContent = 'Take All'
      takeAllBtn.addEventListener('click', () => this.takeAllFromChest())
      takeAllBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.takeAllFromChest() }, { passive: false })
      main.appendChild(takeAllBtn)
      main.appendChild(this.grid(this.chestSlots, 0, this.chestSlots.length))
    }
    main.appendChild(this.title('Inventory'))
    // Main inventory rows (slots 9+); hotbar is pinned in the sticky footer.
    main.appendChild(this.grid(this.inventory.slots, 9, this.inventory.slots.length))
  }

  private takeAllFromChest(): void {
    if (!this.chestSlots) return
    for (let i = 0; i < this.chestSlots.length; i++) {
      const slot = this.chestSlots[i]
      if (!slot) continue
      this.inventory.add(slot.itemId, slot.count)
      this.chestSlots[i] = null
    }
    this.inventory.onChange()
    this.onChestChange()
    this.render()
  }

  private renderFiltered(main: HTMLElement, category: ItemCategory): void {
    // Chest contents (if open): show matching slots with drag-drop.
    if (this.chestSlots) {
      const grid = this.filteredGrid(this.chestSlots, category)
      if (grid.childElementCount > 0) {
        main.appendChild(this.title('Chest'))
        main.appendChild(grid)
      }
    }

    // Build aggregated count per item type across the whole inventory.
    const totals = new Map<number, number>()
    for (const slot of this.inventory.slots) {
      if (!slot) continue
      if (itemCategory(slot.itemId) !== category) continue
      totals.set(slot.itemId, (totals.get(slot.itemId) ?? 0) + slot.count)
    }

    // Show every known item in this category: owned items first, undiscovered dimmed below.
    const allIds = itemIdsForCategory(category)
    const owned = allIds.filter(id => totals.has(id))
    const missing = allIds.filter(id => !totals.has(id))

    main.appendChild(this.title('Inventory'))
    const grid = document.createElement('div')
    grid.className = 'mc-grid'
    for (const id of owned) {
      grid.appendChild(this.catalogCell(id, totals.get(id)!))
    }
    for (const id of missing) {
      grid.appendChild(this.catalogCell(id, 0))
    }
    if (grid.childElementCount === 0) {
      const msg = document.createElement('p')
      msg.className = 'mc-empty'
      msg.textContent = 'No items in this category yet.'
      main.appendChild(msg)
    } else {
      main.appendChild(grid)
    }
  }

  /** Read-only catalog cell: owned items are full opacity with count; unowned are dimmed. */
  private catalogCell(itemId: number, count: number): HTMLElement {
    const el = document.createElement('div')
    el.className = count > 0 ? 'mc-pslot' : 'mc-pslot catalog-empty'
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    drawItemIcon(canvas, itemId, this.atlasCanvas)
    el.appendChild(canvas)
    const countEl = document.createElement('span')
    countEl.className = 'count'
    countEl.textContent = count > 0 ? String(count) : ''
    el.appendChild(countEl)
    el.title = itemDef(itemId)?.name ?? ''
    return el
  }

  private renderSummary(container: HTMLElement): void {
    container.appendChild(this.title(this.summaryTitle))
    const items = this.summary ?? []
    if (items.length === 0) {
      const msg = document.createElement('p')
      msg.className = 'mc-summary-msg'
      msg.textContent = 'The box was empty.'
      container.appendChild(msg)
    } else {
      const msg = document.createElement('p')
      msg.className = 'mc-summary-msg'
      msg.textContent = 'You found and collected:'
      container.appendChild(msg)

      const grid = document.createElement('div')
      grid.className = 'mc-grid'
      const names = document.createElement('div')
      names.className = 'mc-summary-names'
      for (const item of items) {
        grid.appendChild(this.iconCell(item))
        const name = itemDef(item.itemId)?.name ?? 'Item'
        const line = document.createElement('div')
        line.textContent = `${item.count} × ${name}`
        names.appendChild(line)
      }
      container.appendChild(grid)
      container.appendChild(names)
    }
    const closeRow = document.createElement('div')
    closeRow.style.display = 'flex'
    closeRow.style.alignItems = 'center'
    closeRow.style.gap = '12px'
    const close = document.createElement('button')
    close.className = 'mc-summary-close'
    close.textContent = 'Close'
    close.addEventListener('click', () => this.close())
    close.addEventListener('touchstart', (e) => { e.preventDefault(); this.close() }, { passive: false })
    closeRow.appendChild(close)
    if (this.summaryAutoClose) {
      const hint = document.createElement('span')
      hint.className = 'mc-summary-msg'
      hint.style.fontSize = '12px'
      hint.style.color = '#666'
      hint.textContent = 'Auto-closes in 3 s'
      closeRow.appendChild(hint)
    }
    container.appendChild(closeRow)
  }

  private title(text: string): HTMLElement {
    const h = document.createElement('h3')
    h.textContent = text
    return h
  }

  private grid(slots: (Slot | null)[], start: number, end: number): HTMLElement {
    const grid = document.createElement('div')
    grid.className = 'mc-grid'
    for (let i = start; i < end; i++) grid.appendChild(this.cell(slots, i))
    return grid
  }

  private filteredGrid(slots: (Slot | null)[], category: ItemCategory): HTMLElement {
    const grid = document.createElement('div')
    grid.className = 'mc-grid'
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i]
      if (slot && itemCategory(slot.itemId) === category) grid.appendChild(this.cell(slots, i))
    }
    return grid
  }

  /** Interactive inventory/chest cell wired for pick/move. */
  private cell(slots: (Slot | null)[], i: number): HTMLElement {
    const el = document.createElement('div')
    el.className = 'mc-pslot'
    if (this.picked && this.picked.slots === slots && this.picked.index === i) el.classList.add('picked')
    const slot = slots[i]
    if (slot) this.fillCell(el, slot)
    el.addEventListener('mousedown', () => this.clickSlot(slots, i))
    // Touch devices: handle the tap directly and suppress the synthesized
    // mouse event so a single tap doesn't pick-then-drop in one go.
    el.addEventListener('touchstart', (e) => { e.preventDefault(); this.clickSlot(slots, i) }, { passive: false })
    return el
  }

  /** Read-only cell for the treasure summary. */
  private iconCell(slot: Slot): HTMLElement {
    const el = document.createElement('div')
    el.className = 'mc-pslot'
    el.style.cursor = 'default'
    this.fillCell(el, slot)
    return el
  }

  private fillCell(el: HTMLElement, slot: Slot): void {
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    drawItemIcon(canvas, slot.itemId, this.atlasCanvas)
    el.appendChild(canvas)
    const count = document.createElement('span')
    count.className = 'count'
    count.textContent = String(slot.count)
    el.appendChild(count)
    el.title = itemDef(slot.itemId)?.name ?? ''
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
