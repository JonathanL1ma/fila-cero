import { Board, fromGrid, toGrid } from '@fila-cero/game'

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export function checkConsistency(turn) {
  const warnings = []
  const board = new Board()
  try {
    turn.moves.forEach((col, i) => board.play(col, (i % 2) + 1))
    if (JSON.stringify(toGrid(board)) !== JSON.stringify(turn.board)) warnings.push('moves no reproduce board')
  } catch {
    warnings.push('moves contiene una jugada imposible')
  }
  if (turn.turn !== turn.moves.length + 1) warnings.push('turn no coincide con moves')
  if (JSON.stringify(fromGrid(turn.board).legalMoves()) !== JSON.stringify(turn.legal_moves)) {
    warnings.push('legal_moves no coincide con board')
  }
  return warnings
}

export async function runArbiterLoop({
  client,
  decide,
  log,
  waitS = 20,
  signal,
  now = () => performance.now(),
  sleep = defaultSleep,
}) {
  let backoff = 1000
  let cache = { key: null, column: null, conflicted: false }

  async function playTurn(turn, receivedAt) {
    const key = `${turn.game_id}:${turn.turn}`
    let decision
    if (cache.key === key) {
      if (cache.conflicted) {
        log.warn(`El turno ${key} reapareció después de un 409; se reenvía tras 200 ms`)
        await sleep(200)
      }
      decision = { column: cache.column, cached: true }
    } else {
      for (const warning of checkConsistency(turn)) log.warn(`Turno ${key}: ${warning}`)
      decision = await decide(turn, receivedAt)
      cache = { key, column: decision.column, conflicted: false }
    }

    const deadlineAt = receivedAt + turn.deadline_ms
    let response = null
    let attempts = 0
    for (;;) {
      attempts++
      try {
        response = await client.move(turn.game_id, decision.column, Math.max(300, deadlineAt - now()))
        break
      } catch (err) {
        log.warn(`POST /api/move falló (${err.name}: ${err.message})`)
        if (deadlineAt - now() <= 200) break
        await sleep(50)
      }
    }

    const outcome = describe(response)
    if (response?.status === 409) cache.conflicted = true
    log.turn({
      game_id: turn.game_id,
      kind: turn.kind,
      opponent: turn.opponent,
      turn: turn.turn,
      you: turn.you,
      column: decision.column,
      depth: decision.depth,
      score: decision.score,
      scores: decision.scores,
      search_ms: decision.elapsedMs === undefined ? undefined : Math.round(decision.elapsedMs),
      e2e_ms: Math.round(now() - receivedAt),
      fallback: decision.fallback || undefined,
      cached: decision.cached || undefined,
      attempts,
      result: outcome,
    })
    if (outcome.severity === 'error') log.error(outcome.message)
  }

  while (!signal?.aborted) {
    const started = now()
    let res
    try {
      res = await client.next(waitS)
    } catch (err) {
      log.warn(`GET /api/next falló (${err.name}: ${err.message}); reintento en ${backoff} ms`)
      await sleep(backoff)
      backoff = Math.min(backoff * 2, 5000)
      continue
    }
    if (res.status === 401) {
      log.error('El árbitro responde 401: token inválido. Reintento en 5 s')
      await sleep(5000)
      continue
    }
    if (res.status !== 200) {
      log.warn(`GET /api/next respondió ${res.status}; reintento en ${backoff} ms`)
      await sleep(backoff)
      backoff = Math.min(backoff * 2, 5000)
      continue
    }
    backoff = 1000
    if (res.body.status === 'turn') {
      await playTurn(res.body, now())
      continue
    }
    const took = now() - started
    if (took < 500) await sleep(500 - took)
  }
}

function describe(response) {
  if (!response) return { severity: 'error', message: 'No se pudo enviar la jugada antes del plazo' }
  const { status, body } = response
  if (status === 200) return { severity: 'ok', state: body.state }
  if (status === 409) return { severity: 'info', error: body.error }
  if (status === 400 && body.error === 'validation') {
    return { severity: 'error', error: body.error, message: `Bug: el árbitro rechazó el cuerpo del POST (${body.message})` }
  }
  if (status === 400) return { severity: 'error', error: body.error, message: `Partida perdida: ${body.error} (${body.message})` }
  return { severity: 'error', error: body?.error, message: `POST /api/move respondió ${status}` }
}
