import type { Inventory } from '../items/inventory'
import { itemDef } from '../items/items'
import { itemSource, RECIPES, type Recipe } from '../items/crafting'
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
  font-size: var(--mc-fs-md, 16px); font-weight: bold;
}
.mc-craft-close {
  background: #888; border: none; border-radius: 4px; color: #fff;
  font-size: var(--mc-fs-sm, 14px); font-weight: bold; padding: 3px 10px; cursor: pointer;
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
  position: absolute; right: 1px; bottom: 0; font-size: var(--mc-fs-xs, 12.5px);
  font-weight: bold; color: #fff; text-shadow: 1px 1px 0 #000; pointer-events: none;
}
.mc-craft-arrow { font-size: var(--mc-fs-md, 16px); color: #555; flex: 0 0 auto; }
.mc-craft-label { flex: 1 1 auto; font-size: var(--mc-fs-xs, 12.5px); line-height: 1.4; }
.mc-craft-label strong { font-size: var(--mc-fs-sm, 14px); }
.mc-craft-btn {
  flex: 0 0 auto; background: #2a5a3a; border: 2px solid #3a7a4a; color: #fff;
  font-family: 'Courier New', monospace; font-size: var(--mc-fs-xs, 12.5px); font-weight: bold;
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
  flex: 0 0 auto; color: #1a6e1a; font-size: var(--mc-fs-xs, 12.5px); font-weight: bold;
  margin-left: 4px; white-space: nowrap;
}
.mc-craft-icon.crafted-pop { animation: mc-craft-spin 0.5s ease; }
@keyframes mc-craft-spin {
  0% { transform: scale(0.6); }
  60% { transform: scale(1.25); }
  100% { transform: scale(1); }
}
.mc-craft-info-btn {
  flex: 0 0 auto; width: 26px; height: 26px; border-radius: 50%;
  background: #8b8b8b; border: 2px solid; border-color: #fff #555 #555 #fff;
  color: #333; font-family: Georgia, 'Times New Roman', serif; font-size: var(--mc-fs-sm, 14px);
  font-weight: bold; font-style: italic; cursor: pointer; padding: 0;
  -webkit-tap-highlight-color: transparent;
}
.mc-craft-info-btn:hover { background: #e7d9a0; }
.mc-craft-detail { display: flex; flex-direction: column; gap: 10px; font-size: var(--mc-fs-xs, 12.5px); }
.mc-craft-detail-head { display: flex; align-items: center; gap: 10px; }
.mc-craft-detail-head .mc-craft-icon { width: 44px; height: 44px; flex: 0 0 44px; }
.mc-craft-detail-head strong { font-size: var(--mc-fs-md, 16px); }
.mc-craft-detail-desc { line-height: 1.5; background: #d7d7d7; border: 2px solid; border-color: #555 #fff #fff #555; padding: 8px; }
.mc-craft-detail h4 { margin: 4px 0 0; font-size: var(--mc-fs-xs, 12.5px); border-bottom: 1px solid #999; padding-bottom: 2px; }
.mc-craft-need-row { display: flex; align-items: center; gap: 8px; padding: 4px 6px; background: #b0b0b0; border: 2px solid; border-color: #fff #555 #555 #fff; }
.mc-craft-need-row .who { flex: 1 1 auto; line-height: 1.35; }
.mc-craft-need-row .have { flex: 0 0 auto; font-weight: bold; white-space: nowrap; }
.mc-craft-need-row .have.ok { color: #1a6e1a; }
.mc-craft-need-row .have.missing { color: #a03020; }
.mc-craft-need-row .src { display: block; font-size: var(--mc-fs-xs, 12.5px); color: #444; }
.mc-craft-back {
  align-self: flex-start; background: #8b8b8b; border: 2px solid; border-color: #fff #555 #555 #fff;
  color: #333; font-family: 'Courier New', monospace; font-size: var(--mc-fs-xs, 12.5px); font-weight: bold;
  padding: 5px 10px; cursor: pointer; -webkit-tap-highlight-color: transparent;
}
.mc-craft-back:hover { background: #a5a5a5; }
`

export class CraftingPanel {
  private readonly backdrop: HTMLDivElement
  private readonly list: HTMLDivElement
  private _isOpen = false
  /** Output item of the most recent craft, briefly highlighted as feedback. */
  private flashItemId: number | null = null
  private flashTimer: ReturnType<typeof setTimeout> | null = null
  /** Recipe whose instruction page is showing instead of the list, if any. */
  private detailRecipe: Recipe | null = null

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
    this.detailRecipe = null
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
    if (this.detailRecipe) {
      this.list.appendChild(this.buildDetail(this.detailRecipe))
      return
    }
    for (const recipe of RECIPES) {
      const canCraft = recipe.inputs.every((inp) => this.inventory.countOf(inp.itemId) >= inp.count)
      this.list.appendChild(this.buildRow(recipe, canCraft))
    }
  }

  /** Full instruction page for one recipe: what it does, the exact item
   *  combination needed, how much of each you have, and where to find them. */
  private buildDetail(recipe: Recipe): HTMLDivElement {
    const detail = document.createElement('div')
    detail.className = 'mc-craft-detail'

    const back = document.createElement('button')
    back.className = 'mc-craft-back'
    back.textContent = '← All recipes'
    const goBack = (e: Event) => {
      e.preventDefault()
      this.detailRecipe = null
      this.refresh()
    }
    back.addEventListener('click', goBack)
    back.addEventListener('touchstart', goBack, { passive: false })
    detail.appendChild(back)

    const head = document.createElement('div')
    head.className = 'mc-craft-detail-head'
    head.appendChild(this.makeIcon(recipe.output.itemId, recipe.output.count))
    const name = document.createElement('div')
    name.innerHTML = `<strong>${itemDef(recipe.output.itemId)?.name ?? ''}</strong><br>makes ×${recipe.output.count}`
    head.appendChild(name)
    detail.appendChild(head)

    const desc = document.createElement('div')
    desc.className = 'mc-craft-detail-desc'
    desc.textContent = recipe.desc
    detail.appendChild(desc)

    const needTitle = document.createElement('h4')
    needTitle.textContent = 'You need'
    detail.appendChild(needTitle)
    let canCraft = true
    for (const inp of recipe.inputs) {
      const have = this.inventory.countOf(inp.itemId)
      const enough = have >= inp.count
      if (!enough) canCraft = false
      const row = document.createElement('div')
      row.className = 'mc-craft-need-row'
      row.appendChild(this.makeIcon(inp.itemId, inp.count))
      const who = document.createElement('div')
      who.className = 'who'
      const inpName = document.createElement('strong')
      inpName.textContent = `${inp.count} × ${itemDef(inp.itemId)?.name ?? ''}`
      const src = document.createElement('span')
      src.className = 'src'
      src.textContent = `Find it: ${itemSource(inp.itemId)}`
      who.append(inpName, src)
      row.appendChild(who)
      const have$ = document.createElement('div')
      have$.className = 'have ' + (enough ? 'ok' : 'missing')
      have$.textContent = enough ? `✓ have ${have}` : `have ${have}/${inp.count}`
      row.appendChild(have$)
      detail.appendChild(row)
    }

    const btn = document.createElement('button')
    btn.className = 'mc-craft-btn'
    btn.textContent = canCraft ? 'Craft it!' : 'Missing items'
    btn.disabled = !canCraft
    const craft = (e: Event) => { e.preventDefault(); this.doCraft(recipe) }
    btn.addEventListener('click', craft)
    btn.addEventListener('touchstart', craft, { passive: false })
    detail.appendChild(btn)
    return detail
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
        plus.style.cssText = 'font-size:var(--mc-fs-sm, 14px);color:#555;flex:0 0 auto;'
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

    // Instructions button — opens the recipe's detail page.
    const info = document.createElement('button')
    info.className = 'mc-craft-info-btn'
    info.textContent = 'i'
    info.title = `How to craft ${outputName}`
    const openDetail = (e: Event) => {
      e.preventDefault()
      this.detailRecipe = recipe
      this.refresh()
    }
    info.addEventListener('click', openDetail)
    info.addEventListener('touchstart', openDetail, { passive: false })
    row.appendChild(info)

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
