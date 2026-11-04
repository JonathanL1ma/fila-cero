# AGENTS.md

Reglas para cualquier agente de IA (Claude Code, Codex, Cursor, etc.) que trabaje en este repositorio. Equipo **Fila Cero** (Equipo 2), Challenge Cuatro en línea 8×7.

## Contexto

- Bot que juega Cuatro en línea en un tablero de **8 columnas × 7 filas** contra un árbitro HTTP (long polling), más una app web para jugar contra el bot.
- Los planes son la fuente de verdad: `PLAN_BACKEND.md` y `PLAN_FRONTEND.md`. Antes de implementar un paso, lee la sección correspondiente y su criterio de listo.
- El contrato del árbitro está en `bot/contract/arbitro-openapi.json`.

## Estructura

```
game/    @fila-cero/game: reglas puras, sin dependencias
bot/     motor (src/engine), cliente del árbitro (src/arbiter), worker (src/worker), API (src/api), mock
web/     app React + Vite
docs/    TECNICO.md, MANUAL.md, IA_LOG.md
```

**Regla de dependencias:**

- `game` no importa nada.
- `bot/src/engine` solo importa `game`. Nada de HTTP ni de hilos en el motor.
- `bot/src/arbiter` y `bot/src/api` pueden importar `game`, pero llegan al motor solo a través de `bot/src/worker/enginePool.js`.
- `web` importa `game` y nunca `bot`.

## Tablero

- Formato de intercambio: `board[fila][columna]`, 7 filas × 8 columnas, **fila 0 abajo**; 0 vacío, 1 y 2.
- Las constantes de tamaño (`COLUMNS`, `ROWS`, `CENTER_ORDER`) se importan de `game/src/constants.js`. Ningún 7, 8 o 56 suelto.
- No traslades código de Cuatro en línea 7×6 sin adaptarlo: nada de bitboards de 64 bits (JavaScript solo tiene enteros exactos hasta 53 bits) ni reglas de paridad o zugzwang pensadas para columnas de altura par.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm install` | Instala todos los workspaces |
| `npm test` | Todas las pruebas con cobertura (`vitest run --coverage`). Debe pasar en un clon limpio, sin `.env` y sin red |
| `npm run dev` | Bot en modo `api` y Vite con recarga en caliente |
| `npm start` | Compila la web y la sirve desde el bot en `http://<ip>:3001` |
| `npm run mock` | Árbitro simulado en el puerto 4000 |
| `npm run liga` | Bot en modo `arbiter` con supervisor (solo en la laptop de la liga) |
| `npm run test:integration` | Bot completo contra el mock, 20 partidas |
| `npm run selfplay` | Minitorneo entre configuraciones del motor |

## Reglas

- **No edites `PLAN_*.md`** después del primer commit de código. Las desviaciones van a `docs/TECNICO.md`, sección "Cambios respecto al plan".
- **No debilites ni borres pruebas para que pasen.** Si una prueba falla, corrige el código o avisa al equipo.
- Las pruebas no dependen de `.env`, de red ni de servidores externos: el mock se levanta dentro de la prueba en el puerto 0. Las pruebas de tiempo usan presupuestos de 50–100 ms con tolerancias amplias.
- **Nunca** escribas en el repositorio el token, el `.env` ni la carpeta `logs/`, y nunca imprimas el token ni los encabezados de autorización.
- El cliente del árbitro **no deduplica turnos**: si `/api/next` entrega un turno, se responde siempre.
- Toda jugada enviada al árbitro se valida contra `legal_moves`.
- Commits pequeños con el número del paso del plan en el mensaje, por ejemplo `paso 3: motor v1 con atajos tácticos`.
- Cuando la IA devuelva algo incorrecto y lo detectemos, se registra en `docs/IA_LOG.md`: qué se pidió, qué salió mal y cómo se detectó.
