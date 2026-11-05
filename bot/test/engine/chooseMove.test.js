import { describe, it, expect } from 'vitest'
import { legalMoves, playerToMove } from '@fila-cero/game'
import { chooseMove, WIN, isWinScore } from '../../src/engine/index.js'
import { drawn, emptyGrid, randomPosition, seededRandom } from '../helpers.js'

describe('chooseMove: atajos tácticos', () => {
  it('gana en 1 cuando puede, aunque también tenga que bloquear', () => {
    const grid = drawn('........', '........', '........', '........', '2.......', '2..1....', '2111...2')
    expect(chooseMove(grid, 1).column).toBe(4)
  })

  it('bloquea en 1 la victoria inmediata del rival', () => {
    const grid = drawn('........', '........', '........', '........', '........', '1.......', '1222.1..')
    expect(chooseMove(grid, 1).column).toBe(4)
  })

  it('con una sola columna disponible devuelve esa columna', () => {
    const grid = drawn(
      '2121212.',
      '1212121.',
      '1212121.',
      '2121212.',
      '2121212.',
      '1212121.',
      '12121212',
    )
    expect(legalMoves(grid)).toEqual([7])
    expect(chooseMove(grid, playerToMove(grid)).column).toBe(7)
  })
})

describe('chooseMove: búsqueda', () => {
  it('encuentra la doble amenaza y la puntúa como victoria en 3 jugadas', () => {
    const grid = drawn('........', '........', '........', '........', '........', '.......2', '.11....2')
    const result = chooseMove(grid, 1, { timeMs: 2000, maxDepth: 6 })
    expect(result.column).toBe(3)
    expect(result.score).toBe(WIN - 3)
    expect(isWinScore(result.score)).toBe(true)
  })

  it('evita la jugada que le regala al rival una victoria encima', () => {
    const grid = drawn('........', '........', '........', '........', '........', '.111....', '.212...2')
    const result = chooseMove(grid, 2, { timeMs: 500, maxDepth: 4 })
    expect([0, 4]).not.toContain(result.column)
    expect(result.scores[0]).toBeLessThan(-WIN / 2)
    expect(result.scores[4]).toBeLessThan(-WIN / 2)
  })

  it('reporta cada iteración completa con profundidad creciente', () => {
    const depths = []
    const result = chooseMove(emptyGrid(), 1, { maxDepth: 4, onIteration: ({ depth }) => depths.push(depth) })
    expect(depths).toEqual([1, 2, 3, 4])
    expect(result.depth).toBe(4)
    expect(result.scores.filter((s) => s !== null)).toHaveLength(8)
  })

  it('respeta el presupuesto de tiempo', () => {
    const result = chooseMove(emptyGrid(), 1, { timeMs: 100 })
    expect(result.elapsedMs).toBeLessThan(100 + 50)
    expect(result.depth).toBeGreaterThan(0)
  })

  it('en el tablero a una ficha de llenarse juega la última casilla', () => {
    const grid = drawn(
      '2121212.',
      '12121212',
      '12121212',
      '21212121',
      '21212121',
      '12121212',
      '12121212',
    )
    expect(chooseMove(grid, playerToMove(grid)).column).toBe(7)
  })

  it('nunca devuelve una jugada ilegal en 300 posiciones al azar', () => {
    const random = seededRandom(42)
    for (let i = 0; i < 300; i++) {
      const grid = randomPosition(random, Math.floor(random() * 50))
      const { column } = chooseMove(grid, playerToMove(grid), { timeMs: 5, maxDepth: 3 })
      expect(legalMoves(grid)).toContain(column)
    }
  })
})
