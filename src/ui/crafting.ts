import type { Inventory } from '../items/inventory'
import { itemDef } from '../items/items'
import { RECIPES, type Recipe } from '../items/crafting'
import { drawItemIcon } from './icons'

const STYLE = `
.mc-craft-backdrop {
  position: absolute; inset: 0; background: rgba(0,0,0,0.5); z-index: 10;
  display: flex; align-items: center; justify-content: center;
}
.mc-craft-panel {
  background: #c6c6c6; border: 3px solid; border-color: #fff #555 #555 #fff;
  color: #333; font-family: 'Courier New', monospace;
  max-height: 85vh; max-width: 95vw; width: 420px;
  display: flex; flex-direction: column; overflow: hidden;
}
.mc-craft-header {
  flex: 0 0 auto; padding: 10px 14px; border-bottom: 2px solid #555;
  display: flex; align-items: center; justify-content: space-between;
  font-size: 15px; font-weight: bold;
}
.mc-craft-close {
  background: #888; border: none; border-radius: 4px; color: #fff;
  font-size: 13px; font-weight: bold; padding: 3px 10px; cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.mc-craft-close:hover { background: #666; }
.mc-craft-list {
  flex: 1 1 auto; overflow-y: auto; padding: 10px;
  display: flex; flex-direction: column; gap: 6px;
}
.mc-craft-row {
  display: flex; align-items: center; gap: 8px; padding: 6px 8px;
  background: #b0b0b0; border: 2px solid; border-color: #fff #555 #555 #fff;
}
.mc-craft-row.unavailable { opacity: 0.5; }
.mc-craft-icon {
  position: relative; width: 36px; height: 36px; flex: 0 0 36px;
  background: #8b8b8b; border: 2px solid; border-color: #555 #fff #fff #555;
  image-rendering: pixelated;
}
.mc-craft-icon canvas { width: 100%; height: 100%; image-rendering: pixelated; }
.mc-craft-icon .mc-craft-count {
  position: absolute; right: 1px; bottom: 0; font-size: 11px;
  font-weight: bold; color: #fff; text-shadow: 1px 1px 0 #000; pointer-events: none;
}
.mc-craft-arrow { font-size: 16px; color: #555; flex: 0 0 auto; }
.mc-craft-label { flex: 1 1 auto; font-size: 12px; line-height: 1.4; }
.mc-craft-label strong { font-size: 13px; }
.mc-craft-btn {
  flex: 0 0 auto; background: #2a5a3a; border: 2px solid #3a7a4a; color: #fff;
  font-family: 'Courier New', monospace; font-size: 12px; font-weight: bold;
  padding: 5px 10px; cursor: pointer; -webkit-tap-highlight-color: transparent;
}
.mc-craft-btn:hover { background: #3a7a4a; }
.mc-craft-btn:disabled { background: #555; border-color: #666; cursor: default; opacity: 0.6; }
.mc-craft-row.crafted {
  background: #cdeccd; border-color: #8fe08f #2a5a2a #2a5a2a #8fe08f;
  animation: mc-craft-pop 0.6s ease-out;
}
@keyframes mc-craft-pop {
  0% { box-shadow: 0 0 0 0 rgba(70,190,70,0.85); }
  100% { box-shadow: 0 0 0 12px rgba(70,190,70,0); }
}
.mc-craft-made {
  flex: 0 0 auto; color: #1a6e1a; font-size: 11px; font-weight: bold;
  margin-left: 4px; white-space: nowrap;
}
.mc-craft-icon.crafted-pop { animation: mc-craft-spin 0.5s ease; }
@keyframes mc-craft-spin {
  0% { transform: scale(0.6); }
  60% { transform: scale(1.25); }
  100% { transform: scale(1); }
}
`

export class CraftingPanel {
  private readonly backdrop: HTMLDivElement
  private readonly list: HTMLDivElement
  private _isOpen = false
  /** Output item of the most recent craft, briefly highlighted as feedback. */
  private flashItemId: number | null = null
  private flashTimer: ReturnType<typeof setTimeout> | null = null

  onClose: () => void = () => {}
  onCraft: (name: string, count: number) => void = () => {}

  get isOpen(): boolean { return this._isOpen }

  constructor(
    root: HTMLElement,
    private readonly inventory: Inventory,
    private readonly atlasCanvas: HTMLCanvasElement,
  ) {
    const style = document.createElement('style')
    style.textContent = STYLE
    document.head.appendChild(style)

    this.backdrop = document.createElement('div')
    this.backdrop.className = 'mc-craft-backdrop'
    this.backdrop.style.display = 'none'
    this.backdrop.addEventListener('mousedown', (e) => { if (e.target === this.backdrop) this.close() })
    this.backdrop.addEventListener('touchstart', (e) => {
      if (e.target === this.backdrop) { e.preventDefault(); this.close() }
    }, { passive: false })

    const panel = document.createElement('div')
    panel.className = 'mc-craft-panel'

    const header = document.createElement('div')
    header.className = 'mc-craft-header'
    const title = document.createElement('span')
    title.textContent = '⚒ Crafting'
    const closeBtn = document.createElement('button')
    closeBtn.className = 'mc-craft-close'
    closeBtn.textContent = '✕ Close'
    const doClose = (e: Event) => { e.preventDefault(); this.close() }
    closeBtn.addEventListener('click', doClose)
    closeBtn.addEventListener('touchstart', doClose, { passive: false })
    header.append(title, closeBtn)

    this.list = document.createElement('div')
    this.list.className = 'mc-craft-list'

    panel.append(header, this.list)
    this.backdrop.appendChild(panel)
    root.appendChild(this.backdrop)
  }

  open(): void {
    if (this._isOpen) return
    this._isOpen = true
    this.refresh()
    this.backdrop.style.display = 'flex'
  }

  close(): void {
    if (!this._isOpen) return
    this._isOpen = false
    this.backdrop.style.display = 'none'
    this.onClose()
  }

  toggle(): void {
    if (this._isOpen) this.close()
    else this.open()
  }

  refresh(): void {
    if (!this._isOpen) return
    this.list.innerHTML = ''
    for (const recipe of RECIPES) {
      const canCraft = recipe.inputs.every((inp) => this.inventory.countOf(inp.itemId) >= inp.count)
      this.list.appendChild(this.buildRow(recipe, canCraft))
    }
  }

  private buildRow(recipe: Recipe, canCraft: boolean): HTMLDivElement {
    const justCrafted = this.flashItemId === recipe.output.itemId
    const row = document.createElement('div')
    row.className = 'mc-craft-row' + (canCraft ? '' : ' unavailable') + (justCrafted ? ' crafted' : '')

    // Input icons
    for (const inp of recipe.inputs) {
      row.appendChild(this.makeIcon(inp.itemId, inp.count))
      if (recipe.inputs.indexOf(inp) < recipe.inputs.length - 1) {
        const plus = document.createElement('span')
        plus.style.cssText = 'font-size:14px;color:#555;flex:0 0 auto;'
        plus.textContent = '+'
        row.appendChild(plus)
      }
    }

    const arrow = document.createElement('span')
    arrow.className = 'mc-craft-arrow'
    arrow.textContent = '→'
    row.appendChild(arrow)

    // Output icon
    const outIcon = this.makeIcon(recipe.output.itemId, recipe.output.count)
    if (justCrafted) outIcon.classList.add('crafted-pop')
    row.appendChild(outIcon)

    // Label
    const label = document.createElement('div')
    label.className = 'mc-craft-label'
    const outputName = itemDef(recipe.output.itemId)?.name ?? ''
    label.innerHTML = `<strong>${outputName}</strong><br>×${recipe.output.count}`
    row.appendChild(label)

    // Brief "Crafted!" confirmation shown in place of the button after a craft.
    if (justCrafted) {
      const made = document.createElement('span')
      made.className = 'mc-craft-made'
      made.textContent = '✓ Crafted!'
      row.appendChild(made)
    }

    // Craft button
    const btn = document.createElement('button')
    btn.className = 'mc-craft-btn'
    btn.textContent = 'Craft'
    if (!canCraft) btn.disabled = true
    btn.addEventListener('click', () => this.doCraft(recipe))
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); this.doCraft(recipe) }, { passive: false })
    row.appendChild(btn)

    return row
  }

  private makeIcon(itemId: number, count: number): HTMLDivElement {
    const wrap = document.createElement('div')
    wrap.className = 'mc-craft-icon'
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    drawItemIcon(canvas, itemId, this.atlasCanvas)
    wrap.appendChild(canvas)
    if (count > 1) {
      const cnt = document.createElement('span')
      cnt.className = 'mc-craft-count'
      cnt.textContent = String(count)
      wrap.appendChild(cnt)
    }
    return wrap
  }

  private doCraft(recipe: Recipe): void {
    const canCraft = recipe.inputs.every((inp) => this.inventory.countOf(inp.itemId) >= inp.count)
    if (!canCraft) return
    // Consume inputs
    for (const inp of recipe.inputs) {
      let remaining = inp.count
      for (let i = 0; i < this.inventory.slots.length && remaining > 0; i++) {
        const slot = this.inventory.slots[i]
        if (slot && slot.itemId === inp.itemId) {
          const take = Math.min(slot.count, remaining)
          this.inventory.removeFrom(i, take)
          remaining -= take
        }
      }
    }
    // Add output
    this.inventory.add(recipe.output.itemId, recipe.output.count)
    this.onCraft(itemDef(recipe.output.itemId)?.name ?? 'item', recipe.output.count)
    // Flash the crafted recipe as visual confirmation, then clear it.
    this.flashItemId = recipe.output.itemId
    if (this.flashTimer) clearTimeout(this.flashTimer)
    this.flashTimer = setTimeout(() => {
      this.flashItemId = null
      this.flashTimer = null
      this.refresh()
    }, 1100)
    this.refresh()
  }
}
