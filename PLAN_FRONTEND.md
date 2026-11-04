# Plan de ejecución: Frontend (aplicación web)

**Fila Cero** (Equipo 2) · Challenge Cuatro en línea 8×7 · v1.1 (4 de noviembre de 2026)

> Este plan se escribe y se commitea antes de cualquier línea de código. Después del primer commit de código **no se edita**: las desviaciones se registran en `docs/TECNICO.md`.
>
> La v1.0 integra dos borradores escritos en paralelo y varias revisiones cruzadas hechas con IA, todas validadas por el equipo (detalle en `docs/IA_LOG.md`).

## 1. Alcance

Una página web donde una persona juega Cuatro en línea 8×7 contra el bot del equipo, en la misma computadora o en la red local.

**Obligatorio (según las bases):**

- Tablero 8×7 interactivo, con indicación clara de a quién le toca y de qué columnas están disponibles.
- Elegir quién abre (humano o bot), reiniciar y mostrar el resultado: ganador con la línea de cuatro resaltada, o empate.
- Limpia, consistente y usable en una laptop.

**Deseable, en este orden si sobra tiempo:**

1. Funciona bien en el teléfono (suma puntos extra). Ya queda casi resuelto porque el bot sirve la app en la red local (sección 5).
2. Niveles de dificultad: Fácil (`maxDepth` 2), Medio (`maxDepth` 6) y Difícil (sin límite de profundidad, 1,700 ms). Es el mismo `chooseMove` del torneo con otros límites, nunca otro bot. Se limita la profundidad y no solo el tiempo porque con 100 ms el motor ya es difícil de vencer. Va antes que el resto porque en la demo alguien del jurado puede jugar en Fácil y ganarle.
3. Análisis del bot: profundidad, tiempo y puntaje de cada columna en su última jugada.
4. Historial de jugadas.
5. Deshacer.
6. Reproducir una partida del torneo a partir de su registro público, pasando por el bot (`GET /api/replay/:gameId`).

## 2. Stack

| Elemento | Elección | Motivo |
|---|---|---|
| Framework | React, en la versión que instala `npm create vite` (hoy la 19) | Elegido por el equipo |
| Build | Vite | En desarrollo, proxy de `/api` hacia el bot; el build lo sirve el propio bot |
| Estilos | CSS Modules por componente, más un único `theme.css` con las variables de colores y tamaños | Vite los soporta sin dependencias extra; el tablero se arma con CSS Grid |
| Estado | `useReducer` | La partida es una máquina de estados pequeña; no hace falta Redux |
| Reglas | `@fila-cero/game` (workspace de npm) | Son las mismas reglas que usa el bot; no se duplica lógica |
| Pruebas | Vitest (proyecto `web`, entorno jsdom) + React Testing Library | Entra en el `npm test` único de la raíz |

## 3. Pantallas y estados

Una sola pantalla con tres zonas: encabezado (título y estado), tablero y panel de controles.

| Estado | Qué ve la persona |
|---|---|
| `setup` | Selector "¿Quién empieza? Yo / El bot" y botón "Jugar" |
| `humanTurn` | Mensaje "Tu turno". Las columnas llenas se ven atenuadas **siempre**, pero siguen aceptando el clic (ver la fila siguiente). En dispositivos con mouse, además, se resalta la columna bajo el cursor y aparece una ficha fantasma |
| `humanTurn` con `notice` | Si se toca una columna llena, el reducer recibe `ILLEGAL_MOVE` y guarda `notice: "Esa columna está llena, elige otra"`. **No es un estado aparte**: sigue siendo `humanTurn`, así que la persona puede tocar otra columna de inmediato, aunque la animación del aviso siga corriendo. El aviso se borra con la siguiente jugada válida |
| `botThinking` | Mensaje "El bot está pensando…" con indicador animado; tablero deshabilitado |
| `finished` | "¡Ganaste!", "Ganó el bot" o "Empate"; las 4 fichas ganadoras resaltadas y el resto atenuado; botón "Jugar otra vez" |
| `error` | "No se pudo contactar al bot" con botón "Reintentar"; la partida no se pierde |

**Estados:** `setup`, `humanTurn`, `botThinking`, `finished` y `error`. La jugada ilegal no es un estado: es el campo `notice` dentro de `humanTurn`.

**Acciones del reducer:** `START`, `HUMAN_MOVE`, `ILLEGAL_MOVE` (solo escribe `notice`), `BOT_MOVE`, `BOT_ERROR`, `RETRY` y `RESET`.

El reducer **ignora** los eventos que no corresponden al estado actual. Por ejemplo, un `BOT_MOVE` fuera de `botThinking`, o uno con un `requestId` viejo, no hace nada.

## 4. Componentes

```
web/src/
  App.jsx               Orquesta el estado
  state/
    gameReducer.js      Máquina de estados de la partida
  hooks/
    useBotTurn.js       Pide la jugada al bot al entrar en botThinking; cancela en el cleanup
  components/
    GameSetup.jsx       Elegir quién abre
    StatusBar.jsx       A quién le toca, "pensando", resultado, avisos
    Board.jsx           Grilla 8×7 (dibuja de la fila 6 a la 0)
    Column.jsx          <button aria-label="Columna 4">; si está llena, atenuada y con aria-disabled, pero recibe el clic
    Cell.jsx            Casilla con ficha y estado "ganadora"
    Controls.jsx        Reiniciar; luego deshacer y dificultad
    BotInsight.jsx      Profundidad, tiempo y puntajes por columna (opcional)
    MoveHistory.jsx     (opcional)
  api/
    botClient.js        fetch a /api/play, con timeout y AbortController
  styles/
    theme.css
```

Las reglas del juego (jugadas legales, victoria con celdas ganadoras, empate) se importan de `@fila-cero/game`, el mismo paquete que usa el bot. Se usan `applyMove(grid, col)` y `outcome(grid)` sobre `board[fila][columna]`. Como es un workspace de npm, no hacen falta imports relativos fuera de `web/` ni configurar `server.fs.allow` en Vite.

## 5. Comunicación con el bot

- **Contrato** (ver `PLAN_BACKEND.md`, sección 6): `POST /api/play` con `{ board, player, timeMs?, maxDepth? }`, que devuelve `{ column, depth, score, scores, elapsedMs }`.
- **Siempre rutas relativas `/api`**, sin `VITE_BOT_URL`. En el teléfono, `localhost` apuntaría al propio teléfono.
  - **Desarrollo**: Vite hace proxy de `/api` hacia `http://localhost:3001`. Para probar en el teléfono durante el desarrollo se usa `vite --host`.
  - **Demo y uso normal**: `npm start` compila la app y el bot la sirve en `http://<ip>:3001`. Es un solo proceso y un solo puerto, sin CORS.
- **Números de jugador**: quien abre es el jugador 1. Si abre la persona, la persona es 1 y el bot 2; si abre el bot, al revés. La app envía en `player` el número del bot.
- **Flujo de una jugada humana:**
  1. Validar localmente con `@fila-cero/game` y aplicar la jugada.
  2. Revisar con `outcome` si la partida terminó.
  3. Si sigue, pasar a `botThinking` y llamar al bot con `requestId = <id de partida>:<número de jugada>`.
  4. Aplicar la columna que devuelve el bot solo si el `requestId` coincide con el turno actual, y volver a revisar el fin de la partida.
- **React StrictMode** ejecuta los efectos dos veces en desarrollo. `useBotTurn` cancela la llamada con `AbortController` en el cleanup y el reducer descarta las respuestas viejas, así que sale **una sola llamada por turno del bot** y la consola queda limpia.
- **Tiempo máximo de espera**: 10 s. Si se excede, la app pasa al estado `error`, y "Reintentar" repite la misma petición.
- **La app no habla con el árbitro.** La reproducción de partidas (opcional) pasa por el bot, porque el árbitro podría no aceptar llamadas desde el navegador (CORS).

## 6. Diseño visual

- **Tablero**: centrado, con tamaño que se adapta al ancho (`aspect-ratio` 8 / 7) y columnas grandes para tocar con el dedo.
- **Orientación**: `board[fila][columna]` trae la fila 0 abajo, así que el tablero se dibuja de la fila 6 (arriba) a la 0 (abajo).
- **Columnas disponibles**: se distinguen siempre, porque las llenas se ven atenuadas. No se usa el atributo `disabled` en las columnas llenas, porque bloquearía el clic y el aviso de jugada ilegal nunca aparecería; se usa `aria-disabled="true"`, que avisa a los lectores de pantalla sin bloquear el evento. El resaltado al pasar el mouse y la ficha fantasma solo se activan con `@media (hover: hover)`: en el teléfono no hay hover.
- **Fichas**: dos colores con buen contraste, más un borde o símbolo para que se distingan sin depender solo del color.
- **Animación**: caída corta de la ficha con CSS `transform`, sin bloquear la interacción.
- **Victoria**: las fichas ganadoras se resaltan con brillo o borde; el resto se atenúa.
- **Accesibilidad**: cada columna es un `<button>` con `aria-label` (por ejemplo, "Columna 4", o "Columna 4, llena"). Además de servir para el teclado, simplifica las pruebas: React Testing Library la encuentra con `getByRole("button", { name: /Columna 4/ })`. Se puede jugar con el teclado: flechas para elegir y Enter para soltar la ficha.
- **Análisis del bot**: después de cada jugada del bot se muestra discretamente "El bot analizó a profundidad X en Y ms". Ayuda en la demo de la exposición.

## 7. Pasos en orden, con criterio de listo

| # | Paso | Listo cuando | Depende de | Responsable | Cuándo |
|---|---|---|---|---|---|
| 0 | Plan commiteado | Está en el repo antes del código | — | Todos | Miércoles 4, tarde |
| 1 | Workspace `web` creado con `npm create vite` (React) y proyecto `web` (jsdom) en el `vitest.config.js` de la raíz | `npm test` desde la raíz corre las pruebas del bot y de la web | Paso 1 del backend | Camila | Miércoles 4, tarde |
| 2 | `gameReducer` con pruebas | Todas las transiciones están probadas sin renderizar nada, incluidos los eventos ignorados y las respuestas viejas | — | Camila | Miércoles 4, tarde |
| 3 | Tablero y clics humanos (dos personas en la misma pantalla) con `@fila-cero/game` | Se juega una partida completa entre dos personas con detección de fin. La prueba de orientación pasa: la primera ficha en la columna 0 aparece abajo a la izquierda | Paso 2 del backend | Camila | Miércoles 4, tarde |
| 4 | `botClient`, `useBotTurn` y estado `botThinking` | Partida completa contra el bot real, abriendo cualquiera de los dos. En desarrollo, con StrictMode, sale una sola llamada por turno (verificado en la pestaña Network) | Paso 5 del backend (`/api/play`) | Camila | **Hito A**: miércoles 4, tarde |
| 5 | Estado de error y aviso de columna llena | Con el bot apagado aparece el error y "Reintentar" funciona. Tocar una columna llena muestra el aviso, y tocar otra columna enseguida juega normalmente | — | Camila | Miércoles 4, noche |
| 6 | Estilos, animación, resaltado de victoria y accesibilidad | Otra persona del equipo hace la revisión visual. Consola sin errores ni advertencias | — | Mariana; revisión visual de Edgar | Miércoles 4, noche |
| 7 | Responsivo y red local | Se juega en un teléfono real desde `http://<ip>:3001` con `npm start` | Paso 8 del backend | Mariana | Miércoles 4, noche |
| 8 | `docs/MANUAL.md`: una captura por estado de la sección 3 y redacción para alguien que no programa | Una persona sin perfil técnico abre la app y juega siguiendo solo el manual | — | Mariana; prueba con una persona no técnica fuera del equipo | **Hito B**: miércoles 4, noche |
| 9 | Opcionales (sección 1) | Según el tiempo | — | Camila y Mariana | Jueves 5, hasta las 9:30 |

## 8. Validación

- **Pruebas automatizadas**:
  - El reducer: todas las acciones, incluido que `ILLEGAL_MOVE` deja el estado en `humanTurn` con `notice`, los eventos ignorados y los `requestId` viejos.
  - `botClient` con `fetch` simulado: éxito, error, timeout y cancelación.
  - Componentes clave: la columna llena se ve atenuada, recibe el clic y muestra el aviso; el aviso se borra con la siguiente jugada válida; mensaje de turno correcto, resaltado de las celdas ganadoras y orientación del tablero.
- **Prueba manual con guion**:
  - Abrir la partida la persona y abrirla el bot.
  - Ganar, perder y empatar (con un tablero preparado).
  - Tocar una columna llena.
  - Apagar el bot a mitad de partida.
  - Recargar la página.
  - Jugar desde un teléfono.
- **Prueba con alguien que no programa**: siguiendo solo `docs/MANUAL.md`, debe poder abrir la app y jugar. Lo que no entienda se corrige en la app o en el manual.
- **Consola del navegador limpia**: sin errores ni advertencias de React, también en desarrollo con StrictMode. El jurado lo menciona explícitamente.

## 9. Riesgos

| Riesgo | Mitigación |
|---|---|
| Lógica de reglas duplicada y divergente entre la app y el bot | Un solo paquete `@fila-cero/game` en un workspace de npm |
| La app retrasa los turnos del torneo | La demo corre en otra laptop con `MODE=api`. La laptop de la liga no levanta la API (ver `PLAN_BACKEND.md`, sección 15) |
| Un doble clic envía dos jugadas | El tablero se deshabilita al salir de `humanTurn`; el reducer ignora `HUMAN_MOVE` fuera de ese estado |
| La respuesta del bot llega después de reiniciar, o StrictMode ejecuta dos veces el efecto que llama a `/api/play` (cuando el bot abre o le toca jugar) y la jugada se aplica dos veces o aparece una advertencia en la consola | Doble defensa: el efecto de `useBotTurn` crea un `AbortController` y lo aborta en su limpieza, así la llamada vieja se cancela (y su error de cancelación se ignora en silencio, sin ensuciar la consola); y el reducer descarta cualquier respuesta cuyo `requestId` (id de partida + número de jugada) no coincida con el turno actual. Se verifica en desarrollo, con StrictMode, en la pestaña Network y en la consola |
| El aviso de columna llena no aparece porque el clic nunca llega | Columnas llenas con `aria-disabled` en lugar de `disabled` |
| En el teléfono no hay hover y no se ve qué columnas están disponibles | Columnas llenas atenuadas siempre; el hover es solo un extra |
| La app no carga desde el teléfono | Rutas relativas `/api`; el bot escucha en `0.0.0.0` y sirve la app |
| El árbitro no acepta llamadas desde el navegador (CORS) para reproducir partidas | La reproducción pasa por `GET /api/replay/:gameId` del bot |
| Se ve bien en una laptop y mal en otra | Unidades relativas; prueba en al menos dos tamaños de pantalla y un teléfono |
| Poco tiempo para el manual | Capturas tomadas en el paso 8, no al final |

## 10. Qué se delega a la IA y cómo se verifica

| Tarea | Qué hace la IA | Cómo verificamos |
|---|---|---|
| Esqueleto Vite + React y configuración | Lo genera | Arranca en todas las máquinas; `npm test` de la raíz incluye la web |
| Componentes y estilos | Primera versión | Revisión visual y de accesibilidad de una persona del equipo |
| Reducer | Propone la implementación | Las transiciones y sus pruebas las definimos nosotros (tabla de la sección 3) |
| `useBotTurn` | Propone el efecto | Pestaña Network con StrictMode: una sola llamada por turno; prueba de respuesta vieja |
| Responsivo | Ajusta el CSS | Prueba en un teléfono real |
| Manual de usuario | Borrador a partir de las capturas | Lo valida alguien sin perfil técnico |

Los prompts relevantes y los errores detectados se registran en `docs/IA_LOG.md`.

## 11. Responsables

| Persona | Responsabilidad |
|---|---|
| Camila Andrea Jiménez López | Estructura de la app, reducer, `useBotTurn`, componentes y comunicación con el bot. Opera la laptop de la demo en la exposición |
| Mariana Baez | Estilos, animación, accesibilidad, responsivo, capturas y `docs/MANUAL.md` |
| Edgar Cil | Revisión visual del paso 6 (alguien que no hizo la interfaz) |

La prueba del manual (paso 8) la hace una persona sin perfil técnico que no sea del equipo; Mariana la coordina.
