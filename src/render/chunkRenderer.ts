import * as THREE from 'three'
import { CHUNK_SIZE, MESH_BUDGET_PER_FRAME, RENDER_DISTANCE } from '../constants'
import { parseChunkKey, worldToChunk } from '../core/coords'
import type { World } from '../world/world'
import type { Atlas } from './atlas'
import { meshChunk } from './mesher'

export class ChunkRenderer {
  private readonly meshes = new Map<string, THREE.Mesh>()
  private readonly material: THREE.MeshLambertMaterial

  constructor(
    private readonly scene: THREE.Scene,
    private readonly world: World,
    atlas: Atlas,
  ) {
    this.material = new THREE.MeshLambertMaterial({ map: atlas.texture })
  }

  get chunkCount(): number {
    return this.meshes.size
  }

  /** Stream chunk generation/meshing around the player. Call once per frame. */
  update(px: number, pz: number, generateBudget = MESH_BUDGET_PER_FRAME, meshBudget = MESH_BUDGET_PER_FRAME): number {
    const { unloaded } = this.world.updateLoadedChunks(px, pz, generateBudget)
    for (const key of unloaded) this.removeMesh(key)

    const pcx = worldToChunk(Math.floor(px))
    const pcz = worldToChunk(Math.floor(pz))
    // Rebuild dirty chunk meshes, nearest first, a few per frame.
    const candidates: { key: string; d2: number }[] = []
    for (const key of this.world.dirtyChunks) {
      const { cx, cz } = parseChunkKey(key)
      const dx = cx - pcx
      const dz = cz - pcz
      const d2 = dx * dx + dz * dz
      if (d2 > RENDER_DISTANCE * RENDER_DISTANCE) continue
      if (!this.world.hasChunk(cx, cz)) {
        this.world.dirtyChunks.delete(key)
        continue
      }
      // Wait until all horizontal neighbors exist so border faces cull correctly.
      if (
        !this.world.hasChunk(cx + 1, cz) ||
        !this.world.hasChunk(cx - 1, cz) ||
        !this.world.hasChunk(cx, cz + 1) ||
        !this.world.hasChunk(cx, cz - 1)
      ) {
        continue
      }
      candidates.push({ key, d2 })
    }
    candidates.sort((a, b) => a.d2 - b.d2)
    const toBuild = candidates.slice(0, meshBudget)
    for (const { key } of toBuild) {
      this.world.dirtyChunks.delete(key)
      this.buildMesh(key)
    }
    return toBuild.length
  }

  /** Synchronously generate and mesh everything around a position (spawn). */
  buildAllNow(px: number, pz: number): void {
    this.world.updateLoadedChunks(px, pz, Infinity)
    let guard = 1000
    while (this.update(px, pz, Infinity, Infinity) > 0 && guard-- > 0) {
      // keep meshing until no dirty chunk within render distance remains
    }
  }

  private buildMesh(key: string): void {
    const { cx, cz } = parseChunkKey(key)
    const data = meshChunk(cx, cz, (x, y, z) => this.world.getBlock(x, y, z))
    this.removeMesh(key)
    if (data.faceCount === 0) return
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3))
    geometry.setAttribute('normal', new THREE.BufferAttribute(data.normals, 3))
    geometry.setAttribute('uv', new THREE.BufferAttribute(data.uvs, 2))
    geometry.setIndex(new THREE.BufferAttribute(data.indices, 1))
    geometry.computeBoundingSphere()
    const mesh = new THREE.Mesh(geometry, this.material)
    mesh.matrixAutoUpdate = false
    this.meshes.set(key, mesh)
    this.scene.add(mesh)
  }

  private removeMesh(key: string): void {
    const mesh = this.meshes.get(key)
    if (!mesh) return
    this.scene.remove(mesh)
    mesh.geometry.dispose()
    this.meshes.delete(key)
  }
}

/** Center-of-chunk distance helper for debug display. */
export function chunkCenter(key: string): { x: number; z: number } {
  const { cx, cz } = parseChunkKey(key)
  return { x: (cx + 0.5) * CHUNK_SIZE, z: (cz + 0.5) * CHUNK_SIZE }
}
