import { useState, useRef } from 'react'
import type { Screen, GameState, Room, PlayerRole, GhostState } from './game/types'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { StartScreen } from './components/StartScreen'
import { SongSelect } from './components/SongSelect'
import { Lobby } from './components/Lobby'
import { GameCanvas } from './components/GameCanvas'
import { MobileControls } from './components/MobileControls'
import { Results } from './components/Results'
import { Leaderboard } from './components/Leaderboard'
import { loadBeatMap, createUploadedBeatMap } from './game/beatmap'
import { loadAudioBuffer, loadAudioBufferFromArray, resumeAudio } from './game/audio'
import { subscribeGhostState, broadcastGhostState } from './game/supabase'
import { BUNDLED_SONGS } from './game/constants'
import type { BeatMap } from './game/types'

const MOBILE_BREAKPOINT_PX = 768
const isMobile = () => window.innerWidth < MOBILE_BREAKPOINT_PX || ('ontouchstart' in window)

export default function App() {
  const [screen, setScreen] = useState<Screen>('start')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [playerName, setPlayerName] = useState('')
  const [isMultiplayer, setIsMultiplayer] = useState(false)
  const [room, setRoom] = useState<Room | null>(null)
  const [_playerRole, setPlayerRole] = useState<PlayerRole>('host')
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)

  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null)
  const [beatMap, setBeatMap] = useState<BeatMap | null>(null)
  const [songId, setSongId] = useState('')

  const [finalState, setFinalState] = useState<GameState | null>(null)
  const [ghostState, setGhostState] = useState<GhostState | null>(null)
  const [opponentScore, setOpponentScore] = useState<number | undefined>()

  const hitRef = useRef<((lane: number) => void) | null>(null)

  function handleSinglePlayer(name: string) {
    setPlayerName(name)
    setIsMultiplayer(false)
    setScreen('songSelect')
  }

  function handleMultiplayer(name: string) {
    setPlayerName(name)
    setIsMultiplayer(true)
    setScreen('lobby')
  }

  async function handleSongSelect(id: string, uploadedBpm?: number, uploadedBuffer?: ArrayBuffer) {
    try {
      await resumeAudio()
      setSongId(id)

      let bm: BeatMap
      let ab: AudioBuffer

      if (uploadedBuffer && uploadedBpm) {
        ab = await loadAudioBufferFromArray(uploadedBuffer)
        bm = createUploadedBeatMap(id.replace('upload-', ''), ab, uploadedBpm)
      } else {
        const [loadedBm, loadedAb] = await Promise.all([
          loadBeatMap(id),
          loadAudioBuffer(`/songs/${id}.mp3`),
        ])
        bm = loadedBm
        ab = loadedAb
      }

      setBeatMap(bm)
      setAudioBuffer(ab)
      setLoadError(null)
      setScreen('game')
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load song')
    }
  }

  async function handleLobbyStart(r: Room, role: PlayerRole, ch: RealtimeChannel) {
    try {
      setRoom(r)
      setPlayerRole(role)
      setChannel(ch)

      subscribeGhostState(ch, (gs) => {
        setGhostState(gs)
        setOpponentScore(gs.score)
      })

      const bundledSong = BUNDLED_SONGS.find(s => s.id === r.songId)
      if (bundledSong) {
        await resumeAudio()
        setSongId(r.songId)
        const [bm, ab] = await Promise.all([
          loadBeatMap(r.songId),
          loadAudioBuffer(`/songs/${r.songId}.mp3`),
        ])
        setBeatMap(bm)
        setAudioBuffer(ab)
        setLoadError(null)
        setScreen('game')
      }
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load song')
    }
  }

  function handleGameEnd(state: GameState) {
    setFinalState(state)
    setScreen('results')
  }

  function handleGhostBroadcast(ghost: GhostState) {
    if (channel) broadcastGhostState(channel, ghost)
  }

  const CANVAS_W = 280

  return (
    <>
      {loadError && (
        <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', background: '#0a0a0a', color: '#f5f0e8', padding: '8px 16px', border: '1px solid #696255', zIndex: 999 }}>
          {loadError}
        </div>
      )}
      {screen === 'start' && (
        <StartScreen onSinglePlayer={handleSinglePlayer} onMultiplayer={handleMultiplayer} />
      )}
      {screen === 'songSelect' && (
        <SongSelect onSelect={handleSongSelect} onBack={() => setScreen('start')} />
      )}
      {screen === 'lobby' && (
        <Lobby playerName={playerName} onGameStart={handleLobbyStart} onBack={() => setScreen('start')} />
      )}
      {screen === 'game' && beatMap && audioBuffer && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 32 }}>
          <GameCanvas
            beatMap={beatMap}
            audioBuffer={audioBuffer}
            isMultiplayer={isMultiplayer}
            startAtMs={room?.startAt ?? undefined}
            onGhostBroadcast={isMultiplayer ? handleGhostBroadcast : undefined}
            ghostState={isMultiplayer ? ghostState : null}
            onGameEnd={handleGameEnd}
            onHitReady={(fn) => { hitRef.current = fn }}
          />
          {isMobile() && (
            <MobileControls
              onHit={(lane) => hitRef.current?.(lane)}
              canvasWidth={CANVAS_W}
            />
          )}
        </div>
      )}
      {screen === 'results' && finalState && (
        <Results
          state={finalState}
          songId={songId}
          playerName={playerName}
          isMultiplayer={isMultiplayer}
          opponentScore={opponentScore}
          onPlayAgain={() => setScreen('game')}
          onChangeSong={() => setScreen('songSelect')}
          onLeaderboard={() => setScreen('leaderboard')}
        />
      )}
      {screen === 'leaderboard' && (
        <Leaderboard defaultSongId={songId} onBack={() => setScreen(finalState ? 'results' : 'start')} />
      )}
    </>
  )
}
