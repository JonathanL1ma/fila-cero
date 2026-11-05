import { appendFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const time = () => new Date().toISOString().slice(11, 23)

export function createLogger({ dir, out = console } = {}) {
  const file = dir ? join(dir, 'turns.jsonl') : null
  if (file) mkdirSync(dir, { recursive: true })

  return {
    info: (message) => out.log(`${time()} ${message}`),
    warn: (message) => out.warn(`${time()} ⚠ ${message}`),
    error: (message) => out.error(`${time()} ✖ ${message}`),
    turn(entry) {
      const line = { at: new Date().toISOString(), ...entry }
      if (file) appendFileSync(file, `${JSON.stringify(line)}\n`)
      const extra = entry.fallback ? ` respaldo=${entry.fallback}` : entry.cached ? ' (reenvío)' : ''
      out.log(
        `${time()} ${entry.kind} ${entry.game_id} vs ${entry.opponent} · turno ${entry.turn} → col ${entry.column}` +
          ` · prof ${entry.depth ?? '-'} · score ${entry.score ?? '-'} · ${entry.e2e_ms} ms${extra}` +
          ` · ${entry.result.state ?? entry.result.error ?? entry.result.message}`,
      )
    },
  }
}
