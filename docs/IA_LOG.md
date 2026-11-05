# Registro de uso de IA

**Fila Cero** (Equipo 2) · Coordina: Mariana Baez

## Qué es este documento

Para el challenge construimos un **bot**: un programa que juega Cuatro en línea solo, sin que nadie lo maneje, contra los programas de los otros equipos. Las partidas las controla un **árbitro**, un servidor de los organizadores que le avisa a cada bot cuándo le toca y revisa que cada jugada sea válida. También hicimos una página web para que una persona juegue contra nuestro bot.

Para planificar y construir todo eso usamos asistentes de inteligencia artificial, principalmente Claude y, en un caso, Gemini. Este documento cuenta **qué le pedimos a la IA, en qué se equivocó y cómo nos dimos cuenta**. No registra todo lo que hicimos con IA, solo lo que nos enseñó algo: un error, un acierto inesperado o una decisión en la que no le hicimos caso.

**Cómo leerlo.** Cada entrada empieza con un párrafo **"En simple"**, escrito para cualquier persona, sepa o no de programación. Debajo viene el **detalle técnico**, para el equipo y para quien quiera profundizar. Las palabras técnicas que aparecen están explicadas en el glosario del final.

**Regla del registro.** Cada hecho tiene que salir de algo que se pueda mostrar: los mensajes del equipo en Slack, el grupo de WhatsApp del challenge, el historial del repositorio o las conversaciones con la IA. Lo que no se puede mostrar no entra, aunque suene verosímil (ver IA-08). Lo que todavía no sabemos queda marcado como `[completar]`.

Todas las horas son de Guatemala.

## En 30 segundos

| # | Qué pasó | Cómo nos dimos cuenta |
|---|---|---|
| IA-01 | La IA encontró un error en las reglas oficiales del challenge | Le preguntamos al jurado y lo confirmó |
| IA-02 | El primer plan tenía fallas que nos podían hacer perder partidas sin jugar mal | Otra sesión de IA revisó el plan |
| IA-03 | Dos planes escritos por separado con IA se corrigieron entre sí | Los comparamos |
| IA-04 | Al arreglar un error, la IA metió uno nuevo, y dos sesiones distintas cometieron el mismo | Una tercera revisión |
| IA-05 | Últimas mejoras antes de guardar los planes | Revisión antes de guardar |
| IA-06 | Una prueba prevista para la mañana del jueves podría no entrar en el tiempo | Revisión del repositorio (es una estimación, sin medir) |
| IA-07 | Este mismo documento tuvo errores de la IA | Mariana los detectó al leerlo y al compararlo con Slack |
| IA-08 | Otra IA (Gemini) propuso contar cosas que nunca pasaron | Comparamos cada propuesta con los mensajes y el historial |
| IA-09 | Un error de la IA hacía que cada jugada saliera casi al límite del tiempo | Una prueba que juega partidas completas no terminaba a tiempo |
| IA-10 | La IA dibujó mal varios tableros de prueba | Las pruebas fallaban con el código correcto |
| IA-11 | La IA se adelantó en cosas que después tuvo que deshacer | Releyendo el plan y el contrato antes de guardar |
| IA-12 | La versión final de las reglas del árbitro cambió algo que el plan daba por hecho | Revisión del contrato nuevo antes de programar |

**Las mejores historias para la exposición:** IA-04, IA-09, IA-01 e IA-08.

## Lo que aprendimos

1. **La IA se equivoca más en lo que pasa cuando algo sale mal que en lo normal.** Cortes de internet, programas trabados, cosas que ocurren en un orden inesperado. Por eso revisamos preguntando "¿y si…?" (IA-02, IA-04).
2. **Una corrección puede traer un error nuevo.** El mismo problema falló dos veces; la segunda, dentro del propio arreglo (IA-04).
3. **Dos sesiones de IA no siempre son dos opiniones distintas.** Con la misma indicación, dos sesiones de Claude se equivocaron igual. Revisar con IA ayuda, pero no reemplaza pensar el caso a mano (IA-04).
4. **La IA también encuentra errores ajenos**, en las reglas oficiales y en el trabajo del equipo. Pero lo confirmamos antes de creerle (IA-01, IA-03).
5. **No le hicimos caso en todo.** Cuando una revisión proponía algo que nos hacía perder trabajo, lo cambiamos (IA-04).
6. **La IA no es fuente de lo que pasó.** De memoria, Claude contó mal el orden de los hechos y Gemini inventó tres historias creíbles. Lo que vale son los mensajes, el historial del repositorio y las pruebas (IA-07, IA-08).
7. **Muchas versiones sueltas generan confusión.** Hubo seis versiones de los planes en 43 minutos, pasadas por chat como archivos. Algunas revisiones llegaron sobre una versión que ya había cambiado. Desde que creamos el repositorio, todo cambio queda registrado ahí.

## Cómo trabajamos los planes

Las bases del challenge piden escribir un plan antes de programar. Nos organizamos así: una persona redactaba el plan con Claude, otras pasaban esa versión por su propio Claude para buscarle problemas, y las observaciones volvían a la versión principal.

| Hora | Quién | Qué | Entrada |
|---|---|---|---|
| 14:39 | Mariana | Primer borrador de los dos planes (v0.1) | IA-01 |
| 14:49 | Jonathan | Revisión con 16 observaciones | IA-02 |
| 14:54 | Mariana | v0.2, con esas observaciones aplicadas | IA-02 |
| 14:59 | Oscar | Un segundo borrador, escrito por separado | IA-03 |
| 15:02 | Jonathan | Revisión con 4 observaciones sobre la v0.2 | IA-04 |
| 15:07 | Mariana | v1.0: la unión de la v0.2 con el borrador de Oscar | IA-03 |
| Entre 15:07 y 15:11 | Jonathan | Revisión de la v1.0 con 3 observaciones: la deduplicación todavía ignoraba turnos, el `disabled` impedía el aviso de columna llena y el supervisor podía relanzar el bot sin fin | IA-04, IA-05 |
| 15:11 | Mariana | v1.1, con las 4 observaciones aplicadas; corrige las dos primeras de la revisión de la v1.0, no la del supervisor | IA-04 |
| 15:22 | Jonathan | Últimos ajustes; los planes se guardan en el repositorio | IA-05 |
| 15:27 | Mariana | Consulta al jurado sobre las reglas oficiales | IA-01 |
| 15:32 | Edson Lemus (jurado) | Responde y confirma el error | IA-01 |

## Entradas

### IA-01 · La IA encontró un error en las reglas oficiales

**En simple.** Las reglas del challenge traen un ejemplo de lo que el árbitro le envía a un bot cuando le toca jugar. La IA notó que los datos de ese ejemplo no cuadraban entre sí, como una factura cuyos ítems no suman el total. En lugar de creerle, le preguntamos al jurado, que confirmó que el ejemplo era solo ilustrativo y que el árbitro real no envía datos así. La IA también anticipó dos problemas técnicos que nadie del equipo había visto.

**Detalle técnico**

- **Fecha, hora y paso del plan:** miércoles 4 de noviembre, 14:39, paso 0.
- **Quién:** Mariana.
- **Herramienta:** Claude (claude.ai), modelo Claude Opus 5.5.
- **Prompts:** *"necesito que leas y me expliques el reto de este challenge"* (con el PDF de las bases), y después *"podes empezar a redactar los borradores"*.
- **Qué devolvió:** la explicación del reto y la v0.1 de los dos planes.
- **Qué encontró que nosotros no:**
  - **El ejemplo de turno de la página 7 de las bases es inconsistente.** El tablero tiene 6 fichas pero la lista de jugadas (`moves`) tiene 8; esas jugadas no producen ese tablero; la jugada 9 le toca al jugador 1, no al 2 como dice `you`; y la jugada 8 la hizo el jugador 2, no el 1 como dice `last_move`.
  - **La forma más rápida de representar el tablero no funciona en JavaScript.** Los programas clásicos de Cuatro en línea guardan el tablero como una fila de 64 bits (unos y ceros), pero JavaScript solo maneja enteros exactos de hasta 53 bits.
  - **Mientras el bot piensa, el programa no puede atender otra cosa.** Si alguien jugaba en la página web durante el torneo, podía retrasar una jugada del torneo.
- **Cómo lo verificamos:** Mariana consultó al jurado en el grupo de WhatsApp (15:27), con las cuatro contradicciones detalladas. Edson Lemus confirmó a las 15:32 que el ejemplo es ilustrativo, que efectivamente es inconsistente y que el árbitro real no envía turnos así.
- **Qué decidimos:** nuestro árbitro de práctica genera turnos coherentes y no copia el ejemplo. El jurado no dijo qué dato manda si algún turno real no cuadrara, así que la decisión es nuestra: confiamos en el tablero (`board`) y en el número de jugador (`you`), y el bot anota una advertencia si el resto no coincide.
- **¿Para la exposición?** Sí.

### IA-02 · El primer plan podía perder partidas sin jugar mal

**En simple.** El primer plan tenía fallas que no tenían nada que ver con jugar bien, pero que igual nos hacían perder partidas. La más grave: si internet fallaba justo cuando el bot enviaba su jugada, el bot creía que ya había jugado y se quedaba esperando hasta perder por tiempo. Tampoco había un límite de espera si el servidor dejaba de responder, ni un plan B si el programa se trababa pensando. Jonathan le pidió a otra sesión de Claude que revisara el plan, y encontró 16 problemas antes de escribir una sola línea de código.

**Detalle técnico**

- **Fecha, hora y paso del plan:** miércoles 4 de noviembre, 14:49 (revisión) y 14:54 (v0.2), paso 0.
- **Quién:** Jonathan revisó; Mariana aplicó los cambios.
- **Herramienta:** Claude, en la sesión de cada uno.
- **Prompts:** de la revisión (Claude Code en la terminal, modelo Claude Opus 5.5): *"Puedes leer el challenge que tenemos que desarrollar con mi equipo (Team #2) y tambien está el API del árbitro, todo en la carpeta resources/. Igualmente en la carpeta están los planes iniciales para que los valides"*. Para aplicarla: *"Resolve todas estas inconsistencias que tenes en los planes que me brindaste"*, con las 16 observaciones pegadas.
- **Qué estaba mal en la v0.1** (las cuatro observaciones críticas):
  1. **La deduplicación podía perder partidas por tiempo.** El bot marcaba el turno como respondido antes de saber si su jugada había llegado. Si fallaba la red, ignoraba el turno cuando el árbitro se lo volvía a entregar.
  2. **Ninguna llamada al servidor tenía tiempo máximo.** Si una conexión quedaba colgada, el bot esperaba para siempre y perdía por ausencia a los 30 segundos.
  3. **No había un plan B real si el bot se trababa pensando.** El cálculo corre en un *worker* (un proceso aparte). Si ese proceso se traba, no puede controlar su propio tiempo ni leer un mensaje pidiéndole que se detenga. Faltaba un vigilante (*watchdog*) en el programa principal, con autoridad para cortar: si se acaba el tiempo, envía una jugada de respaldo y reemplaza el proceso trabado por uno nuevo (`worker.terminate()`).
  4. **La IA propuso Node 20**, una versión que ya no tiene soporte.
- **Una advertencia preventiva:** la revisión avisó que ciertas reglas estratégicas clásicas de Cuatro en línea (las de paridad, de Victor Allis) suponen un tablero de 6 filas y no sirven para el nuestro, que tiene 7. Ninguna versión del plan las había propuesto. Quedó escrito como decisión de no usarlas y como regla para la IA en `AGENTS.md`, para que un agente no las agregue por su cuenta.
- **Otras observaciones aceptadas:** compartir las reglas del juego entre el bot y la página, ejecutar todas las pruebas con un solo comando, que el bot sirva también la página web, preparar el proceso de cálculo antes de la primera jugada, medir el tiempo de punta a punta y asignar un responsable a cada tarea.
- **Cómo lo detectamos:** una segunda sesión de Claude, sin el contexto de la primera, revisó el plan antes de programar.
- **Qué decidimos:** aceptamos las 16 observaciones. Al aplicarlas, la IA agregó por su cuenta que la jugada de respaldo nunca le deje al rival una victoria inmediata. **Pero el arreglo del punto 1 trajo un error nuevo** (IA-04).
- **¿Para la exposición?** Sí: el punto 1 es un error que no se ve leyendo el plan, sino preguntando "¿qué pasa si se corta internet?".

### IA-03 · Dos planes escritos por separado se corrigieron entre sí

**En simple.** Mientras Mariana trabajaba en el plan con su Claude, Oscar escribió otro por su lado con el suyo. Al compararlos, la IA reconoció que el de Oscar era mejor y lo usó como base. Cada uno tenía cosas que al otro le faltaban. Por ejemplo, nadie había notado que la exposición ocurre **mientras** se juega el torneo: si mostrábamos el bot en la misma computadora que estaba jugando, podíamos hacerle perder partidas. La solución fue usar dos laptops.

**Detalle técnico**

- **Fecha, hora y paso del plan:** miércoles 4 de noviembre, 14:59 (borrador de Oscar) y 15:07 (unión), paso 0.
- **Quién:** Oscar escribió el segundo borrador; Mariana pidió la comparación y la unión.
- **Herramienta:** Claude en ambos casos, cada uno en su sesión.
- **Prompts:** del borrador de Oscar, [completar: Oscar]. Para la unión: *"Podes revisar si esta propuesta está mejor y generar un nuevo plan que sea más completo y ganador"*.
- **Qué faltaba en la versión de Mariana y aportó la de Oscar:**
  - **La demo de la exposición ocurre durante el torneo.** Solución: dos laptops, una que solo juega el torneo y otra para la demo.
  - **La v0.2 hacía fallar las pruebas por un detalle de configuración.** Exigía un mínimo de cobertura (qué porcentaje del código revisan las pruebas): con 79 % en vez de 80 %, el comando de pruebas fallaba y se perdían puntos de la evaluación aunque todo funcionara.
  - Además: un supervisor que vuelve a arrancar el bot si se cae, calcular el tiempo con el dato que manda el árbitro (`deadline_ms`) en lugar de un valor fijo, un detalle de cómo miden el tiempo los procesos aparte (`performance.now()`), y cómo evitar que la página web pida dos veces la misma jugada (StrictMode).
- **Qué encontró la sesión de Mariana en el borrador de Oscar:**
  - **La jugada de respaldo podía basarse en un análisis demasiado corto**, de una sola jugada, que todavía no ve la respuesta del rival. Ahora exige mirar al menos dos jugadas adelante.
  - **Un nivel "Fácil" no iba a ser fácil.** Limitar al bot a pensar 100 milisegundos no alcanza: aun así ve varias jugadas adelante. Se agregó un límite de profundidad (`maxDepth`).
- **Qué decidimos:** unir ambos en la v1.0.
- **¿Para la exposición?** Sí.

### IA-04 · Al arreglar un error, la IA metió otro, y dos veces

**En simple.** Para arreglar el problema del corte de internet de IA-02, la IA cambió el plan para que el bot "ignore" un turno que ya respondió. Pero si el árbitro vuelve a avisar que es nuestro turno, es porque nuestra jugada no le llegó: ignorarlo nos hacía perder igual. Es como corregir una tarea y meter un error nuevo en la corrección. Lo más llamativo: el borrador de Oscar, hecho con otra sesión de Claude, tenía exactamente el mismo error. Dos sesiones de IA, con la misma indicación, se equivocaron de la misma manera. Lo encontró una tercera revisión, de Jonathan.

**Detalle técnico**

- **Fecha, hora y paso del plan:** miércoles 4 de noviembre, 15:02 (revisión) y 15:11 (v1.1), paso 0.
- **Quién:** Jonathan revisó la v0.2; Mariana aplicó los cambios en la v1.1.
- **Herramienta:** Claude, en la sesión de cada uno.
- **Prompts:** de la revisión (Claude Code, Claude Opus 5.5): *"Acabo de subir una nueva versión de los planes ya iterados con esta recomendaciones, como los ves ahora?"*. Para aplicarla: *"Ajusta el último plan enviado con estos ajustes"*, con las 4 observaciones pegadas.
- **Qué estaba mal:**
  1. **El arreglo de la deduplicación de IA-02 trajo un error nuevo.** El plan decía que un turno ya respondido que reaparece "se ignora". Si el árbitro lo entrega, sigue pendiente: ignorarlo hace que el bot pregunte una y otra vez sin pausa (un "ciclo apretado") y que pierda por tiempo. El borrador de Oscar tenía la misma regla. Como la revisión llegó mientras se unían los borradores, el error sobrevivió en la v1.0.
  2. **No había una versión de respaldo** por si las mejoras del bot no llegaban a tiempo.
  3. **La página web se contradecía.** Las columnas llenas estaban desactivadas, así que el clic nunca llegaba y el aviso de "esa columna está llena" no podía aparecer.
  4. **La página podía pedirle dos veces la misma jugada al bot**, por cómo funciona React en modo de desarrollo (StrictMode). La revisión propuso cancelar el pedido repetido con un `AbortController`.
- **Cómo lo detectamos:** una tercera revisión, otra vez con una sesión de Claude distinta.
- **Qué agregó la sesión de Mariana al aplicarla:** cuando se cancela un pedido, el navegador lo informa como un error (`AbortError`). Si la página lo trataba como un error de verdad, mostraría "No se pudo contactar al bot" en partidas normales y llenaría la consola de errores. Por eso el plan dice que ese error de cancelación se ignora en silencio. La revisión no lo había mencionado.
- **Dónde no le hicimos caso a la revisión:**
  - Proponía entregar la versión de respaldo (`v-segura`) si las mejoras no ganaban. La sesión de Mariana advirtió que el jurado no evalúa nada posterior a la versión entregada, y ahí iban a quedar la documentación, el manual y las últimas pruebas. Decisión: las mejoras se activan o desactivan con una opción, y siempre se entrega la última versión.
  - Para la deduplicación, se eliminó: si el árbitro dice que hay turno, se responde. Se agregó una memoria de la última jugada para reenviarla al instante, y una pausa de 200 milisegundos si el árbitro se contradice.
- **¿Para la exposición?** Sí, es la mejor historia.

### IA-05 · Últimas mejoras antes de guardar los planes

**En simple.** Antes de guardar los planes en el repositorio, Jonathan agregó algunas mejoras. La principal no era nueva: la había encontrado una revisión de la v1.0 que la v1.1 no llegó a incorporar (ver la cronología). Por ejemplo, si la clave de acceso del equipo es incorrecta, el bot se detiene y avisa, en lugar de reintentar sin parar molestando al servidor. Y el minitorneo que usamos para decidir si una mejora del bot sirve pasó a jugar más partidas, para que el resultado no dependa de la suerte.

**Detalle técnico**

- **Fecha, hora y paso del plan:** miércoles 4 de noviembre, 15:22, paso 0 (commit `67e3b44`).
- **Quién:** Jonathan.
- **Herramienta:** Claude Code en la terminal, modelo Claude Opus 5.5.
- **Prompts:** sobre la v1.0: *"Cargue una actualización de los planes, vuelve a validar"*. Sobre la v1.1: *"Si, vuelve a revisar los planes y creo que hace falta el AGENT.md verdad?"*.
- **Qué agregó sobre la v1.1:**
  - El código de salida 78 para errores de configuración, con el que el supervisor no vuelve a arrancar el bot: así no golpea al árbitro cada 2 segundos con una clave inválida.
  - El minitorneo (*selfplay*) con al menos 40 aperturas distintas, 80 partidas, porque con menos el resultado es ruido.
  - Las pruebas de operación de la sección 9.4 del plan de backend.
  - `AGENTS.md`, las reglas para la IA, en versión resumida, y `CLAUDE.md`, que hace que Claude Code las lea.
- **¿Para la exposición?** Quizás.

### IA-06 · Una prueba del jueves podría no entrar en el tiempo

**En simple.** Le pedimos a la IA que revisara el repositorio recién creado. Notó que el minitorneo para decidir qué versión del bot entregar está previsto para las 9:30 del jueves, pero con 80 partidas podría tardar entre 8 y 11 minutos, y la entrega cierra a las 9:45. Es una estimación de la IA, todavía sin medir. También encontró detalles para corregir en los archivos.

**Detalle técnico**

- **Fecha, hora y paso del plan:** miércoles 4 de noviembre, después del commit del paso 0.
- **Quién:** Mariana.
- **Herramienta:** Claude (claude.ai) con el conector de GitHub.
- **Prompt:** *"revisa el repo que ya se creo y se agrego agents"*, con el link del repositorio.
- **Qué encontró:**
  - **La decisión de las 9:30 podría no entrar en el tiempo.** Es una consecuencia de la mejora de IA-05: más partidas dan un resultado más confiable, pero tardan más. Se confirma cuando el minitorneo exista y se pueda medir.
  - La nota del encabezado del plan de backend dice v1.0 en un documento v1.1: un síntoma de las versiones sueltas (ver "Lo que aprendimos", punto 7).
  - `AGENTS.md` menciona el archivo del contrato del árbitro (`bot/contract/arbitro-openapi.json`), que todavía no está en el repositorio.
  - A `AGENTS.md` le faltan reglas que evitan errores reales, como las del cliente del árbitro, `aria-disabled` y `AbortController`.
- **Qué decidimos:** medirlo cuando existiera. El minitorneo se hizo en paralelo con varios hilos y **tardó 52 segundos** para 80 partidas (miércoles 4, noche, commit `4fd6efd`). La estimación de la IA era de 8 a 11 minutos para la versión sin paralelizar; la decisión de las 9:30 entra con holgura. Los detalles menores de archivos se corrigieron en `AGENTS.md`.
- **¿Para la exposición?** Quizás.

### IA-07 · Este documento también tuvo errores de la IA

**En simple.** La primera versión de este registro la escribió Claude contando los hechos de memoria, y se equivocó en el orden en que pasaron las cosas. También dejó marcadas como "pendientes" verificaciones que Mariana ya había hecho, así que parecía que no habíamos comprobado nada. Se corrigió dándole a la IA las fuentes reales (los mensajes de Slack) y leyendo con atención lo que entregaba.

**Detalle técnico**

- **Fecha y paso del plan:** miércoles 4 de noviembre, paso 0.
- **Quién:** Mariana.
- **Herramienta:** Claude (claude.ai), con el conector de Slack.
- **Prompts:** *"hagamos la parte de Mariana"*, después *"podes revisar en este hilo que iteramos…"* con el link del canal de Slack, y por último pidiéndole que revisara su propio trabajo.
- **Qué estaba mal:**
  1. **Reconstruyó la historia de memoria y se equivocó.** Decía que la revisión de 4 observaciones se había hecho sobre la v1.0. Las horas de Slack mostraron que fue sobre la v0.2, mientras llegaba el borrador de Oscar. Ese dato cambió la historia de IA-04 y la hizo mejor.
  2. **Marcó las verificaciones de Mariana como hechas, pero dentro de una sección titulada "Verificaciones pendientes".**
  3. **En una revisión posterior, la propia IA encontró más problemas:** faltaban los prompts reales, que el plan exige registrar; había frases confusas como "el borrador de la IA" frente al "de Oscar", cuando los dos se hicieron con IA; y presentaba una estimación de tiempo como si fuera un hecho.
- **Cómo lo detectamos:** el error 1, al darle a la IA la fuente real (Slack); el 2, Mariana al leer el registro; el 3, pidiéndole a la IA que revisara su propio trabajo contra lo que se pedía.
- **Qué decidimos:** la regla del registro que figura al principio: cada hecho sale de una fuente que se pueda mostrar.
- **¿Para la exposición?** Sí.

### IA-08 · Otra IA propuso contar cosas que nunca pasaron

**En simple.** Le pedimos a Gemini, otra IA, que revisara este registro. Propuso agregar tres historias sobre errores de la IA, bien escritas y creíbles, pero que nunca ocurrieron. Por ejemplo, decía que la IA había propuesto usar ciertas reglas del juego que en realidad nadie propuso. Comparamos cada propuesta con los mensajes del equipo y con el historial del repositorio, y lo que no aparecía en ningún lado no entró. Sí aprovechamos sus explicaciones técnicas, que eran correctas.

**Detalle técnico**

- **Fecha y paso del plan:** miércoles 4 de noviembre, paso 0.
- **Quién:** Mariana.
- **Herramienta:** Gemini para la revisión; Claude (claude.ai) para contrastarla con las fuentes.
- **Prompt:** [completar: lo que se le pidió a Gemini]. A Claude: *"gemini detecto que te falta información, revisa el detalle y mejora con otra versión"*.
- **Qué devolvió Gemini:** cinco "omisiones", con tres entradas nuevas redactadas, cambios en las verificaciones y una regla nueva para `AGENTS.md`.
- **Qué estaba mal:**
  1. **Las tres entradas nuevas contaban hechos que no ocurrieron:**
     - Que la IA había propuesto usar las reglas de paridad. Nadie lo propuso: la revisión de IA-02 advirtió que no aplicaban.
     - Que la IA había sugerido detener el proceso trabado enviándole mensajes. Nunca se propuso: terminarlo a la fuerza ya estaba en la v0.2 y en el borrador de Oscar.
     - Que la IA no había advertido el error de cancelación (`AbortError`). Fue al revés: la sesión de Mariana lo agregó por su cuenta (IA-04).
  2. **Daba por comprobado algo que no se midió:** la duración del minitorneo, que sigue siendo una estimación.
  3. **Contradecía el plan:** sugería entregar la versión de respaldo a las 9:30, cuando el plan dice que siempre se entrega la última versión, para no perder la documentación.
  4. **Citaba una regla que no existe:** afirmaba que "acabamos de agregar al plan definitivo" una prohibición de mezclar herramientas del navegador y del servidor. No está en los planes del repositorio (commit `67e3b44`) ni en Slack.
- **Qué sí aportó:** la explicación de por qué el error de cancelación llevaría la página a la pantalla de error (sumada a IA-04), el detalle de que un proceso trabado no puede leer mensajes (sumado a IA-02) y el recordatorio de comprobar la referencia a Victor Allis, que ahora está comprobada.
- **Cómo lo detectamos:** contrastando cada propuesta con Slack, el historial del repositorio, el plan y las conversaciones con Claude.
- **Qué decidimos:** aceptar el contenido técnico y descartar los hechos sin fuente. Si el equipo decide agregar la regla del navegador y el servidor a `AGENTS.md`, se registra cuando ocurra.
- **¿Para la exposición?** Sí: una IA puede escribir una historia convincente sobre algo que no pasó.

### IA-09 · Un error de la IA hacía que cada jugada saliera casi al límite del tiempo

**En simple.** Cuando el bot le manda su jugada al árbitro, le pone un límite de espera: "si no respondes en tantos milisegundos, corto y reintento". La IA calculaba ese límite con decimales (por ejemplo, 925,37 ms), y la función de Node.js que hace el corte solo acepta números enteros. Cada envío fallaba al instante y el bot reintentaba una y otra vez, hasta que el mínimo de 300 ms le daba por casualidad un número entero. La jugada llegaba unos 2,7 segundos después de recibir el turno, con un límite de 3. En el torneo, cualquier demora de internet nos habría hecho perder por tiempo, partida tras partida. Ninguna revisión del plan podía verlo: lo encontró una prueba que juega partidas completas contra el árbitro simulado.

**Detalle técnico**

- **Fecha y paso del plan:** miércoles 4 de noviembre, noche, paso 4 (commit `32e8193`).
- **Quién:** Jonathan.
- **Herramienta:** Claude Code en la terminal, modelo Claude Opus 5.5.
- **Prompt:** *"Vamos a hacerlo todo nosotros, ya mañana que el equipo revise y vea si ajusta su parte, hubo una actualización del resources/arbitro-openapi.json revisala antes de todo"*.
- **Qué devolvió:** el cliente del árbitro con `AbortSignal.timeout(timeoutMs)`, donde `timeoutMs` es lo que queda del plazo según `performance.now()`, un número con decimales.
- **Qué estaba mal:** `AbortSignal.timeout` lanza `RangeError: The value of "delay" is out of range. It must be an integer. Received 925.368125`. El cliente lo trataba como una falla de red y reintentaba cada 50 ms. El reintento escondía el error: el bot "funcionaba", solo que lento.
- **Cómo lo detectamos:** cuatro pruebas de `loop.test.js` (el bot completo contra el mock) superaron el límite de 5 segundos. Un script de diagnóstico mostró las advertencias repetidas y un tiempo de punta a punta de 2,746 ms en un turno.
- **Qué decidimos:** redondear el plazo en el cliente (`Math.floor`) y agregar una prueba de regresión ("acepta un plazo con decimales"). El registro de cada turno incluye el tiempo de punta a punta, que es lo que hizo visible el problema.
- **¿Para la exposición?** Sí: es el ejemplo de por qué hay que probar el sistema completo y no solo las piezas.

### IA-10 · La IA dibujó mal varios tableros de prueba

**En simple.** Muchas pruebas usan tableros dibujados a mano: "en esta posición, el bot tiene que jugar en tal columna". Varias veces la IA dibujó un tablero que no mostraba lo que la prueba decía probar. La prueba fallaba aunque el programa estaba bien. La tentación era "arreglar" el programa para que la prueba pasara; lo correcto fue revisar el tablero casilla por casilla.

**Detalle técnico**

- **Fecha y pasos del plan:** miércoles 4 de noviembre, noche, pasos 2, 3 y app web.
- **Quién:** Jonathan.
- **Herramienta:** Claude Code, modelo Claude Opus 5.5.
- **Qué estaba mal:**
  1. Una prueba de "victoria horizontal en el borde derecho" usaba un tablero con varias líneas ganadoras y no comprobaba el borde. La IA lo vio al releerla antes de correrla.
  2. El tablero de "una jugada que gana en dos direcciones" no formaba dos líneas. La prueba falló; el código estaba bien.
  3. En la prueba de "no jugar debajo de una amenaza del rival", el tablero tenía una amenaza inmediata del rival, así que bloquear era la jugada correcta y el bot hacía bien en jugarla.
  4. En la app, la prueba de columna llena terminaba con una ficha de la persona, así que le tocaba al bot y no a la persona; y en otra prueba, el bot simulado intentaba jugar en la columna ya llena.
- **Cómo lo detectamos:** las pruebas fallaron (salvo la primera) y, antes de tocar el código, se revisó el tablero a mano.
- **Qué decidimos:** corregir los tableros. Ninguna corrección cambió el código del programa. Es la regla de `AGENTS.md`: no se debilita una prueba ni se adapta el código a una prueba equivocada sin entender cuál de los dos falla.
- **¿Para la exposición?** Quizás.

### IA-11 · La IA se adelantó en cosas que después tuvo que deshacer

**En simple.** Trabajando rápido, la IA hizo algunas cosas antes de tiempo o de más, y las corrigió al releer su trabajo contra el plan y contra las reglas del árbitro. Ninguna llegó a afectar al bot.

**Detalle técnico**

- **Fecha y pasos del plan:** miércoles 4 de noviembre, noche, pasos 4 a 6.
- **Quién:** Jonathan.
- **Herramienta:** Claude Code, modelo Claude Opus 5.5.
- **Qué estaba mal:**
  - **Etiquetó `v-segura` antes de tiempo**, después del motor y antes de que el bot jugara partidas completas a través del worker, que es lo que exige el plan. La etiqueta se borró al minuto y se volvió a poner en `33a19a3`, cuando se cumplió el criterio.
  - **El árbitro simulado respondía un estado `lost`** que no existe en el contrato (solo `playing`, `won` y `draw`). Se corrigió antes del commit.
  - **Después de reiniciar un worker trabado, lo "calentaba" con una búsqueda de 300 ms.** Si justo llegaba un turno, quedaba en cola detrás de esa búsqueda y perdía 300 ms de su presupuesto. Se quitó.
  - **Importó un módulo que no existía** (`consistency.js`) para una función de diez líneas. Se reemplazó por funciones de `game/` antes de correr el código.
- **Cómo lo detectamos:** la propia sesión, al releer el código contra `PLAN_BACKEND.md` y el OpenAPI antes de cada commit.
- **¿Para la exposición?** No.

### IA-12 · La versión final de las reglas del árbitro cambió algo que el plan daba por hecho

**En simple.** La noche antes del torneo llegó la versión definitiva del documento que describe cómo hablar con el árbitro. El plan decía que cualquier jugada rechazada hacía perder la partida. La versión nueva aclara que, si el mensaje del bot está mal escrito, el árbitro lo rechaza **sin** penalizar. Antes de programar, le pedimos a la IA que comparara las dos versiones.

**Detalle técnico**

- **Fecha y paso del plan:** miércoles 4 de noviembre, noche, antes del paso 1.
- **Quién:** Jonathan.
- **Herramienta:** Claude Code, modelo Claude Opus 5.5.
- **Prompt:** el mismo de IA-09.
- **Qué encontró** (OpenAPI 0.9.0 contra 1.0.1): un 400 `validation` en `POST /api/move` no penaliza; un 409 también puede ser `unknown_game`; `/api/me` agrega `phase` y `standing` puede ser `null`; hay una fase nueva, `frozen`; la entrega valida la URL del repositorio y el hash con expresiones regulares; el árbitro sirve el contrato vigente en `/api/openapi.json`. El ejemplo de turno sigue siendo inconsistente (IA-01).
- **Qué decidimos:** el cliente trata un 400 `validation` como un error nuestro y no como una derrota; el arranque no depende de `standing`. Los cambios quedan en "Cambios respecto al plan" de `docs/TECNICO.md`, porque los planes no se editan después del primer commit de código.
- **¿Para la exposición?** Quizás.

## Lo que comprobamos por nuestra cuenta

Cosas que la IA afirmó y que no dimos por buenas sin verificarlas.

**Comprobadas:**

- [x] **Las páginas citadas como fuentes en el plan existen y funcionan:** blog.gamesolver.org (Pascal Pons) y chessprogramming.org. La IA las citó de memoria; Mariana entró a las dos (miércoles 4).
- [x] **El ejemplo de las reglas oficiales tiene datos que no cuadran** (IA-01). Lo confirmó Edson Lemus en el grupo de WhatsApp (miércoles 4, 15:32).
- [x] **Existe el trabajo de Victor Allis citado en el plan:** *A Knowledge-based Approach of Connect-Four*, tesis de maestría de la Vrije Universiteit Amsterdam, octubre de 1988. La IA lo citó de memoria; se comprobó con una búsqueda web. Fuentes: el PDF de la tesis (https://oeis.org/A090224/a090224.pdf) y su ficha en https://www.chessprogramming.org/Victor_Allis. De ese trabajo salen las reglas de paridad que decidimos no usar.

**Pendientes:**

- [ ] Que el contenido de las fuentes respalda lo que el plan les atribuye. Lo revisa Oscar cuando programe el motor, porque es quien las va a usar.
- [ ] Que Claude Code lee `CLAUDE.md` y, a través de él, las reglas de `AGENTS.md`. Se comprueba la primera vez que alguien abra el repositorio con Claude Code.
- [ ] Que Node 20 salió de soporte en abril de 2026.
- [x] **Cuánto tarda el minitorneo de 80 partidas** (IA-06): 52 s en 8 hilos, con 200 ms por jugada (`npm run selfplay`, commit `4fd6efd`).

## Glosario

- **Árbitro:** el servidor de los organizadores que controla las partidas. Le avisa a cada bot cuándo le toca, recibe la jugada y revisa que sea válida.
- **Árbitro de práctica (mock):** una copia simulada del árbitro, hecha por nosotros, para probar el bot antes de que exista el real.
- **Bot:** nuestro programa que juega solo.
- **Commit:** cada versión guardada en el repositorio, con fecha y autor. El jurado revisa el historial de commits.
- **Cobertura:** qué porcentaje del código revisan las pruebas automáticas.
- **Deduplicación:** que el bot recuerde qué turnos ya respondió para no responderlos dos veces. La quitamos (IA-04).
- **Jugada de respaldo:** la jugada que el bot envía si no terminó de pensar a tiempo, para no perder por tiempo.
- **Minitorneo (selfplay):** partidas del bot contra otra versión de sí mismo, para saber si un cambio lo mejora.
- **Prompt:** el pedido o instrucción que se le escribe a la IA.
- **Reglas de paridad:** reglas estratégicas clásicas de Cuatro en línea, pensadas para tableros de 6 filas. El nuestro tiene 7, así que no sirven.
- **Repositorio:** el lugar en GitHub donde se guarda todo el proyecto, con el historial de cada cambio.
- **Sesión de IA:** una conversación separada con un asistente de IA. Dos sesiones no comparten lo que se habló en cada una.
- **StrictMode:** un modo de React, la herramienta con la que hicimos la página, que en desarrollo ejecuta algunas acciones dos veces para encontrar errores.
- **Tiempo máximo (timeout):** cuánto se espera una respuesta antes de darla por perdida y reintentar.
- **v-segura:** una versión del bot que sabemos que funciona, guardada como respaldo por si las mejoras posteriores no salen bien.
- **Watchdog (vigilante):** la parte del programa que controla el tiempo y, si el cálculo se traba, lo corta y envía la jugada de respaldo.
- **Worker:** un proceso aparte donde el bot hace sus cálculos, para que el programa principal siga atendiendo al árbitro mientras tanto.

## Cómo agregar una entrada

Cada integrante agrega su entrada al cerrar un paso del plan, o en el momento en que detecta un error de la IA. Se copia esta plantilla al final de "Entradas" y se suma una fila a "En 30 segundos":

```markdown
### IA-XX · Título que cuente qué pasó

**En simple.** Qué pasó, en dos a cuatro oraciones, sin palabras técnicas.

**Detalle técnico**

- **Fecha, hora y paso del plan:**
- **Quién:**
- **Herramienta:** (Claude Code, Claude en claude.ai, Codex, Cursor…)
- **Prompt:** (el texto real, o un resumen fiel si es muy largo)
- **Qué devolvió:**
- **Qué estaba mal (o qué encontró que nosotros no):**
- **Cómo lo detectamos:** (prueba que falló, revisión, partida contra el mock…)
- **Qué decidimos:**
- **¿Para la exposición?** Sí / No
```

Cada dato tiene que salir de una fuente que se pueda mostrar (commit, prueba, mensaje). Lo que no se sabe se marca `[completar]`, no se supone. Si aparece una palabra técnica nueva, se suma al glosario.
