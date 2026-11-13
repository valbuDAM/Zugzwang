# Zugzwang — CLAUDE.md

Analizador de partidas de chess.com con Stockfish 19 en el navegador (WASM), sin servidor de análisis. Una sola desarrolladora, plan Pro: **cada token cuenta**.

- **Idioma:** conversación y docs en español; código, identificadores y commits en inglés.
- **Stack:** Vite + React 19 + TS estricto · chessops (reglas/PGN) · chessground (tablero) · SVG propio (gráfico) · i18next · idb-keyval · wouter · Biome · Vitest + Testing Library · Playwright + axe · GitHub Actions · Cloudflare Workers (assets estáticos, https://chessanalyzer.bvalbuena06.workers.dev/). Licencia GPL-3.0.
- **Fuentes de verdad:** progreso → `docs/ROADMAP.md` · decisiones → `docs/DECISIONS.md` (no reabrir una ADR sin preguntar) · diseño → `docs/DESIGN.md`.
- **Ponytail:** su plugin inyecta las reglas en cada sesión (hook `SessionStart`); no se copian en el repo. Modo por defecto: `full`.

## Comandos (necesitan Node ≥ 24 en el PATH)

| Qué | Comando |
|---|---|
| Desarrollo | `npm run dev` |
| Lint + formato | `npm run lint` (`npm run lint:fix` para arreglar) |
| Tipos | `npm run typecheck` |
| Tests unitarios/componente | `npm test` (`-- --coverage` para cobertura) |
| Build | `npm run build` |
| e2e | `npm run e2e` |
| Regenerar el libro de aperturas | `npm run build:openings` |

## Regla de oro

**Al empezar cada sesión y al terminar cada tarea, di a la usuaria cuál es el siguiente paso**, leído de `▶ Siguiente tarea` en el roadmap.

## Flujo por tarea

1. Lee `▶ Siguiente tarea` y su bloque en el roadmap (el hook de inicio ya lo inyecta).
2. ¿Ambigüedad, dependencia nueva o algo caro de deshacer? → pregunta a la usuaria (skill **grilling** si es una decisión de arquitectura) antes de tocar código.
3. Rama `feat/…` (o `fix/`, `chore/`) desde `main` actualizado.
4. Lógica de dominio → tests primero. Dominio en `src/domain/` sin React ni DOM; motor simulado (`FakeEngine`) en unitarios; API de chess.com simulada con MSW o `page.route`.
5. Implementa con ponytail. Si toca UI → skill **frontend-design**, usando los tokens de `src/styles/tokens.css` (nunca colores/tamaños sueltos).
6. Subagente **verifier** → todo en verde (incluido e2e si la tarea toca un flujo).
7. Skill **ponytail-review** → corrige los hallazgos y repite 6 si cambias código.
8. **En la misma rama**, actualiza el roadmap (estado, notas de traspaso, `▶ Siguiente tarea`). No hay PR solo de roadmap.
9. Commits Conventional (`feat(engine): …`), push y PR con `gh pr create` (qué, por qué, cómo probarlo, criterios de aceptación marcados).
10. CI en verde → recuerda a la usuaria: revisar (la UI, en local con `npm run build && npx vite preview`) y hacer **squash merge**.

## Automatización

| Momento | Qué | Cómo |
|---|---|---|
| Inicio de sesión, `/clear`, `/compact` | Rama, siguiente tarea y notas de traspaso | Hook `SessionStart` (automático) |
| Inicio de sesión | Reglas de ponytail `full` | Hook del plugin ponytail (automático) |
| Tras cada Edit/Write | Formateo con Biome | Hook `PostToolUse` (automático) |
| Push a `main`, `--force`, `--no-verify`, `reset --hard`, commit en `main` | Bloqueo | Hook `PreToolUse` + protección de rama en GitHub (automático) |
| Commit | `biome check --staged` + formato Conventional | `simple-git-hooks` (automático, desde T0.1) |
| Siempre | Modelo, % contexto, % 5 h, tarea, rama | Statusline (automático) |
| Leer `node_modules`, `dist`, `.wasm`, lockfile… | Prohibido | `permissions.deny` (automático) |
| Búsqueda que abarca varios archivos | Subagente **explorer** (Haiku) | Instrucción: úsalo siempre en vez de leer a ciegas |
| Lint/tipos/tests/build | Subagente **verifier** (Haiku) | Instrucción: antes de cada PR y tras cambios grandes |
| Cambio mecánico totalmente especificado | Subagente **mechanic** (Haiku) | Instrucción: tareas marcadas `haiku` o pasos mecánicos |
| Arquitectura o algo irreversible | Skill **grilling** | Instrucción |
| Crear o cambiar UI | Skill **frontend-design** | Instrucción (obligatorio) |
| Bug, test que falla 2 veces, regresión | Skill **diagnosing-bugs** | Instrucción |
| Antes de cada PR | Skill **ponytail-review** | Instrucción (obligatorio, debe pasar) |
| Antes de v1.0 (una sola vez) | **ponytail-audit**, **ponytail-debt**, e2e Firefox/WebKit | Instrucción (R3 del roadmap) |
| Contexto alto / cambio de tarea | `/compact …` / `/clear` | **Recordar a la usuaria** (ver Contexto) |
| Merge del PR, acciones en Cloudflare/GitHub | Manual | **Recordar a la usuaria** |

## Modelos y tokens

- **Por defecto** (fijado en `.claude/settings.json`): `sonnet`, esfuerzo `medium`. No se cambia de modelo, esfuerzo ni advisor por tarea (ADR-030); la usuaria lo sube a mano si un problema lo pide.
- **Haiku:** solo vía subagentes (`explorer`, `verifier`, `mechanic`).
- **Fable:** nunca (en Pro puede cobrar créditos aparte).

## Contexto

- Misma tarea y el contexto pasa del ~60 % (la statusline avisa): pide a la usuaria `/compact conserva Txx, decisiones tomadas, archivos tocados y qué falta`.
- Cambio de tarea: **antes** actualiza las notas de traspaso del roadmap y luego pide `/clear`.
- Nunca leas archivos enteros si basta un rango; nunca repitas en el chat el contenido de un archivo; búsquedas amplias → `explorer`; salidas largas de tests → `verifier`.

### Compact instructions

Al compactar, conserva: la tarea en curso (ID y criterios de aceptación pendientes), las decisiones tomadas en esta sesión que aún no están en `DECISIONS.md`, los archivos tocados, los fallos abiertos y el siguiente paso. Descarta: salidas de tests y builds, contenido de archivos ya leídos, exploraciones sin resultado.

## Criterios de PR

- **Un bloque del roadmap = un PR**, con su actualización del roadmap dentro. Sin límite fijo de líneas (ADR-030); si un PR mezcla cosas que se pueden revisar por separado, se divide.
- Nunca push a `main`. Solo se abre el PR con `verifier` en verde y `ponytail-review` superado.
- CI de GitHub Actions obligatoria: lint, typecheck, tests con cobertura (≥ 90 % ramas en `src/domain/`), build, e2e Chromium + móvil con axe.
- **Squash merge**, siempre por la usuaria. Título del PR = mensaje Conventional del squash.

## Convenciones de código

- `src/domain/` → lógica pura y testeada (PGN, API, motor, precisión, clasificación). `src/ui/` → componentes React. `src/i18n/` → textos. `tests/fixtures/` → datos reales recortados.
- Todo texto visible sale de `src/i18n/es.json`. Todo color, tamaño o duración sale de `tokens.css`.
- Accesibilidad no negociable: WCAG 2.2 AA, teclado completo, `prefers-reduced-motion`.
- Atajo con límite conocido → comentario `shortcut: <límite>, <cuándo mejorarlo>` (lo recoge `ponytail-debt`).

## Plugins requeridos

`frontend-design@claude-plugins-official`, `mattpocock-skills@claude-plugins-official` (se usa `grilling`, no `grill-me`), `ponytail@ponytail`. Si falta alguno, dile a la usuaria el comando `/plugin install …` y luego `/reload-plugins`.
