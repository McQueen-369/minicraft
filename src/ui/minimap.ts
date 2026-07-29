import { WATER_LEVEL } from '../constants'
import type { Terrain } from '../world/terrain'
import type { WorldKind } from '../world/worldKind'
import { revealPane } from './theme'

export interface MapMarker {
  x: number
  z: number
  color: string
}

/** A square, north-up window on the world: centre + half-extent in blocks. */
export interface MapView {
  cx: number
  cz: number
  half: number
}

/** A landmark plotted on the map. */
interface Landmark {
  x: number
  z: number
  label: string
  color: string
  draw: (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => void
}

const MINI_CSS = 132 // on-screen size of the corner map
const MINI_PIX = 264 // backing store — icons and arrows stay crisp when scaled
const MINI_SAMPLES = 88 // terrain samples per axis (keeps heightAt cheap)
const MINI_HALF = 64 // world blocks from centre to edge

const BIG_CSS = 500
const BIG_PIX = 660
const BIG_SAMPLES = 220
/** Never zoom the expanded map in tighter than this, however close things are. */
const BIG_MIN_HALF = 110
/** Breathing room around the fitted bounding box (1.0 = icons touch the edge). */
const BIG_PAD = 1.3
/** Snap the zoom to steps so the view doesn't visibly breathe as you walk. */
const BIG_QUANTUM = 40

const REDRAW_INTERVAL = 0.25 // seconds

const HOME_COLOR = '#f4d35e'
const ISLAND_COLOR = '#ff5fa2'

const STYLE = `
.mc-minimap {
  position: absolute; top: 12px; right: 12px; z-index: 7;
  width: var(--mc-map, ${MINI_CSS}px); overflow: hidden; cursor: pointer;
  border-radius: var(--mc-radius, 16px);
  border: 1px solid var(--mc-stroke, rgba(255,255,255,0.12));
  box-shadow: var(--mc-shadow-sm, 0 6px 18px rgba(0,0,0,0.35)), var(--mc-sheen, none);
  background: var(--mc-surface-soft, rgba(16,19,26,0.52));
  -webkit-backdrop-filter: var(--mc-blur-soft, blur(12px));
  backdrop-filter: var(--mc-blur-soft, blur(12px));
  transition: border-color 0.16s var(--mc-ease, ease), transform 0.16s var(--mc-ease, ease);
  -webkit-tap-highlight-color: transparent;
}
.mc-minimap:hover { border-color: var(--mc-stroke-strong, rgba(255,255,255,0.26)); }
.mc-minimap:active { transform: scale(0.985); }
.mc-minimap canvas {
  width: 100%; height: var(--mc-map, ${MINI_CSS}px); display: block; image-rendering: pixelated;
}
/* Narrow phones: keep the radar from eating a third of the screen width. */
@media (max-width: 470px) { :root { --mc-map: 112px; } }
.mc-minimap-tag {
  position: absolute; left: 0; top: 0; padding: 3px 9px;
  font-family: var(--mc-font, sans-serif); font-size: var(--mc-fs-2xs, 14px);
  font-weight: 600; letter-spacing: 1.2px; color: var(--mc-text, #fff);
  background: rgba(10,12,16,0.55); border-bottom-right-radius: var(--mc-radius-sm, 10px);
  pointer-events: none;
}
/* Distances to the fixed landmarks, in readable DOM text rather than a few
   pixels of canvas lettering. */
.mc-minimap-dist {
  display: flex; justify-content: space-around; gap: 4px; padding: 5px 6px;
  font-family: var(--mc-font-mono, monospace); font-size: var(--mc-fs-2xs, 14px);
  font-weight: 600; color: var(--mc-text-dim, #ccc);
  border-top: 1px solid var(--mc-stroke, rgba(255,255,255,0.12));
  pointer-events: none; white-space: nowrap;
}
.mc-map-overlay {
  position: absolute; inset: 0; z-index: 21;
  display: none; align-items: center; justify-content: center; padding: 16px;
}
.mc-map-box {
  padding: 18px 20px; max-width: 95vw; max-height: 94vh; overflow-y: auto;
}
.mc-map-box h3 {
  margin: 0 0 12px; font-size: var(--mc-fs-xs, 14px); font-weight: 600;
  letter-spacing: 1.2px; text-transform: uppercase; color: var(--mc-text-faint, #888);
}
.mc-map-box canvas {
  display: block; width: ${BIG_CSS}px; max-width: min(86vw, 62vh); height: auto;
  aspect-ratio: 1; image-rendering: pixelated;
  border: 1px solid var(--mc-stroke, rgba(255,255,255,0.12));
  border-radius: var(--mc-radius-sm, 10px);
}
.mc-map-coords {
  display: flex; flex-wrap: wrap; gap: 4px 16px; margin-top: 12px;
  font-size: var(--mc-fs-sm, 16px); font-weight: 600; line-height: 1.6;
  color: var(--mc-text, #fff);
}
.mc-map-scale { font-size: var(--mc-fs-xs, 14px); color: var(--mc-text-faint, #888); margin-top: 6px; }
.mc-map-legend {
  display: flex; flex-wrap: wrap; gap: 4px 16px; margin-top: 12px;
  font-size: var(--mc-fs-xs, 14px); line-height: 1.8; color: var(--mc-text-dim, #ccc);
}
.mc-map-legend .lg {
  display: inline-flex; align-items: center; gap: var(--mc-gap-badge, 8px); white-space: nowrap;
}
.mc-map-legend .sw {
  width: 0.85em; height: 0.85em; flex: 0 0 auto; border-radius: 3px;
  border: 1px solid rgba(255,255,255,0.25);
}
.mc-map-close { margin-top: 16px; }
`

/**
 * Frame a view that contains every point with margin to spare.
 *
 * The expanded map used to be pinned to a fixed centre and a fixed span, which
 * meant anything outside that span — the player once they wandered far, or the
 * secret island on a seed that placed it wide — got clamped onto the border and
 * stopped telling the truth about where it was. Fitting the view to the points
 * instead means every icon always sits at its real coordinate.
 */
export function fitView(
  points: { x: number; z: number }[],
  minHalf = BIG_MIN_HALF,
  pad = BIG_PAD,
  quantum = BIG_QUANTUM,
): MapView {
  if (points.length === 0) return { cx: 0, cz: 0, half: minHalf }
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  for (const p of points) {
    minX = Math.min(minX, p.x)
    maxX = Math.max(maxX, p.x)
    minZ = Math.min(minZ, p.z)
    maxZ = Math.max(maxZ, p.z)
  }
  const need = (Math.max(maxX - minX, maxZ - minZ) / 2) * pad
  return {
    cx: Math.round((minX + maxX) / 2),
    cz: Math.round((minZ + maxZ) / 2),
    half: Math.max(minHalf, Math.ceil(need / quantum) * quantum),
  }
}

/** World position → canvas pixel, with no clamping: `inside` reports the truth. */
export function projectPoint(
  p: { x: number; z: number },
  view: MapView,
  size: number,
  margin = 0,
): { sx: number; sy: number; inside: boolean } {
  const step = (view.half * 2) / size
  const sx = (p.x - view.cx) / step + size / 2
  const sy = (p.z - view.cz) / step + size / 2
  const inside = sx >= margin && sx <= size - margin && sy >= margin && sy <= size - margin
  return { sx, sy, inside }
}

/**
 * Where the ray from the map's centre towards an off-map point crosses the
 * border, plus the heading to point an arrow along. Used to show direction to
 * a landmark that genuinely is off the edge — an arrow, never the landmark's
 * own icon, so an off-map marker is never mistaken for "it's right there".
 */
export function edgePoint(
  sx: number,
  sy: number,
  size: number,
  inset: number,
): { x: number; y: number; angle: number } {
  const c = size / 2
  const dx = sx - c
  const dy = sy - c
  const limit = c - inset
  const mag = Math.max(Math.abs(dx), Math.abs(dy), 1e-6)
  const t = limit / mag
  return { x: c + dx * t, y: c + dy * t, angle: Math.atan2(dy, dx) }
}

/** Top-down navigation map: a mini view in the corner that expands on click. */
export class Minimap {
  private readonly container: HTMLDivElement
  private readonly miniCanvas: HTMLCanvasElement
  private readonly distStrip: HTMLDivElement
  private readonly overlay: HTMLDivElement
  private readonly bigCanvas: HTMLCanvasElement
  private readonly coordsEl: HTMLDivElement
  private readonly scaleEl: HTMLDivElement
  /** Reused offscreen buffer the terrain is sampled into before upscaling. */
  private readonly scratch: HTMLCanvasElement
  private redrawIn = 0
  private terrain: Terrain | null = null
  private readonly surfaceSwatch!: HTMLSpanElement
  private readonly surfaceLabel!: Text
  private pos = { x: 0, z: 0 }
  private yaw = 0
  private markers: MapMarker[] = []
  private home: { x: number; z: number } | null = null
  private island: { x: number; z: number } | null = null

  constructor(root: HTMLElement) {
    const style = document.createElement('style')
    style.textContent = STYLE
    document.head.appendChild(style)

    this.scratch = document.createElement('canvas')

    this.container = document.createElement('div')
    this.container.className = 'mc-minimap'
    this.container.style.display = 'none'
    this.miniCanvas = document.createElement('canvas')
    this.miniCanvas.width = MINI_PIX
    this.miniCanvas.height = MINI_PIX
    const tag = document.createElement('div')
    tag.className = 'mc-minimap-tag'
    tag.textContent = 'MAP'
    this.distStrip = document.createElement('div')
    this.distStrip.className = 'mc-minimap-dist'
    this.container.append(this.miniCanvas, tag, this.distStrip)
    root.appendChild(this.container)

    this.overlay = document.createElement('div')
    this.overlay.className = 'mc-map-overlay mc-scrim'
    const box = document.createElement('div')
    box.className = 'mc-map-box mc-glass mc-pane-in'
    const title = document.createElement('h3')
    title.textContent = 'Navigation Map'
    this.bigCanvas = document.createElement('canvas')
    this.bigCanvas.width = BIG_PIX
    this.bigCanvas.height = BIG_PIX
    this.coordsEl = document.createElement('div')
    this.coordsEl.className = 'mc-map-coords'
    this.scaleEl = document.createElement('div')
    this.scaleEl.className = 'mc-map-scale'
    const legend = document.createElement('div')
    legend.className = 'mc-map-legend'
    // Built as flex items rather than one text run: a wrapping line must never
    // orphan a colour swatch from the thing it labels.
    for (const [color, text] of [
      ['#d23b3b', 'You (arrow shows facing)'],
      [HOME_COLOR, '🏠 Home'],
      [ISLAND_COLOR, '🏝 Challenge Island (mini-games!)'],
      ['#ffd34d', 'Animals'],
      ['#7ad0ff', 'Players'],
      ['#2e6fae', 'Water'],
      ['#d9cfa0', 'Sand'],
      [SURFACE_SWATCH.terrain, SURFACE_LABEL.terrain],
      ['#9a9a9a', 'Hills'],
    ] as const) {
      const item = document.createElement('span')
      item.className = 'lg'
      const sw = document.createElement('span')
      sw.className = 'sw'
      sw.style.background = color
      item.append(sw, document.createTextNode(text))
      // The open-ground swatch is restyled per world kind once a world loads.
      if (text === SURFACE_LABEL.terrain) {
        this.surfaceSwatch = sw
        this.surfaceLabel = item.lastChild as Text
      }
      legend.appendChild(item)
    }
    const close = document.createElement('button')
    close.className = 'mc-map-close mc-ui-btn'
    close.textContent = 'Close'
    box.append(title, this.bigCanvas, this.coordsEl, this.scaleEl, legend, close)
    this.overlay.appendChild(box)
    root.appendChild(this.overlay)

    const open = (e: Event) => { e.preventDefault(); this.openBig() }
    this.container.addEventListener('click', open)
    this.container.addEventListener('touchstart', open, { passive: false })
    const closeBig = (e: Event) => { e.preventDefault(); this.closeMap() }
    close.addEventListener('click', closeBig)
    close.addEventListener('touchstart', closeBig, { passive: false })
    this.overlay.addEventListener('mousedown', (e) => { if (e.target === this.overlay) this.closeMap() })
  }

  /** Mark the player's home (starter house) so it shows on the map. */
  setHome(x: number, z: number): void {
    this.home = { x, z }
  }

  /** Mark the challenge island (arcade mini-games) so players can find it. */
  setIsland(x: number, z: number): void {
    this.island = { x, z }
  }

  show(): void { this.container.style.display = '' }

  hide(): void {
    this.container.style.display = 'none'
    this.closeMap()
  }

  /** Called when the full map opens, so the game can free the mouse cursor. */
  onMapOpen: () => void = () => {}
  /** Called when the full map closes, so the game can re-lock the pointer. */
  onMapClose: () => void = () => {}

  get isBigOpen(): boolean {
    return this.overlay.style.display === 'flex'
  }

  private openBig(): void {
    if (this.isBigOpen) return
    this.overlay.style.display = 'flex'
    revealPane(this.overlay.firstElementChild as HTMLElement)
    this.drawBig()
    this.onMapOpen()
  }

  closeMap(): void {
    if (!this.isBigOpen) return
    this.overlay.style.display = 'none'
    this.onMapClose()
  }

  toggleMap(): void {
    if (this.isBigOpen) this.closeMap()
    else this.openBig()
  }

  update(terrain: Terrain, pos: { x: number; z: number }, yaw: number, markers: MapMarker[], dt: number): void {
    if (terrain !== this.terrain) {
      this.surfaceSwatch.style.background = SURFACE_SWATCH[terrain.kind]
      this.surfaceLabel.data = SURFACE_LABEL[terrain.kind]
    }
    this.terrain = terrain
    this.pos = { x: pos.x, z: pos.z }
    this.yaw = yaw
    this.markers = markers
    this.redrawIn -= dt
    if (this.redrawIn > 0) return
    this.redrawIn = REDRAW_INTERVAL
    this.drawMini()
    if (this.isBigOpen) this.drawBig()
  }

  private landmarks(): Landmark[] {
    const out: Landmark[] = []
    if (this.home) out.push({ ...this.home, label: 'Home', color: HOME_COLOR, draw: drawHouseIcon })
    if (this.island) out.push({ ...this.island, label: 'Island', color: ISLAND_COLOR, draw: drawIslandIcon })
    return out
  }

  /** Corner radar: always centred on the player, so it scrolls with them. */
  private drawMini(): void {
    const ctx = this.miniCanvas.getContext('2d')
    if (!this.terrain || !ctx) return
    const view: MapView = { cx: this.pos.x, cz: this.pos.z, half: MINI_HALF }
    this.drawTerrain(ctx, view, MINI_SAMPLES, MINI_PIX)

    const iconR = 13
    for (const lm of this.landmarks()) {
      const { sx, sy, inside } = projectPoint(lm, view, MINI_PIX, iconR + 4)
      // In view → the real icon at its real spot. Out of view → an arrow on the
      // border pointing the way, which reads as "that direction" rather than
      // pretending the landmark is parked on the edge.
      if (inside) lm.draw(ctx, sx, sy, iconR)
      else {
        const e = edgePoint(sx, sy, MINI_PIX, 14)
        drawEdgeArrow(ctx, e.x, e.y, e.angle, lm.color)
      }
    }

    for (const m of this.markers) {
      const { sx, sy, inside } = projectPoint(m, view, MINI_PIX)
      if (!inside) continue
      dot(ctx, sx, sy, 5, m.color)
    }

    drawPlayerArrow(ctx, MINI_PIX / 2, MINI_PIX / 2, this.yaw, 14)
    this.updateDistances()
  }

  /**
   * Expanded map: framed to hold the player and every landmark at once, so
   * nothing is ever clamped and every icon sits on its true coordinate. The
   * view re-fits (in zoom steps) as the player travels.
   */
  private drawBig(): void {
    const ctx = this.bigCanvas.getContext('2d')
    if (!this.terrain || !ctx) return
    const marks = this.landmarks()
    const view = fitView([this.pos, ...marks.map((l) => ({ x: l.x, z: l.z }))])
    this.drawTerrain(ctx, view, BIG_SAMPLES, BIG_PIX)

    const player = projectPoint(this.pos, view, BIG_PIX)

    // Faint route lines from the player to each landmark: they make the real
    // bearing obvious at a glance, and they move because the player does.
    ctx.save()
    ctx.setLineDash([7, 7])
    ctx.lineWidth = 2
    for (const lm of marks) {
      const p = projectPoint(lm, view, BIG_PIX)
      ctx.strokeStyle = lm.color + 'aa'
      ctx.beginPath()
      ctx.moveTo(player.sx, player.sy)
      ctx.lineTo(p.sx, p.sy)
      ctx.stroke()
    }
    ctx.restore()

    for (const m of this.markers) {
      const { sx, sy, inside } = projectPoint(m, view, BIG_PIX)
      if (!inside) continue
      dot(ctx, sx, sy, 5, m.color)
    }

    const iconR = 17
    for (const lm of marks) {
      const p = projectPoint(lm, view, BIG_PIX)
      lm.draw(ctx, p.sx, p.sy, iconR)
      label(ctx, `${lm.label} ${Math.round(lm.x)}, ${Math.round(lm.z)}`, p.sx, p.sy - iconR - 16, lm.color)
    }

    drawPlayerArrow(ctx, player.sx, player.sy, this.yaw, 18)
    label(ctx, `You ${Math.round(this.pos.x)}, ${Math.round(this.pos.z)}`, player.sx, player.sy + 36, '#ffdede')

    this.coordsEl.textContent = ''
    this.coordsEl.append(
      coordChip('🧍 You', `${Math.round(this.pos.x)}, ${Math.round(this.pos.z)}`, '#8b2020'),
      ...marks.map((lm) =>
        coordChip(
          lm.label === 'Home' ? '🏠 Home' : '🏝 Island',
          `${Math.round(lm.x)}, ${Math.round(lm.z)} · ${distance(this.pos, lm)} blocks away`,
          '#333',
        ),
      ),
    )
    this.scaleEl.textContent = `View ${view.half * 2} × ${view.half * 2} blocks — auto-zoomed to keep everything in frame.`
    this.updateDistances()
  }

  /** Terrain colours sampled at low res, then upscaled for crisp overlays. */
  private drawTerrain(ctx: CanvasRenderingContext2D, view: MapView, samples: number, pix: number): void {
    const terrain = this.terrain
    if (!terrain) return
    const s = this.scratch
    s.width = samples
    s.height = samples
    const sctx = s.getContext('2d')
    if (!sctx) return
    const img = sctx.createImageData(samples, samples)
    const step = (view.half * 2) / samples
    let i = 0
    for (let py = 0; py < samples; py++) {
      const wz = view.cz - view.half + (py + 0.5) * step
      for (let px = 0; px < samples; px++) {
        const wx = view.cx - view.half + (px + 0.5) * step
        const [r, g, b] = terrainColor(terrain.heightAt(Math.round(wx), Math.round(wz)), terrain.kind)
        img.data[i++] = r
        img.data[i++] = g
        img.data[i++] = b
        img.data[i++] = 255
      }
    }
    sctx.putImageData(img, 0, 0)
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, pix, pix)
    ctx.drawImage(s, 0, 0, samples, samples, 0, 0, pix, pix)
  }

  /** Live distance readout under the corner map. */
  private updateDistances(): void {
    const parts: string[] = []
    if (this.home) parts.push(`🏠 ${distance(this.pos, this.home)}`)
    if (this.island) parts.push(`🏝 ${distance(this.pos, this.island)}`)
    const text = parts.join('   ')
    if (this.distStrip.textContent !== text) this.distStrip.textContent = text
  }
}

function distance(a: { x: number; z: number }, b: { x: number; z: number }): number {
  return Math.round(Math.hypot(a.x - b.x, a.z - b.z))
}

function coordChip(name: string, value: string, color: string): HTMLSpanElement {
  const el = document.createElement('span')
  el.style.color = color
  el.textContent = `${name}: ${value}`
  return el
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
  ctx.fillStyle = color
  ctx.strokeStyle = 'rgba(0,0,0,0.55)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
}

/** Outlined caption under a map icon, readable over any terrain colour. */
function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string): void {
  ctx.save()
  ctx.font = 'bold 17px "Courier New", monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineWidth = 4
  ctx.strokeStyle = 'rgba(0,0,0,0.85)'
  ctx.strokeText(text, x, y)
  ctx.fillStyle = color
  ctx.fillText(text, x, y)
  ctx.restore()
}

/** A little house glyph: walls with a peaked roof, outlined for contrast. */
function drawHouseIcon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.lineJoin = 'round'
  ctx.lineWidth = Math.max(1.5, r * 0.16)
  ctx.strokeStyle = '#3a2a12'
  // Walls.
  ctx.fillStyle = HOME_COLOR
  ctx.beginPath()
  ctx.rect(-r * 0.62, 0, r * 1.24, r * 0.9)
  ctx.fill()
  ctx.stroke()
  // Door.
  ctx.fillStyle = '#8a5a2b'
  ctx.fillRect(-r * 0.18, r * 0.28, r * 0.36, r * 0.62)
  // Roof.
  ctx.beginPath()
  ctx.moveTo(-r, 0)
  ctx.lineTo(0, -r)
  ctx.lineTo(r, 0)
  ctx.closePath()
  ctx.fillStyle = '#c1440e'
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

/** A flag on a pole planted in a sandy mound: the challenge island. */
function drawIslandIcon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.lineJoin = 'round'
  // Sandy mound base.
  ctx.fillStyle = '#d9cfa0'
  ctx.strokeStyle = '#3a2a12'
  ctx.lineWidth = Math.max(1, r * 0.11)
  ctx.beginPath()
  ctx.ellipse(0, r * 0.7, r, r * 0.45, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  // Pole.
  ctx.lineWidth = Math.max(1.5, r * 0.15)
  ctx.beginPath()
  ctx.moveTo(0, r * 0.7)
  ctx.lineTo(0, -r)
  ctx.stroke()
  // Pennant flag.
  ctx.fillStyle = ISLAND_COLOR
  ctx.beginPath()
  ctx.moveTo(0, -r)
  ctx.lineTo(r * 1.1, -r * 0.55)
  ctx.lineTo(0, -r * 0.1)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

/** Border arrow for a landmark that is off the current view. */
function drawEdgeArrow(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, color: string): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.fillStyle = color
  ctx.strokeStyle = 'rgba(0,0,0,0.8)'
  ctx.lineWidth = 2
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(11, 0)
  ctx.lineTo(-7, -9)
  ctx.lineTo(-3, 0)
  ctx.lineTo(-7, 9)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

function drawPlayerArrow(ctx: CanvasRenderingContext2D, x: number, y: number, yaw: number, r: number): void {
  const ang = Math.atan2(-Math.cos(yaw), -Math.sin(yaw))
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(ang + Math.PI / 2)
  ctx.fillStyle = '#d23b3b'
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 2
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(0, -r)
  ctx.lineTo(r * 0.66, r * 0.7)
  ctx.lineTo(0, r * 0.3)
  ctx.lineTo(-r * 0.66, r * 0.7)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

/** Legend swatch and label for a world's open ground. */
const SURFACE_SWATCH: Record<WorldKind, string> = { terrain: '#5cab46', robot: '#8f9aa6' }
const SURFACE_LABEL: Record<WorldKind, string> = { terrain: 'Grass', robot: 'Metal panelling' }

function terrainColor(h: number, kind: WorldKind = 'terrain'): [number, number, number] {
  if (h <= WATER_LEVEL) return [46, 111, 174] // water
  if (h <= WATER_LEVEL + 1) return [217, 207, 160] // sand
  if (h >= 62) return [232, 232, 232] // snowy peaks
  if (h >= 52) return [154, 154, 154] // bare stone hills
  // Open ground, darkening with elevation: grass, or alloy decking in a robot world.
  const t = Math.min(1, (h - (WATER_LEVEL + 2)) / 26)
  if (kind === 'robot') {
    return [Math.round(143 - t * 45), Math.round(154 - t * 48), Math.round(166 - t * 50)]
  }
  return [Math.round(92 - t * 30), Math.round(171 - t * 60), Math.round(70 - t * 25)]
}
