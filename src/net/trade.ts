import type { Inventory } from '../items/inventory'
import { itemDef } from '../items/items'
import { MAX_TRADE_LOTS, type TradeLot, type TradeMsg } from './protocol'

export type TradePhase =
  /** No trade in progress. */
  | 'idle'
  /** We invited someone and are waiting for their answer. */
  | 'inviting'
  /** Someone invited us and we have not answered yet. */
  | 'invited'
  /** Both sides are at the table, editing offers. */
  | 'open'
  /** The swap went through; the window shows the result before closing. */
  | 'done'

export interface TradeView {
  phase: TradePhase
  peerId: string
  peerName: string
  /** What we are putting on the table. */
  mine: TradeLot[]
  /** What they are putting on the table. */
  theirs: TradeLot[]
  myConfirm: boolean
  theirConfirm: boolean
}

const IDLE: TradeView = {
  phase: 'idle',
  peerId: '',
  peerName: '',
  mine: [],
  theirs: [],
  myConfirm: false,
  theirConfirm: false,
}

/** How many of an item the player could still add, given what is already offered. */
export function offerableCount(inventory: Inventory, lots: TradeLot[], itemId: number): number {
  const held = inventory.countOf(itemId)
  const staged = lots.filter((l) => l.itemId === itemId).reduce((n, l) => n + l.count, 0)
  return Math.max(0, held - staged)
}

/** Whether the player still holds everything they promised. */
export function offerIsCovered(inventory: Inventory, lots: TradeLot[]): boolean {
  const needed = new Map<number, number>()
  for (const lot of lots) needed.set(lot.itemId, (needed.get(lot.itemId) ?? 0) + lot.count)
  for (const [itemId, count] of needed) {
    if (inventory.countOf(itemId) < count) return false
  }
  return true
}

/**
 * Hand over `mine` and take in `theirs`, atomically: if the player no longer
 * holds what they offered, nothing moves and the caller cancels the trade.
 */
export function applyTrade(inventory: Inventory, mine: TradeLot[], theirs: TradeLot[]): boolean {
  if (!offerIsCovered(inventory, mine)) return false
  for (const lot of mine) {
    let remaining = lot.count
    for (let i = 0; i < inventory.slots.length && remaining > 0; i++) {
      const slot = inventory.slots[i]
      if (slot?.itemId !== lot.itemId) continue
      const take = Math.min(slot.count, remaining)
      inventory.removeFrom(i, take)
      remaining -= take
    }
  }
  for (const lot of theirs) inventory.add(lot.itemId, lot.count)
  return true
}

/** Merge a stack into the offer, keeping one lot per item type. */
function stage(lots: TradeLot[], itemId: number, count: number): TradeLot[] {
  const out = lots.map((l) => ({ ...l }))
  const existing = out.find((l) => l.itemId === itemId)
  if (existing) {
    existing.count += count
    return out
  }
  out.push({ itemId, count })
  return out
}

/**
 * Drives one player-to-player trade: invitation handshake, the two offers, and
 * the two confirmations. Both clients run their own copy and reach the same
 * conclusion from the same messages, so neither side has to be authoritative.
 *
 * Any change to either offer clears both confirmations, so nobody can swap the
 * goods out from under a confirmation.
 */
export class TradeManager {
  private view: TradeView = { ...IDLE }

  /** Fired whenever the window's contents change. */
  onChange: (view: TradeView) => void = () => {}
  /** Short player-facing message ("Alice declined"). */
  onNotice: (text: string) => void = () => {}
  /** Fired once the goods have actually moved. */
  onComplete: (view: TradeView) => void = () => {}

  constructor(
    private readonly selfId: string,
    private readonly selfName: string,
    private readonly inventory: Inventory,
    private readonly send: (msg: Omit<TradeMsg, 't'>) => void,
  ) {}

  get state(): TradeView {
    return this.view
  }

  get isOpen(): boolean {
    return this.view.phase !== 'idle'
  }

  /** Ask a peer to trade. Ignored while another trade is in progress. */
  invite(peerId: string, peerName: string): boolean {
    if (this.view.phase !== 'idle' || peerId === this.selfId) return false
    this.view = { ...IDLE, phase: 'inviting', peerId, peerName }
    this.send({ ev: 'invite', from: this.selfId, to: peerId, fromName: this.selfName })
    this.onChange(this.view)
    return true
  }

  /** Accept the invitation we are showing. */
  accept(): void {
    if (this.view.phase !== 'invited') return
    this.view = { ...this.view, phase: 'open' }
    this.send({ ev: 'accept', from: this.selfId, to: this.view.peerId })
    this.onChange(this.view)
  }

  decline(): void {
    if (this.view.phase !== 'invited') return
    this.send({ ev: 'decline', from: this.selfId, to: this.view.peerId })
    this.reset()
  }

  /** Back out of an invitation or an open trade. */
  cancel(reason = 'cancelled the trade'): void {
    if (this.view.phase === 'idle' || this.view.phase === 'done') return
    this.send({ ev: 'cancel', from: this.selfId, to: this.view.peerId, reason })
    this.reset()
  }

  /** Put items on the table. Returns false when the bags cannot cover it. */
  offer(itemId: number, count: number): boolean {
    if (this.view.phase !== 'open' || count <= 0) return false
    if (!itemDef(itemId)) return false
    const room = offerableCount(this.inventory, this.view.mine, itemId)
    const take = Math.min(room, count)
    if (take <= 0) return false
    const mine = stage(this.view.mine, itemId, take)
    if (mine.length > MAX_TRADE_LOTS) return false
    this.setMyOffer(mine)
    return true
  }

  /** Take items back off the table; count defaults to the whole lot. */
  withdraw(itemId: number, count?: number): void {
    if (this.view.phase !== 'open') return
    const mine: TradeLot[] = []
    for (const lot of this.view.mine) {
      if (lot.itemId !== itemId) {
        mine.push({ ...lot })
        continue
      }
      const left = count === undefined ? 0 : lot.count - count
      if (left > 0) mine.push({ itemId: lot.itemId, count: left })
    }
    this.setMyOffer(mine)
  }

  /** Lock in our side. The swap happens once both sides are locked. */
  confirm(): void {
    if (this.view.phase !== 'open' || this.view.myConfirm) return
    if (!offerIsCovered(this.inventory, this.view.mine)) {
      this.onNotice('You no longer have everything you offered')
      this.cancel('offer no longer available')
      return
    }
    this.view = { ...this.view, myConfirm: true }
    this.send({ ev: 'confirm', from: this.selfId, to: this.view.peerId })
    this.onChange(this.view)
    this.settleIfReady()
  }

  /** The peer vanished (left the room or timed out). */
  peerLeft(peerId: string): void {
    if (this.view.phase === 'idle' || this.view.peerId !== peerId) return
    this.onNotice(`${this.view.peerName} left — trade cancelled`)
    this.reset()
  }

  /** Feed in a trade message from the network. */
  handle(msg: TradeMsg): void {
    if (msg.from === this.selfId) return
    // Someone else's trade on the shared channel.
    if (msg.to !== this.selfId) return
    switch (msg.ev) {
      case 'invite':
        if (this.view.phase !== 'idle') {
          // Already busy — unless this is the other half of a mutual invite,
          // in which case the lower id defers and accepts.
          if (this.view.phase === 'inviting' && this.view.peerId === msg.from && this.selfId < msg.from) {
            this.view = { ...this.view, phase: 'open' }
            this.send({ ev: 'accept', from: this.selfId, to: msg.from })
            this.onChange(this.view)
          } else if (this.view.peerId !== msg.from) {
            this.send({ ev: 'decline', from: this.selfId, to: msg.from, reason: 'busy' })
          }
          return
        }
        this.view = { ...IDLE, phase: 'invited', peerId: msg.from, peerName: msg.fromName || 'Player' }
        this.onChange(this.view)
        break
      case 'accept':
        if (this.view.phase !== 'inviting' || this.view.peerId !== msg.from) return
        this.view = { ...this.view, phase: 'open' }
        this.onChange(this.view)
        break
      case 'decline':
        if (this.view.peerId !== msg.from) return
        this.onNotice(
          msg.reason === 'busy'
            ? `${this.view.peerName} is already trading`
            : `${this.view.peerName} declined the trade`,
        )
        this.reset()
        break
      case 'offer': {
        if (this.view.phase !== 'open' || this.view.peerId !== msg.from) return
        // Any change to the table invalidates both confirmations.
        this.view = { ...this.view, theirs: (msg.lots ?? []).map((l) => ({ ...l })), myConfirm: false, theirConfirm: false }
        this.onChange(this.view)
        break
      }
      case 'confirm':
        if (this.view.phase !== 'open' || this.view.peerId !== msg.from) return
        this.view = { ...this.view, theirConfirm: true }
        this.onChange(this.view)
        this.settleIfReady()
        break
      case 'cancel':
        if (this.view.phase === 'idle' || this.view.peerId !== msg.from) return
        this.onNotice(`${this.view.peerName} ${msg.reason ?? 'cancelled the trade'}`)
        this.reset()
        break
    }
  }

  /** Drop the window back to idle (also used after the result is shown). */
  reset(): void {
    this.view = { ...IDLE }
    this.onChange(this.view)
  }

  private setMyOffer(mine: TradeLot[]): void {
    this.view = { ...this.view, mine, myConfirm: false, theirConfirm: false }
    this.send({ ev: 'offer', from: this.selfId, to: this.view.peerId, lots: mine })
    this.onChange(this.view)
  }

  /** Both sides locked: move the goods on this client. */
  private settleIfReady(): void {
    const { myConfirm, theirConfirm, phase } = this.view
    if (phase !== 'open' || !myConfirm || !theirConfirm) return
    if (!applyTrade(this.inventory, this.view.mine, this.view.theirs)) {
      this.onNotice('Trade failed — your offer changed')
      this.cancel('offer no longer available')
      return
    }
    this.view = { ...this.view, phase: 'done' }
    this.onChange(this.view)
    this.onComplete(this.view)
  }
}
