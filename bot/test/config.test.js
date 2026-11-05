import { describe, it, expect } from 'vitest'
import { ConfigError, readConfig } from '../src/config.js'

describe('readConfig', () => {
  it('sin variables arranca en modo api con los valores por defecto', () => {
    expect(readConfig({ COMMIT: 'abc' })).toEqual({
      mode: 'api',
      playsArbiter: false,
      servesApi: true,
      arbiterUrl: '',
      token: '',
      searchTimeMs: 1700,
      safetyMs: 1300,
      host: '0.0.0.0',
      port: 3001,
      logDir: 'logs',
      commit: 'abc',
    })
  })

  it('el modo arbiter exige ARBITRO_URL y TEAM_TOKEN', () => {
    expect(() => readConfig({ MODE: 'arbiter' })).toThrow(ConfigError)
    expect(() => readConfig({ MODE: 'arbiter', ARBITRO_URL: 'https://a' })).toThrow(/TEAM_TOKEN/)
    const config = readConfig({ MODE: 'arbiter', ARBITRO_URL: 'https://a/', TEAM_TOKEN: 't' })
    expect(config).toMatchObject({ playsArbiter: true, servesApi: false, arbiterUrl: 'https://a' })
  })

  it('rechaza modos y números inválidos', () => {
    expect(() => readConfig({ MODE: 'liga' })).toThrow(/MODE/)
    expect(() => readConfig({ SEARCH_TIME_MS: 'mucho' })).toThrow(/SEARCH_TIME_MS/)
  })

  it('lee el commit de git si no viene en el entorno', () => {
    expect(readConfig({}).commit).toMatch(/^[0-9a-f]{7,}|desconocido$/)
  })
})
