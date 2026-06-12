const STYLE = `
.mc-menu {
  position: absolute; inset: 0; z-index: 20;
  background: linear-gradient(rgba(10,14,20,0.85), rgba(10,14,20,0.92));
  display: flex; align-items: center; justify-content: center; color: #eee;
}
.mc-menu-box { text-align: center; width: 340px; }
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
}

export class Menu {
  private readonly el: HTMLDivElement
  private readonly box: HTMLDivElement
  private mode: 'main' | 'pause' | 'hidden' = 'main'

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

  showMain(): void {
    this.mode = 'main'
    this.el.style.display = 'flex'
    this.box.innerHTML = ''
    this.box.appendChild(el('h1', 'MINICRAFT'))
    this.box.appendChild(el('div', 'a tiny voxel world', 'sub'))

    if (this.cb.hasSave()) {
      this.button('Continue World', () => this.cb.onContinue())
    }
    this.button('New World', () => this.cb.onNewWorld())

    const name = document.createElement('input')
    name.placeholder = 'Your name (for multiplayer)'
    name.maxLength = 16
    name.value = localStorage.getItem('minicraft-name') ?? ''
    const code = document.createElement('input')
    code.placeholder = 'Room code (e.g. MC-1234)'
    code.maxLength = 8
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

    if (this.cb.multiplayerAvailable) {
      this.box.appendChild(name)
      const host = this.button('Host Online Game', async () => {
        host.disabled = true
        error.textContent = ''
        try {
          await this.cb.onHost(getName())
        } catch (e) {
          error.textContent = e instanceof Error ? e.message : 'Could not host game'
          host.disabled = false
        }
      })
      this.box.appendChild(code)
      const join = this.button('Join Game', async () => {
        join.disabled = true
        error.textContent = ''
        try {
          await this.cb.onJoin(getName(), code.value.trim().toUpperCase())
        } catch (e) {
          error.textContent = e instanceof Error ? e.message : 'Could not join game'
          join.disabled = false
        }
      })
      this.box.appendChild(error)
    } else {
      this.box.appendChild(el('div', 'Multiplayer unavailable: missing Supabase configuration (.env.local)', 'hint'))
    }

    this.box.appendChild(
      el(
        'div',
        'WASD move · Space jump · F fly · E inventory · hold left-click mine · right-click place/use · feed animals to tame · Shift+right-click captures your animal',
        'hint',
      ),
    )
  }

  showPause(extra?: string): void {
    this.mode = 'pause'
    this.el.style.display = 'flex'
    this.box.innerHTML = ''
    this.box.appendChild(el('h1', 'PAUSED'))
    if (extra) this.box.appendChild(el('div', extra, 'sub'))
    this.button('Resume', () => this.cb.onResume())
    this.button('Save & Quit to Menu', () => this.cb.onQuitToMenu())
  }

  private button(label: string, onClick: () => void): HTMLButtonElement {
    const b = document.createElement('button')
    b.textContent = label
    b.addEventListener('click', onClick)
    this.box.appendChild(b)
    return b
  }
}

function el(tag: string, text: string, className?: string): HTMLElement {
  const e = document.createElement(tag)
  e.textContent = text
  if (className) e.className = className
  return e
}
