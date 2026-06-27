import type { LocalWorldMeta } from '../persist/storage'
import type { Profile, WorldMeta } from '../net/cloud'
import { generateRoomCode } from '../net/protocol'
import { APP_VERSION } from '../constants'

const VERSION_STORAGE_KEY = 'minicraft-seen-version'

const STYLE = `
.mc-update-banner {
  position: absolute; top: 0; left: 0; right: 0; z-index: 30;
  background: #f4c030; color: #222; font-family: 'Courier New', monospace;
  font-size: 13px; padding: 10px 16px;
  display: flex; align-items: center; gap: 12px;
  border-bottom: 2px solid #b89010; box-shadow: 0 2px 8px rgba(0,0,0,0.4);
}
.mc-update-banner .mc-update-msg { flex: 1; font-weight: bold; }
.mc-update-banner .mc-update-dismiss {
  background: #333; color: #fff; border: 2px solid #555;
  padding: 5px 12px; font-family: 'Courier New', monospace;
  font-size: 12px; cursor: pointer; white-space: nowrap; flex-shrink: 0;
}
.mc-update-banner .mc-update-dismiss:hover { background: #555; }
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
.mc-menu-box .save-notice {
  background: rgba(40,90,60,0.2); border: 1px solid #4a7; border-radius: 3px;
  padding: 8px 10px; color: #9c9; font-size: 13px; margin-bottom: 4px;
}
.mc-room-code {
  font-size: 36px; letter-spacing: 8px; color: #aff; font-weight: bold;
  text-align: center; padding: 16px; margin: 12px 0;
  background: rgba(0,50,20,0.4); border: 2px solid #4a7; border-radius: 4px;
}
`

export interface MenuCallbacks {
  listLocalSlots: () => (LocalWorldMeta | null)[]
  onPlaySlot: (index: number) => void
  onNewSlot: (index: number, name: string) => void
  onDeleteSlot: (index: number) => void
  onHostSlot: (index: number, playerName: string, roomCode: string) => Promise<void>
  onJoin: (name: string, code: string) => Promise<void>
  onResume: () => void
  onQuitToMenu: () => void
  multiplayerAvailable: boolean
  // Profiles + cloud worlds (require multiplayerAvailable's Supabase config too)
  profile: () => Profile | null
  onSignIn: (username: string, password: string) => Promise<void>
  onSignUp: (username: string, password: string) => Promise<void>
  onSignOut: () => void
  onChangeUsername: (password: string, newUsername: string) => Promise<void>
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>
  listWorlds: () => Promise<WorldMeta[]>
  onPlayCloud: (world: WorldMeta) => Promise<void>
  onHostCloud: (world: WorldMeta, roomCode: string) => Promise<void>
  onCreateCloud: (name: string) => Promise<void>
  onDeleteCloud: (world: WorldMeta) => Promise<void>
}

export class Menu {
  private readonly el: HTMLDivElement
  private readonly box: HTMLDivElement
  private readonly updateBanner: HTMLDivElement
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

    this.updateBanner = document.createElement('div')
    this.updateBanner.className = 'mc-update-banner'
    this.updateBanner.style.display = 'none'
    const msg = document.createElement('span')
    msg.className = 'mc-update-msg'
    msg.textContent = 'New features are available! Refresh your browser to get the latest updates.'
    const dismiss = document.createElement('button')
    dismiss.className = 'mc-update-dismiss'
    dismiss.textContent = 'Dismiss'
    dismiss.addEventListener('click', () => {
      try { localStorage.setItem(VERSION_STORAGE_KEY, APP_VERSION) } catch { /* ignore */ }
      this.updateBanner.style.display = 'none'
    })
    this.updateBanner.append(msg, dismiss)
    this.el.appendChild(this.updateBanner)

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

  showMain(afterLocalQuit = false): void {
    this.mode = 'main'
    this.mainRenderSeq++
    this.el.style.display = 'flex'
    this.box.innerHTML = ''
    // Show update banner if the player hasn't seen this version yet.
    try {
      const seen = localStorage.getItem(VERSION_STORAGE_KEY)
      this.updateBanner.style.display = seen !== APP_VERSION ? 'flex' : 'none'
    } catch {
      this.updateBanner.style.display = 'none'
    }
    this.box.appendChild(el('h1', 'MINICRAFT'))
    this.box.appendChild(el('div', 'a tiny voxel world', 'sub'))

    const profile = this.cb.multiplayerAvailable ? this.cb.profile() : null
    if (afterLocalQuit && !profile && this.cb.multiplayerAvailable) {
      this.box.appendChild(
        el('div', 'Your world is saved on this device only — create a profile below to access it from anywhere.', 'save-notice'),
      )
    }
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
    const error = el('div', '', 'error')

    if (!this.cb.multiplayerAvailable) {
      const localSection = el('div', '', 'section')
      localSection.appendChild(el('div', 'Local Worlds', 'section-title'))
      const slots = this.cb.listLocalSlots()
      for (let i = 0; i < slots.length; i++) {
        localSection.appendChild(this.localSlotRow(slots[i], i, false))
      }
      this.box.appendChild(localSection)
      this.box.appendChild(el('div', 'Multiplayer unavailable: missing Supabase configuration (.env.local)', 'hint'))
      return
    }

    // 1. Profile auth — top of page so players can sign up before creating a world
    const auth = el('div', '', 'section')
    auth.appendChild(el('div', 'Create Profile / Sign In', 'section-title'))
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

    // 2. Existing local worlds (only filled slots)
    const slots = this.cb.listLocalSlots()
    const hasWorlds = slots.some(Boolean)
    if (hasWorlds) {
      const localSection = el('div', '', 'section')
      localSection.appendChild(el('div', 'Local Worlds', 'section-title'))
      for (let i = 0; i < slots.length; i++) {
        if (slots[i]) {
          localSection.appendChild(
            this.localSlotRow(slots[i], i, true,
              (idx, worldName) => this.showPlayPrompt(idx, worldName),
            ),
          )
        }
      }
      this.box.appendChild(localSection)
    }

    // 3. Actions: two buttons — Create New World + Join a Friend
    const firstEmpty = slots.findIndex((s) => !s)
    const actionsSection = el('div', '', 'section')

    // Create New World form (hidden until button click)
    const createForm = el('div', '', '')
    createForm.style.display = 'none'
    if (firstEmpty !== -1) {
      const worldNameInput = input(`World ${firstEmpty + 1}`, 32)
      worldNameInput.placeholder = `World ${firstEmpty + 1}`
      createForm.appendChild(worldNameInput)
      const createBtn = document.createElement('button')
      createBtn.textContent = 'Create'
      createBtn.addEventListener('click', () => {
        this.cb.onNewSlot(firstEmpty, worldNameInput.value.trim() || `World ${firstEmpty + 1}`)
      })
      createForm.appendChild(createBtn)
      const cancelCreate = document.createElement('button')
      cancelCreate.textContent = 'Cancel'
      cancelCreate.addEventListener('click', () => this.showMain())
      createForm.appendChild(cancelCreate)
    }

    // Join a Friend form (hidden until button click)
    const joinForm = el('div', '', '')
    joinForm.style.display = 'none'
    const nameInput = input('Your name (for multiplayer)', 16)
    nameInput.value = localStorage.getItem('minicraft-name') ?? ''
    const getName = () => {
      const n = nameInput.value.trim() || 'Player'
      try { localStorage.setItem('minicraft-name', n) } catch { /* ignore */ }
      return n
    }
    const codeInput = input('Room code (e.g. MC-1234)', 8)
    joinForm.appendChild(nameInput)
    joinForm.appendChild(codeInput)
    this.asyncButton(joinForm, 'Join Game', error, () =>
      this.cb.onJoin(getName(), codeInput.value.trim().toUpperCase()),
    )
    const cancelJoin = document.createElement('button')
    cancelJoin.textContent = 'Cancel'
    cancelJoin.addEventListener('click', () => this.showMain())
    joinForm.appendChild(cancelJoin)

    // Button row — hidden when a form is open
    const btnRow = el('div', '', '')
    if (firstEmpty !== -1) {
      this.button(btnRow, 'Create New World', () => {
        btnRow.style.display = 'none'
        createForm.style.display = ''
        ;(createForm.querySelector('input') as HTMLInputElement | null)?.focus()
      })
    }
    this.button(btnRow, 'Join a Friend', () => {
      btnRow.style.display = 'none'
      joinForm.style.display = ''
      nameInput.focus()
    })

    actionsSection.appendChild(btnRow)
    if (firstEmpty !== -1) actionsSection.appendChild(createForm)
    actionsSection.appendChild(joinForm)
    actionsSection.appendChild(error)
    this.box.appendChild(actionsSection)
  }

  private showPlayPrompt(slotIndex: number, worldName: string): void {
    this.box.innerHTML = ''
    this.box.appendChild(el('h1', 'MINICRAFT'))
    this.box.appendChild(el('div', `"${worldName}" is saved on this device only.`, 'sub'))

    const section = el('div', '', 'section')
    section.appendChild(el('div', 'Create a free profile to back up your worlds', 'section-title'))
    const username = input('Username (3-16 letters/numbers)', 16)
    const password = input('Password', 64)
    password.type = 'password'
    const authError = el('div', '', 'error')
    section.appendChild(username)
    section.appendChild(password)
    this.asyncButton(section, 'Create Profile & Play', authError, async () => {
      await this.cb.onSignUp(username.value.trim(), password.value)
      this.cb.onPlaySlot(slotIndex)
    })
    section.appendChild(authError)
    this.box.appendChild(section)

    const skip = el('div', '', 'section')
    this.button(skip, '▶ Play without profile', () => this.cb.onPlaySlot(slotIndex))
    this.button(skip, '← Back to menu', () => this.showMain())
    this.box.appendChild(skip)
  }

  private localSlotRow(
    slot: LocalWorldMeta | null,
    index: number,
    showHost: boolean,
    onBeforePlay?: (index: number, worldName: string) => void,
  ): HTMLElement {
    const row = el('div', '', 'world-row')
    if (slot) {
      const meta = el('div', '', 'meta')
      meta.appendChild(el('div', slot.name, 'name'))
      meta.appendChild(el('div', `saved ${new Date(slot.savedAt).toLocaleString()}`, 'when'))
      row.appendChild(meta)
      const playBtn = document.createElement('button')
      playBtn.textContent = '▶ Play'
      playBtn.addEventListener('click', () => {
        if (onBeforePlay) onBeforePlay(index, slot.name)
        else this.cb.onPlaySlot(index)
      })
      row.appendChild(playBtn)
      if (showHost) {
        const hostBtn = document.createElement('button')
        hostBtn.textContent = 'Host'
        hostBtn.addEventListener('click', () => {
          const roomCode = generateRoomCode()
          this.showHostScreen(`Hosting "${slot.name}"`, roomCode, (playerName) =>
            this.cb.onHostSlot(index, playerName, roomCode), true)
        })
        row.appendChild(hostBtn)
      }
      const delBtn = document.createElement('button')
      delBtn.textContent = '✕'
      delBtn.className = 'danger'
      delBtn.title = `Delete "${slot.name}"`
      delBtn.addEventListener('click', () => {
        if (!confirm(`Delete world "${slot.name}" forever?`)) return
        this.cb.onDeleteSlot(index)
        this.showMain()
      })
      row.appendChild(delBtn)
    } else {
      const emptyMeta = el('div', `Slot ${index + 1} — empty`, 'meta')
      row.appendChild(emptyMeta)
      const newBtn = document.createElement('button')
      newBtn.textContent = '+ New World'
      newBtn.addEventListener('click', () => this.showNewSlotForm(row, index))
      row.appendChild(newBtn)
    }
    return row
  }

  private showNewSlotForm(row: HTMLElement, index: number): void {
    while (row.firstChild) row.removeChild(row.firstChild)
    const nameInput = document.createElement('input')
    nameInput.placeholder = `World ${index + 1}`
    nameInput.maxLength = 32
    nameInput.style.flex = '1'
    row.appendChild(nameInput)
    const createBtn = document.createElement('button')
    createBtn.textContent = 'Create'
    createBtn.addEventListener('click', () => {
      this.cb.onNewSlot(index, nameInput.value.trim() || `World ${index + 1}`)
    })
    row.appendChild(createBtn)
    const cancelBtn = document.createElement('button')
    cancelBtn.textContent = 'Cancel'
    cancelBtn.addEventListener('click', () => this.showMain())
    row.appendChild(cancelBtn)
    nameInput.focus()
  }

  private showHostScreen(
    subtitle: string,
    roomCode: string,
    onStart: (playerName: string) => Promise<void>,
    askName = false,
  ): void {
    this.box.innerHTML = ''
    this.box.appendChild(el('h1', 'MINICRAFT'))
    this.box.appendChild(el('div', subtitle, 'sub'))
    const codeSection = el('div', '', 'section')
    codeSection.appendChild(el('div', 'Share this code with friends:', 'section-title'))
    codeSection.appendChild(el('div', roomCode, 'mc-room-code'))
    this.box.appendChild(codeSection)
    let nameInput: HTMLInputElement | null = null
    if (askName) {
      const nameSection = el('div', '', 'section')
      nameInput = input('Your name', 16)
      nameInput.value = localStorage.getItem('minicraft-name') ?? ''
      nameSection.appendChild(nameInput)
      this.box.appendChild(nameSection)
    }
    const hostError = el('div', '', 'error')
    this.asyncButton(this.box, '▶ Start Hosting', hostError, async () => {
      const playerName = nameInput ? (nameInput.value.trim() || 'Player') : 'Player'
      if (nameInput) try { localStorage.setItem('minicraft-name', playerName) } catch { /* ignore */ }
      await onStart(playerName)
    })
    this.button(this.box, '← Back to Menu', () => this.showMain())
    this.box.appendChild(hostError)
  }

  // -------------------------------------------------------------- signed in

  private renderSignedIn(profile: Profile): void {
    const bar = el('div', '', 'profile-bar')
    const who = el('div', '', 'who')
    who.appendChild(el('span', 'Signed in as '))
    who.appendChild(el('b', profile.username))
    bar.appendChild(who)
    const settings = document.createElement('button')
    settings.textContent = '⚙ Settings'
    settings.addEventListener('click', () => this.showSettings(profile))
    bar.appendChild(settings)
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
    const createForm = el('div', '', '')
    createForm.style.display = 'none'
    const newName = input('New world name', 32)
    createForm.appendChild(newName)
    const createError = el('div', '', 'error')
    this.asyncButton(createForm, 'Create', createError, async () => {
      await this.cb.onCreateCloud(newName.value.trim() || `World ${new Date().toLocaleDateString()}`)
    })
    createForm.appendChild(createError)
    const createBtn = this.button(worlds, 'Create New World', () => {
      createBtn.style.display = 'none'
      createForm.style.display = ''
      newName.focus()
    })
    worlds.appendChild(createForm)
    this.box.appendChild(worlds)

    const localSlots = this.cb.listLocalSlots()
    if (localSlots.some(Boolean)) {
      const local = el('div', '', 'section')
      local.appendChild(el('div', 'Local Worlds (this device)', 'section-title'))
      const localError = el('div', '', 'error')
      for (let i = 0; i < localSlots.length; i++) {
        if (localSlots[i]) local.appendChild(this.localSlotRow(localSlots[i], i, false))
      }
      local.appendChild(localError)
      this.box.appendChild(local)
    }

    const join = el('div', '', 'section')
    const joinForm = el('div', '', '')
    joinForm.style.display = 'none'
    const code = input('Room code (e.g. MC-1234)', 8)
    joinForm.appendChild(code)
    this.asyncButton(joinForm, 'Join Game', error, () =>
      this.cb.onJoin(profile.username, code.value.trim().toUpperCase()),
    )
    const joinBtn = this.button(join, 'Join a Friend', () => {
      joinBtn.style.display = 'none'
      joinForm.style.display = ''
      code.focus()
    })
    join.appendChild(joinForm)
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

  // --------------------------------------------------------------- settings

  /** Account settings page: rename the profile and reset the password. */
  private showSettings(profile: Profile): void {
    this.mode = 'main'
    this.mainRenderSeq++
    this.el.style.display = 'flex'
    this.box.innerHTML = ''
    this.box.appendChild(el('h1', 'SETTINGS'))
    this.box.appendChild(el('div', `Signed in as ${profile.username}`, 'sub'))
    this.box.appendChild(
      el('div', 'Changing your username or password keeps all your saved worlds intact.', 'save-notice'),
    )

    // Change username
    const nameSection = el('div', '', 'section')
    nameSection.appendChild(el('div', 'Change Username', 'section-title'))
    const newName = input('New username (3-16 letters/numbers)', 16)
    const namePw = input('Current password', 64)
    namePw.type = 'password'
    const nameError = el('div', '', 'error')
    nameSection.appendChild(newName)
    nameSection.appendChild(namePw)
    this.asyncButton(nameSection, 'Update Username', nameError, async () => {
      await this.cb.onChangeUsername(namePw.value, newName.value.trim())
      this.showSettings(this.cb.profile() ?? profile)
      this.flash('Username updated')
    })
    nameSection.appendChild(nameError)
    this.box.appendChild(nameSection)

    // Change password
    const pwSection = el('div', '', 'section')
    pwSection.appendChild(el('div', 'Reset Password', 'section-title'))
    const curPw = input('Current password', 64)
    curPw.type = 'password'
    const newPw = input('New password (min 4 characters)', 64)
    newPw.type = 'password'
    const pwError = el('div', '', 'error')
    pwSection.appendChild(curPw)
    pwSection.appendChild(newPw)
    this.asyncButton(pwSection, 'Update Password', pwError, async () => {
      await this.cb.onChangePassword(curPw.value, newPw.value)
      curPw.value = ''
      newPw.value = ''
      this.flash('Password updated')
    })
    pwSection.appendChild(pwError)
    this.box.appendChild(pwSection)

    const back = el('div', '', 'section')
    this.button(back, '← Back to Menu', () => this.showMain())
    this.box.appendChild(back)
  }

  /** Briefly show a green confirmation banner at the top of the menu box. */
  private flash(message: string): void {
    const notice = el('div', message, 'save-notice')
    this.box.insertBefore(notice, this.box.children[2] ?? null)
    setTimeout(() => notice.remove(), 2500)
  }

  private worldRow(w: WorldMeta, error: HTMLElement): HTMLElement {
    const row = el('div', '', 'world-row')
    const meta = el('div', '', 'meta')
    meta.appendChild(el('div', w.name, 'name'))
    meta.appendChild(el('div', `saved ${new Date(w.updatedAt).toLocaleString()}`, 'when'))
    row.appendChild(meta)
    this.asyncButton(row, 'Play', error, () => this.cb.onPlayCloud(w))
    this.button(row, 'Host', () => {
      const roomCode = generateRoomCode()
      this.showHostScreen(`Hosting "${w.name}"`, roomCode, () => this.cb.onHostCloud(w, roomCode))
      // askName=false: signed-in user already has profile.username
    })
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
