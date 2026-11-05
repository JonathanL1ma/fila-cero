import { useReducer } from 'react'
import { gameReducer, initialState } from './state/gameReducer.js'
import { useBotTurn } from './hooks/useBotTurn.js'
import { Board } from './components/Board.jsx'
import { GameSetup } from './components/GameSetup.jsx'
import { StatusBar } from './components/StatusBar.jsx'
import { BotInsight, Controls } from './components/Controls.jsx'
import styles from './App.module.css'

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState)
  useBotTurn(state, dispatch)

  return (
    <main className={styles.app}>
      <header className={styles.header}>
        <h1>Fila Cero</h1>
        <p>Cuatro en línea en un tablero de 8 × 7 contra nuestro bot</p>
      </header>
      {state.status === 'setup' && (
        <GameSetup
          difficulty={state.difficulty}
          onDifficulty={(difficulty) => dispatch({ type: 'SET_DIFFICULTY', difficulty })}
          onStart={(humanFirst) => dispatch({ type: 'START', humanFirst })}
        />
      )}
      <StatusBar state={state} onRetry={() => dispatch({ type: 'RETRY' })} />
      <Board state={state} dispatch={dispatch} />
      <BotInsight analysis={state.analysis} />
      {state.status !== 'setup' && (
        <Controls
          state={state}
          onRestart={() => dispatch({ type: 'RESET' })}
          onPlayAgain={() => dispatch({ type: 'START', humanFirst: state.human === 1 })}
        />
      )}
    </main>
  )
}
