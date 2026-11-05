import styles from './Board.module.css'

export function Cell({ player, next, win, dropped, fromRow }) {
  const classes = [styles.cell]
  if (player) classes.push(styles[`p${player}`])
  if (next) classes.push(styles.next)
  if (win) classes.push(styles.win)
  if (dropped) classes.push(styles.dropped)
  return <span className={classes.join(' ')} data-player={player} style={dropped ? { '--from': fromRow } : undefined} />
}
