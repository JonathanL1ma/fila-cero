import { CENTER_ORDER, fromGrid } from '@fila-cero/game'

export const HOUSE_NAMES = {
  'casa-aleatorio': 'Casa aleatorio',
  'casa-basico': 'Casa básico',
}

export function houseMove(name, grid, player, random = Math.random) {
  const board = fromGrid(grid)
  const legal = CENTER_ORDER.filter((col) => board.canPlay(col))
  if (name === 'casa-basico') {
    const win = legal.find((col) => board.isWinningMove(col, player))
    if (win !== undefined) return win
    const block = legal.find((col) => board.isWinningMove(col, 3 - player))
    if (block !== undefined) return block
  }
  return legal[Math.floor(random() * legal.length)]
}
