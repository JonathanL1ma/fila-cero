import { describe, expect, it } from 'vitest'
import { CELLS, CENTER_ORDER, COLUMNS, fromGrid, playerToMove } from '@fila-cero/game'
import { WIN, createSearch } from '../../src/engine/search.js'
import { evaluate } from '../../src/engine/evaluate.js'
import { EXACT, createTT } from '../../src/engine/tt.js'
import { drawn, randomPosition, seededRandom } from '../helpers.js'

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

// Valor exacto de cada columna de la raíz según la referencia (null si no se puede jugar).
function referenceColumnScores(grid, depth) {
  const board = fromGrid(grid)
  const player = playerToMove(grid)
  return Array.from({ length: COLUMNS }, (_, col) => {
    if (!board.canPlay(col)) return null
    if (board.isWinningMove(col, player)) return WIN - 1
    board.play(col, player)
    const score = -referenceNegamax(board, 3 - player, depth - 1, 1)
    board.undo(col)
    return score
  })
}

// Valor exacto de cada columna según el motor: buscar la raíz con esa sola jugada deja la
// ventana completa, así que el resultado no es una cota.
function engineColumnScores(grid, depth) {
  const board = fromGrid(grid)
  const player = playerToMove(grid)
  return Array.from({ length: COLUMNS }, (_, col) =>
    board.canPlay(col) ? createSearch(board, noClock, null).searchRoot(player, depth, [col]).score : null,
  )
}

describe('búsqueda', () => {
  it('cada columna de la raíz vale lo mismo que en un minimax sin poda ni descarte de jugadas', () => {
    const random = seededRandom(11)
    for (let i = 0; i < 150; i++) {
      const grid = randomPosition(random, Math.floor(random() * 40))
      expect(engineColumnScores(grid, 4)).toEqual(referenceColumnScores(grid, 4))
    }
  })

  it('si toda jugada del rival le abre una victoria encima, la columna que lo deja así gana en 3', () => {
    const grid = drawn('.12.22.2', '121.11.1', '122.22.1', '211.1221', '122.1212', '112.1122', '22212111')
    expect(playerToMove(grid)).toBe(1)

    const scores = engineColumnScores(grid, 3)

    expect(scores[0]).toBe(WIN - 3)
    expect(scores).toEqual(referenceColumnScores(grid, 3))
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
