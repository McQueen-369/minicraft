import { useState, useEffect } from 'react'
import { getLeaderboard } from '../game/supabase'
import { BUNDLED_SONGS } from '../game/constants'
import type { Score } from '../game/types'

interface Props {
  defaultSongId?: string
  onBack: () => void
}

export function Leaderboard({ defaultSongId, onBack }: Props) {
  const [songId, setSongId] = useState(defaultSongId ?? BUNDLED_SONGS[0].id)
  const [scores, setScores] = useState<Score[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getLeaderboard(songId)
      .then((s) => { setScores(s); setLoading(false) })
      .catch(() => setLoading(false))
  }, [songId])

  return (
    <div style={{ minHeight: '100vh', background: '#f5f0e8', padding: '28px 20px' }}>
      <div style={{ maxWidth: 400, margin: '0 auto' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16, color: '#696255' }}>← Back</button>
        <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 20 }}>Leaderboard</div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {BUNDLED_SONGS.map((s) => (
            <button key={s.id} onClick={() => setSongId(s.id)} style={{
              flex: 1, padding: '6px 0',
              border: '1.5px solid #0a0a0a', borderRadius: 3,
              background: songId === s.id ? '#0a0a0a' : '#f5f0e8',
              color: songId === s.id ? '#f5f0e8' : '#0a0a0a',
              fontSize: 9, fontWeight: 700, cursor: 'pointer',
            }}>{s.title.slice(0, 12)}</button>
          ))}
        </div>

        <div style={{ border: '1.5px solid #0a0a0a', borderRadius: 4, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#696255', fontSize: 11 }}>Loading…</div>
          ) : scores.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#696255', fontSize: 11 }}>No scores yet. Be the first!</div>
          ) : scores.map((s, i) => (
            <div key={s.id ?? i} style={{
              display: 'flex', alignItems: 'center',
              padding: '10px 14px',
              borderBottom: i < scores.length - 1 ? '1px solid rgba(10,10,10,0.1)' : 'none',
              background: i === 0 ? '#0a0a0a' : '#f5f0e8',
              color: i === 0 ? '#f5f0e8' : '#0a0a0a',
            }}>
              <div style={{ width: 24, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i === 0 ? '★' : `${i + 1}`}</div>
              <div style={{ flex: 1, fontSize: 12, fontWeight: 700 }}>{s.playerName}</div>
              <div style={{ fontSize: 14, fontWeight: 900 }}>{s.score.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
