import { COLUMNS, ROWS, CELLS } from './constants.js'
import { completesLine, winningCellsAt } from './rules.js'

export class Board {
  constructor() {
    this.cells = new Int8Array(CELLS)
    this.heights = new Int8Array(COLUMNS)
    this.count = 0
  }

  canPlay(col) {
    return Number.isInteger(col) && col >= 0 && col < COLUMNS && this.heights[col] < ROWS
  }

  play(col, player) {
    if (!this.canPlay(col)) throw new RangeError(`Jugada ilegal: columna ${col}`)
    const row = this.heights[col]
    this.cells[row * COLUMNS + col] = player
    this.heights[col]++
    this.count++
    return row
  }

  undo(col) {
    const row = --this.heights[col]
    this.cells[row * COLUMNS + col] = 0
    this.count--
  }

  legalMoves() {
    const moves = []
    for (let col = 0; col < COLUMNS; col++) if (this.heights[col] < ROWS) moves.push(col)
    return moves
  }

  isFull() {
    return this.count === CELLS
  }

  winningCellsAt(row, col) {
    return winningCellsAt(this.cells, row, col)
  }

  isWinningMove(col, player) {
    if (!this.canPlay(col)) return false
    return completesLine(this.cells, this.heights[col], col, player)
  }
}
