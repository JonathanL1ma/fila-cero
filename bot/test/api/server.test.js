import { describe, it, expect, vi } from 'vitest'
import { buildServer } from '../../src/api/server.js'
import { drawn, emptyGrid } from '../helpers.js'

const fakeEngine = () => ({ search: vi.fn(async ({ timeMs, maxDepth }) => ({ column: 3, depth: 5, score: 12, scores: [], elapsedMs: 10.4, timeMs, maxDepth })) })

const post = (app, body) => app.inject({ method: 'POST', url: '/api/play', payload: body })

describe('API para la app', () => {
  it('/api/health responde con versión y commit', async () => {
    const app = buildServer({ engine: fakeEngine(), commit: 'abc1234' })
    expect((await app.inject('/api/health')).json()).toEqual({ ok: true, version: '1.0.0', commit: 'abc1234' })
  })

  it('/api/play devuelve la jugada del motor', async () => {
    const engine = fakeEngine()
    const res = await post(buildServer({ engine }), { board: emptyGrid(), player: 1 })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ column: 3, depth: 5, score: 12, scores: [], elapsedMs: 10 })
    expect(engine.search.mock.calls[0][0]).toMatchObject({ player: 1, timeMs: 1700, maxDepth: 56 })
  })

  it('acota timeMs entre 50 y 1700 y maxDepth entre 1 y 56', async () => {
    const engine = fakeEngine()
    const app = buildServer({ engine })
    await post(app, { board: emptyGrid(), player: 1, timeMs: 99999, maxDepth: 0 })
    await post(app, { board: emptyGrid(), player: 1, timeMs: 1, maxDepth: 500 })
    expect(engine.search.mock.calls.map(([r]) => [r.timeMs, r.maxDepth])).toEqual([[1700, 1], [50, 56]])
  })

  it('rechaza cuerpos con forma incorrecta', async () => {
    const app = buildServer({ engine: fakeEngine() })
    for (const body of [{}, { board: emptyGrid() }, { board: emptyGrid(), player: 3 }, { board: [[0]], player: 1 }]) {
      const res = await post(app, body)
      expect(res.statusCode).toBe(400)
      expect(res.json()).toMatchObject({ ok: false, error: 'validation' })
    }
  })

  it('rechaza tableros inválidos con un mensaje legible', async () => {
    const app = buildServer({ engine: fakeEngine() })
    const floating = drawn('........', '........', '........', '........', '........', '...1....', '..2.....')
    expect((await post(app, { board: floating, player: 1 })).json().message).toMatch(/flotando/)
  })

  it('rechaza si no es el turno de ese jugador o si la partida terminó', async () => {
    const app = buildServer({ engine: fakeEngine() })
    expect((await post(app, { board: emptyGrid(), player: 2 })).json().message).toMatch(/turno del jugador 2/)
    const won = drawn('........', '........', '........', '........', '........', '222.....', '1111....')
    expect((await post(app, { board: won, player: 2 })).json().message).toMatch(/terminó/)
  })

  it('si el motor falla responde 500', async () => {
    const engine = { search: async () => Promise.reject(new Error('Worker reiniciado')) }
    const res = await post(buildServer({ engine }), { board: emptyGrid(), player: 1 })
    expect(res.statusCode).toBe(500)
  })

  it('/api/replay reenvía al árbitro solo con ids válidos', async () => {
    const fetch = vi.fn(async () => ({ status: 200, json: async () => ({ game_id: 'g_1' }) }))
    const app = buildServer({ engine: fakeEngine(), arbiterUrl: 'https://arbitro.test', fetch })
    expect((await app.inject('/api/replay/g_1')).json()).toEqual({ game_id: 'g_1' })
    expect(fetch.mock.calls[0][0]).toBe('https://arbitro.test/api/games/g_1')
    expect((await app.inject('/api/replay/..%2Fapi%2Fme')).statusCode).toBe(400)
    expect(fetch).toHaveBeenCalledOnce()
  })

  it('/api/replay sin ARBITRO_URL responde 503', async () => {
    expect((await buildServer({ engine: fakeEngine() }).inject('/api/replay/g_1')).statusCode).toBe(503)
  })
})
