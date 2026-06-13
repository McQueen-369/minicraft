import * as THREE from 'three'
import { AUTOSAVE_INTERVAL_MS, CLOUD_AUTOSAVE_INTERVAL_MS, WATER_LEVEL } from './constants'
import { blockKey, chunkKey, worldToChunk } from './core/coords'
import { hashString } from './core/rng'
import { EntityManager } from './entities/entityManager'
import { BlockInteraction } from './interact/blockInteraction'
import { chestLoot } from './items/chest'
import { Inventory } from './items/inventory'
import type { ChestContents } from './items/items'
import * as cloud from './net/cloud'
import { isSessionExpired, loadStoredProfile, storeProfile, type Profile, type WorldMeta } from './net/cloud'
import { connectChannel, Multiplayer } from './net/multiplayer'
import { generateRoomCode, isValidRoomCode, type SnapshotMsg } from './net/protocol'
import { supabaseConfigured } from './net/supabase'
import { MultiWorldStore, type SaveData } from './persist/storage'
import { Controls } from './player/controls'
import { Player } from './player/player'
import { createAtlas, type Atlas } from './render/atlas'
import { ChunkRenderer } from './render/chunkRenderer'
import { Sky } from './render/sky'
import { HUD } from './ui/hud'
import { Menu } from './ui/menu'
import { MobileControls } from './ui/mobileControls'
import { Panels } from './ui/panels'
import { Terrain } from './world/terrain'
import { World } from './world/world'

type Mode = 'single' | 'host' | 'guest'

interface Session {
  world: World
  scene: THREE.Scene
  player: Player
  chunkRenderer: ChunkRenderer
  entities: EntityManager
  interaction: BlockInteraction
  sky: Sky
  water: THREE.Mesh
  seed: number
  spawn: { x: number; z: number }
}

export class Game {
  private readonly renderer: THREE.WebGLRenderer
  private readonly camera: THREE.PerspectiveCamera
  private readonly atlas: Atlas
  private readonly controls: Controls
  private readonly inventory = new Inventory()
  private readonly hud: HUD
  private readonly panels: Panels
  private readonly menu: Menu
  private readonly worldStore = new MultiWorldStore(localStorage)
  private readonly playerId = crypto.randomUUID().slice(0, 8)
  private readonly mobileControls: MobileControls | null = null

  private session: Session | null = null
  private mp: Multiplayer | null = null
  private mode: Mode = 'single'
  private activeSlotIndex: number | null = null
  private activeSlotName: string | null = null
  private profile: Profile | null = loadStoredProfile()
  /** Set while the active world lives in the player's cloud profile. */
  private cloudWorld: { id: string; name: string } | null = null
  private cloudSaving = false
  private pendingCloudData: SaveData | null = null
  private playing = false
  private worldReady = false
  private openChestKey: string | null = null
  private saveTimer = 0
  private lastTime = performance.now()
  private fps = 0

  constructor(root: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    root.appendChild(this.renderer.domElement)
    this.camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 600)
    this.atlas = createAtlas()
    this.controls = new Controls(this.renderer.domElement)
    this.hud = new HUD(root, this.inventory, this.atlas.canvas)
    this.panels = new Panels(root, this.inventory, this.atlas.canvas)
    this.menu = new Menu(root, {
      listLocalSlots: () => this.worldStore.listSlots(),
      onPlaySlot: (index) => this.startSlot(index),
      onNewSlot: (index, name) => this.newSlot(index, name),
      onDeleteSlot: (index) => this.worldStore.deleteSlot(index),
      onHostSlot: (index, playerName) => this.startHostSlot(index, playerName),
      onJoin: (name, code) => this.startJoin(name, code),
      onResume: () => this.resume(),
      onQuitToMenu: () => this.quitToMenu(),
      multiplayerAvailable: supabaseConfigured(),
      profile: () => this.profile,
      onSignIn: async (u, p) => {
        this.profile = await cloud.signIn(u, p)
        storeProfile(this.profile)
      },
      onSignUp: async (u, p) => {
        this.profile = await cloud.signUp(u, p)
        storeProfile(this.profile)
      },
      onSignOut: () => {
        if (this.profile) void cloud.signOut(this.profile.token).catch(() => {})
        this.profile = null
        storeProfile(null)
      },
      listWorlds: () => this.guarded(() => cloud.listWorlds(this.profile!.token)),
      onPlayCloud: (w) => this.guarded(() => this.startCloud(w, 'single')),
      onHostCloud: (w) => this.guarded(() => this.startCloud(w, 'host')),
      onCreateCloud: (name) => this.guarded(() => this.createCloudWorld(name)),
      onDeleteCloud: (w) => this.guarded(() => cloud.deleteWorld(this.profile!.token, w.id)),
    })

    const openInventory = () => {
      if (!this.playing || this.menu.isOpen) return
      if (this.panels.isOpen) {
        this.panels.close()
      } else {
        this.controls.releaseLock()
        this.panels.openInventory()
        this.updateInputState()
      }
    }
    this.hud.onInventory = openInventory

    this.mobileControls = this.controls.isTouchDevice ? new MobileControls(root, this.controls) : null
    if (this.mobileControls) this.mobileControls.onInventory = openInventory

    this.inventory.onChange = () => this.hud.refresh()
    this.panels.onClose = () => {
      this.openChestKey = null
      this.updateInputState()
      if (this.playing) this.controls.requestLock()
    }
    this.panels.onChestChange = () => {
      if (this.openChestKey && this.session && this.mp) {
        this.mp.sendChest(this.openChestKey, this.session.world.chests.get(this.openChestKey) ?? [])
      }
    }

    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight)
      this.camera.aspect = window.innerWidth / window.innerHeight
      this.camera.updateProjectionMatrix()
    })
    document.addEventListener('pointerlockchange', () => {
      if (!this.controls.isLocked && this.playing && !this.panels.isOpen && !this.menu.isOpen) {
        this.menu.showPause(
          [
            this.cloudWorld ? `"${this.cloudWorld.name}" saves to ${this.profile?.username ?? 'your profile'}` : null,
            this.mp ? `Room ${this.mp.roomCode} stays open` : null,
          ]
            .filter(Boolean)
            .join(' · ') || undefined,
        )
        this.updateInputState()
      }
    })
    document.addEventListener('keydown', (e) => {
      if (!this.playing) return
      if (e.code === 'KeyE' && !this.menu.isOpen) openInventory()
      if (this.controls.gameplayInput && e.code.startsWith('Digit')) {
        const n = Number(e.code.slice(5))
        if (n >= 1 && n <= 9) this.inventory.selectHotbar(n - 1)
      }
    })
    document.addEventListener('wheel', (e) => {
      if (this.playing && this.controls.isLocked && this.controls.gameplayInput) {
        this.inventory.scrollHotbar(e.deltaY > 0 ? 1 : -1)
      }
    })
    const saveNow = () => {
      if (this.playing && this.mode !== 'guest') this.save()
    }
    window.addEventListener('beforeunload', saveNow)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') saveNow()
    })

    this.renderer.setAnimationLoop(() => this.frame())
  }

  // ---------------------------------------------------------------- sessions

  private createSession(seed: number, save: SaveData | null, spawnOverride?: { x: number; y: number; z: number }): void {
    this.teardownSession()
    const terrain = new Terrain(seed)
    const edits = new Map<string, number>(Object.entries(save?.edits ?? {}))
    const chests = new Map<string, ChestContents>(Object.entries(save?.chests ?? {}))
    const world = new World(terrain, { edits, chests, chestLoot: (x, _y, z) => chestLoot(seed, x, z) })
    const scene = new THREE.Scene()
    const sky = new Sky(scene)
    if (save) sky.time = save.skyTime
    const chunkRenderer = new ChunkRenderer(scene, world, this.atlas)
    const player = new Player(world)
    const entities = new EntityManager(scene, world)
    if (save) entities.load(save.animals)

    const spawn = findSpawn(terrain)
    if (spawnOverride) {
      player.state.pos = { ...spawnOverride }
    } else if (save) {
      player.state.pos = { x: save.player.x, y: save.player.y, z: save.player.z }
      this.controls.yaw = save.player.yaw
      this.controls.pitch = save.player.pitch
      this.controls.fly = save.player.fly
    } else {
      player.spawnAt(spawn.x + 0.5, spawn.z + 0.5)
      this.controls.fly = false
    }
    this.inventory.load(save?.inventory ?? [])

    const interaction = new BlockInteraction(
      world,
      this.inventory,
      entities,
      player,
      this.controls,
      this.camera,
      scene,
      this.playerId,
    )
    if (this.mobileControls) {
      this.mobileControls.onMineStart = () => interaction.startMining()
      this.mobileControls.onMineStop = () => interaction.stopMining()
      this.mobileControls.onUse = () => interaction.triggerRightClick()
    }

    interaction.onOpenChest = (x, y, z) => {
      this.openChestKey = blockKey(x, y, z)
      this.controls.releaseLock()
      this.panels.openChest(world.getChestContents(x, y, z))
      this.updateInputState()
    }
    interaction.onBlockEdit = (x, y, z, id) => this.mp?.sendEdit(x, y, z, id)
    interaction.onAnimalEvent = (ev) =>
      this.mp?.sendAnimalEvent({ ev: ev.type, animalId: ev.animalId ?? '', kind: ev.kind, pos: ev.pos, owner: ev.owner })

    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(640, 640),
      new THREE.MeshLambertMaterial({ color: 0x2e6fae, transparent: true, opacity: 0.6, side: THREE.DoubleSide }),
    )
    water.rotation.x = -Math.PI / 2
    water.position.y = WATER_LEVEL + 0.35
    scene.add(water)

    this.session = { world, scene, player, chunkRenderer, entities, interaction, sky, water, seed, spawn }
    this.worldReady = false
    this.saveTimer = 0
  }

  private teardownSession(): void {
    if (!this.session) return
    this.session.interaction.dispose()
    this.session.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
        obj.geometry.dispose()
        const mat = obj.material as THREE.Material | THREE.Material[]
        for (const m of Array.isArray(mat) ? mat : [mat]) m.dispose()
      }
    })
    this.session = null
  }

  private startSlot(index: number): void {
    this.mode = 'single'
    this.cloudWorld = null
    this.activeSlotIndex = index
    const slots = this.worldStore.listSlots()
    this.activeSlotName = slots[index]?.name ?? `World ${index + 1}`
    const save = this.worldStore.loadSlot(index)
    this.createSession(save?.seed ?? randomSeed(), save)
    this.beginPlay()
  }

  private newSlot(index: number, name: string): void {
    this.mode = 'single'
    this.cloudWorld = null
    this.activeSlotIndex = index
    this.activeSlotName = name
    this.createSession(randomSeed(), null)
    this.worldStore.saveSlot(index, name, this.buildSaveData())
    this.beginPlay()
  }

  private async startHostSlot(index: number, playerName: string): Promise<void> {
    const slots = this.worldStore.listSlots()
    this.activeSlotIndex = index
    this.activeSlotName = slots[index]?.name ?? `World ${index + 1}`
    const save = this.worldStore.loadSlot(index)
    const roomCode = generateRoomCode()
    const transport = await connectChannel(roomCode)
    this.mode = 'host'
    this.cloudWorld = null
    this.createSession(save?.seed ?? randomSeed(), save)
    this.mp = new Multiplayer('host', roomCode, transport, this.session!.scene, this.playerId, playerName, this.hooks())
    this.beginPlay()
    this.hud.showToast(`Hosting room ${roomCode} — share the code!`)
  }

  /** Play or host a world stored in the signed-in player's profile. */
  private async startCloud(w: WorldMeta, as: 'single' | 'host'): Promise<void> {
    const profile = this.profile
    if (!profile) throw new Error('Sign in first')
    const save = await cloud.loadWorld(profile.token, w.id)
    if (as === 'host') {
      const roomCode = generateRoomCode()
      const transport = await connectChannel(roomCode)
      this.mode = 'host'
      this.cloudWorld = { id: w.id, name: w.name }
      this.createSession(save.seed, save)
      this.mp = new Multiplayer('host', roomCode, transport, this.session!.scene, this.playerId, profile.username, this.hooks())
      this.beginPlay()
      this.hud.showToast(`Hosting "${w.name}" in room ${roomCode} — the session saves to your profile`)
    } else {
      this.mode = 'single'
      this.cloudWorld = { id: w.id, name: w.name }
      this.createSession(save.seed, save)
      this.beginPlay()
    }
  }

  /** Generate a fresh world and persist it to the profile before playing. */
  private async createCloudWorld(name: string): Promise<void> {
    const profile = this.profile
    if (!profile) throw new Error('Sign in first')
    this.mode = 'single'
    this.cloudWorld = null
    this.createSession(randomSeed(), null)
    try {
      const id = await cloud.saveWorld(profile.token, null, name, this.buildSaveData())
      this.cloudWorld = { id, name }
    } catch (e) {
      this.teardownSession()
      throw e
    }
    this.beginPlay()
  }

  /** Clear the local profile if the server rejected our session token. */
  private async guarded<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn()
    } catch (e) {
      if (isSessionExpired(e)) {
        this.profile = null
        storeProfile(null)
        this.menu.refreshMain()
      }
      throw e
    }
  }

  private async startJoin(name: string, code: string): Promise<void> {
    if (!isValidRoomCode(code)) throw new Error('Room codes look like MC-1234')
    const transport = await connectChannel(code)
    this.mode = 'guest'
    this.cloudWorld = null
    const mp = new Multiplayer('guest', code, transport, new THREE.Scene(), this.playerId, name, this.hooks())
    try {
      await mp.requestSnapshot(8000)
    } catch (e) {
      mp.dispose()
      throw e
    }
    // applySnapshot (inside requestSnapshot) created the session; move the
    // multiplayer avatars into the real scene.
    this.mp = mp
    mp.setScene(this.session!.scene)
    this.beginPlay()
    this.hud.showToast(`Joined room ${code}`)
  }

  private hooks() {
    return {
      getSnapshot: (forId: string) => {
        const s = this.session!
        void forId
        return {
          seed: s.seed,
          skyTime: s.sky.time,
          edits: Object.fromEntries(s.world.edits),
          chests: Object.fromEntries(s.world.chests),
          animals: s.entities.serialize(),
          spawn: { x: s.spawn.x + 0.5, y: s.world.terrain.heightAt(s.spawn.x, s.spawn.z) + 1.01, z: s.spawn.z + 0.5 },
        }
      },
      applySnapshot: (snap: SnapshotMsg) => {
        const save: SaveData = {
          version: 1,
          seed: snap.seed,
          player: { x: snap.spawn.x, y: snap.spawn.y, z: snap.spawn.z, yaw: 0, pitch: 0, fly: false },
          inventory: [],
          edits: snap.edits,
          chests: snap.chests,
          animals: snap.animals,
          skyTime: snap.skyTime,
        }
        this.createSession(snap.seed, save, snap.spawn)
      },
      applyEdit: (x: number, y: number, z: number, id: number) => {
        this.session?.world.setBlock(x, y, z, id)
      },
      applyChest: (key: string, contents: ChestContents) => {
        this.session?.world.chests.set(key, contents)
      },
      applyAnimals: (list: import('./entities/entityManager').SavedAnimal[], skyTime?: number) => {
        const entities = this.session?.entities
        if (!entities) return
        const seen = new Set<string>()
        for (const s of list) {
          seen.add(s.id)
          const existing = entities.animals.get(s.id)
          if (existing) {
            existing.pos = { ...s.pos }
            existing.yaw = s.yaw
            existing.mode = s.mode
            existing.owner = s.owner
          } else {
            const released = entities.release(s.kind, s.pos, s.owner, s.id)
            released.mode = s.mode
            released.yaw = s.yaw
          }
        }
        for (const id of [...entities.animals.keys()]) {
          if (!seen.has(id)) entities.capture(id)
        }
        if (skyTime !== undefined && this.session) this.session.sky.time = skyTime
      },
      onHostLeft: () => {
        this.hud.showToast('Host left the room — continuing offline')
        setTimeout(() => {
          this.mp?.dispose()
          this.mp = null
          this.mode = 'single'
        }, 0)
      },
      applyAnimalEvent: (msg: import('./net/protocol').AnimalEventMsg) => {
        const entities = this.session?.entities
        if (!entities) return
        if (msg.ev === 'tame' && msg.owner) entities.tame(msg.animalId, msg.owner)
        else if (msg.ev === 'toggleStay') entities.toggleStay(msg.animalId)
        else if (msg.ev === 'capture') entities.capture(msg.animalId)
        else if (msg.ev === 'release' && msg.kind && msg.pos) {
          entities.release(msg.kind as import('./items/items').AnimalKind, msg.pos, msg.owner ?? null, msg.animalId)
        }
      },
    }
  }

  private beginPlay(): void {
    this.playing = true
    this.menu.hide()
    this.updateInputState()
    this.controls.requestLock()
    this.mobileControls?.show()
  }

  private resume(): void {
    this.menu.hide()
    this.updateInputState()
    this.controls.requestLock()
  }

  private quitToMenu(): void {
    if (this.mode !== 'guest' && this.session) {
      if (this.cloudWorld) {
        // Kick off the final cloud write, then refresh the menu's world list.
        void this.cloudSave(this.buildSaveData()).then((ok) => {
          if (ok) this.menu.refreshMain()
        })
      } else {
        this.save()
      }
    }
    this.mp?.dispose()
    this.mp = null
    this.playing = false
    this.cloudWorld = null
    this.panels.close()
    this.teardownSession()
    this.menu.showMain()
    this.updateInputState()
    this.mobileControls?.hide()
  }

  private updateInputState(): void {
    this.controls.gameplayInput = !this.panels.isOpen && !this.menu.isOpen
  }

  // ------------------------------------------------------------------- frame

  private frame(): void {
    const now = performance.now()
    const dt = Math.min((now - this.lastTime) / 1000, 0.1)
    this.lastTime = now
    this.fps = this.fps * 0.95 + (dt > 0 ? 1 / dt : 60) * 0.05
    const s = this.session
    if (!s) return

    const pos = s.player.state.pos
    if (!this.worldReady) {
      // Stream aggressively until the area around the spawn point is meshed.
      s.chunkRenderer.update(pos.x, pos.z, 24, 24)
      this.worldReady = this.isAreaReady(s, pos.x, pos.z)
    } else {
      s.chunkRenderer.update(pos.x, pos.z)
    }

    if (this.playing && this.worldReady) {
      s.player.update(dt, this.controls)
      s.interaction.update(dt)
    }
    s.player.applyCamera(this.camera, this.controls)

    const owners = new Map<string, { x: number; y: number; z: number }>()
    owners.set(this.playerId, pos)
    if (this.mp) {
      for (const [id, avatar] of this.mp.peers) {
        owners.set(id, { x: avatar.group.position.x, y: avatar.group.position.y, z: avatar.group.position.z })
      }
    }
    s.entities.update(dt, pos, owners, this.mode !== 'guest')
    s.sky.update(dt, this.camera.position)
    s.water.position.x = pos.x
    s.water.position.z = pos.z

    this.mp?.update(
      dt,
      { x: pos.x, y: pos.y, z: pos.z, yaw: this.controls.yaw, pitch: this.controls.pitch },
      // Sync only animals near someone — the full set can grow unboundedly.
      () =>
        s.entities.serialize().animals.filter((a) =>
          [...owners.values()].some((p) => (a.pos.x - p.x) ** 2 + (a.pos.z - p.z) ** 2 < 96 * 96),
        ),
      s.sky.time,
    )
    this.hud.setPlayerList(this.mp ? [this.mp.selfName, ...this.mp.peerNames] : [])

    if (this.mode !== 'guest' && this.playing) {
      this.saveTimer += dt * 1000
      // Cloud saves are network round-trips, so run them less often than local ones.
      if (this.saveTimer >= (this.cloudWorld ? CLOUD_AUTOSAVE_INTERVAL_MS : AUTOSAVE_INTERVAL_MS)) {
        this.saveTimer = 0
        this.save()
      }
    }

    const room = this.mp ? `  room ${this.mp.roomCode} (${this.mp.peers.size + 1} player${this.mp.peers.size ? 's' : ''})` : ''
    this.hud.update(
      dt,
      `${Math.round(this.fps)} fps  xyz ${pos.x.toFixed(1)} ${pos.y.toFixed(1)} ${pos.z.toFixed(1)}  ` +
        `chunks ${s.chunkRenderer.chunkCount}  animals ${s.entities.animals.size}${room}` +
        (this.controls.fly ? '  [flying]' : '') +
        (this.worldReady ? '' : '  generating world…'),
      s.interaction.miningProgress,
      s.sky.phaseInfo,
    )
    this.renderer.render(s.scene, this.camera)
  }

  private isAreaReady(s: Session, px: number, pz: number): boolean {
    const cx = worldToChunk(Math.floor(px))
    const cz = worldToChunk(Math.floor(pz))
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!s.world.hasChunk(cx + dx, cz + dz)) return false
        if (s.world.dirtyChunks.has(chunkKey(cx + dx, cz + dz))) return false
      }
    }
    return true
  }

  // -------------------------------------------------------------- persistence

  /** Persist the current world: to the cloud profile when playing a cloud world, else localStorage. */
  private save(): void {
    if (!this.session) return
    const data = this.buildSaveData()
    if (this.cloudWorld) {
      void this.cloudSave(data)
    } else if (this.activeSlotIndex !== null && this.activeSlotName !== null) {
      if (!this.worldStore.saveSlot(this.activeSlotIndex, this.activeSlotName, data)) {
        this.hud.showToast('Warning: could not save (storage full?)')
      }
    }
  }

  private async cloudSave(data: SaveData): Promise<boolean> {
    const profile = this.profile
    const world = this.cloudWorld
    if (!profile || !world) return false
    if (this.cloudSaving) {
      // A save is in flight; remember the newest data and write it afterwards.
      this.pendingCloudData = data
      return true
    }
    this.cloudSaving = true
    try {
      await cloud.saveWorld(profile.token, world.id, null, data)
      return true
    } catch (e) {
      this.hud.showToast(
        isSessionExpired(e) ? 'Cloud save failed: session expired — sign in again' : 'Cloud save failed — retrying soon',
      )
      return false
    } finally {
      this.cloudSaving = false
      const pending = this.pendingCloudData
      this.pendingCloudData = null
      if (pending) void cloud.saveWorld(profile.token, world.id, null, pending).catch(() => {})
    }
  }

  private buildSaveData(): SaveData {
    const s = this.session!
    return {
      version: 1,
      seed: s.seed,
      player: {
        x: s.player.state.pos.x,
        y: s.player.state.pos.y,
        z: s.player.state.pos.z,
        yaw: this.controls.yaw,
        pitch: this.controls.pitch,
        fly: this.controls.fly,
      },
      inventory: this.inventory.serialize(),
      edits: Object.fromEntries(s.world.edits),
      chests: Object.fromEntries(s.world.chests),
      animals: s.entities.serialize(),
      skyTime: s.sky.time,
    }
  }
}

function randomSeed(): number {
  return hashString(`${Date.now()}-${Math.random()}`)
}

/** First column at or near the origin that is comfortably above water. */
function findSpawn(terrain: Terrain): { x: number; z: number } {
  for (let r = 0; r < 64; r++) {
    for (const [x, z] of [
      [r * 8, 0],
      [-r * 8, 0],
      [0, r * 8],
      [0, -r * 8],
      [r * 8, r * 8],
    ]) {
      if (terrain.heightAt(x, z) > WATER_LEVEL + 2) return { x, z }
    }
  }
  return { x: 0, z: 0 }
}
