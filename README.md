# Colorfle Unlimited

A Wordle-style color game: mix colors to match a hidden target blend. Live at
**[colorfle-unlimited.vercel.app](https://colorfle-unlimited.vercel.app)**

## How it works

A hidden recipe of 2–6 palette colors is blended (weighted square-root RGB) into the
target color shown on the right half of the pie. You submit recipes; each guess gets
a perceptual accuracy score (CIE Lab ΔE) and Wordle-style tile feedback. A perfect
score requires the **exact recipe** — visually identical blends from different
colors cap at 99.9%.

## Features

- **Unlimited & Daily modes** — daily puzzles are seeded from the local date and
  lock until midnight once finished (with a live countdown). In-progress games
  survive refreshes on both modes.
- **Difficulty options** — palette size (10/15/20), slots (2–6), even/uneven weight
  splits, duplicates, max attempts (4…∞).
- **Wordle hint mode** — green/yellow tile borders, absent-color elimination.
- **Stats per difficulty config** — streaks, win %, average accuracy, and a guess
  distribution chart.
- **Share results** — Wordle-style emoji grid with per-guess accuracy.
- **Colorblind assistance** — dichromacy simulation filter (type + strength),
  high-contrast borders, symbol indicators, and color-name labels.
- **ChromaSight integration** — take the adaptive test at
  [ChromaSight Profiler](https://chroma-sight-profiler.vercel.app) and send your
  measured profile straight here via a one-tap deep link (`#cb-profile=…`), or
  paste/import the JSON manually.
- **PWA** — installable, works offline (service worker + cache).
- **Desktop keyboard** — number keys pick palette colors, Enter submits,
  Backspace deletes, Esc closes dialogs.

## Development

```bash
npm install
npm run dev        # vite dev server
npm test           # unit tests for the game logic (node --test)
npm run build      # production build
npm run icons      # regenerate PWA icons
```

Game logic lives in `src/game.js` (pure, unit-tested in `src/game.test.mjs`).
The colorblind simulation matrices are kept identical to ChromaSight Profiler's
so profiles preview and apply consistently across both apps.

## Deployment

Pushes to `main` auto-deploy on Vercel (Vite preset, no config needed).
