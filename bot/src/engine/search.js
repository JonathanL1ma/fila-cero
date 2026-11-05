import { CELLS, COLUMNS, CENTER_ORDER } from '@fila-cero/game'
import { evaluate } from './evaluate.js'

export const WIN = 1_000_000
export const INF = WIN + 1
const CLOCK_EVERY = 4096

export const isWinScore = (score) => Math.abs(score) > WIN - CELLS - 1

export function createSearch(board, clock) {
  const state = { nodes: 0 }

  function negamax(player, depth, alpha, beta, ply) {
    if (++state.nodes % CLOCK_EVERY === 0) clock.check()
    for (const col of CENTER_ORDER) {
      if (board.isWinningMove(col, player)) return WIN - ply - 1
    }
    if (board.count >= CELLS - 1) return 0
    if (depth === 0) return evaluate(board.cells, player)

    let best = -INF
    for (const col of CENTER_ORDER) {
      if (!board.canPlay(col)) continue
      board.play(col, player)
      const score = -negamax(3 - player, depth - 1, -beta, -alpha, ply + 1)
      board.undo(col)
      if (score > best) best = score
      if (score > alpha) alpha = score
      if (alpha >= beta) break
    }
    return best
  }

  function searchRoot(player, depth, order) {
    const scores = new Array(COLUMNS).fill(null)
    let alpha = -INF
    let column = order[0]
    for (const col of order) {
      const score = board.isWinningMove(col, player) ? WIN - 1 : rootChild(player, col, depth, alpha)
      scores[col] = score
      if (score > alpha) {
        alpha = score
        column = col
      }
    }
    return { column, score: alpha, scores }
  }

  function rootChild(player, col, depth, alpha) {
    board.play(col, player)
    const score = -negamax(3 - player, depth - 1, -INF, -alpha, 1)
    board.undo(col)
    return score
  }

  return { searchRoot, state }
}
