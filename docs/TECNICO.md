# Documentación técnica

**Fila Cero** (Equipo 2) · Challenge Cuatro en línea 8×7

Este documento describe lo que se construyó, cómo funciona el algoritmo, cómo se maneja el tiempo, qué se midió y qué cambió respecto a `PLAN_BACKEND.md` y `PLAN_FRONTEND.md`.

## 1. Arquitectura

```
                    ┌──────────────────────────── bot (un proceso Node.js) ───────────────────────────┐
 Árbitro  ◄──HTTP── │ arbiter/loop ──► arbiter/turnPolicy ──► worker/enginePool ══► worker del torneo │
 (long polling)     │   client.js        presupuesto,          cola, reinicio        engine/chooseMove │
                    │                    watchdog, respaldo                                           │
 App web  ◄──HTTP── │ api/server  ─────────────────────────► worker/enginePool ══► worker de la app   │
 (navegador)        │   /api/play, web/dist                                          engine/chooseMove │
                    └─────────────────────────────────────────────────────────────────────────────────┘
                                       game/ (reglas puras) lo usan el motor, el bot y la app
```

| Módulo | Responsabilidad | Depende de |
|---|---|---|
| `game/` | Tablero (`Board`: `Int8Array(56)` + `heights[8]`), jugadas legales, victoria con celdas ganadoras, empate, funciones sobre `board[fila][columna]` | nada |
| `bot/src/engine/` | Búsqueda (`search.js`), heurística (`evaluate.js`), tabla de transposición (`tt.js`), reloj (`clock.js`), `chooseMove` (`index.js`) | `game` |
| `bot/src/worker/` | Corre el motor en un `worker_thread` persistente, con cola y re-creación | `engine` |
| `bot/src/arbiter/` | Cliente HTTP con timeouts, ciclo de long polling, política de turno (presupuesto, watchdog, respaldo) | `game`, motor vía worker |
| `bot/src/api/` | Fastify: `/api/health`, `/api/play`, `/api/replay/:gameId` y los archivos de `web/dist` | `game`, motor vía worker |
| `bot/mock/` | Árbitro simulado según el OpenAPI 1.0.1, con modo caos | `game` |
| `web/` | App React: reducer de la partida, `useBotTurn`, componentes | `game` |

El motor no sabe nada de HTTP ni de hilos: se prueba llamando a `chooseMove` directamente. El torneo y la app usan **workers distintos**, así una partida contra una persona nunca retrasa un turno del torneo.

## 2. Reglas y representación del tablero

- Formato de intercambio (árbitro, API y app): `board[fila][columna]`, 7 filas × 8 columnas, fila 0 abajo, valores 0, 1 y 2.
- Formato interno: `Int8Array(56)` con índice `fila * 8 + columna` y `heights[8]` con la próxima fila libre de cada columna. Jugar y deshacer son O(1).
- Victoria: después de cada jugada se revisan las 4 direcciones alrededor de la última ficha. Si una jugada completa dos líneas, se devuelven las celdas de ambas.
- La app y la API usan las mismas reglas a través de `fromGrid`, `applyMove`, `outcome` y `validateGrid`. No hay una segunda implementación.
- **Bitboard descartado**: en 8×7 con fila centinela hacen falta 64 bits, y JavaScript solo tiene enteros exactos hasta 53. `BigInt` es demasiado lento.

## 3. El algoritmo

### 3.1 Búsqueda

**Negamax con poda alfa-beta.** Negamax es minimax escrito desde el punto de vista del jugador que mueve: el puntaje de una posición para mí es el negativo del puntaje para el rival. La poda alfa-beta deja de explorar una jugada en cuanto queda demostrado que el rival tiene una respuesta peor para nosotros que otra alternativa ya vista.

En cada nodo, en este orden:

1. Si el jugador que mueve tiene una jugada que gana ya, devuelve `GRANDE − (ply + 1)`. Así una victoria más cercana vale más y, si se va a perder, el bot elige perder lo más tarde posible.
2. Si quedan 0 o 1 casillas y no hay victoria inmediata, es empate (0).
3. En la profundidad 0 devuelve la heurística.
4. Consulta la tabla de transposición (sección 3.3).
5. Explora las columnas: primero la mejor según la tabla y después del centro hacia afuera, 3, 4, 2, 5, 1, 6, 0, 7. Las columnas centrales participan en más líneas y suelen producir más podas.

**Iterative deepening**: se busca a profundidad 1, 2, 3… y se conserva la mejor jugada de la última iteración completa. La mejor jugada de cada iteración se explora primero en la siguiente. Si encuentra una victoria o una derrota forzada, se detiene.

**Atajos tácticos antes de buscar**: si se puede ganar ya, se juega; si el rival gana en la próxima, se bloquea; si solo queda una columna, se juega sin buscar.

### 3.2 Heurística

El tablero 8×7 tiene **107 ventanas** de cuatro casillas: 35 horizontales, 32 verticales y 40 diagonales. Cada ventana con fichas de un solo jugador suma 2 si tiene dos fichas y 10 si tiene tres, a favor de quien las tiene. Cada ficha en las columnas centrales (3 y 4) suma 3.

**No usamos** las reglas de paridad y zugzwang de la literatura de 7×6 (claimeven, amenazas en filas pares o impares): suponen columnas de altura par (6 filas), y aquí tienen 7.

### 3.3 Tabla de transposición

En Cuatro en línea se llega a la misma posición por distintos órdenes de jugadas. La tabla guarda el resultado de cada posición para no recalcularla.

- **Hash Zobrist con dos claves de 32 bits**: cada combinación (jugador, casilla) tiene dos números aleatorios fijos, y el hash es el XOR de los de las fichas presentes. Se actualiza en O(1) al jugar y al deshacer. Una clave elige la entrada (2²¹ entradas) y la otra verifica que sea la misma posición. Son dos claves porque los operadores de bits de JavaScript trabajan con 32 bits.
- Cada entrada guarda la profundidad restante, el **tipo de cota** (exacta, inferior o superior, según si el valor quedó dentro, por encima o por debajo de la ventana alfa-beta) y la mejor jugada.
- **Ajuste de puntajes de victoria**: `GRANDE − ply` depende de la distancia a la raíz. Al guardar se convierte a distancia desde el nodo (se suma `ply`) y al leer se vuelve a convertir (se resta). Sin este ajuste, una victoria encontrada por un camino se reutiliza con un puntaje equivocado desde otro.
- La tabla es persistente dentro del worker del torneo: lo aprendido en un turno sirve en el siguiente.

**Cómo verificamos que está bien**: a profundidad fija, el puntaje de la raíz tiene que ser idéntico con y sin tabla. La prueba lo comprueba en 25 posiciones al azar, a profundidades 4 y 6.

### 3.4 Fuentes

- Pascal Pons, *Solving Connect 4: how to build a perfect AI* (blog.gamesolver.org): negamax, alfa-beta, orden por centro, tabla de transposición e iterative deepening. Lo adaptamos a 8×7: constantes, ventanas, orden de columnas y un arreglo plano en lugar de su bitboard.
- Chess Programming Wiki (chessprogramming.org): *Alpha-Beta*, *Iterative Deepening*, *Transposition Table* y *Zobrist Hashing*, de donde salen los tipos de cota y el ajuste de puntajes de victoria.
- Victor Allis (1988), *A Knowledge-based Approach of Connect-Four*: origen de las reglas de paridad que decidimos no usar.

## 4. Manejo del tiempo

El árbitro da `deadline_ms` (3,000 ms) desde `served_at`. Ese reloj arranca en el servidor, así que cuentan la bajada del turno, la búsqueda y la subida del `POST`. No comparamos contra `served_at` porque los relojes pueden no estar sincronizados: medimos desde que **recibimos** el turno.

| Tramo | Valor por defecto |
|---|---|
| Presupuesto de búsqueda: `min(SEARCH_TIME_MS, deadline_ms − SAFETY_MS) − tiempo ya transcurrido` | 1,700 ms |
| El motor revisa el reloj | cada 4,096 nodos |
| Watchdog en el hilo principal | presupuesto + 500 ms |
| Tiempo máximo del `POST` | lo que quede del plazo (mínimo 300 ms) |
| Reintentos del `POST` ante fallas de red | mientras queden más de 200 ms |

- **Watchdog**: el hilo principal compite el resultado del worker contra un temporizador. Si el temporizador gana (worker colgado o con error), envía la jugada de respaldo, termina el worker y crea otro.
- **Jugada de respaldo**, en orden: la mejor jugada de la última iteración completa con profundidad ≥ 2; ganar ya; bloquear; la primera columna desde el centro que no le deje al rival una victoria justo encima; la primera legal. Siempre se valida contra `legal_moves`.
- **Worker caliente**: al arrancar, cada worker hace una búsqueda de 300 ms para que V8 compile el código antes del primer turno real.

**Medición**: con 1,700 ms de búsqueda, el mock midió **1,703 a 1,711 ms** desde `served_at` hasta la jugada (en la misma laptop, sin red). Con caos (latencia de hasta 150 ms y respuestas perdidas) y 200 ms de búsqueda, el peor caso de punta a punta fue 427 ms. El jueves se calibra `SEARCH_TIME_MS` con el campo `ms` de `GET /api/games/{id}` en las prácticas contra el árbitro real.

## 5. Cliente del árbitro

| Situación | Qué hace el bot |
|---|---|
| `/api/next` responde `turn` | Valida la coherencia (`moves` contra `board`, `turn`, `legal_moves`) y registra una advertencia si algo no cuadra. Usa `board` y `you` como fuente de verdad |
| `/api/next` responde `idle` en menos de 500 ms | Espera hasta completar 500 ms antes de volver a preguntar |
| `/api/next` se cuelga | `AbortSignal.timeout` corta a los `wait + 5` s y vuelve a preguntar |
| Error de red, `5xx` o respuesta no JSON en `/api/next` | Espera 1 s, 2 s, 4 s, con un tope de 5 s |
| `POST` 200 | Registra el turno y sigue |
| `POST` 400 `illegal_move` o `timeout` | Partida perdida: error grave en el log |
| `POST` 400 `validation` | Bug nuestro (cuerpo inválido); no penaliza según el OpenAPI 1.0.1 |
| `POST` 409 (`not_your_turn`, `unknown_game`) | No penaliza; si el mismo turno reaparece, espera 200 ms antes de reenviar |
| `POST` falla por red | Reintenta de inmediato dentro del plazo |
| 401 al arrancar | Termina con el código 78; el supervisor no lo relanza |
| 401 durante la ejecución | Registra el error y reintenta cada 5 s |

**Sin deduplicación**: si el árbitro entrega un turno, se responde, aunque ya lo hayamos contestado (el `POST` pudo no llegar). Se guarda la última columna enviada para reenviarla sin volver a buscar. Reenviar nunca penaliza: el peor caso es un 409.

## 6. API para la app

| Ruta | Detalle |
|---|---|
| `GET /api/health` | `{ ok, version, commit }` |
| `POST /api/play` | `{ board, player, timeMs?, maxDepth? }` → `{ column, depth, score, scores, elapsedMs }`. Valida dimensiones, valores, gravedad, que sea el turno de `player` y que la partida no haya terminado. `timeMs` se acota a 50–1,700 y `maxDepth` a 1–56 |
| `GET /api/replay/:gameId` | Reenvía `GET /api/games/{id}` del árbitro; solo acepta ids con letras, dígitos, `_` y `-` |

Los niveles de dificultad de la app son el mismo `chooseMove` con otros límites: Fácil (profundidad 2), Medio (6) y Difícil (1,700 ms sin límite de profundidad).

## 7. Mediciones

| Medición | Resultado | Cómo repetirla |
|---|---|---|
| Profundidad media en 1,700 ms (7 posiciones) | 10.9 sin tabla, **13.6 con tabla** | `npm run benchmark` |
| Nodos por segundo | ~515 mil sin tabla, ~617 mil con tabla | `npm run benchmark` |
| Selfplay con tabla contra sin tabla (80 partidas, 200 ms por jugada) | 50 victorias, 4 empates, 26 derrotas: **65 % de los puntos** | `npm run selfplay` (52 s en 8 hilos) |
| Integración contra `casa-basico` (20 + 20 partidas, con y sin caos) | 40 victorias; 0 ilegales, 0 timeouts, 0 ausencias, 0 respaldos | `npm run test:integration` |
| Relanzamiento con `kill -9` | 1.54 s hasta volver a esperar turnos | manual, ver sección 9.4 del plan |

Mediciones hechas en una MacBook con Node 24.9. Antes de la liga se repiten en la laptop que juega.

## 8. Pruebas y cobertura

`npm test` corre 106 pruebas en tres proyectos de Vitest (`game` y `bot` en Node, `web` en jsdom).

| Carpeta | Líneas cubiertas |
|---|---|
| `game/src` (reglas) | 100 % |
| `bot/src/engine` (algoritmo) | 100 % |
| `bot/src/api` | 100 % |
| `bot/src/arbiter` | 89.9 % |
| `bot/src/worker` | 87.5 % (`engineWorker.js` corre en otro hilo y v8 no lo mide; el motor se prueba directo) |
| Total | 88.3 % |

`bot/src/index.js` y `bot/src/log.js` (arranque y consola) no tienen pruebas unitarias. Se verificaron a mano contra el mock y con el supervisor.

Qué se prueba, en resumen:

- **Reglas**: caída de fichas, columna llena y fuera de rango, las cuatro direcciones en los bordes, empate con 56 fichas, jugada 56 que gana, cinco en línea, victoria en dos direcciones, validación de tableros.
- **Algoritmo**: gana y bloquea en 1, doble amenaza puntuada como victoria en 3, columnas que regalan la victoria, presupuesto de tiempo, una sola columna, tablero a una ficha de llenarse, 300 posiciones al azar sin jugadas ilegales, equivalencia de la tabla.
- **Cliente del árbitro**, contra el mock en el puerto 0 y con las respuestas validadas contra el OpenAPI con Ajv: turnos, idle, 200, 400, 401, 409, `POST` perdido, `/next` colgado, `5xx` y el ejemplo inconsistente del contrato.
- **Worker**: motor real contra el mock; worker falso que se cuelga, muere o falla.
- **App**: reducer, cliente con error, timeout y cancelación, y la app con StrictMode (una sola llamada por turno, aviso de columna llena, línea ganadora, error y reintento).

## 9. Cambios respecto al plan

| Cambio | Motivo |
|---|---|
| Responsables: todos los pasos los hizo Jonathan con Claude Code la noche del miércoles 4 | El paso 1 bloqueaba al resto y no estaba hecho a las 20:40. El equipo revisa y ajusta su parte el jueves |
| Contrato: el árbitro publicó el OpenAPI 1.0.1 | Un 400 `validation` no penaliza (lo tratamos como bug propio, no como derrota); 409 también puede ser `unknown_game`; `/api/me` trae `phase` y `standing` puede ser `null`; nueva fase `frozen`; la entrega valida la URL y el hash |
| Pasos 3 y 6 en un solo commit | Los hizo la misma persona, sin una versión intermedia útil |
| `v-segura` en `33a19a3`, después del paso 5 | El criterio (partidas completas contra el mock a través del worker) se cumplió recién ahí. Una primera etiqueta puesta antes de tiempo se borró |
| La API no usa la tabla de transposición cuando limita la profundidad | Si no, el nivel Fácil heredaría búsquedas profundas de partidas anteriores en el mismo worker |
| El worker no hace calentamiento después de un reinicio | Un turno que llegue justo en ese momento quedaría en cola detrás de esos 300 ms |
| `useBotTurn` arranca el pedido en un `setTimeout(0)` que el cleanup cancela | Con StrictMode, el primer montaje se cancela antes de enviar nada: una sola llamada por turno, sin pedidos cancelados en la pestaña Network |
| Heurística v2 no implementada | La tabla de transposición ya cumplió el criterio de mejora; los pesos iniciales (2, 10 y 3) quedan como están |
| El mock no implementa `/api/standings`, `/api/state`, `/api/live` ni la lista `/api/games` | El bot no las usa |
| Ajv con `strict: false` y `ajv-formats` | El OpenAPI usa `discriminator` y `example`, que no son JSON Schema, y formatos `date-time` y `uri` |
| Dos módulos CSS compartidos (`Board` y `Panels`) en lugar de uno por componente | Los componentes del tablero comparten estilos; separarlos solo duplicaba reglas |
| `npm run dev` usa `&` para levantar el bot y Vite | Sin dependencias extra; no funciona en la terminal de Windows (`npm start` sí) |
| `npm run selfplay` corre en paralelo con workers | 80 partidas en 52 s, para que la decisión de las 9:30 entre en el tiempo (IA-06) |

## 10. Pendientes para el jueves

- Reemplazar `bot/contract/arbitro-openapi.json` por el que sirve el árbitro en `/api/openapi.json` y correr `npm test`.
- Prácticas contra `casa-aleatorio` y `casa-basico` abriendo cada lado, y calibrar `SEARCH_TIME_MS` con el campo `ms`.
- Repetir `npm run benchmark` y `npm run test:integration` en la laptop de la liga.
- Capturas para `docs/MANUAL.md` y prueba del manual con una persona sin perfil técnico.
- Probar el nivel Fácil con alguien de fuera del equipo; si no logra ganar, bajar a profundidad 1.
