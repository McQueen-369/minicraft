import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export function supabaseConfigured(): boolean {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
}

export function getSupabase(): SupabaseClient {
  if (!client) {
    if (!supabaseConfigured()) throw new Error('Supabase is not configured (.env.local)')
    client = createClient(import.meta.env.VITE_SUPABASE_URL as string, import.meta.env.VITE_SUPABASE_ANON_KEY as string)
  }
  return client
}

export function gameChannel(roomCode: string): RealtimeChannel {
  return getSupabase().channel(`minicraft-${roomCode}`, {
    config: { broadcast: { self: false }, presence: { key: crypto.randomUUID() } },
  })
}
