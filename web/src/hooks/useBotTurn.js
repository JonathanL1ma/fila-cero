import { useEffect } from 'react'
import { askBot } from '../api/botClient.js'
import { DIFFICULTIES, requestIdOf } from '../state/gameReducer.js'

export function useBotTurn(state, dispatch) {
  const thinking = state.status === 'botThinking'
  const requestId = requestIdOf(state)
  const { grid, bot, difficulty } = state

  useEffect(() => {
    if (!thinking) return
    const controller = new AbortController()
    const { timeMs, maxDepth } = DIFFICULTIES[difficulty]
    const timer = setTimeout(() => {
      askBot({ board: grid, player: bot, timeMs, maxDepth }, { signal: controller.signal })
        .then((r) => dispatch({ type: 'BOT_MOVE', requestId, ...r }))
        .catch((err) => {
          if (controller.signal.aborted) return
          const message = err.name === 'TimeoutError' ? 'El bot tardó demasiado en responder' : err.message
          dispatch({ type: 'BOT_ERROR', requestId, message })
        })
    }, 0)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [thinking, requestId, grid, bot, difficulty, dispatch])
}
