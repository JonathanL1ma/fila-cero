import { existsSync, writeFileSync } from 'node:fs'

const marker = process.env.SUPERVISE_MARKER
if (!existsSync(marker)) {
  writeFileSync(marker, '1')
  process.exit(1)
}
writeFileSync(marker, '2')
process.exit(78)
