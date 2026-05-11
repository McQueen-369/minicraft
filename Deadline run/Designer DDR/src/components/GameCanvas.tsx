import { useRef, useEffect, useState } from 'react'
import type { BeatMap, GameState, GhostState } from '../game/types'
import { useGameEngine } from '../game/useGameEngine'
import { LANE_GLYPHS, LANE_KEYS, ARROW_SIZE, TARGET_Y_RATIO, LANE_COUNT, FALL_MS } from '../game/constants'

const COLORS = { bg: '#f5f0e8', ink: '#0a0a0a', grey: '#696255', dim: 'rgba(10,10,10,0.2)' }
const CANVAS_W = 280
const CANVAS_H = 480

interface Props {
  beatMap: BeatMap
  audioBuffer: AudioBuffer
  isMultiplayer: boolean
  startAtMs?: number
  onGhostBroadcast?: (ghost: GhostState) => void
  ghostState?: GhostState | null
  onGameEnd: (state: GameState) => void
  onHitReady?: (fn: (lane: number) => void) => void
}

export function GameCanvas({ beatMap, audioBuffer, isMultiplayer, startAtMs, onGhostBroadcast, ghostState, onGameEnd, onHitReady }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [displayState, setDisplayState] = useState<GameState | null>(null)
  const endCalledRef = useRef(false)

  const { hit, stateRef } = useGameEngine({
    beatMap,
    audioBuffer,
    canvasHeight: CANVAS_H,
    startAtMs,
    onGhostBroadcast,
    onStateSnapshot: (state) => {
      setDisplayState(state)
      if (!state.isPlaying && !endCalledRef.current && state.songElapsed > 0) {
        endCalledRef.current = true
        onGameEnd(state)
      }
    },
  })

  // Deliver hit callback to parent (for mobile controls)
  useEffect(() => {
    onHitReady?.(hit)
  }, [hit, onHitReady])

  // Keyboard controls — desktop arrow keys
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const idx = LANE_KEYS.indexOf(e.code as typeof LANE_KEYS[number])
      if (idx !== -1) { e.preventDefault(); hit(idx) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [hit])

  // Canvas draw loop — own rAF, reads stateRef directly for smooth rendering
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx2d = canvas.getContext('2d')!
    let rafId: number

    const LANE_W = ARROW_SIZE + 10
    const totalW = LANE_COUNT * LANE_W
    const startX = (CANVAS_W - totalW) / 2
    const targetY = CANVAS_H * TARGET_Y_RATIO

    function draw() {
      const state = stateRef.current

      // Background
      ctx2d.fillStyle = COLORS.bg
      ctx2d.fillRect(0, 0, CANVAS_W, CANVAS_H)

      // Target receptors
      for (let i = 0; i < LANE_COUNT; i++) {
        const x = startX + i * LANE_W + LANE_W / 2
        ctx2d.strokeStyle = COLORS.dim
        ctx2d.lineWidth = 2
        ctx2d.strokeRect(x - ARROW_SIZE / 2, targetY - ARROW_SIZE / 2, ARROW_SIZE, ARROW_SIZE)
        ctx2d.fillStyle = COLORS.dim
        ctx2d.font = `${Math.round(ARROW_SIZE * 0.6)}px sans-serif`
        ctx2d.textAlign = 'center'
        ctx2d.textBaseline = 'middle'
        ctx2d.fillText(LANE_GLYPHS[i], x, targetY)
      }

      // Falling arrows
      const elapsedMs = state.songElapsed * 1000
      for (const arrow of state.arrows) {
        if (arrow.hitTime !== undefined || arrow.missed) continue
        const pct = (elapsedMs - arrow.spawnTime) / FALL_MS
        const arrowY = pct * targetY
        if (arrowY < -ARROW_SIZE || arrowY > targetY + ARROW_SIZE) continue

        const x = startX + arrow.lane * LANE_W + LANE_W / 2
        ctx2d.fillStyle = COLORS.ink
        ctx2d.fillRect(x - ARROW_SIZE / 2, arrowY - ARROW_SIZE / 2, ARROW_SIZE, ARROW_SIZE)
        ctx2d.fillStyle = COLORS.bg
        ctx2d.font = `${Math.round(ARROW_SIZE * 0.6)}px sans-serif`
        ctx2d.textAlign = 'center'
        ctx2d.textBaseline = 'middle'
        ctx2d.fillText(LANE_GLYPHS[arrow.lane], x, arrowY)
      }

      rafId = requestAnimationFrame(draw)
    }

    rafId = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafId)
  }, [stateRef])

  const state = displayState

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', userSelect: 'none' }}>
      {/* Header */}
      <div style={{
        width: CANVAS_W,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px 12px',
        border: `1.5px solid ${COLORS.ink}`,
        borderBottom: 'none',
        background: COLORS.bg,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: COLORS.grey }}>Score</div>
          <div style={{ fontSize: 20, fontWeight: 900 }}>{(state?.score ?? 0).toLocaleString()}</div>
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2 }}>DEADLINE DASH</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: COLORS.grey }}>Combo</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>×{state?.combo ?? 0}</div>
        </div>
      </div>

      {/* Canvas + ghost panel */}
      <div style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ display: 'block', border: `1.5px solid ${COLORS.ink}` }}
        />
        {isMultiplayer && ghostState && <GhostPanel ghost={ghostState} />}

        {/* Judgment flash */}
        {state?.lastJudgment && (
          <div style={{
            position: 'absolute',
            top: '55%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: 13,
            fontWeight: 900,
            letterSpacing: 2,
            pointerEvents: 'none',
            opacity: 0.85,
            color: COLORS.ink,
          }}>
            {state.lastJudgment}
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ width: CANVAS_W, border: `1.5px solid ${COLORS.ink}`, borderTop: 'none' }}>
        <div style={{ height: 3, background: 'rgba(10,10,10,0.1)' }}>
          <div style={{
            height: '100%',
            background: COLORS.ink,
            width: state && state.songDuration > 0
              ? `${Math.min(100, (state.songElapsed / state.songDuration) * 100)}%`
              : '0%',
            transition: 'width 0.1s linear',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 12px', fontSize: 8, color: COLORS.grey }}>
          <span>{beatMap.title}</span>
          <span>{formatTime(state?.songElapsed ?? 0)} / {formatTime(state?.songDuration ?? 0)}</span>
        </div>
      </div>
    </div>
  )
}

function GhostPanel({ ghost }: { ghost: GhostState }) {
  return (
    <div style={{
      position: 'absolute', top: 8, right: 8,
      width: 80, border: `1.5px solid ${COLORS.ink}`, borderRadius: 4,
      background: COLORS.bg, boxShadow: '2px 2px 0 rgba(10,10,10,0.12)',
    }}>
      <div style={{
        background: COLORS.ink, color: COLORS.bg,
        padding: '3px 6px', display: 'flex', justifyContent: 'space-between',
        fontSize: 8, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
      }}>
        <span>Opponent</span>
        <span style={{ color: '#aaa' }}>● LIVE</span>
      </div>
      <div style={{ padding: '5px 5px 4px' }}>
        <div style={{ display: 'flex', gap: 2, justifyContent: 'center', marginBottom: 4 }}>
          {[0, 1, 2, 3].map((lane) => {
            const pos = ghost.arrowPositions.find((p) => p.lane === lane)
            return (
              <div key={lane} style={{
                width: 14, height: 40, position: 'relative',
                border: '1px solid rgba(10,10,10,0.15)', borderRadius: 2,
              }}>
                {pos && (
                  <div style={{
                    position: 'absolute',
                    top: `${pos.progress * 70}%`,
                    left: 0, right: 0, height: 10,
                    background: COLORS.ink, borderRadius: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: COLORS.bg, fontSize: 6,
                  }}>
                    {LANE_GLYPHS[lane]}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div style={{ fontSize: 9, fontWeight: 700, textAlign: 'center', borderTop: '1px solid rgba(10,10,10,0.1)', paddingTop: 3 }}>
          {ghost.score.toLocaleString()}
        </div>
        <div style={{ fontSize: 7, textAlign: 'center', color: COLORS.grey, marginTop: 1, letterSpacing: 0.5 }}>
          ×{ghost.combo} · {ghost.lastJudgment ?? '—'}
        </div>
      </div>
    </div>
  )
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = String(Math.floor(sec % 60)).padStart(2, '0')
  return `${m}:${s}`
}
