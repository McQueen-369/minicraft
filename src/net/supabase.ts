import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js'

// Public keys for the shared Supabase project — safe to ship to browsers.
// Override with VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY env vars to use your own project.
const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? 'https://ijvedupnybsvvnjfioar.supabase.co'
const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  'sb_publishable_J8dJZulZMdHzXfIHBvSIwg_efHGRe7G'

let client: SupabaseClient | null = null

export function supabaseConfigured(): boolean {
  return true
}

export function getSupabase(): SupabaseClient {
  if (!client) client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  return client
}

export function gameChannel(roomCode: string): RealtimeChannel {
  return getSupabase().channel(`minicraft-${roomCode}`, {
    config: { broadcast: { self: false }, presence: { key: crypto.randomUUID() } },
  })
}
