import { describe, it, expect } from 'vitest'
import { Board, COLUMNS, ROWS } from '../src/index.js'

describe('Board', () => {
  it('la ficha cae a la fila libre más baja de la columna', () => {
    const board = new Board()
    expect(board.play(3, 1)).toBe(0)
    expect(board.play(3, 2)).toBe(1)
    expect(board.play(4, 1)).toBe(0)
    expect(board.cells[0 * COLUMNS + 3]).toBe(1)
    expect(board.cells[1 * COLUMNS + 3]).toBe(2)
    expect(board.count).toBe(3)
  })

  it('una columna llena deja de ser legal y rechaza otra ficha', () => {
    const board = new Board()
    for (let i = 0; i < ROWS; i++) board.play(0, (i % 2) + 1)
    expect(board.canPlay(0)).toBe(false)
    expect(board.legalMoves()).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(() => board.play(0, 1)).toThrow(RangeError)
  })

  it('rechaza columnas fuera de rango o que no son enteras', () => {
    const board = new Board()
    for (const col of [-1, COLUMNS, 2.5, '3', null]) {
      expect(board.canPlay(col)).toBe(false)
      expect(() => board.play(col, 1)).toThrow(RangeError)
    }
  })

  it('undo deja el tablero exactamente como estaba', () => {
    const board = new Board()
    board.play(2, 1)
    const before = [Array.from(board.cells), Array.from(board.heights), board.count]
    board.play(2, 2)
    board.undo(2)
    expect([Array.from(board.cells), Array.from(board.heights), board.count]).toEqual(before)
  })

  it('isWinningMove detecta la victoria sin modificar el tablero', () => {
    const board = new Board()
    for (const col of [0, 1, 2]) board.play(col, 1)
    expect(board.isWinningMove(3, 1)).toBe(true)
    expect(board.isWinningMove(3, 2)).toBe(false)
    expect(board.isWinningMove(-1, 1)).toBe(false)
    expect(board.count).toBe(3)
    expect(board.heights[3]).toBe(0)
  })

  it('isFull solo es verdadero con las 56 casillas ocupadas', () => {
    const board = new Board()
    for (let col = 0; col < COLUMNS; col++) for (let row = 0; row < ROWS; row++) {
      expect(board.isFull()).toBe(false)
      board.play(col, 1)
    }
    expect(board.isFull()).toBe(true)
    expect(board.legalMoves()).toEqual([])
  })
})
