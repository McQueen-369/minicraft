import * as THREE from 'three'
import { REACH } from '../constants'
import { BlockId, blockDef, isSolid } from '../core/blocks'
import type { EntityManager } from '../entities/entityManager'
import type { Inventory } from '../items/inventory'
import { breakTime, captureItemFor, itemDef } from '../items/items'
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

  onBlockEdit: (x: number, y: number, z: number, id: number) => void = () => {}
  onAnimalEvent: (ev: AnimalEvent) => void = () => {}
  onOpenChest: (x: number, y: number, z: number) => void = () => {}

  private leftDown = false
  private mining: { x: number; y: number; z: number; elapsed: number; total: number } | null = null
  private readonly highlight: THREE.LineSegments
  private readonly onMouseDown: (e: MouseEvent) => void
  private readonly onMouseUp: (e: MouseEvent) => void
  private readonly onContextMenu: (e: Event) => void

  constructor(
    private readonly world: World,
    private readonly inventory: Inventory,
    private readonly entities: EntityManager,
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
      if (e.button === 0) this.leftDown = true
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

  /** Called by mobile MINE button: hold to mine the targeted block. */
  startMining(): void { this.leftDown = true }
  stopMining(): void { this.leftDown = false }
  /** Called by mobile USE button: place block / open chest / feed or toggle animal. */
  triggerRightClick(): void { if (this.active) this.rightClick() }

  update(dt: number): void {
    if (!this.active) {
      this.highlight.visible = false
      this.mining = null
      this.miningProgress = null
      this.targetAnimal = null
      return
    }
    const dir = this.camera.getWorldDirection(new THREE.Vector3())
    const eye = this.player.eyePosition
    const hit = raycastVoxels(eye.x, eye.y, eye.z, dir.x, dir.y, dir.z, REACH, (x, y, z) =>
      isSolid(this.world.getBlock(x, y, z)),
    )
    const animalHit = this.entities.raycastAnimal(eye, dir, REACH)
    // An animal in front of the targeted block takes priority for clicks.
    const animalFirst = animalHit && (!hit || animalHit.distance < hit.distance)
    this.targetBlock = animalFirst ? null : hit
    this.targetAnimal = animalFirst ? animalHit!.animal : null

    if (this.targetBlock && this.targetBlock.distance > 0) {
      this.highlight.visible = true
      this.highlight.position.set(this.targetBlock.x + 0.5, this.targetBlock.y + 0.5, this.targetBlock.z + 0.5)
    } else {
      this.highlight.visible = false
    }

    this.updateMining(dt)
  }

  private updateMining(dt: number): void {
    const target = this.targetBlock
    if (!this.leftDown || !target) {
      this.mining = null
      this.miningProgress = null
      return
    }
    if (!this.mining || this.mining.x !== target.x || this.mining.y !== target.y || this.mining.z !== target.z) {
      const id = this.world.getBlock(target.x, target.y, target.z)
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

  private breakBlock(x: number, y: number, z: number): void {
    const id = this.world.getBlock(x, y, z)
    const def = blockDef(id)
    if (!def) return
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
    this.world.setBlock(x, y, z, BlockId.Air)
    this.onBlockEdit(x, y, z, BlockId.Air)
  }

  private rightClick(): void {
    const dir = this.camera.getWorldDirection(new THREE.Vector3())
    const eye = this.player.eyePosition
    const hit = raycastVoxels(eye.x, eye.y, eye.z, dir.x, dir.y, dir.z, REACH, (x, y, z) =>
      isSolid(this.world.getBlock(x, y, z)),
    )
    const animalHit = this.entities.raycastAnimal(eye, dir, REACH)
    if (animalHit && (!hit || animalHit.distance < hit.distance)) {
      this.interactAnimal(animalHit.animal.id)
      return
    }
    if (!hit) return

    const blockId = this.world.getBlock(hit.x, hit.y, hit.z)
    if (blockId === BlockId.Chest) {
      this.onOpenChest(hit.x, hit.y, hit.z)
      return
    }

    const held = this.inventory.heldSlot
    if (!held) return
    const def = itemDef(held.itemId)
    if (!def) return

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

    if (def.kind !== 'block' || def.block === undefined) return
    if (hit.distance === 0) return // standing inside the targeted voxel
    if (isSolid(this.world.getBlock(px, py, pz))) return
    if (boxOverlapsVoxel(this.player.state.pos, px, py, pz)) return
    for (const animal of this.entities.animals.values()) {
      if (boxOverlapsVoxel(animal.pos, px, py, pz, ANIMAL_DIMS[animal.kind])) return
    }
    this.inventory.removeFrom(this.inventory.selected)
    this.world.setBlock(px, py, pz, def.block)
    this.onBlockEdit(px, py, pz, def.block)
  }

  private interactAnimal(animalId: string): void {
    const animal = this.entities.animals.get(animalId)
    if (!animal) return
    const held = this.inventory.heldSlot
    const heldDef = held ? itemDef(held.itemId) : null

    // Feed matching food -> tame.
    if (heldDef?.kind === 'food' && heldDef.food === animal.kind) {
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

    // Plain right-click on your animal -> toggle follow/stay.
    this.entities.toggleStay(animalId)
    this.onAnimalEvent({ type: 'toggleStay', animalId })
  }
}
