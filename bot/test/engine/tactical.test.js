import { describe, expect, it } from 'vitest'
import { outcome, playerToMove, validateGrid } from '@fila-cero/game'
import { chooseMove, WIN } from '../../src/engine/index.js'
import { tacticalCases } from '../fixtures/tactical-cases.js'
import { drawn } from '../helpers.js'

const SEARCH = { timeMs: 500, maxDepth: 8 }

describe.each(tacticalCases)('caso táctico $id', (testCase) => {
  const grid = drawn(...testCase.rows)

  it('es una posición posible de una partida sin terminar', () => {
    expect(validateGrid(grid)).toBeNull()
    expect(playerToMove(grid)).toBe(testCase.toMove)
    expect(outcome(grid).state).toBe('playing')
  })

  it('el motor elige una de las columnas correctas', () => {
    const { column } = chooseMove(grid, testCase.toMove, SEARCH)

    expect(testCase.best).toContain(column)
    if (testCase.avoid) expect(testCase.avoid).not.toContain(column)
  })
})

describe('victoria más corta', () => {
  it('puntúa la victoria en 3 y no la de 5 jugadas', () => {
    const testCase = tacticalCases.find(({ id }) => id === 'shortest-win-3-vs-5')
    const result = chooseMove(drawn(...testCase.rows), testCase.toMove, SEARCH)

    expect(result.column).toBe(5)
    expect(result.score).toBe(WIN - 3)
  })
})
