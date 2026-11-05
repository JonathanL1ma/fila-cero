import { describe, it, expect } from 'vitest'
import { fromGrid, playerToMove } from '@fila-cero/game'
import { chooseMove, resetTranspositionTable, WIN } from '../../src/engine/index.js'
import { createSearch } from '../../src/engine/search.js'
import { createTT, hashCells, EXACT } from '../../src/engine/tt.js'
import { drawn, randomPosition, seededRandom } from '../helpers.js'

const noClock = { check() {} }

function rootScore(grid, depth, tt) {
  const board = fromGrid(grid)
  const order = [3, 4, 2, 5, 1, 6, 0, 7].filter((c) => board.canPlay(c))
  return createSearch(board, noClock, tt).searchRoot(playerToMove(grid), depth, order).score
}

describe('tabla de transposición', () => {
  it('a profundidad fija, el puntaje de la raíz es idéntico con y sin tabla', () => {
    const random = seededRandom(7)
    for (let i = 0; i < 25; i++) {
      const grid = randomPosition(random, 4 + Math.floor(random() * 20))
      for (const depth of [4, 6]) {
        expect(rootScore(grid, depth, createTT(16))).toBe(rootScore(grid, depth, null))
      }
    }
  })

  it('con tabla encuentra la misma doble amenaza, puntuada como victoria en 3', () => {
    resetTranspositionTable()
    const grid = drawn('........', '........', '........', '........', '........', '.......2', '.11....2')
    const result = chooseMove(grid, 1, { timeMs: 2000, maxDepth: 6, tt: true })
    expect(result).toMatchObject({ column: 3, score: WIN - 3 })
  })

  it('con tabla llega más profundo en el mismo tiempo', () => {
    const grid = randomPosition(seededRandom(3), 6)
    const player = playerToMove(grid)
    resetTranspositionTable()
    const withTT = chooseMove(grid, player, { timeMs: 150, tt: true })
    const without = chooseMove(grid, player, { timeMs: 150, tt: false })
    expect(withTT.depth).toBeGreaterThanOrEqual(without.depth)
  })

  it('guarda y recupera entradas; una posición distinta no colisiona por la segunda clave', () => {
    const tt = createTT(4)
    tt.store(5, 99, 3, EXACT, 42, 6)
    const i = tt.probe(5, 99)
    expect([tt.depth(i), tt.flag(i), tt.score(i), tt.move(i)]).toEqual([3, EXACT, 42, 6])
    expect(tt.probe(5, 100)).toBe(-1)
    tt.clear()
    expect(tt.probe(5, 99)).toBe(-1)
  })

  it('el hash depende de qué jugador ocupa cada casilla', () => {
    const a = drawn('........', '........', '........', '........', '........', '........', '12......')
    const b = drawn('........', '........', '........', '........', '........', '........', '21......')
    expect(hashCells(fromGrid(a).cells)).not.toEqual(hashCells(fromGrid(b).cells))
  })
})
