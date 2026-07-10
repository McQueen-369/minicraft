import { describe, expect, it } from 'vitest'
import { itemSource, RECIPES } from './crafting'
import { itemDef } from './items'

describe('crafting recipes', () => {
  it('every recipe has a real output, inputs, and an instruction description', () => {
    for (const r of RECIPES) {
      expect(itemDef(r.output.itemId), r.id).toBeTruthy()
      expect(r.output.count).toBeGreaterThan(0)
      expect(r.inputs.length).toBeGreaterThan(0)
      expect(r.desc.length, `${r.id} needs a description`).toBeGreaterThan(10)
      for (const inp of r.inputs) {
        expect(itemDef(inp.itemId), `${r.id} input`).toBeTruthy()
        expect(inp.count).toBeGreaterThan(0)
      }
    }
  })

  it('every recipe ingredient has a specific "where to find it" source', () => {
    const generic = 'Explore the world'
    for (const r of RECIPES) {
      for (const inp of r.inputs) {
        const source = itemSource(inp.itemId)
        expect(source.length).toBeGreaterThan(10)
        expect(
          source.startsWith(generic),
          `${itemDef(inp.itemId)?.name} (recipe ${r.id}) has only the generic source text`,
        ).toBe(false)
      }
    }
  })

  it('craftable outputs point back to the crafting menu as their source', () => {
    expect(itemSource(RECIPES.find((r) => r.id === 'bed')!.output.itemId)).toMatch(/craft/i)
  })
})
