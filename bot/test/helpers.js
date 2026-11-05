import { applyMove, legalMoves, outcome } from '@fila-cero/game'

export const drawn = (...rowsTopFirst) =>
  rowsTopFirst.map((row) => [...row].map((ch) => (ch === '.' ? 0 : Number(ch)))).reverse()

export const emptyGrid = () => Array.from({ length: 7 }, () => new Array(8).fill(0))

export function seededRandom(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

export function randomPosition(random, plies) {
  let grid = emptyGrid()
  for (let i = 0; i < plies; i++) {
    const legal = legalMoves(grid)
    const next = applyMove(grid, legal[Math.floor(random() * legal.length)])
    if (outcome(next).state !== 'playing') break
    grid = next
  }
  return grid
}
