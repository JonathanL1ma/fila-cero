import { startArbiterMock } from '../mock/arbiterMock.js'
import { createArbiterClient } from '../src/arbiter/client.js'
import { runArbiterLoop } from '../src/arbiter/loop.js'
import { createTurnPolicy } from '../src/arbiter/turnPolicy.js'
import { createEngine } from '../src/worker/enginePool.js'

const GAMES = 20
const searchTimeMs = Number(process.env.SEARCH_TIME_MS ?? 200)

async function run(chaos) {
  const mock = await startArbiterMock({ chaos: chaos ? { latencyMs: 150, failRate: 0.05, dropMoveResponse: 3 } : {} })
  const engine = createEngine()
  await engine.warmup()
  const turns = []
  const log = { turn: (t) => turns.push(t), warn: () => {}, error: () => {}, info: () => {} }
  const controller = new AbortController()
  const client = createArbiterClient({ baseUrl: mock.url, token: mock.token })
  const decide = createTurnPolicy({ search: engine.search, restart: engine.restart, searchTimeMs })
  const loop = runArbiterLoop({ client, decide, log, waitS: 1, signal: controller.signal })

  for (let i = 0; i < GAMES; i++) mock.createGame({ opponent: 'casa-basico', first: (i % 2) + 1 })
  const started = Date.now()
  while ([...mock.games.values()].some((g) => g.status !== 'finished')) {
    if (Date.now() - started > 10 * 60_000) throw new Error('La integración no terminó en 10 minutos')
    await new Promise((r) => setTimeout(r, 200))
  }
  controller.abort()
  await loop
  await engine.close()
  await mock.close()

  const games = [...mock.games.values()]
  const results = games.map((g) => g.result)
  const count = (reason) => results.filter((r) => r.reason === reason).length
  const e2e = turns.map((t) => t.e2e_ms).sort((a, b) => a - b)
  const summary = {
    caos: chaos ? 'sí' : 'no',
    victorias: games.filter((g) => g.result.winner === g.you).length,
    empates: count('draw'),
    ilegales: count('illegal_move'),
    timeouts: count('timeout'),
    ausencias: count('absent'),
    respaldos: turns.filter((t) => t.fallback).length,
    e2eMax: e2e.at(-1),
    e2eP99: e2e[Math.floor(e2e.length * 0.99)],
  }
  return summary
}

let failed = false
for (const chaos of [false, true]) {
  const s = await run(chaos)
  console.log(
    `caos ${s.caos}: ${GAMES} partidas, ${s.victorias} victorias, ${s.empates} empates · ` +
      `ilegales ${s.ilegales}, timeouts ${s.timeouts}, ausencias ${s.ausencias}, respaldos ${s.respaldos} · ` +
      `punta a punta máx ${s.e2eMax} ms, p99 ${s.e2eP99} ms`,
  )
  if (s.ilegales || s.timeouts || s.ausencias) failed = true
}
process.exit(failed ? 1 : 0)
