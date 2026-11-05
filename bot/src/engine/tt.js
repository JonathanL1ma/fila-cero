import { CELLS } from '@fila-cero/game'

export const EXACT = 0
export const LOWER = 1
export const UPPER = 2

// Generador mulberry32. No sirve uno lineal como xorshift: con él, cada número de
// ZOBRIST_CHECK es una transformación fija del de ZOBRIST_INDEX, la segunda clave se deduce
// de la primera y deja de verificar la posición (dos posiciones con la misma h1 tendrían
// siempre la misma h2).
function seeded(seed) {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return (t ^ (t >>> 14)) | 0
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
  const generation = new Uint8Array(size)
  let current = 0

  return {
    // Cada búsqueda abre una generación. Una entrada profunda solo se protege del
    // reemplazo si es de la búsqueda actual: si no, la tabla se llenaría de entradas de
    // jugadas y partidas pasadas que el worker del torneo arrastra durante toda la liga.
    newSearch() {
      current = (current + 1) & 0xff
    },
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
      if (generation[i] === current && depth[i] > d && check[i] !== h2) return
      generation[i] = current
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
