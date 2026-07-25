import { describe, expect, it } from 'vitest'
import { Inventory } from '../items/inventory'
import { ItemId } from '../items/items'
import type { TradeMsg } from './protocol'
import { applyTrade, offerableCount, offerIsCovered, TradeManager } from './trade'

/**
 * Two managers wired to each other, the way the room's broadcast channel wires
 * two clients. Messages addressed elsewhere still reach both, as they would on
 * a shared channel.
 */
function pair(): {
  a: TradeManager
  b: TradeManager
  invA: Inventory
  invB: Inventory
  notices: { a: string[]; b: string[] }
  /** Messages the pair exchanged, for asserting on the wire format. */
  wire: TradeMsg[]
} {
  const invA = new Inventory()
  const invB = new Inventory()
  const notices = { a: [] as string[], b: [] as string[] }
  const wire: TradeMsg[] = []
  let a!: TradeManager
  let b!: TradeManager
  const relay = (to: () => TradeManager) => (msg: Omit<TradeMsg, 't'>) => {
    const full = { t: 'trade', ...msg } as TradeMsg
    wire.push(full)
    to().handle(structuredClone(full))
  }
  a = new TradeManager('alice', 'Alice', invA, relay(() => b))
  b = new TradeManager('bob', 'Bob', invB, relay(() => a))
  a.onNotice = (t) => notices.a.push(t)
  b.onNotice = (t) => notices.b.push(t)
  return { a, b, invA, invB, notices, wire }
}

/** Open a trade between the two managers. */
function openTrade(p: ReturnType<typeof pair>): void {
  p.a.invite('bob', 'Bob')
  p.b.accept()
}

describe('offer helpers', () => {
  it('counts what is still free to offer', () => {
    const inv = new Inventory()
    inv.add(ItemId.Stone, 30)
    expect(offerableCount(inv, [], ItemId.Stone)).toBe(30)
    expect(offerableCount(inv, [{ itemId: ItemId.Stone, count: 12 }], ItemId.Stone)).toBe(18)
    expect(offerableCount(inv, [], ItemId.Gold)).toBe(0)
  })

  it('checks an offer against the bags', () => {
    const inv = new Inventory()
    inv.add(ItemId.Apple, 4)
    expect(offerIsCovered(inv, [{ itemId: ItemId.Apple, count: 4 }])).toBe(true)
    expect(offerIsCovered(inv, [{ itemId: ItemId.Apple, count: 5 }])).toBe(false)
    expect(offerIsCovered(inv, [{ itemId: ItemId.Apple, count: 2 }, { itemId: ItemId.Apple, count: 3 }])).toBe(false)
  })

  it('swaps goods and refuses when the offer is no longer covered', () => {
    const inv = new Inventory()
    inv.add(ItemId.Stone, 10)
    expect(applyTrade(inv, [{ itemId: ItemId.Stone, count: 4 }], [{ itemId: ItemId.Gold, count: 2 }])).toBe(true)
    expect(inv.countOf(ItemId.Stone)).toBe(6)
    expect(inv.countOf(ItemId.Gold)).toBe(2)

    expect(applyTrade(inv, [{ itemId: ItemId.Stone, count: 99 }], [{ itemId: ItemId.Gold, count: 5 }])).toBe(false)
    expect(inv.countOf(ItemId.Stone)).toBe(6)
    expect(inv.countOf(ItemId.Gold)).toBe(2)
  })
})

describe('TradeManager handshake', () => {
  it('walks both sides from invite to an open table', () => {
    const p = pair()
    expect(p.a.invite('bob', 'Bob')).toBe(true)
    expect(p.a.state.phase).toBe('inviting')
    expect(p.b.state.phase).toBe('invited')
    expect(p.b.state.peerName).toBe('Alice')
    p.b.accept()
    expect(p.a.state.phase).toBe('open')
    expect(p.b.state.phase).toBe('open')
  })

  it('reports a decline and returns both sides to idle', () => {
    const p = pair()
    p.a.invite('bob', 'Bob')
    p.b.decline()
    expect(p.a.state.phase).toBe('idle')
    expect(p.b.state.phase).toBe('idle')
    expect(p.notices.a[0]).toContain('declined')
  })

  it('turns away a second invite while busy', () => {
    const p = pair()
    openTrade(p)
    const carol: TradeMsg = { t: 'trade', ev: 'invite', from: 'carol', to: 'alice', fromName: 'Carol' }
    p.a.handle(carol)
    expect(p.a.state.peerId).toBe('bob')
    expect(p.wire.some((m) => m.ev === 'decline' && m.to === 'carol' && m.reason === 'busy')).toBe(true)
  })

  it('resolves a mutual invite instead of deadlocking', () => {
    // Both players hit "trade" before either message lands, so deliver the
    // invites only after both were sent.
    const queue: { to: 'a' | 'b'; msg: TradeMsg }[] = []
    const a = new TradeManager('alice', 'Alice', new Inventory(), (m) =>
      queue.push({ to: 'b', msg: { t: 'trade', ...m } as TradeMsg }),
    )
    const b = new TradeManager('bob', 'Bob', new Inventory(), (m) =>
      queue.push({ to: 'a', msg: { t: 'trade', ...m } as TradeMsg }),
    )
    a.invite('bob', 'Bob')
    b.invite('alice', 'Alice')
    while (queue.length) {
      const { to, msg } = queue.shift()!
      ;(to === 'a' ? a : b).handle(msg)
    }
    expect(a.state.phase).toBe('open')
    expect(b.state.phase).toBe('open')
  })

  it('ignores messages addressed to other players', () => {
    const p = pair()
    p.a.handle({ t: 'trade', ev: 'invite', from: 'carol', to: 'bob', fromName: 'Carol' })
    expect(p.a.state.phase).toBe('idle')
  })

  it('refuses to invite yourself', () => {
    const p = pair()
    expect(p.a.invite('alice', 'Alice')).toBe(false)
  })
})

describe('TradeManager offers', () => {
  it('mirrors an offer onto the other side of the table', () => {
    const p = pair()
    p.invA.add(ItemId.Stone, 20)
    openTrade(p)
    expect(p.a.offer(ItemId.Stone, 5)).toBe(true)
    expect(p.a.state.mine).toEqual([{ itemId: ItemId.Stone, count: 5 }])
    expect(p.b.state.theirs).toEqual([{ itemId: ItemId.Stone, count: 5 }])
  })

  it('will not offer more than the player carries', () => {
    const p = pair()
    p.invA.add(ItemId.Apple, 3)
    openTrade(p)
    expect(p.a.offer(ItemId.Apple, 10)).toBe(true)
    expect(p.a.state.mine).toEqual([{ itemId: ItemId.Apple, count: 3 }])
    expect(p.a.offer(ItemId.Apple, 1)).toBe(false)
  })

  it('merges repeat offers of the same item into one lot', () => {
    const p = pair()
    p.invA.add(ItemId.Stone, 20)
    openTrade(p)
    p.a.offer(ItemId.Stone, 2)
    p.a.offer(ItemId.Stone, 3)
    expect(p.a.state.mine).toEqual([{ itemId: ItemId.Stone, count: 5 }])
  })

  it('takes items back off the table', () => {
    const p = pair()
    p.invA.add(ItemId.Stone, 20)
    openTrade(p)
    p.a.offer(ItemId.Stone, 6)
    p.a.withdraw(ItemId.Stone, 2)
    expect(p.a.state.mine).toEqual([{ itemId: ItemId.Stone, count: 4 }])
    p.a.withdraw(ItemId.Stone)
    expect(p.a.state.mine).toEqual([])
    expect(p.b.state.theirs).toEqual([])
  })

  it('clears both confirmations whenever the table changes', () => {
    const p = pair()
    p.invA.add(ItemId.Stone, 20)
    openTrade(p)
    p.a.offer(ItemId.Stone, 1)
    p.b.confirm()
    expect(p.a.state.theirConfirm).toBe(true)
    p.a.offer(ItemId.Stone, 1)
    expect(p.a.state.myConfirm).toBe(false)
    expect(p.a.state.theirConfirm).toBe(false)
    expect(p.b.state.myConfirm).toBe(false)
  })

  it('rejects unknown items', () => {
    const p = pair()
    openTrade(p)
    expect(p.a.offer(999999, 1)).toBe(false)
  })
})

describe('TradeManager settlement', () => {
  it('swaps the goods on both clients once both confirm', () => {
    const p = pair()
    p.invA.add(ItemId.Stone, 20)
    p.invB.add(ItemId.Gold, 40)
    openTrade(p)
    p.a.offer(ItemId.Stone, 12)
    p.b.offer(ItemId.Gold, 25)
    p.a.confirm()
    expect(p.a.state.phase).toBe('open') // still waiting on Bob
    p.b.confirm()

    expect(p.a.state.phase).toBe('done')
    expect(p.b.state.phase).toBe('done')
    expect(p.invA.countOf(ItemId.Stone)).toBe(8)
    expect(p.invA.countOf(ItemId.Gold)).toBe(25)
    expect(p.invB.countOf(ItemId.Gold)).toBe(15)
    expect(p.invB.countOf(ItemId.Stone)).toBe(12)
  })

  it('supports a one-sided gift', () => {
    const p = pair()
    p.invA.add(ItemId.Bone, 3)
    openTrade(p)
    p.a.offer(ItemId.Bone, 3)
    p.a.confirm()
    p.b.confirm()
    expect(p.invA.countOf(ItemId.Bone)).toBe(0)
    expect(p.invB.countOf(ItemId.Bone)).toBe(3)
  })

  it('fires onComplete with what changed hands', () => {
    const p = pair()
    p.invA.add(ItemId.Stone, 5)
    const completed: string[] = []
    p.b.onComplete = (v) => completed.push(`${v.theirs.length} in / ${v.mine.length} out`)
    openTrade(p)
    p.a.offer(ItemId.Stone, 5)
    p.a.confirm()
    p.b.confirm()
    expect(completed).toEqual(['1 in / 0 out'])
  })

  it('cancels instead of settling when the offered goods are gone', () => {
    const p = pair()
    p.invA.add(ItemId.Stone, 5)
    openTrade(p)
    p.a.offer(ItemId.Stone, 5)
    p.b.confirm()
    // Alice spends the stone before locking in.
    p.invA.removeFrom(p.invA.slots.findIndex((s) => s?.itemId === ItemId.Stone), 5)
    p.a.confirm()
    expect(p.a.state.phase).toBe('idle')
    expect(p.b.state.phase).toBe('idle')
    expect(p.invB.countOf(ItemId.Stone)).toBe(0)
    expect(p.notices.a.some((n) => n.includes('no longer'))).toBe(true)
  })

  it('never duplicates items when one side confirms twice', () => {
    const p = pair()
    p.invA.add(ItemId.Stone, 10)
    openTrade(p)
    p.a.offer(ItemId.Stone, 4)
    p.a.confirm()
    p.a.confirm()
    p.b.confirm()
    expect(p.invB.countOf(ItemId.Stone)).toBe(4)
    expect(p.invA.countOf(ItemId.Stone)).toBe(6)
  })
})

describe('TradeManager interruptions', () => {
  it('cancels the table when either side backs out', () => {
    const p = pair()
    p.invA.add(ItemId.Stone, 5)
    openTrade(p)
    p.a.offer(ItemId.Stone, 5)
    p.b.cancel()
    expect(p.a.state.phase).toBe('idle')
    expect(p.b.state.phase).toBe('idle')
    expect(p.invA.countOf(ItemId.Stone)).toBe(5)
  })

  it('cancels when the peer disconnects', () => {
    const p = pair()
    openTrade(p)
    p.a.peerLeft('bob')
    expect(p.a.state.phase).toBe('idle')
    expect(p.notices.a[0]).toContain('left')
  })

  it('ignores a disconnect from an unrelated player', () => {
    const p = pair()
    openTrade(p)
    p.a.peerLeft('carol')
    expect(p.a.state.phase).toBe('open')
  })
})
