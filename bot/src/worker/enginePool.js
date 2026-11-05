import { Worker } from 'node:worker_threads'
import { COLUMNS, ROWS } from '@fila-cero/game'

const DEFAULT_WORKER = new URL('./engineWorker.js', import.meta.url)
const EMPTY = Array.from({ length: ROWS }, () => new Array(COLUMNS).fill(0))

export function createEngine({ workerFile = DEFAULT_WORKER, onRestart = () => {} } = {}) {
  let worker
  let nextId = 1
  const pending = new Map()
  let queue = Promise.resolve()

  function spawn() {
    const w = new Worker(workerFile)
    w.on('message', ({ id, type, iteration, result, message }) => {
      const job = pending.get(id)
      if (!job) return
      if (type === 'iteration') return job.onIteration?.(iteration)
      pending.delete(id)
      type === 'result' ? job.resolve(result) : job.reject(new Error(message))
    })
    w.on('error', (err) => failAll(err))
    w.on('exit', (code) => {
      if (w !== worker) return
      failAll(new Error(`El worker del motor terminó con código ${code}`))
      worker = spawn()
      onRestart('exit')
    })
    worker = w
    return w
  }

  function failAll(err) {
    for (const job of pending.values()) job.reject(err)
    pending.clear()
  }

  function run({ grid, player, timeMs, maxDepth, onIteration }) {
    return new Promise((resolve, reject) => {
      const id = nextId++
      pending.set(id, { resolve, reject, onIteration })
      worker.postMessage({ id, grid, player, timeMs, maxDepth })
    })
  }

  function search(request) {
    const result = queue.then(() => run(request))
    queue = result.catch(() => {})
    return result
  }

  function restart() {
    const old = worker
    spawn()
    failAll(new Error('Worker reiniciado'))
    queue = Promise.resolve()
    old.terminate()
    onRestart('watchdog')
  }

  const warmup = (timeMs = 300) => search({ grid: EMPTY, player: 1, timeMs })

  spawn()
  return {
    search,
    restart,
    warmup,
    close: () => {
      const w = worker
      worker = null
      failAll(new Error('Motor cerrado'))
      return w.terminate()
    },
  }
}
