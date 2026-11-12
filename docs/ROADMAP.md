# Roadmap — Zugzwang

▶ Siguiente tarea: R3 (lanzamiento v1.0)

## Notas de traspaso (tarea en curso)

> Lo primero que se lee tras un `/clear`. Se reescribe al cerrar o pausar cada tarea. El detalle de las tareas ya hechas está en el historial de git y en `docs/DECISIONS.md`.

- **Recta final (ADR-030):** lo que quedaba de M5–M7 se hace en tres PR (R1, R2, R3). El roadmap se actualiza dentro del PR de cada uno; ya no hay PR solo de roadmap ni cierre por hito.
- **Entregado en R1 (dominio, sin interfaz nueva):**
  - `Eval.second` (puntuación de la segunda línea de MultiPV, solo si es de la misma profundidad que la primera).
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
- **Deuda aceptada, sigue en pie:**
  - Previews de Cloudflare apagadas (bug [cloudflare/workers-sdk#15682](https://github.com/cloudflare/workers-sdk/issues/15682)): la interfaz se revisa en local con `npm run build && npx vite preview`. Sin comprobar que producción sirva el `.wasm` como `application/wasm` ni `crossOriginIsolated` en Cloudflare: mirarlo en R3.
  - Hallazgos de auditoría sin tarea: `UserPage` sigue descargando meses al salir y `?months=999` carga todo el historial; «Cargar mes anterior» puede pisar la lista si se cambia de mes mientras carga; `findGame` baja meses sin cancelar; un solo timeout de 15 s para petición y cuerpo; `new Worker` que lanza síncrono con el motor full no vuelve a lite; `cachedWasm` no revalida el hash; `moveCount` se recalcula en cada render de `GameCard`; código sin uso (`movetime`, `Game.rated`).
  - e2e con Playwright en paralelo falla a veces por carga en local (pasa con `--workers=1`).
- **Avisos:**
  - `stryker.config.json` lleva `"tsconfigFile": "none.json"` a propósito (Stryker no soporta TypeScript 7). Si reaparecen sandboxes en `.stryker-tmp`, quitar primero los junctions con `rmdir`.
  - Los hooks de `.claude/` y todos los comandos necesitan Node ≥ 24 en el PATH.

## Leyenda

- **Estado:** `pendiente` · `en curso` · `en review` · `hecha` · `cancelada`
- **Tests:** U = unitario (Vitest) · C = componente (Testing Library) · E = e2e (Playwright + axe)

## Hecho

M0 Base · M1 Tracer bullet · M2 Carga de partidas · M3 Tablero y reproducción · M4 Motor robusto (PR #1–#73). Decisiones en ADR-001 a ADR-029.

---

## Recta final hasta v1.0

### R1 · Dominio del análisis — `en review`
**Objetivo:** todo el cálculo, sin interfaz.
- % de victoria y precisión de lichess (ADR-011).
- Clasificación: mejor, buena, imprecisión, error, error grave, libro, gran jugada, brillante y oportunidad perdida (ADR-012).
- Libro de aperturas de lichess-org/chess-openings (CC0), en un chunk aparte (≤ 120 KB gz).
**Aceptación:**
- Dados los vectores de `AccuracyPercentTest` de lichess, cuando calculo, entonces coinciden dentro de su tolerancia.
- Dada una caída de 12, cuando clasifico, entonces la etiqueta es «error»; dada una jugada igual a la PV1, entonces es «mejor».
- Dada 1.e4 e5 2.Cf3 Cc6 3.Ab5, cuando clasifico, entonces las 5 jugadas son «libro» y la apertura es «Ruy Lopez».
**Tests:** U (un caso por frontera de umbral, propiedades de la curva, libro real).

### R2 · Interfaz del análisis, tema claro y animaciones — `en review`
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

### R3 · Lanzamiento v1.0 — `pendiente`
**Objetivo:** cumplir la GPL y publicar.
- README (qué es, cómo ejecutarlo, licencia) y atribuciones: Stockfish, chessground, chessops, chess-openings, piezas y fuentes.
- Página «Acerca de» con enlace al código fuente y a la versión exacta del motor.
- e2e en Firefox y WebKit (job manual de CI) con sus correcciones.
- Cierre único: `ponytail-audit`, `ponytail-debt`, `npm run mutate` (≥ 80 % en `src/domain/`), `.wasm` y `crossOriginIsolated` comprobados en producción, etiqueta `v1.0.0`.
**Pendiente de la usuaria:** lanzar el job manual de navegadores, squash merge y `/usage`.

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
