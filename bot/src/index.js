import { fileURLToPath } from 'node:url'
import { CONFIG_ERROR_EXIT, ConfigError, readConfig } from './config.js'
import { createLogger } from './log.js'
import { createEngine } from './worker/enginePool.js'
import { createArbiterClient } from './arbiter/client.js'
import { createTurnPolicy } from './arbiter/turnPolicy.js'
import { runArbiterLoop } from './arbiter/loop.js'
import { buildServer } from './api/server.js'

const WEB_DIST = fileURLToPath(new URL('../../web/dist', import.meta.url))

function fail(message) {
  console.error(`✖ ${message}`)
  process.exit(CONFIG_ERROR_EXIT)
}

let config
try {
  config = readConfig()
} catch (err) {
  if (err instanceof ConfigError) fail(err.message)
  throw err
}

const log = createLogger({ dir: config.playsArbiter ? config.logDir : null })
log.info(`Fila Cero · commit ${config.commit} · MODE=${config.mode}`)

if (config.playsArbiter) {
  const client = createArbiterClient({ baseUrl: config.arbiterUrl, token: config.token })
  try {
    const me = await client.me()
    if (me.status === 401) fail('El árbitro rechazó TEAM_TOKEN (401). Revisa el token en .env')
    log.info(`Conectado al árbitro como ${me.body.team?.name} · fase ${me.body.phase ?? '?'}`)
  } catch (err) {
    log.warn(`No se pudo consultar /api/me (${err.message}); el ciclo seguirá reintentando`)
  }
  const engine = createEngine({ onRestart: (why) => log.warn(`Worker del torneo reiniciado (${why})`) })
  await engine.warmup()
  const decide = createTurnPolicy({
    search: engine.search,
    restart: engine.restart,
    searchTimeMs: config.searchTimeMs,
    safetyMs: config.safetyMs,
    onError: (err) => log.error(`Error del motor: ${err.message}`),
  })
  log.info('Worker del torneo listo; esperando turnos')
  runArbiterLoop({ client, decide, log })
}

if (config.servesApi) {
  const engine = createEngine({ onRestart: (why) => log.warn(`Worker de la app reiniciado (${why})`) })
  await engine.warmup()
  const app = buildServer({ engine, staticDir: WEB_DIST, arbiterUrl: config.arbiterUrl, commit: config.commit })
  await app.listen({ host: config.host, port: config.port })
  log.info(`App y API en http://localhost:${config.port} (en la red local, http://<ip-de-esta-laptop>:${config.port})`)
}
