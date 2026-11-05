import { describe, it, expect } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const supervisor = fileURLToPath(new URL('../../scripts/supervise.js', import.meta.url))
const fixture = fileURLToPath(new URL('./crashThenConfigError.js', import.meta.url))
const recordMode = fileURLToPath(new URL('./recordMode.js', import.meta.url))

describe('supervisor', () => {
  it('relanza el bot si se cae y se detiene ante un error de configuración (código 78)', () => {
    const marker = join(mkdtempSync(join(tmpdir(), 'fila-cero-')), 'runs')
    const run = spawnSync(process.execPath, [supervisor], {
      env: { ...process.env, SUPERVISE_ENTRY: fixture, SUPERVISE_MARKER: marker, SUPERVISE_DELAY_MS: '10' },
      encoding: 'utf8',
      timeout: 10_000,
    })
    expect(readFileSync(marker, 'utf8')).toBe('2')
    expect(run.status).toBe(78)
    expect(run.stderr).toMatch(/se relanza/)
    expect(run.stderr).toMatch(/no relanza/)
  })

  it('arranca el bot en modo arbiter aunque el .env diga MODE=api', () => {
    const marker = join(mkdtempSync(join(tmpdir(), 'fila-cero-')), 'mode')
    spawnSync(process.execPath, [supervisor], {
      env: { ...process.env, MODE: 'api', SUPERVISE_ENTRY: recordMode, SUPERVISE_MARKER: marker },
      timeout: 10_000,
    })
    expect(readFileSync(marker, 'utf8')).toBe('arbiter')
  })
})
