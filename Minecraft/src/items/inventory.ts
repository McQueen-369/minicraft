import { HOTBAR_SIZE, INVENTORY_SIZE } from '../constants'
import { itemDef, type Slot } from './items'

/**
 * 36-slot player inventory; the first 9 slots are the hotbar.
 * All mutating methods notify onChange (UI re-render hook).
 */
export class Inventory {
  readonly slots: (Slot | null)[] = new Array(INVENTORY_SIZE).fill(null)
  selected = 0
  onChange: () => void = () => {}

  /** Add items, stacking first. Returns the count that did not fit. */
  add(itemId: number, count: number): number {
    const max = itemDef(itemId)?.maxStack ?? 64
    let remaining = count
    for (let i = 0; i < this.slots.length && remaining > 0; i++) {
      const slot = this.slots[i]
      if (slot && slot.itemId === itemId && slot.count < max) {
        const take = Math.min(max - slot.count, remaining)
        slot.count += take
        remaining -= take
      }
    }
    for (let i = 0; i < this.slots.length && remaining > 0; i++) {
      if (!this.slots[i]) {
        const take = Math.min(max, remaining)
        this.slots[i] = { itemId, count: take }
        remaining -= take
      }
    }
    if (remaining !== count) this.onChange()
    return remaining
  }

  /** Remove n of the item in a slot. */
  removeFrom(index: number, count = 1): void {
    const slot = this.slots[index]
    if (!slot) return
    slot.count -= count
    if (slot.count <= 0) this.slots[index] = null
    this.onChange()
  }

  /** Total count of an item across all slots. */
  countOf(itemId: number): number {
    let total = 0
    for (const slot of this.slots) if (slot?.itemId === itemId) total += slot.count
    return total
  }

  get heldSlot(): Slot | null {
    return this.slots[this.selected]
  }

  get heldItemId(): number | null {
    return this.heldSlot?.itemId ?? null
  }

  selectHotbar(index: number): void {
    this.selected = Math.max(0, Math.min(HOTBAR_SIZE - 1, index))
    this.onChange()
  }

  scrollHotbar(delta: number): void {
    this.selected = (((this.selected + delta) % HOTBAR_SIZE) + HOTBAR_SIZE) % HOTBAR_SIZE
    this.onChange()
  }

  /** Move/merge/swap between two slot arrays (inventory or chest). */
  static transfer(from: (Slot | null)[], fromIndex: number, to: (Slot | null)[], toIndex: number): void {
    const a = from[fromIndex]
    if (!a) return
    const b = to[toIndex]
    if (b && b.itemId === a.itemId) {
      const max = itemDef(a.itemId)?.maxStack ?? 64
      const take = Math.min(max - b.count, a.count)
      b.count += take
      a.count -= take
      if (a.count <= 0) from[fromIndex] = null
    } else {
      from[fromIndex] = b ?? null
      to[toIndex] = a
    }
  }

  serialize(): (Slot | null)[] {
    return this.slots.map((s) => (s ? { ...s } : null))
  }

  load(slots: (Slot | null)[]): void {
    for (let i = 0; i < this.slots.length; i++) {
      const s = slots[i]
      this.slots[i] = s && itemDef(s.itemId) && s.count > 0 ? { itemId: s.itemId, count: s.count } : null
    }
    this.onChange()
  }
}
