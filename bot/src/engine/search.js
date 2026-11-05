import { CELLS, COLUMNS, ROWS, CENTER_ORDER, completesLine } from '@fila-cero/game'
import { createIncrementalEvaluation } from './evaluate.js'
import { EXACT, LOWER, UPPER, ZOBRIST_CHECK, ZOBRIST_INDEX, hashCells, zobristOffset } from './tt.js'

export const WIN = 1_000_000
export const INF = WIN + 1
const CLOCK_EVERY = 1024

export const isWinScore = (score) => Math.abs(score) > WIN - CELLS - 1

const toTT = (score, ply) => (score > WIN - CELLS - 1 ? score + ply : score < -(WIN - CELLS - 1) ? score - ply : score)
const fromTT = (score, ply) => (score > WIN - CELLS - 1 ? score - ply : score < -(WIN - CELLS - 1) ? score + ply : score)

export function createSearch(board, clock, tt = null) {
  const state = { nodes: 0 }
  let [h1, h2] = hashCells(board.cells)
  const evaluation = createIncrementalEvaluation(board.cells)

  function play(col, player) {
    const row = board.play(col, player)
    const idx = row * COLUMNS + col
    evaluation.add(idx, player)
    const z = zobristOffset(player, idx)
    h1 ^= ZOBRIST_INDEX[z]
    h2 ^= ZOBRIST_CHECK[z]
    return z
  }

  function undo(col, z) {
    board.undo(col)
    evaluation.remove(z % CELLS, z < CELLS ? 1 : 2)
    h1 ^= ZOBRIST_INDEX[z]
    h2 ^= ZOBRIST_CHECK[z]
  }

  const moves = new Int8Array((CELLS + 1) * COLUMNS)

  // ¿Jugar en `col` le deja al rival una casilla ganadora justo encima?
  function opensWinAbove(col, opponent) {
    const row = board.heights[col] + 1
    return row < ROWS && completesLine(board.cells, row, col, opponent)
  }

  // Deja en el buffer de este ply las jugadas que no pierden de inmediato (Pons,
  // "anticipate losing moves"): si el rival tiene una victoria inmediata, la única jugada
  // es taparla, y nunca se juega justo debajo de una casilla ganadora del rival. La mejor
  // jugada de la tabla va primero; el resto, del centro hacia afuera. Devuelve cuántas
  // quedan, o -1 si el rival tiene dos victorias inmediatas.
  function collectMoves(player, ply, ttMove) {
    const opponent = 3 - player
    let forced = -1
    for (const col of CENTER_ORDER) {
      if (board.isWinningMove(col, opponent)) {
        if (forced !== -1) return -1
        forced = col
      }
    }
    const base = ply * COLUMNS
    let count = 0
    for (const col of CENTER_ORDER) {
      if (!board.canPlay(col) || (forced !== -1 && col !== forced) || opensWinAbove(col, opponent)) continue
      let pos = base + count++
      if (col === ttMove) {
        for (; pos > base; pos--) moves[pos] = moves[pos - 1]
      }
      moves[pos] = col
    }
    return count
  }

  // `noImmediateWin`: el padre filtró sus jugadas con collectMoves, así que ya se sabe
  // que el jugador de este nodo no tiene una victoria inmediata y no hace falta buscarla.
  function negamax(player, depth, alpha, beta, ply, noImmediateWin = false) {
    if (++state.nodes % CLOCK_EVERY === 0) clock.check()
    if (!noImmediateWin) {
      for (const col of CENTER_ORDER) {
        if (board.isWinningMove(col, player)) return WIN - ply - 1
      }
    }
    if (board.count >= CELLS - 1) return 0
    if (depth === 0) return evaluation.score(player)

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

    // La referencia para decidir el tipo de cota es la ventana ya ajustada por la tabla:
    // si la tabla subió alfa y la búsqueda no lo supera, el resultado es solo una cota
    // superior, no un valor exacto.
    const alphaOrig = alpha
    const count = collectMoves(player, ply, ttMove)
    if (count <= 0) return -(WIN - ply - 2)

    let best = -INF
    let bestMove = -1
    for (let i = ply * COLUMNS, end = i + count; i < end; i++) {
      const col = moves[i]
      const z = play(col, player)
      const score = -negamax(3 - player, depth - 1, -beta, -alpha, ply + 1, true)
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
