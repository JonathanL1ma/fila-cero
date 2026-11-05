# Fila Cero

Bot de **Cuatro en línea en un tablero de 8 columnas × 7 filas** y aplicación web para jugar contra él. Equipo 2 del Challenge Cuatro en línea 8×7 (Yompi, Yalutec y Migo, 5 de noviembre de 2026).

- El **bot** se conecta al árbitro del torneo por long polling y responde cada turno en menos de 3 segundos.
- La **app web** permite que una persona juegue contra el mismo bot, en la misma computadora o desde un teléfono en la red local.
- Los dos usan el mismo motor: negamax con poda alfa-beta, iterative deepening y tabla de transposición.

| Documento | Para quién |
|---|---|
| [`docs/MANUAL.md`](docs/MANUAL.md) | Quien quiera jugar, sin conocimientos técnicos |
| [`docs/TECNICO.md`](docs/TECNICO.md) | Arquitectura, algoritmo, manejo del tiempo, mediciones y cambios respecto al plan |
| [`docs/IA_LOG.md`](docs/IA_LOG.md) | Cómo usamos la IA, en qué se equivocó y cómo lo detectamos |
| [`PLAN_BACKEND.md`](PLAN_BACKEND.md), [`PLAN_FRONTEND.md`](PLAN_FRONTEND.md) | Planes escritos antes del código |
| [`AGENTS.md`](AGENTS.md) | Reglas para los agentes de IA que trabajan en el repositorio |

## Requisitos

- **Node.js 24** o superior (`node -v`). Con `nvm`, basta `nvm use` en la raíz.
- npm 10 o superior (viene con Node).

## Instalación

```bash
git clone https://github.com/JonathanL1ma/fila-cero.git
cd fila-cero
npm install
```

## Pruebas: un solo comando

```bash
npm test
```

Corre todas las pruebas (reglas, motor, cliente del árbitro contra un árbitro simulado, worker, API y app web) y muestra el reporte de cobertura en la consola. El reporte HTML queda en `coverage/index.html`. No necesita `.env`, red ni servidores: el árbitro simulado se levanta dentro de las pruebas.

## Jugar contra el bot

```bash
npm start
```

Compila la app y la sirve desde el bot. Abre **http://localhost:3001**. Desde un teléfono conectado a la misma red, abre `http://<ip-de-la-laptop>:3001`. El [manual](docs/MANUAL.md) explica cómo encontrar la IP.

Para desarrollar la app con recarga en caliente: `npm run dev` y abre http://localhost:5173.

## Jugar en el torneo

1. Copia `.env.example` a `.env` y completa `ARBITRO_URL` y `TEAM_TOKEN`. El `.env` está en `.gitignore`: el token nunca va al repositorio.
2. Arranca el bot con el supervisor, que lo relanza si se cae:

   ```bash
   npm run liga
   ```

Al arrancar consulta `GET /api/me` para verificar el token. Si el token es inválido, termina con un mensaje claro y el supervisor no lo relanza. Cada turno queda en la consola y en `logs/turns.jsonl`.

### Probar contra el árbitro simulado

```bash
npm run mock
```

En otra terminal:

```bash
ARBITRO_URL=http://localhost:4000 TEAM_TOKEN=token-de-prueba npm run liga
```

Para crear una partida de práctica en el mock:

```bash
curl -X POST localhost:4000/api/practice -H 'Authorization: Bearer token-de-prueba' \
  -H 'Content-Type: application/json' -d '{"opponent":"casa-basico","first":1}'
```

## Variables de entorno

| Variable | Uso | Por defecto |
|---|---|---|
| `MODE` | `api` (app), `arbiter` (torneo) o `both` | `api`; `arbiter` con `npm run liga` |
| `ARBITRO_URL` | URL base del árbitro | (obligatoria en `arbiter`) |
| `TEAM_TOKEN` | Token del equipo | (obligatorio en `arbiter`) |
| `SEARCH_TIME_MS` | Tope de tiempo de búsqueda por jugada | `1700` |
| `SAFETY_MS` | Margen que se resta a `deadline_ms` del árbitro | `1300` |
| `SERVED_AT_GUARD` | `0` (o `false`, `no`, `off`) apaga el ajuste que acorta la búsqueda cuando un turno llega tarde según `served_at`. Usarlo solo si el reloj de la laptop está adelantado respecto del árbitro: se nota porque `served_lag_ms` sale alto (≳ 0.5 s) en todos los turnos y la consola avisa "búsqueda acotada" en cada uno | `1` |
| `HOST` | Interfaz de la API y la app | `0.0.0.0` |
| `PORT` | Puerto de la API y la app | `3001` |
| `LOG_DIR` | Carpeta de `turns.jsonl` | `logs` |
| `MOCK_CHAOS` | `1` activa latencia y errores en `npm run mock` | `0` |

## Otros comandos

| Comando | Qué hace |
|---|---|
| `npm run test:integration` | El bot completo juega 20 partidas contra el mock, con y sin caos. Falla si hay jugadas ilegales, timeouts o ausencias |
| `npm run selfplay` | Minitorneo entre dos configuraciones del motor (por defecto, sin y con tabla de transposición), 40 aperturas con ambos colores |
| `npm run benchmark` | Profundidad media y nodos por segundo, con y sin tabla de transposición |
| `npm run bot` | El bot sin supervisor, según `MODE` |

## Estructura

```
game/   reglas puras del juego (@fila-cero/game), compartidas por el bot y la app
bot/    motor (src/engine), cliente del árbitro (src/arbiter), worker (src/worker), API (src/api),
        árbitro simulado (mock), scripts (supervisor, selfplay, benchmark, integración)
web/    app React + Vite
docs/   documentación técnica, manual de usuario y registro de uso de IA
```
