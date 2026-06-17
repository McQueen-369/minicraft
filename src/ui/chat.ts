const STYLE = `
.mc-chat-float {
  position: absolute; bottom: 76px; left: 12px; width: 320px; max-width: calc(100vw - 24px);
  z-index: 8; pointer-events: none; display: flex; flex-direction: column; gap: 2px;
}
.mc-chat-float-msg {
  font-family: 'Courier New', monospace; font-size: 13px; color: #fff;
  text-shadow: 1px 1px 0 #000; background: rgba(0,0,0,0.42);
  padding: 3px 7px; border-radius: 3px; transition: opacity 1s;
  max-width: 100%; word-break: break-word;
}
.mc-chat-float-msg.fading { opacity: 0; }
.mc-chat-panel {
  position: absolute; right: 0; top: 0; bottom: 0; width: 320px;
  background: rgba(10,10,10,0.88); border-left: 2px solid #444;
  display: flex; flex-direction: column; z-index: 20;
}
@media (max-width: 520px) {
  .mc-chat-panel { width: 100vw; left: 0; border-left: none; }
}
.mc-chat-header {
  flex: 0 0 auto; display: flex; align-items: center; gap: 8px;
  padding: 10px 12px; border-bottom: 1px solid #444;
  font-family: 'Courier New', monospace; color: #fff; font-size: 14px; font-weight: bold;
}
.mc-chat-header-title { flex: 1; }
.mc-chat-close {
  background: none; border: none; color: #aaa; font-size: 18px; cursor: pointer;
  padding: 0 4px; line-height: 1; -webkit-tap-highlight-color: transparent;
}
.mc-chat-close:hover, .mc-chat-close:active { color: #fff; }
.mc-chat-msgs {
  flex: 1 1 auto; overflow-y: auto; padding: 10px 12px;
  display: flex; flex-direction: column; gap: 6px;
}
.mc-chat-panel-msg {
  font-family: 'Courier New', monospace; font-size: 13px; color: #eee;
  line-height: 1.4; word-break: break-word;
}
.mc-chat-panel-msg .mc-chat-name { color: #7ec8e3; font-weight: bold; }
.mc-chat-panel-msg.mc-chat-self .mc-chat-name { color: #a8d8a8; }
.mc-chat-input-row {
  flex: 0 0 auto; display: flex; gap: 6px; padding: 10px 12px;
  border-top: 1px solid #444;
}
.mc-chat-input {
  flex: 1; font-family: 'Courier New', monospace; font-size: 13px;
  background: rgba(255,255,255,0.08); color: #fff; border: 1px solid #555;
  padding: 6px 10px; outline: none; border-radius: 4px;
}
.mc-chat-input:focus { border-color: #888; }
.mc-chat-send {
  background: #2a5a3a; border: 1px solid #3a7a4a; color: #fff;
  font-family: 'Courier New', monospace; font-size: 12px; font-weight: bold;
  padding: 6px 12px; border-radius: 4px; cursor: pointer;
  -webkit-tap-highlight-color: transparent; white-space: nowrap;
}
.mc-chat-send:hover, .mc-chat-send:active { background: #3a7a4a; }
`

interface FloatMsg {
  id: number
  el: HTMLDivElement
  timer: ReturnType<typeof setTimeout>
  fadeTimer: ReturnType<typeof setTimeout>
}

interface PanelMsg {
  name: string
  text: string
  self: boolean
}

export class Chat {
  private readonly floatContainer: HTMLDivElement
  private readonly panel: HTMLDivElement
  private readonly panelMsgs: HTMLDivElement
  private readonly panelInput: HTMLInputElement
  private readonly floatMsgs: FloatMsg[] = []
  private readonly history: PanelMsg[] = []
  private counter = 0
  private open = false

  onSend: (text: string) => void = () => {}
  onOpen: () => void = () => {}
  onClose: () => void = () => {}

  constructor(root: HTMLElement) {
    const style = document.createElement('style')
    style.textContent = STYLE
    document.head.appendChild(style)

    // Floating message strip (shown when panel is closed)
    this.floatContainer = document.createElement('div')
    this.floatContainer.className = 'mc-chat-float'
    root.appendChild(this.floatContainer)

    // Right-side panel
    this.panel = document.createElement('div')
    this.panel.className = 'mc-chat-panel'
    this.panel.style.display = 'none'

    const header = document.createElement('div')
    header.className = 'mc-chat-header'
    const title = document.createElement('span')
    title.className = 'mc-chat-header-title'
    title.textContent = '💬 Chat'
    const closeBtn = document.createElement('button')
    closeBtn.className = 'mc-chat-close'
    closeBtn.textContent = '✕'
    closeBtn.title = 'Close chat'
    const doClose = (e: Event) => { e.preventDefault(); this.closePanel() }
    closeBtn.addEventListener('click', doClose)
    closeBtn.addEventListener('touchstart', doClose, { passive: false })
    header.append(title, closeBtn)

    this.panelMsgs = document.createElement('div')
    this.panelMsgs.className = 'mc-chat-msgs'

    const inputRow = document.createElement('div')
    inputRow.className = 'mc-chat-input-row'
    this.panelInput = document.createElement('input')
    this.panelInput.className = 'mc-chat-input'
    this.panelInput.type = 'text'
    this.panelInput.maxLength = 120
    this.panelInput.placeholder = 'Type a message…'
    const sendBtn = document.createElement('button')
    sendBtn.className = 'mc-chat-send'
    sendBtn.textContent = 'Send'
    const doSend = (e: Event) => { e.preventDefault(); this.sendCurrent() }
    sendBtn.addEventListener('click', doSend)
    sendBtn.addEventListener('touchstart', doSend, { passive: false })
    inputRow.append(this.panelInput, sendBtn)

    this.panelInput.addEventListener('keydown', (e) => {
      e.stopPropagation()
      if (e.code === 'Enter') { e.preventDefault(); this.sendCurrent() }
      if (e.code === 'Escape') { e.preventDefault(); this.closePanel() }
    })

    this.panel.append(header, this.panelMsgs, inputRow)
    root.appendChild(this.panel)
  }

  get isOpen(): boolean { return this.open }

  /** Also support the old keyboard-driven open (Enter key in game.ts). */
  get isInputOpen(): boolean { return this.open }

  openPanel(): void {
    if (this.open) return
    this.open = true
    this.panel.style.display = 'flex'
    this.renderHistory()
    this.panelInput.value = ''
    this.panelInput.focus()
    this.onOpen()
  }

  closePanel(): void {
    if (!this.open) return
    this.open = false
    this.panel.style.display = 'none'
    this.panelInput.blur()
    this.onClose()
  }

  togglePanel(): void {
    if (this.open) this.closePanel()
    else this.openPanel()
  }

  /** Legacy keyboard support (Enter opens the panel). */
  openInput(): void { this.openPanel() }
  closeInput(): void { this.closePanel() }

  private sendCurrent(): void {
    const text = this.panelInput.value.trim()
    if (!text) return
    this.panelInput.value = ''
    this.onSend(text)
  }

  /** Append a chat message. selfMsg=true for messages sent by this player. */
  showMessage(playerName: string, text: string, selfMsg = false): void {
    this.history.push({ name: playerName, text, self: selfMsg })
    if (this.history.length > 200) this.history.shift()

    if (this.open) {
      this.appendPanelMsg(playerName, text, selfMsg)
      this.panelMsgs.scrollTop = this.panelMsgs.scrollHeight
    } else {
      this.addFloat(playerName, text)
    }
  }

  private appendPanelMsg(name: string, text: string, self: boolean): void {
    const el = document.createElement('div')
    el.className = 'mc-chat-panel-msg' + (self ? ' mc-chat-self' : '')
    const nameSpan = document.createElement('span')
    nameSpan.className = 'mc-chat-name'
    nameSpan.textContent = `<${name}>`
    el.appendChild(nameSpan)
    el.append(` ${text}`)
    this.panelMsgs.appendChild(el)
  }

  private renderHistory(): void {
    this.panelMsgs.innerHTML = ''
    for (const m of this.history) this.appendPanelMsg(m.name, m.text, m.self)
    this.panelMsgs.scrollTop = this.panelMsgs.scrollHeight
  }

  private addFloat(playerName: string, text: string): void {
    const id = this.counter++
    const el = document.createElement('div')
    el.className = 'mc-chat-float-msg'
    el.textContent = `<${playerName}> ${text}`
    this.floatContainer.appendChild(el)

    const fadeTimer = setTimeout(() => el.classList.add('fading'), 6000)
    const timer = setTimeout(() => {
      el.remove()
      const idx = this.floatMsgs.findIndex((m) => m.id === id)
      if (idx >= 0) this.floatMsgs.splice(idx, 1)
    }, 7000)

    this.floatMsgs.push({ id, el, timer, fadeTimer })
    while (this.floatMsgs.length > 6) {
      const old = this.floatMsgs.shift()!
      clearTimeout(old.timer)
      clearTimeout(old.fadeTimer)
      old.el.remove()
    }
  }

  show(): void {
    this.floatContainer.style.display = 'flex'
  }

  hide(): void {
    this.floatContainer.style.display = 'none'
    this.closePanel()
  }
}
