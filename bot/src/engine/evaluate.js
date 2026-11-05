import { COLUMNS, ROWS, CONNECT } from '@fila-cero/game'

const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
]

export const WINDOWS = []
for (let row = 0; row < ROWS; row++) {
  for (let col = 0; col < COLUMNS; col++) {
    for (const [dr, dc] of DIRECTIONS) {
      const endRow = row + dr * (CONNECT - 1)
      const endCol = col + dc * (CONNECT - 1)
      if (endRow < 0 || endRow >= ROWS || endCol < 0 || endCol >= COLUMNS) continue
      WINDOWS.push(Array.from({ length: CONNECT }, (_, k) => (row + dr * k) * COLUMNS + (col + dc * k)))
    }
  }
}

const WINDOW_WEIGHT = [0, 0, 2, 10]
const CENTER_COLUMNS = [Math.floor((COLUMNS - 1) / 2), Math.ceil((COLUMNS - 1) / 2)]
const CENTER_BONUS = 3

export function evaluate(cells, player) {
  let score = 0
  for (const window of WINDOWS) {
    let mine = 0
    let theirs = 0
    for (const idx of window) {
      const v = cells[idx]
      if (v === player) mine++
      else if (v !== 0) theirs++
    }
    if (mine && !theirs) score += WINDOW_WEIGHT[mine]
    else if (theirs && !mine) score -= WINDOW_WEIGHT[theirs]
  }
  for (let row = 0; row < ROWS; row++) {
    for (const col of CENTER_COLUMNS) {
      const v = cells[row * COLUMNS + col]
      if (v === player) score += CENTER_BONUS
      else if (v !== 0) score -= CENTER_BONUS
    }
  }
  return score
}
