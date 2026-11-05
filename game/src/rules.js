import { COLUMNS, ROWS, CONNECT } from './constants.js'

const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
]

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
