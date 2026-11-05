import { describe, expect, it } from 'vitest'
import { CELLS, CENTER_ORDER, fromGrid, playerToMove } from '@fila-cero/game'
import { WIN, createSearch } from '../../src/engine/search.js'
import { evaluate } from '../../src/engine/evaluate.js'
import { EXACT, createTT } from '../../src/engine/tt.js'
import { randomPosition, seededRandom } from '../helpers.js'

const noClock = { check() {} }

// Negamax de referencia, sin poda alfa-beta, sin tabla y sin descartar jugadas: el valor
// minimax "de libro" con la misma evaluación en las hojas.
function referenceNegamax(board, player, depth, ply) {
  for (const col of CENTER_ORDER) if (board.isWinningMove(col, player)) return WIN - ply - 1
  if (board.count >= CELLS - 1) return 0
  if (depth === 0) return evaluate(board.cells, player)
  let best = -Infinity
  for (const col of CENTER_ORDER) {
    if (!board.canPlay(col)) continue
    board.play(col, player)
    best = Math.max(best, -referenceNegamax(board, 3 - player, depth - 1, ply + 1))
    board.undo(col)
  }
  return best
}

function referenceRoot(grid, depth) {
  const board = fromGrid(grid)
  const player = playerToMove(grid)
  let best = -Infinity
  for (const col of CENTER_ORDER) {
    if (!board.canPlay(col)) continue
    if (board.isWinningMove(col, player)) return WIN - 1
    board.play(col, player)
    best = Math.max(best, -referenceNegamax(board, 3 - player, depth - 1, 1))
    board.undo(col)
  }
  return best
}

function engineRoot(grid, depth) {
  const board = fromGrid(grid)
  const order = CENTER_ORDER.filter((col) => board.canPlay(col))
  return createSearch(board, noClock, null).searchRoot(playerToMove(grid), depth, order).score
}

describe('búsqueda', () => {
  it('con poda y jugadas perdedoras descartadas da el mismo valor que un minimax sin poda', () => {
    const random = seededRandom(11)
    for (let i = 0; i < 40; i++) {
      const grid = randomPosition(random, Math.floor(random() * 30))
      expect(engineRoot(grid, 4)).toBe(referenceRoot(grid, 4))
    }
  })
})

describe('reemplazo en la tabla de transposición', () => {
  it('protege una entrada profunda de la búsqueda actual', () => {
    const tt = createTT(4)
    tt.newSearch()
    tt.store(5, 1, 12, EXACT, 10, 3)
    tt.store(5, 2, 2, EXACT, 20, 4)
    expect(tt.probe(5, 1)).toBeGreaterThanOrEqual(0)
    expect(tt.probe(5, 2)).toBe(-1)
  })

  it('reemplaza una entrada profunda de una búsqueda anterior', () => {
    const tt = createTT(4)
    tt.newSearch()
    tt.store(5, 1, 12, EXACT, 10, 3)
    tt.newSearch()
    tt.store(5, 2, 2, EXACT, 20, 4)
    expect(tt.probe(5, 1)).toBe(-1)
    expect(tt.score(tt.probe(5, 2))).toBe(20)
  })
})
