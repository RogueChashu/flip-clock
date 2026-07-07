# Flip Clock

A retro-style flip clock with animated card flips, responsive scaling, and a soft mechanical flip sound.

Built entirely with the Big Pickle model in [OpenCode](https://opencode.ai).

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173. Click anywhere on the page to enable audio.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with HMR |
| `npm test` | Run 134 Vitest tests |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |

## Project Structure

```
├── clock.js          # Clock logic (ES module)
├── clock.test.js     # 134 tests
├── index.html        # Entry HTML
├── style.css         # All styles (single-size custom properties)
├── favicon.svg       # Dark clock icon
├── vite.config.js    # Vite config
└── vitest.config.js  # Vitest config (jsdom)
```

## How It Works

**Three-card flip model** — each digit unit has three `.card-flip` elements (upper, pre-upper, lower) that cycle roles every flip. The upper card animates 180° on its bottom edge to reveal the new digit, while the pre-upper sits hidden behind, ready to become the next upper.

**Responsive scaling** — when the clock's natural width exceeds the viewport, `adjustScale()` measures the base CSS values, computes a scale factor, and applies `transform: scale(s)` on the `.clock-wrapper`. No inline `px` values are set on children, so the 3D flip animation remains uninterrupted during resize.

**Sound** — a short white-noise burst filtered through highpass (100Hz), bandpass (500Hz Q0.7), and lowpass (1kHz) plays at `animationend` to mimic a playing card landing on another. No oscillator click. AudioContext initializes on first user click.

## Deployment

Deploy via `vercel --prod` (manual only).

## Spec

Full specification in [SPEC.md](./SPEC.md).
