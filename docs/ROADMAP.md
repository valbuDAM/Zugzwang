# Roadmap — Zugzwang

▶ Siguiente tarea: v1.0 · Publicar (pasos de la usuaria), tras el squash merge del PR de limpieza

## Notas de traspaso (tarea en curso)

> Lo primero que se lee tras un `/clear`. Se reescribe al cerrar o pausar cada tarea. El detalle de las tareas ya hechas está en el historial de git y en `docs/DECISIONS.md`.

- **Estado al pausar (13-11-2026):**
  - R1–R8 en `main` (#75–#83). **Limpieza para v1.0 hecha** en la rama `chore/v1-cleanup` (ADR-034), PR [#84](https://github.com/valbuDAM/Zugzwang/pull/84). Falta que pase la CI y que la usuaria lo revise y haga squash merge.
  - **GitHub Actions vuelve a estar bloqueado por facturación** (13-11-2026): los jobs no llegan a arrancar («account is locked due to a billing issue») y los últimos pushes a `main` salen en rojo por eso, no por el código. **La usuaria ha abierto un ticket a GitHub Support** (13-11-2026): el repo es público y Actions no debería cobrar nada.
  - **Para retomar:** 1) ¿respondió GitHub al ticket? Comprobar si Actions arranca: `gh pr checks 84` y, si sigue en rojo, leer las anotaciones del job (`gh api repos/valbuDAM/Zugzwang/check-runs/<job>/annotations`). 2) Con la cuenta desbloqueada, relanzar la CI del #84 (`gh run rerun <run> --failed`). 3) En verde: revisar en local y squash merge. 4) Seguir con [Reflow a 320 px](#reflow-a-320-px--pendiente).
  - **Producción comprobada (13-11-2026)** en https://chessanalyzer.bvalbuena06.workers.dev/: `crossOriginIsolated` es `true`, llegan COOP y COEP, el `.wasm` se sirve como `application/wasm` y las rutas internas responden 200 (fallback SPA). Cloudflare Workers Builds despliega cada push a `main`.
  - **Probar la interfaz aquí:** `preview_start` con `dev` (puerto 5173) → «Ver esta partida» de la portada → «Analizar» (motor real, no necesita la API de chess.com). Para medir el motor: importar `/src/engine/createEngine.ts` y `/src/domain/analysis.ts` desde la consola de la página y cronometrar `analyseGame` (con el panel del navegador oculto los tiempos salen peores).
  - **Esta red bloquea `api.chess.com`** (filtro FortiGuard, categoría «Games»): la búsqueda por usuario falla aquí con un error de CORS; no se rodea. En este equipo la app solo se prueba pegando un PGN; la página de una partida de chess.com solo se ha visto simulando `fetch`. Los e2e no se ven afectados (simulan la API).
  - **Equipo (Windows, trabajo):** Node 26 en `C:\Program Files\nodejs` (si una sesión no lo ve en el PATH, reiniciar la app de Claude). Playwright con Chromium, Firefox y WebKit instalados. Node ejecuta los `.ts` quitando tipos: un script no puede importar `src/domain/pgn.ts` (usa propiedades de parámetro).
  - **Verificado en local en la limpieza:** lint, tipos, 363 tests (98,78 % de ramas en `src/domain/`; el más bajo, `chesscom.ts`, 96,03 %), hooks, hashes del motor, build y e2e Chromium + móvil con `--workers=1` (67 pasan, 1 omitido). Botón de tema y duración del fundido (0,42 s) comprobados en el navegador; el fundido en pantalla no se ha visto (panel oculto). Móvil a 375 px comprobado.
- **Recta final (ADR-030):** el roadmap se actualiza dentro del PR de cada tarea; no hay PR solo de roadmap ni cierre por hito.
- **Límites conocidos de R1–R7:** nombres de apertura en inglés (vienen así de lichess-org/chess-openings); «brillante» y «gran jugada» sin calibrar con partidas reales (`shortcut:` en `classify.ts`); la única jugada legal no lleva etiqueta pero sí cuenta en la precisión, como en lichess; la barra muestra el mate como «#3», no «M3»; el gráfico no se ha visto con partidas de 300 jugadas; sin probar con lector de pantalla real; la caché de análisis es `analysis:v2:` (los análisis `v1` se repiten); el glifo de la etiqueta en la lista mide 9,6 px (el nombre completo está en el panel de la jugada); en el tablero, a 375 px, la insignia mide 14,5 px; el icono es solo SVG (sin PNG para iOS ni `favicon.ico`); el lector de pantalla oye el mate como el «#» de la jugada, no como «jaque mate».
- **Navegadores, en este equipo (Windows):** Chromium y móvil en verde. Firefox no arranca (`spawn UNKNOWN` al lanzar `firefox.exe`). En WebKit fallan los tests que usan el motor real (el Worker da error) y el de teclado pierde la primera pulsación; pasa igual en versiones anteriores de `main`. El pase de verdad queda para el job manual de la CI (Linux).
- **Deuda aceptada, sigue en pie:**
  - Previews de Cloudflare apagadas (bug [cloudflare/workers-sdk#15682](https://github.com/cloudflare/workers-sdk/issues/15682)): la interfaz se revisa en local con `npm run build && npx vite preview`.
  - Hallazgos de auditoría sin tarea: `UserPage` sigue descargando meses al salir y `?months=999` carga todo el historial; «Cargar mes anterior» puede pisar la lista si se cambia de mes mientras carga; `findGame` baja meses sin cancelar; un solo timeout de 15 s para petición y cuerpo; `new Worker` que lanza síncrono con el motor full no vuelve a lite; `cachedWasm` no revalida el hash; `moveCount` se recalcula en cada render de `GameCard`.
  - e2e con Playwright en paralelo falla a veces por carga en local (pasa con `--workers=1`).
  - **A 320 px hay scroll horizontal** (WCAG 1.4.10, ya pasaba antes de la limpieza). Tarea propia: [Reflow a 320 px](#reflow-a-320-px--pendiente), paso 3 de v1.0.
  - Sin la hoja de estilo, axe ya no revisa en los dos temas las etiquetas que no salen en las partidas de los e2e («brillante», «gran jugada»…); los contrastes medidos están en `DESIGN.md`.
  - En móvil (375 px), con reloj y evaluación, la fila de un `O-O-O` sale unos 9 px más ancha que las demás (antes se partía en dos líneas).
- **Avisos:** los hooks de `.claude/` y todos los comandos necesitan Node ≥ 24 en el PATH. Sin mutation testing desde ADR-034 (Stryker no soporta TypeScript 7).

## Leyenda

- **Estado:** `pendiente` · `en curso` · `en review` · `hecha` · `cancelada`
- **Tests:** U = unitario (Vitest) · C = componente (Testing Library) · E = e2e (Playwright + axe)

## Hecho

- M0 Base · M1 Tracer bullet · M2 Carga de partidas · M3 Tablero y reproducción · M4 Motor robusto (PR #1–#73).
- R1 Dominio del análisis · R2 Interfaz del análisis, tema claro y animaciones · R3 README, «Acerca de» y atribuciones · R4 Portada y partida en dos columnas · R5 Análisis más rápido · R6 Varios motores en paralelo · R7 y R7b Etiqueta en la lista y en el tablero · R8 Por qué era mejor (PR #75–#83).
- Decisiones en ADR-001 a ADR-033.

---

## Recta final hasta v1.0

### Limpieza para v1.0 — `en review`
**Objetivo:** dejar en el repo solo lo imprescindible, el código limpio y la documentación lista para publicar (ADR-034).
- Botón de tema con el nombre del tema al que cambia y fundido al cambiar.
- Fuera: hoja de estilo, Stryker, `AGENTS.md`, script `lhci`, `movetime`, `Game.rated`.
- Móvil: letras de columna en su casilla y `O-O-O` en una línea.
- Hallazgos de `ponytail-audit`: numeración desde el FEN, `From Position` de lichess y helpers sin copias.
- README con enlace a producción, insignias y despliegue; `homepage`, `repository` y `meta description`.
**Aceptación:**
- Dado el tema oscuro, cuando pulso «Modo claro», entonces la página funde al tema claro y el botón pasa a decir «Modo oscuro» (y al revés); con movimiento reducido, el cambio es instantáneo.
- Dado un móvil de 375 px, entonces cada letra de columna queda en su casilla y `O-O-O` con reloj y evaluación cabe en una línea.
- Dado un PGN desde un FEN en el que empiezan las negras, entonces la lista empieza en «20. … Kd6» y el lector de pantalla dice «20. Rd6, negras».
- Dado un PGN de lichess con `[Variant "From Position"]`, entonces se analiza.
**Tests:** U (`moveNumber`, `From Position`) · C (botón de tema y fundido, lista desde un FEN) · E (tema en los dos sentidos con axe) · móvil comprobado en el navegador.

### Reflow a 320 px — `pendiente`
**Objetivo:** que ninguna página tenga scroll horizontal a 320 px de ancho (WCAG 1.4.10, que el README promete). Ya pasaba antes de la limpieza. Rama `fix/reflow-320` desde `main`, tras el merge del #84; con frontend-design.
- Medido el 13-11-2026 (ancho del documento a 320 px): portada 336 px, «Acerca de» 325 px y partida analizada 342 px.
- En la partida, el culpable es `.analysis-summary-accuracy`: las dos placas de precisión necesitan 306 px y hay 248. En la portada y en «Acerca de» falta localizar qué elemento desborda.
- Los e2e de móvil usan un Pixel 7 (412 px), por eso no lo han visto.
**Aceptación:**
- Dado un ancho de 320 px, en la portada, «Acerca de» y la partida analizada, en los dos temas, entonces no hay scroll horizontal (`scrollWidth` ≤ `clientWidth`) y no se corta ningún texto.
- A 375 px y en escritorio, todo sigue como está.
**Tests:** E (las tres páginas a 320 px comprueban `scrollWidth` ≤ `clientWidth`, con axe).

### v1.0 · Publicar — `pendiente` (pasos de la usuaria)
1. Desbloquear otra vez la cuenta de GitHub (facturación, 13-11-2026; ticket abierto a GitHub Support) y relanzar la CI del PR de limpieza (#84).
2. Squash merge del PR de limpieza.
3. [Reflow a 320 px](#reflow-a-320-px--pendiente) (tarea propia, con su PR).
4. Lanzar el job manual de CI con todos los navegadores (`all_browsers`) sobre `main` y corregir lo que salga.
5. ~~En producción: `.wasm` como `application/wasm` y `crossOriginIsolated`.~~ Hecho (13-11-2026).
6. `git tag v1.0.0 && git push origin v1.0.0` y crear la release con sus notas (`gh release create v1.0.0 --generate-notes`).
7. ~~`ponytail-audit`.~~ Hecho en la limpieza. Opcional: revisar `/usage`.

---

## Backlog post-v1.0 (sin orden; pasar por grilling antes de planificar)

- Dividir `GameViewer`: el control del motor (caché, motor completo o lite, fallback, guardar) a un hook `useAnalysis` (`ponytail-audit`)
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
