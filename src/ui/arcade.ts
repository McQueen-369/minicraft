import type { Inventory } from '../items/inventory'
import { ItemId, itemDef } from '../items/items'

/** Prize bundle granted for winning a mini-game. */
interface Prize {
  itemId: number
  count: number
}

const STYLE = `
.mc-arc-overlay {
  position: absolute; inset: 0; background: rgba(0,0,0,0.78); z-index: 22;
  display: none; align-items: center; justify-content: center;
}
.mc-arc-box {
  background: #1c1e26; border: 3px solid; border-color: #4a4e60 #0c0d12 #0c0d12 #4a4e60;
  color: #e8e8f0; font-family: 'Courier New', monospace;
  width: 560px; max-width: 96vw; max-height: 92vh; display: flex; flex-direction: column; overflow: hidden;
}
.mc-arc-hdr {
  flex: 0 0 auto; padding: 10px 14px; border-bottom: 2px solid #3a3e50;
  display: flex; align-items: center; justify-content: space-between;
  font-size: 15px; font-weight: bold;
}
.mc-arc-close {
  background: #444a5e; border: none; border-radius: 4px; color: #fff;
  font-size: 13px; font-weight: bold; padding: 4px 10px; cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.mc-arc-close:hover { background: #5a6178; }
.mc-arc-body { flex: 1 1 auto; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px; align-items: center; }
.mc-arc-sub { font-size: 12px; color: #9aa0b8; text-align: center; line-height: 1.5; margin: 0; }
.mc-arc-status { font-size: 13px; font-weight: bold; color: #ffd34d; min-height: 18px; text-align: center; }
.mc-arc-btn {
  background: #2a5a3a; border: 2px solid #3a7a4a; color: #fff;
  font-family: 'Courier New', monospace; font-size: 13px; font-weight: bold;
  padding: 7px 16px; cursor: pointer; -webkit-tap-highlight-color: transparent;
}
.mc-arc-btn:hover { background: #3a7a4a; }
.mc-arc-btn.alt { background: #444a5e; border-color: #5a6178; }
.mc-arc-btn.alt:hover { background: #5a6178; }
.mc-arc-grid { display: grid; grid-template-columns: repeat(3, 74px); gap: 6px; }
.mc-arc-tile {
  width: 74px; height: 74px; font-size: 26px; font-weight: bold; cursor: pointer;
  background: #2e86de; color: #fff; border: 2px solid; border-color: #7ab8f0 #1a5490 #1a5490 #7ab8f0;
  font-family: 'Courier New', monospace; -webkit-tap-highlight-color: transparent;
}
.mc-arc-tile:hover { background: #3a94ea; }
.mc-arc-tile.blank { background: transparent; border-color: #333848; cursor: default; }
.mc-arc-canvas { background: #0e1220; border: 2px solid #3a3e50; touch-action: none; max-width: 100%; }
.mc-arc-question { font-size: 26px; font-weight: bold; letter-spacing: 2px; color: #fff; }
.mc-arc-targets { position: relative; width: 100%; max-width: 480px; height: 220px; }
.mc-arc-target {
  position: absolute; width: 74px; height: 74px; border-radius: 50%; cursor: crosshair;
  background: radial-gradient(circle, #ffdf6b 0 28%, #e67e22 30% 60%, #c0392b 62% 100%);
  border: 3px solid #7a1e12; color: #1a1a1a; font-size: 20px; font-weight: bold;
  font-family: 'Courier New', monospace; -webkit-tap-highlight-color: transparent;
  animation: mc-arc-bob 2.2s ease-in-out infinite;
}
.mc-arc-target:nth-child(2n) { animation-duration: 2.8s; }
.mc-arc-target:nth-child(3n) { animation-delay: 0.6s; }
@keyframes mc-arc-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
.mc-arc-word { font-size: 30px; letter-spacing: 10px; font-weight: bold; color: #fff; }
.mc-arc-kb { display: flex; flex-wrap: wrap; gap: 5px; justify-content: center; max-width: 440px; }
.mc-arc-key {
  width: 38px; height: 40px; background: #444a5e; color: #fff; font-weight: bold;
  border: 2px solid; border-color: #5a6178 #2a2e3c #2a2e3c #5a6178; cursor: pointer;
  font-family: 'Courier New', monospace; font-size: 15px; -webkit-tap-highlight-color: transparent;
}
.mc-arc-key:hover { background: #5a6178; }
.mc-arc-key:disabled { opacity: 0.3; cursor: default; }
.mc-arc-key.good { background: #2a5a3a; border-color: #3a7a4a; }
.mc-arc-key.bad { background: #6e2a22; border-color: #8a3a30; }
.mc-arc-prize {
  background: #2a3a2a; border: 2px solid #3a7a4a; padding: 10px 16px;
  font-size: 13px; font-weight: bold; color: #9ee89e; text-align: center; line-height: 1.7;
}
`

const WORDS: { word: string; hint: string }[] = [
  { word: 'CHICKEN', hint: 'Tamed with seeds — lays eggs every two days' },
  { word: 'ISLAND', hint: 'Land completely surrounded by water' },
  { word: 'VOLCANO', hint: 'A mountain that can erupt with lava' },
  { word: 'ENERGY', hint: 'You spend it mining; food and sleep restore it' },
  { word: 'PUZZLE', hint: 'A problem you solve for fun' },
  { word: 'TREASURE', hint: 'Hidden riches explorers hunt for' },
  { word: 'COMPASS', hint: 'It always points north' },
  { word: 'HARVEST', hint: 'Gathering crops when they are ready' },
  { word: 'LANTERN', hint: 'A little light you can carry at night' },
  { word: 'GLACIER', hint: 'A slow-moving river of ice' },
  { word: 'ORCHARD', hint: 'A field of fruit trees' },
  { word: 'MINERAL', hint: 'Gold ore is one of these' },
]

/**
 * The secret island's mini-game arcade: four small educational games
 * (sliding puzzle, endless runner, math target shooting, word guessing)
 * that pay out item prizes into the player's inventory.
 */
export class ArcadePanel {
  private readonly overlay: HTMLDivElement
  private readonly titleEl: HTMLSpanElement
  private readonly body: HTMLDivElement
  private _isOpen = false
  private runnerRaf = 0
  private keyHandler: ((e: KeyboardEvent) => void) | null = null

  onClose: () => void = () => {}
  onPrize: (summary: string) => void = () => {}

  get isOpen(): boolean { return this._isOpen }

  constructor(
    root: HTMLElement,
    private readonly inventory: Inventory,
  ) {
    const style = document.createElement('style')
    style.textContent = STYLE
    document.head.appendChild(style)

    this.overlay = document.createElement('div')
    this.overlay.className = 'mc-arc-overlay'
    this.overlay.addEventListener('mousedown', (e) => { if (e.target === this.overlay) this.close() })

    const box = document.createElement('div')
    box.className = 'mc-arc-box'
    const hdr = document.createElement('div')
    hdr.className = 'mc-arc-hdr'
    this.titleEl = document.createElement('span')
    const closeBtn = document.createElement('button')
    closeBtn.className = 'mc-arc-close'
    closeBtn.textContent = '✕ Close'
    const doClose = (e: Event) => { e.preventDefault(); this.close() }
    closeBtn.addEventListener('click', doClose)
    closeBtn.addEventListener('touchstart', doClose, { passive: false })
    hdr.append(this.titleEl, closeBtn)

    this.body = document.createElement('div')
    this.body.className = 'mc-arc-body'

    box.append(hdr, this.body)
    this.overlay.appendChild(box)
    root.appendChild(this.overlay)
  }

  /** Open the mini-game for an arcade kiosk kind (e.g. 'arcadePuzzle'). */
  open(kind: string): void {
    this._isOpen = true
    this.overlay.style.display = 'flex'
    this.body.innerHTML = ''
    if (kind === 'arcadePuzzle') this.startPuzzle()
    else if (kind === 'arcadeRunner') this.startRunner()
    else if (kind === 'arcadeMath') this.startMath()
    else this.startWord()
  }

  close(): void {
    if (!this._isOpen) return
    this._isOpen = false
    this.overlay.style.display = 'none'
    this.stopLoops()
    this.onClose()
  }

  private stopLoops(): void {
    if (this.runnerRaf) cancelAnimationFrame(this.runnerRaf)
    this.runnerRaf = 0
    if (this.keyHandler) document.removeEventListener('keydown', this.keyHandler)
    this.keyHandler = null
  }

  private el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
    const e = document.createElement(tag)
    if (className) e.className = className
    if (text !== undefined) e.textContent = text
    return e
  }

  private award(prizes: Prize[]): void {
    for (const p of prizes) this.inventory.add(p.itemId, p.count)
    const summary = prizes.map((p) => `${p.count}× ${itemDef(p.itemId)?.name ?? 'item'}`).join(' + ')
    const banner = this.el('div', 'mc-arc-prize', `🏆 Prize collected: ${summary}!`)
    this.body.appendChild(banner)
    this.onPrize(summary)
  }

  // ------------------------------------------------------------ 1. puzzle

  private startPuzzle(): void {
    this.stopLoops()
    this.titleEl.textContent = '🧩 Sliding Puzzle'
    this.body.innerHTML = ''
    this.body.appendChild(this.el('p', 'mc-arc-sub', 'Slide the tiles into order 1–8. Click a tile next to the gap to move it. Fewer moves = bigger prize!'))
    const status = this.el('div', 'mc-arc-status', 'Moves: 0')
    const grid = this.el('div', 'mc-arc-grid')
    this.body.append(status, grid)

    // Shuffle by random walking the blank from the solved state — always solvable.
    const tiles = [1, 2, 3, 4, 5, 6, 7, 8, 0]
    let blank = 8
    let prev = -1
    for (let i = 0; i < 120; i++) {
      const opts = neighbors3(blank).filter((n) => n !== prev)
      const n = opts[Math.floor(Math.random() * opts.length)]
      tiles[blank] = tiles[n]
      tiles[n] = 0
      prev = blank
      blank = n
    }
    let moves = 0
    let won = false

    const render = () => {
      grid.innerHTML = ''
      tiles.forEach((t, i) => {
        const b = this.el('button', 'mc-arc-tile' + (t === 0 ? ' blank' : ''), t === 0 ? '' : String(t))
        if (t !== 0 && !won) {
          const tryMove = (e: Event) => {
            e.preventDefault()
            if (!neighbors3(blank).includes(i)) return
            tiles[blank] = t
            tiles[i] = 0
            blank = i
            moves++
            status.textContent = `Moves: ${moves}`
            if (tiles.every((v, j) => v === (j + 1) % 9)) {
              won = true
              status.textContent = `✨ Solved in ${moves} moves!`
              this.award(moves <= 40
                ? [{ itemId: ItemId.Gold, count: 15 }, { itemId: ItemId.FishStew, count: 1 }]
                : [{ itemId: ItemId.Gold, count: 8 }, { itemId: ItemId.Apple, count: 2 }])
            }
            render()
          }
          b.addEventListener('click', tryMove)
          b.addEventListener('touchstart', tryMove, { passive: false })
        }
        grid.appendChild(b)
      })
    }
    render()
  }

  // ------------------------------------------------------------ 2. runner

  private startRunner(): void {
    this.stopLoops()
    this.titleEl.textContent = '🏃 Island Runner'
    this.body.innerHTML = ''
    this.body.appendChild(this.el('p', 'mc-arc-sub', 'Jump the cacti! Press SPACE / tap the screen. Survive longer for a bigger gold prize (150+ points wins).'))
    const status = this.el('div', 'mc-arc-status', 'Score: 0')
    const canvas = this.el('canvas', 'mc-arc-canvas') as HTMLCanvasElement
    canvas.width = 500
    canvas.height = 170
    this.body.append(status, canvas)
    const ctx = canvas.getContext('2d')!

    const GROUND = 140
    const player = { y: GROUND, vy: 0, w: 22, h: 30 }
    let obstacles: { x: number; w: number; h: number }[] = []
    let speed = 170
    let score = 0
    let spawnIn = 1.2
    let alive = true
    let last = performance.now()
    let collected = false

    const jump = () => {
      if (alive && player.y >= GROUND - 0.5) player.vy = -430
    }
    this.keyHandler = (e) => {
      if (e.code === 'Space') { e.preventDefault(); jump() }
    }
    document.addEventListener('keydown', this.keyHandler)
    canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); jump() })

    const restartBtn = this.el('button', 'mc-arc-btn alt', '↻ Run again')
    restartBtn.style.display = 'none'
    restartBtn.addEventListener('click', () => {
      obstacles = []
      speed = 170
      score = 0
      spawnIn = 1.2
      player.y = GROUND
      player.vy = 0
      alive = true
      collected = false
      restartBtn.style.display = 'none'
      last = performance.now()
      loop()
    })
    this.body.appendChild(restartBtn)

    const loop = () => {
      if (!this._isOpen) return
      const now = performance.now()
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now

      if (alive) {
        score += dt * 12
        speed += dt * 7
        player.vy += 1300 * dt
        player.y = Math.min(GROUND, player.y + player.vy * dt)
        spawnIn -= dt
        if (spawnIn <= 0) {
          spawnIn = 0.9 + Math.random() * 1.1 - Math.min(0.5, speed / 900)
          obstacles.push({ x: canvas.width + 20, w: 14 + Math.random() * 14, h: 26 + Math.random() * 22 })
        }
        for (const o of obstacles) o.x -= speed * dt
        obstacles = obstacles.filter((o) => o.x + o.w > -10)
        // Collision (player fixed at x=60)
        for (const o of obstacles) {
          if (60 + player.w > o.x && 60 < o.x + o.w && player.y > GROUND - o.h) {
            alive = false
            const points = Math.floor(score)
            status.textContent = `💥 Wiped out at ${points} points!`
            if (points >= 150 && !collected) {
              collected = true
              this.award([{ itemId: ItemId.Gold, count: Math.min(20, Math.floor(points / 40) * 4) }, { itemId: ItemId.CookedFish, count: 1 }])
            }
            restartBtn.style.display = ''
          }
        }
        status.textContent = alive ? `Score: ${Math.floor(score)}` : status.textContent
      }

      // Draw
      ctx.fillStyle = '#0e1220'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#3a7a4a'
      ctx.fillRect(0, GROUND + 1, canvas.width, 4)
      ctx.fillStyle = alive ? '#ffd34d' : '#c0392b'
      ctx.fillRect(60, player.y - player.h, player.w, player.h)
      ctx.fillStyle = '#27ae60'
      for (const o of obstacles) ctx.fillRect(o.x, GROUND - o.h, o.w, o.h)
      if (alive) this.runnerRaf = requestAnimationFrame(loop)
    }
    loop()
  }

  // ------------------------------------------------------------ 3. math

  private startMath(): void {
    this.stopLoops()
    this.titleEl.textContent = '🎯 Math Blaster'
    this.body.innerHTML = ''
    this.body.appendChild(this.el('p', 'mc-arc-sub', 'Shoot the target with the right answer! 10 questions, 3 lives. Get 6+ right to win gold.'))
    const status = this.el('div', 'mc-arc-status')
    const question = this.el('div', 'mc-arc-question')
    const targets = this.el('div', 'mc-arc-targets')
    this.body.append(status, question, targets)

    let qIndex = 0
    let correct = 0
    let lives = 3
    let done = false

    const finish = () => {
      done = true
      question.textContent = ''
      targets.innerHTML = ''
      status.textContent = `Finished: ${correct}/10 correct!`
      if (correct >= 6) {
        this.award(correct === 10
          ? [{ itemId: ItemId.Gold, count: 25 }, { itemId: ItemId.FishStew, count: 1 }]
          : [{ itemId: ItemId.Gold, count: correct * 2 }])
      } else {
        this.body.appendChild(this.el('p', 'mc-arc-sub', 'Score 6 or more to earn a prize — try again!'))
      }
      const again = this.el('button', 'mc-arc-btn alt', '↻ Play again')
      again.addEventListener('click', () => this.startMath())
      this.body.appendChild(again)
    }

    const nextQuestion = () => {
      if (done) return
      if (qIndex >= 10 || lives <= 0) { finish(); return }
      qIndex++
      status.textContent = `Question ${qIndex}/10   ❤ ${lives}   ✔ ${correct}`
      // Difficulty ramps: + / − first, then ×, then ÷ with whole answers.
      const level = qIndex <= 3 ? 0 : qIndex <= 6 ? 1 : 2
      let text: string
      let answer: number
      if (level === 0) {
        const a = 5 + Math.floor(Math.random() * 40)
        const b = 3 + Math.floor(Math.random() * 30)
        if (Math.random() < 0.5) { text = `${a} + ${b}`; answer = a + b }
        else { text = `${a + b} − ${b}`; answer = a }
      } else if (level === 1) {
        const a = 3 + Math.floor(Math.random() * 10)
        const b = 3 + Math.floor(Math.random() * 10)
        text = `${a} × ${b}`
        answer = a * b
      } else {
        const b = 2 + Math.floor(Math.random() * 9)
        const q = 2 + Math.floor(Math.random() * 10)
        text = `${b * q} ÷ ${b}`
        answer = q
      }
      question.textContent = `${text} = ?`
      // One correct + three near-miss decoys, all unique.
      const answers = new Set<number>([answer])
      while (answers.size < 4) {
        const off = Math.floor(Math.random() * 10) - 5 + (Math.random() < 0.3 ? 10 : 0)
        const decoy = answer + (off === 0 ? 6 : off)
        if (decoy >= 0) answers.add(decoy)
      }
      const shuffled = [...answers].sort(() => Math.random() - 0.5)
      targets.innerHTML = ''
      shuffled.forEach((val, i) => {
        const t = this.el('button', 'mc-arc-target', String(val))
        t.style.left = `${8 + i * 24 + Math.random() * 4}%`
        t.style.top = `${18 + Math.random() * 45}%`
        const shoot = (e: Event) => {
          e.preventDefault()
          if (done) return
          if (val === answer) {
            correct++
          } else {
            lives--
          }
          nextQuestion()
        }
        t.addEventListener('click', shoot)
        t.addEventListener('touchstart', shoot, { passive: false })
        targets.appendChild(t)
      })
    }
    nextQuestion()
  }

  // ------------------------------------------------------------ 4. word

  private startWord(): void {
    this.stopLoops()
    this.titleEl.textContent = '🔤 Word Wizard'
    this.body.innerHTML = ''
    const pick = WORDS[Math.floor(Math.random() * WORDS.length)]
    this.body.appendChild(this.el('p', 'mc-arc-sub', `Guess the word one letter at a time — 6 wrong guesses allowed.\nHint: ${pick.hint}`))
    const status = this.el('div', 'mc-arc-status', '❤❤❤❤❤❤')
    const wordEl = this.el('div', 'mc-arc-word')
    const kb = this.el('div', 'mc-arc-kb')
    this.body.append(status, wordEl, kb)

    const guessed = new Set<string>()
    let lives = 6
    let done = false

    const render = () => {
      wordEl.textContent = [...pick.word].map((c) => (guessed.has(c) ? c : '_')).join('')
      status.textContent = '❤'.repeat(lives) + '♡'.repeat(6 - lives)
    }

    const keyButtons = new Map<string, HTMLButtonElement>()
    const guess = (letter: string) => {
      if (done || guessed.has(letter)) return
      guessed.add(letter)
      const btn = keyButtons.get(letter)
      const inWord = pick.word.includes(letter)
      if (btn) {
        btn.disabled = true
        btn.classList.add(inWord ? 'good' : 'bad')
      }
      if (!inWord) lives--
      render()
      if ([...pick.word].every((c) => guessed.has(c))) {
        done = true
        status.textContent = `✨ ${pick.word} — you got it!`
        this.award(lives === 6
          ? [{ itemId: ItemId.Gold, count: 15 }, { itemId: ItemId.Apple, count: 3 }]
          : [{ itemId: ItemId.Gold, count: 6 + lives }, { itemId: ItemId.Apple, count: 1 }])
      } else if (lives <= 0) {
        done = true
        wordEl.textContent = pick.word
        status.textContent = `The word was ${pick.word} — try another round!`
        const again = this.el('button', 'mc-arc-btn alt', '↻ New word')
        again.addEventListener('click', () => this.startWord())
        this.body.appendChild(again)
      }
    }

    for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
      const b = this.el('button', 'mc-arc-key', letter)
      const press = (e: Event) => { e.preventDefault(); guess(letter) }
      b.addEventListener('click', press)
      b.addEventListener('touchstart', press, { passive: false })
      keyButtons.set(letter, b)
      kb.appendChild(b)
    }
    this.keyHandler = (e) => {
      const letter = e.key.toUpperCase()
      if (letter.length === 1 && letter >= 'A' && letter <= 'Z') guess(letter)
    }
    document.addEventListener('keydown', this.keyHandler)
    render()
  }
}

/** Indices adjacent to i on a 3×3 grid. */
function neighbors3(i: number): number[] {
  const r = Math.floor(i / 3)
  const c = i % 3
  const out: number[] = []
  if (r > 0) out.push(i - 3)
  if (r < 2) out.push(i + 3)
  if (c > 0) out.push(i - 1)
  if (c < 2) out.push(i + 1)
  return out
}
