import { deserialize, serialize, type SaveData } from '../persist/storage'
import { normalizeWorldKind, type WorldKind } from '../world/worldKind'
import { getSupabase } from './supabase'

/**
 * Player profiles and cloud world saves, backed by `minicraft_*` Postgres
 * functions (SECURITY DEFINER RPCs — the tables themselves are not readable
 * with the anon key). A profile is identified by an opaque session token
 * returned on signup/login and kept in localStorage.
 */

export interface Profile {
  token: string
  username: string
}

export interface WorldMeta {
  id: string
  name: string
  updatedAt: string
  /** Terrain or robot world. */
  kind: WorldKind
}

export const PROFILE_KEY = 'minicraft-profile-v1'
const WORLD_KINDS_KEY = 'minicraft-cloud-world-kinds-v1'

/**
 * World kinds remembered on this device, keyed by cloud world id.
 *
 * `minicraft_list_worlds` reports the kind straight from the save (see the
 * 0002 migration), but a project still running the older function returns rows
 * without it. Everything created before robot worlds is a terrain world, so the
 * only rows that would be mislabelled are robot worlds this device made — and
 * those are exactly the ones this cache covers.
 */
function readKindCache(): Record<string, WorldKind> {
  try {
    const raw = localStorage.getItem(WORLD_KINDS_KEY)
    return raw ? (JSON.parse(raw) as Record<string, WorldKind>) : {}
  } catch {
    return {}
  }
}

export function rememberWorldKind(worldId: string, kind: WorldKind): void {
  try {
    localStorage.setItem(WORLD_KINDS_KEY, JSON.stringify({ ...readKindCache(), [worldId]: kind }))
  } catch {
    // ignore
  }
}

export function loadStoredProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as Profile
    return typeof p.token === 'string' && typeof p.username === 'string' ? p : null
  } catch {
    return null
  }
}

export function storeProfile(profile: Profile | null): void {
  try {
    if (profile) localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
    else localStorage.removeItem(PROFILE_KEY)
  } catch {
    // ignore
  }
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await getSupabase().rpc(fn, args)
  if (error) {
    // Postgres `raise exception` messages are user-facing by design here.
    throw new Error(error.message || 'Something went wrong — try again')
  }
  return data as T
}

export function isSessionExpired(e: unknown): boolean {
  return e instanceof Error && e.message.includes('Session expired')
}

export async function signUp(username: string, password: string): Promise<Profile> {
  return rpc<Profile>('minicraft_signup', { p_username: username, p_password: password })
}

export async function signIn(username: string, password: string): Promise<Profile> {
  return rpc<Profile>('minicraft_login', { p_username: username, p_password: password })
}

export async function signOut(token: string): Promise<void> {
  await rpc<null>('minicraft_logout', { p_token: token })
}

/**
 * Rename the signed-in profile (password-confirmed). Saved worlds are keyed by
 * profile id, not username, so they are untouched. Returns the refreshed profile
 * (same session token, new username).
 */
export async function changeUsername(token: string, password: string, newUsername: string): Promise<Profile> {
  return rpc<Profile>('minicraft_change_username', {
    p_token: token,
    p_password: password,
    p_new_username: newUsername,
  })
}

/** Reset the signed-in profile's password (current password required). Worlds are untouched. */
export async function changePassword(token: string, currentPassword: string, newPassword: string): Promise<void> {
  await rpc<null>('minicraft_change_password', {
    p_token: token,
    p_current_password: currentPassword,
    p_new_password: newPassword,
  })
}

export async function listWorlds(token: string): Promise<WorldMeta[]> {
  const rows = await rpc<(Omit<WorldMeta, 'kind'> & { kind?: unknown })[]>('minicraft_list_worlds', { p_token: token })
  const cache = readKindCache()
  return rows.map((w) => ({
    id: w.id,
    name: w.name,
    updatedAt: w.updatedAt,
    kind: normalizeWorldKind(w.kind ?? cache[w.id]),
  }))
}

/** Create (worldId null) or overwrite a world; returns the world id. */
export async function saveWorld(
  token: string,
  worldId: string | null,
  name: string | null,
  data: SaveData,
): Promise<string> {
  const id = await rpc<string>('minicraft_save_world', {
    p_token: token,
    p_world_id: worldId,
    p_name: name,
    p_data: JSON.parse(serialize(data)),
  })
  rememberWorldKind(id, normalizeWorldKind(data.worldKind))
  return id
}

export async function loadWorld(token: string, worldId: string): Promise<SaveData> {
  const raw = await rpc<unknown>('minicraft_load_world', { p_token: token, p_world_id: worldId })
  const data = deserialize(JSON.stringify(raw))
  if (!data) throw new Error('That world save is corrupt or from an incompatible version')
  return data
}

export async function deleteWorld(token: string, worldId: string): Promise<void> {
  await rpc<null>('minicraft_delete_world', { p_token: token, p_world_id: worldId })
}
