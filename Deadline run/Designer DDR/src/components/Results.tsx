import { useState } from 'react'
import { saveScore } from '../game/supabase'
import type { GameState } from '../game/types'

interface Props {
  state: GameState
  songId: string
  playerName: string
  isMultiplayer: boolean
  opponentScore?: number
  onPlayAgain: () => void
  onChangeSong: () => void
  onLeaderboard: () => void
}

export function Results({ state, songId, playerName, isMultiplayer, opponentScore, onPlayAgain, onChangeSong, onLeaderboard }: Props) {
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await saveScore({
        songId,
        playerName,
        score: state.score,
        perfectCount: state.perfectCount,
        goodCount: state.goodCount,
        missCount: state.missCount,
        maxCombo: state.maxCombo,
      })
      setSaved(true)
    } catch {
      // score save is non-critical
    }
    setSaving(false)
  }

  const result = isMultiplayer && opponentScore !== undefined
    ? state.score > opponentScore ? 'YOU WIN'
    : state.score < opponentScore ? 'YOU LOSE'
    : 'DRAW'
    : null

  return (
    <div style={{ minHeight: '100vh', background: '#f5f0e8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 32 }}>
      <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 4, textTransform: 'uppercase' }}>Results</div>

      {result && (
        <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 4, border: '2px solid #0a0a0a', padding: '8px 24px', borderRadius: 4 }}>
          {result}
        </div>
      )}

      <div style={{ border: '1.5px solid #0a0a0a', borderRadius: 4, width: 280 }}>
        <StatRow label="Score" value={state.score.toLocaleString()} large />
        <StatRow label="Perfect" value={String(state.perfectCount)} />
        <StatRow label="Good" value={String(state.goodCount)} />
        <StatRow label="Miss" value={String(state.missCount)} />
        <StatRow label="Max Combo" value={`×${state.maxCombo}`} last />
      </div>

      {!saved && (
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ width: 280, padding: '10px 0', background: '#0a0a0a', color: '#f5f0e8', border: 'none', borderRadius: 3, fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer', opacity: saving ? 0.5 : 1 }}
        >
          {saving ? 'Saving…' : `Save as ${playerName}`}
        </button>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onPlayAgain} style={smallBtn}>Play Again</button>
        <button onClick={onChangeSong} style={smallBtn}>Change Song</button>
        <button onClick={onLeaderboard} style={smallBtn}>Leaderboard</button>
      </div>
    </div>
  )
}

function StatRow({ label, value, large, last }: { label: string; value: string; large?: boolean; last?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: last ? 'none' : '1px solid rgba(10,10,10,0.1)' }}>
      <span style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: '#696255' }}>{label}</span>
      <span style={{ fontSize: large ? 24 : 14, fontWeight: large ? 900 : 700 }}>{value}</span>
    </div>
  )
}

const smallBtn: React.CSSProperties = { padding: '8px 12px', border: '1.5px solid #0a0a0a', borderRadius: 3, background: '#f5f0e8', color: '#0a0a0a', fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer' }
