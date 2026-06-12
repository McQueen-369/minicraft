import type { Profile, WorldMeta } from '../net/cloud'

const STYLE = `
.mc-menu {
  position: absolute; inset: 0; z-index: 20;
  background: linear-gradient(rgba(10,14,20,0.85), rgba(10,14,20,0.92));
  display: flex; align-items: center; justify-content: center; color: #eee;
}
.mc-menu-box { text-align: center; width: 380px; max-height: 92vh; overflow-y: auto; padding: 0 4px; }
.mc-menu-box h1 { font-size: 42px; letter-spacing: 4px; margin-bottom: 6px; color: #fff; text-shadow: 3px 3px 0 #2a4; }
.mc-menu-box .sub { color: #aaa; margin-bottom: 24px; font-size: 13px; }
.mc-menu-box button {
  display: block; width: 100%; margin: 8px 0; padding: 12px; font-size: 16px;
  font-family: inherit; background: #6b6b6b; color: #fff; border: 2px solid;
  border-color: #a8a8a8 #2e2e2e #2e2e2e #a8a8a8; cursor: pointer;
}
.mc-menu-box button:hover { background: #7d7d9d; }
.mc-menu-box button:disabled { opacity: 0.4; cursor: default; }
.mc-menu-box input {
  display: block; width: 100%; margin: 8px 0; padding: 10px; font-size: 15px;
  font-family: inherit; background: #222; color: #fff; border: 2px solid #555; box-sizing: border-box;
}
.mc-menu-box .error { color: #ff7b6b; font-size: 13px; min-height: 18px; margin-top: 6px; }
.mc-menu-box .hint { color: #999; font-size: 12px; margin-top: 14px; line-height: 1.6; }
.mc-menu-box .section { border-top: 1px solid #3a3f4a; margin-top: 16px; padding-top: 12px; }
.mc-menu-box .section-title { color: #8c8; font-size: 13px; margin-bottom: 4px; text-align: left; }
.mc-menu-box .profile-bar { display: flex; align-items: center; gap: 8px; color: #ccc; font-size: 14px; }
.mc-menu-box .profile-bar .who { flex: 1; text-align: left; }
.mc-menu-box .profile-bar .who b { color: #afa; }
.mc-menu-box .profile-bar button { width: auto; margin: 0; padding: 6px 10px; font-size: 13px; }
.mc-menu-box .world-row { display: flex; align-items: center; gap: 6px; margin: 6px 0; }
.mc-menu-box .world-row .meta { flex: 1; text-align: left; min-width: 0; }
.mc-menu-box .world-row .meta .name { font-size: 15px; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mc-menu-box .world-row .meta .when { font-size: 11px; color: #888; }
.mc-menu-box .world-row button { width: auto; margin: 0; padding: 8px 10px; font-size: 13px; flex-shrink: 0; }
.mc-menu-box .world-row button.danger:hover { background: #a33; }
.mc-menu-box .empty { color: #888; font-size: 13px; margin: 10px 0; }
`

export interface MenuCallbacks {
  hasSave: () => boolean
  onContinue: () => void
  onNewWorld: () => void
  onHost: (name: string) => Promise<void>
  onJoin: (name: string, code: string) => Promise<void>
  onResume: () => void
  onQuitToMenu: () => void
  multiplayerAvailable: boolean
  // Profiles + cloud worlds (require multiplayerAvailable's Supabase config too)
  profile: () => Profile | null
  onSignIn: (username: string, password: string) => Promise<void>
  onSignUp: (username: string, password: string) => Promise<void>
  onSignOut: () => void
  listWorlds: () => Promise<WorldMeta[]>
  onPlayCloud: (world: WorldMeta) => Promise<void>
  onHostCloud: (world: WorldMeta) => Promise<void>
  onCreateCloud: (name: string) => Promise<void>
  onDeleteCloud: (world: WorldMeta) => Promise<void>
}

export class Menu {
  private readonly el: HTMLDivElement
  private readonly box: HTMLDivElement
  private mode: 'main' | 'pause' | 'hidden' = 'main'
  private mainRenderSeq = 0

  constructor(
    root: HTMLElement,
    private readonly cb: MenuCallbacks,
  ) {
    const style = document.createElement('style')
    style.textContent = STYLE
    document.head.appendChild(style)
    this.el = document.createElement('div')
    this.el.className = 'mc-menu'
    this.box = document.createElement('div')
    this.box.className = 'mc-menu-box'
    this.el.appendChild(this.box)
    root.appendChild(this.el)
    this.showMain()
  }

  get isOpen(): boolean {
    return this.mode !== 'hidden'
  }

  hide(): void {
    this.mode = 'hidden'
    this.el.style.display = 'none'
  }

  /** Re-render the main menu if it is currently showing (e.g. after a cloud save). */
  refreshMain(): void {
    if (this.mode === 'main') this.showMain()
  }

  showMain(): void {
    this.mode = 'main'
    this.mainRenderSeq++
    this.el.style.display = 'flex'
    this.box.innerHTML = ''
    this.box.appendChild(el('h1', 'MINICRAFT'))
    this.box.appendChild(el('div', 'a tiny voxel world', 'sub'))

    const profile = this.cb.multiplayerAvailable ? this.cb.profile() : null
    if (profile) this.renderSignedIn(profile)
    else this.renderSignedOut()

    this.box.appendChild(
      el(
        'div',
        'WASD move · Space jump · F fly · E inventory · hold left-click mine · right-click place/use · feed animals to tame · Shift+right-click captures your animal',
        'hint',
      ),
    )
  }

  // ------------------------------------------------------------- signed out

  private renderSignedOut(): void {
    if (this.cb.hasSave()) {
      this.button(this.box, 'Continue World', () => this.cb.onContinue())
    }
    this.button(this.box, 'New World', () => this.cb.onNewWorld())

    if (!this.cb.multiplayerAvailable) {
      this.box.appendChild(el('div', 'Multiplayer unavailable: missing Supabase configuration (.env.local)', 'hint'))
      return
    }

    const mpSection = el('div', '', 'section')
    mpSection.appendChild(el('div', 'Play online (no profile)', 'section-title'))
    const name = input('Your name (for multiplayer)', 16)
    name.value = localStorage.getItem('minicraft-name') ?? ''
    const code = input('Room code (e.g. MC-1234)', 8)
    const error = el('div', '', 'error')
    const getName = () => {
      const n = name.value.trim() || 'Player'
      try {
        localStorage.setItem('minicraft-name', n)
      } catch {
        // ignore
      }
      return n
    }
    mpSection.appendChild(name)
    this.asyncButton(mpSection, 'Host Online Game', error, () => this.cb.onHost(getName()))
    mpSection.appendChild(code)
    this.asyncButton(mpSection, 'Join Game', error, () => this.cb.onJoin(getName(), code.value.trim().toUpperCase()))
    mpSection.appendChild(error)
    this.box.appendChild(mpSection)

    const auth = el('div', '', 'section')
    auth.appendChild(el('div', 'Profile — save worlds to the cloud and play them anywhere', 'section-title'))
    const username = input('Username (3-16 letters/numbers)', 16)
    const password = input('Password', 64)
    password.type = 'password'
    const authError = el('div', '', 'error')
    auth.appendChild(username)
    auth.appendChild(password)
    this.asyncButton(auth, 'Sign In', authError, async () => {
      await this.cb.onSignIn(username.value.trim(), password.value)
      this.showMain()
    })
    this.asyncButton(auth, 'Create Profile', authError, async () => {
      await this.cb.onSignUp(username.value.trim(), password.value)
      this.showMain()
    })
    auth.appendChild(authError)
    this.box.appendChild(auth)
  }

  // -------------------------------------------------------------- signed in

  private renderSignedIn(profile: Profile): void {
    const bar = el('div', '', 'profile-bar')
    const who = el('div', '', 'who')
    who.appendChild(el('span', 'Signed in as '))
    who.appendChild(el('b', profile.username))
    bar.appendChild(who)
    const out = document.createElement('button')
    out.textContent = 'Sign Out'
    out.addEventListener('click', () => {
      this.cb.onSignOut()
      this.showMain()
    })
    bar.appendChild(out)
    this.box.appendChild(bar)

    const error = el('div', '', 'error')

    const worlds = el('div', '', 'section')
    worlds.appendChild(el('div', 'Your worlds', 'section-title'))
    const list = el('div', 'Loading worlds…', 'empty')
    worlds.appendChild(list)
    const newName = input('New world name', 32)
    worlds.appendChild(newName)
    this.asyncButton(worlds, 'Create New World', error, async () => {
      await this.cb.onCreateCloud(newName.value.trim() || `World ${new Date().toLocaleDateString()}`)
    })
    this.box.appendChild(worlds)

    if (this.cb.hasSave()) {
      const local = el('div', '', 'section')
      local.appendChild(el('div', 'This device', 'section-title'))
      this.button(local, 'Play Local (Offline) World', () => this.cb.onContinue())
      this.box.appendChild(local)
    }

    const join = el('div', '', 'section')
    join.appendChild(el('div', 'Join a friend', 'section-title'))
    const code = input('Room code (e.g. MC-1234)', 8)
    join.appendChild(code)
    this.asyncButton(join, 'Join Game', error, () =>
      this.cb.onJoin(profile.username, code.value.trim().toUpperCase()),
    )
    this.box.appendChild(join)
    this.box.appendChild(error)

    const seq = this.mainRenderSeq
    this.cb.listWorlds().then(
      (metas) => {
        if (seq !== this.mainRenderSeq) return // menu re-rendered meanwhile
        list.innerHTML = ''
        list.className = ''
        if (metas.length === 0) {
          list.appendChild(el('div', 'No worlds yet — create one below!', 'empty'))
          return
        }
        for (const w of metas) list.appendChild(this.worldRow(w, error))
      },
      (e) => {
        if (seq !== this.mainRenderSeq) return
        list.textContent = ''
        error.textContent = e instanceof Error ? e.message : 'Could not load your worlds'
      },
    )
  }

  private worldRow(w: WorldMeta, error: HTMLElement): HTMLElement {
    const row = el('div', '', 'world-row')
    const meta = el('div', '', 'meta')
    meta.appendChild(el('div', w.name, 'name'))
    meta.appendChild(el('div', `saved ${new Date(w.updatedAt).toLocaleString()}`, 'when'))
    row.appendChild(meta)
    this.asyncButton(row, 'Play', error, () => this.cb.onPlayCloud(w))
    this.asyncButton(row, 'Host', error, () => this.cb.onHostCloud(w))
    const del = this.asyncButton(row, '✕', error, async () => {
      if (!confirm(`Delete world "${w.name}" forever?`)) return
      await this.cb.onDeleteCloud(w)
      this.showMain()
    })
    del.classList.add('danger')
    del.title = 'Delete world'
    return row
  }

  // ------------------------------------------------------------------ pause

  showPause(extra?: string): void {
    this.mode = 'pause'
    this.el.style.display = 'flex'
    this.box.innerHTML = ''
    this.box.appendChild(el('h1', 'PAUSED'))
    if (extra) this.box.appendChild(el('div', extra, 'sub'))
    this.button(this.box, 'Resume', () => this.cb.onResume())
    this.button(this.box, 'Save & Quit to Menu', () => this.cb.onQuitToMenu())
  }

  // ---------------------------------------------------------------- helpers

  private button(parent: HTMLElement, label: string, onClick: () => void): HTMLButtonElement {
    const b = document.createElement('button')
    b.textContent = label
    b.addEventListener('click', onClick)
    parent.appendChild(b)
    return b
  }

  /** Button that disables itself while the action runs and routes failures to an error line. */
  private asyncButton(
    parent: HTMLElement,
    label: string,
    error: HTMLElement,
    action: () => Promise<void>,
  ): HTMLButtonElement {
    const b = this.button(parent, label, async () => {
      b.disabled = true
      error.textContent = ''
      try {
        await action()
      } catch (e) {
        error.textContent = e instanceof Error ? e.message : 'Something went wrong'
      } finally {
        b.disabled = false
      }
    })
    return b
  }
}

function el(tag: string, text = '', className?: string): HTMLElement {
  const e = document.createElement(tag)
  e.textContent = text
  if (className) e.className = className
  return e
}

function input(placeholder: string, maxLength: number): HTMLInputElement {
  const i = document.createElement('input')
  i.placeholder = placeholder
  i.maxLength = maxLength
  return i
}
