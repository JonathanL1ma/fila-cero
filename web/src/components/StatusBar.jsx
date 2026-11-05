import styles from './Panels.module.css'

function message(state) {
  switch (state.status) {
    case 'setup':
      return 'Elige quién empieza y pulsa Jugar'
    case 'humanTurn':
      return 'Tu turno: toca una columna'
    case 'botThinking':
      return 'El bot está pensando…'
    case 'error':
      return 'No se pudo contactar al bot'
    case 'finished':
      if (state.result.state === 'draw') return 'Empate: el tablero se llenó'
      return state.result.winner === state.human ? '¡Ganaste!' : 'Ganó el bot'
    default:
      return ''
  }
}

export function StatusBar({ state, onRetry }) {
  const tone = state.status === 'finished' ? styles.finished : state.status === 'error' ? styles.error : ''
  return (
    <section className={styles.status} aria-live="polite">
      <p className={`${styles.message} ${tone}`}>
        {state.status === 'botThinking' && <span className={styles.spinner} aria-hidden="true" />}
        {message(state)}
      </p>
      {state.notice && (
        <p className={styles.notice} role="alert">
          {state.notice}
        </p>
      )}
      {state.status === 'error' && (
        <p className={styles.notice}>
          {state.error}{' '}
          <button type="button" className={styles.primary} onClick={onRetry}>
            Reintentar
          </button>
        </p>
      )}
      <ul className={styles.legend}>
        <li>
          <span className={styles.chip} data-player={state.human} /> Tú
        </li>
        <li>
          <span className={styles.chip} data-player={state.bot} /> Bot
        </li>
      </ul>
    </section>
  )
}
