import { describe, it, expect, vi } from 'vitest'
import { Board, legalMoves, toGrid } from '@fila-cero/game'
import { KNOWN_LOSSES, avoidedColumns } from '../../src/arbiter/knownLosses.js'
import { createTurnPolicy } from '../../src/arbiter/turnPolicy.js'
import { chooseMove } from '../../src/engine/index.js'
import { drawn, emptyGrid } from '../helpers.js'

function turnAfter(moves, opponent = 'Sleipnir') {
  const board = new Board()
  ;[...moves].forEach((col, i) => board.play(Number(col), (i % 2) + 1))
  const grid = toGrid(board)
  return { opponent, moves: [...moves].map(Number), board: grid, you: (moves.length % 2) + 1, legal_moves: legalMoves(grid), deadline_ms: 3000 }
}

describe('libro de derrotas contra Sleipnir', () => {
  it('las posiciones guardadas son posibles y el turno es nuestro', () => {
    for (const loss of KNOWN_LOSSES) {
      const turn = turnAfter(loss.moves)
      for (const col of loss.avoid) expect(turn.legal_moves).toContain(col)
    }
  })

  it('prohíbe las columnas con las que ya perdimos, solo contra Sleipnir y en esa posición exacta', () => {
    expect(avoidedColumns(turnAfter('33335443433'))).toEqual([4, 1])
    expect(avoidedColumns(turnAfter('334552333324244122', ' sleipnir '))).toEqual([2])
    expect(avoidedColumns(turnAfter('33335443433', 'Equipo 3'))).toEqual([])
    expect(avoidedColumns(turnAfter('3333544343'))).toEqual([])
    expect(avoidedColumns(turnAfter('33333345122224225344', 'Odd Times'))).toEqual([4])
    expect(avoidedColumns(turnAfter('3333344444106343416', 'Odd Times'))).toEqual([0])
    expect(avoidedColumns(turnAfter('3333344444106343416', 'Sleipnir'))).toEqual([])
  })

  it('el motor no juega una columna excluida en las posiciones reales', () => {
    for (const loss of KNOWN_LOSSES) {
      const turn = turnAfter(loss.moves)
      const { column } = chooseMove(turn.board, turn.you, { timeMs: 200, exclude: loss.avoid })
      expect(turn.legal_moves).toContain(column)
      expect(loss.avoid).not.toContain(column)
    }
  })

  it('una victoria o un bloqueo obligado se juegan aunque estén excluidos', () => {
    const win = drawn('........', '........', '........', '........', '........', '222.....', '111.....')
    expect(chooseMove(win, 1, { exclude: [3] }).column).toBe(3)
    const block = drawn('........', '........', '........', '........', '........', '1.......', '1222....')
    expect(chooseMove(block, 1, { exclude: [4] }).column).toBe(4)
  })

  it('si se excluyen todas las columnas, juega igual', () => {
    const { column } = chooseMove(emptyGrid(), 1, { timeMs: 50, exclude: [0, 1, 2, 3, 4, 5, 6, 7] })
    expect(legalMoves(emptyGrid())).toContain(column)
  })

  it('la política de turno le pasa las exclusiones al motor solo contra Sleipnir', async () => {
    const search = vi.fn(async () => ({ column: 2, depth: 9 }))
    const decide = createTurnPolicy({ search })
    const sleipnir = await decide(turnAfter('33335443433'), performance.now())
    expect(search.mock.calls[0][0].exclude).toEqual([4, 1])
    expect(sleipnir.avoided).toEqual([4, 1])
    await decide(turnAfter('33335443433', 'Equipo 4'), performance.now())
    expect(search.mock.calls[1][0].exclude).toEqual([])
  })
})

describe('libro de derrotas ante turnos incompletos', () => {
  it('sin moves u opponent no prohíbe nada y no lanza', () => {
    expect(avoidedColumns({ board: emptyGrid() })).toEqual([])
    expect(avoidedColumns({ moves: [3, 3] })).toEqual([])
  })
})
