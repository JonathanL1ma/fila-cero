import { DIFFICULTIES } from '../state/gameReducer.js'
import styles from './Panels.module.css'

export function Controls({ state, onRestart, onPlayAgain }) {
  return (
    <section className={styles.controls}>
      {state.status === 'finished' && (
        <button type="button" className={styles.primary} onClick={onPlayAgain}>
          Jugar otra vez
        </button>
      )}
      <button type="button" className={styles.secondary} onClick={onRestart}>
        Reiniciar
      </button>
      <span className={styles.muted}>Dificultad: {DIFFICULTIES[state.difficulty].label}</span>
    </section>
  )
}

export function BotInsight({ analysis }) {
  if (!analysis) return null
  const text = analysis.depth
    ? `El bot analizó ${analysis.depth} ${analysis.depth === 1 ? 'jugada' : 'jugadas'} hacia adelante en ${analysis.elapsedMs} ms`
    : `El bot vio una jugada obligada y respondió en ${analysis.elapsedMs} ms`
  return <p className={styles.insight}>{text}</p>
}
