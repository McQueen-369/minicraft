import * as THREE from 'three'
import { Music } from './audio/music'
import { AUTOSAVE_INTERVAL_MS, CLOUD_AUTOSAVE_INTERVAL_MS, PLAYER_EYE, WATER_LEVEL } from './constants'
import { blockKey, chunkKey, worldToChunk } from './core/coords'
import { hashString } from './core/rng'
import { DecorationManager } from './entities/decorations'
import { EntityManager } from './entities/entityManager'
import { FurnitureManager } from './entities/furnitureManager'
import { FURNITURE_LABEL } from './entities/furniture'
import { BlockInteraction, type FurnitureEvent } from './interact/blockInteraction'
import { BlockId, blockDef } from './core/blocks'
import { chestLoot } from './items/chest'
import { Inventory } from './items/inventory'
import { furnitureItemFor, ItemId } from './items/items'
import type { ChestContents, Slot } from './items/items'
import { buildStarterHouse } from './world/house'
import { buildVillage, villageAnchorForChunk } from './world/village'
import { Minimap, type MapMarker } from './ui/minimap'
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
import { animalInfo, itemInfo } from './ui/info'
import { Menu } from './ui/menu'
import { MobileControls } from './ui/mobileControls'
import { Panels } from './ui/panels'
import { Chat } from './ui/chat'
import { CraftingPanel } from './ui/crafting'
import { playAnimalSound } from './audio/sounds'
import { Terrain } from './world/terrain'
import { World } from './world/world'

type Mode = 'single' | 'host' | 'guest'

interface Session {
  world: World
  scene: THREE.Scene
  player: Player
  chunkRenderer: ChunkRenderer
  entities: EntityManager
  furniture: FurnitureManager
  decorations: DecorationManager
  interaction: BlockInteraction
  sky: Sky
  water: THREE.Mesh
  seed: number
  spawn: { x: number; z: number }
  builtVillages: Set<string>
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
  private readonly minimap: Minimap
  private readonly chat: Chat
  private readonly crafting: CraftingPanel
  private readonly music = new Music()
  private handGroup: THREE.Group | null = null
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
  private nameplateKey: string | null = null
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
    this.minimap = new Minimap(root)
    this.chat = new Chat(root)
    this.crafting = new CraftingPanel(root, this.inventory, this.atlas.canvas)
    this.menu = new Menu(root, {
      listLocalSlots: () => this.worldStore.listSlots(),
      onPlaySlot: (index) => this.startSlot(index),
      onNewSlot: (index, name) => this.newSlot(index, name),
      onDeleteSlot: (index) => this.worldStore.deleteSlot(index),
      onHostSlot: (index, playerName, roomCode) => this.startHostSlot(index, playerName, roomCode),
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
      onHostCloud: (w, roomCode) => this.guarded(() => this.startCloud(w, 'host', roomCode)),
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
    this.hud.onChatToggle = () => {
      if (!this.playing || this.menu.isOpen) return
      this.chat.togglePanel()
    }
    this.hud.onCraftToggle = () => {
      if (!this.playing || this.menu.isOpen) return
      if (this.crafting.isOpen) {
        this.crafting.close()
      } else {
        this.controls.releaseLock()
        this.crafting.open()
        this.hud.setCraftOpen(true)
        this.updateInputState()
      }
    }
    this.crafting.onClose = () => {
      this.hud.setCraftOpen(false)
      this.updateInputState()
      if (this.playing && !this.panels.isOpen && !this.menu.isOpen) this.controls.requestLock()
    }
    this.crafting.onCraft = () => {
      this.hud.showToast('Crafted!')
    }
    this.hud.onInfoClose = () => {
      if (this.playing && !this.menu.isOpen && !this.panels.isOpen) this.controls.requestLock()
    }
    this.hud.onToggleMusic = () => this.music.toggle()
    // Browsers block audio until a user gesture; start the soundtrack on the first one.
    const startMusic = () => {
      this.music.start()
      window.removeEventListener('pointerdown', startMusic)
      window.removeEventListener('keydown', startMusic)
      window.removeEventListener('touchstart', startMusic)
    }
    window.addEventListener('pointerdown', startMusic)
    window.addEventListener('keydown', startMusic)
    window.addEventListener('touchstart', startMusic)
    this.hud.onSelectHotbar = (i) => {
      if (!this.playing || this.menu.isOpen || this.panels.isOpen) return
      this.inventory.selectHotbar(i)
    }

    this.mobileControls = this.controls.isTouchDevice ? new MobileControls(root, this.controls) : null

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
      if (!this.controls.isLocked && this.playing && !this.panels.isOpen && !this.menu.isOpen && !this.hud.isInfoOpen) {
        this.menu.showPause(
          [
            this.cloudWorld ? `"${this.cloudWorld.name}" saves to ${this.profile?.username ?? 'your profile'}` : null,
            this.mp ? `Room ${this.mp.roomCode} stays open` : null,
          ]
            .filter(Boolean)
            .join(' · ') || undefined,
        )
        this.updateInputState()
        this.updateMusic()
      }
    })
    document.addEventListener('keydown', (e) => {
      if (!this.playing) return
      if (e.code === 'KeyE' && !this.menu.isOpen) openInventory()
      if (e.code === 'KeyI' && !this.menu.isOpen && !this.panels.isOpen) {
        // I with a named target → open target info; otherwise open instructions.
        if (this.hud.openTargetInfo()) this.controls.releaseLock()
        else this.hud.showInstructions()
      }
      if (e.code === 'KeyC' && !this.panels.isOpen && !this.menu.isOpen && !this.chat.isOpen && !this.crafting.isOpen) {
        e.preventDefault()
        this.chat.openPanel()
        this.hud.setChatOpen(true)
      } else if (e.code === 'KeyC' && this.chat.isOpen) {
        e.preventDefault()
        this.chat.closePanel()
      }
      if (e.code === 'KeyZ' && !this.panels.isOpen && !this.menu.isOpen && !this.chat.isOpen) {
        e.preventDefault()
        if (this.crafting.isOpen) {
          this.crafting.close()
        } else {
          this.controls.releaseLock()
          this.crafting.open()
          this.hud.setCraftOpen(true)
          this.updateInputState()
        }
      }
      if (e.code === 'KeyM' && !this.menu.isOpen) {
        e.preventDefault()
        this.minimap.toggleMap()
      }
      if (e.code === 'Enter' && this.mp && !this.panels.isOpen && !this.menu.isOpen && !this.chat.isOpen) {
        e.preventDefault()
        this.chat.openPanel()
      }
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
    const furniture = new FurnitureManager(scene)
    if (save) furniture.load(save.furniture)
    const decorations = new DecorationManager(scene, seed)

    const spawn = findSpawn(terrain)
    if (spawnOverride) {
      player.state.pos = { ...spawnOverride }
    } else if (save) {
      player.state.pos = { x: save.player.x, y: save.player.y, z: save.player.z }
      this.controls.yaw = save.player.yaw
      this.controls.pitch = save.player.pitch
      this.controls.fly = save.player.fly
    } else {
      // Fresh world: drop a furnished starter house at spawn and stand inside it.
      const home = buildStarterHouse(world, furniture, spawn.x, spawn.z)
      player.state.pos = { ...home }
      this.controls.fly = false
    }
    this.inventory.load(save?.inventory ?? [])
    // Fresh world: give the player a fishing net to start with.
    if (!save) this.inventory.add(ItemId.Net, 1)

    const interaction = new BlockInteraction(
      world,
      this.inventory,
      entities,
      furniture,
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
      // Single tap the look area to trigger right-click (feed/tame).
      this.mobileControls.onTap = () => {
        interaction.triggerRightClick()
      }
      // Double-tap the look area to store the targeted tamed animal in the bag.
      this.mobileControls.onDoubleTap = () => {
        if (interaction.captureTargetAnimal()) this.hud.showToast('Stored animal in bag')
      }
    }
    interaction.onFish = () => this.hud.showToast('Caught a fish!')
    interaction.onMysteryBoxOpen = (rarity) => this.hud.showToast(`Opened a ${rarity} Mystery Box!`)

    this.chat.onSend = (text) => {
      const name = this.mp?.selfName ?? 'Player'
      this.chat.showMessage(name, text, true)
      this.mp?.sendChat(text)
    }
    this.chat.onOpen = () => {
      this.controls.gameplayInput = false
      this.hud.setChatOpen(true)
    }
    this.chat.onClose = () => {
      this.updateInputState()
      this.hud.setChatOpen(false)
    }

    interaction.onOpenChest = (x, y, z) => {
      if (world.isTreasureChest(x, y, z)) {
        this.openTreasureBox(x, y, z)
        return
      }
      this.openChestKey = blockKey(x, y, z)
      this.controls.releaseLock()
      this.panels.openChest(world.getChestContents(x, y, z))
      this.updateInputState()
    }
    interaction.onBlockEdit = (x, y, z, id) => this.mp?.sendEdit(x, y, z, id)
    interaction.onAnimalEvent = (ev) => {
      if (ev.type === 'tame' && ev.kind) {
        playAnimalSound(ev.kind as import('./items/items').AnimalKind)
      }
      this.mp?.sendAnimalEvent({ ev: ev.type, animalId: ev.animalId ?? '', kind: ev.kind, pos: ev.pos, owner: ev.owner })
    }
    interaction.onFurnitureEvent = (ev: FurnitureEvent) => this.mp?.sendFurniture({ ev: ev.type, item: ev.item, id: ev.id })

    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(640, 640),
      new THREE.MeshLambertMaterial({ color: 0x2e6fae, transparent: true, opacity: 0.6, side: THREE.DoubleSide }),
    )
    water.rotation.x = -Math.PI / 2
    water.position.y = WATER_LEVEL + 0.35
    scene.add(water)

    // First-person hand viewmodel
    if (this.handGroup) this.camera.remove(this.handGroup)
    const handGroup = new THREE.Group()
    const handMat = new THREE.MeshLambertMaterial({ color: 0xffcc99, fog: false, depthTest: false })
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.06), handMat)
    arm.position.y = -0.14
    arm.renderOrder = 100
    const fist = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.09), handMat)
    fist.position.y = -0.33
    fist.renderOrder = 100
    handGroup.add(arm, fist)
    handGroup.position.set(0.2, -0.2, -0.38)
    this.camera.add(handGroup)
    this.handGroup = handGroup

    this.session = { world, scene, player, chunkRenderer, entities, furniture, decorations, interaction, sky, water, seed, spawn, builtVillages: new Set() }
    this.worldReady = false
    this.saveTimer = 0
  }

  private teardownSession(): void {
    if (!this.session) return
    if (this.handGroup) {
      this.camera.remove(this.handGroup)
      this.handGroup = null
    }
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

  private async startHostSlot(index: number, playerName: string, roomCode: string): Promise<void> {
    const slots = this.worldStore.listSlots()
    this.activeSlotIndex = index
    this.activeSlotName = slots[index]?.name ?? `World ${index + 1}`
    const save = this.worldStore.loadSlot(index)
    const transport = await connectChannel(roomCode)
    this.mode = 'host'
    this.cloudWorld = null
    this.createSession(save?.seed ?? randomSeed(), save)
    this.mp = new Multiplayer('host', roomCode, transport, this.session!.scene, this.playerId, playerName, this.hooks())
    this.beginPlay()
    this.hud.showToast(`Hosting room ${roomCode} — share the code!`)
  }

  /** Play or host a world stored in the signed-in player's profile. */
  private async startCloud(w: WorldMeta, as: 'single' | 'host', roomCode?: string): Promise<void> {
    const profile = this.profile
    if (!profile) throw new Error('Sign in first')
    const save = await cloud.loadWorld(profile.token, w.id)
    if (as === 'host') {
      const code = roomCode ?? generateRoomCode()
      const transport = await connectChannel(code)
      this.mode = 'host'
      this.cloudWorld = { id: w.id, name: w.name }
      this.createSession(save.seed, save)
      this.mp = new Multiplayer('host', code, transport, this.session!.scene, this.playerId, profile.username, this.hooks())
      this.beginPlay()
      this.hud.showToast(`Hosting "${w.name}" in room ${code} — the session saves to your profile`)
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
          furniture: s.furniture.serialize(),
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
          furniture: snap.furniture ?? [],
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
      applyFurnitureEvent: (msg: import('./net/protocol').FurnitureMsg) => {
        const fm = this.session?.furniture
        if (!fm) return
        if (msg.ev === 'place' && msg.item) {
          fm.place(msg.item.kind, msg.item.x, msg.item.y, msg.item.z, msg.item.yaw, msg.item.id)
        } else if (msg.ev === 'remove' && msg.id) {
          fm.remove(msg.id)
        } else if (msg.ev === 'toggle' && msg.id) {
          fm.toggleDoor(msg.id)
        }
      },
      onChat: (playerId: string, name: string, text: string) => {
        void playerId
        this.chat.showMessage(name, text)
      },
    }
  }

  private beginPlay(): void {
    this.playing = true
    this.menu.hide()
    this.updateInputState()
    this.updateMusic()
    this.controls.requestLock()
    this.mobileControls?.show()
    this.minimap.show()
    this.chat.show()
    if (this.session) this.minimap.setHome(this.session.spawn.x, this.session.spawn.z)
  }

  private resume(): void {
    this.menu.hide()
    this.updateInputState()
    this.updateMusic()
    this.controls.requestLock()
  }

  /** Background music only sounds while actively playing (not on menu / paused). */
  private updateMusic(): void {
    this.music.setActive(this.playing && !this.menu.isOpen)
  }

  private quitToMenu(): void {
    const showProfileCta =
      !this.profile && this.activeSlotIndex !== null && !this.cloudWorld && this.mode !== 'guest' && supabaseConfigured()
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
    this.crafting.close()
    this.teardownSession()
    this.menu.showMain(showProfileCta)
    this.updateInputState()
    this.updateMusic()
    this.mobileControls?.hide()
    this.minimap.hide()
    this.chat.hide()
  }

  private updateInputState(): void {
    this.controls.gameplayInput = !this.panels.isOpen && !this.menu.isOpen && !this.chat.isOpen && !this.crafting.isOpen
  }

  /**
   * Open a natural treasure box: sweep its loot into the bag, show a summary of
   * what was found, and consume the box (it is never kept as a chest item).
   */
  private openTreasureBox(x: number, y: number, z: number): void {
    const s = this.session
    if (!s) return
    const obtained: Slot[] = []
    for (const slot of s.world.getChestContents(x, y, z)) {
      if (!slot) continue
      this.inventory.add(slot.itemId, slot.count)
      obtained.push({ itemId: slot.itemId, count: slot.count })
    }
    s.world.setBlock(x, y, z, BlockId.Air)
    this.mp?.sendEdit(x, y, z, BlockId.Air)
    this.controls.releaseLock()
    this.panels.openSummary(obtained)
    this.updateInputState()
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

    // Build villages when their anchor chunk loads (host/singleplayer only).
    if (this.mode !== 'guest') {
      for (const key of s.world.chunks.keys()) {
        if (s.builtVillages.has(key)) continue
        const [cx, cz] = key.split(',').map(Number)
        if (villageAnchorForChunk(s.seed, cx, cz)) {
          s.builtVillages.add(key)
          buildVillage(s.world, s.furniture, s.entities, cx, cz)
        } else {
          s.builtVillages.add(key)
        }
      }
    }
    s.player.applyCamera(this.camera, this.controls)
    this.updateNameplate(s)
    if (this.playing) this.updateMinimap(s, pos, dt)

    const owners = new Map<string, { x: number; y: number; z: number }>()
    owners.set(this.playerId, pos)
    if (this.mp) {
      for (const [id, avatar] of this.mp.peers) {
        owners.set(id, { x: avatar.group.position.x, y: avatar.group.position.y, z: avatar.group.position.z })
      }
    }
    s.entities.update(dt, pos, owners, this.mode !== 'guest')
    s.furniture.update(pos, dt)
    if (this.worldReady) s.decorations.update(s.world, pos, dt)
    s.sky.update(dt, this.camera.position)
    s.water.position.x = pos.x
    s.water.position.z = pos.z

    // Hand swing animation
    if (this.handGroup) {
      const prog = s.interaction.miningProgress
      const targetX = prog !== null ? -Math.sin(prog * Math.PI) * 0.7 : 0
      this.handGroup.rotation.x += (targetX - this.handGroup.rotation.x) * Math.min(dt * 14, 1)
    }

    // Underwater blue tint
    const eyeY = pos.y + PLAYER_EYE
    this.hud.setUnderwater(eyeY < WATER_LEVEL + 0.35)

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

  /** Reflect the crosshair target (animal or block) in the HUD nameplate. */
  private updateNameplate(s: Session): void {
    let key: string | null = null
    let name: string | null = null
    let info: ReturnType<typeof animalInfo> | null = null
    if (this.playing && !this.panels.isOpen && !this.menu.isOpen) {
      const animal = s.interaction.targetAnimal
      const furn = s.interaction.targetFurniture
      const tb = s.interaction.targetBlock
      if (animal) {
        key = `a:${animal.kind}`
        name = animal.kind.charAt(0).toUpperCase() + animal.kind.slice(1)
        info = animalInfo(animal.kind)
      } else if (furn) {
        const itemId = furnitureItemFor(furn.kind) ?? 0
        key = `f:${furn.kind}`
        name = FURNITURE_LABEL[furn.kind]
        info = itemInfo(itemId)
      } else if (tb) {
        const id = s.world.getBlock(tb.x, tb.y, tb.z)
        const def = blockDef(id)
        if (def) {
          key = `b:${id}`
          name = def.name
          info = itemInfo(id)
        }
      }
    }
    // Only touch the DOM when the target actually changes.
    if (key === this.nameplateKey) return
    this.nameplateKey = key
    this.hud.setTarget(name, info)
  }

  /** Feed terrain + entity positions to the navigation map. */
  private updateMinimap(s: Session, pos: { x: number; z: number }, dt: number): void {
    const markers: MapMarker[] = []
    for (const a of s.entities.animals.values()) {
      const dx = a.pos.x - pos.x
      const dz = a.pos.z - pos.z
      if (dx * dx + dz * dz < 180 * 180) {
        markers.push({ x: a.pos.x, z: a.pos.z, color: a.owner ? '#ffd34d' : '#caa84d' })
      }
    }
    if (this.mp) {
      for (const avatar of this.mp.peers.values()) {
        markers.push({ x: avatar.group.position.x, z: avatar.group.position.z, color: '#7ad0ff' })
      }
    }
    this.minimap.update(s.world.terrain, pos, this.controls.yaw, markers, dt)
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
      furniture: s.furniture.serialize(),
      skyTime: s.sky.time,
    }
  }
}

function randomSeed(): number {
  return hashString(`${Date.now()}-${Math.random()}`)
}

/**
 * A column near the origin on flat, dry land — so the starter house and its
 * yard sit on a plain. Scans a spiral of candidates, scoring each by the height
 * spread across the house+farm footprint, and returns the flattest (accepting
 * the first nearly level one).
 */
function findSpawn(terrain: Terrain): { x: number; z: number } {
  // Coarse sample points spanning the house + farm yard, relative to center.
  const samples: [number, number][] = []
  for (let dx = -11; dx <= 16; dx += 7) {
    for (let dz = -9; dz <= 9; dz += 6) samples.push([dx, dz])
  }
  let best: { x: number; z: number } | null = null
  let bestRange = Infinity
  for (let r = 0; r < 40; r++) {
    for (const [x, z] of ringCandidates(r)) {
      let min = Infinity
      let max = -Infinity
      for (const [dx, dz] of samples) {
        const h = terrain.heightAt(x + dx, z + dz)
        if (h < min) min = h
        if (h > max) max = h
      }
      if (min <= WATER_LEVEL + 2) continue // keep the yard dry
      const range = max - min
      if (range < bestRange) {
        bestRange = range
        best = { x, z }
      }
      if (range <= 2) return { x, z } // flat enough — take it
    }
  }
  return best ?? { x: 0, z: 0 }
}

function ringCandidates(r: number): [number, number][] {
  if (r === 0) return [[0, 0]]
  const s = r * 10
  return [
    [s, 0],
    [-s, 0],
    [0, s],
    [0, -s],
    [s, s],
    [-s, -s],
    [s, -s],
    [-s, s],
  ]
}
