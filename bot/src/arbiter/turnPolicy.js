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

export function createTurnPolicy({
  search,
  restart = () => {},
  searchTimeMs = 1700,
  safetyMs = 1300,
  watchdogMs = 500,
  now = () => performance.now(),
  onError = () => {},
}) {
  return async function decide(turn, receivedAt) {
    const budget = Math.max(50, Math.min(searchTimeMs, turn.deadline_ms - safetyMs) - (now() - receivedAt))
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

    if (typeof result === 'object' && turn.legal_moves.includes(result.column)) return { ...result, budget, fallback: false }
    if (result === 'watchdog' || result === 'error') restart()
    return {
      column: fallbackMove(turn.board, turn.you, turn.legal_moves, last),
      depth: last?.depth ?? 0,
      budget,
      fallback: result === 'watchdog' ? 'watchdog' : 'invalid',
    }
  }
}
