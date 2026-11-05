import { CELLS, CENTER_ORDER, fromGrid } from '@fila-cero/game'
import { createClock, TIMEOUT } from './clock.js'
import { createSearch, isWinScore } from './search.js'

export { WIN, isWinScore } from './search.js'

export function tacticalMove(board, player) {
  const legal = CENTER_ORDER.filter((col) => board.canPlay(col))
  const win = legal.find((col) => board.isWinningMove(col, player))
  if (win !== undefined) return { column: win, reason: 'win' }
  const block = legal.find((col) => board.isWinningMove(col, 3 - player))
  if (block !== undefined) return { column: block, reason: 'block' }
  if (legal.length === 1) return { column: legal[0], reason: 'only' }
  return null
}

export function chooseMove(grid, player, { timeMs = 1700, maxDepth = CELLS, onIteration } = {}) {
  const start = performance.now()
  const board = fromGrid(grid)
  const result = { column: null, depth: 0, score: 0, scores: null, nodes: 0, elapsedMs: 0 }

  const tactic = tacticalMove(board, player)
  if (tactic) {
    result.column = tactic.column
    result.reason = tactic.reason
    result.elapsedMs = performance.now() - start
    return result
  }

  const clock = createClock(timeMs)
  const search = createSearch(board, clock)
  let order = CENTER_ORDER.filter((col) => board.canPlay(col))
  result.column = order[0]
  const limit = Math.min(maxDepth, CELLS - board.count)

  for (let depth = 1; depth <= limit; depth++) {
    try {
      const iteration = search.searchRoot(player, depth, order)
      Object.assign(result, iteration, { depth })
      onIteration?.({ column: iteration.column, depth, score: iteration.score })
      if (isWinScore(iteration.score)) break
      order = [iteration.column, ...order.filter((col) => col !== iteration.column)]
    } catch (err) {
      if (err !== TIMEOUT) throw err
      break
    }
  }

  result.nodes = search.state.nodes
  result.elapsedMs = performance.now() - start
  return result
}
