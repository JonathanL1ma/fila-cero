import { COLUMNS, fromGrid } from '@fila-cero/game'
import { Column } from './Column.jsx'
import styles from './Board.module.css'

function moveFocus(event) {
  const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key]
  if (!step) return
  const buttons = [...event.currentTarget.querySelectorAll('button')]
  const next = buttons[buttons.indexOf(document.activeElement) + step]
  if (next) {
    event.preventDefault()
    next.focus()
  }
}

export function Board({ state, dispatch }) {
  const board = fromGrid(state.grid)
  const interactive = state.status === 'humanTurn'
  const winning = new Set((state.result?.winningCells ?? []).map(([r, c]) => `${r},${c}`))
  const last = state.moves.at(-1)
  const lastCell = last ? `${board.heights[last.column] - 1},${last.column}` : null

  return (
    <div
      className={`${styles.board} ${state.status === 'finished' && winning.size ? styles.finished : ''}`}
      role="group"
      aria-label="Tablero de 8 columnas por 7 filas"
      onKeyDown={moveFocus}
      data-human={state.human}
    >
      {Array.from({ length: COLUMNS }, (_, col) => (
        <Column
          key={col}
          col={col}
          grid={state.grid}
          height={board.heights[col]}
          interactive={interactive}
          winning={winning}
          lastCell={lastCell}
          onPlay={(full) => dispatch({ type: full ? 'ILLEGAL_MOVE' : 'HUMAN_MOVE', column: col })}
        />
      ))}
    </div>
  )
}
