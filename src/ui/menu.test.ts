// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LocalWorldMeta } from '../persist/storage'
import type { Profile, WorldMeta } from '../net/cloud'
import { Menu, type MenuCallbacks } from './menu'

const EMPTY_SLOTS: (LocalWorldMeta | null)[] = Array(5).fill(null)

function makeCallbacks(over: Partial<MenuCallbacks> = {}): MenuCallbacks {
  return {
    listLocalSlots: () => EMPTY_SLOTS,
    onPlaySlot: vi.fn(),
    onNewSlot: vi.fn(),
    onDeleteSlot: vi.fn(),
    onHostSlot: vi.fn(async () => {}),
    onJoin: vi.fn(async () => {}),
    onResume: vi.fn(),
    onQuitToMenu: vi.fn(),
    multiplayerAvailable: true,
    profile: () => null,
    onSignIn: vi.fn(async () => {}),
    onSignUp: vi.fn(async () => {}),
    onSignOut: vi.fn(),
    listWorlds: vi.fn(async () => [] as WorldMeta[]),
    onPlayCloud: vi.fn(async () => {}),
    onHostCloud: vi.fn(async () => {}),
    onCreateCloud: vi.fn(async () => {}),
    onDeleteCloud: vi.fn(async () => {}),
    ...over,
  }
}

function buttons(root: HTMLElement): Map<string, HTMLButtonElement> {
  return new Map([...root.querySelectorAll('button')].map((b) => [b.textContent ?? '', b]))
}

const flush = () => new Promise((r) => setTimeout(r, 0))

beforeEach(() => {
  document.body.innerHTML = ''
  localStorage.clear()
})

describe('Menu signed out', () => {
  it('shows local slots, multiplayer, and profile auth controls', () => {
    new Menu(document.body, makeCallbacks())
    const b = buttons(document.body)
    expect(b.has('+ Create New World')).toBe(true) // single CTA for empty slots
    expect(b.has('▶ Play')).toBe(false) // no filled slots
    expect(b.has('Join a Friend')).toBe(true) // progressive disclosure
    expect(b.has('Sign In')).toBe(true)
    expect(b.has('Create Profile')).toBe(true)
  })

  it('shows Play and delete for a filled slot', () => {
    const slots: (LocalWorldMeta | null)[] = [
      { name: 'My World', savedAt: '2026-01-01T00:00:00Z' },
      ...Array(4).fill(null),
    ]
    new Menu(document.body, makeCallbacks({ listLocalSlots: () => slots }))
    const b = buttons(document.body)
    expect(b.has('▶ Play')).toBe(true)
    expect(b.has('✕')).toBe(true)
    expect(b.has('+ Create New World')).toBe(true) // single CTA for remaining empty slots
  })

  it('shows profile prompt when Play is clicked, then calls onPlaySlot after skipping', () => {
    const slots: (LocalWorldMeta | null)[] = [
      { name: 'My World', savedAt: '2026-01-01T00:00:00Z' },
      ...Array(4).fill(null),
    ]
    const cb = makeCallbacks({ listLocalSlots: () => slots })
    new Menu(document.body, cb)
    buttons(document.body).get('▶ Play')!.click()
    // Profile prompt is now shown
    expect(document.body.textContent).toContain('"My World" is saved on this device only.')
    buttons(document.body).get('▶ Play without profile')!.click()
    expect(cb.onPlaySlot).toHaveBeenCalledWith(0)
  })

  it('calls onPlaySlot directly when multiplayerAvailable is false', () => {
    const slots: (LocalWorldMeta | null)[] = [
      { name: 'My World', savedAt: '2026-01-01T00:00:00Z' },
      ...Array(4).fill(null),
    ]
    const cb = makeCallbacks({ listLocalSlots: () => slots, multiplayerAvailable: false })
    new Menu(document.body, cb)
    buttons(document.body).get('▶ Play')!.click()
    expect(cb.onPlaySlot).toHaveBeenCalledWith(0)
  })

  it('signs up with the entered credentials and re-renders', async () => {
    const profile: { current: Profile | null } = { current: null }
    const cb = makeCallbacks({
      profile: () => profile.current,
      onSignUp: vi.fn(async (u, p) => {
        expect([u, p]).toEqual(['steve', 'pw1234'])
        profile.current = { token: 't', username: 'steve' }
      }),
    })
    new Menu(document.body, cb)
    const inputs = [...document.querySelectorAll('input')]
    const user = inputs.find((i) => i.placeholder.startsWith('Username'))!
    const pass = inputs.find((i) => i.placeholder === 'Password')!
    user.value = 'steve'
    pass.value = 'pw1234'
    buttons(document.body).get('Create Profile')!.click()
    await flush()
    expect(cb.onSignUp).toHaveBeenCalled()
    expect(document.body.textContent).toContain('Signed in as')
    expect(document.body.textContent).toContain('steve')
  })

  it('shows auth errors without crashing', async () => {
    const cb = makeCallbacks({
      onSignIn: vi.fn(async () => {
        throw new Error('Wrong username or password')
      }),
    })
    new Menu(document.body, cb)
    buttons(document.body).get('Sign In')!.click()
    await flush()
    expect(document.body.textContent).toContain('Wrong username or password')
  })

  it('hides online sections when Supabase is not configured', () => {
    new Menu(document.body, makeCallbacks({ multiplayerAvailable: false }))
    const b = buttons(document.body)
    expect(b.has('Join Game')).toBe(false)
    expect(b.has('Sign In')).toBe(false)
    expect(document.body.textContent).toContain('Multiplayer unavailable')
  })
})

describe('Menu signed in', () => {
  const WORLDS: WorldMeta[] = [
    { id: 'w1', name: 'Hill Fort', updatedAt: '2026-06-12T10:00:00Z' },
    { id: 'w2', name: 'Sea Base', updatedAt: '2026-06-11T10:00:00Z' },
  ]
  const signedIn = (over: Partial<MenuCallbacks> = {}) =>
    makeCallbacks({
      profile: () => ({ token: 't', username: 'steve' }),
      listWorlds: vi.fn(async () => WORLDS),
      ...over,
    })

  it('lists cloud worlds with play/host/delete controls', async () => {
    new Menu(document.body, signedIn())
    expect(document.body.textContent).toContain('Loading worlds')
    await flush()
    expect(document.body.textContent).toContain('Hill Fort')
    expect(document.body.textContent).toContain('Sea Base')
    const rows = document.querySelectorAll('.world-row')
    expect(rows).toHaveLength(2)
    expect([...rows[0].querySelectorAll('button')].map((b) => b.textContent)).toEqual(['Play', 'Host', '✕'])
  })

  it('plays the chosen world', async () => {
    const cb = signedIn()
    new Menu(document.body, cb)
    await flush()
    document.querySelectorAll('.world-row')[0].querySelectorAll('button')[0].click()
    await flush()
    expect(cb.onPlayCloud).toHaveBeenCalledWith(expect.objectContaining({ id: 'w1' }))
  })

  it('hosts via room code screen then calls onHostCloud with code', async () => {
    const cb = signedIn()
    new Menu(document.body, cb)
    await flush()
    // Click Host on Sea Base — navigates to host screen
    document.querySelectorAll('.world-row')[1].querySelectorAll('button')[1].click()
    expect(document.body.textContent).toContain('Share this code with friends')
    expect(document.body.textContent).toMatch(/MC-\d{4}/)
    // Click Start Hosting
    buttons(document.body).get('▶ Start Hosting')!.click()
    await flush()
    expect(cb.onHostCloud).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'w2' }),
      expect.stringMatching(/^MC-\d{4}$/),
    )
  })

  it('creates a world with the typed name', async () => {
    const cb = signedIn()
    new Menu(document.body, cb)
    await flush()
    // Click "Create New World" to reveal the name input
    buttons(document.body).get('Create New World')!.click()
    const name = [...document.querySelectorAll('input')].find((i) => i.placeholder === 'New world name')!
    name.value = 'Castle'
    buttons(document.body).get('Create')!.click()
    await flush()
    expect(cb.onCreateCloud).toHaveBeenCalledWith('Castle')
  })

  it('deletes only after confirmation', async () => {
    const cb = signedIn()
    new Menu(document.body, cb)
    await flush()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    document.querySelectorAll('.world-row')[0].querySelectorAll('button')[2].click()
    await flush()
    expect(cb.onDeleteCloud).not.toHaveBeenCalled()
    confirmSpy.mockReturnValue(true)
    document.querySelectorAll('.world-row')[0].querySelectorAll('button')[2].click()
    await flush()
    expect(cb.onDeleteCloud).toHaveBeenCalledWith(expect.objectContaining({ id: 'w1' }))
    confirmSpy.mockRestore()
  })

  it('joins with the profile username after expanding Join a Friend', async () => {
    const cb = signedIn()
    new Menu(document.body, cb)
    await flush()
    // Expand the join form
    buttons(document.body).get('Join a Friend')!.click()
    const code = [...document.querySelectorAll('input')].find((i) => i.placeholder.startsWith('Room code'))!
    code.value = 'mc-1234'
    buttons(document.body).get('Join Game')!.click()
    await flush()
    expect(cb.onJoin).toHaveBeenCalledWith('steve', 'MC-1234')
  })

  it('signs out back to the auth view', async () => {
    let profile: Profile | null = { token: 't', username: 'steve' }
    const cb = signedIn({
      profile: () => profile,
      onSignOut: vi.fn(() => {
        profile = null
      }),
    })
    new Menu(document.body, cb)
    await flush()
    buttons(document.body).get('Sign Out')!.click()
    expect(buttons(document.body).has('Create Profile')).toBe(true)
  })

  it('ignores stale world lists after a re-render', async () => {
    let release!: (w: WorldMeta[]) => void
    const slow = new Promise<WorldMeta[]>((r) => (release = r))
    const cb = signedIn({ listWorlds: vi.fn(() => slow) })
    const menu = new Menu(document.body, cb)
    menu.showMain() // re-render while the first fetch is in flight
    release(WORLDS)
    await flush()
    // The second render's fetch is also pending `slow`, so rows render once, not twice.
    expect(document.querySelectorAll('.world-row')).toHaveLength(2)
  })
})
