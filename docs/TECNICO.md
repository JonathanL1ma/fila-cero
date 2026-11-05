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
- Victoria: después de cada jugada se revisan las 4 direcciones alrededor de la última ficha. Si una jugada completa dos líneas, se devuelven las celdas de ambas (`winningCellsAt`, para la app). La búsqueda usa `completesLine`, que solo responde sí o no y no crea arreglos: es la misma regla, sin el costo de armar la lista de celdas en cada nodo.
- La app y la API usan las mismas reglas a través de `fromGrid`, `applyMove`, `outcome` y `validateGrid`. No hay una segunda implementación.
- **Bitboard descartado**: en 8×7 con fila centinela hacen falta 64 bits, y JavaScript solo tiene enteros exactos hasta 53. `BigInt` es demasiado lento.

## 3. El algoritmo

### 3.1 Búsqueda

**Negamax con poda alfa-beta.** Negamax es minimax escrito desde el punto de vista del jugador que mueve: el puntaje de una posición para mí es el negativo del puntaje para el rival. La poda alfa-beta deja de explorar una jugada en cuanto queda demostrado que el rival tiene una respuesta peor para nosotros que otra alternativa ya vista.

En cada nodo, en este orden:

1. Si el jugador que mueve tiene una jugada que gana ya, devuelve `GRANDE − (ply + 1)`. Así una victoria más cercana vale más y, si se va a perder, el bot elige perder lo más tarde posible. Este chequeo se salta cuando el padre ya filtró sus jugadas en el paso 5: en ese caso se sabe que no hay victoria inmediata.
2. Si quedan 0 o 1 casillas y no hay victoria inmediata, es empate (0).
3. En la profundidad 0 devuelve la heurística, que ya está calculada (sección 3.2).
4. Consulta la tabla de transposición (sección 3.3).
5. **Descarta las jugadas que pierden de inmediato** (técnica de Pascal Pons, `possibleNonLosingMoves` en su solver). Si el rival tiene dos victorias inmediatas, la posición está perdida y devuelve `−(GRANDE − ply − 2)`. Si tiene una, la única jugada posible es taparla. Y nunca se juega justo debajo de una casilla donde el rival gana. Si no queda ninguna jugada, también está perdida. No cambia el valor minimax, solo poda: una prueba lo compara columna por columna con un negamax sin poda.
6. Explora las columnas que quedan: primero la mejor según la tabla y después del centro hacia afuera, 3, 4, 2, 5, 1, 6, 0, 7. Las columnas centrales participan en más líneas y suelen producir más podas.

**Iterative deepening**: se busca a profundidad 1, 2, 3… y se conserva la mejor jugada de la última iteración completa. La mejor jugada de cada iteración se explora primero en la siguiente. Si encuentra una victoria o una derrota forzada, se detiene.

**Atajos tácticos antes de buscar**: si se puede ganar ya, se juega; si el rival gana en la próxima, se bloquea; si solo queda una columna, se juega sin buscar.

### 3.2 Heurística

El tablero 8×7 tiene **107 ventanas** de cuatro casillas: 35 horizontales, 32 verticales y 40 diagonales. Cada ventana con fichas de un solo jugador suma 2 si tiene dos fichas y 10 si tiene tres, a favor de quien las tiene. Cada ficha en las columnas centrales (3 y 4) suma 3.

**Evaluación incremental.** Recorrer las 107 ventanas en cada hoja se llevaba el 71 % del tiempo de búsqueda (perfil de CPU con `node --cpu-prof`). Ahora el puntaje se mantiene jugada a jugada: cada casilla pertenece a lo sumo a 16 ventanas, y al poner o quitar una ficha solo se actualizan esas. `evaluate()` queda como versión de referencia; una prueba verifica que las dos coinciden en cada paso de 2,000 jugadas y deshacer al azar.

**Paridad de amenazas: probada y descartada.** En 7×6 se usa que el primer jugador quiere amenazas en filas impares y el segundo en pares (Allis). Con una sola columna libre y la amenaza en la fila *r* (contando desde 1), quedan *H − r + 2* casillas vacías, y como el tablero tiene un total par de casillas, al jugador 1 le toca mover cuando quedan pares. Con *H = 6* sale la regla clásica; con *H = 7* **se invierte**: el jugador 1 quiere amenazas en filas pares. Implementamos una bonificación por amenazas según la fila y la medimos en duelos de 120 partidas contra el motor sin bonificación: regla derivada con peso 30, 47.1 %; regla clásica de 7×6, 43.8 %; derivada con peso 10, 54.2 %. Ninguna llega al 60 % ni sale del margen de error (±8.9), así que no se usa: a la profundidad que alcanzamos, la búsqueda ya ve lo que la bonificación intenta anticipar.

### 3.3 Tabla de transposición

En Cuatro en línea se llega a la misma posición por distintos órdenes de jugadas. La tabla guarda el resultado de cada posición para no recalcularla.

- **Hash Zobrist con dos claves de 32 bits**: cada combinación (jugador, casilla) tiene dos números aleatorios fijos, y el hash es el XOR de los de las fichas presentes. Se actualiza en O(1) al jugar y al deshacer. Una clave elige la entrada (2²¹ entradas) y la otra verifica que sea la misma posición. Son dos claves porque los operadores de bits de JavaScript trabajan con 32 bits.
- **Los números salen de mulberry32, no de xorshift.** Con el generador lineal original, cada número de la segunda tabla era una transformación fija del de la primera, así que la segunda clave se deducía de la primera y no verificaba nada: en 300 mil tableros al azar, los 8 choques de la primera clave lo fueron también de la segunda. Con mulberry32, 0 de 11. Una prueba lo vigila.
- **Reemplazo por generaciones.** Cada llamada a `chooseMove` abre una generación, y una entrada profunda solo se protege del reemplazo si es de la búsqueda actual. La regla anterior protegía para siempre las entradas profundas: el worker del torneo vive toda la liga, y tras 8 partidas sin limpiar la tabla llegar a profundidad 14 costaba 3.2 veces más nodos (2.05 → 6.50 millones). Con generaciones no se degrada (1.27 → 1.28 millones).
- **Tipo de cota contra la ventana ajustada.** Si la tabla subió alfa y la búsqueda no lo supera, el resultado se guarda como cota superior y no como valor exacto.
- Cada entrada guarda la profundidad restante, el **tipo de cota** (exacta, inferior o superior, según si el valor quedó dentro, por encima o por debajo de la ventana alfa-beta) y la mejor jugada.
- **Ajuste de puntajes de victoria**: `GRANDE − ply` depende de la distancia a la raíz. Al guardar se convierte a distancia desde el nodo (se suma `ply`) y al leer se vuelve a convertir (se resta). Sin este ajuste, una victoria encontrada por un camino se reutiliza con un puntaje equivocado desde otro.
- La tabla es persistente dentro del worker del torneo: lo aprendido en un turno sirve en el siguiente.

**Cómo verificamos que está bien**: a profundidad fija, el puntaje de la raíz tiene que ser idéntico con y sin tabla. La prueba lo comprueba en 25 posiciones al azar, a profundidades 4 y 6. Además, dos revisiones independientes: la primera comparó el motor original con un minimax exhaustivo (397 posiciones) y con un solucionador exacto en 1,200 jugadas de partidas reales; la segunda comparó el motor optimizado con el original en 1,500 posiciones (mismo puntaje y misma columna en la raíz). Ninguna encontró diferencias.

### 3.4 Fuentes

- Pascal Pons, *Solving Connect 4: how to build a perfect AI* (blog.gamesolver.org): negamax, alfa-beta, orden por centro, tabla de transposición e iterative deepening. Lo adaptamos a 8×7: constantes, ventanas, orden de columnas y un arreglo plano en lugar de su bitboard.
- Chess Programming Wiki (chessprogramming.org): *Alpha-Beta*, *Iterative Deepening*, *Transposition Table* y *Zobrist Hashing*, de donde salen los tipos de cota y el ajuste de puntajes de victoria.
- Victor Allis (1988), *A Knowledge-based Approach of Connect-Four*: origen de las reglas de paridad que decidimos no usar (ver 3.2).
- Código del solver de Pons (github.com/PascalPons/connect4, `Solver.cpp` y `Position.hpp`): el descarte de jugadas perdedoras (`possibleNonLosingMoves`) y el orden por casillas ganadoras. El blog no se pudo abrir (certificado TLS inválido), así que leímos el código. El orden por casillas ganadoras también lo probamos: con el tablero en arreglos cuesta más de lo que poda (53 % en duelo, sin significancia) y no se usa.
- John Tromp, *John's Connect Four Playground* (tromp.github.io/c4/c4.html): la tabla de resultados teóricos marca 8×7 como **victoria del primer jugador** con juego perfecto. Coincide con lo que se ve en los duelos: quien abre gana más seguido.

## 4. Manejo del tiempo

El árbitro da `deadline_ms` (3,000 ms) desde `served_at`. Ese reloj arranca en el servidor, así que cuentan la bajada del turno, la búsqueda y la subida del `POST`. El presupuesto se mide desde que **recibimos** el turno y, además, se acota con `served_at` cuando el turno llega tarde (ver más abajo).

| Tramo | Valor por defecto |
|---|---|
| Presupuesto de búsqueda: `min(SEARCH_TIME_MS, deadline_ms − SAFETY_MS) − tiempo ya transcurrido` | 1,700 ms |
| Tope si el turno llegó tarde: `deadline_ms − (ahora − served_at) − 700 ms`, si es menor | se activa con atrasos de más de `deadline_ms − 700 − presupuesto normal`: ~600 ms con los valores por defecto (menos si se sube `SEARCH_TIME_MS`) |
| El motor revisa el reloj | cada 1,024 nodos |
| Watchdog en el hilo principal | presupuesto + 500 ms |
| Tiempo máximo del `POST` | lo que quede del plazo (mínimo 300 ms) |
| Reintentos del `POST` ante fallas de red | mientras queden más de 200 ms |

- **Watchdog**: el hilo principal compite el resultado del worker contra un temporizador. Si el temporizador gana (worker colgado o con error), envía la jugada de respaldo, termina el worker y crea otro.
- **Turnos que llegan tarde.** Si el bot se reinicia a mitad de un turno, o la red tarda en entregarlo, el turno llega con parte del plazo gastado: el reloj del árbitro corre desde `served_at`. Por eso el presupuesto también se acota con `deadline_ms − (ahora − served_at) − 700 ms`. Solo puede acortar la búsqueda, nunca alargarla, así que no crea derrotas por tiempo nuevas. Depende de que los relojes estén razonablemente sincronizados:
  - **Laptop atrasada respecto del árbitro**: el atraso sale menor (o negativo, y se ignora); el ajuste protege menos, pero el bot juega igual que antes.
  - **Laptop adelantada**: el atraso sale mayor y, a partir de unos 0.6 s de desfase, se acortan las búsquedas de todos los turnos y el bot juega más débil (con 2.3 s o más, busca solo 50 ms). Si el atraso es igual o mayor que el plazo, se ignora.
  - **Diagnóstico**: cada turno registra el atraso medido en `logs/turns.jsonl` (`served_lag_ms`, aunque no se use) y la consola avisa cada vez que acorta una búsqueda. En las primeras prácticas del jueves, `served_lag_ms` tiene que ser chico (la bajada por la red) y no tiene que haber avisos. Si hay avisos en todos los turnos, sincronizar el reloj (`sudo sntp -sS time.apple.com` en macOS) o apagar el ajuste con `SERVED_AT_GUARD=0` y relanzar.
  - Una revisión independiente lo reprodujo de punta a punta: laptop adelantada 0.7 s → búsquedas de 1,600 ms; 1.5 s → 800 ms; 2.5 s → 50 ms; en ningún caso hubo derrotas por tiempo.
- **Ensayo del día del evento** (árbitro simulado, bot con `npm run liga`):
  - `kill -9` a mitad de un turno: sin el ajuste se perdió la partida por tiempo (relanzar ~2 s + buscar 1.7 s). Con el ajuste, el turno llegó 2,328 ms tarde, se buscó 50 ms y el árbitro registró 2,381 ms: partida salvada y ganada.
  - Bajada lenta de 1.3 s, simulada con un proxy que retiene los turnos: sin el ajuste, 2 de 2 partidas perdidas por tiempo. Con el ajuste, 4 de 4 ganadas, peor caso 2,305 ms y profundidad media 13.8.
  - Sin atraso, el ajuste no se activa: atraso máximo 1 ms y ninguna búsqueda acortada.
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
| Profundidad media en 1,700 ms (7 posiciones) | 13.3 sin tabla, **17.0 con tabla** (antes de las optimizaciones: 10.9 y 13.6) | `npm run benchmark` |
| Nodos por segundo | ~3.76 millones sin tabla, ~2.88 millones con tabla (antes: ~515 y ~617 mil) | `npm run benchmark` |
| Duelo del motor optimizado contra el anterior, tabla persistente como en el torneo | 200 ms, 120 partidas: 78 victorias, 7 empates, 35 derrotas = **67.9 %** ± 8.4. 1,000 ms, 50 partidas: 33-1-16 = **67 %** ± 13 | duelo entre dos copias del repo (cada motor con su propia tabla) |
| Selfplay con tabla contra sin tabla (80 partidas, 200 ms por jugada) | 50 victorias, 4 empates, 26 derrotas: **65 % de los puntos** | `npm run selfplay` (52 s en 8 hilos) |
| Integración contra `casa-basico` (20 + 20 partidas, con y sin caos) | 40 victorias; 0 ilegales, 0 timeouts, 0 ausencias, 0 respaldos | `npm run test:integration` |
| Relanzamiento con `kill -9` | 1.54 s hasta volver a esperar turnos | manual, ver sección 9.4 del plan |

Mediciones hechas en una MacBook con Node 24.9. Antes de la liga se repiten en la laptop que juega.

## 8. Pruebas y cobertura

`npm test` corre 154 pruebas en tres proyectos de Vitest (`game` y `bot` en Node, `web` en jsdom), en unos 7 segundos.

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
- **13 casos tácticos** (`bot/test/fixtures/tactical-cases.js`) verificados por un oráculo de fuerza bruta que no comparte código con el motor ni con `game` (`bot/scripts/verify-tactical-cases.js`, también corre dentro de `npm test`): cada tablero tiene que ser alcanzable y la respuesta esperada tiene que ser exactamente el conjunto de columnas correctas.
- **Diferenciales**: cada columna de la raíz contra un negamax sin poda (150 posiciones), evaluación incremental contra `evaluate()`, y las claves Zobrist (la segunda distingue lo que la primera confunde). Se comprobó que fallan con mutaciones del código: saltar el chequeo de victoria en la raíz, dejar pasar una posición sin jugadas, volver al generador lineal.
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
| El motor revisa el reloj cada 1,024 nodos y no cada 4,096 | Con la suite completa, otros archivos de prueba compiten por la CPU y la prueba de presupuesto fallaba 3 de 3 veces (230 ms con 100 de presupuesto). Con 1,024 pasa siempre y la profundidad alcanzada no cambia |
| Evaluación incremental, chequeo de victoria sin arreglos, descarte de jugadas perdedoras y tabla por generaciones (Oscar, con Claude Code) | Paso 7 del plan: mejorar el motor. Se midió cada cambio por separado con duelos entre copias del repo; el conjunto saca 67.9 % contra el motor anterior (sección 7) |
| Segunda clave Zobrist con mulberry32 | Hallazgo de una revisión independiente: con xorshift la segunda clave no verificaba nada (sección 3.3) |
| El presupuesto también se acota con `served_at` cuando el turno llega tarde | El plan medía solo desde la recepción para no depender de relojes sincronizados. El ensayo del día del evento mostró que así se pierde la partida si el bot se reinicia a mitad de un turno o si la red tarda en entregarlo. El tope solo acorta, ignora atrasos imposibles y se puede apagar (sección 4) |
| Probados y descartados: orden por casillas ganadoras y paridad de amenazas | No mejoraron en duelos de 100 a 120 partidas (secciones 3.2 y 3.4); el plan pide ≥ 60 % para adoptar un cambio |
| Casos tácticos con oráculo en vez de casos dibujados a mano | La IA generó y verificó los casos; el oráculo encontró que el ejemplo dibujado a mano en la asignación era una posición imposible (IA_LOG) |
| Prueba del manual hecha por Mariana, del equipo, sin experiencia previa con el proyecto en su computadora, y no por una persona de fuera | Por tiempo, el jueves 5 a la mañana. Siguió el manual desde cero en una Mac sin Node.js: instalación, descarga, `npm install` (3 min), `npm start` y una partida. Encontró 13 problemas, todos corregidos en el manual (commit `719d930`): la app no está en internet y no lo decía; el botón "LTS" de nodejs.org ya no existe; faltaban los pasos del instalador; los avisos de `npm` parecían errores; no se explicaba cómo saber que algo terminó; faltaba cómo se juega; la app viene en Medio y no en Fácil, entre otros. Queda pendiente repetirla con una persona de fuera del equipo |

## 10. Pendientes para el jueves

- Reemplazar `bot/contract/arbitro-openapi.json` por el que sirve el árbitro en `/api/openapi.json` y correr `npm test`.
- Prácticas contra `casa-aleatorio` y `casa-basico` abriendo cada lado, y calibrar `SEARCH_TIME_MS` con el campo `ms`.
- Repetir `npm run benchmark` y `npm run test:integration` en la laptop de la liga.
- Repetir la prueba del manual con una persona de fuera del equipo. Las capturas ya están y la primera prueba ya se hizo (sección 9).
- Probar el nivel Fácil con alguien de fuera del equipo; si no logra ganar, bajar a profundidad 1.
