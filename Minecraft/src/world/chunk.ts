import { localIndex } from '../core/coords'

export class Chunk {
  dirty = false

  constructor(
    readonly cx: number,
    readonly cz: number,
    readonly data: Uint8Array,
  ) {}

  get(lx: number, y: number, lz: number): number {
    return this.data[localIndex(lx, y, lz)]
  }

  set(lx: number, y: number, lz: number, id: number): void {
    this.data[localIndex(lx, y, lz)] = id
  }
}
