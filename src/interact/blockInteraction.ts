import * as THREE from 'three'
import { REACH, WATER_LEVEL } from '../constants'
import { BlockId, blockDef, isSolid } from '../core/blocks'
import type { EntityManager } from '../entities/entityManager'
import type { FurnitureManager } from '../entities/furnitureManager'
import type { Furniture, SavedFurniture } from '../entities/furniture'
import type { Inventory } from '../items/inventory'
import { mysteryBoxLoot } from '../items/chest'
import { breakTime, captureItemFor, furnitureItemFor, itemDef, ItemId } from '../items/items'
import type { Controls } from '../player/controls'
import { boxOverlapsVoxel, type Vec3 } from '../player/physics'
import type { Player } from '../player/player'
import { ANIMAL_DIMS, type Animal } from '../entities/animal'
import type { World } from '../world/world'
import { raycastVoxels, type RayHit } from './raycast'

export interface AnimalEvent {
  type: 'tame' | 'toggleStay' | 'capture' | 'release'
  animalId?: string
  kind?: string
  pos?: Vec3
  owner?: string | null
}

export interface FurnitureEvent {
  type: 'place' | 'remove' | 'toggle'
  item?: SavedFurniture
  id?: string
}

/**
 * Mining, placing, chest opening, and animal interaction, driven by the
 * camera ray. Multiplayer assigns onBlockEdit/onAnimalEvent to broadcast.
 */
export class BlockInteraction {
  /** null when not mining; progress in [0,1]. */
  miningProgress: number | null = null
  targetBlock: RayHit | null = null
  /** Animal currently under the crosshair (takes priority over a block). */
  targetAnimal: Animal | null = null
  /** Furniture currently under the crosshair. */
  targetFurniture: Furniture | null = null

  onBlockEdit: (x: number, y: number, z: number, id: number) => void = () => {}
  onAnimalEvent: (ev: AnimalEvent) => void = () => {}
  onFurnitureEvent: (ev: FurnitureEvent) => void = () => {}
  onOpenChest: (x: number, y: number, z: number) => void = () => {}
  /** Called when the player successfully catches a fish. */
  onFish: () => void = () => {}
  /** Called when a mystery box is opened, with its rarity tier. */
  onMysteryBoxOpen: (rarity: string) => void = () => {}
  /** Called when the player right-clicks a market stall. */
  onOpenMarket: () => void = () => {}
  /** Called when the player mounts a horse. */
  onMount: (animalId: string) => void = () => {}
  /** Called when the player picks up (true) or sets down (false) a carried NPC. */
  onCarry: (carrying: boolean) => void = () => {}
  /** Called when a TNT fuse is lit. */
  onTntPrimed: () => void = () => {}
  /** Called when a TNT block detonates, with the blast center. */
  onExplosion: (x: number, y: number, z: number) => void = () => {}
  /** Whether the player has energy left to mine (false blocks mining). */
  canMine: () => boolean = () => true
  /** Called after a block is mined so the game can spend energy. */
  onBlockBroken: (blockId: number) => void = () => {}
  /** Called while trying to mine with an empty energy bar. */
  onTooTired: () => void = () => {}
  /** Try to eat the held food; returns true when it was consumed. */
  onEat: (itemId: number, energy: number) => boolean = () => false
  /** Called when the player right-clicks a bed to sleep. */
  onSleep: () => void = () => {}
  /** Called when the player right-clicks an arcade kiosk on the secret island. */
  onOpenArcade: (kind: string) => void = () => {}
  /** Called when the player collects a waiting egg from their chicken. */
  onCollectEgg: (animalId: string) => void = () => {}
  /** Called when a swing lands on a zombie that survives the hit. */
  onZombieHit: () => void = () => {}
  /** Called when the player's swing finishes a zombie off. */
  onZombieKilled: (pos: Vec3) => void = () => {}

  private leftDown = false
  /** Seconds into the current weapon swing (null = not attacking). */
  private attackSwing: number | null = null
  /** TNT blocks with a lit fuse, counting down to detonation. */
  private readonly primedTnt: { x: number; y: number; z: number; timer: number }[] = []
  /** Id of the NPC the player is currently carrying (left-click to pick/drop). */
  private carriedAnimalId: string | null = null
  private mining: { x: number; y: number; z: number; elapsed: number; total: number } | null = null
  private readonly highlight: THREE.LineSegments
  private readonly onMouseDown: (e: MouseEvent) => void
  private readonly onMouseUp: (e: MouseEvent) => void
  private readonly onContextMenu: (e: Event) => void

  constructor(
    private readonly world: World,
    private readonly inventory: Inventory,
    private readonly entities: EntityManager,
    private readonly furniture: FurnitureManager,
    private readonly player: Player,
    private readonly controls: Controls,
    private readonly camera: THREE.PerspectiveCamera,
    scene: THREE.Scene,
    private readonly playerId: string,
  ) {
    this.highlight = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.002, 1.002, 1.002)),
      new THREE.LineBasicMaterial({ color: 0x111111 }),
    )
    this.highlight.visible = false
    scene.add(this.highlight)

    this.onMouseDown = (e) => {
      if (!this.active) return
      if (e.button === 0) {
        if (this.carriedAnimalId) { this.dropCarried(); return }
        if (this.captureTargetAnimal()) return
        if (this.tryCarryAnimal()) return
        if (this.tryPickupLadder()) return
        if (!this.tryPickupFurniture()) this.leftDown = true
      }
      if (e.button === 2) this.rightClick()
    }
    this.onMouseUp = (e) => {
      if (e.button === 0) this.leftDown = false
    }
    this.onContextMenu = (e) => e.preventDefault()
    document.addEventListener('mousedown', this.onMouseDown)
    document.addEventListener('mouseup', this.onMouseUp)
    document.addEventListener('contextmenu', this.onContextMenu)
  }

  dispose(): void {
    document.removeEventListener('mousedown', this.onMouseDown)
    document.removeEventListener('mouseup', this.onMouseUp)
    document.removeEventListener('contextmenu', this.onContextMenu)
  }

  private get active(): boolean {
    return (this.controls.isLocked || this.controls.isTouchDevice) && this.controls.gameplayInput
  }

  /** Called by mobile MINE button: pick up targeted furniture, else hold to mine. */
  startMining(): void {
    if (this.carriedAnimalId) { this.dropCarried(); return }
    if (this.captureTargetAnimal()) return
    if (this.tryCarryAnimal()) return
    if (this.tryPickupLadder()) return
    if (!this.tryPickupFurniture()) this.leftDown = true
  }
  stopMining(): void { this.leftDown = false }
  /** Called by mobile USE button: place block / open chest / feed or toggle animal. */
  triggerRightClick(): void { if (this.active) this.rightClick() }

  /**
   * Called by a mobile double-tap: store the tamed animal under the crosshair
   * into the bag (the touch equivalent of shift + right-click). Returns whether
   * an animal was captured.
   */
  captureTargetAnimal(): boolean {
    if (!this.active) return false
    const animal = this.targetAnimal
    if (!animal || animal.owner !== this.playerId) return false
    if (animal.mode === 'ridden') return false // never bag a horse someone is riding
    const captureItem = captureItemFor(animal.kind)
    if (this.inventory.add(captureItem, 1) > 0) return false // bag full
    this.entities.capture(animal.id)
    this.onAnimalEvent({ type: 'capture', animalId: animal.id })
    this.targetAnimal = null
    return true
  }

  /** Whether the player is currently carrying an NPC. */
  get isCarrying(): boolean {
    return this.carriedAnimalId !== null
  }

  /**
   * Pick up the villager NPC under the crosshair to carry it. NPCs are never
   * stored in the bag — they are only carried, then set back down.
   */
  tryCarryAnimal(): boolean {
    const animal = this.targetAnimal
    if (!animal || animal.kind !== 'villager') return false
    this.carriedAnimalId = animal.id
    animal.carried = true
    animal.mode = 'stay'
    this.targetAnimal = null
    this.onCarry(true)
    return true
  }

  /** Set the carried NPC back down on the ground in front of the player. */
  dropCarried(): void {
    const animal = this.carriedAnimalId ? this.entities.animals.get(this.carriedAnimalId) : null
    this.carriedAnimalId = null
    if (!animal) return
    animal.carried = false
    animal.mode = 'wander'
    const dir = this.camera.getWorldDirection(new THREE.Vector3())
    const feet = this.player.state.pos
    const dropX = feet.x + dir.x * 1.2
    const dropZ = feet.z + dir.z * 1.2
    // Drop into open air; if that spot is blocked, set it down at the player's feet.
    const clear = !isSolid(this.world.getBlock(Math.floor(dropX), Math.floor(feet.y), Math.floor(dropZ)))
    animal.pos = clear ? { x: dropX, y: feet.y + 0.5, z: dropZ } : { x: feet.x, y: feet.y + 0.5, z: feet.z }
    animal.vel = { x: 0, y: 0, z: 0 }
    this.onCarry(false)
  }

  update(dt: number): void {
    // Lit fuses keep burning even while menus are open or the pointer is free.
    this.updateTnt(dt)
    if (!this.active) {
      this.highlight.visible = false
      this.mining = null
      this.miningProgress = null
      this.attackSwing = null
      this.targetAnimal = null
      this.targetFurniture = null
      return
    }
    const dir = this.camera.getWorldDirection(new THREE.Vector3())
    const eye = this.player.eyePosition
    const hit = raycastVoxels(eye.x, eye.y, eye.z, dir.x, dir.y, dir.z, REACH, (x, y, z) =>
      this.targetable(x, y, z),
    )
    const animalHit = this.entities.raycastAnimal(eye, dir, REACH)
    const furnitureHit = this.furniture.raycast(eye, dir, REACH)
    // Pick the nearest of block / animal / furniture for clicks and highlight.
    const blockDist = hit ? hit.distance : Infinity
    const animalDist = animalHit ? animalHit.distance : Infinity
    const furnDist = furnitureHit ? furnitureHit.distance : Infinity
    const animalFirst = animalDist < blockDist && animalDist <= furnDist
    const furnFirst = furnDist < blockDist && furnDist < animalDist
    this.targetBlock = animalFirst || furnFirst ? null : hit
    this.targetAnimal = animalFirst ? animalHit!.animal : null
    this.targetFurniture = furnFirst ? furnitureHit!.furniture : null

    if (this.targetBlock && this.targetBlock.distance > 0) {
      this.highlight.visible = true
      this.highlight.position.set(this.targetBlock.x + 0.5, this.targetBlock.y + 0.5, this.targetBlock.z + 0.5)
    } else {
      this.highlight.visible = false
    }

    // Carry a held NPC just in front of the player, facing the same way.
    if (this.carriedAnimalId) {
      const a = this.entities.animals.get(this.carriedAnimalId)
      if (!a) {
        this.carriedAnimalId = null
      } else {
        a.carried = true
        a.pos = { x: eye.x + dir.x * 0.85, y: eye.y - 0.85, z: eye.z + dir.z * 0.85 }
        a.vel = { x: 0, y: 0, z: 0 }
        a.yaw = Math.atan2(dir.x, dir.z)
      }
    }

    this.updateMining(dt)
    this.updateAttack(dt)
  }

  /**
   * Attacking is the mining action pointed at a zombie: hold MINE / left-click
   * to swing the held weapon; each completed swing lands one hit.
   */
  private updateAttack(dt: number): void {
    const target = this.targetAnimal
    if (!this.leftDown || !target || target.kind !== 'zombie') {
      this.attackSwing = null
      return
    }
    this.attackSwing = (this.attackSwing ?? 0) + dt
    this.miningProgress = Math.min(1, this.attackSwing / ATTACK_SWING_SECONDS)
    if (this.attackSwing < ATTACK_SWING_SECONDS) return
    this.attackSwing = 0
    const damage = (this.inventory.heldItemId !== null ? itemDef(this.inventory.heldItemId)?.damage : undefined) ?? 1
    const pos = { ...target.pos }
    const result = this.entities.hurtZombie(target.id, damage, this.player.state.pos)
    if (result === 'died') {
      this.onAnimalEvent({ type: 'capture', animalId: target.id })
      this.targetAnimal = null
      this.onZombieKilled(pos)
    } else if (result === 'hurt') {
      this.onZombieHit()
    }
  }

  /** Light the fuse of a placed TNT block. */
  private primeTnt(x: number, y: number, z: number, fuse = TNT_FUSE_SECONDS): void {
    if (this.primedTnt.some((t) => t.x === x && t.y === y && t.z === z)) return
    this.primedTnt.push({ x, y, z, timer: fuse })
    this.onTntPrimed()
  }

  private updateTnt(dt: number): void {
    for (let i = this.primedTnt.length - 1; i >= 0; i--) {
      const tnt = this.primedTnt[i]
      tnt.timer -= dt
      if (tnt.timer > 0) continue
      this.primedTnt.splice(i, 1)
      // Mining the block before the fuse ran out defuses it.
      if (this.world.getBlock(tnt.x, tnt.y, tnt.z) !== BlockId.TNT) continue
      this.explode(tnt.x, tnt.y, tnt.z)
    }
  }

  /** Blow a sphere of blocks out of the world around a detonating TNT block. */
  private explode(x: number, y: number, z: number): void {
    const r = TNT_BLAST_RADIUS
    for (let dy = -r; dy <= r; dy++) {
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dy * dy + dz * dz > r * r + 1) continue
          const bx = x + dx
          const by = y + dy
          const bz = z + dz
          const id = this.world.getBlock(bx, by, bz)
          if (id === BlockId.Air) continue
          // Nearby TNT chain-reacts on a short random fuse instead of vanishing.
          if (id === BlockId.TNT && !(dx === 0 && dy === 0 && dz === 0)) {
            this.primeTnt(bx, by, bz, 0.2 + Math.random() * 0.4)
            continue
          }
          this.world.setBlock(bx, by, bz, BlockId.Air)
          this.onBlockEdit(bx, by, bz, BlockId.Air)
        }
      }
    }
    this.onExplosion(x, y, z)
  }

  private updateMining(dt: number): void {
    const target = this.targetBlock
    if (!this.leftDown || !target) {
      this.mining = null
      this.miningProgress = null
      return
    }
    if (!this.canMine()) {
      this.mining = null
      this.miningProgress = null
      this.onTooTired()
      return
    }
    if (!this.mining || this.mining.x !== target.x || this.mining.y !== target.y || this.mining.z !== target.z) {
      const id = this.world.getBlock(target.x, target.y, target.z)
      // Unbreakable blocks (lava) never start a swing — no stuck progress bar.
      if (!Number.isFinite(breakTime(id, this.inventory.heldItemId))) {
        this.mining = null
        this.miningProgress = null
        return
      }
      this.mining = {
        x: target.x,
        y: target.y,
        z: target.z,
        elapsed: 0,
        total: breakTime(id, this.inventory.heldItemId),
      }
    }
    this.mining.elapsed += dt
    this.miningProgress = Math.min(1, this.mining.elapsed / this.mining.total)
    if (this.mining.elapsed >= this.mining.total) {
      this.breakBlock(this.mining.x, this.mining.y, this.mining.z)
      this.mining = null
      this.miningProgress = null
    }
  }

  private collectMysteryBoxLoot(id: number, x: number, y: number, z: number): void {
    const loot = mysteryBoxLoot(id)
    for (const slot of loot) {
      if (slot) this.inventory.add(slot.itemId, slot.count)
    }
    this.world.setBlock(x, y, z, BlockId.Air)
    this.onBlockEdit(x, y, z, BlockId.Air)
    const rarity = id === BlockId.MysteryBoxEpic ? 'Epic' : id === BlockId.MysteryBoxRare ? 'Rare' : 'Common'
    this.onMysteryBoxOpen(rarity)
  }

  private breakBlock(x: number, y: number, z: number): void {
    const id = this.world.getBlock(x, y, z)
    const def = blockDef(id)
    if (!def) return
    if (id === BlockId.MysteryBox || id === BlockId.MysteryBoxRare || id === BlockId.MysteryBoxEpic) {
      this.collectMysteryBoxLoot(id, x, y, z)
      return
    }
    if (id === BlockId.Chest) {
      for (const slot of this.world.getChestContents(x, y, z)) {
        if (slot) this.inventory.add(slot.itemId, slot.count)
      }
      if (this.world.isTreasureChest(x, y, z)) {
        // A treasure box is consumed once emptied — it is never kept as a chest item.
        this.world.setBlock(x, y, z, BlockId.Air)
        this.onBlockEdit(x, y, z, BlockId.Air)
        return
      }
    }
    this.inventory.add(def.drops, 1)
    // Regular leaves: chance to drop bone (no apples — those are only from apple trees).
    if (id === BlockId.Leaves) {
      if (Math.random() < 0.3) this.inventory.add(ItemId.Bone, 1)
    }
    // Apple leaves: def.drops = Apple already; small extra chance of bone.
    if (id === BlockId.AppleLeaves) {
      if (Math.random() < 0.1) this.inventory.add(ItemId.Bone, 1)
    }
    this.world.setBlock(x, y, z, BlockId.Air)
    this.onBlockEdit(x, y, z, BlockId.Air)
    this.onBlockBroken(id)
  }

  /** Try to catch fish using the net. Returns true when a fish was caught. */
  private tryFish(): boolean {
    const eye = this.player.eyePosition
    const dir = this.camera.getWorldDirection(new THREE.Vector3())
    // Aiming directly at an underwater block (sand/stone floor of a pond).
    if (this.targetBlock && this.targetBlock.y <= WATER_LEVEL) {
      this.inventory.add(ItemId.Fish, 1)
      this.onFish()
      return true
    }
    // Ray passes through the water surface without hitting a solid block first.
    if (dir.y < 0 && eye.y > WATER_LEVEL) {
      const tWater = (WATER_LEVEL + 0.35 - eye.y) / dir.y
      const tBlock = this.targetBlock?.distance ?? Infinity
      if (tWater > 0 && tWater < REACH && tWater < tBlock) {
        this.inventory.add(ItemId.Fish, 1)
        this.onFish()
        return true
      }
    }
    return false
  }

  private rightClick(): void {
    // Furniture under the crosshair: a door swings; other pieces are picked up with MINE.
    if (this.targetFurniture) {
      const f = this.targetFurniture
      if (f.kind === 'door') {
        this.furniture.toggleDoor(f.id)
        this.onFurnitureEvent({ type: 'toggle', id: f.id })
      } else if (f.kind === 'market') {
        this.onOpenMarket()
      } else if (f.kind === 'bed') {
        this.onSleep()
      } else if (f.kind.startsWith('arcade')) {
        this.onOpenArcade(f.kind)
      }
      return
    }
    // Fishing: net held, aimed at water, no animal target.
    if (!this.targetAnimal) {
      const heldDef = this.inventory.heldSlot ? itemDef(this.inventory.heldSlot.itemId) : null
      if (heldDef?.kind === 'net' && this.tryFish()) return
    }
    const dir = this.camera.getWorldDirection(new THREE.Vector3())
    const eye = this.player.eyePosition
    const hit = raycastVoxels(eye.x, eye.y, eye.z, dir.x, dir.y, dir.z, REACH, (x, y, z) =>
      this.targetable(x, y, z),
    )
    const animalHit = this.entities.raycastAnimal(eye, dir, REACH)
    if (animalHit && (!hit || animalHit.distance < hit.distance)) {
      this.interactAnimal(animalHit.animal.id)
      return
    }
    if (hit) {
      const blockId = this.world.getBlock(hit.x, hit.y, hit.z)
      if (blockId === BlockId.Chest) {
        this.onOpenChest(hit.x, hit.y, hit.z)
        return
      }
      if (blockId === BlockId.MysteryBox || blockId === BlockId.MysteryBoxRare || blockId === BlockId.MysteryBoxEpic) {
        this.collectMysteryBoxLoot(blockId, hit.x, hit.y, hit.z)
        return
      }
      // Right-clicking placed TNT lights its fuse.
      if (blockId === BlockId.TNT) {
        this.primeTnt(hit.x, hit.y, hit.z)
        return
      }
    }

    const held = this.inventory.heldSlot
    if (!held) return
    const def = itemDef(held.itemId)
    if (!def) return

    // Eat held food that restores energy (feeding an animal was handled above).
    if (def.kind === 'food' && def.energy && this.onEat(held.itemId, def.energy)) {
      this.inventory.removeFrom(this.inventory.selected)
      return
    }

    if (!hit) return
    const px = hit.x + hit.nx
    const py = hit.y + hit.ny
    const pz = hit.z + hit.nz

    if (def.kind === 'capture' && def.animal) {
      if (isSolid(this.world.getBlock(px, py, pz))) return
      const released = this.entities.release(def.animal, { x: px + 0.5, y: py + 0.01, z: pz + 0.5 }, this.playerId)
      this.inventory.removeFrom(this.inventory.selected)
      this.onAnimalEvent({ type: 'release', animalId: released.id, kind: def.animal, pos: released.pos, owner: this.playerId })
      return
    }

    if (def.kind === 'furniture' && def.furniture) {
      if (isSolid(this.world.getBlock(px, py, pz)) || this.furniture.occupied(px, py, pz)) return
      const yaw = snapYaw(this.controls.yaw)
      const placed = this.furniture.place(def.furniture, px, py, pz, yaw)
      this.inventory.removeFrom(this.inventory.selected)
      this.onFurnitureEvent({ type: 'place', item: { ...placed } })
      return
    }

    if (def.kind !== 'block' || def.block === undefined) return
    if (hit.distance === 0) return // standing inside the targeted voxel
    if (this.world.getBlock(px, py, pz) !== BlockId.Air) return
    // Walk-through blocks (ladders) can be stacked freely — even where the
    // player or animals stand — so you can build a climbable column upward.
    if (isSolid(def.block)) {
      if (boxOverlapsVoxel(this.player.state.pos, px, py, pz)) return
      for (const animal of this.entities.animals.values()) {
        if (boxOverlapsVoxel(animal.pos, px, py, pz, ANIMAL_DIMS[animal.kind])) return
      }
    }
    this.inventory.removeFrom(this.inventory.selected)
    this.world.setBlock(px, py, pz, def.block)
    this.onBlockEdit(px, py, pz, def.block)
    // Placing TNT lights its fuse immediately — step back!
    if (def.block === BlockId.TNT) this.primeTnt(px, py, pz)
  }

  /**
   * Blocks the crosshair can lock onto. Ladders are non-solid (you walk/climb
   * through them) but must still be targetable so they can be stacked against
   * and removed; everything else falls back to the physics solidity test.
   */
  private targetable(x: number, y: number, z: number): boolean {
    const id = this.world.getBlock(x, y, z)
    // Lava is non-solid but must still be targetable so the crosshair can name
    // it (and its info card can be opened); breaking it is refused separately.
    return isSolid(id) || id === BlockId.Ladder || id === BlockId.Lava
  }

  /** Left-click on a placed ladder lifts it straight back into the bag. */
  private tryPickupLadder(): boolean {
    const t = this.targetBlock
    if (!t || this.world.getBlock(t.x, t.y, t.z) !== BlockId.Ladder) return false
    this.inventory.add(ItemId.Ladder, 1)
    this.world.setBlock(t.x, t.y, t.z, BlockId.Air)
    this.onBlockEdit(t.x, t.y, t.z, BlockId.Air)
    this.targetBlock = null
    return true
  }

  /** If furniture is under the crosshair, pick it back into the bag. */
  private tryPickupFurniture(): boolean {
    const f = this.targetFurniture
    if (!f) return false
    if (f.kind === 'campfire') return false
    const itemId = furnitureItemFor(f.kind)
    if (itemId === undefined) return false
    this.furniture.remove(f.id)
    this.inventory.add(itemId, 1)
    this.onFurnitureEvent({ type: 'remove', id: f.id })
    this.targetFurniture = null
    return true
  }

  private interactAnimal(animalId: string): void {
    const animal = this.entities.animals.get(animalId)
    if (!animal) return
    const held = this.inventory.heldSlot
    const heldDef = held ? itemDef(held.itemId) : null

    // Your chicken with an egg waiting: right-click collects it.
    if (animal.kind === 'chicken' && animal.owner === this.playerId && animal.eggReady) {
      this.onCollectEgg(animal.id)
      return
    }

    // Feed matching food -> tame.
    const foodFor = heldDef?.food
    const feedsThis = Array.isArray(foodFor) ? foodFor.includes(animal.kind) : foodFor === animal.kind
    if (heldDef?.kind === 'food' && feedsThis) {
      if (animal.owner === this.playerId && animal.mode !== 'wander') return
      this.inventory.removeFrom(this.inventory.selected)
      this.entities.tame(animalId, this.playerId)
      this.onAnimalEvent({ type: 'tame', animalId, owner: this.playerId })
      return
    }

    if (animal.owner !== this.playerId) return

    // Shift + right-click a tamed animal -> capture into an item.
    if (this.controls.keys.has('ShiftLeft') || this.controls.keys.has('ShiftRight')) {
      const captureItem = captureItemFor(animal.kind)
      if (this.inventory.add(captureItem, 1) > 0) return // inventory full
      this.entities.capture(animalId)
      this.onAnimalEvent({ type: 'capture', animalId })
      return
    }

    // Horse: mount instead of toggle stay.
    if (animal.kind === 'horse') {
      this.onMount(animalId)
      return
    }

    // Plain right-click on your animal -> toggle follow/stay.
    this.entities.toggleStay(animalId)
    this.onAnimalEvent({ type: 'toggleStay', animalId })
  }
}

const TNT_FUSE_SECONDS = 2
const TNT_BLAST_RADIUS = 3
/** Seconds per weapon swing when attacking a mob. */
const ATTACK_SWING_SECONDS = 0.45

/** Snap a yaw to the nearest quarter turn so furniture lines up with walls. */
function snapYaw(yaw: number): number {
  const q = Math.PI / 2
  return Math.round(yaw / q) * q
}
