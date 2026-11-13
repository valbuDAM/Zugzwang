# Zugzwang

[![CI](https://github.com/valbuDAM/Zugzwang/actions/workflows/ci.yml/badge.svg)](https://github.com/valbuDAM/Zugzwang/actions/workflows/ci.yml)
[![Licencia: GPL-3.0](https://img.shields.io/badge/licencia-GPL--3.0-blue)](LICENSE)

Analizador de partidas de [chess.com](https://www.chess.com) que se ejecuta entero en el navegador: Stockfish 19 en WebAssembly, sin servidor de análisis. Tus partidas no salen de tu equipo.

**Pruébalo:** <https://chessanalyzer.bvalbuena06.workers.dev/>

## Qué hace

- Busca las partidas de un usuario de chess.com por meses, con filtros, o analiza un PGN pegado.
- Recorre la partida con tablero, lista de jugadas, teclado y sonidos.
- Analiza cada posición con Stockfish y muestra la barra y el gráfico de evaluación.
- Clasifica cada jugada (mejor, buena, imprecisión, error, error grave, libro, gran jugada, brillante, oportunidad perdida) y enseña la mejor alternativa con su línea.
- Calcula la precisión de cada bando con la fórmula de lichess y nombra la apertura.
- Tema claro y oscuro, teclado completo y WCAG 2.2 AA.

## Cómo ejecutarlo

Necesita Node ≥ 24.

```bash
npm ci
npm run dev
```

| Qué | Comando |
|---|---|
| Lint y formato | `npm run lint` |
| Tipos | `npm run typecheck` |
| Tests unitarios y de componente | `npm test` |
| Tests de extremo a extremo | `npx playwright install chromium` y `npm run e2e` |
| Build de producción | `npm run build` y `npx vite preview` |
| Volver a descargar el motor | `npm run vendor:engine` |
| Regenerar el libro de aperturas | `npm run build:openings` |

El modo profundo (el motor completo, multihilo) necesita que la página esté aislada (`Cross-Origin-Opener-Policy: same-origin` y `Cross-Origin-Embedder-Policy: require-corp`). El servidor de desarrollo, `vite preview` y `public/_headers` ya envían esas cabeceras; sin ellas, el motor va con un hilo.

## Despliegue

Cloudflare Workers Builds publica cada push a `main` en <https://chessanalyzer.bvalbuena06.workers.dev/>. El Worker solo sirve `dist/` como assets estáticos (`wrangler.jsonc`, con fallback SPA), y `public/_headers` añade las cabeceras de aislamiento. Para desplegar a mano: `npm run build` y `npx wrangler deploy`.

## Documentación

- `docs/ROADMAP.md`: estado y lo que queda.
- `docs/DECISIONS.md`: decisiones de arquitectura (ADR).
- `docs/DESIGN.md`: diseño visual.

## Licencia

[GPL-3.0](LICENSE).

## Atribuciones

| Qué | Autor | Licencia |
|---|---|---|
| [Stockfish 19.0.1](https://github.com/nmrugg/stockfish.js) (build WebAssembly, en `public/engine/` con su `COPYING.txt` y `SOURCE.txt`) | Los autores de Stockfish; build de Nathan Rugg | GPL-3.0 |
| [chessground](https://github.com/lichess-org/chessground) (tablero) | lichess.org | GPL-3.0 |
| [chessops](https://github.com/niklasf/chessops) (reglas y PGN) | Niklas Fiekas | GPL-3.0 |
| [chess-openings](https://github.com/lichess-org/chess-openings) (nombres de aperturas, en `src/data/openings.json`) | lichess.org | CC0 1.0 |
| Piezas Merida (en `public/pieces/merida/`, vía [lichess-org/lila](https://github.com/lichess-org/lila)) | Armando Hernández Marroquín | GPL-2.0 o posterior |
| Young Serif (tipografía) | Bastien Sozeau | SIL OFL 1.1 |
| Atkinson Hyperlegible Next (tipografía) | Braille Institute | SIL OFL 1.1 |
| Fórmulas de % de victoria y precisión | [lichess.org](https://lichess.org/page/accuracy) | — |

Los sonidos se sintetizan con Web Audio; no se incluye ninguna grabación. El resto de dependencias (React, i18next, wouter, idb-keyval) están en `package.json` con sus propias licencias.

Zugzwang no está afiliado a chess.com ni a lichess.org.
