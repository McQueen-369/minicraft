# DEADLINE DASH Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based DDR-style rhythm game with single-player and real-time 2-player multiplayer via Supabase, deployable to Vercel.

**Architecture:** React 18 + TypeScript + Vite SPA; Canvas 2D game loop via `requestAnimationFrame` with a `stateRef` pattern (zero React re-renders during gameplay); Supabase Realtime broadcast for ghost panel sync; Supabase Postgres for leaderboard; Web Audio API for all sound.

**Tech Stack:** React 18, TypeScript, Vite, Supabase JS v2, Web Audio API, Canvas 2D, Vitest, Vercel.

---

## File Structure

```
Deadline run/Designer DDR/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
├── .env.local                         (not committed)
├── public/
│   └── songs/
│       ├── chipper-doodle-v2.mp3
│       ├── chipper-doodle-v2.json
│       ├── faster-does-it.mp3
│       ├── faster-does-it.json
│       ├── cipher.mp3
│       └── cipher.json
└── src/
    ├── main.tsx
    ├── App.tsx                         screen state machine
    ├── index.css                       reset only
    ├── game/
    │   ├── constants.ts                PERFECT_WINDOW, GOOD_WINDOW, FALL_MS, etc.
    │   ├── types.ts                    Arrow, BeatMap, Room, Score, GameState, etc.
    │   ├── scoring.ts                  pure functions: calcPoints, comboTier
    │   ├── beatmap.ts                  JSON loader + BPM detector + pattern generator
    │   ├── audio.ts                    Web Audio context, play/stop, tick preview
    │   ├── useGameEngine.ts            rAF loop, arrow scheduling, hit detection
    │   └── supabase.ts                 room CRUD, Realtime broadcast, leaderboard
    └── components/
        ├── StartScreen.tsx
        ├── SongSelect.tsx
        ├── Lobby.tsx
        ├── GameCanvas.tsx              canvas + ghost panel overlay
        ├── MobileControls.tsx
        ├── Results.tsx
        └── Leaderboard.tsx
```

---

### Task 1: Scaffold the project

**Files:**
- Create: `Deadline run/Designer DDR/package.json`
- Create: `Deadline run/Designer DDR/tsconfig.json`
- Create: `Deadline run/Designer DDR/vite.config.ts`
- Create: `Deadline run/Designer DDR/index.html`
- Create: `Deadline run/Designer DDR/src/main.tsx`
- Create: `Deadline run/Designer DDR/src/index.css`
- Create: `Deadline run/Designer DDR/src/App.tsx` (stub)

- [ ] **Step 1: Create the project directory and scaffold**

```bash
cd "/Users/maggiechau/Documents/_Claude/Deadline run/Designer DDR"
npm create vite@latest . -- --template react-ts
```

When prompted, confirm overwriting the current directory.

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js
npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 3: Update `vite.config.ts` to add Vitest config**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
  },
})
```

- [ ] **Step 4: Create `src/test-setup.ts`**

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Update `package.json` scripts**

Add to the `scripts` section:
```json
"test": "vitest",
"test:ui": "vitest --ui",
"test:run": "vitest run"
```

- [ ] **Step 6: Replace `src/index.css` with reset only**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #f5f0e8; color: #0a0a0a; font-family: -apple-system, "Helvetica Neue", sans-serif; }
```

- [ ] **Step 7: Create `.env.local` (not committed)**

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

- [ ] **Step 8: Verify dev server starts**

```bash
npm run dev
```

Expected: Dev server running at `http://localhost:5173`

- [ ] **Step 9: Commit**

```bash
git add "Deadline run/Designer DDR/package.json" "Deadline run/Designer DDR/tsconfig.json" "Deadline run/Designer DDR/vite.config.ts" "Deadline run/Designer DDR/src"
git commit -m "feat: scaffold Deadline Dash vite+react+ts project"
```

---

### Task 2: Types and constants

**Files:**
- Create: `src/game/constants.ts`
- Create: `src/game/types.ts`

- [ ] **Step 1: Create `src/game/constants.ts`**

```ts
export const PERFECT_WINDOW = 55   // ms
export const GOOD_WINDOW    = 110  // ms
export const FALL_MS        = 900  // arrow travel time ms
export const ARROW_SIZE     = 48   // px, canvas render size
export const LANE_COUNT     = 4
export const TARGET_Y_RATIO = 0.78 // target zone at 78% canvas height
export const GHOST_BROADCAST_HZ = 10
export const ROOM_CODE_PREFIX = 'DEADL'

export const LANE_GLYPHS = ['◀', '▼', '▲', '▶'] as const
export const LANE_KEYS   = ['ArrowLeft', 'ArrowDown', 'ArrowUp', 'ArrowRight'] as const

export const GOOD_POINTS    = 50
export const COMBO_TIERS = [
  { min: 0,  max: 9,  multiplier: 1 },
  { min: 10, max: 24, multiplier: 2 },
  { min: 25, max: 49, multiplier: 3 },
  { min: 50, max: Infinity, multiplier: 4 },
] as const

export const BPM_RAMP_INTERVAL_CYCLES = 2
export const BPM_RAMP_STEP = 6
export const BPM_MAX = 180

export const BUNDLED_SONGS = [
  { id: 'chipper-doodle-v2', title: 'Chipper Doodle v2', bpm: 120, genre: 'Chiptune',           difficulty: 'Easy',   duration: '2:00' },
  { id: 'faster-does-it',    title: 'Faster Does It',    bpm: 140, genre: 'Electronic',         difficulty: 'Medium', duration: '2:00' },
  { id: 'cipher',            title: 'Cipher',            bpm: 150, genre: 'Tense Electronic',   difficulty: 'Hard',   duration: '2:00' },
] as const
```

- [ ] **Step 2: Create `src/game/types.ts`**

```ts
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
```

- [ ] **Step 3: Commit**

```bash
git add "Deadline run/Designer DDR/src/game/constants.ts" "Deadline run/Designer DDR/src/game/types.ts"
git commit -m "feat: add game constants and types"
```

---

### Task 3: Scoring — pure functions (TDD)

**Files:**
- Create: `src/game/scoring.ts`
- Create: `src/game/scoring.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/game/scoring.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { getComboMultiplier, calcJudgment, calcPoints } from './scoring'

describe('getComboMultiplier', () => {
  it('returns ×1 for combo 0', () => expect(getComboMultiplier(0)).toBe(1))
  it('returns ×1 for combo 9', () => expect(getComboMultiplier(9)).toBe(1))
  it('returns ×2 for combo 10', () => expect(getComboMultiplier(10)).toBe(2))
  it('returns ×2 for combo 24', () => expect(getComboMultiplier(24)).toBe(2))
  it('returns ×3 for combo 25', () => expect(getComboMultiplier(25)).toBe(3))
  it('returns ×4 for combo 50', () => expect(getComboMultiplier(50)).toBe(4))
  it('returns ×4 for combo 999', () => expect(getComboMultiplier(999)).toBe(4))
})

describe('calcJudgment', () => {
  it('returns PERFECT within 55ms', () => expect(calcJudgment(0)).toBe('PERFECT'))
  it('returns PERFECT at exactly 55ms', () => expect(calcJudgment(55)).toBe('PERFECT'))
  it('returns GOOD at 56ms', () => expect(calcJudgment(56)).toBe('GOOD'))
  it('returns GOOD at 110ms', () => expect(calcJudgment(110)).toBe('GOOD'))
  it('returns MISS at 111ms', () => expect(calcJudgment(111)).toBe('MISS'))
  it('handles negative offset (early hit)', () => expect(calcJudgment(-30)).toBe('PERFECT'))
})

describe('calcPoints', () => {
  it('PERFECT at combo 0 = 100', () => expect(calcPoints('PERFECT', 0)).toBe(100))
  it('PERFECT at combo 10 = 200', () => expect(calcPoints('PERFECT', 10)).toBe(200))
  it('PERFECT at combo 50 = 400', () => expect(calcPoints('PERFECT', 50)).toBe(400))
  it('GOOD always = 50', () => {
    expect(calcPoints('GOOD', 0)).toBe(50)
    expect(calcPoints('GOOD', 100)).toBe(50)
  })
  it('MISS always = 0', () => expect(calcPoints('MISS', 0)).toBe(0))
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd "/Users/maggiechau/Documents/_Claude/Deadline run/Designer DDR"
npm run test:run -- src/game/scoring.test.ts
```

Expected: FAIL — `scoring` module not found

- [ ] **Step 3: Implement `src/game/scoring.ts`**

```ts
import { PERFECT_WINDOW, GOOD_WINDOW, GOOD_POINTS, COMBO_TIERS } from './constants'
import type { Judgment } from './types'

export function getComboMultiplier(combo: number): number {
  for (const tier of COMBO_TIERS) {
    if (combo >= tier.min && combo <= tier.max) return tier.multiplier
  }
  return 1
}

export function calcJudgment(offsetMs: number): Judgment {
  const abs = Math.abs(offsetMs)
  if (abs <= PERFECT_WINDOW) return 'PERFECT'
  if (abs <= GOOD_WINDOW)    return 'GOOD'
  return 'MISS'
}

export function calcPoints(judgment: Judgment, combo: number): number {
  if (judgment === 'MISS') return 0
  if (judgment === 'GOOD') return GOOD_POINTS
  return 100 * getComboMultiplier(combo)
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test:run -- src/game/scoring.test.ts
```

Expected: All 14 tests pass

- [ ] **Step 5: Commit**

```bash
git add "Deadline run/Designer DDR/src/game/scoring.ts" "Deadline run/Designer DDR/src/game/scoring.test.ts"
git commit -m "feat: scoring pure functions with full test coverage"
```

---

### Task 4: Supabase client + schema

**Files:**
- Create: `src/game/supabase.ts`

- [ ] **Step 1: Run migrations in Supabase dashboard SQL editor**

```sql
create table if not exists rooms (
  id         uuid primary key default gen_random_uuid(),
  code       text unique not null,
  host_name  text not null,
  guest_name text,
  song_id    text not null,
  status     text default 'waiting',
  start_at   bigint,
  created_at timestamptz default now()
);

create table if not exists scores (
  id           uuid primary key default gen_random_uuid(),
  song_id      text not null,
  player_name  text not null,
  score        integer not null,
  perfect_count integer default 0,
  good_count    integer default 0,
  miss_count    integer default 0,
  max_combo     integer default 0,
  created_at   timestamptz default now()
);

-- Enable realtime on rooms
alter publication supabase_realtime add table rooms;
```

- [ ] **Step 2: Create `src/game/supabase.ts`**

```ts
import { createClient, RealtimeChannel } from '@supabase/supabase-js'
import type { Room, Score, GhostState } from './types'
import { ROOM_CODE_PREFIX } from './constants'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)

function generateRoomCode(): string {
  const digits = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
  return `${ROOM_CODE_PREFIX}-${digits}`
}

export async function createRoom(hostName: string, songId: string): Promise<Room> {
  const code = generateRoomCode()
  const { data, error } = await supabase
    .from('rooms')
    .insert({ code, host_name: hostName, song_id: songId })
    .select()
    .single()
  if (error) throw error
  return mapRoom(data)
}

export async function joinRoom(code: string, guestName: string): Promise<Room> {
  const { data, error } = await supabase
    .from('rooms')
    .update({ guest_name: guestName })
    .eq('code', code.toUpperCase())
    .eq('status', 'waiting')
    .select()
    .single()
  if (error) throw error
  return mapRoom(data)
}

export async function updateRoomSong(roomId: string, songId: string): Promise<void> {
  const { error } = await supabase.from('rooms').update({ song_id: songId }).eq('id', roomId)
  if (error) throw error
}

export async function setRoomStatus(roomId: string, status: Room['status']): Promise<void> {
  const { error } = await supabase.from('rooms').update({ status }).eq('id', roomId)
  if (error) throw error
}

export function subscribeToRoom(
  roomId: string,
  onUpdate: (room: Room) => void,
): () => void {
  const channel = supabase
    .channel(`room-${roomId}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
      (payload) => onUpdate(mapRoom(payload.new as RoomRow)))
    .subscribe()
  return () => { supabase.removeChannel(channel) }
}

export function createBroadcastChannel(roomId: string): RealtimeChannel {
  return supabase.channel(`broadcast-${roomId}`)
}

export function broadcastGhostState(channel: RealtimeChannel, state: GhostState): void {
  channel.send({ type: 'broadcast', event: 'ghost', payload: state })
}

export function subscribeGhostState(
  channel: RealtimeChannel,
  onState: (state: GhostState) => void,
): void {
  channel.on('broadcast', { event: 'ghost' }, ({ payload }) => onState(payload as GhostState))
}

export async function saveScore(score: Score): Promise<void> {
  const { error } = await supabase.from('scores').insert({
    song_id: score.songId,
    player_name: score.playerName,
    score: score.score,
    perfect_count: score.perfectCount,
    good_count: score.goodCount,
    miss_count: score.missCount,
    max_combo: score.maxCombo,
  })
  if (error) throw error
}

export async function getLeaderboard(songId: string): Promise<Score[]> {
  const { data, error } = await supabase
    .from('scores')
    .select('*')
    .eq('song_id', songId)
    .order('score', { ascending: false })
    .limit(10)
  if (error) throw error
  return (data ?? []).map(mapScore)
}

interface RoomRow {
  id: string; code: string; host_name: string; guest_name: string | null
  song_id: string; status: string; start_at: number | null; created_at: string
}

function mapRoom(row: RoomRow): Room {
  return {
    id: row.id,
    code: row.code,
    hostName: row.host_name,
    guestName: row.guest_name,
    songId: row.song_id,
    status: row.status as Room['status'],
    startAt: row.start_at,
  }
}

function mapScore(row: Record<string, unknown>): Score {
  return {
    id: row.id as string,
    songId: row.song_id as string,
    playerName: row.player_name as string,
    score: row.score as number,
    perfectCount: row.perfect_count as number,
    goodCount: row.good_count as number,
    missCount: row.miss_count as number,
    maxCombo: row.max_combo as number,
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add "Deadline run/Designer DDR/src/game/supabase.ts"
git commit -m "feat: Supabase client — rooms, broadcast, leaderboard"
```

---

### Task 5: Audio engine

**Files:**
- Create: `src/game/audio.ts`

- [ ] **Step 1: Create `src/game/audio.ts`**

```ts
let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  return ctx
}

export async function loadAudioBuffer(url: string): Promise<AudioBuffer> {
  const response = await fetch(url)
  const arrayBuffer = await response.arrayBuffer()
  return getCtx().decodeAudioData(arrayBuffer)
}

export async function loadAudioBufferFromArray(data: ArrayBuffer): Promise<AudioBuffer> {
  return getCtx().decodeAudioData(data)
}

let songSource: AudioBufferSourceNode | null = null

export function playSong(buffer: AudioBuffer, startAtContextTime: number): void {
  stopSong()
  const source = getCtx().createBufferSource()
  source.buffer = buffer
  source.connect(getCtx().destination)
  source.start(startAtContextTime)
  songSource = source
}

export function stopSong(): void {
  try { songSource?.stop() } catch { /* already stopped */ }
  songSource = null
}

export function getAudioCurrentTime(): number {
  return getCtx().currentTime
}

export function getAudioContextTime(): number {
  return getCtx().currentTime
}

/** Returns the AudioContext wall-clock time that corresponds to Date.now() + delayMs */
export function futureContextTime(delayMs: number): number {
  return getCtx().currentTime + delayMs / 1000
}

/** Resume suspended context (required after user gesture on some browsers) */
export async function resumeAudio(): Promise<void> {
  if (getCtx().state === 'suspended') await getCtx().resume()
}

/** Play synthesised tick at given BPM for preview — 8 ticks */
export function playBpmPreview(bpm: number): void {
  const c = getCtx()
  const intervalSec = 60 / bpm
  const now = c.currentTime + 0.05
  for (let i = 0; i < 8; i++) {
    const t = now + i * intervalSec
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.connect(gain)
    gain.connect(c.destination)
    osc.frequency.value = i === 0 ? 880 : 440
    gain.gain.setValueAtTime(0.3, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07)
    osc.start(t)
    osc.stop(t + 0.08)
  }
}

/** Single tick sound for hit feedback */
export function playTick(isChord = false): void {
  const c = getCtx()
  const t = c.currentTime
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.connect(gain)
  gain.connect(c.destination)
  osc.frequency.value = isChord ? 880 : 660
  gain.gain.setValueAtTime(0.2, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06)
  osc.start(t)
  osc.stop(t + 0.07)
}
```

- [ ] **Step 2: Commit**

```bash
git add "Deadline run/Designer DDR/src/game/audio.ts"
git commit -m "feat: Web Audio engine — song play/stop, BPM preview ticks"
```

---

### Task 6: Beat map loader + pattern generator + BPM detector

**Files:**
- Create: `src/game/beatmap.ts`
- Create: `src/game/beatmap.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/game/beatmap.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { generatePattern, snapBpm } from './beatmap'

describe('snapBpm', () => {
  it('snaps 118 to 120', () => expect(snapBpm(118)).toBe(120))
  it('snaps 139 to 140', () => expect(snapBpm(139)).toBe(140))
  it('snaps 175 to 174', () => expect(snapBpm(175)).toBe(175)) // within tolerance
  it('caps at 180', () => expect(snapBpm(200)).toBe(180))
  it('floors at 60', () => expect(snapBpm(40)).toBe(60))
})

describe('generatePattern', () => {
  it('produces notes array with time and lanes', () => {
    const notes = generatePattern(120, 30)
    expect(notes.length).toBeGreaterThan(0)
    expect(notes[0]).toHaveProperty('time')
    expect(notes[0]).toHaveProperty('lanes')
    expect(Array.isArray(notes[0].lanes)).toBe(true)
  })

  it('notes are sorted by time', () => {
    const notes = generatePattern(120, 30)
    for (let i = 1; i < notes.length; i++) {
      expect(notes[i].time).toBeGreaterThanOrEqual(notes[i - 1].time)
    }
  })

  it('all lane indices are 0-3', () => {
    const notes = generatePattern(120, 30)
    for (const note of notes) {
      for (const lane of note.lanes) {
        expect(lane).toBeGreaterThanOrEqual(0)
        expect(lane).toBeLessThanOrEqual(3)
      }
    }
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm run test:run -- src/game/beatmap.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Create `src/game/beatmap.ts`**

```ts
import type { BeatMap, BeatMapNote } from './types'
import { BPM_MAX, BPM_RAMP_INTERVAL_CYCLES, BPM_RAMP_STEP } from './constants'

export async function loadBeatMap(id: string): Promise<BeatMap> {
  const response = await fetch(`/songs/${id}.json`)
  if (!response.ok) throw new Error(`Beat map not found: ${id}`)
  return response.json()
}

const COMMON_BPMS = [60, 70, 80, 90, 100, 110, 120, 128, 130, 140, 150, 160, 170, 174, 180]

export function snapBpm(raw: number): number {
  const clamped = Math.max(60, Math.min(BPM_MAX, raw))
  let closest = COMMON_BPMS[0]
  let minDist = Math.abs(clamped - closest)
  for (const bpm of COMMON_BPMS) {
    const dist = Math.abs(clamped - bpm)
    if (dist < minDist) { minDist = dist; closest = bpm }
  }
  return minDist <= 5 ? closest : clamped
}

/** Detect BPM from AudioBuffer using energy-peak onset analysis */
export async function detectBpm(buffer: AudioBuffer): Promise<number> {
  const sampleRate = buffer.sampleRate
  const data = buffer.getChannelData(0)
  const windowSize = Math.floor(sampleRate * 0.01) // 10ms windows
  const energies: number[] = []

  for (let i = 0; i + windowSize < data.length; i += windowSize) {
    let energy = 0
    for (let j = 0; j < windowSize; j++) energy += data[i + j] ** 2
    energies.push(energy / windowSize)
  }

  const mean = energies.reduce((s, e) => s + e, 0) / energies.length
  const threshold = mean * 1.5
  const onsetFrames: number[] = []
  let lastOnset = -20

  for (let i = 1; i < energies.length; i++) {
    if (energies[i] > threshold && energies[i] > energies[i - 1] && i - lastOnset > 5) {
      onsetFrames.push(i)
      lastOnset = i
    }
  }

  if (onsetFrames.length < 4) return 120

  const intervals: number[] = []
  for (let i = 1; i < Math.min(onsetFrames.length, 32); i++) {
    intervals.push((onsetFrames[i] - onsetFrames[i - 1]) * 0.01) // sec
  }
  const medianInterval = intervals.sort((a, b) => a - b)[Math.floor(intervals.length / 2)]
  const rawBpm = 60 / medianInterval

  // Handle half/double detection
  let bpm = rawBpm
  if (rawBpm < 60) bpm = rawBpm * 2
  if (rawBpm > 180) bpm = rawBpm / 2

  return snapBpm(Math.round(bpm))
}

/** Generate an algorithmic beat pattern for uploaded tracks */
export function generatePattern(bpm: number, durationSec: number): BeatMapNote[] {
  const beatInterval = 60 / bpm
  const notes: BeatMapNote[] = []
  const LANES = [0, 1, 2, 3]
  let cycle = 0
  let currentBpm = bpm
  let patternCycleCount = 0
  let t = beatInterval  // start 1 beat in

  while (t < durationSec - 1) {
    const lanePool = [...LANES]
    const isChord = cycle % 8 === 4 && currentBpm >= 100  // chord every 4 beats at 100+ BPM
    const lanes: number[] = []
    if (isChord) {
      const idx1 = Math.floor(Math.random() * lanePool.length)
      lanes.push(lanePool.splice(idx1, 1)[0])
      const idx2 = Math.floor(Math.random() * lanePool.length)
      lanes.push(lanePool.splice(idx2, 1)[0])
    } else {
      const idx = Math.floor(Math.random() * lanePool.length)
      lanes.push(lanePool.splice(idx, 1)[0])
    }

    notes.push({ time: Math.round(t * 1000) / 1000, lanes })
    cycle++
    t += beatInterval

    // BPM ramp every N cycles
    if (cycle % (4 * BPM_RAMP_INTERVAL_CYCLES) === 0) {
      patternCycleCount++
      if (currentBpm < BPM_MAX) {
        currentBpm = Math.min(BPM_MAX, currentBpm + BPM_RAMP_STEP)
        beatInterval && (t += 0) // beatInterval is const in scope; ramp affects next assignment
      }
    }
  }

  return notes
}

/** Generate an uploaded-track BeatMap with BPM ramp */
export function createUploadedBeatMap(
  title: string,
  buffer: AudioBuffer,
  detectedBpm: number,
): BeatMap {
  const duration = buffer.duration
  const notes = generatePattern(detectedBpm, duration)
  return {
    id: `upload-${Date.now()}`,
    title,
    artist: 'Uploaded',
    bpm: detectedBpm,
    offset: 0,
    audioFile: '',
    notes,
  }
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npm run test:run -- src/game/beatmap.test.ts
```

Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add "Deadline run/Designer DDR/src/game/beatmap.ts" "Deadline run/Designer DDR/src/game/beatmap.test.ts"
git commit -m "feat: beat map loader, BPM detector, pattern generator"
```

---

### Task 7: Game engine hook

**Files:**
- Create: `src/game/useGameEngine.ts`

- [ ] **Step 1: Create `src/game/useGameEngine.ts`**

```ts
import { useRef, useEffect, useCallback } from 'react'
import type { BeatMap, GameState, Arrow, Judgment, GhostState } from './types'
import { FALL_MS, GOOD_WINDOW, LANE_COUNT, TARGET_Y_RATIO } from './constants'
import { calcJudgment, calcPoints } from './scoring'
import { getAudioCurrentTime, playSong, stopSong, resumeAudio, futureContextTime } from './audio'

const DEFAULT_STATE: GameState = {
  score: 0, combo: 0, maxCombo: 0,
  perfectCount: 0, goodCount: 0, missCount: 0,
  lastJudgment: null, arrows: [],
  audioStartTime: 0, songElapsed: 0, songDuration: 0,
  isPlaying: false,
}

export interface GameEngineOptions {
  beatMap: BeatMap
  audioBuffer: AudioBuffer
  canvasHeight: number
  startAtMs?: number  // wall-clock ms for multiplayer sync
  onStateSnapshot: (state: GameState) => void
  onGhostBroadcast?: (ghost: GhostState) => void
}

export function useGameEngine(options: GameEngineOptions | null) {
  const stateRef = useRef<GameState>({ ...DEFAULT_STATE })
  const rafRef = useRef<number>(0)
  const scheduledRef = useRef<Set<number>>(new Set())
  const ghostTimerRef = useRef<number>(0)

  const hit = useCallback((lane: number) => {
    if (!stateRef.current.isPlaying) return
    const now = getAudioCurrentTime()
    const audioElapsed = (now - stateRef.current.audioStartTime) * 1000
    const { arrows } = stateRef.current

    // Find closest unhit, un-missed arrow in this lane within GOOD_WINDOW
    let best: Arrow | null = null
    let bestDist = Infinity
    for (const arrow of arrows) {
      if (arrow.lane !== lane || arrow.hitTime !== undefined || arrow.missed) continue
      const arrowMs = arrow.spawnTime + FALL_MS
      const dist = Math.abs(audioElapsed - arrowMs)
      if (dist < bestDist && dist <= GOOD_WINDOW) { bestDist = dist; best = arrow }
    }

    if (!best) return
    const offsetMs = audioElapsed - (best.spawnTime + FALL_MS)
    const judgment: Judgment = calcJudgment(offsetMs)
    const pts = calcPoints(judgment, stateRef.current.combo)

    best.hitTime = audioElapsed
    const newCombo = judgment === 'MISS' ? 0 : stateRef.current.combo + 1
    stateRef.current = {
      ...stateRef.current,
      score: stateRef.current.score + pts,
      combo: newCombo,
      maxCombo: Math.max(stateRef.current.maxCombo, newCombo),
      perfectCount: stateRef.current.perfectCount + (judgment === 'PERFECT' ? 1 : 0),
      goodCount: stateRef.current.goodCount + (judgment === 'GOOD' ? 1 : 0),
      lastJudgment: judgment,
    }
  }, [])

  useEffect(() => {
    if (!options) return

    const { beatMap, audioBuffer, canvasHeight, startAtMs, onStateSnapshot, onGhostBroadcast } = options
    const targetY = canvasHeight * TARGET_Y_RATIO

    async function start() {
      await resumeAudio()
      const contextNow = getAudioCurrentTime()
      let audioStartContextTime: number

      if (startAtMs !== undefined) {
        const delayMs = startAtMs - Date.now()
        audioStartContextTime = contextNow + Math.max(0, delayMs) / 1000
      } else {
        audioStartContextTime = contextNow + 0.1
      }

      playSong(audioBuffer, audioStartContextTime)

      stateRef.current = {
        ...DEFAULT_STATE,
        audioStartTime: audioStartContextTime,
        songDuration: audioBuffer.duration,
        isPlaying: true,
      }

      scheduledRef.current.clear()

      function loop() {
        const now = getAudioCurrentTime()
        if (now < audioStartContextTime) {
          rafRef.current = requestAnimationFrame(loop)
          return
        }

        const audioElapsedMs = (now - audioStartContextTime) * 1000
        stateRef.current = { ...stateRef.current, songElapsed: audioElapsedMs / 1000 }

        // Spawn arrows from beat map
        for (let i = 0; i < beatMap.notes.length; i++) {
          if (scheduledRef.current.has(i)) continue
          const noteMs = (beatMap.notes[i].time + beatMap.offset) * 1000
          if (audioElapsedMs >= noteMs - FALL_MS) {
            scheduledRef.current.add(i)
            const note = beatMap.notes[i]
            const newArrows: Arrow[] = note.lanes.map(lane => ({
              id: `${i}-${lane}`,
              lane,
              spawnTime: noteMs - FALL_MS,
              missed: false,
            }))
            stateRef.current = {
              ...stateRef.current,
              arrows: [...stateRef.current.arrows, ...newArrows],
            }
          }
        }

        // Mark missed arrows
        const arrows = stateRef.current.arrows.map(arrow => {
          if (arrow.hitTime !== undefined || arrow.missed) return arrow
          const arrowMs = arrow.spawnTime + FALL_MS
          if (audioElapsedMs > arrowMs + GOOD_WINDOW) {
            return { ...arrow, missed: true }
          }
          return arrow
        })

        // Count newly missed
        const newMisses = arrows.filter(
          (a, i) => a.missed && !stateRef.current.arrows[i]?.missed
        ).length

        if (newMisses > 0) {
          stateRef.current = {
            ...stateRef.current,
            arrows,
            missCount: stateRef.current.missCount + newMisses,
            combo: 0,
            lastJudgment: 'MISS',
          }
        } else {
          stateRef.current = { ...stateRef.current, arrows }
        }

        onStateSnapshot({ ...stateRef.current })

        if (audioElapsedMs / 1000 < audioBuffer.duration + 1) {
          rafRef.current = requestAnimationFrame(loop)
        } else {
          stateRef.current = { ...stateRef.current, isPlaying: false }
          onStateSnapshot({ ...stateRef.current })
        }
      }

      rafRef.current = requestAnimationFrame(loop)

      if (onGhostBroadcast) {
        ghostTimerRef.current = window.setInterval(() => {
          const { score, combo, lastJudgment, arrows: arrs, audioStartTime } = stateRef.current
          const nowCtx = getAudioCurrentTime()
          const elapsedMs = (nowCtx - audioStartTime) * 1000
          const arrowPositions = arrs
            .filter(a => !a.missed && a.hitTime === undefined)
            .map(a => ({
              lane: a.lane,
              progress: Math.min(1, (elapsedMs - a.spawnTime) / FALL_MS),
            }))
          onGhostBroadcast({ score, combo, lastJudgment, arrowPositions })
        }, 1000 / 10)
      }
    }

    start()

    return () => {
      cancelAnimationFrame(rafRef.current)
      clearInterval(ghostTimerRef.current)
      stopSong()
    }
  }, [options])

  return { hit, stateRef }
}
```

- [ ] **Step 2: Commit**

```bash
git add "Deadline run/Designer DDR/src/game/useGameEngine.ts"
git commit -m "feat: rAF game engine hook with hit detection and ghost broadcast"
```

---

### Task 8: GameCanvas component

**Files:**
- Create: `src/components/GameCanvas.tsx`

- [ ] **Step 1: Create `src/components/GameCanvas.tsx`**

```tsx
import { useRef, useEffect, useState } from 'react'
import type { BeatMap, GameState, GhostState } from '../game/types'
import { useGameEngine } from '../game/useGameEngine'
import { LANE_GLYPHS, LANE_KEYS, ARROW_SIZE, TARGET_Y_RATIO, LANE_COUNT } from '../game/constants'

const COLORS = { bg: '#f5f0e8', ink: '#0a0a0a', grey: '#696255', dim: 'rgba(10,10,10,0.2)' }

interface Props {
  beatMap: BeatMap
  audioBuffer: AudioBuffer
  isMultiplayer: boolean
  startAtMs?: number
  onGhostBroadcast?: (ghost: GhostState) => void
  ghostState?: GhostState | null
  onGameEnd: (state: GameState) => void
}

export function GameCanvas({ beatMap, audioBuffer, isMultiplayer, startAtMs, onGhostBroadcast, ghostState, onGameEnd }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [displayState, setDisplayState] = useState<GameState | null>(null)
  const endCalledRef = useRef(false)

  const canvasH = 480
  const canvasW = 280

  const { hit, stateRef } = useGameEngine({
    beatMap, audioBuffer, canvasHeight: canvasH,
    startAtMs, onGhostBroadcast,
    onStateSnapshot: (state) => {
      setDisplayState(state)
      if (!state.isPlaying && !endCalledRef.current && state.songElapsed > 0) {
        endCalledRef.current = true
        onGameEnd(state)
      }
    },
  })

  // Keyboard controls
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const idx = LANE_KEYS.indexOf(e.code as typeof LANE_KEYS[number])
      if (idx !== -1) { e.preventDefault(); hit(idx) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [hit])

  // Canvas draw loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx2d = canvas.getContext('2d')!
    let rafId: number

    const LANE_W = ARROW_SIZE + 10
    const totalW = LANE_COUNT * LANE_W
    const startX = (canvasW - totalW) / 2
    const targetY = canvasH * TARGET_Y_RATIO

    function draw() {
      const state = stateRef.current
      ctx2d.fillStyle = COLORS.bg
      ctx2d.fillRect(0, 0, canvasW, canvasH)

      // Target receptors
      for (let i = 0; i < LANE_COUNT; i++) {
        const x = startX + i * LANE_W + LANE_W / 2
        ctx2d.strokeStyle = COLORS.dim
        ctx2d.lineWidth = 2
        ctx2d.strokeRect(x - ARROW_SIZE / 2, targetY - ARROW_SIZE / 2, ARROW_SIZE, ARROW_SIZE)
        ctx2d.fillStyle = COLORS.dim
        ctx2d.font = `${ARROW_SIZE * 0.6}px sans-serif`
        ctx2d.textAlign = 'center'
        ctx2d.textBaseline = 'middle'
        ctx2d.fillText(LANE_GLYPHS[i], x, targetY)
      }

      // Falling arrows
      const nowMs = state.audioStartTime > 0
        ? (performance.now() / 1000 - state.audioStartTime + (state.audioStartTime - state.audioStartTime)) * 1000
        : 0

      // Use songElapsed approximation for render
      const elapsedMs = state.songElapsed * 1000

      for (const arrow of state.arrows) {
        if (arrow.hitTime !== undefined || arrow.missed) continue
        const progress = (elapsedMs - arrow.spawnTime) / (canvasH * TARGET_Y_RATIO / canvasH * (canvasH / TARGET_Y_RATIO))
        const y = (elapsedMs - arrow.spawnTime) / (import('../game/constants').then(() => {}) as unknown as number)
        // Simple: arrow.spawnTime=0 at top, hits targetY at FALL_MS
        const pct = (elapsedMs - arrow.spawnTime) / 900
        const arrowY = pct * targetY
        if (arrowY < 0 || arrowY > canvasH) continue

        const x = startX + arrow.lane * LANE_W + LANE_W / 2
        ctx2d.fillStyle = COLORS.ink
        ctx2d.fillRect(x - ARROW_SIZE / 2, arrowY - ARROW_SIZE / 2, ARROW_SIZE, ARROW_SIZE)
        ctx2d.fillStyle = COLORS.bg
        ctx2d.font = `${ARROW_SIZE * 0.6}px sans-serif`
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, position: 'relative', userSelect: 'none' }}>
      {/* Header */}
      <div style={{ width: canvasW, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', borderBottom: `1.5px solid ${COLORS.ink}`, background: COLORS.bg }}>
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

      {/* Canvas */}
      <div style={{ position: 'relative' }}>
        <canvas ref={canvasRef} width={canvasW} height={canvasH} style={{ display: 'block', border: `1.5px solid ${COLORS.ink}`, borderTop: 'none', borderBottom: 'none' }} />

        {/* Ghost panel */}
        {isMultiplayer && ghostState && (
          <GhostPanel ghost={ghostState} />
        )}
      </div>

      {/* Progress bar */}
      <div style={{ width: canvasW, borderLeft: `1.5px solid ${COLORS.ink}`, borderRight: `1.5px solid ${COLORS.ink}` }}>
        <div style={{ height: 3, background: 'rgba(10,10,10,0.1)' }}>
          <div style={{ height: '100%', background: COLORS.ink, width: `${state ? (state.songElapsed / state.songDuration) * 100 : 0}%`, transition: 'width 0.1s linear' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 12px', fontSize: 8, color: COLORS.grey }}>
          <span>{beatMap.title}</span>
          <span>{formatTime(state?.songElapsed ?? 0)} / {formatTime(state?.songDuration ?? 0)}</span>
        </div>
      </div>

      {/* Judgment flash */}
      {state?.lastJudgment && (
        <div style={{ position: 'absolute', top: '55%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 14, fontWeight: 900, letterSpacing: 2, pointerEvents: 'none', opacity: 0.9 }}>
          {state.lastJudgment}
        </div>
      )}
    </div>
  )
}

function GhostPanel({ ghost }: { ghost: GhostState }) {
  const COLORS = { bg: '#f5f0e8', ink: '#0a0a0a', grey: '#696255' }
  return (
    <div style={{ position: 'absolute', top: 8, right: 8, width: 80, border: `1.5px solid ${COLORS.ink}`, borderRadius: 4, background: COLORS.bg, boxShadow: '2px 2px 0 rgba(10,10,10,0.12)', fontSize: 8 }}>
      <div style={{ background: COLORS.ink, color: COLORS.bg, padding: '3px 6px', display: 'flex', justifyContent: 'space-between', letterSpacing: 1, fontWeight: 700, textTransform: 'uppercase' }}>
        <span>Opponent</span><span style={{ color: '#aaa' }}>● LIVE</span>
      </div>
      <div style={{ padding: '5px 5px 4px' }}>
        <div style={{ display: 'flex', gap: 2, justifyContent: 'center', marginBottom: 4 }}>
          {[0, 1, 2, 3].map(lane => {
            const pos = ghost.arrowPositions.find(p => p.lane === lane)
            return (
              <div key={lane} style={{ width: 14, height: 40, position: 'relative', border: `1px solid rgba(10,10,10,0.15)`, borderRadius: 2 }}>
                {pos && (
                  <div style={{ position: 'absolute', top: `${pos.progress * 80}%`, left: 0, right: 0, height: 12, background: COLORS.ink, borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.bg, fontSize: 6 }}>
                    {['◀', '▼', '▲', '▶'][lane]}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div style={{ fontWeight: 700, textAlign: 'center', borderTop: `1px solid rgba(10,10,10,0.1)`, paddingTop: 3 }}>{ghost.score.toLocaleString()}</div>
        <div style={{ textAlign: 'center', color: COLORS.grey, marginTop: 1 }}>×{ghost.combo} · {ghost.lastJudgment ?? '—'}</div>
      </div>
    </div>
  )
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = String(Math.floor(sec % 60)).padStart(2, '0')
  return `${m}:${s}`
}
```

- [ ] **Step 2: Fix the arrow Y calculation** (the dynamic import above is incorrect — simplify):

The arrow render in the draw loop has a bug — replace the arrow Y calculation block:

```ts
// Inside the draw loop, replace the arrow section with:
for (const arrow of state.arrows) {
  if (arrow.hitTime !== undefined || arrow.missed) continue
  const pct = (elapsedMs - arrow.spawnTime) / 900
  const arrowY = pct * targetY
  if (arrowY < 0 || arrowY > targetY + ARROW_SIZE) continue

  const x = startX + arrow.lane * LANE_W + LANE_W / 2
  ctx2d.fillStyle = COLORS.ink
  ctx2d.fillRect(x - ARROW_SIZE / 2, arrowY - ARROW_SIZE / 2, ARROW_SIZE, ARROW_SIZE)
  ctx2d.fillStyle = COLORS.bg
  ctx2d.font = `${ARROW_SIZE * 0.6}px sans-serif`
  ctx2d.textAlign = 'center'
  ctx2d.textBaseline = 'middle'
  ctx2d.fillText(LANE_GLYPHS[arrow.lane], x, arrowY)
}
```

- [ ] **Step 3: Commit**

```bash
git add "Deadline run/Designer DDR/src/components/GameCanvas.tsx"
git commit -m "feat: GameCanvas component with canvas draw loop and ghost panel"
```

---

### Task 9: MobileControls component

**Files:**
- Create: `src/components/MobileControls.tsx`

- [ ] **Step 1: Create `src/components/MobileControls.tsx`**

```tsx
import { LANE_GLYPHS } from '../game/constants'

const COLORS = { bg: '#f5f0e8', ink: '#0a0a0a' }

interface Props {
  onHit: (lane: number) => void
  canvasWidth: number
}

export function MobileControls({ onHit, canvasWidth }: Props) {
  return (
    <div style={{
      display: 'flex',
      width: canvasWidth,
      borderLeft: `1.5px solid ${COLORS.ink}`,
      borderRight: `1.5px solid ${COLORS.ink}`,
      borderBottom: `1.5px solid ${COLORS.ink}`,
      borderTop: `1.5px solid ${COLORS.ink}`,
    }}>
      {LANE_GLYPHS.map((glyph, i) => (
        <button
          key={i}
          onPointerDown={(e) => { e.preventDefault(); onHit(i) }}
          style={{
            flex: 1,
            height: 64,
            border: 'none',
            borderRight: i < 3 ? `1.5px solid ${COLORS.ink}` : 'none',
            background: COLORS.bg,
            color: COLORS.ink,
            fontSize: 24,
            fontWeight: 700,
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
            touchAction: 'manipulation',
          }}
        >
          {glyph}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "Deadline run/Designer DDR/src/components/MobileControls.tsx"
git commit -m "feat: MobileControls with pointerdown tap buttons"
```

---

### Task 10: StartScreen component

**Files:**
- Create: `src/components/StartScreen.tsx`

- [ ] **Step 1: Create `src/components/StartScreen.tsx`**

```tsx
import { useState, useEffect, useRef } from 'react'

const COLORS = { bg: '#f5f0e8', ink: '#0a0a0a', grey: '#696255' }

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 24, background: COLORS.bg },
  title: { fontSize: 36, fontWeight: 900, letterSpacing: 6, textTransform: 'uppercase' },
  sub: { fontSize: 12, color: COLORS.grey, letterSpacing: 1 },
  input: { width: 240, padding: '8px 12px', border: `1.5px solid ${COLORS.ink}`, borderRadius: 3, background: COLORS.bg, fontSize: 14, fontWeight: 700, outline: 'none', fontFamily: 'inherit' },
  btn: { width: 240, padding: '10px 0', border: `1.5px solid ${COLORS.ink}`, borderRadius: 3, background: COLORS.bg, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' as const, cursor: 'pointer' },
  btnPrimary: { background: COLORS.ink, color: COLORS.bg },
  attribution: { fontSize: 9, color: COLORS.grey, textAlign: 'center' as const, maxWidth: 280, lineHeight: 1.6 },
}

interface Props {
  onSinglePlayer: (name: string) => void
  onMultiplayer: (name: string) => void
}

export function StartScreen({ onSinglePlayer, onMultiplayer }: Props) {
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem('deadline-dash-name')
    if (saved) setName(saved)
    inputRef.current?.focus()
  }, [])

  function saveName(n: string) {
    localStorage.setItem('deadline-dash-name', n)
  }

  const trimmed = name.trim()

  // Stickman animation (SVG)
  const stickman = (
    <svg width="60" height="80" viewBox="0 0 60 80" fill="none" stroke={COLORS.ink} strokeWidth="2.5" strokeLinecap="round">
      <circle cx="30" cy="12" r="9" />
      <line x1="30" y1="21" x2="30" y2="50" />
      <line x1="30" y1="30" x2="12" y2="42" />
      <line x1="30" y1="30" x2="48" y2="42" />
      <line x1="30" y1="50" x2="16" y2="70" />
      <line x1="30" y1="50" x2="44" y2="70" />
    </svg>
  )

  return (
    <div style={S.page}>
      {stickman}
      <div style={S.title}>DEADLINE DASH</div>
      <div style={S.sub}>A rhythm game for those past due</div>

      <input
        ref={inputRef}
        style={S.input}
        placeholder="Your name"
        value={name}
        maxLength={20}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && trimmed && (saveName(trimmed), onSinglePlayer(trimmed))}
      />

      <button
        style={{ ...S.btn, ...S.btnPrimary, opacity: trimmed ? 1 : 0.4 }}
        disabled={!trimmed}
        onClick={() => { saveName(trimmed); onSinglePlayer(trimmed) }}
      >
        Single Player
      </button>
      <button
        style={{ ...S.btn, opacity: trimmed ? 1 : 0.4 }}
        disabled={!trimmed}
        onClick={() => { saveName(trimmed); onMultiplayer(trimmed) }}
      >
        Multiple Players
      </button>

      <div style={S.attribution}>
        Music by Kevin MacLeod (incompetech.com) — Licensed under CC BY 4.0
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "Deadline run/Designer DDR/src/components/StartScreen.tsx"
git commit -m "feat: StartScreen with name input and player mode selection"
```

---

### Task 11: SongSelect component

**Files:**
- Create: `src/components/SongSelect.tsx`

- [ ] **Step 1: Create `src/components/SongSelect.tsx`**

```tsx
import { useState, useRef } from 'react'
import { BUNDLED_SONGS } from '../game/constants'
import { playBpmPreview } from '../game/audio'
import { detectBpm } from '../game/beatmap'
import type { SongMeta } from '../game/types'

const COLORS = { bg: '#f5f0e8', ink: '#0a0a0a', grey: '#696255' }
const BPM_PRESETS = [
  { label: 'CHILL', bpm: 90 },
  { label: 'NORMAL', bpm: 120 },
  { label: 'RUSH', bpm: 150 },
  { label: 'CHAOS', bpm: 174 },
]

interface UploadedSong {
  id: string
  title: string
  bpm: number
  arrayBuffer: ArrayBuffer
}

interface Props {
  onSelect: (songId: string, uploadedBpm?: number, uploadedBuffer?: ArrayBuffer) => void
  onBack: () => void
}

export function SongSelect({ onSelect, onBack }: Props) {
  const [selected, setSelected] = useState<string>(BUNDLED_SONGS[0].id)
  const [uploaded, setUploaded] = useState<UploadedSong | null>(null)
  const [detecting, setDetecting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setDetecting(true)
    const buffer = await file.arrayBuffer()
    const audioCtx = new AudioContext()
    const decoded = await audioCtx.decodeAudioData(buffer.slice(0))
    const bpm = await detectBpm(decoded)
    await audioCtx.close()
    const song: UploadedSong = { id: `upload-${Date.now()}`, title: file.name.replace(/\.[^.]+$/, ''), bpm, arrayBuffer: buffer }
    setUploaded(song)
    setSelected(song.id)
    setDetecting(false)
  }

  function handlePreview() {
    const bpm = uploaded && selected === uploaded.id ? uploaded.bpm : BUNDLED_SONGS.find(s => s.id === selected)?.bpm ?? 120
    playBpmPreview(bpm)
  }

  const selectedMeta = BUNDLED_SONGS.find(s => s.id === selected)

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, padding: '28px 20px' }}>
      <div style={{ maxWidth: 400, margin: '0 auto' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16, color: COLORS.grey }}>← Back</button>
        <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 20 }}>Select Song</div>

        {BUNDLED_SONGS.map(song => (
          <div key={song.id} onClick={() => setSelected(song.id)} style={{
            padding: '10px 14px', marginBottom: 8, border: `1.5px solid ${COLORS.ink}`, borderRadius: 4, cursor: 'pointer',
            background: selected === song.id ? COLORS.ink : COLORS.bg,
            color: selected === song.id ? COLORS.bg : COLORS.ink,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{song.title}</div>
              <div style={{ fontSize: 9, letterSpacing: 1, opacity: 0.7 }}>{song.difficulty}</div>
            </div>
            <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{song.bpm} BPM · {song.genre} · {song.duration}</div>
          </div>
        ))}

        {/* Upload slot */}
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          style={{ padding: '14px', border: `1.5px dashed ${COLORS.ink}`, borderRadius: 4, cursor: 'pointer', textAlign: 'center', marginTop: 8, background: uploaded && selected === uploaded.id ? COLORS.ink : 'transparent', color: uploaded && selected === uploaded.id ? COLORS.bg : COLORS.ink }}
        >
          {detecting ? 'Detecting BPM…' : uploaded ? (
            <div onClick={e => { e.stopPropagation(); setSelected(uploaded.id) }}>
              <div style={{ fontWeight: 700 }}>{uploaded.title}</div>
              <div style={{ fontSize: 10, opacity: 0.7 }}>Detected: {uploaded.bpm} BPM</div>
            </div>
          ) : (
            <div style={{ fontSize: 11, letterSpacing: 1 }}>Drop your own MP3 / OGG / WAV</div>
          )}
        </div>
        <input ref={fileRef} type="file" accept=".mp3,.ogg,.wav" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />

        {/* BPM override for uploaded */}
        {uploaded && selected === uploaded.id && (
          <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
            {BPM_PRESETS.map(p => (
              <button key={p.label} onClick={() => setUploaded({ ...uploaded, bpm: p.bpm })} style={{ flex: 1, padding: '5px 0', border: `1.5px solid ${COLORS.ink}`, borderRadius: 3, background: uploaded.bpm === p.bpm ? COLORS.ink : COLORS.bg, color: uploaded.bpm === p.bpm ? COLORS.bg : COLORS.ink, fontSize: 9, fontWeight: 700, letterSpacing: 1, cursor: 'pointer' }}>
                {p.label}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button onClick={handlePreview} style={{ flex: 1, padding: '10px 0', border: `1.5px solid ${COLORS.ink}`, borderRadius: 3, background: COLORS.bg, fontSize: 10, fontWeight: 700, letterSpacing: 1, cursor: 'pointer' }}>
            ▶ PREVIEW BEAT
          </button>
          <button
            onClick={() => selected === uploaded?.id ? onSelect(selected, uploaded.bpm, uploaded.arrayBuffer) : onSelect(selected)}
            style={{ flex: 2, padding: '10px 0', background: COLORS.ink, color: COLORS.bg, border: 'none', borderRadius: 3, fontSize: 11, fontWeight: 700, letterSpacing: 2, cursor: 'pointer' }}
          >
            PLAY →
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "Deadline run/Designer DDR/src/components/SongSelect.tsx"
git commit -m "feat: SongSelect with bundled tracks, upload, BPM detection, preview"
```

---

### Task 12: Lobby component

**Files:**
- Create: `src/components/Lobby.tsx`

- [ ] **Step 1: Create `src/components/Lobby.tsx`**

```tsx
import { useState, useEffect, useRef } from 'react'
import { createRoom, joinRoom, subscribeToRoom, updateRoomSong, setRoomStatus, createBroadcastChannel, subscribeGhostState } from '../game/supabase'
import type { Room, PlayerRole } from '../game/types'
import { BUNDLED_SONGS } from '../game/constants'
import type { RealtimeChannel } from '@supabase/supabase-js'

const COLORS = { bg: '#f5f0e8', ink: '#0a0a0a', grey: '#696255' }

interface Props {
  playerName: string
  onGameStart: (room: Room, role: PlayerRole, channel: RealtimeChannel) => void
  onBack: () => void
}

export function Lobby({ playerName, onGameStart, onBack }: Props) {
  const [mode, setMode] = useState<'choose' | 'host' | 'join'>('choose')
  const [room, setRoom] = useState<Room | null>(null)
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const roleRef = useRef<PlayerRole>('host')
  const channelRef = useRef<RealtimeChannel | null>(null)
  const unsubRef = useRef<(() => void) | null>(null)

  async function handleHost() {
    setLoading(true)
    setError('')
    try {
      const r = await createRoom(playerName, BUNDLED_SONGS[0].id)
      setRoom(r)
      setMode('host')
      const unsub = subscribeToRoom(r.id, (updated) => {
        setRoom(updated)
        if (updated.startAt) {
          const ch = createBroadcastChannel(updated.id)
          ch.subscribe()
          channelRef.current = ch
          onGameStart(updated, 'host', ch)
        }
      })
      unsubRef.current = unsub
    } catch (e) {
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
      roleRef.current = 'guest'
      setRoom(r)
      setMode('join')
      const unsub = subscribeToRoom(r.id, (updated) => {
        setRoom(updated)
        if (updated.startAt) {
          const ch = createBroadcastChannel(updated.id)
          ch.subscribe()
          channelRef.current = ch
          onGameStart(updated, 'guest', ch)
        }
      })
      unsubRef.current = unsub
    } catch (e) {
      setError('Room not found or already started.')
    }
    setLoading(false)
  }

  async function handleChangeSong(songId: string) {
    if (!room) return
    await updateRoomSong(room.id, songId)
    setRoom(prev => prev ? { ...prev, songId } : prev)
  }

  async function handleRandom() {
    const pick = BUNDLED_SONGS[Math.floor(Math.random() * BUNDLED_SONGS.length)]
    await handleChangeSong(pick.id)
  }

  async function handleStart() {
    if (!room || !room.guestName) return
    const startAt = Date.now() + 3000
    await setRoomStatus(room.id, 'playing')
    // Broadcast startAt via room update
    const { createClient } = await import('@supabase/supabase-js')
    // Use direct supabase update for startAt — channel broadcast used for ghost state
    const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
    await supabase.from('rooms').update({ start_at: startAt }).eq('id', room.id)
    const ch = createBroadcastChannel(room.id)
    ch.subscribe()
    channelRef.current = ch
    onGameStart({ ...room, startAt, status: 'playing' }, 'host', ch)
  }

  useEffect(() => () => { unsubRef.current?.() }, [])

  const currentSong = BUNDLED_SONGS.find(s => s.id === room?.songId) ?? BUNDLED_SONGS[0]
  const bothReady = room?.guestName != null

  if (mode === 'choose') {
    return (
      <div style={{ minHeight: '100vh', background: COLORS.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }}>
        <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: 3, textTransform: 'uppercase' }}>Multiplayer</div>
        <button onClick={handleHost} disabled={loading} style={btnStyle(true)}>Create Room (Host)</button>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input placeholder="Enter room code" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && handleJoin()} style={{ padding: '8px 12px', border: `1.5px solid ${COLORS.ink}`, borderRadius: 3, background: COLORS.bg, fontSize: 13, fontWeight: 700, width: 170, fontFamily: 'monospace', outline: 'none' }} />
          <button onClick={handleJoin} disabled={loading || !joinCode.trim()} style={btnStyle(false)}>Join</button>
        </div>
        {error && <div style={{ fontSize: 11, color: '#c0392b' }}>{error}</div>}
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: COLORS.grey, letterSpacing: 1, textTransform: 'uppercase' }}>← Back</button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, padding: '28px 20px' }}>
      <div style={{ maxWidth: 400, margin: '0 auto', border: `1.5px solid ${COLORS.ink}`, borderRadius: 5, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '10px 14px', borderBottom: `1.5px solid ${COLORS.ink}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: COLORS.grey }}>Room Code</div>
            <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 4, fontFamily: 'monospace' }}>{room?.code}</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 9, color: COLORS.grey }}>
            {bothReady ? <><strong style={{ color: COLORS.ink }}>Both players ready ✓</strong><br />Waiting for host</> : 'Waiting for player 2…'}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <PlayerSlot name={playerName} tag={mode === 'host' ? 'HOST' : 'GUEST'} you />
          <PlayerSlot name={mode === 'host' ? (room?.guestName ?? undefined) : undefined} tag={mode === 'host' ? (room?.guestName ? 'READY' : '—') : 'HOST'} />

          <div style={{ padding: '9px 12px', border: `1.5px solid ${COLORS.ink}`, borderRadius: 4, background: COLORS.ink, color: COLORS.bg }}>
            <div style={{ fontWeight: 700, fontSize: 12 }}>{currentSong.title}</div>
            <div style={{ fontSize: 9, color: '#c8c4bc', marginTop: 2 }}>{currentSong.bpm} BPM · {currentSong.genre} · {currentSong.duration}</div>
          </div>

          {mode === 'host' && (
            <div style={{ display: 'flex', gap: 6 }}>
              {BUNDLED_SONGS.map(s => (
                <button key={s.id} onClick={() => handleChangeSong(s.id)} style={{ flex: 1, padding: '5px 0', border: `1.5px solid ${COLORS.ink}`, borderRadius: 3, background: room?.songId === s.id ? COLORS.ink : COLORS.bg, color: room?.songId === s.id ? COLORS.bg : COLORS.ink, fontSize: 8, fontWeight: 700, cursor: 'pointer' }}>{s.title.slice(0, 8)}</button>
              ))}
              <button onClick={handleRandom} style={{ padding: '5px 8px', border: `1.5px solid ${COLORS.ink}`, borderRadius: 3, background: COLORS.bg, fontSize: 9, cursor: 'pointer' }}>⚄</button>
            </div>
          )}

          {mode === 'join' && <div style={{ fontSize: 10, color: COLORS.grey, textAlign: 'center', padding: '6px 0' }}>Waiting for host to start the game…</div>}
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 14px', borderTop: `1.5px solid ${COLORS.ink}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 9, color: COLORS.grey }}>{window.location.origin}/room/{room?.code}</div>
          <button onClick={handleStart} disabled={mode !== 'host' || !bothReady} style={{ ...btnStyle(true), opacity: mode === 'host' && bothReady ? 1 : 0.28, padding: '7px 16px' }}>
            START →
          </button>
        </div>
      </div>
    </div>
  )
}

function PlayerSlot({ name, tag, you }: { name?: string; tag: string; you?: boolean }) {
  const COLORS = { bg: '#f5f0e8', ink: '#0a0a0a', grey: '#696255' }
  const empty = !name
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', border: `1.5px ${empty ? 'dashed' : 'solid'} ${COLORS.ink}`, borderRadius: 4, opacity: empty ? 0.5 : 1 }}>
      <div style={{ width: 9, height: 9, borderRadius: '50%', background: empty ? 'transparent' : COLORS.ink, border: empty ? `1.5px solid ${COLORS.ink}` : 'none', flexShrink: 0 }} />
      <div style={{ fontWeight: 700, fontSize: 12, flex: 1, color: empty ? COLORS.grey : COLORS.ink }}>
        {name ?? 'Waiting for Player 2…'}{you && <span style={{ fontSize: 8, border: `1px solid ${COLORS.grey}`, borderRadius: 2, padding: '1px 4px', color: COLORS.grey, marginLeft: 6 }}>you</span>}
      </div>
      <div style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: COLORS.grey }}>{tag}</div>
    </div>
  )
}

function btnStyle(primary: boolean): React.CSSProperties {
  return {
    padding: '9px 20px', border: `1.5px solid #0a0a0a`, borderRadius: 3,
    background: primary ? '#0a0a0a' : '#f5f0e8', color: primary ? '#f5f0e8' : '#0a0a0a',
    fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer',
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add "Deadline run/Designer DDR/src/components/Lobby.tsx"
git commit -m "feat: Lobby component — create/join room, host controls, realtime"
```

---

### Task 13: Results component

**Files:**
- Create: `src/components/Results.tsx`

- [ ] **Step 1: Create `src/components/Results.tsx`**

```tsx
import { useState } from 'react'
import { saveScore } from '../game/supabase'
import type { GameState } from '../game/types'

const COLORS = { bg: '#f5f0e8', ink: '#0a0a0a', grey: '#696255' }

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
      await saveScore({ songId, playerName, score: state.score, perfectCount: state.perfectCount, goodCount: state.goodCount, missCount: state.missCount, maxCombo: state.maxCombo })
      setSaved(true)
    } catch {
      // score save non-critical
    }
    setSaving(false)
  }

  const result = isMultiplayer && opponentScore !== undefined
    ? state.score > opponentScore ? 'YOU WIN' : state.score < opponentScore ? 'YOU LOSE' : 'DRAW'
    : null

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 32 }}>
      <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 4, textTransform: 'uppercase' }}>Results</div>

      {result && (
        <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 4, border: `2px solid ${COLORS.ink}`, padding: '8px 24px', borderRadius: 4 }}>
          {result}
        </div>
      )}

      <div style={{ border: `1.5px solid ${COLORS.ink}`, borderRadius: 4, width: 280 }}>
        <StatRow label="Score" value={state.score.toLocaleString()} large />
        <StatRow label="Perfect" value={String(state.perfectCount)} />
        <StatRow label="Good" value={String(state.goodCount)} />
        <StatRow label="Miss" value={String(state.missCount)} />
        <StatRow label="Max Combo" value={`×${state.maxCombo}`} last />
      </div>

      {!saved && (
        <button onClick={handleSave} disabled={saving} style={{ width: 280, padding: '10px 0', background: COLORS.ink, color: COLORS.bg, border: 'none', borderRadius: 3, fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer', opacity: saving ? 0.5 : 1 }}>
          {saving ? 'Saving…' : `Save as ${playerName}`}
        </button>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onPlayAgain} style={outlineBtn}>Play Again</button>
        <button onClick={onChangeSong} style={outlineBtn}>Change Song</button>
        <button onClick={onLeaderboard} style={outlineBtn}>Leaderboard</button>
      </div>
    </div>
  )
}

const outlineBtn: React.CSSProperties = {
  flex: 1, padding: '8px 0', border: `1.5px solid #0a0a0a`, borderRadius: 3,
  background: '#f5f0e8', fontSize: 9, fontWeight: 700, letterSpacing: 1,
  textTransform: 'uppercase', cursor: 'pointer',
}

function StatRow({ label, value, large, last }: { label: string; value: string; large?: boolean; last?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: last ? 'none' : `1px solid rgba(10,10,10,0.1)` }}>
      <span style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: '#696255' }}>{label}</span>
      <span style={{ fontSize: large ? 24 : 14, fontWeight: large ? 900 : 700 }}>{value}</span>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "Deadline run/Designer DDR/src/components/Results.tsx"
git commit -m "feat: Results screen with save to leaderboard"
```

---

### Task 14: Leaderboard component

**Files:**
- Create: `src/components/Leaderboard.tsx`

- [ ] **Step 1: Create `src/components/Leaderboard.tsx`**

```tsx
import { useState, useEffect } from 'react'
import { getLeaderboard } from '../game/supabase'
import { BUNDLED_SONGS } from '../game/constants'
import type { Score } from '../game/types'

const COLORS = { bg: '#f5f0e8', ink: '#0a0a0a', grey: '#696255' }

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
    getLeaderboard(songId).then(s => { setScores(s); setLoading(false) })
  }, [songId])

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, padding: '28px 20px' }}>
      <div style={{ maxWidth: 400, margin: '0 auto' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16, color: COLORS.grey }}>← Back</button>
        <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 20 }}>Leaderboard</div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {BUNDLED_SONGS.map(s => (
            <button key={s.id} onClick={() => setSongId(s.id)} style={{ flex: 1, padding: '6px 0', border: `1.5px solid ${COLORS.ink}`, borderRadius: 3, background: songId === s.id ? COLORS.ink : COLORS.bg, color: songId === s.id ? COLORS.bg : COLORS.ink, fontSize: 9, fontWeight: 700, cursor: 'pointer' }}>
              {s.title.slice(0, 12)}
            </button>
          ))}
        </div>

        <div style={{ border: `1.5px solid ${COLORS.ink}`, borderRadius: 4, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 20, textAlign: 'center', color: COLORS.grey, fontSize: 11 }}>Loading…</div>
          ) : scores.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: COLORS.grey, fontSize: 11 }}>No scores yet. Be the first!</div>
          ) : scores.map((s, i) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderBottom: i < scores.length - 1 ? `1px solid rgba(10,10,10,0.1)` : 'none', background: i === 0 ? COLORS.ink : COLORS.bg, color: i === 0 ? COLORS.bg : COLORS.ink }}>
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
```

- [ ] **Step 2: Commit**

```bash
git add "Deadline run/Designer DDR/src/components/Leaderboard.tsx"
git commit -m "feat: Leaderboard — per-song top 10 from Supabase"
```

---

### Task 15: App.tsx — screen state machine

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Replace `src/App.tsx`**

```tsx
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

const isMobile = () => window.innerWidth < 768 || ('ontouchstart' in window)

export default function App() {
  const [screen, setScreen] = useState<Screen>('start')
  const [playerName, setPlayerName] = useState('')
  const [isMultiplayer, setIsMultiplayer] = useState(false)
  const [room, setRoom] = useState<Room | null>(null)
  const [playerRole, setPlayerRole] = useState<PlayerRole>('host')
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)

  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null)
  const [beatMap, setBeatMap] = useState<import('./game/types').BeatMap | null>(null)
  const [songId, setSongId] = useState('')

  const [finalState, setFinalState] = useState<GameState | null>(null)
  const [ghostState, setGhostState] = useState<GhostState | null>(null)
  const [opponentScore, setOpponentScore] = useState<number | undefined>()

  const hitRef = useRef<((lane: number) => void) | null>(null)

  async function handleSinglePlayer(name: string) {
    setPlayerName(name)
    setIsMultiplayer(false)
    setScreen('songSelect')
  }

  async function handleMultiplayer(name: string) {
    setPlayerName(name)
    setIsMultiplayer(true)
    setScreen('lobby')
  }

  async function handleSongSelect(id: string, uploadedBpm?: number, uploadedBuffer?: ArrayBuffer) {
    await resumeAudio()
    setSongId(id)

    let bm: import('./game/types').BeatMap
    let ab: AudioBuffer

    if (uploadedBuffer && uploadedBpm) {
      ab = await loadAudioBufferFromArray(uploadedBuffer)
      bm = createUploadedBeatMap(id.replace('upload-', ''), ab, uploadedBpm)
    } else {
      const bundled = await Promise.all([
        loadBeatMap(id),
        loadAudioBuffer(`/songs/${id}.mp3`),
      ])
      bm = bundled[0]
      ab = bundled[1]
    }

    setBeatMap(bm)
    setAudioBuffer(ab)
    setScreen('game')
  }

  async function handleLobbyStart(r: Room, role: PlayerRole, ch: RealtimeChannel) {
    setRoom(r)
    setPlayerRole(role)
    setChannel(ch)

    // Wire up ghost state subscription for opponent
    subscribeGhostState(ch, (gs) => {
      setGhostState(gs)
      setOpponentScore(gs.score)
    })

    // Load the song
    const bundledSong = (await import('./game/constants')).BUNDLED_SONGS.find(s => s.id === r.songId)
    if (bundledSong) {
      await resumeAudio()
      setSongId(r.songId)
      const [bm, ab] = await Promise.all([
        loadBeatMap(r.songId),
        loadAudioBuffer(`/songs/${r.songId}.mp3`),
      ])
      setBeatMap(bm)
      setAudioBuffer(ab)
      setScreen('game')
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
```

- [ ] **Step 2: Update `src/main.tsx`**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 3: Verify it compiles**

```bash
npm run build
```

Expected: Build succeeds, output in `dist/`

- [ ] **Step 4: Commit**

```bash
git add "Deadline run/Designer DDR/src/App.tsx" "Deadline run/Designer DDR/src/main.tsx"
git commit -m "feat: App screen state machine wiring all screens together"
```

---

### Task 16: Bundled beat maps + audio files

**Files:**
- Create: `public/songs/chipper-doodle-v2.json`
- Create: `public/songs/faster-does-it.json`
- Create: `public/songs/cipher.json`
- Download: `public/songs/chipper-doodle-v2.mp3` (from incompetech.com)
- Download: `public/songs/faster-does-it.mp3`
- Download: `public/songs/cipher.mp3`

- [ ] **Step 1: Download Kevin MacLeod tracks**

Go to https://incompetech.com and download:
- "Chipper Doodle v2" → save as `public/songs/chipper-doodle-v2.mp3`
- "Faster Does It" → save as `public/songs/faster-does-it.mp3`
- "Cipher" → save as `public/songs/cipher.mp3`

All are CC BY 4.0. Attribution is already shown in StartScreen.

- [ ] **Step 2: Create `public/songs/chipper-doodle-v2.json`**

```json
{
  "id": "chipper-doodle-v2",
  "title": "Chipper Doodle v2",
  "artist": "Kevin MacLeod",
  "bpm": 120,
  "offset": 0.0,
  "audioFile": "chipper-doodle-v2.mp3",
  "notes": [
    { "time": 0.5,  "lanes": [0] },
    { "time": 1.0,  "lanes": [3] },
    { "time": 1.5,  "lanes": [1] },
    { "time": 2.0,  "lanes": [2] },
    { "time": 2.5,  "lanes": [0] },
    { "time": 3.0,  "lanes": [1, 3] },
    { "time": 3.5,  "lanes": [2] },
    { "time": 4.0,  "lanes": [0] },
    { "time": 4.5,  "lanes": [3] },
    { "time": 5.0,  "lanes": [1] },
    { "time": 5.5,  "lanes": [2] },
    { "time": 6.0,  "lanes": [0, 2] },
    { "time": 6.5,  "lanes": [3] },
    { "time": 7.0,  "lanes": [1] },
    { "time": 7.5,  "lanes": [0] },
    { "time": 8.0,  "lanes": [2] },
    { "time": 8.5,  "lanes": [1] },
    { "time": 9.0,  "lanes": [3] },
    { "time": 9.5,  "lanes": [0] },
    { "time": 10.0, "lanes": [1, 2] },
    { "time": 10.5, "lanes": [3] },
    { "time": 11.0, "lanes": [0] },
    { "time": 11.5, "lanes": [2] },
    { "time": 12.0, "lanes": [1] }
  ]
}
```

- [ ] **Step 3: Create `public/songs/faster-does-it.json`**

```json
{
  "id": "faster-does-it",
  "title": "Faster Does It",
  "artist": "Kevin MacLeod",
  "bpm": 140,
  "offset": 0.0,
  "audioFile": "faster-does-it.mp3",
  "notes": [
    { "time": 0.43, "lanes": [0] },
    { "time": 0.86, "lanes": [2] },
    { "time": 1.29, "lanes": [1] },
    { "time": 1.71, "lanes": [3] },
    { "time": 2.14, "lanes": [0] },
    { "time": 2.57, "lanes": [1, 3] },
    { "time": 3.0,  "lanes": [2] },
    { "time": 3.43, "lanes": [0] },
    { "time": 3.86, "lanes": [3] },
    { "time": 4.29, "lanes": [1] },
    { "time": 4.71, "lanes": [2] },
    { "time": 5.14, "lanes": [0, 2] },
    { "time": 5.57, "lanes": [3] },
    { "time": 6.0,  "lanes": [1] },
    { "time": 6.43, "lanes": [0] },
    { "time": 6.86, "lanes": [2] },
    { "time": 7.29, "lanes": [1, 3] },
    { "time": 7.71, "lanes": [0] },
    { "time": 8.14, "lanes": [2] },
    { "time": 8.57, "lanes": [3] },
    { "time": 9.0,  "lanes": [0, 1] },
    { "time": 9.43, "lanes": [2] },
    { "time": 9.86, "lanes": [3] },
    { "time": 10.29,"lanes": [0] },
    { "time": 10.71,"lanes": [1] },
    { "time": 11.14,"lanes": [2, 3] },
    { "time": 11.57,"lanes": [0] },
    { "time": 12.0, "lanes": [1] }
  ]
}
```

- [ ] **Step 4: Create `public/songs/cipher.json`**

```json
{
  "id": "cipher",
  "title": "Cipher",
  "artist": "Kevin MacLeod",
  "bpm": 150,
  "offset": 0.0,
  "audioFile": "cipher.mp3",
  "notes": [
    { "time": 0.4,  "lanes": [0] },
    { "time": 0.8,  "lanes": [3] },
    { "time": 1.2,  "lanes": [1] },
    { "time": 1.6,  "lanes": [0, 2] },
    { "time": 2.0,  "lanes": [3] },
    { "time": 2.4,  "lanes": [1] },
    { "time": 2.8,  "lanes": [2] },
    { "time": 3.2,  "lanes": [0] },
    { "time": 3.6,  "lanes": [1, 3] },
    { "time": 4.0,  "lanes": [2] },
    { "time": 4.4,  "lanes": [0] },
    { "time": 4.8,  "lanes": [3] },
    { "time": 5.2,  "lanes": [1, 2] },
    { "time": 5.6,  "lanes": [0] },
    { "time": 6.0,  "lanes": [3] },
    { "time": 6.4,  "lanes": [1] },
    { "time": 6.8,  "lanes": [0, 2] },
    { "time": 7.2,  "lanes": [3] },
    { "time": 7.6,  "lanes": [1] },
    { "time": 8.0,  "lanes": [0, 3] },
    { "time": 8.4,  "lanes": [2] },
    { "time": 8.8,  "lanes": [1] },
    { "time": 9.2,  "lanes": [0] },
    { "time": 9.6,  "lanes": [2, 3] },
    { "time": 10.0, "lanes": [1] },
    { "time": 10.4, "lanes": [0] },
    { "time": 10.8, "lanes": [3] },
    { "time": 11.2, "lanes": [1, 2] },
    { "time": 11.6, "lanes": [0] },
    { "time": 12.0, "lanes": [3] }
  ]
}
```

- [ ] **Step 5: Commit (no MP3s — add to .gitignore or commit separately)**

```bash
# Add large MP3s to git if under 50MB each, otherwise note they must be downloaded manually
git add "Deadline run/Designer DDR/public/songs/"
git commit -m "feat: bundled beat maps for 3 Kevin MacLeod tracks"
```

---

### Task 17: Fix canvas arrow rendering (integration)

After integrating all components, the canvas draw loop references `elapsedMs` which is set from `state.songElapsed * 1000`. However `stateRef.current` updates every rAF from `useGameEngine`, but the canvas draw loop has its own rAF. Wire them together using a shared stateRef.

- [ ] **Step 1: Pass `stateRef` from `useGameEngine` to `GameCanvas` draw loop**

In `GameCanvas.tsx`, the draw function accesses `stateRef.current` directly — this is already correct since `stateRef` is the mutable ref. Verify the draw loop uses `stateRef.current.songElapsed` (not `displayState.songElapsed`) for smooth rendering.

- [ ] **Step 2: Manual smoke test**

```bash
npm run dev
```

Open http://localhost:5173:
1. Enter name → Single Player → select Chipper Doodle → verify arrows fall and keyboard hits register
2. Check score updates, combo tracks, PERFECT/GOOD/MISS shows
3. Song ends → Results screen appears with correct counts

- [ ] **Step 3: Mobile test**

Open DevTools → set to iPhone viewport → verify mobile tap buttons appear and arrow keys are hidden

- [ ] **Step 4: Commit any fixes found during smoke test**

```bash
git add -p
git commit -m "fix: canvas render integration — stateRef timing alignment"
```

---

### Task 18: End-to-end integration tests

**Files:**
- Create: `src/game/scoring.test.ts` (already done)
- Create: `src/game/beatmap.test.ts` (already done)

- [ ] **Step 1: Run full test suite**

```bash
npm run test:run
```

Expected: All tests pass

- [ ] **Step 2: Add an integration test for the full scoring flow**

Append to `src/game/scoring.test.ts`:

```ts
describe('full scoring session simulation', () => {
  it('tracks score through a mixed sequence', () => {
    let score = 0
    let combo = 0
    const hits: Array<{ judgment: Judgment; expectedScore: number }> = [
      { judgment: 'PERFECT', expectedScore: 100 },   // combo 0 → ×1
      { judgment: 'PERFECT', expectedScore: 100 },   // combo 1 → ×1
      { judgment: 'GOOD',    expectedScore: 50  },   // flat 50
      { judgment: 'MISS',    expectedScore: 0   },   // combo resets
      { judgment: 'PERFECT', expectedScore: 100 },   // combo 0 again → ×1
    ]

    for (const hit of hits) {
      const pts = calcPoints(hit.judgment, combo)
      expect(pts).toBe(hit.expectedScore)
      score += pts
      combo = hit.judgment === 'MISS' ? 0 : combo + 1
    }
    expect(score).toBe(350)
    expect(combo).toBe(1)
  })
})
```

- [ ] **Step 3: Run again**

```bash
npm run test:run
```

Expected: All tests pass including new simulation test

- [ ] **Step 4: Commit**

```bash
git add "Deadline run/Designer DDR/src/game/scoring.test.ts"
git commit -m "test: add full scoring session simulation"
```

---

### Task 19: Vercel deployment

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: Create `vercel.json`**

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

- [ ] **Step 2: Set Vercel environment variables**

In Vercel dashboard (vercel.com):
1. Import the GitHub repo
2. Set root directory to `Deadline run/Designer DDR`
3. Add environment variables:
   - `VITE_SUPABASE_URL` → your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` → your Supabase anon key

- [ ] **Step 3: Deploy**

```bash
npx vercel --prod
```

Expected: Production URL printed, game accessible at URL

- [ ] **Step 4: Smoke test production**

Visit the production URL:
1. Single player game works end-to-end
2. Leaderboard loads (confirms Supabase connection)
3. On mobile: tap controls appear

- [ ] **Step 5: Commit vercel config**

```bash
git add "Deadline run/Designer DDR/vercel.json"
git commit -m "chore: add Vercel rewrite config for SPA routing"
```

---

### Task 20: Multiplayer end-to-end test

- [ ] **Step 1: Open two browser windows (or two devices)**

Window 1: http://localhost:5173 (or production URL)
Window 2: http://localhost:5173 (incognito or different device)

- [ ] **Step 2: Test lobby flow**

1. Window 1: Enter name → Multiple Players → Create Room → note code
2. Window 2: Enter name → Multiple Players → enter room code → Join
3. Window 1: verify guest name appears in lobby
4. Window 1: START → both windows show 3-2-1 countdown

- [ ] **Step 3: Test ghost panel**

During gameplay, Window 1 should show Window 2's ghost panel (mini lanes, score, combo) updating in near real-time.

- [ ] **Step 4: Test results**

When song ends on both devices, results screen should show YOU WIN / YOU LOSE / DRAW based on scores.

- [ ] **Step 5: Fix any issues found and commit**

```bash
git add -p
git commit -m "fix: multiplayer integration issues from end-to-end test"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task covering it |
|---|---|
| Single player flow | Tasks 10, 11, 15 |
| Multiplayer room code flow | Task 12, 20 |
| 3-2-1 countdown + simultaneous start | Tasks 12, 15 |
| Ghost panel (mini lanes, score, combo) | Tasks 7, 8 |
| PERFECT/GOOD/MISS windows | Tasks 2, 3 |
| Combo tiers ×1/×2/×3/×4 | Tasks 2, 3 |
| Arrow fall constant 900ms | Tasks 2, 7 |
| Chord mechanic (multi-lane notes) | Tasks 6, 7 |
| Bundled Kevin MacLeod tracks | Task 16 |
| MP3 upload + BPM detection | Tasks 5, 6, 11 |
| BPM ramp for uploaded tracks | Task 6 |
| BPM preset override buttons | Task 11 |
| PREVIEW BEAT (synthesised ticks) | Task 5 |
| Mobile on-screen tap buttons | Task 9 |
| Desktop arrow key controls | Task 8 |
| Global leaderboard (Supabase) | Tasks 4, 14 |
| Player name persistence (localStorage) | Task 10 |
| Results screen with winner banner | Task 13 |
| Supabase schema (rooms + scores) | Task 4 |
| Vercel deployment | Task 19 |
| Monochrome palette only | All UI tasks |
| Attribution in-app (CC BY 4.0) | Task 10 |
