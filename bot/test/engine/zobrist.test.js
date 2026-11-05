import { describe, expect, it } from 'vitest'
import { CELLS } from '@fila-cero/game'
import { hashCells } from '../../src/engine/tt.js'
import { seededRandom } from '../helpers.js'

describe('claves Zobrist', () => {
  it('cuando dos tableros distintos comparten la primera clave, la segunda los distingue', () => {
    const random = seededRandom(12345)
    const seen = new Map()
    const cells = new Int8Array(CELLS)
    let firstKeyCollisions = 0

    for (let n = 0; n < 300_000; n++) {
      for (let idx = 0; idx < CELLS; idx++) cells[idx] = Math.floor(random() * 3)
      const [h1, h2] = hashCells(cells)
      const board = cells.join('')
      const previous = seen.get(h1)
      if (previous && previous.board !== board) {
        firstKeyCollisions++
        expect(h2).not.toBe(previous.h2)
      } else {
        seen.set(h1, { board, h2 })
      }
    }

    expect(firstKeyCollisions).toBeGreaterThan(0)
  })
})
