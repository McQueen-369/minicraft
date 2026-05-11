export type Judgment = 'PERFECT' | 'GOOD' | 'MISS'
export type Screen = 'start' | 'songSelect' | 'lobby' | 'game' | 'results' | 'leaderboard'
export type PlayerRole = 'host' | 'guest'

export interface Arrow {
  id: string
  lane: number       // 0–3
  spawnTime: number  // ms from audio start
  hitTime?: number   // ms when hit registered
  missed: boolean
}

export interface BeatMapNote {
  time: number       // seconds from audio start
  lanes: number[]    // chord if length > 1
}

export interface BeatMap {
  id: string
  title: string
  artist: string
  bpm: number
  offset: number
  audioFile: string
  notes: BeatMapNote[]
}

export interface SongMeta {
  id: string
  title: string
  bpm: number
  genre: string
  difficulty: string
  duration: string
}

export interface GameState {
  score: number
  combo: number
  maxCombo: number
  perfectCount: number
  goodCount: number
  missCount: number
  lastJudgment: Judgment | null
  arrows: Arrow[]
  audioStartTime: number  // AudioContext time when song started
  songElapsed: number     // seconds
  songDuration: number    // seconds
  isPlaying: boolean
}

export interface GhostState {
  score: number
  combo: number
  lastJudgment: Judgment | null
  arrowPositions: Array<{ lane: number; progress: number }>
}

export interface Room {
  id: string
  code: string
  hostName: string
  guestName: string | null
  songId: string
  status: 'waiting' | 'playing' | 'done'
  startAt: number | null  // unix ms
}

export interface Score {
  id?: string
  songId: string
  playerName: string
  score: number
  perfectCount: number
  goodCount: number
  missCount: number
  maxCombo: number
}
