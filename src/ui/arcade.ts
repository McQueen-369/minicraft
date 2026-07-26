import type { Inventory } from '../items/inventory'
import { ItemId, itemDef } from '../items/items'

/** Prize bundle granted for winning a mini-game. */
interface Prize {
  itemId: number
  count: number
}

/** How one kiosk presents itself: identity, accent, briefing and reward. */
interface GameMeta {
  title: string
  badge: string
  /** Accent colour, matched to the cabinet model on the island. */
  accent: string
  /** Translucent accent for fills, so panels stay readable over dark chrome. */
  accentSoft: string
  /** Short "how to play" chips, shown before the first move. */
  how: string[]
  /** What a win pays out, advertised up front. */
  reward: string
}

const GAMES: Record<string, GameMeta> = {
  arcadePuzzle: {
    title: 'Sliding Puzzle',
    badge: '🧩',
    accent: '#2e86de',
    accentSoft: 'rgba(46,134,222,0.18)',
    how: ['🎯 Put the tiles back in order 1–8', '👆 Tap a tile next to the gap', '⚡ 40 moves or fewer = bigger prize'],
    reward: 'Up to 15 gold + fish stew',
  },
  arcadeRunner: {
    title: 'Island Runner',
    badge: '🏃',
    accent: '#27ae60',
    accentSoft: 'rgba(39,174,96,0.18)',
    how: ['🎯 Jump the cacti, run as far as you can', '👆 SPACE or tap the track to jump', '⚡ 150+ points wins a prize'],
    reward: 'Up to 20 gold + cooked fish',
  },
  arcadeMath: {
    title: 'Math Blaster',
    badge: '🎯',
    accent: '#e67e22',
    accentSoft: 'rgba(230,126,34,0.18)',
    how: ['🎯 Shoot the target with the right answer', '❤ 10 questions, 3 lives', '⚡ 6+ correct wins gold'],
    reward: 'Up to 25 gold + fish stew',
  },
  arcadeWord: {
    title: 'Word Wizard',
    badge: '🔤',
    accent: '#9b59b6',
    accentSoft: 'rgba(155,89,182,0.18)',
    how: ['🎯 Guess the hidden word letter by letter', '⌨ Tap a key or type on your keyboard', '⚡ 6 wrong guesses and the round ends'],
    reward: 'Up to 15 gold + apples',
  },
}

const STYLE = `
.mc-arc-overlay {
  position: absolute; inset: 0; background: rgba(0,0,0,0.8); z-index: 22;
  display: none; align-items: center; justify-content: center; padding: 10px;
}
.mc-arc-box {
  --acc: #2e86de; --acc-soft: rgba(46,134,222,0.18);
  background: #171922; border: 2px solid #2f3446; border-top: 5px solid var(--acc);
  border-radius: 10px; color: #e8e8f0; font-family: 'Courier New', monospace;
  width: 620px; max-width: 100%; max-height: 94vh;
  display: flex; flex-direction: column; overflow: hidden;
  box-shadow: 0 10px 40px rgba(0,0,0,0.6);
}
.mc-arc-hdr {
  flex: 0 0 auto; padding: 10px 12px; background: #1f2230; border-bottom: 2px solid #2f3446;
  display: flex; align-items: center; gap: 10px;
}
.mc-arc-badge {
  width: 2em; height: 2em; flex: 0 0 auto; border-radius: 8px; background: var(--acc-soft);
  border: 2px solid var(--acc); display: flex; align-items: center; justify-content: center;
  font-size: var(--mc-fs-md, 16px);
}
.mc-arc-titles { flex: 1 1 auto; min-width: 0; }
.mc-arc-title { font-size: var(--mc-fs-lg, 18px); font-weight: bold; color: #fff; }
.mc-arc-reward { font-size: var(--mc-fs-xs, 12.5px); color: #ffd34d; margin-top: 2px; }
.mc-arc-close {
  flex: 0 0 auto; background: #39405a; border: 2px solid #4c5678; border-radius: 6px; color: #fff;
  font-family: 'Courier New', monospace; font-size: var(--mc-fs-sm, 14px); font-weight: bold;
  padding: 7px 12px; cursor: pointer; -webkit-tap-highlight-color: transparent;
}
.mc-arc-close:hover { background: #4c5678; }
.mc-arc-body {
  flex: 1 1 auto; overflow-y: auto; padding: 14px;
  display: flex; flex-direction: column; gap: 12px; align-items: center;
}
/* Briefing chips: the rules of the game, before you have to guess them. */
.mc-arc-how { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
.mc-arc-chip {
  background: var(--acc-soft); border: 1px solid var(--acc); border-radius: 999px;
  padding: 5px 12px; font-size: var(--mc-fs-xs, 12.5px); color: #eef1ff; line-height: 1.4;
}
.mc-arc-status {
  font-size: var(--mc-fs-md, 16px); font-weight: bold; color: #fff; text-align: center;
  background: #212434; border: 2px solid #333a52; border-radius: 8px;
  padding: 7px 16px; min-width: 190px; letter-spacing: 1px;
}
.mc-arc-btn {
  background: var(--acc); border: none; border-radius: 6px; color: #0d0f16;
  font-family: 'Courier New', monospace; font-size: var(--mc-fs-md, 16px); font-weight: bold;
  padding: 10px 20px; cursor: pointer; -webkit-tap-highlight-color: transparent;
}
.mc-arc-btn:hover { filter: brightness(1.12); }
.mc-arc-btn.alt { background: #39405a; color: #fff; }
.mc-arc-actions { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
/* --- puzzle --- */
.mc-arc-grid {
  display: grid; grid-template-columns: repeat(3, var(--tile)); gap: 6px;
  --tile: clamp(62px, 19vmin, 88px);
}
.mc-arc-tile {
  width: var(--tile); height: var(--tile); font-size: var(--mc-fs-2xl, 28px); font-weight: bold;
  cursor: pointer; border-radius: 6px; color: #fff; background: var(--acc);
  border: 2px solid rgba(255,255,255,0.35); font-family: 'Courier New', monospace;
  -webkit-tap-highlight-color: transparent;
}
.mc-arc-tile:hover { filter: brightness(1.15); }
.mc-arc-tile.blank { background: #1e2130; border-color: #2f3446; cursor: default; }
/* --- runner --- */
.mc-arc-canvas {
  background: #0e1220; border: 2px solid #2f3446; border-radius: 6px;
  touch-action: none; width: 100%; max-width: 520px; height: auto;
}
/* --- math --- */
.mc-arc-question {
  font-size: var(--mc-fs-2xl, 28px); font-weight: bold; letter-spacing: 2px; color: #fff;
}
.mc-arc-targets {
  position: relative; width: 100%; max-width: 500px;
  height: clamp(200px, 34vh, 250px);
}
.mc-arc-target {
  position: absolute; width: var(--target); height: var(--target); border-radius: 50%;
  --target: clamp(62px, 17vmin, 84px); cursor: crosshair;
  background: radial-gradient(circle, #ffdf6b 0 28%, #e67e22 30% 60%, #c0392b 62% 100%);
  border: 3px solid #7a1e12; color: #1a1a1a; font-size: var(--mc-fs-lg, 20px); font-weight: bold;
  font-family: 'Courier New', monospace; -webkit-tap-highlight-color: transparent;
  animation: mc-arc-bob 2.2s ease-in-out infinite;
}
.mc-arc-target:nth-child(2n) { animation-duration: 2.8s; }
.mc-arc-target:nth-child(3n) { animation-delay: 0.6s; }
@keyframes mc-arc-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
/* --- word --- */
.mc-arc-word {
  font-size: var(--mc-fs-2xl, 30px); letter-spacing: 0.32em; font-weight: bold; color: #fff;
  text-align: center; word-break: break-all; line-height: 1.4;
}
.mc-arc-hint {
  font-size: var(--mc-fs-sm, 14px); color: #c9cfe8; text-align: center; line-height: 1.5;
  background: #212434; border-left: 4px solid var(--acc); border-radius: 6px; padding: 8px 12px;
  max-width: 460px;
}
.mc-arc-kb { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; max-width: 460px; }
.mc-arc-key {
  width: clamp(34px, 9vmin, 44px); height: clamp(38px, 10vmin, 48px);
  background: #39405a; color: #fff; font-weight: bold; border-radius: 5px;
  border: 2px solid #4c5678; cursor: pointer;
  font-family: 'Courier New', monospace; font-size: var(--mc-fs-md, 16px);
  -webkit-tap-highlight-color: transparent;
}
.mc-arc-key:hover { background: #4c5678; }
.mc-arc-key:disabled { opacity: 0.35; cursor: default; }
.mc-arc-key.good { background: #2a5a3a; border-color: #46a05e; }
.mc-arc-key.bad { background: #6e2a22; border-color: #a04a3a; }
/* --- results --- */
.mc-arc-result {
  width: 100%; max-width: 460px; border-radius: 8px; padding: 12px 16px; text-align: center;
  border: 2px solid #3a7a4a; background: #1d2a20;
}
.mc-arc-result.lose { border-color: #7a4a3a; background: #2a201d; }
.mc-arc-result-head {
  font-size: var(--mc-fs-lg, 18px); font-weight: bold; color: #9ee89e; margin-bottom: 4px;
}
.mc-arc-result.lose .mc-arc-result-head { color: #ffb38a; }
.mc-arc-result-body { font-size: var(--mc-fs-sm, 14px); color: #e2e6f5; line-height: 1.6; }
.mc-arc-prize {
  margin-top: 8px; font-size: var(--mc-fs-md, 16px); font-weight: bold; color: #ffd34d; line-height: 1.6;
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
 *
 * Every game is framed the same way — badge, title, advertised reward, a row
 * of "how to play" chips, one status pill, then the game — so a player who has
 * learned one kiosk already knows how to read the next.
 */
export class ArcadePanel {
  private readonly overlay: HTMLDivElement
  private readonly box: HTMLDivElement
  private readonly badgeEl: HTMLSpanElement
  private readonly titleEl: HTMLDivElement
  private readonly rewardEl: HTMLDivElement
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

    this.box = document.createElement('div')
    this.box.className = 'mc-arc-box'
    const hdr = document.createElement('div')
    hdr.className = 'mc-arc-hdr'
    this.badgeEl = document.createElement('span')
    this.badgeEl.className = 'mc-arc-badge'
    const titles = document.createElement('div')
    titles.className = 'mc-arc-titles'
    this.titleEl = document.createElement('div')
    this.titleEl.className = 'mc-arc-title'
    this.rewardEl = document.createElement('div')
    this.rewardEl.className = 'mc-arc-reward'
    titles.append(this.titleEl, this.rewardEl)
    const closeBtn = document.createElement('button')
    closeBtn.className = 'mc-arc-close'
    closeBtn.textContent = '✕ Close'
    const doClose = (e: Event) => { e.preventDefault(); this.close() }
    closeBtn.addEventListener('click', doClose)
    closeBtn.addEventListener('touchstart', doClose, { passive: false })
    hdr.append(this.badgeEl, titles, closeBtn)

    this.body = document.createElement('div')
    this.body.className = 'mc-arc-body'

    this.box.append(hdr, this.body)
    this.overlay.appendChild(this.box)
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

  /** Reset the panel to one game's identity: accent, header and briefing. */
  private frame(kind: keyof typeof GAMES | string): GameMeta {
    this.stopLoops()
    const meta = GAMES[kind] ?? GAMES.arcadePuzzle
    this.box.style.setProperty('--acc', meta.accent)
    this.box.style.setProperty('--acc-soft', meta.accentSoft)
    this.badgeEl.textContent = meta.badge
    this.titleEl.textContent = meta.title
    this.rewardEl.textContent = `🏆 ${meta.reward}`
    this.body.innerHTML = ''
    const how = this.el('div', 'mc-arc-how')
    for (const line of meta.how) how.appendChild(this.el('span', 'mc-arc-chip', line))
    this.body.appendChild(how)
    return meta
  }

  private award(prizes: Prize[]): string {
    for (const p of prizes) this.inventory.add(p.itemId, p.count)
    const summary = prizes.map((p) => `${p.count}× ${itemDef(p.itemId)?.name ?? 'item'}`).join(' + ')
    this.onPrize(summary)
    return summary
  }

  /**
   * The end-of-round card: what happened, what it earned, and what to do next.
   * Always the same shape, win or lose, so the outcome is never ambiguous.
   */
  private showResult(
    won: boolean,
    headline: string,
    detail: string,
    prizeSummary: string | null,
    actions: { label: string; onClick: () => void; alt?: boolean }[],
  ): void {
    const card = this.el('div', `mc-arc-result${won ? '' : ' lose'}`)
    card.appendChild(this.el('div', 'mc-arc-result-head', headline))
    card.appendChild(this.el('div', 'mc-arc-result-body', detail))
    if (prizeSummary) card.appendChild(this.el('div', 'mc-arc-prize', `🏆 Prize collected: ${prizeSummary}`))
    const row = this.el('div', 'mc-arc-actions')
    for (const a of actions) {
      const b = this.el('button', `mc-arc-btn${a.alt ? ' alt' : ''}`, a.label)
      const press = (e: Event) => { e.preventDefault(); a.onClick() }
      b.addEventListener('click', press)
      b.addEventListener('touchstart', press, { passive: false })
      row.appendChild(b)
    }
    this.body.append(card, row)
    card.scrollIntoView({ block: 'nearest' })
  }

  // ------------------------------------------------------------ 1. puzzle

  private startPuzzle(): void {
    this.frame('arcadePuzzle')
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
              const swift = moves <= 40
              const prize = this.award(swift
                ? [{ itemId: ItemId.Gold, count: 15 }, { itemId: ItemId.FishStew, count: 1 }]
                : [{ itemId: ItemId.Gold, count: 8 }, { itemId: ItemId.Apple, count: 2 }])
              render()
              this.showResult(
                true,
                `✨ Solved in ${moves} moves!`,
                swift ? 'Under 40 moves — top prize tier.' : 'Solve it in 40 moves or fewer for the top prize tier.',
                prize,
                [{ label: '↻ New puzzle', onClick: () => this.startPuzzle(), alt: true }],
              )
              return
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
    this.frame('arcadeRunner')
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

    const jump = () => {
      if (alive && player.y >= GROUND - 0.5) player.vy = -430
    }
    this.keyHandler = (e) => {
      if (e.code === 'Space') { e.preventDefault(); jump() }
    }
    document.addEventListener('keydown', this.keyHandler)
    canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); jump() })

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
        // Collision (player fixed at x=60). One crash ends the run, so stop at
        // the first hit rather than paying out once per overlapping cactus.
        for (const o of obstacles) {
          if (alive && 60 + player.w > o.x && 60 < o.x + o.w && player.y > GROUND - o.h) {
            alive = false
            const points = Math.floor(score)
            status.textContent = `💥 Wiped out at ${points} points!`
            const cleared = points >= 150
            const prize = cleared
              ? this.award([
                { itemId: ItemId.Gold, count: Math.min(20, Math.floor(points / 40) * 4) },
                { itemId: ItemId.CookedFish, count: 1 },
              ])
              : null
            this.showResult(
              cleared,
              cleared ? `🏁 ${points} points — you made it!` : `💥 Wiped out at ${points} points`,
              cleared ? 'The longer the run, the more gold it pays.' : 'Reach 150 points to win a prize — the cacti speed up, so jump early.',
              prize,
              [{ label: '↻ Run again', onClick: () => this.startRunner(), alt: true }],
            )
          }
        }
        status.textContent = alive ? `Score: ${Math.floor(score)}` : status.textContent
      }

      // Draw
      ctx.fillStyle = '#0e1220'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      // Parallax dunes, so the track reads as a place rather than a void.
      ctx.fillStyle = '#161d33'
      for (let i = 0; i < 4; i++) {
        const bx = ((i * 160 - (score * 6) % 640) + 640) % 640 - 80
        ctx.beginPath()
        ctx.ellipse(bx, GROUND + 4, 90, 34, 0, Math.PI, 0)
        ctx.fill()
      }
      ctx.fillStyle = '#3a7a4a'
      ctx.fillRect(0, GROUND + 1, canvas.width, 4)
      ctx.fillStyle = alive ? '#ffd34d' : '#c0392b'
      ctx.fillRect(60, player.y - player.h, player.w, player.h)
      ctx.fillStyle = '#27ae60'
      for (const o of obstacles) {
        ctx.fillRect(o.x, GROUND - o.h, o.w, o.h)
        // Cactus arms — a silhouette beats a plain rectangle.
        ctx.fillRect(o.x - 5, GROUND - o.h * 0.7, 5, o.w * 0.4)
        ctx.fillRect(o.x + o.w, GROUND - o.h * 0.85, 5, o.w * 0.4)
      }
      if (alive) this.runnerRaf = requestAnimationFrame(loop)
    }
    loop()
  }

  // ------------------------------------------------------------ 3. math

  private startMath(): void {
    this.frame('arcadeMath')
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
      status.textContent = `${correct}/10 correct`
      const won = correct >= 6
      const prize = won
        ? this.award(correct === 10
          ? [{ itemId: ItemId.Gold, count: 25 }, { itemId: ItemId.FishStew, count: 1 }]
          : [{ itemId: ItemId.Gold, count: correct * 2 }])
        : null
      this.showResult(
        won,
        won ? `🎯 ${correct}/10 correct!` : `🎯 ${correct}/10 correct`,
        won
          ? correct === 10 ? 'A perfect round — top prize tier.' : 'Every extra correct answer pays more gold.'
          : 'Score 6 or more to earn a prize — the questions ramp from + and − to × and ÷.',
        prize,
        [{ label: '↻ Play again', onClick: () => this.startMath(), alt: true }],
      )
    }

    const nextQuestion = () => {
      if (done) return
      if (qIndex >= 10 || lives <= 0) { finish(); return }
      qIndex++
      status.textContent = `Q${qIndex}/10   ${'❤'.repeat(lives)}${'♡'.repeat(3 - lives)}   ✔ ${correct}`
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
        t.style.left = `${6 + i * 23 + Math.random() * 4}%`
        t.style.top = `${14 + Math.random() * 48}%`
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
    this.frame('arcadeWord')
    const pick = WORDS[Math.floor(Math.random() * WORDS.length)]
    const hint = this.el('div', 'mc-arc-hint', `💡 Hint: ${pick.hint}`)
    const status = this.el('div', 'mc-arc-status', '❤❤❤❤❤❤')
    const wordEl = this.el('div', 'mc-arc-word')
    const kb = this.el('div', 'mc-arc-kb')
    this.body.append(hint, status, wordEl, kb)

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
        const flawless = lives === 6
        const prize = this.award(flawless
          ? [{ itemId: ItemId.Gold, count: 15 }, { itemId: ItemId.Apple, count: 3 }]
          : [{ itemId: ItemId.Gold, count: 6 + lives }, { itemId: ItemId.Apple, count: 1 }])
        this.showResult(
          true,
          `✨ ${pick.word} — you got it!`,
          flawless ? 'Not a single wrong guess — top prize tier.' : `${6 - lives} wrong guess${6 - lives === 1 ? '' : 'es'}; a clean round pays more.`,
          prize,
          [{ label: '↻ New word', onClick: () => this.startWord(), alt: true }],
        )
      } else if (lives <= 0) {
        done = true
        wordEl.textContent = pick.word
        this.showResult(
          false,
          `The word was ${pick.word}`,
          'Out of guesses — the hint narrows it down fast, so read it before picking letters.',
          null,
          [{ label: '↻ New word', onClick: () => this.startWord(), alt: true }],
        )
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
