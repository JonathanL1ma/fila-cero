import { describe, expect, it } from 'vitest'
import { Board, COLUMNS, fromGrid } from '@fila-cero/game'
import { WINDOWS, createIncrementalEvaluation, evaluate } from '../../src/engine/evaluate.js'
import { drawn, seededRandom } from '../helpers.js'

describe('evaluate', () => {
  it('recorre las 107 ventanas de cuatro casillas del tablero 8×7', () => {
    expect(WINDOWS).toHaveLength(107)
  })

  it('es simétrica: la misma posición vale lo opuesto para cada jugador', () => {
    const { cells } = fromGrid(drawn('........', '........', '........', '........', '........', '...2....', '..11....'))
    expect(evaluate(cells, 1)).toBe(-evaluate(cells, 2))
    expect(evaluate(cells, 1)).toBeGreaterThan(0)
  })
})

describe('createIncrementalEvaluation', () => {
  it('coincide con evaluate() en cada paso de 2,000 jugadas y deshacer al azar, sin completar cuatro', () => {
    const random = seededRandom(7)
    const board = new Board()
    const evaluation = createIncrementalEvaluation(board.cells)
    const played = []

    for (let step = 0; step < 2000; step++) {
      const player = played.length % 2 === 0 ? 1 : 2
      const quiet = board.legalMoves().filter((col) => !board.isWinningMove(col, player))
      const undoing = played.length > 0 && (quiet.length === 0 || random() < 0.4)
      if (undoing) {
        const last = played.pop()
        board.undo(last.col)
        evaluation.remove(last.idx, last.player)
      } else {
        const col = quiet[Math.floor(random() * quiet.length)]
        const row = board.play(col, player)
        const idx = row * COLUMNS + col
        evaluation.add(idx, player)
        played.push({ col, idx, player })
      }
      expect(evaluation.score(1)).toBe(evaluate(board.cells, 1))
      expect(evaluation.score(2)).toBe(evaluate(board.cells, 2))
    }
  })

  it('arranca con el puntaje de un tablero que ya tiene fichas', () => {
    const { cells } = fromGrid(drawn('........', '........', '........', '........', '..2.....', '..12....', '.1121...'))
    const evaluation = createIncrementalEvaluation(cells)

    expect(evaluation.score(1)).toBe(evaluate(cells, 1))
    expect(evaluation.score(2)).toBe(evaluate(cells, 2))
  })
})
