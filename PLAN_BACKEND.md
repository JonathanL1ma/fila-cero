# Plan de ejecución: Backend (bot)

**Fila Cero** (Equipo 2) · Challenge Cuatro en línea 8×7 · v1.1 (4 de noviembre de 2026)

> Este plan se escribe y se commitea antes de cualquier línea de código. Después del primer commit de código **no se edita**: las desviaciones se registran en `docs/TECNICO.md`, sección "Cambios respecto al plan".
>
> La v1.0 integra dos borradores escritos en paralelo y varias revisiones cruzadas hechas con IA en sesiones independientes, todas validadas por el equipo. Los hallazgos aceptados y los descartados quedan registrados en `docs/IA_LOG.md`.

## Resumen y relación con la evaluación

**Fila Cero**: la fila de abajo, donde todo empieza. Un bot de negamax con poda alfa-beta, iterative deepening y tabla de transposición, adaptado a 8×7, que corre en un worker vigilado y nunca regala una partida por tiempo, jugada ilegal o desconexión. La app web juega contra el mismo código.

| Criterio | Peso | Dónde lo atiende este plan |
|---|---|---|
| Desempeño del algoritmo | 25 | Secciones 4 y 4.1 (búsqueda y tiempo) y 9.3 (selfplay como criterio de mejora). Igual de importante: no perder partidas regaladas, porque cada derrota por tiempo o desconexión es una victoria del rival (secciones 5, 10 y 15) |
| Calidad de código y pruebas | 25 | Objetivos: `npm test` único, en un clon limpio, sin `.env` ni red y sin umbrales que lo hagan fallar (9.1). Subjetivos: módulos con una responsabilidad y regla de dependencias (3), commits por paso (8) |
| Exposición | 15 | Sección 16: guion, material de partidas reales, historias de uso de IA y ensayo |
| Documentación | 15 | Pasos 9 y 11 (README, `docs/TECNICO.md`) y paso 8 de `PLAN_FRONTEND.md` (manual) |
| Plan de ejecución | 10 | Pasos con criterio de listo, responsable y hora (8), riesgos reales (10), delegación a la IA con verificación (11) |
| Frontend | 10 | `PLAN_FRONTEND.md` |

## 1. Alcance

El backend es un único servicio Node.js que cumple tres funciones con el mismo motor de juego:

1. **Juega en el torneo**: se conecta al árbitro por long polling (`GET /api/next`, `POST /api/move`).
2. **Juega contra personas**: expone una API HTTP que consume la app web y sirve la app compilada.
3. **Se prueba solo**: con un árbitro simulado (mock) y pruebas automatizadas con cobertura.

Fuera de alcance: la interfaz gráfica (va en `PLAN_FRONTEND.md`), aprendizaje automático, libros de aperturas precalculados y pensar durante el turno del rival.

## 2. Stack

| Elemento | Elección | Motivo |
|---|---|---|
| Runtime | Node.js 24 LTS (fijado en `.nvmrc` y `engines`) | Node 20 salió de soporte en abril de 2026. Node 24 trae `fetch`, `worker_threads`, `AbortSignal.timeout` y `--env-file-if-exists`, así que no hace falta `dotenv` |
| Servidor HTTP | Fastify + `@fastify/static` | Es liviano y valida con JSON Schema. Con `inject()` las rutas se prueban sin abrir puertos, y sirve el build de la app |
| Monorepo | npm workspaces: `game`, `bot` y `web` | Un solo `npm install`. El bot y la app importan las mismas reglas, y Vite permite importar desde la raíz del workspace sin configuración extra |
| Pruebas | Vitest + `@vitest/coverage-v8` | `test.projects` corre `game`, `bot` y `web` con un solo `npm test` y un reporte de cobertura unificado |
| Validación de contrato | Ajv (JSON Schema 2020-12) | Valida las respuestas del mock contra los esquemas del OpenAPI |
| Configuración | Variables de entorno. El `.env` local se carga con `--env-file-if-exists`, solo en los scripts de arranque | El token nunca va al repositorio y las pruebas no necesitan `.env`. `--env-file` a secas aborta si el archivo no existe, y en la máquina del jurado no va a existir |

## 3. Arquitectura y módulos

```
/                          raíz del repo (npm workspaces)
  package.json             scripts: test, test:integration, dev, start, liga, mock, selfplay
  vitest.config.js         test.projects: game (node), bot (node), web (jsdom)
  .nvmrc  .env.example  .gitignore   (.env y logs/ ignorados)
  game/                    @fila-cero/game: reglas puras, sin dependencias
    src/constants.js       COLUMNS = 8, ROWS = 7, CENTER_ORDER
    src/board.js           Board: Int8Array(56) + heights[8]; play/undo en O(1)
    src/rules.js           jugadas legales, victoria con celdas ganadoras, empate
    src/grid.js            fromGrid/toGrid, applyMove(grid, col), outcome(grid)
  bot/
    src/engine/            algoritmo, sin HTTP ni hilos
      search.js            negamax con poda alfa-beta + iterative deepening
      evaluate.js          heurística de posición
      tt.js                tabla de transposición (Zobrist)
      clock.js             presupuesto de tiempo
      index.js             chooseMove(board, player, { timeMs, maxDepth, onIteration })
    src/arbiter/
      client.js            next, move, me, practice, submission (con timeouts)
      loop.js              ciclo de long polling, reintentos, caché de la última jugada
      turnPolicy.js        presupuesto, watchdog, jugada de respaldo
    src/worker/
      engineWorker.js      cascarón delgado: recibe el tablero, llama a chooseMove y reporta cada iteración
      enginePool.js        worker persistente: calentamiento y re-creación si muere
    src/api/server.js      /api/health, /api/play, /api/replay y estáticos de web/dist
    src/config.js          lectura y validación de variables de entorno
    src/index.js           punto de entrada según MODE
    scripts/supervise.js   relanza el bot si el proceso muere (salvo código 78, error de configuración)
    scripts/selfplay.js    minitorneo entre configuraciones del motor (v-segura contra la actual)
    mock/arbiterMock.js    árbitro simulado; exporta startArbiterMock({ port, token, chaos })
    contract/arbitro-openapi.json   copia del OpenAPI (se reemplaza el jueves por el definitivo)
    test/                  engine/ arbiter/ api/ worker/ fixtures/
  web/                     ver PLAN_FRONTEND.md
  docs/                    TECNICO.md, MANUAL.md, IA_LOG.md
```

**Regla de dependencias.** `game` no importa nada. `engine` solo importa `game`. `arbiter` y `api` pueden importar `game`, pero llegan al motor únicamente a través de `enginePool` (el worker). `web` importa `game` y nunca `bot`. Así, las reglas y el algoritmo se prueban sin levantar servidores ni hilos.

### 3.1 Representación del tablero

- **Formato de intercambio** (árbitro, API y app): `board[fila][columna]`, 7 filas × 8 columnas, **fila 0 abajo**. Valores: 0 (vacío), 1 y 2.
- **Una sola implementación de las reglas.** `game` expone `Board` (un `Int8Array(56)` más `heights[8]`, mutable y rápido) para el motor. Para la app y para validar en la API expone funciones puras sobre la grilla 2D (`fromGrid`, `toGrid`, `applyMove`, `outcome`), construidas sobre el mismo `Board`. No hay dos versiones de las reglas que puedan divergir.
- **Detección de victoria.** Después de una jugada, se revisa solo alrededor de la última ficha (4 direcciones). `outcome(grid)`, que recibe un tablero sin historia, recorre las 107 ventanas.
- **Constantes de tamaño.** Siempre se importan de `game/src/constants.js`, nunca como números sueltos.

**Decisión descartada: bitboard clásico.** Los solvers conocidos de 7×6 usan un bitboard con una fila de centinela. En 8×7 eso requiere 8 × 8 = 64 bits, pero los números de JavaScript solo son enteros exactos hasta 53 bits, y `BigInt` es demasiado lento para millones de nodos. Si el benchmark del paso 7 muestra que el arreglo plano limita la profundidad, se evaluará un bitboard partido en dos enteros de 32 bits.

## 4. Algoritmo elegido y por qué

**Negamax con poda alfa-beta e iterative deepening**, con:

1. **Ordenamiento de jugadas**: primero la mejor jugada guardada en la tabla de transposición, después del centro hacia afuera: 3, 4, 2, 5, 1, 6, 0, 7. Las columnas centrales participan en más líneas posibles, así que suelen ser las mejores y producen más podas.
2. **Iterative deepening con control de tiempo**: se busca a profundidad 1, 2, 3… y se devuelve la mejor jugada de la última iteración completa. Si el tiempo se acaba a mitad de una iteración, esa iteración se descarta. La mejor jugada de la iteración anterior se explora primero en la siguiente. Al terminar cada iteración, el worker reporta su mejor jugada al hilo principal (la usa el watchdog, sección 4.1).
3. **Tabla de transposición con hash Zobrist**: evita recalcular posiciones a las que se llega por distinto orden de jugadas y guarda la mejor jugada para el ordenamiento.
   - Usa **dos claves de 32 bits**, porque los operadores de bits de JavaScript trabajan con 32 bits: una clave indexa la entrada y la otra verifica que sea la misma posición.
   - Cada entrada guarda la profundidad, el **tipo de cota** (exacta, inferior o superior) y la mejor jugada.
   - Los puntajes de victoria se **ajustan por la distancia a la raíz** al guardar y al leer, porque `GRANDE − ply` depende de dónde se encontró la posición.
4. **Atajos tácticos antes de buscar**: si hay una jugada que gana ya, se juega; si el rival gana en la próxima, se bloquea.
5. **Heurística** para nodos hoja. El tablero 8×7 tiene 107 ventanas de cuatro casillas (35 horizontales, 32 verticales, 40 diagonales). Cada ventana con fichas de un solo jugador suma según cuántas tiene (pesos iniciales: 2 fichas = +2, 3 fichas = +10; se ajustan con selfplay) y resta lo equivalente para el rival. Hay un bonus pequeño por fichas en las columnas centrales 3 y 4.
   - **No usamos** las reglas de paridad y zugzwang de la literatura de 7×6 (claimeven, amenazas en filas pares o impares): suponen columnas de altura par (6 filas) y aquí son 7.
6. **Victorias más rápidas valen más**: una victoria a distancia *ply* de la raíz puntúa `GRANDE − ply`. Así el bot cierra la partida en vez de dar vueltas y, si va a perder, pierde lo más tarde posible.
7. **Puntaje por columna en la raíz**: `chooseMove` devuelve `{ column, depth, score, scores[8], nodes, elapsedMs }`. Los `scores` se registran en cada turno y la app puede mostrarlos: explican por qué el bot jugó lo que jugó.

**Por qué este enfoque y no Monte Carlo (MCTS):** con 3 segundos por jugada, alfa-beta con buen ordenamiento alcanza profundidades altas en un juego con factor de ramificación 8. Además es determinista (más fácil de probar y de explicar en la exposición), y hay abundante material publicado para adaptarlo. MCTS queda como alternativa si alfa-beta resulta débil en la práctica.

**Fuentes** (se citan en `docs/TECNICO.md`):

- Pascal Pons, *Solving Connect 4: how to build a perfect AI* (blog.gamesolver.org): negamax, alfa-beta, ordenamiento por centro, tabla de transposición e iterative deepening. Lo adaptamos de 7×6 a 8×7: constantes, ventanas y orden de columnas.
- Chess Programming Wiki (chessprogramming.org), páginas *Alpha-Beta*, *Iterative Deepening*, *Transposition Table* y *Zobrist Hashing*: tipos de cota y ajuste de puntajes de victoria en la tabla.
- Victor Allis (1988), *A Knowledge-based Approach of Connect-Four*: origen de las reglas de paridad (claimeven) que decidimos no usar (punto 5).

### 4.1 Manejo del tiempo

- **Qué mide el árbitro.** El reloj arranca en `served_at`. Cuentan la bajada de la respuesta, el tiempo de búsqueda y la subida del `POST`; la espera del long polling no cuenta.
- **Qué medimos nosotros.** Medimos desde que **recibimos** el turno, con el reloj local. No comparamos contra `served_at`, porque los relojes pueden no estar sincronizados.
- **Presupuesto de búsqueda**: `budget = min(SEARCH_TIME_MS, deadline_ms − SAFETY_MS)`. Con los valores por defecto da 1,700 ms (3,000 − 1,300). Usamos `deadline_ms` de cada turno y no 3,000 fijo, porque el OpenAPI definitivo puede cambiar.
- **Corte de la búsqueda.** El motor revisa el reloj cada 4,096 nodos y aborta con una señal que se captura en la raíz. Al worker se le pasan los **milisegundos restantes**, no un instante absoluto: `performance.now()` tiene otro origen dentro de cada worker.
- **Watchdog en el hilo principal.** El hilo principal compite contra el worker con un temporizador de `budget + 500 ms` (2,200 ms por defecto). Si el temporizador gana, se envía la jugada de respaldo. Si el worker sigue sin responder, se termina (`terminate()`) y se crea otro.
- **Jugada de respaldo.** Ganar ya y bloquear se resuelven antes de buscar (sección 4, punto 4), así que el respaldo cubre el caso en que la búsqueda no entregó a tiempo. En este orden:
  1. La mejor jugada de la última iteración completa **con profundidad ≥ 2**. A profundidad 1 el motor todavía no ve la respuesta del rival, así que esa jugada no es confiable.
  2. Si no hay: ganar ya; si no se puede, bloquear.
  3. Si no: la primera columna en orden de centro que no le deje al rival una victoria inmediata (por ejemplo, jugar justo debajo de su amenaza).
  4. Si todas se la dejan: la primera columna legal en orden de centro.

  Todo se calcula en el hilo principal en microsegundos, con funciones de `game`, y siempre se verifica que la jugada esté en `legal_moves`.
- **Workers persistentes y calientes.** El worker del torneo y el de la app se crean al arrancar y hacen una búsqueda de calentamiento de unos 300 ms antes de pedir el primer turno. Así el arranque y el JIT en frío no se comen parte de los 3 s justo en la primera jugada.
- **Medición de punta a punta.** En cada turno se registra el tiempo desde la recepción hasta que sale el `POST`. Se valida en la laptop de la liga contra el mock. La calibración final sale del campo `ms` de `/api/games/{id}` en las prácticas del jueves (es el tiempo medido por el árbitro, red incluida). Con eso se ajusta `SEARCH_TIME_MS`.

## 5. Cliente del árbitro

Está basado en el cliente de referencia de las bases, con estas correcciones:

- **Arranque.** Lee `ARBITRO_URL` y `TEAM_TOKEN` del entorno; `MODE=arbiter` exige los dos. Al arrancar llama a `GET /api/me`: si responde 401, termina con un mensaje claro, antes de jugar. Los errores de configuración (falta una variable, 401 al arrancar) terminan con el código de salida 78, y el supervisor **no** relanza con ese código: relanzar no lo arregla y solo golpearía al árbitro cada 2 s. Al iniciar también imprime en el log el hash del commit que está corriendo.
- **Identidad y fuente de verdad.** Usa el campo `you` del turno para saber qué jugador es (no lo deduce por paridad). Toma `board` como fuente de verdad. `moves` y `legal_moves` sirven de verificación cruzada: si no coinciden, registra una advertencia.
- **Timeouts del lado del cliente:**
  - `GET /api/next` usa `AbortSignal.timeout((wait + 5) s)`. Si la conexión se cuelga, se corta y se vuelve a llamar, en vez de esperar para siempre y perder por ausencia.
  - `POST /api/move` usa como límite el tiempo que queda del plazo (mínimo 300 ms).
- **Envío de la jugada.** Si el `POST` falla por la red o por timeout, se reintenta **de inmediato** mientras queden más de 200 ms del plazo. Si el primer intento sí había llegado, el reintento recibe `409`, que no penaliza.
- **Sin deduplicación: el árbitro es la fuente de verdad.** Si `/api/next` entrega un turno, se responde, siempre. Si el árbitro vuelve a entregar un turno que ya contestamos, es porque para él sigue pendiente (por ejemplo, nuestro `POST` no llegó), e ignorarlo tendría dos efectos: un ciclo apretado, porque `/api/next` respondería al instante con el mismo turno una y otra vez, y la derrota por tiempo. Volver a enviar una jugada nunca penaliza: el peor caso es un `409`.
- **Caché de la última jugada.** Se guarda la columna elegida para el último `game_id` + `turn`. Si ese mismo turno reaparece, se reenvía esa columna al instante, sin volver a buscar, porque el reloj del árbitro ya está corriendo. No es una deduplicación: el turno se responde igual, solo que más rápido.
- **Freno ante un árbitro inconsistente.** Si el mismo turno reaparece después de que el árbitro respondió `409` a esa jugada, se espera 200 ms antes de volver a consultar y se registra una advertencia, para no golpear al árbitro en un ciclo sin pausa.
- **Respuestas del árbitro:**

  | Respuesta | Qué hace el bot |
  |---|---|
  | `200` (`playing`, `won`, `draw`) | Registra y sigue el ciclo |
  | `400` | Lo registra como error grave (la partida se perdió) y sigue el ciclo |
  | `409` | Lo ignora |
  | `401` durante la ejecución | No se apaga: registra el error con alerta visible y reintenta cada 5 s |
  | Error de red, `5xx` o respuesta que no es JSON en `/api/next` | Espera 1 s, luego 2 s, con un tope de 5 s (la regla de 30 s de ausencia lo permite) |

- **Juego limpio:**
  - Si `/api/next` responde `idle` en menos de 500 ms, se espera 500 ms antes de volver a llamar, para no golpear al árbitro en un ciclo sin pausa.
  - Hay una sola petición a la vez, nunca consultas en paralelo.
- **Una sola instancia con el token.** Solo la laptop de la liga corre `MODE=arbiter` con el token real. El modo por defecto es `api`.
- **Registro.** Cada turno se escribe en consola y en `logs/turns.jsonl` (ignorado por git): partida, tipo, rival, columna, profundidad, puntaje, `scores` por columna, ms desde la recepción hasta el `POST` y si se usó el respaldo. El token y los encabezados nunca se imprimen.
- **Adaptación al OpenAPI definitivo.** El mapeo de campos del árbitro vive solo en `client.js`.

## 6. API para la app web

| Método y ruta | Cuerpo | Respuesta |
|---|---|---|
| `GET /api/health` | — | `{ ok: true, version, commit }` |
| `POST /api/play` | `{ board: number[7][8], player: 1 \| 2, timeMs?: number, maxDepth?: number }` | `{ column, depth, score, scores, elapsedMs }` |
| `GET /api/replay/:gameId` (opcional) | — | Reenvía `GET {ARBITRO_URL}/api/games/{id}` (público, sin token). Solo acepta ids con letras, dígitos, `_` y `-`, para que nadie use el bot como intermediario hacia otras rutas |

- Se llama `/api/play` y no `/api/move` para no confundirlo con el endpoint del árbitro.
- **Validación del tablero**: dimensiones, valores, gravedad (sin fichas flotando), cantidad de fichas coherente con `player`, y que la partida no esté terminada. Si algo falla, responde `400` con un mensaje legible.
- **`timeMs` y `maxDepth`**: ambos son opcionales. `timeMs` se acota entre 50 y 1,700 ms y por defecto vale 1,700; `maxDepth` se acota entre 1 y 56 y por defecto no limita. Los niveles de dificultad de la app son solo estos parámetros: es el **mismo** `chooseMove` del torneo con otros límites, como exigen las bases, nunca otro bot. Limitar solo el tiempo no alcanza para un nivel fácil: con 100 ms el motor ya ve varias jugadas adelante y a una persona le cuesta ganarle.
- **Worker propio.** La API usa su propio worker, separado del del torneo.
- **Mismo origen.** Fastify sirve `web/dist` en el mismo puerto, así que no hace falta CORS. Escucha en `HOST=0.0.0.0` (Fastify escucha solo en `localhost` por defecto) y `PORT=3001`. El manual se reduce a "abrir `http://<ip>:3001`", también desde un teléfono.
- **Modo torneo.** Con `MODE=arbiter` la API no se levanta, así que la laptop de la liga no expone puertos en la red del evento.
- **Se quitó `POST /api/check`**: la app detecta el fin de la partida con `@fila-cero/game`.

## 7. Mock del árbitro

Es un servidor Fastify en `bot/mock/arbiterMock.js`. Exporta `startArbiterMock({ port, token, chaos })` para levantarlo dentro de las pruebas en el puerto 0 (un puerto libre al azar), y también se arranca a mano con `npm run mock` en el puerto 4000.

- **Endpoints**: `/api/next`, `/api/move`, `/api/practice`, `/api/me`, `/api/me/submission`, `/api/games/{id}` y `/api/standings`, según `contract/arbitro-openapi.json`.
- **Token**: revisa el encabezado `Authorization` y responde `401` si no coincide.
- **Rivales**: los dos bots de la casa con los nombres del OpenAPI, `casa-aleatorio` (juega al azar) y `casa-basico` (gana y bloquea cuatros inmediatos).
- **Long polling**: retiene `/api/next` hasta `wait` segundos (máximo 25) y responde `idle` si no hay turno.
- **Mismas reglas que el real**: mide desde `served_at` y responde `timeout`, `illegal_move` y `not_your_turn`. Da la partida por perdida si un turno no se recoge en 30 s.
- **Turnos consistentes**: tablero, `moves`, `turn`, `you` y `last_move` coherentes entre sí. Soporta varias partidas a la vez y entrega el turno pendiente más antiguo.
- **Modo caos** (`MOCK_CHAOS=1`): latencia aleatoria, conexiones cortadas a mitad de respuesta y errores `5xx` ocasionales, para probar los reintentos y los timeouts.
- **Contrato**: las pruebas validan las respuestas del mock contra los esquemas del OpenAPI con Ajv. El jueves se reemplaza el archivo por el definitivo, se corre `npm test` y las diferencias aparecen solas.

## 8. Pasos en orden, con criterio de listo

Primero un **esqueleto de punta a punta** (bot conectado al mock y app jugando contra el bot); después se mejora la fuerza del motor. Si el tiempo se acaba, al menos el bot está conectado: una desconexión da 0 de 25 puntos.

| # | Paso | Listo cuando | Responsable | Cuándo |
|---|---|---|---|---|
| 0 | Repo **público** nuevo; `PLAN_BACKEND.md`, `PLAN_FRONTEND.md` y `AGENTS.md` commiteados | Son los primeros commits del repo | Todos | Miércoles 4, tarde |
| 1 | Estructura raíz: workspaces, `vitest.config.js` con proyectos, `"test": "vitest run --coverage"`, `.nvmrc`, `.env.example`, `.gitignore` | En un clon limpio y **sin `.env`**, `npm install && npm test` termina (aunque haya cero pruebas) y genera el reporte | Edgar | Miércoles 4, tarde |
| 2 | `game/`: tablero, jugadas legales, victoria en 4 direcciones, empate, funciones sobre la grilla | Las pruebas pasan y la cobertura de `game/` es ≥ 90 % | Edgar | Miércoles 4, tarde |
| 3 | `engine/` v1: alfa-beta a profundidad fija y atajos tácticos | Gana en 1 cuando puede, bloquea en 1 y nunca devuelve una jugada ilegal | Oscar | Miércoles 4, tarde |
| 4 | Mock del árbitro y `arbiter/` (ciclo, reintentos, caché de la última jugada, timeouts) | El bot juega partidas completas contra el mock sin intervención, y las pruebas del cliente contra el mock en el puerto 0 pasan | Jonathan | Miércoles 4, tarde |
| 5 | `enginePool` (worker persistente con calentamiento y watchdog) y `api/` (`/api/health`, `/api/play`) | La app juega una partida completa contra el bot. Con un motor falso que se cuelga, el respaldo sale a tiempo | Jonathan (`enginePool`) y Edgar (`api/`) | **Hito A**: miércoles 4, tarde |
| 6 | Iterative deepening, presupuesto basado en `deadline_ms` y límite `maxDepth` | Ninguna búsqueda supera presupuesto + tolerancia en las pruebas. El bot completo juega partidas enteras contra el mock a través del worker, sin jugadas ilegales ni timeouts. El tiempo de punta a punta medido en la laptop de la liga queda en `docs/TECNICO.md`. **Se etiqueta `v-segura`** (sección 8.1) | Oscar | Miércoles 4, noche |
| 7 | Tabla de transposición y heurística mejorada, cada una detrás de una opción del motor (sección 8.1), y benchmark (nodos por segundo, profundidad media) | La prueba de equivalencia con y sin tabla pasa (sección 9.1). La v2 saca ≥ 60 % de los puntos contra la v1 en selfplay. Los números quedan en `docs/TECNICO.md` | Oscar | Miércoles 4, noche |
| 8 | Supervisor, `logs/turns.jsonl` y `npm start` (compila la web y la sirve desde el bot) | Con `kill -9` el bot vuelve en menos de 2 s. Un teléfono abre `http://<ip>:3001` y juega | Jonathan (supervisor y logs) y Edgar (`npm start`) | Miércoles 4, noche |
| 9 | `README.md` y borrador de `docs/TECNICO.md` (arquitectura, algoritmo, tiempo, benchmark, cobertura); `docs/IA_LOG.md` al día | Alguien que no escribió el README clona el repo y, siguiendo solo el README, instala, corre las pruebas y abre la app | Edgar (README), Oscar (TECNICO), Mariana (IA_LOG) | **Hito B**: miércoles 4, noche |
| 10 | Jueves 8:00–8:15: OpenAPI definitivo en `contract/`, URL y token | `npm test` pasa con el contrato nuevo. `GET /api/me` responde. Prácticas contra `casa-aleatorio` y `casa-basico` abriendo cada lado, sin jugadas ilegales ni timeouts. `SEARCH_TIME_MS` ajustado con el campo `ms` | Jonathan | Jueves 5 |
| 11 | 8:15–9:30: ajustes, amistosos y cierre de la documentación | `docs/TECNICO.md` tiene "Cambios respecto al plan" y el reporte de cobertura (≥ 80 % en `game/` y `engine/`). Hay 2–3 partidas reales elegidas para la exposición. Ensayo hecho: cada integrante explica la búsqueda, la heurística y el manejo del tiempo | Todos; Oscar coordina el ensayo | Jueves 5 |
| 12 | 9:30–9:45: decisión de motor (sección 8.1) y congelamiento (checklist en la sección 15) | Configuración del motor decidida con el minitorneo; `PUT /api/me/submission` registrado; `GET /api/me` muestra la entrega; la laptop de la liga corre exactamente ese commit | Jonathan | Jueves 5 |

**El paso 1 no puede atrasarse**, porque bloquea todo lo demás. Edgar lo cierra en 30 a 45 minutos con lo mínimo (workspaces, Vitest y un `npm test` que corre). Mientras tanto, el resto escribe a mano los casos de prueba de su área y prepara sus prompts.

**Trabajo en paralelo.** Con el contrato de `chooseMove` y el formato del tablero fijados en el paso 1, los pasos 2, 3 y 4 avanzan en paralelo (el cliente usa un `chooseMove` falso hasta que el motor esté listo). La app puede empezar el modo de dos personas en cuanto el paso 2 esté listo, y necesita `/api/play` del paso 5.

### 8.1 Versión de respaldo: `v-segura`

Son 13 pasos para un solo día, así que el plan asume que algo puede no llegar a tiempo:

- **Cuándo se crea.** En cuanto el paso 6 cumple su criterio de listo, se crea la etiqueta de git `v-segura`. Desde ese momento hay un bot que juega bien, a tiempo y sin jugadas ilegales, pase lo que pase con lo que venga después.
- **Las mejoras entran detrás de opciones.** La tabla de transposición y la heurística nueva se activan con opciones de `chooseMove` (por ejemplo, `{ tt: true, heuristic: "v2" }`), con un valor por defecto en `config.js`. `selfplay` ya necesita esas opciones para comparar versiones, así que no es trabajo extra.
- **Decisión a las 9:30.** Se corre `npm run selfplay` entre la configuración actual y la de `v-segura`, más `npm run test:integration`. Si la actual saca ≥ 60 % de los puntos (el criterio de 9.3) y la integración pasa sin jugadas ilegales ni timeouts, se queda. Si no, se cambia el valor por defecto a la configuración de `v-segura` en un último commit.
- **Qué commit se registra.** Siempre el último, no el de la etiqueta: todo lo que esté después del commit registrado no se evalúa, y en ese tramo quedan `docs/TECNICO.md`, el manual y las pruebas finales. Solo si el último commit no corre o `npm test` falla y no hay tiempo de arreglarlo, se registra directamente el commit de `v-segura`.
- La decisión y su motivo quedan en "Cambios respecto al plan" de `docs/TECNICO.md`.

Cada paso se cierra con commits pequeños que llevan el número del paso en el mensaje (por ejemplo, `paso 3: motor v1 con atajos tácticos`), para que el jurado pueda seguir el plan en el historial.

## 9. Validación

### 9.1 Pruebas automatizadas (`npm test`, exigidas por las bases)

`npm test` desde la raíz ejecuta `vitest run --coverage`: corre una sola vez, sin modo watch. Funciona en un clon limpio **sin `.env`, sin red y sin servidores externos**: el mock se levanta dentro de las pruebas. Las pruebas de tiempo usan presupuestos de 50–100 ms y tolerancias amplias, para que no fallen en una máquina más lenta. Meta: la suite completa termina en menos de 60 s.

- **Reglas**:
  - Caída de fichas, columna llena y columna fuera de rango.
  - Victoria horizontal, vertical y en las dos diagonales, incluidos los bordes.
  - Empate con 56 fichas, y que la jugada 56 que gana cuente como **victoria y no como empate**.
  - 5 en línea, una jugada que gana en dos direcciones a la vez, celdas ganadoras correctas, y conversión `fromGrid`/`toGrid` sin pérdida.
- **Algoritmo**:
  - Nunca devuelve una jugada ilegal: 300 posiciones válidas generadas con jugadas al azar desde el tablero vacío, con presupuesto corto.
  - Respeta el presupuesto: 100 ms más una tolerancia.
  - Responde bien con una sola columna disponible y con el tablero a una ficha de llenarse.
  - Gana en 1, bloquea en 1 y prefiere la victoria más rápida.
  - **Equivalencia de la tabla de transposición**: a profundidad fija, el puntaje de la raíz es idéntico con y sin tabla en un set de posiciones.
- **Cliente del árbitro** (contra el mock en el puerto 0, con `wait` de 0–1 s):
  - Interpreta `turn` e `idle` y construye bien el cuerpo de `POST /api/move`.
  - Maneja 200, 400, 409 y 401.
  - Un turno que reaparece se vuelve a responder (con la columna de la caché, sin buscar de nuevo), y el `POST` se reintenta tras un corte de red (modo caos).
  - Un turno que reaparece después de un `409` activa la espera de 200 ms y no genera un ciclo apretado.
  - Los timeouts funcionan cuando el mock se cuelga.
  - Respeta la espera mínima tras un `idle` y calcula el presupuesto a partir de `deadline_ms`.
  - Los fixtures salen de los ejemplos del OpenAPI.
  - Las respuestas del mock validan contra los esquemas del contrato.
- **Worker y watchdog**:
  - Con un motor falso que se cuelga, la jugada de respaldo sale antes de presupuesto + 500 ms.
  - Si el worker muere, se crea uno nuevo.
  - El código dentro del worker se mantiene mínimo, porque probablemente no se mida en la cobertura: el motor se prueba directo.
- **API** (con `fastify.inject`, sin abrir puertos): validación de entradas, forma de las respuestas, acotamiento de `timeMs` y `maxDepth`, y rechazo de ids inválidos en `/api/replay`.

**Cobertura**: un reporte unificado, con meta de **≥ 80 %** en `game/` y `engine/` (las bases piden 70 %). No se configuran umbrales que hagan fallar `npm test`; la meta se verifica en el paso 11 y queda en `docs/TECNICO.md`.

### 9.2 Integración (`npm run test:integration`, fuera de `npm test`)

El bot completo juega 20 partidas contra el mock (`casa-basico`), alternando quién abre, con `SEARCH_TIME_MS=200`. Se verifica que haya cero jugadas ilegales y cero timeouts, y se repite con `MOCK_CHAOS=1`.

### 9.3 Fuerza de juego (`npm run selfplay`)

No se mide con pruebas unitarias. El script enfrenta dos versiones del motor desde al menos 40 aperturas aleatorias (80 partidas; con menos, el resultado es ruido) de 2–4 jugadas, y cada apertura se juega con ambos colores. A profundidad fija, dos motores deterministas jugarían siempre las mismas 2 partidas; por eso se usan aperturas variadas. El presupuesto es de 200 ms por jugada para que termine en minutos. Un cambio **mejora** si saca ≥ 60 % de los puntos.

### 9.4 Operación

- `kill -9` al proceso: el supervisor lo levanta en menos de 2 s.
- Con un token inválido, el bot termina con código 78 y el supervisor no lo relanza.
- Se corta la red 10 s: el bot se recupera solo.
- Se verifica que el bot nunca imprime el token.

## 10. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El OpenAPI definitivo cambia el jueves | El bot no conecta o pierde por tiempo | Mapeo de campos solo en `arbiter/client.js`; presupuesto calculado con `deadline_ms`; pruebas de contrato que se corren con el archivo nuevo |
| El ejemplo de turno de las bases es inconsistente (`moves` no produce ese `board`; `turn` y `you` no coinciden con la cantidad de fichas) | Una lógica basada en el ejemplo falla | Usar `board` y `you` como fuente de verdad; consultar en el grupo de WhatsApp |
| La demo de la exposición ocurre **durante** la liga (9:45–10:45) | La búsqueda de la demo compite por CPU con el bot del torneo, o alguien cierra la laptop | Dos laptops: la de la liga (`MODE=arbiter`) no se toca; la demo corre en otra con `MODE=api` y sin token |
| Dos procesos corren con el mismo token | Se roban los turnos; puede jugar código viejo | Solo la laptop de la liga tiene el token; el modo por defecto es `api` |
| El `POST` falla por la red y el turno queda sin responder | Derrota por tiempo | Sin deduplicación: un turno que reaparece siempre se responde; reintento inmediato dentro del plazo |
| Una deduplicación ignora un turno que sigue pendiente | Ciclo apretado contra `/api/next` y derrota por tiempo | No se deduplica; la caché solo acelera la respuesta |
| Las mejoras del motor no llegan a tiempo o juegan peor | Bot más débil o roto en la liga | Etiqueta `v-segura` y decisión con minitorneo a las 9:30 (sección 8.1) |
| Una conexión de long polling se cuelga | Derrota por ausencia a los 30 s | `AbortSignal.timeout` en todas las llamadas |
| El worker se cuelga o muere | Derrota por tiempo | Watchdog en el hilo principal, jugada de respaldo y re-creación del worker |
| El proceso del bot se cae | Derrota por ausencia en el resto de las partidas | Supervisor que lo relanza en menos de 2 s |
| JIT en frío en la primera jugada | Primera búsqueda lenta | Worker persistente con calentamiento al arrancar |
| `npm test` se cuelga, falla o tarda en la máquina del jurado | Se pierden hasta 7 puntos objetivos | `vitest run`; sin `.env` ni red; presupuestos cortos y tolerancias amplias; integración y selfplay fuera de `npm test` |
| Reloj local desfasado respecto del árbitro | Cálculo de tiempo erróneo | Medir desde la recepción, no desde `served_at` |
| Bug del motor en una posición rara | Derrota por jugada ilegal | Respaldo validado contra `legal_moves` |
| Corte de internet o laptop suspendida durante la liga | Derrota por desconexión | Reintentos automáticos; checklist de la sección 15 (corriente, cable, sin suspensión) |
| La IA adapta mal código de 7×6 (dimensiones, bitboards, centro, **reglas de paridad para altura par**) | Bot débil o con errores | Pruebas de reglas escritas antes que el motor; constantes solo desde `game`; heurísticas nuevas solo si ganan en selfplay |
| La IA escribe mal la tabla de transposición (cotas guardadas como exactas, puntajes de victoria sin ajustar) | Jugadas erróneas difíciles de detectar | Prueba de equivalencia con y sin tabla a profundidad fija |
| Token filtrado en el repo o proyectado en la exposición | Hay que pedir token nuevo; mala imagen | `.env` en `.gitignore`; `.env.example` sin valores; el bot nunca imprime el token; no proyectar la terminal de la laptop de la liga |

## 11. Qué se delega a la IA y cómo se verifica

| Tarea | Qué hace la IA | Cómo verificamos |
|---|---|---|
| Esqueleto, configuración, scripts | Lo genera completo | `npm install && npm test` en un clon limpio, en las máquinas de todos |
| Reglas del juego | Propone la implementación | Las pruebas de reglas las diseñamos nosotros, con casos dibujados a mano (incluida la jugada 56 que gana) |
| Motor de búsqueda | Adapta alfa-beta e iterative deepening a 8×7 | Pruebas tácticas, revisión línea por línea de la poda, benchmark |
| Tabla de transposición | La implementa | Prueba de equivalencia con y sin tabla; revisión explícita de los tipos de cota y del ajuste de puntajes de victoria |
| Heurística | Propone pesos | Selfplay contra la versión anterior (≥ 60 % de los puntos) |
| Cliente del árbitro | Lo adapta del cliente de referencia | Pruebas contra el mock, incluido el modo caos; revisamos que ningún turno entregado por el árbitro quede sin responder |
| Mock del árbitro | Lo genera desde el OpenAPI | Sus respuestas validan contra los esquemas con Ajv |
| Pruebas | Propone casos adicionales | Revisamos que verifiquen comportamiento y no solo que "no explote" |
| Documentación | Primer borrador | Lo revisa alguien que no escribió esa parte |

Cada integrante registra en `docs/IA_LOG.md` los prompts relevantes, qué devolvió mal la IA y cómo lo detectamos. Es la materia prima de la exposición. La primera entrada es esta revisión del plan.

## 12. Reglas para el agente de IA (`AGENTS.md`)

- La estructura y la regla de dependencias de la sección 3.
- Los comandos: `npm install`, `npm test`, `npm run dev`, `npm start`, `npm run mock`, `npm run liga`, `npm run test:integration` y `npm run selfplay`.
- **No editar `PLAN_*.md`** después del primer commit de código. Las desviaciones van a `docs/TECNICO.md`.
- No debilitar ni borrar pruebas para que pasen: si una prueba falla, se corrige el código o se discute con el equipo.
- Nunca escribir en el repositorio el token, el `.env` ni la carpeta `logs/`, y nunca imprimir el token.
- Las constantes de tamaño se importan de `game`; ningún 7, 8 o 56 suelto.
- Commits pequeños con el número del paso del plan en el mensaje.

## 13. Responsables

| Persona | Responsabilidad principal |
|---|---|
| Oscar Francisco Oliva Monterroso | Motor, heurística, tabla de transposición, selfplay y benchmark. Coordina `docs/TECNICO.md` y el ensayo de la exposición |
| Jonathan Alexander Lima Ruiz | Cliente del árbitro, mock, `enginePool` y watchdog, supervisor y logs. Opera la **laptop de la liga** |
| Edgar Cil | Monorepo, `game/` y sus pruebas, configuración de Vitest y cobertura, API, `npm start` y `README.md` |
| Camila Andrea Jiménez López | Aplicación web (ver `PLAN_FRONTEND.md`). Opera la **laptop de la demo** |
| Mariana Baez | Estilos, accesibilidad y responsivo de la app, `docs/MANUAL.md` con capturas. Coordina `docs/IA_LOG.md` |

Cada responsable revisa el código de otra área antes de darla por lista: nadie aprueba su propio paso. Así todos conocen todo el repositorio, porque el jurado puede preguntarle a cualquiera.

## 14. Variables de entorno

| Variable | Uso | Valor por defecto o ejemplo |
|---|---|---|
| `MODE` | `api`, `arbiter` o `both` | `api` |
| `ARBITRO_URL` | URL base del árbitro | `http://localhost:4000` (mock) |
| `TEAM_TOKEN` | Token del equipo | (nunca en el repo) |
| `SEARCH_TIME_MS` | Tope del presupuesto de búsqueda | `1700` |
| `SAFETY_MS` | Margen que se resta a `deadline_ms` | `1300` |
| `HOST` | Interfaz de la API | `0.0.0.0` |
| `PORT` | Puerto de la API y de la app | `3001` |
| `LOG_DIR` | Carpeta de `turns.jsonl` | `logs` |
| `MOCK_CHAOS` | Activa el modo caos del mock | `0` |

## 15. Operación del jueves

**Laptop de la liga** (Jonathan):

1. Conectada a corriente, por cable de red si se puede, con la suspensión desactivada (en macOS, `caffeinate -dims` en otra terminal), notificaciones apagadas y **la tapa abierta**.
2. A las 9:30: decisión de motor según la sección 8.1. A las 9:30–9:45: commit final, `git push`, `PUT /api/me/submission` con la URL y el hash del **último** commit.
3. Clonar o hacer `git checkout <hash>` de ese commit exacto, `npm ci`, y `MODE=arbiter npm run liga` (que arranca con el supervisor). El log de arranque muestra el mismo hash.
4. `GET /api/me` muestra la entrega registrada.
5. Desde las 9:45 nadie toca esa laptop ni su terminal, y nadie más corre `MODE=arbiter` con el token.

**Laptop de la demo** (Camila): `npm start` con `MODE=api` y sin `TEAM_TOKEN`. Se prueba antes de las 9:45 con el proyector o la pantalla de la sala, si se puede.

## 16. Preparación de la exposición

La exposición vale 15 puntos y ocurre **mientras corre la liga**, así que se prepara como un entregable más.

**Guion de 10 minutos (propuesta):**

| Tiempo | Contenido | Quién |
|---|---|---|
| 0:00–2:00 | Demo en la laptop de la demo: una partida en nivel Fácil (se invita a alguien del jurado a jugar) y una jugada en Difícil mostrando el análisis del bot | Camila |
| 2:00–5:00 | Cómo piensa el bot: alfa-beta con un ejemplo de poda, iterative deepening, la heurística de las 107 ventanas y el manejo del tiempo, sobre una posición real tomada de `logs/turns.jsonl` con sus `scores` por columna | Oscar |
| 5:00–8:00 | Cómo usamos la IA: qué le pedimos, qué devolvió mal, cómo lo detectamos y qué verificamos | Mariana, con Jonathan para la parte de robustez |
| 8:00–10:00 | Preguntas | Todos |

**Material que se junta durante el desarrollo:**

- 2 o 3 posiciones reales de las prácticas o amistosos con los puntajes por columna, para responder "¿por qué el bot jugó ahí?".
- Los números del benchmark (nodos por segundo, profundidad media), la cobertura y, si ya hay, la posición en la liga.
- Las mejores historias de `docs/IA_LOG.md`. Candidatas ya registradas: el ejemplo de turno inconsistente de las bases; el bitboard de 64 bits que no cabe en JavaScript; el ajuste de puntajes de victoria en la tabla de transposición; la deduplicación que primero podía perder turnos y después podía trabar el bot, hasta que decidimos eliminarla (dos revisiones del plan); las reglas de paridad de 7×6 que no aplican a 7 filas; y la doble llamada al bot por StrictMode en la app.

**Ensayo** (paso 11): cada integrante explica en un minuto la búsqueda, la heurística y el manejo del tiempo, y después hay una ronda de preguntas cruzadas del tipo "¿qué pasa si el worker se cuelga?", "¿por qué no Monte Carlo?" o "¿qué hizo mal la IA?". Nadie habla del código leyendo la pantalla.
