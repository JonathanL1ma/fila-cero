import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { CONFIG_ERROR_EXIT } from '../src/config.js'

const entry = process.env.SUPERVISE_ENTRY || fileURLToPath(new URL('../src/index.js', import.meta.url))
const restartDelayMs = Number(process.env.SUPERVISE_DELAY_MS ?? 1000)
let child
let stopping = false

function launch() {
  child = spawn(process.execPath, [entry], { stdio: 'inherit', env: { MODE: 'arbiter', ...process.env } })
  child.on('exit', (code, signal) => {
    if (stopping) process.exit(code ?? 0)
    if (code === CONFIG_ERROR_EXIT) {
      console.error('✖ Error de configuración: el supervisor no relanza el bot. Corrige .env y vuelve a arrancar.')
      process.exit(code)
    }
    console.error(`⚠ El bot terminó (${signal ?? `código ${code}`}); se relanza en ${restartDelayMs} ms`)
    setTimeout(launch, restartDelayMs)
  })
}

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    stopping = true
    child?.kill(sig)
  })
}

launch()
