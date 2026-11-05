import { useState } from 'react'
import { DIFFICULTIES } from '../state/gameReducer.js'
import styles from './Panels.module.css'

export function GameSetup({ difficulty, onDifficulty, onStart }) {
  const [humanFirst, setHumanFirst] = useState(true)

  return (
    <form
      className={styles.panel}
      onSubmit={(event) => {
        event.preventDefault()
        onStart(humanFirst)
      }}
    >
      <fieldset className={styles.options}>
        <legend>¿Quién empieza?</legend>
        {[
          [true, 'Yo'],
          [false, 'El bot'],
        ].map(([value, label]) => (
          <label key={label} className={styles.option}>
            <input type="radio" name="first" checked={humanFirst === value} onChange={() => setHumanFirst(value)} />
            {label}
          </label>
        ))}
      </fieldset>
      <fieldset className={styles.options}>
        <legend>Dificultad</legend>
        {Object.entries(DIFFICULTIES).map(([key, { label }]) => (
          <label key={key} className={styles.option}>
            <input type="radio" name="difficulty" checked={difficulty === key} onChange={() => onDifficulty(key)} />
            {label}
          </label>
        ))}
      </fieldset>
      <button type="submit" className={styles.primary}>
        Jugar
      </button>
    </form>
  )
}
