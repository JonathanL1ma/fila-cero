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

const WINDOW_SCORE = [...WINDOW_WEIGHT, 0]
const CELL_WINDOWS = Array.from({ length: ROWS * COLUMNS }, () => [])
WINDOWS.forEach((window, id) => window.forEach((idx) => CELL_WINDOWS[idx].push(id)))
const IS_CENTER = Array.from({ length: ROWS * COLUMNS }, (_, idx) => CENTER_COLUMNS.includes(idx % COLUMNS))

// Aporte de una ventana desde el punto de vista del jugador 1.
const windowScore = (ones, twos) => (twos === 0 ? WINDOW_SCORE[ones] : 0) - (ones === 0 ? WINDOW_SCORE[twos] : 0)

// La misma heurística que evaluate(), pero mantenida jugada a jugada: al poner o quitar una
// ficha solo se actualizan las ventanas que pasan por esa casilla (a lo sumo 16 de 107), así
// que leer el puntaje en una hoja de la búsqueda no recorre el tablero.
export function createIncrementalEvaluation(cells) {
  const ones = new Int8Array(WINDOWS.length)
  const twos = new Int8Array(WINDOWS.length)
  let balance = 0

  function update(idx, player, delta) {
    const counts = player === 1 ? ones : twos
    for (const id of CELL_WINDOWS[idx]) {
      balance -= windowScore(ones[id], twos[id])
      counts[id] += delta
      balance += windowScore(ones[id], twos[id])
    }
    if (IS_CENTER[idx]) balance += (player === 1 ? CENTER_BONUS : -CENTER_BONUS) * delta
  }

  cells.forEach((player, idx) => player && update(idx, player, 1))

  return {
    add: (idx, player) => update(idx, player, 1),
    remove: (idx, player) => update(idx, player, -1),
    score: (player) => (player === 1 ? balance : 0 - balance),
  }
}

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
    if (mine && !theirs) score += WINDOW_SCORE[mine]
    else if (theirs && !mine) score -= WINDOW_SCORE[theirs]
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
