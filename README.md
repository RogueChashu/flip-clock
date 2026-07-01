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
| `npm test` | Run 109 Vitest tests |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |

## Project Structure

```
├── clock.js          # Clock logic (ES module)
├── clock.test.js     # 109 tests
├── index.html        # Entry HTML
├── style.css         # All styles + breakpoints
├── favicon.svg       # Dark clock icon
├── vite.config.js    # Vite config
└── vitest.config.js  # Vitest config (jsdom)
```

## How It Works

**Three-card flip model** — each digit unit has three `.card-flip` elements (upper, pre-upper, lower) that cycle roles every flip. The upper card animates 180° on its bottom edge to reveal the new digit, while the pre-upper sits hidden behind, ready to become the next upper.

**Responsive scaling** — when the clock's natural width exceeds the viewport, `adjustScale()` measures the base CSS values, computes a scale factor, and applies explicit inline pixel dimensions so the layout box fits within the viewport. No `transform: scale()` or `overflow: hidden` tricks.

**Sound** — a short white-noise burst filtered through highpass (100Hz), bandpass (500Hz Q0.7), and lowpass (1kHz) plays at `animationend` to mimic a playing card landing on another. No oscillator click. AudioContext initializes on first user click.

## Deployment

Auto-deploys via Vercel on push to `main`. Live at [flip-clock-delta.vercel.app](https://flip-clock-delta.vercel.app).

## Spec

Full specification in [SPEC.md](./SPEC.md).
