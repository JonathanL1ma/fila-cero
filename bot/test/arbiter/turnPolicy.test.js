import { describe, it, expect, vi } from 'vitest'
import { legalMoves } from '@fila-cero/game'
import { createTurnPolicy, fallbackMove } from '../../src/arbiter/turnPolicy.js'
import { drawn, emptyGrid } from '../helpers.js'

const turnFor = (grid, you, deadline = 3000) => ({ board: grid, you, legal_moves: legalMoves(grid), deadline_ms: deadline })

describe('fallbackMove', () => {
  it('usa la última iteración completa si llegó a profundidad 2 o más', () => {
    expect(fallbackMove(emptyGrid(), 1, legalMoves(emptyGrid()), { column: 6, depth: 2 })).toBe(6)
  })

  it('ignora una iteración de profundidad 1', () => {
    expect(fallbackMove(emptyGrid(), 1, legalMoves(emptyGrid()), { column: 6, depth: 1 })).toBe(3)
  })

  it('gana si puede y si no bloquea', () => {
    const win = drawn('........', '........', '........', '........', '........', '222.....', '111.....')
    expect(fallbackMove(win, 1, legalMoves(win), null)).toBe(3)
    const block = drawn('........', '........', '........', '........', '........', '1.......', '1222....')
    expect(fallbackMove(block, 1, legalMoves(block), null)).toBe(4)
  })

  it('no juega debajo de una amenaza del rival', () => {
    const grid = drawn('........', '........', '........', '........', '........', '.111....', '.212...2')
    const column = fallbackMove(grid, 2, legalMoves(grid), null)
    expect([0, 4]).not.toContain(column)
  })

  it('si todas las columnas regalan la victoria, juega la primera legal desde el centro', () => {
    const grid = drawn('........', '........', '........', '........', '........', '.111....', '.212...2')
    expect(fallbackMove(grid, 2, [0, 4], null)).toBe(4)
  })

  it('si el tablero no coincide con legal_moves, confía en legal_moves', () => {
    expect(fallbackMove(emptyGrid(), 1, [], null)).toBeUndefined()
    const full = drawn('1.......', '2.......', '1.......', '2.......', '1.......', '2.......', '1.......')
    expect(fallbackMove(full, 2, [0], null)).toBe(0)
  })
})

describe('createTurnPolicy', () => {
  it('devuelve la jugada del motor cuando llega a tiempo', async () => {
    const search = vi.fn(async () => ({ column: 5, depth: 7 }))
    const decide = createTurnPolicy({ search })
    const decision = await decide(turnFor(emptyGrid(), 1), performance.now())
    expect(decision).toMatchObject({ column: 5, depth: 7, fallback: false, budget: expect.any(Number) })
    expect(search.mock.calls[0][0]).toMatchObject({ player: 1 })
    expect(search.mock.calls[0][0].timeMs).toBeLessThanOrEqual(1700)
  })

  it('el presupuesto sale de deadline_ms menos el margen y descuenta lo ya transcurrido', async () => {
    const search = vi.fn(async () => ({ column: 3 }))
    const decide = createTurnPolicy({ search, searchTimeMs: 1700, safetyMs: 1300 })
    await decide(turnFor(emptyGrid(), 1, 2000), performance.now() - 200)
    expect(search.mock.calls[0][0].timeMs).toBeGreaterThan(450)
    expect(search.mock.calls[0][0].timeMs).toBeLessThanOrEqual(500)
  })

  it('si el motor se cuelga, el watchdog envía el respaldo a tiempo y reinicia el worker', async () => {
    const restart = vi.fn()
    const search = ({ onIteration }) => {
      onIteration({ column: 2, depth: 3 })
      return new Promise(() => {})
    }
    const decide = createTurnPolicy({ search, restart, searchTimeMs: 100, watchdogMs: 100 })
    const start = performance.now()
    const decision = await decide(turnFor(emptyGrid(), 1), start)
    expect(performance.now() - start).toBeLessThan(100 + 100 + 50)
    expect(decision).toMatchObject({ column: 2, fallback: 'watchdog' })
    expect(restart).toHaveBeenCalledOnce()
  })

  it('si el motor lanza una excepción, reinicia y usa el respaldo', async () => {
    const restart = vi.fn()
    const onError = vi.fn()
    const decide = createTurnPolicy({ search: () => Promise.reject(new Error('boom')), restart, onError })
    const decision = await decide(turnFor(emptyGrid(), 1), performance.now())
    expect(decision).toMatchObject({ column: 3, fallback: 'invalid' })
    expect(restart).toHaveBeenCalledOnce()
    expect(onError).toHaveBeenCalledOnce()
  })

  it('si el motor devuelve una columna que no es legal, usa el respaldo sin reiniciar', async () => {
    const restart = vi.fn()
    const decide = createTurnPolicy({ search: async () => ({ column: 9 }), restart })
    const decision = await decide(turnFor(emptyGrid(), 1), performance.now())
    expect(decision).toMatchObject({ column: 3, fallback: 'invalid' })
    expect(restart).not.toHaveBeenCalled()
  })
})
