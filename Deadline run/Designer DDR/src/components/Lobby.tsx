import { useState, useEffect, useRef } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Room, PlayerRole } from '../game/types'
import { BUNDLED_SONGS } from '../game/constants'
import {
  createRoom, joinRoom, subscribeToRoom,
  updateRoomSong, setRoomStartAt, createBroadcastChannel,
} from '../game/supabase'

interface Props {
  playerName: string
  onGameStart: (room: Room, role: PlayerRole, channel: RealtimeChannel) => void
  onBack: () => void
}

type LobbyMode = 'choose' | 'hosting' | 'joining'

export function Lobby({ playerName, onGameStart, onBack }: Props) {
  const [mode, setMode] = useState<LobbyMode>('choose')
  const [room, setRoom] = useState<Room | null>(null)
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const unsubRef = useRef<(() => void) | null>(null)

  async function handleHost() {
    setLoading(true)
    setError('')
    try {
      const r = await createRoom(playerName, BUNDLED_SONGS[0].id)
      setRoom(r)
      setMode('hosting')
      const unsub = subscribeToRoom(r.id, (updated) => {
        setRoom(updated)
        if (updated.startAt) {
          const ch = createBroadcastChannel(updated.id)
          ch.subscribe()
          onGameStart(updated, 'host', ch)
        }
      })
      unsubRef.current = unsub
    } catch {
      setError('Could not create room. Check your connection.')
    }
    setLoading(false)
  }

  async function handleJoin() {
    if (!joinCode.trim()) return
    setLoading(true)
    setError('')
    try {
      const r = await joinRoom(joinCode.trim(), playerName)
      setRoom(r)
      setMode('joining')
      const unsub = subscribeToRoom(r.id, (updated) => {
        setRoom(updated)
        if (updated.startAt) {
          const ch = createBroadcastChannel(updated.id)
          ch.subscribe()
          onGameStart(updated, 'guest', ch)
        }
      })
      unsubRef.current = unsub
    } catch {
      setError('Room not found or already started.')
    }
    setLoading(false)
  }

  async function handleChangeSong(songId: string) {
    if (!room) return
    await updateRoomSong(room.id, songId)
    setRoom((prev) => prev ? { ...prev, songId } : prev)
  }

  async function handleRandom() {
    const pick = BUNDLED_SONGS[Math.floor(Math.random() * BUNDLED_SONGS.length)]
    await handleChangeSong(pick.id)
  }

  async function handleStart() {
    if (!room || !room.guestName) return
    const startAt = Date.now() + 3000
    await setRoomStartAt(room.id, startAt)
    const ch = createBroadcastChannel(room.id)
    ch.subscribe()
    onGameStart({ ...room, startAt, status: 'playing' }, 'host', ch)
  }

  useEffect(() => () => { unsubRef.current?.() }, [])

  const currentSong = BUNDLED_SONGS.find((s) => s.id === room?.songId) ?? BUNDLED_SONGS[0]
  const bothReady = Boolean(room?.guestName)

  if (mode === 'choose') {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f0e8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }}>
        <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: 3, textTransform: 'uppercase' }}>Multiplayer</div>
        <button onClick={handleHost} disabled={loading} style={fillBtn}>Create Room</button>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            placeholder="Room code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            style={{ padding: '8px 12px', border: '1.5px solid #0a0a0a', borderRadius: 3, background: '#f5f0e8', fontSize: 13, fontWeight: 700, fontFamily: 'monospace', outline: 'none', color: '#0a0a0a', width: 160 }}
          />
          <button onClick={handleJoin} disabled={loading || !joinCode.trim()} style={outlineBtn}>Join</button>
        </div>
        {error && <div style={{ fontSize: 11, color: '#c0392b' }}>{error}</div>}
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#696255', letterSpacing: 1, textTransform: 'uppercase' }}>← Back</button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f0e8', padding: '28px 20px' }}>
      <div style={{ maxWidth: 400, margin: '0 auto', border: '1.5px solid #0a0a0a', borderRadius: 5, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '10px 14px', borderBottom: '1.5px solid #0a0a0a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: '#696255' }}>Room Code</div>
            <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 4, fontFamily: 'monospace' }}>{room?.code}</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 9, color: '#696255' }}>
            {bothReady
              ? <><strong style={{ color: '#0a0a0a' }}>Both players ready ✓</strong><br />Waiting for host</>
              : 'Waiting for player 2…'}
          </div>
        </div>

        {/* Players */}
        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <PlayerSlot name={playerName} tag={mode === 'hosting' ? 'HOST' : 'GUEST'} you />
          <PlayerSlot name={mode === 'hosting' ? (room?.guestName ?? undefined) : undefined} tag={mode === 'hosting' ? (room?.guestName ? 'READY' : '—') : 'HOST'} />

          {/* Song */}
          <div style={{ padding: '9px 12px', border: '1.5px solid #0a0a0a', borderRadius: 4, background: '#0a0a0a', color: '#f5f0e8' }}>
            <div style={{ fontWeight: 700, fontSize: 12 }}>{currentSong.title}</div>
            <div style={{ fontSize: 9, color: '#c8c4bc', marginTop: 2 }}>{currentSong.bpm} BPM · {currentSong.genre} · {currentSong.duration}</div>
          </div>

          {/* Host song controls */}
          {mode === 'hosting' && (
            <div style={{ display: 'flex', gap: 6 }}>
              {BUNDLED_SONGS.map((s) => (
                <button key={s.id} onClick={() => handleChangeSong(s.id)} style={{
                  flex: 1, padding: '5px 0',
                  border: '1.5px solid #0a0a0a', borderRadius: 3,
                  background: room?.songId === s.id ? '#0a0a0a' : '#f5f0e8',
                  color: room?.songId === s.id ? '#f5f0e8' : '#0a0a0a',
                  fontSize: 8, fontWeight: 700, cursor: 'pointer',
                }}>{s.title.slice(0, 10)}</button>
              ))}
              <button onClick={handleRandom} style={{ padding: '5px 8px', border: '1.5px solid #0a0a0a', borderRadius: 3, background: '#f5f0e8', fontSize: 10, cursor: 'pointer' }}>⚄</button>
            </div>
          )}

          {mode === 'joining' && (
            <div style={{ fontSize: 10, color: '#696255', textAlign: 'center', padding: '6px 0' }}>Waiting for host to start…</div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 14px', borderTop: '1.5px solid #0a0a0a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 9, color: '#696255' }}>{window.location.origin}/room/{room?.code}</div>
          <button
            onClick={handleStart}
            disabled={mode !== 'hosting' || !bothReady}
            style={{ ...fillBtn, opacity: mode === 'hosting' && bothReady ? 1 : 0.28, padding: '7px 16px' }}
          >START →</button>
        </div>
      </div>
    </div>
  )
}

function PlayerSlot({ name, tag, you }: { name?: string; tag: string; you?: boolean }) {
  const empty = !name
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', border: `1.5px ${empty ? 'dashed' : 'solid'} #0a0a0a`, borderRadius: 4, opacity: empty ? 0.5 : 1 }}>
      <div style={{ width: 9, height: 9, borderRadius: '50%', background: empty ? 'transparent' : '#0a0a0a', border: empty ? '1.5px solid #0a0a0a' : 'none', flexShrink: 0 }} />
      <div style={{ fontWeight: 700, fontSize: 12, flex: 1, color: empty ? '#696255' : '#0a0a0a' }}>
        {name ?? 'Waiting for Player 2…'}
        {you && <span style={{ fontSize: 8, border: '1px solid #696255', borderRadius: 2, padding: '1px 4px', color: '#696255', marginLeft: 6 }}>you</span>}
      </div>
      <div style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: '#696255' }}>{tag}</div>
    </div>
  )
}

const fillBtn: React.CSSProperties = { padding: '9px 20px', border: '1.5px solid #0a0a0a', borderRadius: 3, background: '#0a0a0a', color: '#f5f0e8', fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer' }
const outlineBtn: React.CSSProperties = { padding: '9px 16px', border: '1.5px solid #0a0a0a', borderRadius: 3, background: '#f5f0e8', color: '#0a0a0a', fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer' }
