import { describe, it, expect } from 'vitest'
import { applyMove, fromGrid, legalMoves, outcome, playerToMove, toGrid, validateGrid } from '../src/index.js'
import { drawn, empty } from './helpers.js'

const FULL_DRAW = drawn(
  '21212121',
  '12121212',
  '12121212',
  '21212121',
  '21212121',
  '12121212',
  '12121212',
)

const LAST_MOVE_WINS = drawn(
  '.1212121',
  '22121212',
  '22121212',
  '21212121',
  '11212121',
  '12121212',
  '11121212',
)

describe('victoria', () => {
  it('horizontal en el borde izquierdo de la fila de abajo', () => {
    const grid = drawn('........', '........', '........', '........', '........', '222.....', '1111....')
    expect(outcome(grid)).toEqual({ state: 'won', winner: 1, winningCells: [[0, 0], [0, 1], [0, 2], [0, 3]] })
  })

  it('horizontal en el borde derecho de la fila de arriba', () => {
    const grid = FULL_DRAW.map((row) => row.slice())
    for (const col of [4, 5, 6, 7]) grid[6][col] = 2
    expect(fromGrid(grid).winningCellsAt(6, 7)).toEqual([[6, 4], [6, 5], [6, 6], [6, 7]])
  })

  it('vertical en la última columna hasta la fila de arriba', () => {
    const grid = drawn('.......2', '.......2', '.......2', '.......2', '......11', '......11', '.....111')
    expect(outcome(grid)).toEqual({ state: 'won', winner: 2, winningCells: [[3, 7], [4, 7], [5, 7], [6, 7]] })
  })

  it('diagonal ascendente desde la esquina inferior izquierda', () => {
    const grid = drawn('........', '........', '........', '...1....', '..12....', '.122....', '1222.111')
    expect(outcome(grid)).toEqual({ state: 'won', winner: 1, winningCells: [[0, 0], [1, 1], [2, 2], [3, 3]] })
  })

  it('diagonal descendente hasta la esquina inferior derecha', () => {
    const grid = drawn('........', '........', '........', '....2...', '....12..', '....112.', '1...1112')
    expect(outcome(grid)).toEqual({ state: 'won', winner: 2, winningCells: [[0, 7], [1, 6], [2, 5], [3, 4]] })
  })

  it('tres en línea no es victoria', () => {
    const grid = drawn('........', '........', '........', '........', '........', '22......', '111.....')
    expect(outcome(grid)).toEqual({ state: 'playing' })
  })

  it('cinco en línea devuelve las cinco celdas', () => {
    const grid = drawn('........', '........', '........', '........', '........', '2222....', '11111...')
    expect(outcome(grid).winningCells).toEqual([[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]])
  })

  it('una jugada que gana en dos direcciones marca las dos líneas', () => {
    const before = drawn('........', '........', '........', '........', '..11...2', '.121...2', '1221...2')
    expect(outcome(before)).toEqual({ state: 'playing' })
    const after = applyMove(before, 3)
    expect(fromGrid(after).winningCellsAt(3, 3)).toEqual([
      [0, 0], [0, 3], [1, 1], [1, 3], [2, 2], [2, 3], [3, 3],
    ])
  })
})

describe('empate', () => {
  it('56 fichas sin cuatro en línea es empate', () => {
    expect(outcome(FULL_DRAW)).toEqual({ state: 'draw' })
  })

  it('si la jugada 56 hace cuatro en línea cuenta como victoria, no como empate', () => {
    expect(playerToMove(LAST_MOVE_WINS)).toBe(2)
    expect(outcome(LAST_MOVE_WINS)).toEqual({ state: 'playing' })
    const result = outcome(applyMove(LAST_MOVE_WINS, 0))
    expect(result).toEqual({ state: 'won', winner: 2, winningCells: [[3, 0], [4, 0], [5, 0], [6, 0]] })
  })
})

describe('funciones sobre la grilla', () => {
  it('fromGrid y toGrid convierten sin pérdida', () => {
    expect(toGrid(fromGrid(FULL_DRAW))).toEqual(FULL_DRAW)
    expect(toGrid(fromGrid(LAST_MOVE_WINS))).toEqual(LAST_MOVE_WINS)
  })

  it('applyMove no modifica el tablero recibido y alterna jugadores', () => {
    const start = empty()
    const one = applyMove(start, 3)
    const two = applyMove(one, 3)
    expect(start).toEqual(empty())
    expect(one[0][3]).toBe(1)
    expect(two[1][3]).toBe(2)
  })

  it('applyMove rechaza una columna llena', () => {
    const grid = drawn('1.......', '2.......', '1.......', '2.......', '1.......', '2.......', '1.......')
    expect(() => applyMove(grid, 0)).toThrow(RangeError)
    expect(legalMoves(grid)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })
})

describe('validateGrid', () => {
  it('acepta un tablero válido', () => {
    expect(validateGrid(empty())).toBeNull()
    expect(validateGrid(LAST_MOVE_WINS)).toBeNull()
  })

  it('rechaza dimensiones incorrectas', () => {
    expect(validateGrid(null)).toMatch(/7 filas/)
    expect(validateGrid(empty().slice(1))).toMatch(/7 filas/)
    expect(validateGrid(empty().map((row) => row.slice(1)))).toMatch(/8 columnas/)
  })

  it('rechaza valores fuera de 0, 1 y 2', () => {
    const grid = empty()
    grid[0][0] = 3
    expect(validateGrid(grid)).toMatch(/0, 1 o 2/)
  })

  it('rechaza fichas flotando', () => {
    expect(validateGrid(drawn('........', '........', '........', '........', '........', '...1....', '..2.....'))).toMatch(
      /flotando en la columna 3/,
    )
  })

  it('rechaza cantidades de fichas incoherentes', () => {
    expect(validateGrid(drawn('........', '........', '........', '........', '........', '........', '22......'))).toMatch(
      /coherente/,
    )
    expect(playerToMove(drawn('........', '........', '........', '........', '........', '........', '111.....'))).toBeNull()
  })
})
