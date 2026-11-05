import { describe, it, expect, vi } from 'vitest'
import { askBot } from './botClient.js'

const reply = (status, body) => vi.fn(async () => ({ ok: status < 400, status, json: async () => body }))

describe('askBot', () => {
  it('envía el tablero, el jugador y los límites a /api/play', async () => {
    const fetch = reply(200, { column: 4, depth: 6 })
    const result = await askBot({ board: [[0]], player: 2, maxDepth: 2 }, { fetch })
    expect(result).toEqual({ column: 4, depth: 6 })
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe('/api/play')
    expect(JSON.parse(init.body)).toEqual({ board: [[0]], player: 2, maxDepth: 2 })
  })

  it('convierte un error del bot en un mensaje legible', async () => {
    await expect(askBot({}, { fetch: reply(400, { message: 'No es el turno del jugador 2' }) })).rejects.toThrow('No es el turno')
    await expect(askBot({}, { fetch: reply(502, null) })).rejects.toThrow('El bot respondió 502')
  })

  it('corta la espera al pasar el tiempo máximo', async () => {
    const fetch = (url, { signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason)))
    await expect(askBot({}, { fetch, timeoutMs: 20 })).rejects.toMatchObject({ name: 'TimeoutError' })
  })

  it('se cancela con el AbortController del componente', async () => {
    const controller = new AbortController()
    const fetch = (url, { signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason)))
    const pending = askBot({}, { fetch, signal: controller.signal })
    controller.abort()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  })
})
