import type { Inventory } from '../items/inventory'
import { ItemId } from '../items/items'
import {
  rotatingStock,
  sellableLots,
  sellItems,
  spendCurrency,
  type SellLot,
  type StockEntry,
} from '../items/trading'
import { drawItemIcon } from './icons'
import { revealPane } from './theme'

const STYLE = `
.mc-mkt-overlay {
  position: absolute; inset: 0; z-index: 20;
  display: none; align-items: center; justify-content: center; padding: 14px;
}
.mc-mkt-box {
  width: 440px; max-width: 100%; max-height: 88vh;
  display: flex; flex-direction: column; overflow: hidden;
}
.mc-mkt-hdr {
  flex: 0 0 auto; padding: 14px 18px;
  border-bottom: 1px solid var(--mc-stroke, rgba(255,255,255,0.12));
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  font-size: var(--mc-fs-md, 16px); font-weight: 600; letter-spacing: 0.3px;
}
.mc-mkt-tabs {
  flex: 0 0 auto; display: flex; gap: 4px; padding: 10px 14px 0;
}
.mc-mkt-tab {
  flex: 1; padding: 9px 0; text-align: center; cursor: pointer;
  font-family: var(--mc-font, sans-serif); font-size: var(--mc-fs-sm, 16px); font-weight: 600;
  color: var(--mc-text-dim, #ccc); background: transparent;
  border: 1px solid transparent; border-radius: var(--mc-radius-sm, 10px);
  transition: background 0.16s var(--mc-ease, ease), color 0.16s var(--mc-ease, ease);
  -webkit-tap-highlight-color: transparent;
}
.mc-mkt-tab:hover { background: var(--mc-raised, rgba(255,255,255,0.06)); color: var(--mc-text, #fff); }
.mc-mkt-tab.active {
  background: var(--mc-accent-soft, rgba(124,215,255,0.16));
  border-color: var(--mc-accent-line, rgba(124,215,255,0.55)); color: #dcf3ff;
}
.mc-mkt-gold-bar {
  flex: 0 0 auto; margin: 10px 14px 0; padding: 8px 13px;
  background: var(--mc-warn-soft, rgba(255,204,92,0.18));
  border: 1px solid rgba(255,204,92,0.35); border-radius: var(--mc-radius-sm, 10px);
  color: var(--mc-gold, #ffd77a); font-size: var(--mc-fs-sm, 16px); font-weight: 600;
}
.mc-mkt-refresh {
  font-size: var(--mc-fs-2xs, 14px); color: var(--mc-text-faint, #888);
  font-weight: 400; margin-left: var(--mc-gap-badge, 8px);
}
.mc-mkt-list { flex: 1 1 auto; overflow-y: auto; padding: 10px 14px 14px; display: flex; flex-direction: column; gap: 5px; }
.mc-mkt-row {
  display: flex; align-items: center; gap: 10px; padding: 8px 11px; cursor: pointer;
  background: var(--mc-raised, rgba(255,255,255,0.06));
  border: 1px solid var(--mc-stroke, rgba(255,255,255,0.12));
  border-radius: var(--mc-radius-sm, 10px);
  transition: background 0.16s var(--mc-ease, ease), border-color 0.16s var(--mc-ease, ease);
}
.mc-mkt-row:hover { background: var(--mc-raised-hover, rgba(255,255,255,0.12)); border-color: var(--mc-stroke-strong, rgba(255,255,255,0.26)); }
.mc-mkt-row.cant-afford { opacity: 0.5; }
.mc-mkt-row.sold-out { opacity: 0.34; cursor: default; }
.mc-mkt-icon {
  width: 34px; height: 34px; flex: 0 0 34px;
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--mc-stroke, rgba(255,255,255,0.12));
  border-radius: var(--mc-radius-xs, 6px);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.07);
}
.mc-mkt-icon canvas { width: 100%; height: 100%; image-rendering: pixelated; padding: 2px; }
.mc-mkt-iname { flex: 1; font-size: var(--mc-fs-xs, 14px); font-weight: 600; color: var(--mc-text, #fff); }
.mc-mkt-isub {
  display: block; font-size: var(--mc-fs-2xs, 14px); font-weight: 400;
  color: var(--mc-text-faint, #888); margin-top: 2px;
}
.mc-mkt-iprice {
  font-size: var(--mc-fs-xs, 14px); font-weight: 700; color: var(--mc-gold, #ffd77a);
  white-space: nowrap; text-align: right; font-family: var(--mc-font-mono, monospace);
}
.mc-mkt-empty {
  padding: 26px 16px; text-align: center; font-size: var(--mc-fs-xs, 14px);
  color: var(--mc-text-faint, #888); line-height: 1.7;
}
.mc-mkt-detail { flex: 1 1 auto; overflow-y: auto; padding: 16px 18px; display: flex; flex-direction: column; gap: 12px; }
.mc-mkt-detail-icon {
  width: 54px; height: 54px; flex: 0 0 54px;
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--mc-stroke, rgba(255,255,255,0.12));
  border-radius: var(--mc-radius-sm, 10px);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.07);
}
.mc-mkt-detail-icon canvas { width: 100%; height: 100%; image-rendering: pixelated; padding: 3px; }
.mc-mkt-detail-title { font-size: var(--mc-fs-md, 16px); font-weight: 600; color: var(--mc-text, #fff); }
.mc-mkt-detail-desc { font-size: var(--mc-fs-xs, 14px); color: var(--mc-text-dim, #ccc); line-height: 1.6; margin: 0; }
.mc-mkt-info-box {
  background: var(--mc-raised, rgba(255,255,255,0.06));
  border: 1px solid var(--mc-stroke, rgba(255,255,255,0.12));
  border-radius: var(--mc-radius-sm, 10px);
  padding: 11px 13px; font-size: var(--mc-fs-xs, 14px); line-height: 1.8;
  color: var(--mc-text-dim, #ccc);
}
.mc-mkt-qty {
  display: flex; align-items: center; gap: 10px;
  font-size: var(--mc-fs-sm, 16px); font-weight: 600; color: var(--mc-text, #fff);
}
.mc-mkt-step {
  width: 34px; height: 32px; font-size: var(--mc-fs-md, 16px); font-weight: 600; line-height: 1;
  cursor: pointer; color: var(--mc-text, #fff);
  background: var(--mc-raised, rgba(255,255,255,0.06));
  border: 1px solid var(--mc-stroke, rgba(255,255,255,0.12));
  border-radius: var(--mc-radius-sm, 10px);
  font-family: var(--mc-font, sans-serif); -webkit-tap-highlight-color: transparent;
  transition: background 0.16s var(--mc-ease, ease);
}
.mc-mkt-step:hover:not(:disabled) { background: var(--mc-raised-hover, rgba(255,255,255,0.12)); }
.mc-mkt-step:disabled { opacity: 0.35; cursor: default; }
.mc-mkt-qty-val { min-width: 48px; text-align: center; font-family: var(--mc-font-mono, monospace); }
.mc-mkt-btn {
  background: var(--mc-raised, rgba(255,255,255,0.06));
  border: 1px solid var(--mc-stroke, rgba(255,255,255,0.12));
  color: var(--mc-text, #fff); font-family: var(--mc-font, sans-serif);
  font-size: var(--mc-fs-xs, 14px); font-weight: 500;
  border-radius: var(--mc-radius-sm, 10px);
  padding: 7px 14px; cursor: pointer; width: fit-content; -webkit-tap-highlight-color: transparent;
  transition: background 0.16s var(--mc-ease, ease), border-color 0.16s var(--mc-ease, ease);
}
.mc-mkt-btn:hover { background: var(--mc-raised-hover, rgba(255,255,255,0.12)); border-color: var(--mc-stroke-strong, rgba(255,255,255,0.26)); }
.mc-mkt-trade-btn {
  background: var(--mc-good-soft, rgba(99,221,151,0.18));
  border: 1px solid rgba(99,221,151,0.5); color: #d8ffe8;
  font-family: var(--mc-font, sans-serif); font-size: var(--mc-fs-sm, 16px); font-weight: 600;
  border-radius: var(--mc-radius-sm, 10px);
  padding: 11px 24px; cursor: pointer; -webkit-tap-highlight-color: transparent;
  align-self: flex-start; margin-top: auto;
  transition: background 0.16s var(--mc-ease, ease), border-color 0.16s var(--mc-ease, ease);
}
.mc-mkt-trade-btn:hover:not(:disabled) { background: rgba(99,221,151,0.32); border-color: var(--mc-good, #63dd97); }
.mc-mkt-trade-btn:disabled {
  background: transparent; border-color: var(--mc-stroke, rgba(255,255,255,0.12));
  color: var(--mc-text-faint, #888); cursor: default;
}
.mc-mkt-sell-btn {
  background: var(--mc-warn-soft, rgba(255,204,92,0.18));
  border-color: rgba(255,204,92,0.5); color: #ffeec2;
}
.mc-mkt-sell-btn:hover:not(:disabled) { background: rgba(255,204,92,0.32); border-color: var(--mc-warn, #ffcc5c); }
`

type Tab = 'buy' | 'sell'

export class MarketPanel {
  private readonly overlay: HTMLDivElement
  private readonly box: HTMLDivElement
  private readonly tabsEl: HTMLDivElement
  private readonly goldBar: HTMLDivElement
  private readonly listEl: HTMLDivElement
  private readonly detailEl: HTMLDivElement
  private _isOpen = false
  private tab: Tab = 'buy'
  private items: StockEntry[] = []
  /** Units left in this rotation, keyed by item id. */
  private stockLeft = new Map<number, number>()
  /** Identifies the rotation the stock counts belong to ("seed:hour"). */
  private stockKey = ''
  private worldSeed = 0

  onClose: () => void = () => {}
  onTrade: (name: string, count: number) => void = () => {}
  onSell: (name: string, count: number, gold: number) => void = () => {}

  get isOpen(): boolean { return this._isOpen }

  constructor(
    root: HTMLElement,
    private readonly inventory: Inventory,
    private readonly atlasCanvas: HTMLCanvasElement,
  ) {
    const style = document.createElement('style')
    style.textContent = STYLE
    document.head.appendChild(style)

    this.overlay = document.createElement('div')
    this.overlay.className = 'mc-mkt-overlay mc-scrim'
    this.overlay.addEventListener('mousedown', (e) => { if (e.target === this.overlay) this.close() })

    const box = document.createElement('div')
    box.className = 'mc-mkt-box mc-glass mc-pane-in'
    this.box = box

    const hdr = document.createElement('div')
    hdr.className = 'mc-mkt-hdr'
    const title = document.createElement('span')
    title.textContent = '🏪 Market'
    const closeBtn = document.createElement('button')
    closeBtn.className = 'mc-close-btn'
    closeBtn.textContent = '✕'
    closeBtn.title = 'Close (Esc)'
    closeBtn.addEventListener('click', () => this.close())
    hdr.append(title, closeBtn)

    this.tabsEl = document.createElement('div')
    this.tabsEl.className = 'mc-mkt-tabs'
    for (const [tab, label] of [['buy', '🛒 Buy'], ['sell', '💰 Sell']] as const) {
      const btn = document.createElement('button')
      btn.className = 'mc-mkt-tab'
      btn.dataset.tab = tab
      btn.textContent = label
      btn.addEventListener('click', () => this.showTab(tab))
      this.tabsEl.appendChild(btn)
    }

    this.goldBar = document.createElement('div')
    this.goldBar.className = 'mc-mkt-gold-bar'

    this.listEl = document.createElement('div')
    this.listEl.className = 'mc-mkt-list'

    this.detailEl = document.createElement('div')
    this.detailEl.className = 'mc-mkt-detail'
    this.detailEl.style.display = 'none'

    box.append(hdr, this.tabsEl, this.goldBar, this.listEl, this.detailEl)
    this.overlay.appendChild(box)
    root.appendChild(this.overlay)
  }

  open(worldSeed: number): void {
    this.worldSeed = worldSeed
    this._isOpen = true
    this.overlay.style.display = 'flex'
    revealPane(this.box)
    this.refreshItems()
    this.showTab('buy')
  }

  close(): void {
    if (!this._isOpen) return
    this._isOpen = false
    this.overlay.style.display = 'none'
    this.onClose()
  }

  private showTab(tab: Tab): void {
    this.tab = tab
    for (const btn of this.tabsEl.children) {
      btn.classList.toggle('active', (btn as HTMLElement).dataset.tab === tab)
    }
    this.detailEl.style.display = 'none'
    this.listEl.style.display = ''
    this.renderList()
  }

  private goldCount(): number {
    return this.inventory.countOf(ItemId.Gold)
  }

  private diamondCount(): number {
    return this.inventory.countOf(ItemId.Diamond)
  }

  /** How much of an entry's currency the player holds. */
  private fundsFor(entry: StockEntry): number {
    return entry.currency === 'diamond' ? this.diamondCount() : this.goldCount()
  }

  private stockOf(entry: StockEntry): number {
    return this.stockLeft.get(entry.itemId) ?? entry.qty
  }

  /** Rebuild the shelf when the hourly rotation (or the world) changes. */
  private refreshItems(): void {
    const hour = Math.floor(Date.now() / 3600000)
    const key = `${this.worldSeed}:${hour}`
    this.items = rotatingStock(this.worldSeed, hour)
    if (key === this.stockKey) return
    this.stockKey = key
    this.stockLeft = new Map(this.items.map((e) => [e.itemId, e.qty]))
  }

  private renderGoldBar(withTimer: boolean): void {
    const minsLeft = 60 - (Math.floor(Date.now() / 60000) % 60)
    this.goldBar.innerHTML =
      `🥇 Gold: <strong>${this.goldCount()}</strong> · 💎 Diamonds: <strong>${this.diamondCount()}</strong>` +
      (withTimer ? `<span class="mc-mkt-refresh"> — stock refreshes in ${minsLeft}m</span>` : '')
  }

  private renderList(): void {
    this.renderGoldBar(this.tab === 'buy')
    this.listEl.innerHTML = ''
    if (this.tab === 'buy') this.renderBuyList()
    else this.renderSellList()
  }

  private row(itemId: number, name: string, sub: string, price: string): HTMLDivElement {
    const row = document.createElement('div')
    row.className = 'mc-mkt-row'

    const icon = document.createElement('div')
    icon.className = 'mc-mkt-icon'
    const iconCanvas = document.createElement('canvas')
    iconCanvas.width = 32
    iconCanvas.height = 32
    drawItemIcon(iconCanvas, itemId, this.atlasCanvas)
    icon.appendChild(iconCanvas)

    const nameEl = document.createElement('span')
    nameEl.className = 'mc-mkt-iname'
    nameEl.innerHTML = `${name}<span class="mc-mkt-isub">${sub}</span>`

    const priceEl = document.createElement('span')
    priceEl.className = 'mc-mkt-iprice'
    priceEl.innerHTML = price

    row.append(icon, nameEl, priceEl)
    return row
  }

  private renderBuyList(): void {
    for (const entry of this.items) {
      const left = this.stockOf(entry)
      const icon = entry.currency === 'diamond' ? '💎' : '🥇'
      const row = this.row(
        entry.itemId,
        entry.name,
        left > 0 ? `${left} in stock` : 'sold out',
        `${entry.price} ${icon}`,
      )
      if (left <= 0) row.classList.add('sold-out')
      else if (this.fundsFor(entry) < entry.price) row.classList.add('cant-afford')
      if (left > 0) row.addEventListener('click', () => this.showBuyDetail(entry))
      this.listEl.appendChild(row)
    }
  }

  private renderSellList(): void {
    const lots = sellableLots(this.inventory)
    if (lots.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'mc-mkt-empty'
      empty.innerHTML =
        'Your bags hold nothing the trader wants.<br>Mine, farm or craft something and come back — ' +
        'they buy blocks, food, tools, gems and captured animals.'
      this.listEl.appendChild(empty)
      return
    }
    for (const lot of lots) {
      const row = this.row(
        lot.itemId,
        lot.name,
        `you have ${lot.count}`,
        `+${lot.unit} 🥇 <span class="mc-mkt-isub">each</span>`,
      )
      row.addEventListener('click', () => this.showSellDetail(lot))
      this.listEl.appendChild(row)
    }
  }

  /** Shared detail scaffold: back button, big icon, title and description. */
  private beginDetail(itemId: number, title: string, desc: string): void {
    this.listEl.style.display = 'none'
    this.detailEl.style.display = 'flex'
    this.detailEl.innerHTML = ''

    const back = document.createElement('button')
    back.className = 'mc-mkt-btn'
    back.textContent = '← Back'
    back.addEventListener('click', () => this.showTab(this.tab))

    const iconRow = document.createElement('div')
    iconRow.style.cssText = 'display:flex;align-items:center;gap:12px;'
    const icon = document.createElement('div')
    icon.className = 'mc-mkt-detail-icon'
    const iconCanvas = document.createElement('canvas')
    iconCanvas.width = 32
    iconCanvas.height = 32
    drawItemIcon(iconCanvas, itemId, this.atlasCanvas)
    icon.appendChild(iconCanvas)
    const titleEl = document.createElement('div')
    titleEl.className = 'mc-mkt-detail-title'
    titleEl.textContent = title
    iconRow.append(icon, titleEl)

    const descEl = document.createElement('p')
    descEl.className = 'mc-mkt-detail-desc'
    descEl.textContent = desc

    this.detailEl.append(back, iconRow, descEl)
  }

  /**
   * A −/+ stepper bound to [1, max]. Returns a live getter for the amount;
   * onChange fires whenever the value moves so totals can follow.
   */
  private stepper(max: number, onChange: (n: number) => void): { el: HTMLDivElement; get: () => number } {
    let value = Math.min(1, max)
    const el = document.createElement('div')
    el.className = 'mc-mkt-qty'
    const minus = document.createElement('button')
    minus.className = 'mc-mkt-step'
    minus.textContent = '−'
    const val = document.createElement('span')
    val.className = 'mc-mkt-qty-val'
    const plus = document.createElement('button')
    plus.className = 'mc-mkt-step'
    plus.textContent = '+'
    const allBtn = document.createElement('button')
    allBtn.className = 'mc-mkt-btn'
    allBtn.textContent = 'Max'

    const sync = () => {
      value = Math.max(1, Math.min(max, value))
      val.textContent = `×${value}`
      minus.disabled = value <= 1
      plus.disabled = value >= max
      allBtn.disabled = max <= 1
      onChange(value)
    }
    minus.addEventListener('click', () => { value -= 1; sync() })
    plus.addEventListener('click', () => { value += 1; sync() })
    allBtn.addEventListener('click', () => { value = max; sync() })
    el.append(minus, val, plus, allBtn)
    sync()
    return { el, get: () => value }
  }

  private showBuyDetail(entry: StockEntry): void {
    const left = this.stockOf(entry)
    if (left <= 0) return this.showTab('buy')
    this.beginDetail(entry.itemId, entry.name, entry.desc)

    const funds = this.fundsFor(entry)
    const currencyName = entry.currency === 'diamond' ? 'Diamonds' : 'Gold'
    const currencyIcon = entry.currency === 'diamond' ? '💎' : '🥇'
    const affordable = Math.floor(funds / entry.price)
    const max = Math.max(1, Math.min(left, affordable))
    this.renderGoldBar(false)

    const info = document.createElement('div')
    info.className = 'mc-mkt-info-box'
    const tradeBtn = document.createElement('button')
    tradeBtn.className = 'mc-mkt-trade-btn'

    const update = (n: number) => {
      const total = entry.price * n
      const canAfford = funds >= total
      info.innerHTML =
        `Unit price: <strong>${entry.price} ${currencyIcon}</strong><br>` +
        `In stock: <strong>×${left}</strong><br>` +
        `Your ${currencyName.toLowerCase()}: <strong style="color:${canAfford ? '#2a6a3a' : '#882222'}">${funds}</strong>`
      tradeBtn.textContent = `Buy ×${n}  (${total} ${currencyIcon})`
      tradeBtn.disabled = !canAfford || n > left
    }
    const qty = this.stepper(affordable === 0 ? 1 : max, update)

    tradeBtn.addEventListener('click', () => {
      const n = qty.get()
      const currencyItem = entry.currency === 'diamond' ? ItemId.Diamond : ItemId.Gold
      if (n > this.stockOf(entry)) return
      if (!spendCurrency(this.inventory, currencyItem, entry.price * n)) return
      this.inventory.add(entry.itemId, n)
      this.stockLeft.set(entry.itemId, this.stockOf(entry) - n)
      this.onTrade(entry.name, n)
      // Re-open the detail so stock, funds and limits all reflect the purchase.
      if (this.stockOf(entry) > 0) this.showBuyDetail(entry)
      else this.showTab('buy')
    })

    this.detailEl.append(qty.el, info, tradeBtn)
    update(qty.get())
  }

  private showSellDetail(lot: SellLot): void {
    const held = this.inventory.countOf(lot.itemId)
    if (held <= 0) return this.showTab('sell')
    this.beginDetail(
      lot.itemId,
      lot.name,
      `The trader pays ${lot.unit} gold apiece for these. Sold goods leave your bags immediately.`,
    )
    this.renderGoldBar(false)

    const info = document.createElement('div')
    info.className = 'mc-mkt-info-box'
    const sellBtn = document.createElement('button')
    sellBtn.className = 'mc-mkt-trade-btn mc-mkt-sell-btn'

    const update = (n: number) => {
      info.innerHTML =
        `They pay: <strong>${lot.unit} 🥇</strong> each<br>` +
        `You carry: <strong>×${held}</strong><br>` +
        `You receive: <strong style="color:#2a6a3a">${lot.unit * n} 🥇</strong>`
      sellBtn.textContent = `Sell ×${n}  (+${lot.unit * n} 🥇)`
      sellBtn.disabled = n > held
    }
    const qty = this.stepper(held, update)

    sellBtn.addEventListener('click', () => {
      const n = qty.get()
      const earned = sellItems(this.inventory, lot.itemId, n)
      if (earned === 0) return
      this.onSell(lot.name, n, earned)
      if (this.inventory.countOf(lot.itemId) > 0) this.showSellDetail({ ...lot, count: this.inventory.countOf(lot.itemId) })
      else this.showTab('sell')
    })

    this.detailEl.append(qty.el, info, sellBtn)
    update(qty.get())
  }
}
