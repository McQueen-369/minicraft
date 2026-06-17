import { mulberry32 } from '../core/rng'
import type { Inventory } from '../items/inventory'
import { ItemId } from '../items/items'
import { drawItemIcon } from './icons'

const MARKET_SEED = 0xf4a921
const MARKET_COUNT = 8

interface MarketEntry {
  itemId: number
  name: string
  desc: string
  price: number
  qty: number
}

const POOL: MarketEntry[] = [
  { itemId: ItemId.Stone, name: 'Stone', desc: 'Sturdy building material. Mine from hills.', price: 5, qty: 10 },
  { itemId: ItemId.Wood, name: 'Wood', desc: 'Cut trees to get more. Crafts into planks.', price: 8, qty: 5 },
  { itemId: ItemId.Sand, name: 'Sand', desc: 'Found near water shores and rivers.', price: 3, qty: 15 },
  { itemId: ItemId.Brick, name: 'Brick', desc: 'Durable construction block for walls.', price: 12, qty: 8 },
  { itemId: ItemId.Plank, name: 'Plank', desc: 'Versatile wood material. Craft from wood.', price: 10, qty: 8 },
  { itemId: ItemId.Glass, name: 'Glass', desc: 'Lets light through walls. Craft from sand.', price: 15, qty: 6 },
  { itemId: ItemId.Apple, name: 'Apple', desc: 'Tames pigs when fed. Fall from leaf trees.', price: 5, qty: 10 },
  { itemId: ItemId.Fish, name: 'Fish', desc: 'Tames cats when fed. Catch with a net.', price: 8, qty: 8 },
  { itemId: ItemId.Wheat, name: 'Wheat', desc: 'Tames sheep and horses when fed.', price: 6, qty: 10 },
  { itemId: ItemId.Carrot, name: 'Carrot', desc: 'Tames rabbits when fed.', price: 6, qty: 10 },
  { itemId: ItemId.Seeds, name: 'Seeds', desc: 'Tames chickens when fed.', price: 4, qty: 12 },
  { itemId: ItemId.Bone, name: 'Bone', desc: 'Tames dogs when fed. Found by mining leaves.', price: 10, qty: 8 },
  { itemId: ItemId.WoodPickaxe, name: 'Wood Pickaxe', desc: 'Speeds up mining stone blocks 4×.', price: 30, qty: 2 },
  { itemId: ItemId.StonePickaxe, name: 'Stone Pickaxe', desc: 'Fastest stone-mining tool (8×).', price: 60, qty: 1 },
  { itemId: ItemId.Axe, name: 'Axe', desc: 'Chop wood and planks quickly (4×).', price: 40, qty: 1 },
  { itemId: ItemId.Shears, name: 'Shears', desc: 'Harvest leaves quickly (8×).', price: 45, qty: 1 },
  { itemId: ItemId.Net, name: 'Fishing Net', desc: 'Right-click over water to catch fish.', price: 50, qty: 1 },
  { itemId: ItemId.Door, name: 'Door', desc: 'Place at doorways. Right-click to open/close.', price: 25, qty: 3 },
  { itemId: ItemId.Desk, name: 'Desk', desc: 'Decorative home furniture.', price: 35, qty: 2 },
  { itemId: ItemId.Chair, name: 'Chair', desc: 'A seat for your home.', price: 20, qty: 3 },
  { itemId: ItemId.Bed, name: 'Bed', desc: 'Cozy sleeping furniture.', price: 45, qty: 2 },
  { itemId: ItemId.Sofa, name: 'Sofa', desc: 'Comfortable lounge seating.', price: 40, qty: 2 },
  { itemId: ItemId.Window, name: 'Window', desc: 'See through walls in your home.', price: 22, qty: 4 },
  { itemId: ItemId.Chest, name: 'Chest', desc: 'Store up to 27 extra items.', price: 15, qty: 3 },
  { itemId: ItemId.Ladder, name: 'Ladder', desc: 'Climb vertical walls. Place on block faces.', price: 8, qty: 10 },
  { itemId: ItemId.CapturedHorse, name: 'Horse', desc: 'Release and right-click to ride. Fastest travel. Feed wheat to keep tamed.', price: 80, qty: 1 },
]

const STYLE = `
.mc-mkt-overlay {
  position: absolute; inset: 0; background: rgba(0,0,0,0.75); z-index: 20;
  display: none; align-items: center; justify-content: center;
}
.mc-mkt-box {
  background: #c6c6c6; border: 3px solid; border-color: #fff #555 #555 #fff;
  color: #333; font-family: 'Courier New', monospace;
  width: 390px; max-width: 95vw; max-height: 88vh; display: flex; flex-direction: column; overflow: hidden;
}
.mc-mkt-hdr {
  flex: 0 0 auto; padding: 9px 14px; border-bottom: 2px solid #555;
  display: flex; align-items: center; justify-content: space-between; font-size: 15px; font-weight: bold;
}
.mc-mkt-gold-bar {
  flex: 0 0 auto; padding: 5px 14px; background: #7a6520; color: #ffe060;
  border-bottom: 2px solid #555; font-size: 13px; font-weight: bold;
}
.mc-mkt-refresh {
  font-size: 10px; color: #ccc0a0; font-weight: normal; margin-left: 8px;
}
.mc-mkt-list { flex: 1 1 auto; overflow-y: auto; padding: 7px; display: flex; flex-direction: column; gap: 4px; }
.mc-mkt-row {
  display: flex; align-items: center; gap: 8px; padding: 5px 8px; cursor: pointer;
  background: #b0b0b0; border: 2px solid; border-color: #fff #555 #555 #fff;
}
.mc-mkt-row:hover { background: #c2c2c2; }
.mc-mkt-row.cant-afford { opacity: 0.55; }
.mc-mkt-icon {
  width: 32px; height: 32px; flex: 0 0 32px;
  background: #8b8b8b; border: 2px solid; border-color: #555 #fff #fff #555;
}
.mc-mkt-icon canvas { width: 100%; height: 100%; image-rendering: pixelated; }
.mc-mkt-iname { flex: 1; font-size: 12px; font-weight: bold; }
.mc-mkt-iprice { font-size: 11px; font-weight: bold; color: #5a3d00; white-space: nowrap; }
.mc-mkt-detail { flex: 1 1 auto; overflow-y: auto; padding: 12px 15px; display: flex; flex-direction: column; gap: 10px; }
.mc-mkt-detail-icon {
  width: 52px; height: 52px; flex: 0 0 52px;
  background: #8b8b8b; border: 2px solid; border-color: #555 #fff #fff #555;
}
.mc-mkt-detail-icon canvas { width: 100%; height: 100%; image-rendering: pixelated; }
.mc-mkt-detail-title { font-size: 16px; font-weight: bold; }
.mc-mkt-detail-desc { font-size: 12px; color: #555; line-height: 1.5; margin: 0; }
.mc-mkt-info-box {
  background: #b0b0b0; border: 2px solid; border-color: #888 #fff #fff #888;
  padding: 8px 10px; font-size: 12px; line-height: 1.7;
}
.mc-mkt-btn {
  background: #888; border: 2px solid; border-color: #fff #555 #555 #fff;
  color: #333; font-family: 'Courier New', monospace; font-size: 12px;
  padding: 5px 12px; cursor: pointer; width: fit-content; -webkit-tap-highlight-color: transparent;
}
.mc-mkt-btn:hover { background: #aaa; }
.mc-mkt-trade-btn {
  background: #2a5a3a; border: 2px solid; border-color: #3a7a4a #1a3a24 #1a3a24 #3a7a4a;
  color: #fff; font-family: 'Courier New', monospace; font-size: 14px; font-weight: bold;
  padding: 9px 22px; cursor: pointer; -webkit-tap-highlight-color: transparent; align-self: flex-start;
  margin-top: auto;
}
.mc-mkt-trade-btn:hover { background: #3a7a4a; }
.mc-mkt-trade-btn:disabled { background: #555; border-color: #444 #666 #666 #444; cursor: default; opacity: 0.6; }
`

export class MarketPanel {
  private readonly overlay: HTMLDivElement
  private readonly goldBar: HTMLDivElement
  private readonly listEl: HTMLDivElement
  private readonly detailEl: HTMLDivElement
  private _isOpen = false
  private items: MarketEntry[] = []
  private worldSeed = 0

  onClose: () => void = () => {}
  onTrade: (name: string) => void = () => {}

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
    this.overlay.className = 'mc-mkt-overlay'
    this.overlay.addEventListener('mousedown', (e) => { if (e.target === this.overlay) this.close() })

    const box = document.createElement('div')
    box.className = 'mc-mkt-box'

    const hdr = document.createElement('div')
    hdr.className = 'mc-mkt-hdr'
    const title = document.createElement('span')
    title.textContent = '🏪 Market'
    const closeBtn = document.createElement('button')
    closeBtn.className = 'mc-mkt-btn'
    closeBtn.textContent = '✕ Close'
    closeBtn.addEventListener('click', () => this.close())
    hdr.append(title, closeBtn)

    this.goldBar = document.createElement('div')
    this.goldBar.className = 'mc-mkt-gold-bar'

    this.listEl = document.createElement('div')
    this.listEl.className = 'mc-mkt-list'

    this.detailEl = document.createElement('div')
    this.detailEl.className = 'mc-mkt-detail'
    this.detailEl.style.display = 'none'

    box.append(hdr, this.goldBar, this.listEl, this.detailEl)
    this.overlay.appendChild(box)
    root.appendChild(this.overlay)
  }

  open(worldSeed: number): void {
    this.worldSeed = worldSeed
    this._isOpen = true
    this.overlay.style.display = 'flex'
    this.detailEl.style.display = 'none'
    this.listEl.style.display = ''
    this.refreshItems()
    this.renderList()
  }

  close(): void {
    if (!this._isOpen) return
    this._isOpen = false
    this.overlay.style.display = 'none'
    this.onClose()
  }

  private goldCount(): number {
    return this.inventory.countOf(ItemId.Gold)
  }

  private refreshItems(): void {
    const hour = Math.floor(Date.now() / 3600000)
    const rng = mulberry32(this.worldSeed ^ MARKET_SEED ^ hour)
    const arr = [...POOL]
    // Fisher-Yates shuffle seeded by world + hour
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    this.items = arr.slice(0, MARKET_COUNT)
  }

  private renderList(): void {
    const gold = this.goldCount()
    const hour = Math.floor(Date.now() / 3600000)
    const minsLeft = 60 - (Math.floor(Date.now() / 60000) % 60)
    this.goldBar.innerHTML = `⬛ Gold: <strong>${gold}</strong><span class="mc-mkt-refresh"> — refreshes in ${minsLeft}m</span>`
    this.listEl.innerHTML = ''
    for (const entry of this.items) {
      const canAfford = gold >= entry.price
      const row = document.createElement('div')
      row.className = 'mc-mkt-row' + (canAfford ? '' : ' cant-afford')

      const icon = document.createElement('div')
      icon.className = 'mc-mkt-icon'
      const iconCanvas = document.createElement('canvas')
      iconCanvas.width = 32
      iconCanvas.height = 32
      drawItemIcon(iconCanvas, entry.itemId, this.atlasCanvas)
      icon.appendChild(iconCanvas)

      const name = document.createElement('span')
      name.className = 'mc-mkt-iname'
      name.textContent = entry.name

      const price = document.createElement('span')
      price.className = 'mc-mkt-iprice'
      price.textContent = `${entry.price} 🥇 ×${entry.qty}`

      row.append(icon, name, price)
      row.addEventListener('click', () => this.showDetail(entry))
      this.listEl.appendChild(row)
    }
  }

  private showDetail(entry: MarketEntry): void {
    this.listEl.style.display = 'none'
    this.detailEl.style.display = 'flex'

    const gold = this.goldCount()
    const canAfford = gold >= entry.price

    this.goldBar.innerHTML = `⬛ Gold: <strong>${gold}</strong>`
    this.detailEl.innerHTML = ''

    const back = document.createElement('button')
    back.className = 'mc-mkt-btn'
    back.textContent = '← Back'
    back.addEventListener('click', () => {
      this.detailEl.style.display = 'none'
      this.listEl.style.display = ''
      this.renderList()
    })

    const iconRow = document.createElement('div')
    iconRow.style.cssText = 'display:flex;align-items:center;gap:12px;'
    const icon = document.createElement('div')
    icon.className = 'mc-mkt-detail-icon'
    const iconCanvas = document.createElement('canvas')
    iconCanvas.width = 32
    iconCanvas.height = 32
    drawItemIcon(iconCanvas, entry.itemId, this.atlasCanvas)
    icon.appendChild(iconCanvas)
    const titleEl = document.createElement('div')
    titleEl.className = 'mc-mkt-detail-title'
    titleEl.textContent = entry.name
    iconRow.append(icon, titleEl)

    const desc = document.createElement('p')
    desc.className = 'mc-mkt-detail-desc'
    desc.textContent = entry.desc

    const infoBox = document.createElement('div')
    infoBox.className = 'mc-mkt-info-box'
    infoBox.innerHTML =
      `<strong>How to trade:</strong><br>` +
      `Hand over <strong>${entry.price} Gold</strong> to receive 1 × ${entry.name}.<br>` +
      `Stock available: <strong>×${entry.qty}</strong><br>` +
      `Your gold: <strong style="color:${canAfford ? '#2a6a3a' : '#882222'}">${gold}</strong>`

    const tradeBtn = document.createElement('button')
    tradeBtn.className = 'mc-mkt-trade-btn'
    tradeBtn.textContent = `Trade  (${entry.price} 🥇)`
    if (!canAfford) tradeBtn.disabled = true
    tradeBtn.addEventListener('click', () => {
      const curGold = this.goldCount()
      if (curGold < entry.price) return
      // Deduct gold from inventory slots
      let remaining = entry.price
      for (let i = 0; i < this.inventory.slots.length && remaining > 0; i++) {
        const slot = this.inventory.slots[i]
        if (slot && slot.itemId === ItemId.Gold) {
          const take = Math.min(slot.count, remaining)
          this.inventory.removeFrom(i, take)
          remaining -= take
        }
      }
      // Add purchased item
      this.inventory.add(entry.itemId, 1)
      this.onTrade(entry.name)
      // Refresh the detail view to show updated gold count
      this.showDetail(entry)
    })

    this.detailEl.append(back, iconRow, desc, infoBox, tradeBtn)
  }
}
