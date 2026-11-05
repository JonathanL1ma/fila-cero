import { parentPort } from 'node:worker_threads'
import { chooseMove } from '../engine/index.js'

parentPort.on('message', ({ id, grid, player, timeMs, maxDepth, tt, exclude }) => {
  try {
    const onIteration = (it) => parentPort.postMessage({ id, type: 'iteration', iteration: it })
    const result = chooseMove(grid, player, { timeMs, maxDepth, onIteration, tt, exclude })
    parentPort.postMessage({ id, type: 'result', result })
  } catch (err) {
    parentPort.postMessage({ id, type: 'error', message: err.message })
  }
})
