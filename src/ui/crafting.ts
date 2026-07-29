import type { Inventory } from '../items/inventory'
import { itemDef } from '../items/items'
import { itemSource, RECIPES, type Recipe } from '../items/crafting'
import { drawItemIcon } from './icons'
import { revealPane } from './theme'

const STYLE = `
.mc-craft-backdrop {
  position: absolute; inset: 0; z-index: 10;
  display: flex; align-items: center; justify-content: center; padding: 16px;
}
.mc-craft-panel {
  max-height: 85vh; max-width: 95vw; width: 460px;
  display: flex; flex-direction: column; overflow: hidden;
}
.mc-craft-header {
  flex: 0 0 auto; padding: 14px 18px;
  border-bottom: 1px solid var(--mc-stroke, rgba(255,255,255,0.12));
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  font-size: var(--mc-fs-md, 16px); font-weight: 600; letter-spacing: 0.3px;
}
.mc-craft-list {
  flex: 1 1 auto; overflow-y: auto; padding: 12px;
  display: flex; flex-direction: column; gap: 6px;
}
.mc-craft-row {
  display: flex; align-items: center; gap: 10px; padding: 9px 11px;
  background: var(--mc-raised, rgba(255,255,255,0.06));
  border: 1px solid var(--mc-stroke, rgba(255,255,255,0.12));
  border-radius: var(--mc-radius-sm, 10px);
  transition: background 0.16s var(--mc-ease, ease), border-color 0.16s var(--mc-ease, ease);
}
.mc-craft-row:hover { background: var(--mc-raised-hover, rgba(255,255,255,0.12)); }
.mc-craft-row.unavailable { opacity: 0.45; }
.mc-craft-icon {
  position: relative; width: 38px; height: 38px; flex: 0 0 38px;
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--mc-stroke, rgba(255,255,255,0.12));
  border-radius: var(--mc-radius-xs, 6px);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.07);
  image-rendering: pixelated;
}
.mc-craft-icon canvas { width: 100%; height: 100%; image-rendering: pixelated; padding: 2px; }
.mc-craft-icon .mc-craft-count {
  position: absolute; right: 2px; bottom: 0; font-size: var(--mc-fs-2xs, 11px);
  font-family: var(--mc-font-mono, monospace); font-weight: 700; color: #fff;
  text-shadow: 0 1px 3px rgba(0,0,0,0.9); pointer-events: none;
}
.mc-craft-arrow { font-size: var(--mc-fs-sm, 14px); color: var(--mc-text-faint, #888); flex: 0 0 auto; }
.mc-craft-label {
  flex: 1 1 auto; font-size: var(--mc-fs-xs, 12.5px); line-height: 1.45;
  color: var(--mc-text-dim, #ccc);
}
.mc-craft-label strong { font-size: var(--mc-fs-sm, 14px); color: var(--mc-text, #fff); font-weight: 600; }
.mc-craft-btn {
  flex: 0 0 auto;
  background: var(--mc-good-soft, rgba(99,221,151,0.18));
  border: 1px solid rgba(99,221,151,0.5); color: #d8ffe8;
  font-family: var(--mc-font, sans-serif); font-size: var(--mc-fs-xs, 12.5px); font-weight: 600;
  border-radius: var(--mc-radius-sm, 10px);
  padding: 7px 14px; cursor: pointer; -webkit-tap-highlight-color: transparent;
  transition: background 0.16s var(--mc-ease, ease), border-color 0.16s var(--mc-ease, ease);
}
.mc-craft-btn:hover:not(:disabled) { background: rgba(99,221,151,0.32); border-color: var(--mc-good, #63dd97); }
.mc-craft-btn:disabled {
  background: transparent; border-color: var(--mc-stroke, rgba(255,255,255,0.12));
  color: var(--mc-text-faint, #888); cursor: default;
}
.mc-craft-row.crafted {
  background: var(--mc-good-soft, rgba(99,221,151,0.18));
  border-color: var(--mc-good, #63dd97);
  animation: mc-craft-pop 0.6s ease-out;
}
@keyframes mc-craft-pop {
  0% { box-shadow: 0 0 0 0 rgba(99,221,151,0.6); }
  100% { box-shadow: 0 0 0 14px rgba(99,221,151,0); }
}
.mc-craft-made {
  flex: 0 0 auto; color: var(--mc-good, #63dd97); font-size: var(--mc-fs-xs, 12.5px); font-weight: 700;
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
  background: transparent; border: 1px solid var(--mc-stroke, rgba(255,255,255,0.12));
  color: var(--mc-text-dim, #ccc); font-family: Georgia, 'Times New Roman', serif;
  font-size: var(--mc-fs-sm, 14px); font-weight: bold; font-style: italic; cursor: pointer; padding: 0;
  transition: background 0.16s var(--mc-ease, ease), color 0.16s var(--mc-ease, ease);
  -webkit-tap-highlight-color: transparent;
}
.mc-craft-info-btn:hover {
  background: var(--mc-accent-soft, rgba(124,215,255,0.16));
  border-color: var(--mc-accent-line, rgba(124,215,255,0.55)); color: #dcf3ff;
}
.mc-craft-detail {
  display: flex; flex-direction: column; gap: 12px; font-size: var(--mc-fs-xs, 12.5px);
  color: var(--mc-text-dim, #ccc);
}
.mc-craft-detail-head { display: flex; align-items: center; gap: 12px; }
.mc-craft-detail-head .mc-craft-icon { width: 46px; height: 46px; flex: 0 0 46px; }
.mc-craft-detail-head strong { font-size: var(--mc-fs-md, 16px); color: var(--mc-text, #fff); }
.mc-craft-detail-desc {
  line-height: 1.6; padding: 11px 13px;
  background: var(--mc-raised, rgba(255,255,255,0.06));
  border: 1px solid var(--mc-stroke, rgba(255,255,255,0.12));
  border-left: 2px solid var(--mc-accent-line, rgba(124,215,255,0.55));
  border-radius: var(--mc-radius-sm, 10px);
}
.mc-craft-detail h4 {
  margin: 6px 0 0; font-size: var(--mc-fs-2xs, 11px); font-weight: 600;
  letter-spacing: 1.1px; text-transform: uppercase; color: var(--mc-text-faint, #888);
}
.mc-craft-need-row {
  display: flex; align-items: center; gap: 10px; padding: 7px 10px;
  background: var(--mc-raised, rgba(255,255,255,0.06));
  border: 1px solid var(--mc-stroke, rgba(255,255,255,0.12));
  border-radius: var(--mc-radius-sm, 10px);
}
.mc-craft-need-row .who { flex: 1 1 auto; line-height: 1.4; color: var(--mc-text, #fff); }
.mc-craft-need-row .have { flex: 0 0 auto; font-weight: 700; white-space: nowrap; }
.mc-craft-need-row .have.ok { color: var(--mc-good, #63dd97); }
.mc-craft-need-row .have.missing { color: var(--mc-bad, #ff8272); }
.mc-craft-need-row .src { display: block; font-size: var(--mc-fs-2xs, 11px); color: var(--mc-text-faint, #888); }
`

export class CraftingPanel {
  private readonly backdrop: HTMLDivElement
  private readonly panel: HTMLDivElement
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
    this.backdrop.className = 'mc-craft-backdrop mc-scrim'
    this.backdrop.style.display = 'none'
    this.backdrop.addEventListener('mousedown', (e) => { if (e.target === this.backdrop) this.close() })
    this.backdrop.addEventListener('touchstart', (e) => {
      if (e.target === this.backdrop) { e.preventDefault(); this.close() }
    }, { passive: false })

    const panel = document.createElement('div')
    panel.className = 'mc-craft-panel mc-glass mc-pane-in'
    this.panel = panel

    const header = document.createElement('div')
    header.className = 'mc-craft-header'
    const title = document.createElement('span')
    title.textContent = '⚒ Crafting'
    const closeBtn = document.createElement('button')
    closeBtn.className = 'mc-craft-close mc-close-btn'
    closeBtn.textContent = '✕'
    closeBtn.title = 'Close (Esc)'
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
    revealPane(this.panel)
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
    back.className = 'mc-craft-back mc-ui-btn ghost'
    back.style.alignSelf = 'flex-start'
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
