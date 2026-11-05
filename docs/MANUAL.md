# Manual de usuario

**Fila Cero** es una página web para jugar **Cuatro en línea** contra un programa (el "bot") que hizo nuestro equipo. Se juega en un tablero un poco más grande que el clásico: **8 columnas y 7 filas**.

## Cómo se juega

- Por turnos, cada jugador deja caer una ficha en una columna. La ficha cae hasta el espacio libre más bajo.
- Gana quien forme primero una línea de **cuatro fichas propias seguidas**: horizontal, vertical o en diagonal.
- Si se llenan las 56 casillas y nadie formó una línea, es **empate**.

## Abrir la aplicación

### Si alguien del equipo ya la dejó abierta

Abre el navegador (Chrome, Safari, Edge o Firefox) y entra a la dirección que te den. Por ejemplo, **http://localhost:3001** en la misma computadora, o algo como **http://192.168.1.25:3001** desde un teléfono. Salta a [La pantalla](#la-pantalla).

### Si la vas a abrir tú

Solo hace falta la primera vez:

1. Instala **Node.js** desde https://nodejs.org (el botón que dice "LTS"). Acepta todas las opciones por defecto.
2. Descarga el proyecto: en https://github.com/JonathanL1ma/fila-cero, pulsa el botón verde **Code** y luego **Download ZIP**. Descomprime el archivo.
3. Abre la **Terminal** (en Mac: busca "Terminal" con ⌘ + espacio; en Windows: busca "Símbolo del sistema").
4. Escribe `cd ` (con un espacio al final), arrastra la carpeta descomprimida a la ventana y pulsa Enter.
5. Escribe `npm install` y pulsa Enter. Espera a que termine (uno o dos minutos).

Cada vez que quieras jugar:

1. En la Terminal, dentro de la carpeta del proyecto, escribe `npm start` y pulsa Enter.
2. Cuando aparezca el mensaje **"App y API en http://localhost:3001"**, abre el navegador en **http://localhost:3001**.
3. Deja la Terminal abierta mientras juegas. Para cerrar la aplicación, vuelve a la Terminal y pulsa Ctrl + C.

### Desde un teléfono

El teléfono tiene que estar conectado **a la misma red Wi-Fi** que la computadora donde corre la aplicación.

1. Averigua la dirección IP de la computadora:
   - En Mac: Ajustes del Sistema → Wi-Fi → **Detalles** junto a la red conectada → "Dirección IP".
   - En Windows: en el Símbolo del sistema, escribe `ipconfig` y busca "Dirección IPv4".
2. En el navegador del teléfono, entra a `http://` + esa IP + `:3001`. Por ejemplo, `http://192.168.1.25:3001`.

Si no carga, el firewall de la computadora puede estar bloqueando la conexión: en Mac, Ajustes del Sistema → Red → Firewall, permite las conexiones entrantes a "node".

## La pantalla

> **Captura pendiente:** pantalla de inicio.

De arriba hacia abajo:

1. **Título** "Fila Cero".
2. **Panel de inicio** (solo antes de empezar): eliges quién empieza y la dificultad.
3. **Mensaje de estado**: dice de quién es el turno o cómo terminó la partida.
4. **Leyenda**: qué color de ficha es tuyo ("Tú") y cuál es del bot ("Bot"). Las fichas del jugador 2 tienen además un anillo blanco, para distinguirlas sin depender del color.
5. **Tablero**: 8 columnas y 7 filas.
6. **Botones** "Reiniciar" y, al terminar, "Jugar otra vez".

## Empezar una partida

1. En **¿Quién empieza?**, elige **Yo** o **El bot**. Quien empieza juega con las fichas naranjas.
2. En **Dificultad**, elige:
   - **Fácil**: el bot piensa solo un par de jugadas hacia adelante.
   - **Medio**: piensa unas seis jugadas.
   - **Difícil**: piensa todo lo que puede en menos de 2 segundos. Es el mismo nivel con el que juega en el torneo.
3. Pulsa **Jugar**.

## Durante la partida

| Lo que ves | Qué significa | Qué hacer |
|---|---|---|
| **"Tu turno: toca una columna"** | Te toca jugar | Toca o haz clic en cualquier parte de una columna. En una computadora, al pasar el mouse por encima se ve dónde caería la ficha |
| **"El bot está pensando…"** con un círculo girando | El bot está eligiendo su jugada; el tablero no responde | Espera, tarda menos de 2 segundos |
| Una columna **más clara** que las demás | Esa columna está llena | Elige otra |
| **"La columna X está llena, elige otra"** en rojo | Intentaste jugar en una columna llena | Toca otra columna; el aviso desaparece solo |
| **"El bot analizó N jugadas hacia adelante en M ms"** | Cuánto pensó el bot en su última jugada | Nada, es informativo |

> **Captura pendiente:** turno de la persona.
>
> **Captura pendiente:** el bot pensando.
>
> **Captura pendiente:** aviso de columna llena.

También se puede jugar con el teclado: **Tab** para llegar al tablero, **flechas izquierda y derecha** para elegir la columna y **Enter** para soltar la ficha.

## Fin de la partida

| Mensaje | Significado |
|---|---|
| **"¡Ganaste!"** | Formaste cuatro en línea |
| **"Ganó el bot"** | El bot formó cuatro en línea |
| **"Empate: el tablero se llenó"** | Se llenaron las 56 casillas sin ganador |

Cuando alguien gana, las fichas de la línea ganadora brillan y el resto del tablero se oscurece.

> **Captura pendiente:** victoria con la línea resaltada.

- **Jugar otra vez** empieza una partida nueva con las mismas opciones.
- **Reiniciar** vuelve al panel de inicio para cambiar quién empieza o la dificultad.

## Si algo falla

| Problema | Solución |
|---|---|
| **"No se pudo contactar al bot"** con un botón **Reintentar** | La partida no se pierde. Revisa que la Terminal con `npm start` siga abierta y pulsa **Reintentar** |
| La página no carga | Revisa que la Terminal muestre "App y API en http://localhost:3001" y que la dirección del navegador termine en `:3001` |
| No carga en el teléfono | Revisa que el teléfono esté en la misma red Wi-Fi y el firewall (sección [Desde un teléfono](#desde-un-teléfono)) |
| La Terminal dice "command not found: npm" | Falta instalar Node.js (paso 1 de [Si la vas a abrir tú](#si-la-vas-a-abrir-tú)) |

> **Captura pendiente:** error de conexión con el botón Reintentar.
