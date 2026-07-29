import type { Inventory } from '../items/inventory'
import { Inventory as Inv } from '../items/inventory'
import { itemDef, itemCategory, itemIdsForCategory, type ItemCategory, type Slot } from '../items/items'
import { drawItemIcon } from './icons'
import { revealPane } from './theme'

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
  position: absolute; inset: 0; z-index: 10;
  display: flex; align-items: center; justify-content: center; padding: 16px;
}
.mc-panel {
  max-height: 85vh; max-width: 95vw;
  display: flex; flex-direction: column; overflow: hidden;
}
.mc-panel-scroll {
  flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 16px 18px;
}
.mc-hotbar-sticky {
  flex: 0 0 auto; padding: 10px 18px 14px;
  border-top: 1px solid var(--mc-stroke, rgba(255,255,255,0.12));
  background: rgba(255,255,255,0.03);
}
.mc-hotbar-sticky .mc-grid { margin-bottom: 0; }
.mc-hotbar-label {
  font-size: var(--mc-fs-2xs, 11px); color: var(--mc-text-faint, #8a8f98);
  margin-bottom: 6px; letter-spacing: 0.9px; text-transform: uppercase;
}
.mc-panel h3 {
  margin: 0 0 10px; font-size: var(--mc-fs-xs, 12.5px); font-weight: 600;
  letter-spacing: 1.1px; text-transform: uppercase; color: var(--mc-text-faint, #8a8f98);
}
.mc-panel-body { display: flex; gap: 16px; align-items: flex-start; }
.mc-cats { display: flex; flex-direction: column; gap: 4px; flex: 0 0 auto; }
.mc-cat-btn {
  min-width: 92px; padding: 9px 12px; text-align: left;
  font-family: var(--mc-font, sans-serif); font-size: var(--mc-fs-sm, 14px); font-weight: 500;
  color: var(--mc-text-dim, #ccc); cursor: pointer;
  background: transparent; border: 1px solid transparent;
  border-radius: var(--mc-radius-sm, 10px);
  transition: background 0.16s var(--mc-ease, ease), color 0.16s var(--mc-ease, ease);
  -webkit-tap-highlight-color: transparent;
}
.mc-cat-btn:hover { background: var(--mc-raised, rgba(255,255,255,0.06)); color: var(--mc-text, #fff); }
.mc-cat-btn.active {
  background: var(--mc-accent-soft, rgba(124,215,255,0.16));
  border-color: var(--mc-accent-line, rgba(124,215,255,0.55));
  color: #dcf3ff; font-weight: 600;
}
.mc-panel-main { flex: 1 1 auto; min-width: 0; }
.mc-grid { display: grid; grid-template-columns: repeat(9, var(--mc-pslot, 50px)); gap: 6px; margin-bottom: 14px; }
.mc-pslot {
  width: var(--mc-pslot, 50px); height: var(--mc-pslot, 50px); position: relative; cursor: pointer;
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--mc-stroke, rgba(255,255,255,0.12));
  border-radius: var(--mc-radius-sm, 10px);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.07);
  transition: background 0.14s var(--mc-ease, ease), border-color 0.14s var(--mc-ease, ease);
}
.mc-pslot:hover { background: var(--mc-raised-hover, rgba(255,255,255,0.12)); }
/* Narrow screens: shrink slots and stack the category rail above the grid so
   the 9-wide inventory always fits without horizontal cutoff. */
@media (max-width: 720px) {
  :root { --mc-pslot: 40px; }
  .mc-panel-body { flex-direction: column; }
  .mc-cats { flex-direction: row; flex-wrap: wrap; }
  .mc-cat-btn { min-width: 0; padding: 7px 12px; font-size: var(--mc-fs-xs, 12.5px); }
}
@media (max-width: 470px) {
  :root { --mc-pslot: 33px; }
  .mc-pslot .count { font-size: var(--mc-fs-xs, 12.5px); }
  .mc-panel-scroll { padding: 12px; }
  .mc-hotbar-sticky { padding: 8px 12px 12px; }
}
.mc-pslot.picked {
  border-color: var(--mc-warn, #ffcc5c);
  box-shadow: 0 0 0 2px var(--mc-warn-soft, rgba(255,204,92,0.18)), 0 0 16px rgba(255,204,92,0.35);
}
.mc-pslot.catalog-empty { opacity: 0.26; cursor: default; }
.mc-pslot canvas {
  width: 100%; height: 100%; image-rendering: pixelated; display: block;
  padding: 3px; border-radius: inherit;
}
.mc-pslot .count {
  position: absolute; right: 4px; bottom: 2px; color: #fff; font-size: var(--mc-fs-xs, 12.5px);
  font-family: var(--mc-font-mono, monospace); font-weight: 700;
  text-shadow: 0 1px 3px rgba(0,0,0,0.9); pointer-events: none;
}
.mc-empty { font-size: var(--mc-fs-sm, 14px); color: var(--mc-text-faint, #888); margin: 4px 0 10px; }
.mc-picked-name {
  min-height: 1.4em; margin: 0 0 12px; font-size: var(--mc-fs-sm, 14px); font-weight: 600;
  color: var(--mc-accent, #7cd7ff); line-height: 1.4;
}
.mc-picked-name .dim { color: var(--mc-text-faint, #888); font-weight: 400; }
.mc-summary-msg { font-size: var(--mc-fs-sm, 14px); margin: 0 0 12px; color: var(--mc-text-dim, #ccc); }
.mc-summary-names {
  font-size: var(--mc-fs-sm, 14px); margin: 4px 0 16px; line-height: 1.8;
  color: var(--mc-text, #fff);
}
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
  private category: Category = 'all'
  /** Name line describing the item the player last clicked/tapped. */
  private clickedInfo: string | null = null
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
    this.backdrop.className = 'mc-panel-backdrop mc-scrim'
    this.backdrop.style.display = 'none'
    this.panel = document.createElement('div')
    this.panel.className = 'mc-panel mc-glass'
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
    this.clickedInfo = null
    this.render()
    this.reveal()
  }

  openChest(contents: (Slot | null)[]): void {
    this.chestSlots = contents
    this.summary = null
    this.picked = null
    this.category = 'all'
    this.clickedInfo = null
    this.render()
    this.reveal()
  }

  /** Show a read-only list of items collected from a treasure box. */
  openSummary(items: Slot[]): void {
    this.chestSlots = null
    this.summary = items
    this.picked = null
    this.render()
    this.reveal()
  }

  /** Show the backdrop and replay the pane's entrance animation. */
  private reveal(): void {
    this.backdrop.style.display = 'flex'
    revealPane(this.panel)
  }

  close(): void {
    if (!this.isOpen) return
    this.backdrop.style.display = 'none'
    this.chestSlots = null
    this.summary = null
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
    // Name of the item the player last tapped, so everything is identifiable.
    const nameLine = document.createElement('div')
    nameLine.className = 'mc-picked-name'
    if (this.clickedInfo) nameLine.textContent = this.clickedInfo
    else nameLine.innerHTML = '<span class="dim">Tap an item to see its name</span>'
    scroll.appendChild(nameLine)
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
      main.appendChild(this.grid(this.chestSlots, 0, this.chestSlots.length))
    }
    main.appendChild(this.title('Inventory'))
    // Main inventory rows (slots 9+); hotbar is pinned in the sticky footer.
    main.appendChild(this.grid(this.inventory.slots, 9, this.inventory.slots.length))
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
    // Even catalog entries identify themselves when tapped.
    const announce = (e: Event) => {
      e.preventDefault()
      const name = itemDef(itemId)?.name ?? 'Item'
      this.clickedInfo = count > 0 ? `${name} ×${count}` : `${name} — none collected yet`
      this.render()
    }
    el.addEventListener('mousedown', announce)
    el.addEventListener('touchstart', announce, { passive: false })
    return el
  }

  private renderSummary(container: HTMLElement): void {
    container.appendChild(this.title('Treasure Box'))
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
    const close = document.createElement('button')
    close.className = 'mc-ui-btn primary'
    close.textContent = 'Close'
    close.addEventListener('click', () => this.close())
    close.addEventListener('touchstart', (e) => { e.preventDefault(); this.close() }, { passive: false })
    container.appendChild(close)
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
      const slot = slots[index]
      if (slot) {
        this.picked = { slots, index }
        const name = itemDef(slot.itemId)?.name ?? 'Item'
        this.clickedInfo = `${name} ×${slot.count} — tap another slot to move it`
      }
    } else {
      const touchedChest = this.picked.slots === this.chestSlots || slots === this.chestSlots
      Inv.transfer(this.picked.slots, this.picked.index, slots, index)
      this.picked = null
      const landed = slots[index]
      this.clickedInfo = landed ? `${itemDef(landed.itemId)?.name ?? 'Item'} ×${landed.count}` : null
      this.inventory.onChange()
      if (touchedChest) this.onChestChange()
    }
    this.render()
  }
}
