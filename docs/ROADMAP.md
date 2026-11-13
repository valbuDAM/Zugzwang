# Roadmap — Zugzwang

▶ Siguiente tarea: R8 (explicar por qué era mejor la alternativa)

## Notas de traspaso (tarea en curso)

> Lo primero que se lee tras un `/clear`. Se reescribe al cerrar o pausar cada tarea. El detalle de las tareas ya hechas está en el historial de git y en `docs/DECISIONS.md`.

- **Estado al pausar (13-11-2026):**
  - R1–R7 ya están en `main` (#75, #78, #79, #80, #81). **R7b** (insignias en el tablero, mate e icono) está hecha en la rama `feat/board-badges`, con PR abierto: falta que la usuaria lo revise y haga squash merge. **Siguiente: R8.** La rama local `feat/move-reason` solo tenía el commit de estas notas, que ya va dentro del PR de R7b: tras el merge, borrarla y crearla de nuevo desde `main`.
  - **Pedido de la usuaria para R8 (12-11-2026), con sus palabras:** «investigar si fuera posible poner, en vez del porcentaje, por qué era mejor razonándolo». Pide la implementación más simple posible y revisar con cuidado el código; si hay dudas, preguntarle.
  - **Decidido con la usuaria para R8:** la razón sustituye al % cuando la hay; si no hay una clara, queda el % de ahora. Sin servidor ni IA: se razona con las líneas del motor que ya hay (`PositionEval.pv` antes y después de la jugada, `score` con mate).
  - **Antes de codificar R8:** su bloque solo tiene objetivo y pistas; faltan los criterios de aceptación (qué razones y con qué texto exacto). Fijarlos con la usuaria (skill `grilling` si hay que decidir diseño). Es lógica de dominio con casos de ajedrez sutiles (mates, capturas intermedias, sacrificios): si un problema lo pide, la usuaria sube el modelo a mano (ADR-030).
  - **Pistas para R8:** el texto del % es `"drop"` en `src/i18n/es.json:173` (lo pinta `MovePanel`); «Lo mejor era» es `"best"`. Para el material ya hay `sacrifices()` en `src/domain/classify.ts:50` (recorre una línea y cuenta material): reutilizarlo o sacar de ahí un contador. Razones candidatas, de más a menos clara: la mejor daba mate en N; tu jugada permite mate en N; la mejor ganaba material (pieza) en su línea; tu jugada pierde material en la línea del rival. Lógica pura en `src/domain/` con tests primero.
  - **Probar la interfaz aquí:** `preview_start` con `dev` (puerto 5173) → «Ver esta partida» de la portada → «Analizar» (motor real, no necesita la API de chess.com). Para medir el motor: importar `/src/engine/createEngine.ts` y `/src/domain/analysis.ts` desde la consola de la página y cronometrar `analyseGame` (con el panel del navegador oculto los tiempos salen peores).
  - **Esta red bloquea `api.chess.com`** (filtro FortiGuard, categoría «Games»): la búsqueda por usuario falla aquí con un error de CORS; no se rodea. En este equipo la app solo se prueba pegando un PGN; la página de una partida de chess.com solo se ha visto simulando `fetch`. Los e2e no se ven afectados (simulan la API).
  - **Equipo (Windows, trabajo):** Node 26 en `C:\Program Files\nodejs` (si una sesión no lo ve en el PATH, reiniciar la app de Claude). Playwright con Chromium, Firefox y WebKit instalados. Node ejecuta los `.ts` quitando tipos: un script no puede importar `src/domain/pgn.ts` (usa propiedades de parámetro).
  - **Verificado en local en R7:** lint, tipos, 332 tests, build y e2e Chromium + móvil con `--workers=1` (160/160 en 5 repeticiones de `home`, `styleguide` y `report`). El fixture de axe (`tests/e2e/fixtures.ts`) espera ahora a las animaciones: antes fallaba al azar con un `color-contrast` falso. `mutate` por última vez en R3: 87,90 % (`chesscom.ts` 78,68 %, el más flojo).
  - **Sin hacer para v1.0:** los pasos 3–6 de abajo, que son de la usuaria, y `ponytail-audit` de todo el repo.
- **Recta final (ADR-030):** el roadmap se actualiza dentro del PR de cada tarea; no hay PR solo de roadmap ni cierre por hito.
- **Límites conocidos de R1–R7:** nombres de apertura en inglés (vienen así de lichess-org/chess-openings); «brillante» y «gran jugada» sin calibrar con partidas reales (`shortcut:` en `classify.ts`); la única jugada legal no lleva etiqueta pero sí cuenta en la precisión, como en lichess; la barra muestra el mate como «#3», no «M3»; el gráfico no se ha visto con partidas de 300 jugadas; sin probar con lector de pantalla real; la caché de análisis es `analysis:v2:` (los análisis `v1` se repiten); el glifo de la etiqueta en la lista mide 9,6 px (el nombre completo está en el panel de la jugada); en el tablero, a 375 px, la insignia mide 14,5 px; el icono es solo SVG (sin PNG para iOS ni `favicon.ico`); el lector de pantalla oye el mate como el «#» de la jugada, no como «jaque mate».
- **Navegadores, en este equipo (Windows):** Chromium y móvil en verde. Firefox no arranca (`spawn UNKNOWN` al lanzar `firefox.exe`). En WebKit fallan los tests que usan el motor real (el Worker da error) y el de teclado pierde la primera pulsación; pasa igual en versiones anteriores de `main`. El pase de verdad queda para el job manual de la CI (Linux).
- **Deuda aceptada, sigue en pie:**
  - Previews de Cloudflare apagadas (bug [cloudflare/workers-sdk#15682](https://github.com/cloudflare/workers-sdk/issues/15682)): la interfaz se revisa en local con `npm run build && npx vite preview`. Sin comprobar que producción sirva el `.wasm` como `application/wasm` ni `crossOriginIsolated` en Cloudflare (paso 4 de v1.0).
  - Hallazgos de auditoría sin tarea: `UserPage` sigue descargando meses al salir y `?months=999` carga todo el historial; «Cargar mes anterior» puede pisar la lista si se cambia de mes mientras carga; `findGame` baja meses sin cancelar; un solo timeout de 15 s para petición y cuerpo; `new Worker` que lanza síncrono con el motor full no vuelve a lite; `cachedWasm` no revalida el hash; `moveCount` se recalcula en cada render de `GameCard`; código sin uso (`movetime`, `Game.rated`).
  - e2e con Playwright en paralelo falla a veces por carga en local (pasa con `--workers=1`).
  - En móvil (375 px) las letras de las columnas del tablero quedan corridas una casilla a la derecha (la «a» bajo la columna b): chessground las coloca con `left: 24px` fijo. Ya pasaba antes de R7b; arreglo posible: `left: 0` en `.board coords.files` y alinear el texto.
  - En móvil (375 px) un movimiento como `O-O-O` con reloj y evaluación se parte en dos líneas (el guion es un punto de corte). Ya pasaba antes de R7, y R7 lo reduce; arreglo posible: `white-space: nowrap` en la jugada.
- **Avisos:**
  - `stryker.config.json` lleva `"tsconfigFile": "none.json"` a propósito (Stryker no soporta TypeScript 7). Si reaparecen sandboxes en `.stryker-tmp`, quitar primero los junctions con `rmdir`.
  - Los hooks de `.claude/` y todos los comandos necesitan Node ≥ 24 en el PATH.

## Leyenda

- **Estado:** `pendiente` · `en curso` · `en review` · `hecha` · `cancelada`
- **Tests:** U = unitario (Vitest) · C = componente (Testing Library) · E = e2e (Playwright + axe)

## Hecho

M0 Base · M1 Tracer bullet · M2 Carga de partidas · M3 Tablero y reproducción · M4 Motor robusto (PR #1–#73) · R1–R7 (PR #75–#81). Decisiones en ADR-001 a ADR-032.

---

## Recta final hasta v1.0

### R1 · Dominio del análisis — `hecha`
**Objetivo:** todo el cálculo, sin interfaz.
- % de victoria y precisión de lichess (ADR-011).
- Clasificación: mejor, buena, imprecisión, error, error grave, libro, gran jugada, brillante y oportunidad perdida (ADR-012).
- Libro de aperturas de lichess-org/chess-openings (CC0), en un chunk aparte (≤ 120 KB gz).
**Aceptación:**
- Dados los vectores de `AccuracyPercentTest` de lichess, cuando calculo, entonces coinciden dentro de su tolerancia.
- Dada una caída de 12, cuando clasifico, entonces la etiqueta es «error»; dada una jugada igual a la PV1, entonces es «mejor».
- Dada 1.e4 e5 2.Cf3 Cc6 3.Ab5, cuando clasifico, entonces las 5 jugadas son «libro» y la apertura es «Ruy Lopez».
**Tests:** U (un caso por frontera de umbral, propiedades de la curva, libro real).

### R2 · Interfaz del análisis, tema claro y animaciones — `hecha`
**Objetivo:** ver y entender la partida analizada.
- Etiqueta de cada jugada en la lista y nombre de la apertura.
- Gráfico SVG propio: área, marcadores por etiqueta, línea de la jugada actual, clic o teclado para saltar, alternativa textual.
- Panel de la jugada: etiqueta, caída en %, mejor alternativa con flecha en el tablero y su línea navegable (solo lectura, con vuelta a la partida).
- Resumen: precisión por bando y recuento de etiquetas.
- Tema claro opcional (por defecto el del sistema; la preferencia se guarda).
- Animaciones: la barra, la entrada del resumen y el cambio de pantalla, solo con `transform`/`opacity` y nada con `prefers-reduced-motion`.
**Aceptación:**
- Dado el gráfico, cuando hago clic en un punto, entonces el tablero salta a esa jugada.
- Dada una jugada «error», cuando la selecciono, entonces veo la mejor alternativa con su flecha y puedo recorrer su línea y volver.
- Dado un lector de pantalla, cuando llega al gráfico, entonces se anuncia un resumen.
- Dados los dos temas, cuando pasa axe, entonces no hay infracciones.
**Tests:** C · E + axe (dos temas, reduced-motion).
**Skills:** frontend-design.

### R3 · Lanzamiento v1.0 — `hecha`
**Objetivo:** cumplir la GPL y publicar.
- README (qué es, cómo ejecutarlo, licencia) y atribuciones: Stockfish, chessground, chessops, chess-openings, piezas y fuentes.
- Página «Acerca de» con enlace al código fuente y a la versión exacta del motor.
- e2e en Firefox y WebKit (job manual de CI) con sus correcciones.
- Cierre único: `ponytail-audit`, `ponytail-debt`, `npm run mutate` (≥ 80 % en `src/domain/`), `.wasm` y `crossOriginIsolated` comprobados en producción, etiqueta `v1.0.0`.
**Sin hacer en R3:** `ponytail-audit` de todo el repo y el pase de Firefox/WebKit en la CI (cuenta de GitHub bloqueada).

### R4 · Portada y partida en dos columnas — `hecha`
**Objetivo:** que la portada no esté vacía y que el análisis se lea junto al tablero (petición de la usuaria tras probar R3).
- Portada: marca y entradas a la izquierda; a la derecha, la mesa del club con la posición final de Sämisch – Nimzowitsch (1923), que se abre en el visor con «Ver esta partida». Debajo, qué enseña el análisis.
- Partida (≥ 64rem): tablero fijo a la izquierda; a la derecha, datos de la partida y un panel con precisión, apertura, gráfico, jugada actual, lista de jugadas y recuento de etiquetas. En estrecho, una columna.
- Los interruptores «Girar tablero» y «Sonidos» muestran su estado.
**Skills:** frontend-design, ponytail-review.

### R5 · Análisis más rápido — `hecha`
**Objetivo:** que una partida se analice en mucho menos tiempo (petición de la usuaria: «el motor analiza lentísimo»).
- Sin MultiPV: costaba 4,5 veces más cada búsqueda.
- La segunda puntuación («gran jugada») sale de una segunda búsqueda a la misma profundidad sin la mejor jugada (`searchmoves`), solo donde esa jugada fue la jugada hecha (ADR-031).
**Aceptación:**
- Dada la partida de la Ópera a profundidad 16 con lite de un hilo, cuando la analizo, entonces tarda bastante menos que con MultiPV 2 (43,6 s → 25,5 s).
- Dada una jugada que no es la mejor, cuando la analizo, entonces solo hay una búsqueda en esa posición.
**Tests:** U (`analyseGame`: cuándo se pide la segunda búsqueda, enroque y coronación en `searchmoves`, profundidad distinta) · E (no se envía MultiPV).

### R6 · Varios motores en paralelo — `hecha`
**Objetivo:** que una partida de chess.com no tarde minutos (la usuaria: «sigue yendo lentísimo»).
- Medido: a profundidad fija, 4 hilos no terminan antes que 1; 4 motores de un hilo con posiciones distintas sí (32 posiciones: 15,1 s → 4,5 s; más de 4 no gana).
- Lite (y asm) con hasta 4 motores de un hilo y 16 MB de hash cada uno (2 en móvil); el modo profundo sigue con un motor y varios hilos (ADR-032).
**Aceptación:**
- Dada la partida de la Ópera a profundidad 16 en un equipo de escritorio, cuando la analizo, entonces tarda menos de la mitad que en R5 (~45 s → 11,3 s).
- Dado un motor que va más lento en la primera posición, cuando las demás terminan antes, entonces el progreso no avanza hasta que termina la primera.
- Dado un fallo en una posición, entonces no se informa nada más.
**Tests:** U (`EnginePool`, `analyseGame` en paralelo, ajustes).

### R7 · Etiqueta en la esquina de cada jugada — `hecha`
**Objetivo:** que el estado de cada jugada (libro, mejor, brillante…) se vea de un vistazo.
- El icono de la etiqueta va arriba a la derecha de la casilla de cada jugada en la lista.
**Aceptación:**
- Dada una partida analizada, cuando miro la lista, entonces cada jugada con etiqueta lleva su icono en la esquina superior derecha de su casilla, sin tapar la jugada, el reloj ni la evaluación, en escritorio y en móvil.
- Dado un lector de pantalla, cuando llega a una jugada, entonces sigue oyendo el nombre de la etiqueta.
**Tests:** C (la etiqueta va dentro de su jugada y con su nombre; las jugadas sin etiqueta no llevan icono) · colocación comprobada en el navegador (jsdom no calcula la maquetación).
**Skills:** frontend-design.

### R7b · Etiqueta en la casilla del tablero, mate e icono — `hecha`
**Objetivo:** ver en el propio tablero qué tal fue la jugada (pedido de la usuaria, 13-11-2026, con capturas de chess.com).
- La etiqueta de la jugada va en la esquina superior derecha de la casilla a la que llegó la pieza; el rey que recibe mate lleva un `#` rojo. Icono de la app (`public/favicon.svg`).
**Aceptación:**
- Dada una partida analizada, cuando voy a una jugada con etiqueta, entonces su insignia aparece en la casilla de destino (en el enroque, la del rey), también con el tablero girado y en móvil.
- Dada una jugada de mate, analizada o no la partida, entonces el rey que lo recibe lleva un `#` rojo.
- Dada la línea del motor en el tablero, entonces no hay insignias de la partida.
- Dada la pestaña del navegador, entonces muestra el icono de la app.
**Tests:** U (`Position.mated`) · C (`Board`: casilla y tablero girado; `GameViewer`: etiqueta, mate, línea del motor, sin analizar) · colocación comprobada en el navegador (escritorio y 375 px).
**Skills:** frontend-design.

### R8 · Por qué era mejor — `pendiente`
**Objetivo:** en el panel de la jugada, explicar la alternativa en vez de solo dar el % perdido.
- Razones sacadas de las líneas del motor, sin servidor: mate que se daba o se permitía, material que se ganaba o se perdía. Sin razón clara, queda el % de ahora.

### v1.0 · Publicar — `pendiente` (pasos de la usuaria)
1. ~~Desbloquear la cuenta de GitHub y relanzar la CI.~~ Hecho.
2. ~~Squash merge de R1–R7.~~ Hecho (#75, #78, #79, #80 y #81).
3. Lanzar el job manual de CI con todos los navegadores (`all_browsers`) sobre `main` y corregir lo que salga.
4. En producción: comprobar que `/engine/stockfish-19-lite-single.wasm` se sirve como `application/wasm` y que `crossOriginIsolated` es `true`.
5. `git tag v1.0.0 && git push origin v1.0.0`.
6. Opcional: `ponytail-audit` y revisar `/usage`.

---

## Backlog post-v1.0 (sin orden; pasar por grilling antes de planificar)

- Momentos clave con botón y tecla `N` (ADR-014)
- Repaso del diseño de todos los estados vacío, de carga y de error
- Pase manual con NVDA
- Nombres de apertura en español
- Partidas de lichess
- Pantalla de historial de análisis
- Estadísticas agregadas
- Modo explorar posición y jugar variantes
- Reentrenar mis errores
- Soporte de Chess960
- Traducción al inglés
- PWA / offline

**Cancelada:** rendimiento estimado (Elo orientativo, ADR-013): sin fuente citable.

## Casos de error → dónde se tratan

| Caso | Código |
|---|---|
| Usuario inexistente o sin partidas, 429, red caída, timeout | `chesscom.ts`, `ApiError.tsx` |
| Partidas no estándar | `pgn.ts` (`isStandard`), `GamePage.tsx` |
| PGN malformado | `pgn.ts` (`PgnError`), `PastePgn.tsx` |
| Motor que no carga, navegador sin hilos | `variant.ts`, `UciEngine.ts`, `GameViewer.tsx` |
| Cuota de IndexedDB llena | `chesscom.ts`, `analysisCache.ts` |
| unpkg caído (modo profundo) | `fullWasm.ts`, `useDeepMode.ts` |
