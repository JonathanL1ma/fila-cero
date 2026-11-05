import { COLUMNS, ROWS, applyMove, fromGrid, outcome } from '@fila-cero/game'

export const DIFFICULTIES = {
  easy: { label: 'Fácil', maxDepth: 2 },
  medium: { label: 'Medio', maxDepth: 6 },
  hard: { label: 'Difícil', timeMs: 1700 },
}

const emptyGrid = () => Array.from({ length: ROWS }, () => new Array(COLUMNS).fill(0))

export const initialState = {
  status: 'setup',
  grid: emptyGrid(),
  human: 1,
  bot: 2,
  difficulty: 'medium',
  gameId: 0,
  moves: [],
  notice: null,
  result: null,
  analysis: null,
  error: null,
}

export const requestIdOf = (state) => `${state.gameId}:${state.moves.length}`

function afterMove(state, column, by, extra = {}) {
  const grid = applyMove(state.grid, column)
  const moves = [...state.moves, { column, by }]
  const result = outcome(grid)
  const finished = result.state !== 'playing'
  const nextStatus = by === state.human ? 'botThinking' : 'humanTurn'
  return { ...state, ...extra, grid, moves, notice: null, error: null, result: finished ? result : null, status: finished ? 'finished' : nextStatus }
}

export function gameReducer(state, action) {
  switch (action.type) {
    case 'SET_DIFFICULTY':
      return DIFFICULTIES[action.difficulty] ? { ...state, difficulty: action.difficulty } : state

    case 'START': {
      const human = action.humanFirst ? 1 : 2
      return {
        ...initialState,
        difficulty: state.difficulty,
        gameId: state.gameId + 1,
        human,
        bot: 3 - human,
        status: action.humanFirst ? 'humanTurn' : 'botThinking',
      }
    }

    case 'HUMAN_MOVE':
      if (state.status !== 'humanTurn') return state
      if (!fromGrid(state.grid).canPlay(action.column)) return gameReducer(state, { type: 'ILLEGAL_MOVE', column: action.column })
      return afterMove(state, action.column, state.human)

    case 'ILLEGAL_MOVE':
      if (state.status !== 'humanTurn') return state
      return { ...state, notice: `La columna ${action.column + 1} está llena, elige otra` }

    case 'BOT_MOVE':
      if (state.status !== 'botThinking' || action.requestId !== requestIdOf(state)) return state
      if (!fromGrid(state.grid).canPlay(action.column)) {
        return { ...state, status: 'error', error: `El bot propuso una columna inválida (${action.column})` }
      }
      return afterMove(state, action.column, state.bot, {
        analysis: { depth: action.depth, elapsedMs: action.elapsedMs, scores: action.scores, column: action.column },
      })

    case 'BOT_ERROR':
      if (state.status !== 'botThinking' || action.requestId !== requestIdOf(state)) return state
      return { ...state, status: 'error', error: action.message }

    case 'RETRY':
      return state.status === 'error' ? { ...state, status: 'botThinking', error: null } : state

    case 'RESET':
      return { ...initialState, difficulty: state.difficulty, gameId: state.gameId + 1 }

    default:
      return state
  }
}
