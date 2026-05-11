import { useRef, useEffect, useCallback } from 'react'
import type { BeatMap, GameState, Arrow, Judgment, GhostState } from './types'
import { FALL_MS, GOOD_WINDOW } from './constants'
import { calcJudgment, calcPoints } from './scoring'
import { getAudioCurrentTime, playSong, stopSong, resumeAudio } from './audio'

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
  startAtMs?: number
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
    const nowCtx = getAudioCurrentTime()
    const audioElapsedMs = (nowCtx - stateRef.current.audioStartTime) * 1000
    const { arrows } = stateRef.current

    let best: Arrow | null = null
    let bestDist = Infinity
    for (const arrow of arrows) {
      if (arrow.lane !== lane || arrow.hitTime !== undefined || arrow.missed) continue
      const targetMs = arrow.spawnTime + FALL_MS
      const dist = Math.abs(audioElapsedMs - targetMs)
      if (dist < bestDist && dist <= GOOD_WINDOW) { bestDist = dist; best = arrow }
    }

    if (!best) return
    const offsetMs = audioElapsedMs - (best.spawnTime + FALL_MS)
    const judgment: Judgment = calcJudgment(offsetMs)
    const pts = calcPoints(judgment, stateRef.current.combo)
    best.hitTime = audioElapsedMs

    const newCombo = judgment === 'MISS' ? 0 : stateRef.current.combo + 1
    stateRef.current = {
      ...stateRef.current,
      score: stateRef.current.score + pts,
      combo: newCombo,
      maxCombo: Math.max(stateRef.current.maxCombo, newCombo),
      perfectCount: stateRef.current.perfectCount + (judgment === 'PERFECT' ? 1 : 0),
      goodCount: stateRef.current.goodCount + (judgment === 'GOOD' ? 1 : 0),
      missCount: stateRef.current.missCount + (judgment === 'MISS' ? 1 : 0),
      lastJudgment: judgment,
    }
  }, [])

  useEffect(() => {
    if (!options) return

    const { beatMap, audioBuffer, startAtMs, onStateSnapshot, onGhostBroadcast } = options

    async function start() {
      await resumeAudio()
      const contextNow = getAudioCurrentTime()
      const audioStartContextTime = startAtMs !== undefined
        ? contextNow + Math.max(0, startAtMs - Date.now()) / 1000
        : contextNow + 0.1

      playSong(audioBuffer, audioStartContextTime)

      stateRef.current = {
        ...DEFAULT_STATE,
        audioStartTime: audioStartContextTime,
        songDuration: audioBuffer.duration,
        isPlaying: true,
        arrows: [],
      }
      scheduledRef.current.clear()

      function loop() {
        const nowCtx = getAudioCurrentTime()
        if (nowCtx < audioStartContextTime) {
          rafRef.current = requestAnimationFrame(loop)
          return
        }

        const audioElapsedMs = (nowCtx - audioStartContextTime) * 1000
        const audioElapsedSec = audioElapsedMs / 1000

        // Spawn arrows whose spawn window has arrived
        for (let i = 0; i < beatMap.notes.length; i++) {
          if (scheduledRef.current.has(i)) continue
          const noteMs = (beatMap.notes[i].time + (beatMap.offset ?? 0)) * 1000
          const spawnMs = noteMs - FALL_MS
          if (audioElapsedMs >= spawnMs) {
            scheduledRef.current.add(i)
            const note = beatMap.notes[i]
            const newArrows: Arrow[] = note.lanes.map((lane) => ({
              id: `${i}-${lane}`,
              lane,
              spawnTime: spawnMs,
              missed: false,
            }))
            stateRef.current = {
              ...stateRef.current,
              arrows: [...stateRef.current.arrows, ...newArrows],
            }
          }
        }

        // Mark missed arrows (past target + GOOD_WINDOW without a hit)
        let newMissCount = 0
        const updatedArrows = stateRef.current.arrows.map((arrow) => {
          if (arrow.hitTime !== undefined || arrow.missed) return arrow
          if (audioElapsedMs > arrow.spawnTime + FALL_MS + GOOD_WINDOW) {
            newMissCount++
            return { ...arrow, missed: true }
          }
          return arrow
        })

        stateRef.current = {
          ...stateRef.current,
          arrows: updatedArrows,
          songElapsed: audioElapsedSec,
          missCount: stateRef.current.missCount + newMissCount,
          combo: newMissCount > 0 ? 0 : stateRef.current.combo,
          lastJudgment: newMissCount > 0 ? 'MISS' : stateRef.current.lastJudgment,
        }

        onStateSnapshot({ ...stateRef.current })

        if (audioElapsedSec < audioBuffer.duration + 1) {
          rafRef.current = requestAnimationFrame(loop)
        } else {
          stateRef.current = { ...stateRef.current, isPlaying: false }
          onStateSnapshot({ ...stateRef.current })
        }
      }

      rafRef.current = requestAnimationFrame(loop)

      if (onGhostBroadcast) {
        ghostTimerRef.current = window.setInterval(() => {
          const s = stateRef.current
          const nowCtx = getAudioCurrentTime()
          const elapsedMs = (nowCtx - s.audioStartTime) * 1000
          const arrowPositions = s.arrows
            .filter((a) => a.hitTime === undefined && !a.missed)
            .map((a) => ({
              lane: a.lane,
              progress: Math.min(1, Math.max(0, (elapsedMs - a.spawnTime) / FALL_MS)),
            }))
          onGhostBroadcast({ score: s.score, combo: s.combo, lastJudgment: s.lastJudgment, arrowPositions })
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
