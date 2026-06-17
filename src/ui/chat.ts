const STYLE = `
.mc-chat {
  position: absolute; bottom: 60px; left: 12px; width: 360px; max-width: calc(100vw - 24px);
  z-index: 20; pointer-events: none; display: flex; flex-direction: column; gap: 2px;
}
.mc-chat-msg {
  font-family: 'Courier New', monospace; font-size: 13px; color: #fff;
  text-shadow: 1px 1px 0 #000; background: rgba(0,0,0,0.35);
  padding: 2px 6px; border-radius: 2px; transition: opacity 1s;
  max-width: 100%; word-break: break-word;
}
.mc-chat-msg.fading { opacity: 0; }
.mc-chat-input-row {
  display: flex; gap: 4px; pointer-events: all;
}
.mc-chat-input {
  flex: 1; font-family: 'Courier New', monospace; font-size: 13px;
  background: rgba(0,0,0,0.6); color: #fff; border: 1px solid #888;
  padding: 4px 8px; outline: none; border-radius: 2px;
}
`

interface ChatMessage {
  id: number
  el: HTMLDivElement
  timer: ReturnType<typeof setTimeout>
  fadeTimer: ReturnType<typeof setTimeout>
}

export class Chat {
  private readonly container: HTMLDivElement
  private readonly messages: HTMLDivElement
  private readonly inputRow: HTMLDivElement
  private readonly input: HTMLInputElement
  private readonly msgs: ChatMessage[] = []
  private counter = 0
  private inputOpen = false

  onSend: (text: string) => void = () => {}
  onInputOpen: () => void = () => {}
  onInputClose: () => void = () => {}

  constructor(root: HTMLElement) {
    const style = document.createElement('style')
    style.textContent = STYLE
    document.head.appendChild(style)

    this.container = document.createElement('div')
    this.container.className = 'mc-chat'

    this.messages = document.createElement('div')
    this.messages.style.display = 'flex'
    this.messages.style.flexDirection = 'column'
    this.messages.style.gap = '2px'

    this.inputRow = document.createElement('div')
    this.inputRow.className = 'mc-chat-input-row'
    this.inputRow.style.display = 'none'

    this.input = document.createElement('input')
    this.input.className = 'mc-chat-input'
    this.input.type = 'text'
    this.input.maxLength = 120
    this.input.placeholder = 'Type a message...'
    this.inputRow.appendChild(this.input)

    this.input.addEventListener('keydown', (e) => {
      if (e.code === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
        const text = this.input.value.trim()
        if (text) this.onSend(text)
        this.closeInput()
      } else if (e.code === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        this.closeInput()
      } else {
        // Prevent game from processing keys while typing
        e.stopPropagation()
      }
    })

    this.container.appendChild(this.messages)
    this.container.appendChild(this.inputRow)
    root.appendChild(this.container)
  }

  get isInputOpen(): boolean {
    return this.inputOpen
  }

  openInput(): void {
    if (this.inputOpen) return
    this.inputOpen = true
    this.input.value = ''
    this.inputRow.style.display = 'flex'
    this.input.focus()
    this.onInputOpen()
  }

  closeInput(): void {
    if (!this.inputOpen) return
    this.inputOpen = false
    this.inputRow.style.display = 'none'
    this.input.blur()
    this.onInputClose()
  }

  /** Show a chat message from a player. */
  showMessage(playerName: string, text: string): void {
    const id = this.counter++
    const el = document.createElement('div')
    el.className = 'mc-chat-msg'
    el.textContent = `<${playerName}> ${text}`
    this.messages.appendChild(el)

    const fadeTimer = setTimeout(() => {
      el.classList.add('fading')
    }, 7000)
    const timer = setTimeout(() => {
      el.remove()
      const idx = this.msgs.findIndex((m) => m.id === id)
      if (idx >= 0) this.msgs.splice(idx, 1)
    }, 8000)

    this.msgs.push({ id, el, timer, fadeTimer })

    // Keep only the last 8 messages visible
    while (this.msgs.length > 8) {
      const old = this.msgs.shift()!
      clearTimeout(old.timer)
      clearTimeout(old.fadeTimer)
      old.el.remove()
    }
  }

  show(): void { this.container.style.display = 'flex' }
  hide(): void { this.container.style.display = 'none' }
}
