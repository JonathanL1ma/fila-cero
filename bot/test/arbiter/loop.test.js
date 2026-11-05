import { describe, it, expect, afterEach } from 'vitest'
import { startArbiterMock } from '../../mock/arbiterMock.js'
import { createArbiterClient } from '../../src/arbiter/client.js'
import { runArbiterLoop } from '../../src/arbiter/loop.js'
import { createTurnPolicy } from '../../src/arbiter/turnPolicy.js'
import { chooseMove } from '../../src/engine/index.js'
import { memoryLog, until } from './support.js'

const LOSSES = ['illegal_move', 'timeout', 'absent']
let mock
let controller
let running

async function startBot({ token, nextGraceMs, sleep } = {}) {
  const log = memoryLog()
  const client = createArbiterClient({ baseUrl: mock.url, token: token ?? mock.token, nextGraceMs })
  const decide = createTurnPolicy({ search: async ({ grid, player, onIteration }) => chooseMove(grid, player, { timeMs: 20, onIteration }) })
  controller = new AbortController()
  running = runArbiterLoop({ client, decide, log, waitS: 1, signal: controller.signal, sleep })
  return log
}

const finished = () => [...mock.games.values()].every((g) => g.status === 'finished')

afterEach(async () => {
  controller?.abort()
  await running
  await mock?.close()
})

describe('ciclo del bot contra el mock', () => {
  it('juega partidas completas abriendo cada lado, sin perder por tiempo ni jugadas ilegales', async () => {
    mock = await startArbiterMock()
    const log = await startBot()
    mock.createGame({ opponent: 'casa-basico', first: 1 })
    mock.createGame({ opponent: 'casa-basico', first: 2 })
    mock.createGame({ opponent: 'casa-aleatorio', first: 1 })
    await until(finished)
    for (const game of mock.games.values()) expect(LOSSES).not.toContain(game.result.reason)
    expect(log.errors).toEqual([])
    expect(log.turns.every((t) => t.result.severity === 'ok')).toBe(true)
  })

  it('si se pierde la respuesta del POST, reintenta y la partida sigue sin penalización', async () => {
    mock = await startArbiterMock({ chaos: { dropMoveResponse: 1 } })
    const log = await startBot()
    const game = mock.createGame({ opponent: 'casa-aleatorio', first: 1 })
    await until(finished)
    expect(LOSSES).not.toContain(game.result.reason)
    expect(log.turns[0]).toMatchObject({ attempts: 2, result: { error: 'not_your_turn' } })
  })

  it('corta una conexión de long polling colgada y se recupera', async () => {
    mock = await startArbiterMock({ chaos: { hangNextMs: 400 } })
    const log = await startBot({ nextGraceMs: 100, sleep: () => new Promise((r) => setTimeout(r, 10)) })
    await until(() => log.warnings.some((w) => w.includes('/api/next')))
    mock.chaos.hangNextMs = 0
    const game = mock.createGame({ opponent: 'casa-aleatorio', first: 1 })
    await until(finished)
    expect(LOSSES).not.toContain(game.result.reason)
  })

  it('con errores 5xx en /api/next espera y sigue', async () => {
    mock = await startArbiterMock({ chaos: { failRate: 1 } })
    const log = await startBot({ sleep: () => new Promise((r) => setTimeout(r, 10)) })
    await until(() => log.warnings.some((w) => w.includes('500')))
    mock.chaos.failRate = 0
    mock.createGame({ opponent: 'casa-basico', first: 2 })
    await until(finished)
    expect(log.errors).toEqual([])
  })

  it('con un token inválido registra el error y no se detiene', async () => {
    mock = await startArbiterMock()
    const log = await startBot({ token: 'otro', sleep: () => new Promise((r) => setTimeout(r, 10)) })
    await until(() => log.errors.length >= 2)
    expect(log.errors[0]).toMatch(/401/)
  })
})
