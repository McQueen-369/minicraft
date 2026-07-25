import type { Inventory } from '../items/inventory'
import { itemDef } from '../items/items'
import type { TradeLot } from '../net/protocol'
import { offerableCount, type TradeView } from '../net/trade'
import { drawItemIcon } from './icons'

const STYLE = `
.mc-trade-overlay {
  position: absolute; inset: 0; background: rgba(0,0,0,0.72); z-index: 21;
  display: none; align-items: center; justify-content: center;
}
.mc-trade-box {
  background: #c6c6c6; border: 3px solid; border-color: #fff #555 #555 #fff;
  color: #333; font-family: 'Courier New', monospace;
  width: 560px; max-width: 96vw; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden;
}
.mc-trade-hdr {
  flex: 0 0 auto; padding: 9px 14px; border-bottom: 2px solid #555;
  display: flex; align-items: center; justify-content: space-between; font-size: 15px; font-weight: bold;
}
.mc-trade-tables { flex: 1 1 auto; min-height: 0; display: flex; gap: 8px; padding: 8px; }
.mc-trade-side { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
.mc-trade-side-hdr {
  font-size: 12px; font-weight: bold; padding: 4px 6px;
  background: #b0b0b0; border: 2px solid; border-color: #fff #555 #555 #fff;
  display: flex; justify-content: space-between; align-items: center; gap: 6px;
}
.mc-trade-ok { color: #1d6b32; font-size: 11px; }
.mc-trade-wait { color: #7a5a12; font-size: 11px; }
.mc-trade-table {
  flex: 0 0 auto; min-height: 132px; max-height: 30vh; overflow-y: auto; padding: 4px;
  background: #9d9d9d; border: 2px solid; border-color: #555 #fff #fff #555;
  display: flex; flex-direction: column; gap: 3px;
}
.mc-trade-empty { font-size: 11px; color: #4a4a4a; padding: 8px 4px; text-align: center; line-height: 1.5; }
.mc-trade-lot, .mc-trade-stack {
  display: flex; align-items: center; gap: 7px; padding: 3px 5px; font-size: 12px;
  background: #b8b8b8; border: 2px solid; border-color: #fff #555 #555 #fff;
}
.mc-trade-lot.clickable, .mc-trade-stack { cursor: pointer; -webkit-tap-highlight-color: transparent; }
.mc-trade-lot.clickable:hover, .mc-trade-stack:hover { background: #cacaca; }
.mc-trade-icon {
  width: 26px; height: 26px; flex: 0 0 26px;
  background: #8b8b8b; border: 2px solid; border-color: #555 #fff #fff #555;
}
.mc-trade-icon canvas { width: 100%; height: 100%; image-rendering: pixelated; }
.mc-trade-name { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mc-trade-count { font-weight: bold; white-space: nowrap; }
.mc-trade-bag-hdr { font-size: 11px; color: #444; font-weight: bold; margin-top: 2px; }
.mc-trade-bag {
  flex: 1 1 auto; min-height: 60px; overflow-y: auto; padding: 4px;
  background: #b0b0b0; border: 2px solid; border-color: #555 #fff #fff #555;
  display: flex; flex-direction: column; gap: 3px;
}
.mc-trade-foot {
  flex: 0 0 auto; padding: 8px 12px; border-top: 2px solid #555;
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
}
.mc-trade-status { flex: 1 1 auto; font-size: 12px; min-width: 140px; }
.mc-trade-btn {
  background: #888; border: 2px solid; border-color: #fff #555 #555 #fff;
  color: #333; font-family: 'Courier New', monospace; font-size: 12px;
  padding: 6px 12px; cursor: pointer; -webkit-tap-highlight-color: transparent;
}
.mc-trade-btn:hover { background: #aaa; }
.mc-trade-btn.primary {
  background: #2a5a3a; border-color: #3a7a4a #1a3a24 #1a3a24 #3a7a4a; color: #fff; font-weight: bold;
}
.mc-trade-btn.primary:hover { background: #3a7a4a; }
.mc-trade-btn.primary:disabled { background: #555; border-color: #444 #666 #666 #444; opacity: 0.6; cursor: default; }
.mc-trade-btn.danger { background: #6e2b22; border-color: #8f463a #3a1611 #3a1611 #8f463a; color: #fff; }
.mc-trade-btn.danger:hover { background: #8f463a; }
.mc-trade-qty { display: flex; gap: 4px; align-items: center; font-size: 11px; color: #444; padding: 0 8px 6px; }
.mc-trade-qty button {
  background: #8b8b8b; border: 2px solid; border-color: #fff #555 #555 #fff; color: #222;
  font-family: 'Courier New', monospace; font-size: 11px; padding: 2px 7px; cursor: pointer;
}
.mc-trade-qty button.active { background: #e7d9a0; border-color: #555 #fff #fff #555; }
/* Invitation prompt reuses the box chrome at a smaller size. */
.mc-trade-prompt { width: 340px; text-align: center; }
.mc-trade-prompt p { font-size: 13px; line-height: 1.6; margin: 0 0 4px; }
.mc-trade-prompt .mc-trade-foot { justify-content: center; }
.mc-trade-picker-row {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 6px 8px; font-size: 13px;
  background: #b0b0b0; border: 2px solid; border-color: #fff #555 #555 #fff;
}
.mc-trade-dist { font-size: 11px; color: #555; }
`

/** How many units one click moves; the player picks the step. */
const STEPS = [1, 5, 10, 64] as const

export interface TradePeer {
  id: string
  name: string
  /** Blocks away from the local player. */
  distance: number
}

/**
 * The player-to-player trade window: both offers side by side, your bag below
 * your side, and the confirm/cancel controls. Also renders the invitation
 * prompt and the "who do you want to trade with?" picker.
 */
export class TradePanel {
  private readonly overlay: HTMLDivElement
  private readonly box: HTMLDivElement
  private view: TradeView | null = null
  private step: number = 1
  private _isOpen = false

  /** Fired when the window (or a prompt) closes, so input can be handed back. */
  onClose: () => void = () => {}
  onAccept: () => void = () => {}
  onDecline: () => void = () => {}
  onCancel: () => void = () => {}
  onConfirm: () => void = () => {}
  onOffer: (itemId: number, count: number) => void = () => {}
  onWithdraw: (itemId: number, count: number) => void = () => {}
  /** Picker: the player chose someone to invite. */
  onInvite: (peerId: string, peerName: string) => void = () => {}

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
    this.overlay.className = 'mc-trade-overlay'
    this.box = document.createElement('div')
    this.box.className = 'mc-trade-box'
    this.overlay.appendChild(this.box)
    root.appendChild(this.overlay)
  }

  /** Show the picker listing nearby players. */
  openPicker(peers: TradePeer[]): void {
    this.view = null
    this.show()
    this.box.className = 'mc-trade-box mc-trade-prompt'
    this.box.innerHTML = ''
    this.box.append(this.header('🤝 Trade with…', () => this.close()))

    const body = document.createElement('div')
    body.style.cssText = 'padding:10px 12px;display:flex;flex-direction:column;gap:6px;'
    if (peers.length === 0) {
      const empty = document.createElement('p')
      empty.textContent = 'Nobody is nearby. Walk up to another player and try again.'
      empty.style.cssText = 'font-size:12px;line-height:1.6;margin:0;'
      body.appendChild(empty)
    }
    for (const peer of peers) {
      const row = document.createElement('div')
      row.className = 'mc-trade-picker-row'
      const label = document.createElement('span')
      label.innerHTML = `${escapeHtml(peer.name)} <span class="mc-trade-dist">${Math.round(peer.distance)}m away</span>`
      const btn = document.createElement('button')
      btn.className = 'mc-trade-btn primary'
      btn.textContent = 'Invite'
      btn.addEventListener('click', () => this.onInvite(peer.id, peer.name))
      row.append(label, btn)
      body.appendChild(row)
    }
    this.box.appendChild(body)

    const foot = document.createElement('div')
    foot.className = 'mc-trade-foot'
    const close = document.createElement('button')
    close.className = 'mc-trade-btn'
    close.textContent = 'Close'
    close.addEventListener('click', () => this.close())
    foot.appendChild(close)
    this.box.appendChild(foot)
  }

  /** Render whatever state the trade is in; closes itself when idle. */
  render(view: TradeView): void {
    this.view = view
    if (view.phase === 'idle') {
      this.close()
      return
    }
    this.show()
    if (view.phase === 'invited') this.renderPrompt(view)
    else if (view.phase === 'inviting') this.renderWaiting(view)
    else this.renderTable(view)
  }

  close(): void {
    if (!this._isOpen) return
    this._isOpen = false
    this.overlay.style.display = 'none'
    this.onClose()
  }

  private show(): void {
    this._isOpen = true
    this.overlay.style.display = 'flex'
  }

  private header(title: string, onX: () => void): HTMLDivElement {
    const hdr = document.createElement('div')
    hdr.className = 'mc-trade-hdr'
    const t = document.createElement('span')
    t.textContent = title
    const x = document.createElement('button')
    x.className = 'mc-trade-btn'
    x.textContent = '✕'
    x.addEventListener('click', onX)
    hdr.append(t, x)
    return hdr
  }

  private renderPrompt(view: TradeView): void {
    this.box.className = 'mc-trade-box mc-trade-prompt'
    this.box.innerHTML = ''
    this.box.append(this.header('🤝 Trade request', () => this.onDecline()))
    const body = document.createElement('div')
    body.style.cssText = 'padding:14px 16px;'
    const p = document.createElement('p')
    p.innerHTML = `<strong>${escapeHtml(view.peerName)}</strong> wants to trade with you.`
    body.appendChild(p)
    this.box.appendChild(body)
    const foot = document.createElement('div')
    foot.className = 'mc-trade-foot'
    const accept = document.createElement('button')
    accept.className = 'mc-trade-btn primary'
    accept.textContent = '✓ Accept'
    accept.addEventListener('click', () => this.onAccept())
    const decline = document.createElement('button')
    decline.className = 'mc-trade-btn danger'
    decline.textContent = '✕ Decline'
    decline.addEventListener('click', () => this.onDecline())
    foot.append(accept, decline)
    this.box.appendChild(foot)
  }

  private renderWaiting(view: TradeView): void {
    this.box.className = 'mc-trade-box mc-trade-prompt'
    this.box.innerHTML = ''
    this.box.append(this.header('🤝 Trade request', () => this.onCancel()))
    const body = document.createElement('div')
    body.style.cssText = 'padding:14px 16px;'
    const p = document.createElement('p')
    p.innerHTML = `Waiting for <strong>${escapeHtml(view.peerName)}</strong> to answer…`
    body.appendChild(p)
    this.box.appendChild(body)
    const foot = document.createElement('div')
    foot.className = 'mc-trade-foot'
    const cancel = document.createElement('button')
    cancel.className = 'mc-trade-btn'
    cancel.textContent = 'Cancel'
    cancel.addEventListener('click', () => this.onCancel())
    foot.appendChild(cancel)
    this.box.appendChild(foot)
  }

  private renderTable(view: TradeView): void {
    const done = view.phase === 'done'
    this.box.className = 'mc-trade-box'
    this.box.innerHTML = ''
    this.box.append(this.header(`🤝 Trading with ${view.peerName}`, () => (done ? this.close() : this.onCancel())))

    const tables = document.createElement('div')
    tables.className = 'mc-trade-tables'
    tables.append(this.mySide(view, done), this.theirSide(view))
    this.box.appendChild(tables)

    const foot = document.createElement('div')
    foot.className = 'mc-trade-foot'
    const status = document.createElement('div')
    status.className = 'mc-trade-status'
    status.innerHTML = done
      ? '<strong style="color:#1d6b32">Trade complete — the goods are in your bag.</strong>'
      : view.myConfirm
        ? `Waiting for <strong>${escapeHtml(view.peerName)}</strong> to confirm…`
        : view.theirConfirm
          ? `<strong>${escapeHtml(view.peerName)}</strong> has confirmed — your move.`
          : 'Changing either offer cancels both confirmations.'
    foot.appendChild(status)

    if (done) {
      const ok = document.createElement('button')
      ok.className = 'mc-trade-btn primary'
      ok.textContent = 'Done'
      ok.addEventListener('click', () => this.close())
      foot.appendChild(ok)
    } else {
      const confirm = document.createElement('button')
      confirm.className = 'mc-trade-btn primary'
      confirm.textContent = view.myConfirm ? '✓ Confirmed' : '✓ Confirm trade'
      confirm.disabled = view.myConfirm
      confirm.addEventListener('click', () => this.onConfirm())
      const cancel = document.createElement('button')
      cancel.className = 'mc-trade-btn danger'
      cancel.textContent = 'Cancel'
      cancel.addEventListener('click', () => this.onCancel())
      foot.append(confirm, cancel)
    }
    this.box.appendChild(foot)
  }

  private mySide(view: TradeView, done: boolean): HTMLDivElement {
    const side = document.createElement('div')
    side.className = 'mc-trade-side'
    side.appendChild(this.sideHeader('Your offer', view.myConfirm))

    const table = document.createElement('div')
    table.className = 'mc-trade-table'
    if (view.mine.length === 0) table.appendChild(emptyNote('Click items from your bag below to put them on the table.'))
    for (const lot of view.mine) {
      const row = this.lotRow(lot, !done)
      if (!done) {
        row.title = `Take ${Math.min(this.step, lot.count)} back`
        row.addEventListener('click', () => this.onWithdraw(lot.itemId, Math.min(this.step, lot.count)))
      }
      table.appendChild(row)
    }
    side.appendChild(table)

    if (!done) {
      side.appendChild(this.stepRow())
      const bagHdr = document.createElement('div')
      bagHdr.className = 'mc-trade-bag-hdr'
      bagHdr.textContent = 'Your bag'
      side.appendChild(bagHdr)
      side.appendChild(this.bagList(view))
    }
    return side
  }

  private theirSide(view: TradeView): HTMLDivElement {
    const side = document.createElement('div')
    side.className = 'mc-trade-side'
    side.appendChild(this.sideHeader(`${view.peerName}'s offer`, view.theirConfirm))
    const table = document.createElement('div')
    table.className = 'mc-trade-table'
    if (view.theirs.length === 0) table.appendChild(emptyNote(`${view.peerName} has not offered anything yet.`))
    for (const lot of view.theirs) table.appendChild(this.lotRow(lot, false))
    side.appendChild(table)
    return side
  }

  private sideHeader(label: string, confirmed: boolean): HTMLDivElement {
    const hdr = document.createElement('div')
    hdr.className = 'mc-trade-side-hdr'
    const name = document.createElement('span')
    name.textContent = label
    const mark = document.createElement('span')
    mark.className = confirmed ? 'mc-trade-ok' : 'mc-trade-wait'
    mark.textContent = confirmed ? '✓ confirmed' : 'not confirmed'
    hdr.append(name, mark)
    return hdr
  }

  /** Quantity-per-click selector. */
  private stepRow(): HTMLDivElement {
    const row = document.createElement('div')
    row.className = 'mc-trade-qty'
    const label = document.createElement('span')
    label.textContent = 'Move'
    row.appendChild(label)
    for (const n of STEPS) {
      const btn = document.createElement('button')
      btn.textContent = `×${n}`
      if (n === this.step) btn.classList.add('active')
      btn.addEventListener('click', () => {
        this.step = n
        if (this.view) this.render(this.view)
      })
      row.appendChild(btn)
    }
    return row
  }

  private bagList(view: TradeView): HTMLDivElement {
    const bag = document.createElement('div')
    bag.className = 'mc-trade-bag'
    const totals = new Map<number, number>()
    for (const slot of this.inventory.slots) {
      if (slot) totals.set(slot.itemId, (totals.get(slot.itemId) ?? 0) + slot.count)
    }
    let any = false
    for (const [itemId] of totals) {
      const free = offerableCount(this.inventory, view.mine, itemId)
      if (free <= 0) continue
      any = true
      const row = this.lotRow({ itemId, count: free }, true)
      row.className = 'mc-trade-stack'
      row.title = `Offer ${Math.min(this.step, free)}`
      row.addEventListener('click', () => this.onOffer(itemId, Math.min(this.step, free)))
      bag.appendChild(row)
    }
    if (!any) bag.appendChild(emptyNote('Everything you carry is already on the table.'))
    return bag
  }

  private lotRow(lot: TradeLot, clickable: boolean): HTMLDivElement {
    const row = document.createElement('div')
    row.className = 'mc-trade-lot' + (clickable ? ' clickable' : '')
    const icon = document.createElement('div')
    icon.className = 'mc-trade-icon'
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    drawItemIcon(canvas, lot.itemId, this.atlasCanvas)
    icon.appendChild(canvas)
    const name = document.createElement('span')
    name.className = 'mc-trade-name'
    name.textContent = itemDef(lot.itemId)?.name ?? 'Item'
    const count = document.createElement('span')
    count.className = 'mc-trade-count'
    count.textContent = `×${lot.count}`
    row.append(icon, name, count)
    return row
  }
}

function emptyNote(text: string): HTMLDivElement {
  const el = document.createElement('div')
  el.className = 'mc-trade-empty'
  el.textContent = text
  return el
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}
