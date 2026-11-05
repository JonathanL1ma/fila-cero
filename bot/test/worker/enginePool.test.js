import { describe, it, expect, afterEach, vi } from 'vitest'
import { legalMoves } from '@fila-cero/game'
import { createEngine } from '../../src/worker/enginePool.js'
import { createTurnPolicy } from '../../src/arbiter/turnPolicy.js'
import { createArbiterClient } from '../../src/arbiter/client.js'
import { runArbiterLoop } from '../../src/arbiter/loop.js'
import { startArbiterMock } from '../../mock/arbiterMock.js'
import { emptyGrid } from '../helpers.js'
import { memoryLog, until } from '../arbiter/support.js'

const FAKE = new URL('./fakeWorker.js', import.meta.url)
let engine

afterEach(() => engine?.close())

describe('enginePool con el motor real', () => {
  it('busca en el worker, reporta iteraciones y devuelve una jugada legal', async () => {
    engine = createEngine()
    const iterations = []
    const result = await engine.search({ grid: emptyGrid(), player: 1, timeMs: 50, onIteration: (it) => iterations.push(it) })
    expect(legalMoves(emptyGrid())).toContain(result.column)
    expect(iterations.length).toBeGreaterThan(0)
    expect(iterations.at(-1).depth).toBe(result.depth)
  })

  it('el calentamiento corre una búsqueda completa', async () => {
    engine = createEngine()
    expect((await engine.warmup(50)).depth).toBeGreaterThan(0)
  })

  it('juega partidas completas contra el mock a través del worker', async () => {
    engine = createEngine()
    const mock = await startArbiterMock()
    const log = memoryLog()
    const controller = new AbortController()
    const decide = createTurnPolicy({ search: engine.search, restart: engine.restart, searchTimeMs: 30 })
    const client = createArbiterClient({ baseUrl: mock.url, token: mock.token })
    const loop = runArbiterLoop({ client, decide, log, waitS: 1, signal: controller.signal })
    mock.createGame({ opponent: 'casa-basico', first: 1 })
    mock.createGame({ opponent: 'casa-basico', first: 2 })
    await until(() => [...mock.games.values()].every((g) => g.status === 'finished'))
    controller.abort()
    await loop
    await mock.close()
    for (const game of mock.games.values()) expect(['connect4', 'draw']).toContain(game.result.reason)
    expect(log.errors).toEqual([])
    expect(log.turns.some((t) => t.fallback)).toBe(false)
  })
})

describe('enginePool ante fallas', () => {
  it('atiende las búsquedas en orden, una a la vez', async () => {
    engine = createEngine({ workerFile: FAKE })
    const results = await Promise.all([1, 2, 3].map((timeMs) => engine.search({ grid: [], player: 1, timeMs })))
    expect(results.map((r) => r.timeMs)).toEqual([1, 2, 3])
  })

  it('propaga un error del motor sin matar el worker', async () => {
    engine = createEngine({ workerFile: FAKE })
    await expect(engine.search({ timeMs: -3 })).rejects.toThrow('falla simulada')
    expect((await engine.search({ timeMs: 7 })).timeMs).toBe(7)
  })

  it('si el worker muere, rechaza la búsqueda y crea otro', async () => {
    const onRestart = vi.fn()
    engine = createEngine({ workerFile: FAKE, onRestart })
    await expect(engine.search({ timeMs: -2 })).rejects.toThrow(/código 1/)
    expect(onRestart).toHaveBeenCalledWith('exit')
    expect((await engine.search({ timeMs: 5 })).timeMs).toBe(5)
  })

  it('con un worker colgado, el watchdog responde a tiempo y el reinicio deja un worker sano', async () => {
    engine = createEngine({ workerFile: FAKE })
    const decide = createTurnPolicy({
      search: (req) => engine.search({ ...req, timeMs: -1 }),
      restart: engine.restart,
      searchTimeMs: 100,
      watchdogMs: 100,
    })
    const turn = { board: emptyGrid(), you: 1, legal_moves: legalMoves(emptyGrid()), deadline_ms: 3000 }
    const start = performance.now()
    const decision = await decide(turn, start)
    expect(performance.now() - start).toBeLessThan(300)
    expect(decision.fallback).toBe('watchdog')
    expect(legalMoves(emptyGrid())).toContain(decision.column)
    expect((await engine.search({ timeMs: 9 })).timeMs).toBe(9)
  })
})
