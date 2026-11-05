import { COLUMNS, ROWS, CELLS } from './constants.js'
import { Board } from './board.js'

export function validateGrid(grid) {
  if (!Array.isArray(grid) || grid.length !== ROWS) return `El tablero debe tener ${ROWS} filas`
  for (const row of grid) {
    if (!Array.isArray(row) || row.length !== COLUMNS) return `Cada fila debe tener ${COLUMNS} columnas`
    if (row.some((v) => v !== 0 && v !== 1 && v !== 2)) return 'Las casillas solo pueden valer 0, 1 o 2'
  }
  for (let col = 0; col < COLUMNS; col++) {
    for (let row = 1; row < ROWS; row++) {
      if (grid[row][col] && !grid[row - 1][col]) return `Hay una ficha flotando en la columna ${col}`
    }
  }
  if (playerToMove(grid) === null) return 'La cantidad de fichas de cada jugador no es coherente'
  return null
}

export function playerToMove(grid) {
  let ones = 0
  let twos = 0
  for (const row of grid) for (const v of row) v === 1 ? ones++ : v === 2 && twos++
  if (ones === twos) return 1
  if (ones === twos + 1) return 2
  return null
}

export function fromGrid(grid) {
  const board = new Board()
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLUMNS; col++) {
      const v = grid[row][col]
      if (!v) continue
      board.cells[row * COLUMNS + col] = v
      board.heights[col] = row + 1
      board.count++
    }
  }
  return board
}

export function toGrid(board) {
  return Array.from({ length: ROWS }, (_, row) => Array.from(board.cells.subarray(row * COLUMNS, (row + 1) * COLUMNS)))
}

export function applyMove(grid, col) {
  const player = playerToMove(grid)
  const board = fromGrid(grid)
  board.play(col, player)
  return toGrid(board)
}

export function legalMoves(grid) {
  return fromGrid(grid).legalMoves()
}

export function outcome(grid) {
  const board = fromGrid(grid)
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLUMNS; col++) {
      const winningCells = board.winningCellsAt(row, col)
      if (winningCells) return { state: 'won', winner: grid[row][col], winningCells }
    }
  }
  return { state: board.count === CELLS ? 'draw' : 'playing' }
}
