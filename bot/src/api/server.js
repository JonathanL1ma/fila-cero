import { existsSync } from 'node:fs'
import Fastify from 'fastify'
import fastifyStatic from '@fastify/static'
import { COLUMNS, ROWS, CELLS, outcome, playerToMove, validateGrid } from '@fila-cero/game'

const MAX_TIME_MS = 1700
const MIN_TIME_MS = 50
const GAME_ID = /^[A-Za-z0-9_-]{1,64}$/

const playSchema = {
  body: {
    type: 'object',
    required: ['board', 'player'],
    properties: {
      board: { type: 'array', minItems: ROWS, maxItems: ROWS, items: { type: 'array', minItems: COLUMNS, maxItems: COLUMNS } },
      player: { type: 'integer', enum: [1, 2] },
      timeMs: { type: 'number' },
      maxDepth: { type: 'integer' },
    },
  },
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export function buildServer({ engine, staticDir, arbiterUrl, version = '1.0.0', commit = 'desconocido', fetch = globalThis.fetch }) {
  const app = Fastify()

  app.setErrorHandler((err, request, reply) => {
    const status = err.statusCode ?? 500
    reply.code(status).send({ ok: false, error: status === 400 ? 'validation' : 'internal', message: err.message })
  })

  app.get('/api/health', async () => ({ ok: true, version, commit }))

  app.post('/api/play', { schema: playSchema }, async (request, reply) => {
    const { board, player, timeMs = MAX_TIME_MS, maxDepth = CELLS } = request.body
    const invalid = validateGrid(board)
    if (invalid) return reply.code(400).send({ ok: false, error: 'validation', message: invalid })
    if (playerToMove(board) !== player) {
      return reply.code(400).send({ ok: false, error: 'validation', message: `No es el turno del jugador ${player}` })
    }
    if (outcome(board).state !== 'playing') {
      return reply.code(400).send({ ok: false, error: 'validation', message: 'La partida ya terminó' })
    }
    const result = await engine.search({
      grid: board,
      player,
      timeMs: clamp(timeMs, MIN_TIME_MS, MAX_TIME_MS),
      maxDepth: clamp(maxDepth, 1, CELLS),
    })
    const { column, depth, score, scores, elapsedMs } = result
    return { column, depth, score, scores, elapsedMs: Math.round(elapsedMs) }
  })

  app.get('/api/replay/:gameId', async (request, reply) => {
    const { gameId } = request.params
    if (!GAME_ID.test(gameId)) return reply.code(400).send({ ok: false, error: 'validation', message: 'Id de partida inválido' })
    if (!arbiterUrl) return reply.code(503).send({ ok: false, error: 'internal', message: 'ARBITRO_URL no está configurada' })
    const res = await fetch(`${arbiterUrl}/api/games/${gameId}`, { signal: AbortSignal.timeout(10_000) })
    return reply.code(res.status).send(await res.json())
  })

  if (staticDir && existsSync(staticDir)) app.register(fastifyStatic, { root: staticDir })

  return app
}
