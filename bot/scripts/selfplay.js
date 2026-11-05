import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads'
import { availableParallelism } from 'node:os'
import { parseArgs } from 'node:util'
import { COLUMNS, ROWS, applyMove, legalMoves, outcome, playerToMove } from '@fila-cero/game'
import { chooseMove, resetTranspositionTable } from '../src/engine/index.js'

function playGame({ opening, sides, timeMs }) {
  resetTranspositionTable()
  let grid = Array.from({ length: ROWS }, () => new Array(COLUMNS).fill(0))
  for (const col of opening) grid = applyMove(grid, col)
  for (;;) {
    const result = outcome(grid)
    if (result.state !== 'playing') return result.state === 'draw' ? null : sides[result.winner]
    const player = playerToMove(grid)
    const { column } = chooseMove(grid, player, { timeMs, ...sides.config[sides[player]] })
    grid = applyMove(grid, column)
  }
}

if (!isMainThread) {
  for (const game of workerData.games) parentPort.postMessage(playGame(game))
} else {
  const { values } = parseArgs({
    options: {
      openings: { type: 'string', default: '40' },
      time: { type: 'string', default: '200' },
      a: { type: 'string', default: '{"tt":false}' },
      b: { type: 'string', default: '{"tt":true}' },
      seed: { type: 'string', default: '2026' },
    },
  })
  const config = { A: JSON.parse(values.a), B: JSON.parse(values.b) }
  const timeMs = Number(values.time)
  let seed = Number(values.seed)
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32)

  const games = []
  while (games.length < Number(values.openings) * 2) {
    const opening = []
    let grid = Array.from({ length: ROWS }, () => new Array(COLUMNS).fill(0))
    for (let i = 0, n = 2 + Math.floor(random() * 3); i < n; i++) {
      const legal = legalMoves(grid)
      const col = legal[Math.floor(random() * legal.length)]
      opening.push(col)
      grid = applyMove(grid, col)
    }
    games.push({ opening, timeMs, sides: { 1: 'A', 2: 'B', config } })
    games.push({ opening, timeMs, sides: { 1: 'B', 2: 'A', config } })
  }

  const threads = Math.max(1, Math.min(8, availableParallelism() - 1))
  const tally = { A: 0, B: 0, draw: 0 }
  const started = Date.now()
  await Promise.all(
    Array.from({ length: threads }, (_, t) => {
      const slice = games.filter((_, i) => i % threads === t)
      const worker = new Worker(new URL(import.meta.url), { workerData: { games: slice } })
      worker.on('message', (winner) => {
        tally[winner ?? 'draw']++
        const done = tally.A + tally.B + tally.draw
        process.stdout.write(`\r${done}/${games.length} partidas`)
      })
      return new Promise((resolve, reject) => {
        worker.on('exit', resolve)
        worker.on('error', reject)
      })
    }),
  )

  const points = tally.B + tally.draw / 2
  const pct = (100 * points) / games.length
  console.log(`\nA = ${values.a} · B = ${values.b} · ${timeMs} ms por jugada · ${threads} hilos · ${Math.round((Date.now() - started) / 1000)} s`)
  console.log(`B gana ${tally.B}, empata ${tally.draw}, pierde ${tally.A} → ${pct.toFixed(1)} % de los puntos`)
  console.log(pct >= 60 ? 'B mejora a A (≥ 60 %)' : 'B no mejora a A con suficiente margen (< 60 %)')
}
