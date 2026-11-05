import { parentPort } from 'node:worker_threads'

parentPort.on('message', ({ id, timeMs }) => {
  if (timeMs === -1) for (;;);
  if (timeMs === -2) process.exit(1)
  if (timeMs === -3) return parentPort.postMessage({ id, type: 'error', message: 'falla simulada' })
  parentPort.postMessage({ id, type: 'iteration', iteration: { column: 4, depth: 2 } })
  parentPort.postMessage({ id, type: 'result', result: { column: 4, depth: 2, timeMs } })
})
