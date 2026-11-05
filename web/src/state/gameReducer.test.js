import { describe, it, expect } from 'vitest'
import { gameReducer, initialState, requestIdOf } from './gameReducer.js'

const start = (humanFirst = true) => gameReducer(initialState, { type: 'START', humanFirst })
const fillColumn = (state, col) => {
  let s = state
  for (let i = 0; i < 7; i++) {
    s = s.status === 'humanTurn'
      ? gameReducer(s, { type: 'HUMAN_MOVE', column: col })
      : gameReducer(s, { type: 'BOT_MOVE', requestId: requestIdOf(s), column: col, depth: 1, elapsedMs: 1 })
  }
  return s
}

describe('gameReducer', () => {
  it('START con la persona primero la deja como jugador 1 y le da el turno', () => {
    expect(start(true)).toMatchObject({ status: 'humanTurn', human: 1, bot: 2, gameId: 1, moves: [] })
  })

  it('START con el bot primero lo deja como jugador 1 y pasa a botThinking', () => {
    expect(start(false)).toMatchObject({ status: 'botThinking', human: 2, bot: 1 })
  })

  it('HUMAN_MOVE aplica la jugada y le pasa el turno al bot', () => {
    const s = gameReducer(start(), { type: 'HUMAN_MOVE', column: 3 })
    expect(s.status).toBe('botThinking')
    expect(s.grid[0][3]).toBe(1)
    expect(s.moves).toEqual([{ column: 3, by: 1 }])
  })

  it('BOT_MOVE aplica la columna del bot y guarda el análisis', () => {
    const s1 = gameReducer(start(), { type: 'HUMAN_MOVE', column: 3 })
    const s2 = gameReducer(s1, { type: 'BOT_MOVE', requestId: requestIdOf(s1), column: 3, depth: 9, elapsedMs: 800 })
    expect(s2).toMatchObject({ status: 'humanTurn', analysis: { depth: 9, elapsedMs: 800 } })
    expect(s2.grid[1][3]).toBe(2)
  })

  it('ignora un BOT_MOVE con requestId viejo o fuera de botThinking', () => {
    const s1 = gameReducer(start(), { type: 'HUMAN_MOVE', column: 3 })
    expect(gameReducer(s1, { type: 'BOT_MOVE', requestId: '0:0', column: 2 })).toBe(s1)
    const human = start()
    expect(gameReducer(human, { type: 'BOT_MOVE', requestId: requestIdOf(human), column: 2 })).toBe(human)
  })

  it('ignora HUMAN_MOVE fuera del turno de la persona', () => {
    const s = start(false)
    expect(gameReducer(s, { type: 'HUMAN_MOVE', column: 0 })).toBe(s)
  })

  it('una columna llena deja el estado en humanTurn con un aviso que se borra con la siguiente jugada', () => {
    const filled = fillColumn(start(), 0)
    const full = gameReducer(filled, { type: 'BOT_MOVE', requestId: requestIdOf(filled), column: 5, depth: 1, elapsedMs: 1 })
    expect(full.status).toBe('humanTurn')
    const warned = gameReducer(full, { type: 'ILLEGAL_MOVE', column: 0 })
    expect(warned).toMatchObject({ status: 'humanTurn', notice: 'La columna 1 está llena, elige otra' })
    expect(warned.grid).toBe(full.grid)
    expect(gameReducer(full, { type: 'HUMAN_MOVE', column: 0 }).notice).toMatch(/llena/)
    expect(gameReducer(warned, { type: 'HUMAN_MOVE', column: 1 }).notice).toBeNull()
  })

  it('termina con victoria y celdas ganadoras', () => {
    let s = start()
    for (const col of [0, 1, 2]) {
      s = gameReducer(s, { type: 'HUMAN_MOVE', column: col })
      s = gameReducer(s, { type: 'BOT_MOVE', requestId: requestIdOf(s), column: col, depth: 1, elapsedMs: 1 })
    }
    s = gameReducer(s, { type: 'HUMAN_MOVE', column: 3 })
    expect(s.status).toBe('finished')
    expect(s.result).toMatchObject({ state: 'won', winner: 1, winningCells: [[0, 0], [0, 1], [0, 2], [0, 3]] })
  })

  it('BOT_ERROR pasa a error y RETRY vuelve a botThinking sin perder la partida', () => {
    const s1 = gameReducer(start(), { type: 'HUMAN_MOVE', column: 3 })
    const failed = gameReducer(s1, { type: 'BOT_ERROR', requestId: requestIdOf(s1), message: 'caído' })
    expect(failed).toMatchObject({ status: 'error', error: 'caído' })
    const retry = gameReducer(failed, { type: 'RETRY' })
    expect(retry).toMatchObject({ status: 'botThinking', error: null, grid: s1.grid })
    expect(gameReducer(start(), { type: 'RETRY' }).status).toBe('humanTurn')
  })

  it('una columna inválida del bot pasa a error en vez de romper', () => {
    const s = start(false)
    expect(gameReducer(s, { type: 'BOT_MOVE', requestId: requestIdOf(s), column: 9 })).toMatchObject({ status: 'error' })
  })

  it('RESET vuelve a setup, conserva la dificultad e invalida respuestas pendientes', () => {
    const s = gameReducer(gameReducer(start(), { type: 'SET_DIFFICULTY', difficulty: 'easy' }), { type: 'RESET' })
    expect(s).toMatchObject({ status: 'setup', difficulty: 'easy', gameId: 2 })
    expect(gameReducer(s, { type: 'SET_DIFFICULTY', difficulty: 'imposible' })).toBe(s)
  })
})
