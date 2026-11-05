import { CELLS } from '@fila-cero/game'

export const EXACT = 0
export const LOWER = 1
export const UPPER = 2

function seeded(seed) {
  let s = seed >>> 0
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    return s | 0
  }
}

const random = seeded(0x46c0)
export const ZOBRIST_INDEX = Int32Array.from({ length: 2 * CELLS }, random)
export const ZOBRIST_CHECK = Int32Array.from({ length: 2 * CELLS }, random)

export const zobristOffset = (player, idx) => (player - 1) * CELLS + idx

export function hashCells(cells) {
  let h1 = 0
  let h2 = 0
  for (let idx = 0; idx < CELLS; idx++) {
    if (!cells[idx]) continue
    const z = zobristOffset(cells[idx], idx)
    h1 ^= ZOBRIST_INDEX[z]
    h2 ^= ZOBRIST_CHECK[z]
  }
  return [h1, h2]
}

export function createTT(bits = 21) {
  const size = 1 << bits
  const mask = size - 1
  const check = new Int32Array(size)
  const score = new Int32Array(size)
  const depth = new Int8Array(size).fill(-1)
  const flag = new Int8Array(size)
  const move = new Int8Array(size)

  return {
    probe(h1, h2) {
      const i = h1 & mask
      return depth[i] >= 0 && check[i] === h2 ? i : -1
    },
    depth: (i) => depth[i],
    score: (i) => score[i],
    flag: (i) => flag[i],
    move: (i) => move[i],
    store(h1, h2, d, f, s, m) {
      const i = h1 & mask
      if (depth[i] > d && check[i] !== h2) return
      check[i] = h2
      depth[i] = d
      flag[i] = f
      score[i] = s
      move[i] = m
    },
    clear() {
      depth.fill(-1)
    },
  }
}
