import { readFileSync } from 'node:fs'
import Ajv from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

export const contract = JSON.parse(readFileSync(new URL('../../contract/arbitro-openapi.json', import.meta.url)))

const ajv = new Ajv({ strict: false, allErrors: true })
addFormats(ajv)
ajv.addSchema({ $id: 'contract', components: contract.components })

export function matchesSchema(name, value) {
  const validate = ajv.getSchema(`contract#/components/schemas/${name}`)
  return validate(value) ? true : validate.errors
}

export const nextTurnSchemaMatches = (body) => {
  const name = body.status === 'turn' ? 'Turn' : 'Idle'
  return matchesSchema(name, body)
}

export function memoryLog() {
  const log = { turns: [], warnings: [], errors: [] }
  log.turn = (t) => log.turns.push(t)
  log.warn = (m) => log.warnings.push(m)
  log.error = (m) => log.errors.push(m)
  log.info = () => {}
  return log
}

export async function until(condition, timeoutMs = 10_000) {
  const end = Date.now() + timeoutMs
  while (!condition()) {
    if (Date.now() > end) throw new Error('La condición no se cumplió a tiempo')
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
}
