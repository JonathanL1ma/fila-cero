import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { startArbiterMock } from '../../mock/arbiterMock.js'
import { createArbiterClient } from '../../src/arbiter/client.js'
import { checkConsistency } from '../../src/arbiter/loop.js'
import { contract, matchesSchema, nextTurnSchemaMatches } from './support.js'

let mock
let client

beforeEach(async () => {
  mock = await startArbiterMock()
  client = createArbiterClient({ baseUrl: mock.url, token: mock.token })
})

afterEach(() => mock.close())

describe('cliente del árbitro contra el mock', () => {
  it('interpreta idle cuando no hay turno', async () => {
    const res = await client.next(0)
    expect(res).toEqual({ status: 200, body: { status: 'idle' } })
    expect(nextTurnSchemaMatches(res.body)).toBe(true)
  })

  it('recibe un turno coherente y que cumple el contrato', async () => {
    const created = await client.practice('casa-basico', 1)
    expect(created.status).toBe(201)
    const { body: turn } = await client.next(0)
    expect(turn).toMatchObject({ status: 'turn', game_id: created.body.game_id, you: 1, turn: 1, last_move: null })
    expect(nextTurnSchemaMatches(turn)).toBe(true)
    expect(checkConsistency(turn)).toEqual([])
  })

  it('envía la jugada con el cuerpo correcto y recibe playing', async () => {
    const { body: game } = await client.practice('casa-aleatorio', 1)
    await client.next(0)
    const res = await client.move(game.game_id, 3, 2000)
    expect(res).toMatchObject({ status: 200, body: { ok: true, state: 'playing', turn: 2 } })
    expect(matchesSchema('MoveAccepted', res.body)).toBe(true)
    const record = await (await fetch(`${mock.url}/api/games/${game.game_id}`)).json()
    expect(record.moves[0]).toMatchObject({ turn: 1, by: 1, column: 3 })
    expect(matchesSchema('Game', record)).toBe(true)
  })

  it('acepta un plazo con decimales, como el que sale de performance.now()', async () => {
    const { body: game } = await client.practice('casa-basico', 1)
    await client.next(0)
    expect((await client.move(game.game_id, 3, 1234.567)).status).toBe(200)
  })

  it('reenviar la misma jugada responde 409 sin penalizar', async () => {
    const { body: game } = await client.practice('casa-basico', 1)
    await client.next(0)
    await client.move(game.game_id, 3, 2000)
    const again = await client.move(game.game_id, 3, 2000)
    expect(again).toMatchObject({ status: 409, body: { ok: false, error: 'not_your_turn' } })
    expect(matchesSchema('Error', again.body)).toBe(true)
    expect(mock.games.get(game.game_id).status).toBe('playing')
  })

  it('una partida que no existe responde 409 unknown_game', async () => {
    expect(await client.move('g_x', 0, 2000)).toMatchObject({ status: 409, body: { error: 'unknown_game' } })
  })

  it('un cuerpo inválido responde 400 validation y la partida sigue', async () => {
    const { body: game } = await client.practice('casa-basico', 1)
    await client.next(0)
    const res = await client.move(game.game_id, 'tres', 2000)
    expect(res).toMatchObject({ status: 400, body: { error: 'validation' } })
    expect(mock.games.get(game.game_id).status).toBe('playing')
  })

  it('una columna llena hace perder la partida por illegal_move', async () => {
    const game = mock.createGame({ opponent: 'casa-aleatorio', first: 1 })
    game.grid = game.grid.map((row) => row.map((v, col) => (col === 0 ? 1 : v)))
    await client.next(0)
    const res = await client.move(game.id, 0, 2000)
    expect(res).toMatchObject({ status: 400, body: { error: 'illegal_move' } })
    expect(game.result).toMatchObject({ reason: 'illegal_move', forfeited_by: 1 })
  })

  it('un token inválido responde 401', async () => {
    const bad = createArbiterClient({ baseUrl: mock.url, token: 'otro' })
    expect(await bad.next(0)).toMatchObject({ status: 401, body: { error: 'unauthorized' } })
  })

  it('/api/me y la entrega cumplen el contrato', async () => {
    const sub = await client.submission('https://github.com/JonathanL1ma/fila-cero', 'e0b0e30')
    expect(sub.status).toBe(200)
    const me = await client.me()
    expect(me.body.submission).toMatchObject({ commit: 'e0b0e30' })
    expect(matchesSchema('Me', me.body)).toBe(true)
    expect((await client.submission('https://gitlab.com/x', 'zzz')).status).toBe(400)
  })

  it('el ejemplo de turno del contrato es inconsistente y se detecta', () => {
    const example = contract.paths['/api/next'].get.responses['200'].content['application/json'].examples.turn.value
    expect(checkConsistency(example)).toEqual(['moves no reproduce board'])
  })
})
