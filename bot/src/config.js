import { execSync } from 'node:child_process'

export const CONFIG_ERROR_EXIT = 78

export class ConfigError extends Error {}

const MODES = ['api', 'arbiter', 'both']

function int(env, name, fallback) {
  const raw = env[name]
  if (raw === undefined || raw === '') return fallback
  const value = Number(raw)
  if (!Number.isInteger(value) || value < 0) throw new ConfigError(`${name} debe ser un entero positivo (recibido: ${raw})`)
  return value
}

function currentCommit() {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return 'desconocido'
  }
}

export function readConfig(env = process.env) {
  const mode = env.MODE || 'api'
  if (!MODES.includes(mode)) throw new ConfigError(`MODE debe ser ${MODES.join(', ')} (recibido: ${mode})`)
  const playsArbiter = mode !== 'api'
  if (playsArbiter && !env.ARBITRO_URL) throw new ConfigError('Falta ARBITRO_URL para jugar contra el árbitro')
  if (playsArbiter && !env.TEAM_TOKEN) throw new ConfigError('Falta TEAM_TOKEN para jugar contra el árbitro')
  return {
    mode,
    playsArbiter,
    servesApi: mode !== 'arbiter',
    arbiterUrl: (env.ARBITRO_URL || '').replace(/\/+$/, ''),
    token: env.TEAM_TOKEN || '',
    searchTimeMs: int(env, 'SEARCH_TIME_MS', 1700),
    safetyMs: int(env, 'SAFETY_MS', 1300),
    servedAtGuard: env.SERVED_AT_GUARD !== '0',
    host: env.HOST || '0.0.0.0',
    port: int(env, 'PORT', 3001),
    logDir: env.LOG_DIR || 'logs',
    commit: env.COMMIT || currentCommit(),
  }
}
