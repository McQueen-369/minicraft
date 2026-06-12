// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./supabase', () => ({
  getSupabase: () => ({ rpc: rpcMock }),
  supabaseConfigured: () => true,
}))

const rpcMock = vi.fn()

import {
  deleteWorld,
  isSessionExpired,
  listWorlds,
  loadStoredProfile,
  loadWorld,
  PROFILE_KEY,
  saveWorld,
  signIn,
  signUp,
  storeProfile,
} from './cloud'
import type { SaveData } from '../persist/storage'

const SAVE: SaveData = {
  version: 1,
  seed: 7,
  player: { x: 1, y: 40, z: 2, yaw: 0, pitch: 0, fly: false },
  inventory: [],
  edits: { '1,2,3': 5 },
  chests: {},
  animals: { animals: [], spawnedChunks: [] },
  skyTime: 0.3,
}

beforeEach(() => {
  rpcMock.mockReset()
  localStorage.clear()
})

describe('profile storage', () => {
  it('round-trips a profile through localStorage', () => {
    storeProfile({ token: 't-1', username: 'steve' })
    expect(loadStoredProfile()).toEqual({ token: 't-1', username: 'steve' })
    storeProfile(null)
    expect(loadStoredProfile()).toBeNull()
  })

  it('rejects corrupt stored profiles', () => {
    localStorage.setItem(PROFILE_KEY, '{"nope":true}')
    expect(loadStoredProfile()).toBeNull()
    localStorage.setItem(PROFILE_KEY, 'not json')
    expect(loadStoredProfile()).toBeNull()
  })
})

describe('rpc wrappers', () => {
  it('signs up and in via the minicraft RPCs', async () => {
    rpcMock.mockResolvedValue({ data: { token: 't', username: 'steve' }, error: null })
    expect(await signUp('steve', 'pw1234')).toEqual({ token: 't', username: 'steve' })
    expect(rpcMock).toHaveBeenCalledWith('minicraft_signup', { p_username: 'steve', p_password: 'pw1234' })
    expect(await signIn('steve', 'pw1234')).toEqual({ token: 't', username: 'steve' })
    expect(rpcMock).toHaveBeenCalledWith('minicraft_login', { p_username: 'steve', p_password: 'pw1234' })
  })

  it('surfaces Postgres exception messages as Errors', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'That username is taken' } })
    await expect(signUp('steve', 'pw')).rejects.toThrow('That username is taken')
  })

  it('saves worlds as plain JSON and returns the id', async () => {
    rpcMock.mockResolvedValue({ data: 'world-id', error: null })
    expect(await saveWorld('tok', null, 'My World', SAVE)).toBe('world-id')
    const args = rpcMock.mock.calls[0][1]
    expect(args.p_data.edits['1,2,3']).toBe(5)
    expect(await saveWorld('tok', 'world-id', null, SAVE)).toBe('world-id')
  })

  it('validates loaded worlds through the save sanitizer', async () => {
    rpcMock.mockResolvedValue({ data: JSON.parse(JSON.stringify(SAVE)), error: null })
    const loaded = await loadWorld('tok', 'world-id')
    expect(loaded.seed).toBe(7)
    rpcMock.mockResolvedValue({ data: { version: 99 }, error: null })
    await expect(loadWorld('tok', 'world-id')).rejects.toThrow(/corrupt or from an incompatible version/)
  })

  it('lists and deletes worlds', async () => {
    rpcMock.mockResolvedValue({ data: [{ id: 'w', name: 'A', updatedAt: 'now' }], error: null })
    expect(await listWorlds('tok')).toHaveLength(1)
    rpcMock.mockResolvedValue({ data: null, error: null })
    await deleteWorld('tok', 'w')
    expect(rpcMock).toHaveBeenCalledWith('minicraft_delete_world', { p_token: 'tok', p_world_id: 'w' })
  })
})

describe('isSessionExpired', () => {
  it('detects the expired-session error from the server', () => {
    expect(isSessionExpired(new Error('Session expired — please sign in again'))).toBe(true)
    expect(isSessionExpired(new Error('World not found'))).toBe(false)
    expect(isSessionExpired('Session expired')).toBe(false)
  })
})
