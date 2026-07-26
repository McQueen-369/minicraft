// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { Controls } from './controls'

/**
 * Minimal stand-in for the browser's pointer-lock machinery: both
 * `requestPointerLock` and `exitPointerLock` resolve asynchronously, and
 * `pointerlockchange` fires afterwards. `settle()` runs the pending
 * transitions, which is where the ordering bugs live.
 */
function installPointerLock(): { settle: () => void } {
  const pending: (() => void)[] = []
  let element: Element | null = null
  Object.defineProperty(document, 'pointerLockElement', {
    configurable: true,
    get: () => element,
  })
  Element.prototype.requestPointerLock = function (this: Element) {
    pending.push(() => {
      element = this
      document.dispatchEvent(new Event('pointerlockchange'))
    })
  } as Element['requestPointerLock']
  document.exitPointerLock = () => {
    pending.push(() => {
      if (element === null) return
      element = null
      document.dispatchEvent(new Event('pointerlockchange'))
    })
  }
  return {
    settle: () => {
      // Each transition can queue another (the re-exit path), so drain.
      let guard = 20
      while (pending.length && guard-- > 0) pending.shift()!()
    },
  }
}

/**
 * jsdom advertises `ontouchstart`, which makes Controls treat the test as a
 * touch device and skip pointer lock entirely. Strip it so these tests exercise
 * the desktop path.
 */
function pretendDesktop(): void {
  let o: object | null = window
  while (o && !Object.getOwnPropertyDescriptor(o, 'ontouchstart')) o = Object.getPrototypeOf(o)
  if (o) delete (o as Record<string, unknown>).ontouchstart
  Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: 0 })
}

let lock: { settle: () => void }
let controls: Controls
let canvas: HTMLElement

beforeEach(() => {
  document.body.innerHTML = ''
  pretendDesktop()
  lock = installPointerLock()
  canvas = document.createElement('div')
  document.body.appendChild(canvas)
  controls = new Controls(canvas)
})

describe('pointer lock', () => {
  it('captures the pointer when the game asks for it', () => {
    controls.requestLock()
    lock.settle()
    expect(controls.isLocked).toBe(true)
  })

  it('releases the pointer on request', () => {
    controls.requestLock()
    lock.settle()
    controls.releaseLock()
    lock.settle()
    expect(controls.isLocked).toBe(false)
  })

  it('does not keep a lock that arrives after the game changed its mind', () => {
    // Closing a panel re-locks, then opening the next panel releases — all
    // before the browser has resolved the first request.
    controls.requestLock()
    controls.releaseLock()
    lock.settle()
    expect(controls.isLocked).toBe(false)
    expect(document.pointerLockElement).toBeNull()
  })

  it('drops keys held when the lock goes away', () => {
    controls.requestLock()
    lock.settle()
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }))
    expect(controls.keys.has('KeyW')).toBe(true)
    controls.releaseLock()
    lock.settle()
    expect(controls.keys.size).toBe(0)
  })
})

describe('gameplay input gating', () => {
  it('stops movement while a panel has the input', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }))
    controls.gameplayInput = false
    expect(controls.moveDirection()).toEqual({ x: 0, z: 0 })
    controls.gameplayInput = true
    expect(controls.moveDirection()).not.toEqual({ x: 0, z: 0 })
  })

  it('ignores the fly toggle while a panel has the input', () => {
    controls.requestLock()
    lock.settle()
    controls.gameplayInput = false
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF' }))
    expect(controls.fly).toBe(false)
    controls.gameplayInput = true
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF' }))
    expect(controls.fly).toBe(true)
  })

  it('ignores mouse look while a panel has the input', () => {
    controls.requestLock()
    lock.settle()
    controls.gameplayInput = false
    const move = new MouseEvent('mousemove')
    Object.defineProperty(move, 'movementX', { value: 200 })
    Object.defineProperty(move, 'movementY', { value: 100 })
    document.dispatchEvent(move)
    expect(controls.yaw).toBe(0)
    expect(controls.pitch).toBe(0)
  })
})
