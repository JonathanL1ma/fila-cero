// Verifica bot/test/fixtures/tactical-cases.js con un oráculo de fuerza bruta.
//
// El oráculo es deliberadamente ingenuo (sin poda, sin tabla de transposición, sin
// heurística) y no importa nada del motor ni de @fila-cero/game: así un error en el motor
// o en las reglas no puede esconderse detrás de un caso de prueba equivocado.
//
// Revisa que cada tablero sea alcanzable (existe un orden de jugadas alternadas que lo
// produce, sin un cuatro en línea previo) y que `best` y `avoid` sean exactamente las
// columnas correctas. Uso: node bot/scripts/verify-tactical-cases.js (también corre dentro de
// npm test, desde bot/test/engine/tactical.test.js).
import { pathToFileURL } from 'node:url'
import { tacticalCases } from '../test/fixtures/tactical-cases.js'

// Excepción consciente a la regla de AGENTS.md de importar las constantes de @fila-cero/game:
// el oráculo no importa nada del juego para que un error ahí no pueda esconderse aquí.
const COLS = 8
const ROWS = 7
const MAX_PLIES = 5
const DIRECTIONS = [
  [0, 1, 'horizontal'],
  [1, 0, 'vertical'],
  [1, 1, 'diagonal ascendente'],
  [1, -1, 'diagonal descendente'],
]

function parseRows(rows) {
  const errors = []
  const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0))
  if (rows.length !== ROWS) errors.push(`se esperaban ${ROWS} filas y hay ${rows.length}`)
  rows.forEach((line, i) => {
    const r = ROWS - 1 - i
    if (line.length !== COLS) errors.push(`fila ${r}: ${line.length} caracteres en vez de ${COLS}`)
    ;[...line].forEach((ch, c) => {
      if (ch === '1' || ch === '2') grid[r][c] = Number(ch)
      else if (ch !== '.') errors.push(`fila ${r}, columna ${c}: carácter inválido '${ch}'`)
    })
  })
  return { grid, errors }
}

function countPieces(grid) {
  let p1 = 0
  let p2 = 0
  for (const row of grid) for (const v of row) if (v === 1) p1++
  else if (v === 2) p2++
  return { p1, p2, total: p1 + p2 }
}

function columnHeights(grid) {
  const heights = Array(COLS).fill(0)
  const floating = []
  for (let c = 0; c < COLS; c++) {
    let r = 0
    while (r < ROWS && grid[r][c] !== 0) r++
    heights[c] = r
    for (let k = r + 1; k < ROWS; k++) if (grid[k][c] !== 0) floating.push([k, c])
  }
  return { heights, floating }
}

function lineDirectionsThrough(grid, r, c, p) {
  const found = []
  for (const [dr, dc, name] of DIRECTIONS) {
    let length = 1
    for (const sign of [1, -1]) {
      let rr = r + dr * sign
      let cc = c + dc * sign
      while (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && grid[rr][cc] === p) {
        length++
        rr += dr * sign
        cc += dc * sign
      }
    }
    if (length >= 4) found.push(name)
  }
  return found
}

function hasFour(grid, p) {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) if (grid[r][c] === p && lineDirectionsThrough(grid, r, c, p).length > 0) return true
  return false
}

const makeState = (grid) => ({ grid: grid.map((row) => row.slice()), heights: columnHeights(grid).heights })

function play(state, c, p) {
  state.grid[state.heights[c]][c] = p
  state.heights[c]++
}

function undo(state, c) {
  state.heights[c]--
  state.grid[state.heights[c]][c] = 0
}

const legalColumns = (state) => [...Array(COLS).keys()].filter((c) => state.heights[c] < ROWS)

function winDirectionsAt(state, c, p) {
  const r = state.heights[c]
  if (r >= ROWS) return []
  state.grid[r][c] = p
  const dirs = lineDirectionsThrough(state.grid, r, c, p)
  state.grid[r][c] = 0
  return dirs
}

const immediateWins = (state, p) => legalColumns(state).filter((c) => winDirectionsAt(state, c, p).length > 0)

function handsImmediateWin(state, p, c) {
  if (winDirectionsAt(state, c, p).length > 0) return false
  play(state, c, p)
  const losing = immediateWins(state, 3 - p).length > 0
  undo(state, c)
  return losing
}

// p, al que le toca, puede forzar la victoria en a lo sumo `plies` jugadas (las suyas son la 1, 3, 5...).
function canForceWin(state, p, plies) {
  if (plies < 1) return false
  const moves = legalColumns(state)
  if (moves.some((c) => winDirectionsAt(state, c, p).length > 0)) return true
  if (plies < 3) return false
  return moves.some((c) => forcesWinAfter(state, p, c, plies))
}

function forcesWinAfter(state, p, c, plies) {
  const q = 3 - p
  play(state, c, p)
  const replies = legalColumns(state)
  let forced = replies.length > 0
  for (const reply of replies) {
    if (winDirectionsAt(state, reply, q).length > 0) {
      forced = false
      break
    }
    play(state, reply, q)
    const ok = canForceWin(state, p, plies - 2)
    undo(state, reply)
    if (!ok) {
      forced = false
      break
    }
  }
  undo(state, c)
  return forced
}

function winDistanceVia(state, p, c, maxPlies) {
  if (winDirectionsAt(state, c, p).length > 0) return 1
  for (let plies = 3; plies <= maxPlies; plies += 2) if (forcesWinAfter(state, p, c, plies)) return plies
  return Infinity
}

// Búsqueda hacia atrás: se quitan fichas de arriba, alternando colores, hasta vaciar el tablero.
function isReachable(grid) {
  const { p1, p2, total } = countPieces(grid)
  if (!(p1 === p2 || p1 === p2 + 1)) return `conteo imposible: jugador 1 = ${p1}, jugador 2 = ${p2}`
  const { floating } = columnHeights(grid)
  if (floating.length) return `fichas flotando en ${floating.map(([r, c]) => `(fila ${r}, col ${c})`).join(', ')}`
  if (hasFour(grid, 1) || hasFour(grid, 2)) return 'ya hay un cuatro en línea: la partida habría terminado'
  const state = makeState(grid)
  const failed = new Set()
  const key = (mover) => state.grid.map((row) => row.join('')).join('/') + mover
  const peel = (lastMover, remaining) => {
    if (remaining === 0) return true
    const k = key(lastMover)
    if (failed.has(k)) return false
    for (let c = 0; c < COLS; c++) {
      const top = state.heights[c] - 1
      if (top < 0 || state.grid[top][c] !== lastMover) continue
      undo(state, c)
      const ok = peel(3 - lastMover, remaining - 1)
      play(state, c, lastMover)
      if (ok) return true
    }
    failed.add(k)
    return false
  }
  return peel(p1 === p2 ? 2 : 1, total) ? null : 'no existe un orden de jugadas alternadas que produzca este tablero'
}

function expectedFor(testCase, state, p) {
  const q = 3 - p
  const legal = legalColumns(state)
  const myWins = immediateWins(state, p)
  const theirWins = immediateWins(state, q)
  const problems = []
  const noImmediateWins = () => {
    if (myWins.length) problems.push(`el que mueve puede ganar ya en ${myWins}`)
    if (theirWins.length) problems.push(`el rival ya puede ganar en ${theirWins}`)
  }

  switch (testCase.category) {
    case 'win-in-1':
      for (const c of myWins) {
        const dirs = winDirectionsAt(state, c, p)
        if (!dirs.includes(testCase.direction)) problems.push(`la columna ${c} gana en ${dirs.join('/')}, no en ${testCase.direction}`)
      }
      return { best: myWins, problems }
    case 'block-in-1':
      if (myWins.length) problems.push(`el que mueve puede ganar ya en ${myWins}`)
      return { best: theirWins, problems }
    case 'win-over-block':
      if (!theirWins.length) problems.push('el rival no tiene amenaza: el caso no prueba nada')
      return { best: myWins, problems }
    case 'avoid-under-threat': {
      noImmediateWins()
      const avoid = legal.filter((c) => handsImmediateWin(state, p, c))
      for (const c of avoid) {
        play(state, c, p)
        if (!immediateWins(state, q).includes(c)) problems.push(`la columna ${c} regala una victoria, pero no justo encima`)
        undo(state, c)
      }
      return { best: legal.filter((c) => !avoid.includes(c)), avoid, problems }
    }
    case 'double-threat':
      noImmediateWins()
      return { best: legal.filter((c) => winDistanceVia(state, p, c, 3) === 3), problems }
    case 'shortest-win': {
      const finite = legal.map((c) => [c, winDistanceVia(state, p, c, MAX_PLIES)]).filter(([, d]) => d !== Infinity)
      const shortest = Math.min(...finite.map(([, d]) => d))
      if (!finite.some(([, d]) => d > shortest)) problems.push('no hay una segunda victoria más larga: el caso no prueba la preferencia')
      return { best: finite.filter(([, d]) => d === shortest).map(([c]) => c), problems }
    }
    case 'single-column':
      if (legal.length !== 1) problems.push(`hay ${legal.length} columnas legales`)
      return { best: legal, problems }
    case 'last-cell-draw':
    case 'last-cell-win': {
      const { total } = countPieces(state.grid)
      if (total !== COLS * ROWS - 1) problems.push(`hay ${total} fichas y debería faltar solo una`)
      if (legal.length !== 1) problems.push(`hay ${legal.length} columnas legales`)
      const wins = legal.length === 1 && winDirectionsAt(state, legal[0], p).length > 0
      if (testCase.category === 'last-cell-win' && !wins) problems.push('la última ficha no gana')
      if (testCase.category === 'last-cell-draw' && wins) problems.push('la última ficha gana: no es empate')
      return { best: legal, problems }
    }
    default:
      return { best: [], problems: [`categoría desconocida: ${testCase.category}`] }
  }
}

const sameColumns = (a = [], b = []) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort())

// Devuelve, para cada caso, la lista de problemas que encontró el oráculo (vacía si está bien).
export function verifyTacticalCases(cases) {
  return cases.map((testCase) => {
    const { grid, errors } = parseRows(testCase.rows)
    const problems = [...errors]
    if (!errors.length) {
      const unreachable = isReachable(grid)
      if (unreachable) problems.push(unreachable)
      const { p1, p2 } = countPieces(grid)
      const toMove = p1 === p2 ? 1 : 2
      if (toMove !== testCase.toMove) problems.push(`toMove dice ${testCase.toMove}, pero por el conteo mueve el ${toMove}`)
      if (!unreachable) {
        const expected = expectedFor(testCase, makeState(grid), testCase.toMove)
        problems.push(...expected.problems)
        if (!sameColumns(expected.best, testCase.best)) problems.push(`best dice [${testCase.best}], el oráculo dice [${expected.best}]`)
        if (expected.avoid && !sameColumns(expected.avoid, testCase.avoid)) problems.push(`avoid dice [${testCase.avoid}], el oráculo dice [${expected.avoid}]`)
      }
    }
    return { id: testCase.id, problems }
  })
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const results = verifyTacticalCases(tacticalCases)
  for (const { id, problems } of results) {
    console.log(`${problems.length ? 'FALLA' : 'ok   '}  ${id}${problems.map((p) => `\n         - ${p}`).join('')}`)
  }
  const failures = results.filter(({ problems }) => problems.length).length
  console.log(`\n${results.length - failures}/${results.length} casos verificados`)
  process.exitCode = failures ? 1 : 0
}
