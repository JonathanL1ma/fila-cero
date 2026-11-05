import { writeFileSync } from 'node:fs'

writeFileSync(process.env.SUPERVISE_MARKER, process.env.MODE ?? '')
process.exit(78)
