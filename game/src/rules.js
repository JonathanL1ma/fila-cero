import { COLUMNS, ROWS, CONNECT } from './constants.js'


// Las cuatro direcciones de una línea: horizontal, vertical y las dos diagonales.
const ROW_STEPS = [0, 1, 1, 1]
const COL_STEPS = [1, 0, 1, -1]
const DIRECTIONS = ROW_STEPS.map((dr, d) => [dr, COL_STEPS[d]])

// Indica si una ficha de `player` en (row, col) completa una línea, sin crear arreglos:
// es la versión rápida que usa la búsqueda. La casilla misma no se lee, así que sirve
// tanto para una casilla vacía (¿ganaría ahí?) como para una ya jugada.
export function completesLine(cells, row, col, player) {
  for (let d = 0; d < 4; d++) {
    const dr = ROW_STEPS[d]
    const dc = COL_STEPS[d]
    let length = 1
    let r = row + dr
    let c = col + dc
    while (r >= 0 && r < ROWS && c >= 0 && c < COLUMNS && cells[r * COLUMNS + c] === player) {
      length++
      r += dr
      c += dc
    }
    r = row - dr
    c = col - dc
    while (r >= 0 && r < ROWS && c >= 0 && c < COLUMNS && cells[r * COLUMNS + c] === player) {
      length++
      r -= dr
      c -= dc
    }
    if (length >= CONNECT) return true
  }
  return false
}

const at = (cells, row, col) =>
  row >= 0 && row < ROWS && col >= 0 && col < COLUMNS ? cells[row * COLUMNS + col] : 0

export function winningCellsAt(cells, row, col) {
  const player = at(cells, row, col)
  if (!player) return null
  const found = []
  for (const [dr, dc] of DIRECTIONS) {
    const line = []
    for (const sign of [1, -1]) {
      let r = row + dr * sign
      let c = col + dc * sign
      while (at(cells, r, c) === player) {
        line.push([r, c])
        r += dr * sign
        c += dc * sign
      }
    }
    if (line.length + 1 >= CONNECT) found.push(...line)
  }
  if (!found.length) return null
  found.push([row, col])
  return found.sort(([r1, c1], [r2, c2]) => r1 - r2 || c1 - c2)
}
