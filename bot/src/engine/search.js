import { CELLS, COLUMNS, CENTER_ORDER } from '@fila-cero/game'
import { evaluate } from './evaluate.js'
import { EXACT, LOWER, UPPER, ZOBRIST_CHECK, ZOBRIST_INDEX, hashCells, zobristOffset } from './tt.js'

export const WIN = 1_000_000
export const INF = WIN + 1
const CLOCK_EVERY = 4096

export const isWinScore = (score) => Math.abs(score) > WIN - CELLS - 1

const toTT = (score, ply) => (score > WIN - CELLS - 1 ? score + ply : score < -(WIN - CELLS - 1) ? score - ply : score)
const fromTT = (score, ply) => (score > WIN - CELLS - 1 ? score - ply : score < -(WIN - CELLS - 1) ? score + ply : score)

export function createSearch(board, clock, tt = null) {
  const state = { nodes: 0 }
  let [h1, h2] = hashCells(board.cells)

  function play(col, player) {
    const row = board.play(col, player)
    const z = zobristOffset(player, row * COLUMNS + col)
    h1 ^= ZOBRIST_INDEX[z]
    h2 ^= ZOBRIST_CHECK[z]
    return z
  }

  function undo(col, z) {
    board.undo(col)
    h1 ^= ZOBRIST_INDEX[z]
    h2 ^= ZOBRIST_CHECK[z]
  }

  function orderWith(first) {
    return first >= 0 && first < COLUMNS ? [first, ...CENTER_ORDER.filter((c) => c !== first)] : CENTER_ORDER
  }

  function negamax(player, depth, alpha, beta, ply) {
    if (++state.nodes % CLOCK_EVERY === 0) clock.check()
    for (const col of CENTER_ORDER) {
      if (board.isWinningMove(col, player)) return WIN - ply - 1
    }
    if (board.count >= CELLS - 1) return 0
    if (depth === 0) return evaluate(board.cells, player)

    const alphaOrig = alpha
    let ttMove = -1
    if (tt) {
      const entry = tt.probe(h1, h2)
      if (entry >= 0) {
        ttMove = tt.move(entry)
        if (tt.depth(entry) >= depth) {
          const score = fromTT(tt.score(entry), ply)
          const flag = tt.flag(entry)
          if (flag === EXACT) return score
          if (flag === LOWER && score > alpha) alpha = score
          else if (flag === UPPER && score < beta) beta = score
          if (alpha >= beta) return score
        }
      }
    }

    let best = -INF
    let bestMove = -1
    for (const col of orderWith(ttMove)) {
      if (!board.canPlay(col)) continue
      const z = play(col, player)
      const score = -negamax(3 - player, depth - 1, -beta, -alpha, ply + 1)
      undo(col, z)
      if (score > best) {
        best = score
        bestMove = col
      }
      if (score > alpha) alpha = score
      if (alpha >= beta) break
    }

    if (tt) {
      const flag = best <= alphaOrig ? UPPER : best >= beta ? LOWER : EXACT
      tt.store(h1, h2, depth, flag, toTT(best, ply), bestMove)
    }
    return best
  }

  function searchRoot(player, depth, order) {
    const scores = new Array(COLUMNS).fill(null)
    let alpha = -INF
    let column = order[0]
    for (const col of order) {
      let score
      if (board.isWinningMove(col, player)) score = WIN - 1
      else {
        const z = play(col, player)
        score = -negamax(3 - player, depth - 1, -INF, -alpha, 1)
        undo(col, z)
      }
      scores[col] = score
      if (score > alpha) {
        alpha = score
        column = col
      }
    }
    return { column, score: alpha, scores }
  }

  return { searchRoot, state }
}
