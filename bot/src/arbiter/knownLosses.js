export const KNOWN_LOSSES = [
  { opponent: 'Sleipnir', moves: '33335443433', avoid: [4, 1], games: ['g_511011a6', 'g_612268ea'] },
  { opponent: 'Sleipnir', moves: '334552333324244122', avoid: [2], games: ['g_0e43731d'] },
]

export function avoidedColumns(turn, losses = KNOWN_LOSSES) {
  const opponent = String(turn.opponent ?? '').trim().toLowerCase()
  if (!Array.isArray(turn.moves)) return []
  const moves = turn.moves.join('')
  return losses
    .filter((loss) => loss.opponent.toLowerCase() === opponent && loss.moves === moves)
    .flatMap((loss) => loss.avoid)
}
