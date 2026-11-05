import { COLUMNS, ROWS, applyMove, legalMoves, outcome, playerToMove } from '@fila-cero/game'
import { chooseMove, resetTranspositionTable } from '../src/engine/index.js'

const timeMs = Number(process.argv[2] ?? 1700)
let seed = 11
const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32)

function randomPosition(plies) {
  let grid = Array.from({ length: ROWS }, () => new Array(COLUMNS).fill(0))
  for (let i = 0; i < plies; i++) {
    const legal = legalMoves(grid)
    const next = applyMove(grid, legal[Math.floor(random() * legal.length)])
    if (outcome(next).state !== 'playing') break
    grid = next
  }
  return grid
}

const positions = [randomPosition(0), ...Array.from({ length: 9 }, () => randomPosition(4 + Math.floor(random() * 16)))]

for (const tt of [false, true]) {
  let depth = 0
  let nodes = 0
  let ms = 0
  let searched = 0
  for (const grid of positions) {
    resetTranspositionTable()
    const r = chooseMove(grid, playerToMove(grid), { timeMs, tt })
    if (!r.depth) continue
    depth += r.depth
    nodes += r.nodes
    ms += r.elapsedMs
    searched++
  }
  console.log(
    `tabla ${tt ? 'sí' : 'no'} · ${searched} posiciones · ${timeMs} ms · profundidad media ${(depth / searched).toFixed(1)} · ${Math.round((nodes / ms) * 1000).toLocaleString('es')} nodos/s`,
  )
}
