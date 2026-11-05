import Fastify from 'fastify'
import { pathToFileURL } from 'node:url'
import { ROWS, COLUMNS, applyMove, fromGrid, legalMoves, outcome } from '@fila-cero/game'
import { HOUSE_NAMES, houseMove } from './houseBots.js'

const TEAM = { id: 'eq2', name: 'Fila Cero' }
const SUBMISSION_URL = /^https?:\/\/(github\.com|bitbucket\.org)\/.+/
const SUBMISSION_COMMIT = /^[0-9a-fA-F]{7,40}$/

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms).unref?.())
const emptyGrid = () => Array.from({ length: ROWS }, () => new Array(COLUMNS).fill(0))
const error = (reply, code, err, message) => reply.code(code).send({ ok: false, error: err, message })

export async function startArbiterMock({
  port = 0,
  host = '127.0.0.1',
  token = 'token-de-prueba',
  deadlineMs = 3000,
  absentMs = 30000,
  houseDelayMs = 0,
  chaos = {},
  random = Math.random,
} = {}) {
  const games = new Map()
  const waiters = new Set()
  let submission = null
  let nextId = 1

  const notify = () => [...waiters].forEach((wake) => wake())
  const waitForChange = (ms) =>
    new Promise((resolve) => {
      const wake = () => {
        clearTimeout(timer)
        waiters.delete(wake)
        resolve()
      }
      const timer = setTimeout(wake, ms)
      waiters.add(wake)
    })

  const isTeamTurn = (game) => game.status === 'playing' && game.current === game.you

  function finish(game, result) {
    game.status = 'finished'
    game.current = null
    game.result = result
    game.finishedAt = new Date().toISOString()
    clearTimeout(game.timer)
    notify()
  }

  function forfeit(game, reason, extra = {}) {
    finish(game, { winner: 3 - game.you, reason, forfeited_by: game.you, ...extra })
  }

  function play(game, column, by, ms) {
    game.grid = applyMove(game.grid, column)
    game.moves.push({ turn: game.moves.length + 1, by, column, ...(ms === undefined ? {} : { ms }) })
    const result = outcome(game.grid)
    if (result.state === 'won') return finish(game, { winner: by, reason: 'connect4', winning_cells: result.winningCells })
    if (result.state === 'draw') return finish(game, { winner: null, reason: 'draw' })
    game.current = 3 - by
    if (game.current === game.you) turnBecamePending(game)
    else scheduleHouse(game)
  }

  function turnBecamePending(game) {
    game.servedAt = null
    clearTimeout(game.timer)
    game.timer = setTimeout(() => isTeamTurn(game) && !game.servedAt && forfeit(game, 'absent', { waited_ms: absentMs }), absentMs)
    game.timer.unref?.()
    game.pendingSince = Date.now()
    notify()
  }

  function scheduleHouse(game) {
    setTimeout(() => {
      if (game.status !== 'playing') return
      play(game, houseMove(game.opponent, game.grid, 3 - game.you, random), 3 - game.you)
    }, houseDelayMs).unref?.()
  }

  function createGame({ opponent = 'casa-basico', first = 1, kind = 'practice' } = {}) {
    const game = {
      id: `g_mock_${nextId++}`,
      kind,
      opponent,
      you: first,
      grid: emptyGrid(),
      moves: [],
      current: 1,
      status: 'playing',
      result: null,
      startedAt: new Date().toISOString(),
      finishedAt: null,
    }
    games.set(game.id, game)
    if (game.you === 1) turnBecamePending(game)
    else scheduleHouse(game)
    return game
  }

  function serve(game) {
    if (!game.servedAt) {
      game.servedAt = Date.now()
      clearTimeout(game.timer)
      game.timer = setTimeout(() => isTeamTurn(game) && forfeit(game, 'timeout', { ms: deadlineMs }), deadlineMs + 1000)
      game.timer.unref?.()
    }
    const last = game.moves.at(-1)
    return {
      status: 'turn',
      game_id: game.id,
      match_id: null,
      kind: game.kind,
      you: game.you,
      opponent: HOUSE_NAMES[game.opponent],
      turn: game.moves.length + 1,
      board: game.grid,
      moves: game.moves.map((m) => m.column),
      last_move: last ? { by: last.by, column: last.column } : null,
      legal_moves: legalMoves(game.grid),
      deadline_ms: deadlineMs,
      served_at: new Date(game.servedAt).toISOString(),
    }
  }

  const oldestPending = () =>
    [...games.values()].filter(isTeamTurn).sort((a, b) => a.pendingSince - b.pendingSince)[0]

  const publicGame = (game) => ({
    game_id: game.id,
    match_id: null,
    kind: game.kind,
    series: null,
    status: game.status,
    players: {
      [game.you]: { team_id: TEAM.id, name: TEAM.name },
      [3 - game.you]: { team_id: game.opponent, name: HOUSE_NAMES[game.opponent], house: true },
    },
    moves: game.moves,
    current: game.current,
    result: game.result,
    started_at: game.startedAt,
    finished_at: game.finishedAt,
    board: game.grid,
  })

  const app = Fastify({ forceCloseConnections: true })

  app.addHook('onRequest', async (request, reply) => {
    if (chaos.latencyMs) await sleep(random() * chaos.latencyMs)
    const isPublic = request.url.startsWith('/api/games') || request.url === '/api/health'
    if (!isPublic && request.headers.authorization !== `Bearer ${token}`) {
      return error(reply, 401, 'unauthorized', 'Token inválido.')
    }
  })

  app.get('/api/health', async () => ({ ok: true, phase: 'practice', time: new Date().toISOString() }))

  app.get('/api/next', async (request, reply) => {
    if (chaos.failRate && random() < chaos.failRate) return error(reply, 500, 'internal', 'Falla simulada.')
    if (chaos.hangNextMs) await sleep(chaos.hangNextMs)
    const wait = Math.min(25, Math.max(0, Number(request.query.wait ?? 20)))
    const until = Date.now() + wait * 1000
    for (;;) {
      const game = oldestPending()
      if (game) return serve(game)
      const left = until - Date.now()
      if (left <= 0) return { status: 'idle' }
      await waitForChange(left)
    }
  })

  app.post('/api/move', async (request, reply) => {
    const { game_id: gameId, column } = request.body ?? {}
    if (typeof gameId !== 'string' || !Number.isInteger(column)) {
      return error(reply, 400, 'validation', 'Se esperaba { game_id, column }.')
    }
    const game = games.get(gameId)
    if (!game) return error(reply, 409, 'unknown_game', `La partida ${gameId} no existe.`)
    if (!isTeamTurn(game) || !game.servedAt) {
      return error(reply, 409, 'not_your_turn', `La partida ${gameId} no tiene un turno pendiente para tu equipo.`)
    }
    const ms = Date.now() - game.servedAt
    if (ms > deadlineMs) {
      forfeit(game, 'timeout', { ms })
      return error(reply, 400, 'timeout', `La jugada llegó ${ms - deadlineMs} ms después del límite.`)
    }
    if (!fromGrid(game.grid).canPlay(column)) {
      forfeit(game, 'illegal_move', { ms, column })
      return error(reply, 400, 'illegal_move', `La columna ${column} no es válida.`)
    }
    play(game, column, game.you, ms)
    if (chaos.dropMoveResponse) {
      chaos.dropMoveResponse--
      reply.hijack()
      request.raw.socket.destroy()
      return reply
    }
    const state = game.status === 'playing' ? 'playing' : game.result.winner === null ? 'draw' : 'won'
    return {
      ok: true,
      state,
      turn: game.moves.length + (game.status === 'playing' ? 1 : 0),
      ...(state === 'won' ? { winning_cells: game.result.winning_cells } : {}),
    }
  })

  app.post('/api/practice', async (request, reply) => {
    const { opponent = 'casa-basico', first = 1 } = request.body ?? {}
    if (!HOUSE_NAMES[opponent] || ![1, 2].includes(first)) {
      return error(reply, 400, 'validation', `Rival o first inválidos: ${opponent}, ${first}.`)
    }
    const game = createGame({ opponent, first })
    return reply.code(201).send({ game_id: game.id, you: game.you })
  })

  app.get('/api/me', async () => ({
    team: { ...TEAM, members: [] },
    standing: null,
    pending_turns: [...games.values()].filter(isTeamTurn).map((g) => g.id),
    submission,
    phase: 'practice',
  }))

  app.put('/api/me/submission', async (request, reply) => {
    const { repo_url: repoUrl, commit } = request.body ?? {}
    if (!SUBMISSION_URL.test(repoUrl ?? '') || !SUBMISSION_COMMIT.test(commit ?? '')) {
      return error(reply, 400, 'validation', 'repo_url o commit inválidos.')
    }
    submission = { repo_url: repoUrl, commit, registered_at: new Date().toISOString() }
    return submission
  })

  app.get('/api/games/:id', async (request, reply) => {
    const game = games.get(request.params.id)
    return game ? publicGame(game) : error(reply, 404, 'unknown_game', 'No existe.')
  })

  const address = await app.listen({ port, host })
  return {
    url: address,
    token,
    chaos,
    games,
    createGame,
    async close() {
      notify()
      for (const game of games.values()) clearTimeout(game.timer)
      await app.close()
    },
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const mock = await startArbiterMock({
    port: Number(process.env.MOCK_PORT ?? 4000),
    token: process.env.TEAM_TOKEN || 'token-de-prueba',
    chaos: process.env.MOCK_CHAOS === '1' ? { latencyMs: 300, failRate: 0.05 } : {},
  })
  console.log(`Árbitro simulado en ${mock.url} (token: ${mock.token === 'token-de-prueba' ? mock.token : 'el de TEAM_TOKEN'})`)
}
