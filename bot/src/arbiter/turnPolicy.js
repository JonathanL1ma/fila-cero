import { CENTER_ORDER, fromGrid } from '@fila-cero/game'

function givesWinAbove(board, col, player) {
  board.play(col, player)
  const gives = board.isWinningMove(col, 3 - player)
  board.undo(col)
  return gives
}

export function fallbackMove(grid, player, legal, lastIteration) {
  if (lastIteration?.depth >= 2 && legal.includes(lastIteration.column)) return lastIteration.column
  const board = fromGrid(grid)
  const ordered = CENTER_ORDER.filter((col) => legal.includes(col) && board.canPlay(col))
  if (!ordered.length) return legal[0]
  const win = ordered.find((col) => board.isWinningMove(col, player))
  if (win !== undefined) return win
  const block = ordered.find((col) => board.isWinningMove(col, 3 - player))
  if (block !== undefined) return block
  return ordered.find((col) => !givesWinAbove(board, col, player)) ?? ordered[0]
}

// Cuando el turno llega tarde, lo que se deja libre después de buscar para enviar la jugada
// y que el árbitro la reciba antes del plazo.
const LATE_MARGIN_MS = 700

// Milisegundos desde served_at (reloj del árbitro) hasta `wallNow` (reloj local), tal cual, o
// null si served_at no se puede leer. Se registra en cada turno para diagnosticar el desfase
// entre los relojes.
export function rawServedLagMs(turn, wallNow) {
  const servedAt = Date.parse(turn.served_at)
  return Number.isFinite(servedAt) ? wallNow - servedAt : null
}

// El atraso que se usa para acotar el presupuesto, solo si es creíble. Uno negativo, o igual o
// mayor que el plazo (esa partida ya estaría perdida), no es un turno tardío sino relojes
// desfasados, y se ignora.
export function servedLagMs(turn, wallNow) {
  const lag = rawServedLagMs(turn, wallNow)
  return lag !== null && lag >= 0 && lag < Number(turn.deadline_ms) ? lag : null
}

export function createTurnPolicy({
  search,
  restart = () => {},
  searchTimeMs = 1700,
  safetyMs = 1300,
  watchdogMs = 500,
  now = () => performance.now(),
  wallNow = () => Date.now(),
  useServedAt = true,
  onError = () => {},
}) {
  return async function decide(turn, receivedAt) {
    // El reloj del árbitro corre desde served_at. Si el turno llegó tarde (el bot se reinició
    // a mitad de un turno, o la red tardó en entregarlo), el presupuesto medido desde la
    // recepción no alcanza: se acota también por lo que queda del plazo real. Solo puede
    // acortar la búsqueda, nunca alargarla.
    const deadlineMs = Number(turn.deadline_ms)
    const wall = wallNow()
    const lag = useServedAt ? servedLagMs(turn, wall) : null
    const fromReceipt = Math.min(searchTimeMs, deadlineMs - safetyMs) - (now() - receivedAt)
    const fromServed = lag === null ? Infinity : deadlineMs - lag - LATE_MARGIN_MS
    const budget = Math.max(50, Math.min(fromReceipt, fromServed))
    const late = { servedLagMs: lag, servedLagRawMs: rawServedLagMs(turn, wall), shortened: budget < Math.max(50, fromReceipt) }
    let last = null
    let timer
    const watchdog = new Promise((resolve) => {
      timer = setTimeout(() => resolve('watchdog'), budget + watchdogMs)
    })
    const searching = Promise.resolve()
      .then(() => search({ grid: turn.board, player: turn.you, timeMs: budget, onIteration: (it) => (last = it) }))
      .catch((err) => {
        onError(err)
        return 'error'
      })
    const result = await Promise.race([searching, watchdog])
    clearTimeout(timer)

    if (typeof result === 'object' && turn.legal_moves.includes(result.column)) return { ...result, budget, ...late, fallback: false }
    if (result === 'watchdog' || result === 'error') restart()
    return {
      column: fallbackMove(turn.board, turn.you, turn.legal_moves, last),
      depth: last?.depth ?? 0,
      budget,
      ...late,
      fallback: result === 'watchdog' ? 'watchdog' : 'invalid',
    }
  }
}
