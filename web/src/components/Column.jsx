import { ROWS } from '@fila-cero/game'
import { Cell } from './Cell.jsx'
import styles from './Board.module.css'

export function Column({ col, grid, height, interactive, winning, lastCell, onPlay }) {
  const free = ROWS - height
  const full = free === 0
  const label = `Columna ${col + 1}, ${full ? 'llena' : `quedan ${free} ${free === 1 ? 'espacio' : 'espacios'}`}`

  return (
    <button
      type="button"
      className={`${styles.column} ${full ? styles.full : ''}`}
      aria-label={label}
      aria-disabled={full || !interactive}
      disabled={!interactive}
      onClick={() => onPlay(full)}
    >
      {Array.from({ length: ROWS }, (_, i) => {
        const row = ROWS - 1 - i
        const key = `${row},${col}`
        return (
          <Cell
            key={row}
            player={grid[row][col]}
            next={row === height}
            win={winning.has(key)}
            dropped={lastCell === key}
            fromRow={ROWS - row}
          />
        )
      })}
    </button>
  )
}
