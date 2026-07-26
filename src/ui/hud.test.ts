// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BlockId } from '../core/blocks'
import { Inventory } from '../items/inventory'
import { HUD } from './hud'
import { itemInfo } from './info'

// jsdom ships no canvas backend; the HUD only paints item icons, so a
// no-op 2D context is enough to exercise its DOM behaviour.
const stubContext = () =>
  new Proxy({} as CanvasRenderingContext2D, {
    get: (target, prop) => (prop in target ? Reflect.get(target, prop) : () => {}),
    set: () => true,
  })
HTMLCanvasElement.prototype.getContext = (() => stubContext()) as unknown as HTMLCanvasElement['getContext']

function makeHud(): { hud: HUD; root: HTMLElement } {
  const root = document.createElement('div')
  document.body.appendChild(root)
  const atlas = document.createElement('canvas')
  atlas.width = 128
  atlas.height = 224
  return { hud: new HUD(root, new Inventory(), atlas), root }
}

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('instructions overlay', () => {
  it('starts closed and reports its state', () => {
    const { hud } = makeHud()
    expect(hud.isInstructionsOpen).toBe(false)
    hud.showInstructions()
    expect(hud.isInstructionsOpen).toBe(true)
  })

  it('announces opening and closing so the game can free and re-lock the cursor', () => {
    const { hud } = makeHud()
    const opened = vi.fn()
    const closed = vi.fn()
    hud.onInstructionsOpen = opened
    hud.onInstructionsClose = closed

    hud.showInstructions()
    expect(opened).toHaveBeenCalledTimes(1)
    // Opening twice must not fire a second time (the overlay is already up).
    hud.showInstructions()
    expect(opened).toHaveBeenCalledTimes(1)

    hud.closeInstructions()
    expect(closed).toHaveBeenCalledTimes(1)
    expect(hud.isInstructionsOpen).toBe(false)
    // Closing an already-closed overlay is a no-op, not a second re-lock.
    hud.closeInstructions()
    expect(closed).toHaveBeenCalledTimes(1)
  })

  it('closes from its ✕ button', () => {
    const { root, hud } = makeHud()
    hud.showInstructions()
    const overlay = root.querySelector('.mc-help-overlay')!
    const close = overlay.querySelector<HTMLButtonElement>('.mc-instructions-close')!
    close.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(hud.isInstructionsOpen).toBe(false)
  })

  it('closes when the backdrop outside the card is clicked', () => {
    const { root, hud } = makeHud()
    hud.showInstructions()
    const overlay = root.querySelector<HTMLElement>('.mc-help-overlay')!
    overlay.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(hud.isInstructionsOpen).toBe(false)
  })

  it('does not close when the card itself is clicked', () => {
    const { root, hud } = makeHud()
    hud.showInstructions()
    const box = root.querySelector<HTMLElement>('.mc-help-overlay .mc-instructions-box')!
    box.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(hud.isInstructionsOpen).toBe(true)
  })

  it('tells the reader how to get out', () => {
    const { root, hud } = makeHud()
    hud.showInstructions()
    const box = root.querySelector<HTMLElement>('.mc-help-overlay .mc-instructions-box')!
    expect(box.textContent).toMatch(/Esc/)
  })
})

describe('info card', () => {
  it('renders the instructions and the fun fact, and closes cleanly', () => {
    const { root, hud } = makeHud()
    const closed = vi.fn()
    hud.onInfoClose = closed

    const info = itemInfo(BlockId.DiamondOre)
    hud.setTarget('Diamond Ore', info)
    expect(hud.openTargetInfo()).toBe(true)
    expect(hud.isInfoOpen).toBe(true)

    const box = root.querySelector('.mc-info-box') as HTMLElement
    expect(box.textContent).toContain('Diamond Ore')
    expect(box.querySelector('.mc-fact')?.textContent).toContain('Did you know?')
    expect(box.querySelector('.mc-fact')?.textContent).toContain(info.fact!)

    hud.closeInfo()
    expect(hud.isInfoOpen).toBe(false)
    expect(closed).toHaveBeenCalledTimes(1)
  })

  it('refuses to open without a target', () => {
    const { hud } = makeHud()
    hud.setTarget(null, null)
    expect(hud.openTargetInfo()).toBe(false)
    expect(hud.isInfoOpen).toBe(false)
  })

  it('renders info text as text, never as markup', () => {
    const { root, hud } = makeHud()
    hud.setTarget('Trickster', { title: '<img src=x>', lines: ['<b>bold</b>'] })
    hud.openTargetInfo()
    const box = root.querySelector('.mc-info-box') as HTMLElement
    expect(box.querySelector('img')).toBeNull()
    expect(box.querySelector('b')).toBeNull()
    expect(box.textContent).toContain('<b>bold</b>')
  })
})

describe('lava tint', () => {
  it('ramps from clear to rim glow to full submersion', () => {
    const { root, hud } = makeHud()
    const overlay = root.querySelector<HTMLElement>('.mc-lava')!
    hud.setLava(true, false)
    expect(Number(overlay.style.opacity)).toBeGreaterThan(0)
    expect(Number(overlay.style.opacity)).toBeLessThan(1)
    hud.setLava(true, true)
    expect(overlay.style.opacity).toBe('1')
    hud.setLava(false, false)
    expect(overlay.style.opacity).toBe('0')
  })
})
