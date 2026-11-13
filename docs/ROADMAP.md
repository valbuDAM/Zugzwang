# Roadmap — Zugzwang

▶ Siguiente tarea: R8 (explicar por qué era mejor la alternativa)

## Notas de traspaso (tarea en curso)

> Lo primero que se lee tras un `/clear`. Se reescribe al cerrar o pausar cada tarea. El detalle de las tareas ya hechas está en el historial de git y en `docs/DECISIONS.md`.

- **Estado al pausar (13-11-2026):**
  - R1–R6 ya están en `main` (#75, #78, #79, #80). R7 está hecha en la rama `feat/move-badge-corner` (PR abierto, pendiente de CI y de que la usuaria lo revise y haga squash merge). R8 en otra rama desde `main` cuando R7 esté fusionado.
  - **R7:** solo CSS en `src/ui/MoveList.css`: el botón de cada jugada es `position: relative` con `padding-inline-end` para que el icono no tape el reloj ni la evaluación, y `.move-list .move-badge` va absoluto arriba a la derecha (16 px, aro del color del fondo para separarlo de la jugada resaltada). `MoveBadge.tsx/.css` no cambia, así que `MovePanel`, `AnalysisSummary` y `Home` siguen igual. Comprobado en el navegador con la partida de muestra analizada: 50 etiquetas dentro de su botón, a 4 px de la esquina, sin solape, en escritorio y en móvil (375 px, sin scroll horizontal). Límite: a 9,6 px el glifo es pequeño; el nombre completo sigue en el panel de la jugada y en el nombre accesible. `report.spec.ts` fija la colocación (caja del icono dentro de la esquina superior derecha y fuera del texto de la jugada).
  - **Pruebas inestables arregladas de paso:** dos pasadas completas de e2e fallaron cada una en una prueba distinta (`home.spec.ts` en móvil, `styleguide.spec.ts`) con `color-contrast` de axe, porque axe leía el texto a medias de la animación de entrada (`@keyframes enter`, de R2). `tests/e2e/fixtures.ts` espera ahora a `document.getAnimations()` antes de axe (commit aparte). 160/160 en 5 repeticiones de home, styleguide y report (Chromium + móvil).
  - **R5 (#79):** análisis sin MultiPV (ADR-031). `analyseGame` pide la segunda puntuación con una búsqueda `searchmoves` solo donde se jugó la mejor jugada. La caché sigue en `analysis:v2:`.
  - **R6 (#80):** varios motores de un hilo en paralelo (ADR-032). `EnginePool` (`src/domain/engine/EnginePool.ts`) implementa `Engine` y expone `parallel`; `analyseGame` abre una «calle» por motor y solo informa el prefijo en orden. `AnalysisSettings` gana `engines`. Medido en el navegador de este equipo (12 núcleos, partida de la Ópera, profundidad 16): de ~45 s a 11,3 s; la primera jugada aparece a los 2 s. Sin probar con una partida real del perfil de chess.com (esta red bloquea la API), ni en móvil, Firefox o WebKit.
  - **Medir el motor en el navegador:** `preview_start` con `dev`, pegar un PGN y, en la consola de la página, importar `/src/engine/createEngine.ts` y `/src/domain/analysis.ts` (Vite los sirve) y cronometrar `analyseGame`. Con el panel del navegador oculto los tiempos pueden salir peores.
  - **Pedido por la usuaria tras R6 (12-11-2026), con sus palabras:** «el icono de libro, mejor, excelente, brillante, etc. tiene que ir arriba a la derecha de cada casilla de cada movimiento, para que esté claro el estado» (R7) e «investigar si fuera posible poner, en vez del porcentaje, por qué era mejor razonándolo» (R8). Pide la implementación más simple posible y revisar con cuidado el código; si hay dudas, preguntarle.
  - **Decidido con la usuaria para R8:** la razón sustituye al % cuando la hay; si no hay una clara, queda el % de ahora. Sin servidor ni IA: se razona con las líneas del motor que ya hay (`PositionEval.pv` antes y después de la jugada, `score` con mate).
  - **Pistas para R8:** el texto del % es `"drop"` en `src/i18n/es.json:173` (lo pinta `MovePanel`); «Lo mejor era» es `"best"`. Para el material ya hay `sacrifices()` en `src/domain/classify.ts:50` (recorre una línea y cuenta material): reutilizarlo o sacar de ahí un contador. Razones candidatas, de más a menos clara: la mejor daba mate en N; tu jugada permite mate en N; la mejor ganaba material (pieza) en su línea; tu jugada pierde material en la línea del rival. Lógica pura en `src/domain/` con tests primero.
  - **Esta red bloquea `api.chess.com`** (filtro FortiGuard, categoría «Games»): la búsqueda por usuario falla aquí con un error de CORS; no se rodea. En este equipo la app solo se prueba pegando un PGN. Los e2e no se ven afectados (simulan la API).
  - **Equipo (Windows, trabajo):** Node 26 en `C:\Program Files\nodejs` (si una sesión no lo ve en el PATH, reiniciar la app de Claude). Playwright con Chromium, Firefox y WebKit instalados. Node ejecuta los `.ts` quitando tipos: un script no puede importar `src/domain/pgn.ts` (usa propiedades de parámetro).
  - **Verificado en local sobre `chore/r3-release`:** lint, tipos, 322 tests, build, 69 e2e (Chromium + móvil, 1 omitido a propósito), `mutate` 87,90 % (`chesscom.ts` 78,68 % el más flojo, sin tocar).
  - **Sin hacer:** `ponytail-audit` de todo el repo; pase de Firefox/WebKit en la CI; comprobaciones en producción; etiqueta `v1.0.0`.
  - **Probado a mano por la usuaria:** el servidor de desarrollo (`npm run dev`, puerto 5173, configuración `dev` de `.claude/launch.json`) con un PGN pegado.
  - **R4 (rama `feat/home-and-review-layout`, sale de `chore/r3-release`):** portada rediseñada y partida en dos columnas (ver el bloque R4 y `docs/DESIGN.md` › Disposición). `AnalysisSummary` ahora solo lleva la precisión; el recuento de etiquetas es `LabelCounts` (mismo archivo). `GameViewer` acepta `children` (los datos de la partida). Tokens nuevos: `--page-wide`, `--board-max`, `--side-min`. La página de una partida de chess.com solo se ha visto aquí simulando `fetch` en el navegador (la red bloquea la API). Verificado en local: lint, tipos, 323 tests, build, 69 e2e (`--workers=1`).
- **Recta final (ADR-030):** lo que quedaba de M5–M7 se hace en tres PR (R1, R2, R3). El roadmap se actualiza dentro del PR de cada uno; ya no hay PR solo de roadmap ni cierre por hito.
- **Entregado en R1 (dominio, sin interfaz nueva):**
  - `Eval.second` (segunda línea de MultiPV; quitado en R5, ADR-031: ahora la da una segunda búsqueda en `analyseGame`).
  - `analyseGame` devuelve `PositionEval[]` (`score` desde blancas, `pv`, `second`). La caché pasa a `analysis:v2:` (los análisis guardados con `v1` se repiten).
  - `src/domain/accuracy.ts`: `moveAccuracy`, `winDrops`, `gameAccuracy` (fórmula de lichess, con su `+1`).
  - `src/domain/classify.ts`: `classifyGame(positions, evals, book)` → etiqueta por jugada; `THRESHOLDS`; `MOVE_LABELS` y `MoveLabel` viven aquí (antes en `MoveBadge`).
  - `src/domain/openings.ts`: `loadBook()` (import dinámico de `src/data/openings.json`), `inBook`, `openingName`. El JSON se regenera con `npm run build:openings`.
  - `GameViewer` solo se adapta al tipo nuevo: todavía no muestra etiquetas, precisión ni apertura (R2).
- **Límites de R1:** los nombres de apertura están en inglés (así vienen en lichess-org/chess-openings); «brillante» y «gran jugada» sin calibrar con partidas reales (`shortcut:` en `classify.ts`); la única jugada legal no lleva etiqueta pero sí cuenta en la precisión, como en lichess.
- **Entregado en R2 (interfaz):**
  - `GameViewer` calcula el informe (`classifyGame`, `winDrops`, `gameAccuracy`) solo con el análisis terminado y carga el libro al montar.
  - `MoveList` con la etiqueta de cada jugada; nombre de la apertura sobre la lista.
  - `EvalGraph` (SVG, `role="slider"`, descrito por el resumen; el clic salta a la jugada y las flechas son las del visor).
  - `MovePanel`: etiqueta, % perdido, mejor alternativa con flecha en el tablero (`Board` acepta `arrow`) y su línea navegable (`src/domain/line.ts`, `playLine`). Al cambiar de jugada se sale de la línea.
  - `AnalysisSummary`: precisión por bando y recuento de etiquetas.
  - Tema: `src/ui/theme.ts` + botón «Modo claro» en `App` (sigue al sistema hasta que se elige; se guarda en `localStorage`). Playwright corre en oscuro salvo `report.spec.ts`, que prueba el claro con axe.
  - Animaciones: `@keyframes enter` en `base.css` para cada pantalla (`main`) y para el resumen; con `prefers-reduced-motion` las duraciones son 0.
- **Límites de R2:** la barra sigue mostrando el mate como «#3», no «M3»; sin transición animada entre pantallas más allá de la entrada; el gráfico no se ha visto con partidas de 300 jugadas; no probado con lector de pantalla real; skill `frontend-design` no disponible en la sesión que lo hizo.
- **Entregado en R3:** `README.md` con atribuciones, página «Acerca de» (`/acerca`, enlazada desde la barra) con el código fuente y la versión exacta del motor, versión `1.0.0` en `package.json`. `ponytail-debt`: 12 marcadores `shortcut:`, todos con límite y cuándo mejorarlo.
- **Navegadores, en este equipo (Windows):** Chromium y móvil en verde (69 e2e). Firefox no arranca (`spawn UNKNOWN` al lanzar `firefox.exe`). En WebKit fallan los tests que usan el motor real (el Worker da error) y el de teclado pierde la primera pulsación; las dos cosas pasan igual en `main`, así que no vienen de R1–R3, pero el pase de verdad queda para el job manual de la CI (Linux), donde antes pasaban.
- **Deuda aceptada, sigue en pie:**
  - Previews de Cloudflare apagadas (bug [cloudflare/workers-sdk#15682](https://github.com/cloudflare/workers-sdk/issues/15682)): la interfaz se revisa en local con `npm run build && npx vite preview`. Sin comprobar que producción sirva el `.wasm` como `application/wasm` ni `crossOriginIsolated` en Cloudflare: mirarlo en R3.
  - Hallazgos de auditoría sin tarea: `UserPage` sigue descargando meses al salir y `?months=999` carga todo el historial; «Cargar mes anterior» puede pisar la lista si se cambia de mes mientras carga; `findGame` baja meses sin cancelar; un solo timeout de 15 s para petición y cuerpo; `new Worker` que lanza síncrono con el motor full no vuelve a lite; `cachedWasm` no revalida el hash; `moveCount` se recalcula en cada render de `GameCard`; código sin uso (`movetime`, `Game.rated`).
  - e2e con Playwright en paralelo falla a veces por carga en local (pasa con `--workers=1`).
  - En móvil (375 px) un movimiento como `O-O-O` con reloj y evaluación se parte en dos líneas (el guion es un punto de corte). Ya pasaba antes de R7, y R7 lo reduce; arreglo posible: `white-space: nowrap` en la jugada.
- **Avisos:**
  - `stryker.config.json` lleva `"tsconfigFile": "none.json"` a propósito (Stryker no soporta TypeScript 7). Si reaparecen sandboxes en `.stryker-tmp`, quitar primero los junctions con `rmdir`.
  - Los hooks de `.claude/` y todos los comandos necesitan Node ≥ 24 en el PATH.

## Leyenda

- **Estado:** `pendiente` · `en curso` · `en review` · `hecha` · `cancelada`
- **Tests:** U = unitario (Vitest) · C = componente (Testing Library) · E = e2e (Playwright + axe)

## Hecho

M0 Base · M1 Tracer bullet · M2 Carga de partidas · M3 Tablero y reproducción · M4 Motor robusto (PR #1–#73). Decisiones en ADR-001 a ADR-032.

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

### R7 · Etiqueta en la esquina de cada jugada — `en review`
**Objetivo:** que el estado de cada jugada (libro, mejor, brillante…) se vea de un vistazo.
- El icono de la etiqueta va arriba a la derecha de la casilla de cada jugada en la lista.
**Aceptación:**
- Dada una partida analizada, cuando miro la lista, entonces cada jugada con etiqueta lleva su icono en la esquina superior derecha de su casilla, sin tapar la jugada, el reloj ni la evaluación, en escritorio y en móvil.
- Dado un lector de pantalla, cuando llega a una jugada, entonces sigue oyendo el nombre de la etiqueta.
**Tests:** C (la etiqueta va dentro de su jugada y con su nombre; las jugadas sin etiqueta no llevan icono) · colocación comprobada en el navegador (jsdom no calcula la maquetación).
**Skills:** frontend-design.

### R8 · Por qué era mejor — `pendiente`
**Objetivo:** en el panel de la jugada, explicar la alternativa en vez de solo dar el % perdido.
- Razones sacadas de las líneas del motor, sin servidor: mate que se daba o se permitía, material que se ganaba o se perdía. Sin razón clara, queda el % de ahora.

### v1.0 · Publicar — `pendiente` (pasos de la usuaria)
1. ~~Desbloquear la cuenta de GitHub y relanzar la CI.~~ Hecho.
2. ~~Squash merge de R1–R4.~~ Hecho (#75 y #78).
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
