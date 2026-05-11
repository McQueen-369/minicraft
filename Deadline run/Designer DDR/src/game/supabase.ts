import { createClient, type RealtimeChannel } from '@supabase/supabase-js'
import type { Room, Score, GhostState } from './types'
import { ROOM_CODE_PREFIX } from './constants'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
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

export async function setRoomStartAt(roomId: string, startAt: number): Promise<void> {
  const { error } = await supabase
    .from('rooms')
    .update({ status: 'playing', start_at: startAt })
    .eq('id', roomId)
  if (error) throw error
}

export function subscribeToRoom(
  roomId: string,
  onUpdate: (room: Room) => void,
): () => void {
  const channel = supabase
    .channel(`room-${roomId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
      (payload) => onUpdate(mapRoom(payload.new as RoomRow)),
    )
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
  id: string
  code: string
  host_name: string
  guest_name: string | null
  song_id: string
  status: string
  start_at: number | null
  created_at: string
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

interface ScoreRow {
  id: string
  song_id: string
  player_name: string
  score: number
  perfect_count: number
  good_count: number
  miss_count: number
  max_combo: number
  created_at: string
}

function mapScore(row: ScoreRow): Score {
  return {
    id: row.id,
    songId: row.song_id,
    playerName: row.player_name,
    score: row.score,
    perfectCount: row.perfect_count,
    goodCount: row.good_count,
    missCount: row.miss_count,
    maxCombo: row.max_combo,
  }
}
