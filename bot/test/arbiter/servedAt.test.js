import { describe, it, expect, vi } from 'vitest'
import { legalMoves } from '@fila-cero/game'
import { createTurnPolicy, rawServedLagMs, servedLagMs } from '../../src/arbiter/turnPolicy.js'
import { emptyGrid } from '../helpers.js'

const WALL_NOW = Date.parse('2026-11-05T15:00:00.000Z')
const servedAgo = (ms) => new Date(WALL_NOW - ms).toISOString()
const turnServed = (servedAt) => ({ board: emptyGrid(), you: 1, legal_moves: legalMoves(emptyGrid()), deadline_ms: 3000, served_at: servedAt })

async function budgetFor(turn, options = {}) {
  const search = vi.fn(async () => ({ column: 3 }))
  const decide = createTurnPolicy({ search, searchTimeMs: 1700, safetyMs: 1300, wallNow: () => WALL_NOW, ...options })
  const decision = await decide(turn, performance.now())
  return { timeMs: search.mock.calls[0][0].timeMs, decision }
}

describe('presupuesto según served_at', () => {
  it('un turno entregado en el momento usa el presupuesto normal', async () => {
    const { timeMs, decision } = await budgetFor(turnServed(servedAgo(40)))
    expect(timeMs).toBeGreaterThan(1690)
    expect(timeMs).toBeLessThanOrEqual(1700)
    expect(decision).toMatchObject({ shortened: false, servedLagMs: 40 })
  })

  it('si la red tardó en entregar el turno, busca solo con lo que queda del plazo', async () => {
    const { timeMs, decision } = await budgetFor(turnServed(servedAgo(1200)))
    expect(timeMs).toBe(3000 - 1200 - 700)
    expect(decision.shortened).toBe(true)
  })

  it('si el turno llega casi vencido (el bot se reinició a mitad del turno), juega con el mínimo', async () => {
    const { timeMs, decision } = await budgetFor(turnServed(servedAgo(2300)))
    expect(timeMs).toBe(50)
    expect(decision).toMatchObject({ shortened: true, servedLagMs: 2300 })
  })

  it('con el reloj local atrasado (served_at en el futuro) se comporta como sin served_at', async () => {
    const { timeMs, decision } = await budgetFor(turnServed(new Date(WALL_NOW + 5000).toISOString()))
    expect(timeMs).toBeGreaterThan(1690)
    expect(decision).toMatchObject({ shortened: false, servedLagMs: null })
  })

  it('con el reloj local adelantado más que el plazo (atraso imposible) ignora served_at', async () => {
    const { timeMs, decision } = await budgetFor(turnServed(servedAgo(60 * 60 * 1000)))
    expect(timeMs).toBeGreaterThan(1690)
    expect(decision).toMatchObject({ shortened: false, servedLagMs: null })
  })

  it('sin served_at, o con el ajuste apagado, usa el presupuesto normal', async () => {
    expect((await budgetFor(turnServed(undefined))).timeMs).toBeGreaterThan(1690)
    expect((await budgetFor(turnServed(servedAgo(2300)), { useServedAt: false })).timeMs).toBeGreaterThan(1690)
  })

  it('servedLagMs acepta atrasos menores que el plazo; el atraso crudo se informa siempre', () => {
    expect(servedLagMs(turnServed(servedAgo(2999)), WALL_NOW)).toBe(2999)
    expect(servedLagMs(turnServed(servedAgo(3000)), WALL_NOW)).toBeNull()
    expect(rawServedLagMs(turnServed(servedAgo(3000)), WALL_NOW)).toBe(3000)
    expect(rawServedLagMs(turnServed(new Date(WALL_NOW + 500).toISOString()), WALL_NOW)).toBe(-500)
    expect(rawServedLagMs(turnServed('no es una fecha'), WALL_NOW)).toBeNull()
  })

  it('la decisión trae el atraso crudo aunque no se use para acotar', async () => {
    const { decision } = await budgetFor(turnServed(new Date(WALL_NOW + 500).toISOString()))
    expect(decision).toMatchObject({ servedLagMs: null, servedLagRawMs: -500, shortened: false })
  })

  it('un deadline_ms que llega como texto se interpreta como número', async () => {
    const turn = { ...turnServed(servedAgo(60 * 60 * 1000)), deadline_ms: '3000' }
    const { timeMs, decision } = await budgetFor(turn)
    expect(timeMs).toBeGreaterThan(1690)
    expect(decision.shortened).toBe(false)
  })

  it('no marca la búsqueda como acortada si el presupuesto no cambió', async () => {
    const turn = { ...turnServed(servedAgo(900)), deadline_ms: 1000 }
    const { timeMs, decision } = await budgetFor(turn)
    expect(timeMs).toBe(50)
    expect(decision.shortened).toBe(false)
  })
})
