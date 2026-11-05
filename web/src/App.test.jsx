import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { StrictMode } from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'

let botColumn

beforeEach(() => {
  botColumn = 7
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ column: botColumn, depth: 5, score: 0, elapsedMs: 12 }) })),
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const renderApp = () => render(<StrictMode><App /></StrictMode>)
const column = (n) => screen.getByRole('button', { name: new RegExp(`^Columna ${n},`) })
const cellsOf = (n) => [...column(n).querySelectorAll('span')]

async function startGame(user, who = 'Yo') {
  await user.click(screen.getByLabelText(who))
  await user.click(screen.getByRole('button', { name: 'Jugar' }))
}

describe('App', () => {
  it('muestra el turno, aplica la jugada y la ficha cae abajo a la izquierda', async () => {
    const user = userEvent.setup()
    renderApp()
    await startGame(user)
    expect(screen.getByText('Tu turno: toca una columna')).toBeTruthy()
    await user.click(column(1))
    expect(cellsOf(1).at(-1).dataset.player).toBe('1')
    expect(cellsOf(1)[0].dataset.player).toBe('0')
    await waitFor(() => expect(cellsOf(8).at(-1).dataset.player).toBe('2'))
    expect(screen.getByText(/analizó 5 jugadas/)).toBeTruthy()
  })

  it('con StrictMode hace una sola llamada al bot por turno', async () => {
    const user = userEvent.setup()
    renderApp()
    await startGame(user, 'El bot')
    await waitFor(() => expect(screen.getByText('Tu turno: toca una columna')).toBeTruthy())
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({ player: 1, maxDepth: 6 })
  })

  it('una columna llena se ve deshabilitada, recibe el clic y muestra el aviso', async () => {
    const user = userEvent.setup()
    botColumn = 0
    renderApp()
    await startGame(user)
    for (let i = 0; i < 3; i++) {
      await user.click(column(1))
      await waitFor(() => expect(screen.getByText('Tu turno: toca una columna')).toBeTruthy())
    }
    botColumn = 7
    await user.click(column(1))
    await waitFor(() => expect(screen.getByText('Tu turno: toca una columna')).toBeTruthy())
    expect(column(1).getAttribute('aria-label')).toBe('Columna 1, llena')
    expect(column(1).getAttribute('aria-disabled')).toBe('true')
    await user.click(column(1))
    expect(screen.getByRole('alert').textContent).toMatch(/columna 1 está llena/)
    await user.click(column(2))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('resalta las cuatro fichas ganadoras y anuncia el resultado', async () => {
    const user = userEvent.setup()
    renderApp()
    await startGame(user)
    for (const col of [1, 2, 3]) {
      await user.click(column(col))
      await waitFor(() => expect(screen.getByText('Tu turno: toca una columna')).toBeTruthy())
    }
    await user.click(column(4))
    expect(screen.getByText('¡Ganaste!')).toBeTruthy()
    const winners = [1, 2, 3, 4].map((n) => cellsOf(n).at(-1).className)
    expect(winners.every((name) => /win/.test(name))).toBe(true)
    expect(screen.getByRole('button', { name: 'Jugar otra vez' })).toBeTruthy()
  })

  it('si el bot no responde muestra el error y Reintentar recupera la partida', async () => {
    const user = userEvent.setup()
    fetch.mockImplementationOnce(async () => {
      throw new TypeError('Failed to fetch')
    })
    renderApp()
    await startGame(user, 'El bot')
    await waitFor(() => expect(screen.getByText('No se pudo contactar al bot')).toBeTruthy())
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(screen.getByText('Tu turno: toca una columna')).toBeTruthy())
    expect(cellsOf(8).at(-1).dataset.player).toBe('1')
  })
})
