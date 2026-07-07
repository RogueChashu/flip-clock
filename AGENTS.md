# Flip Clock

## Commands
- `npm run dev` — Vite dev server with HMR
- `npm test` — run all 138 Vitest tests (jsdom)
- `npm run build` — production build
- `npm run preview` — preview production build

## Architecture
- **Vanilla ES module** — no framework. `index.html` has zero inline JS (only `<script type="module" src="clock.js">`).
- **Init:** `clock.js` module scope checks `if (document.querySelector('.clock'))` and auto-calls `setupClock()`.
- **Files:** `clock.js` (~360 lines logic), `style.css` (~193 lines), `index.html` (declarative), `clock.test.js` (all 138 tests), `SPEC.md` (full spec).

## 3-Card Flip Model
Each flip unit has three `.card-flip` elements (`.upper`, `.pre-upper`, `.lower`) that cycle roles at `animationend`:
- `upper` → `.lower`, `pre-upper` → `.upper`, `lower` → `.pre-upper`

**Flip start** — only 2 hidden faces get the new digit:
- `upper .card-flip-back .digit` (upside-down, becomes visible bottom after flip)
- `pre-upper .card-flip-front .digit` (revealed as top when upper flips away)
- `upper .card-flip-front .digit` keeps the **old** digit (visible during first 90°)

**Guard:** If `flipUnit.dataset.flipping` is set, `updateFlipUnit` returns early (no-op).

**Animation:** `flipDown` at 900ms with `cubic-bezier(0.65, 0, 0.8, 1)`. Keyframes: `rotateX(0deg)` → `rotateX(-180deg) translateY(-2px)`. The `translateY(-2px)` compensates for the hinge gap at -180° rotation (inverted Y axis), keeping the digit continuous at `animationend` class swap.

**Front/back faces** on all three card roles (`.upper`, `.pre-upper`, `.lower`) have `height: 100%; top: 0` so digit `calc()` formulas consistently reference full card height, preventing position shifts at class swap.

**`.flipping` class** — adds only `animation` (does not override `overflow`, `border-radius`, etc. from the base `.upper` rule). `overflow: visible` is inherited from `.card-flip.upper`'s static rule so there is no property change when `.flipping` is applied.

**`animationend` order (all before class swap):**
1. `playFlipSound()` fires
2. New `.lower .card-flip-front .digit` → newValue
3. New `.upper .card-flip-back .digit` → newValue
4. New `.pre-upper .card-flip-front .digit` → newValue

## Sound
- Noise burst (0.07s): highpass 100Hz → bandpass 500Hz Q0.7 → lowpass 1kHz → gain peak 0.08
- No click oscillator
- `AudioContext` lazily created on first `click`/`keydown` (see `initAudio`)
- Fires at `animationend`, not flip start
- `playFlipSound()` is a no-op if `audioCtx` is null (graceful degradation)

## Responsive Scaling
`adjustScale()` reads CSS defaults into a cached dict (`_defaults`). `MIN_SCALE = 0.35`. Scale is computed as `Math.max((window.innerWidth - 100) / naturalW, MIN_SCALE)` — **width only**, height has no effect. Natural width uses `--ampm-ml-scale` (original margin values) so that removing the visual `--ampm-ml` doesn't shift the clock digits. `overflow: hidden` clips both width and height overflow.

**Single-size approach** — no CSS media-query breakpoints. The `:root` defines one set of CSS custom properties (largest/natural size). `transform: scale(s)` on `.clock-wrapper` handles ALL responsive sizing. No inline `px` values are set on children.

If `scale < 1`, `wrapper.style.transform = 'scale(s)'` is set. If `scale >= 1`, the transform is cleared (defaults to CSS natural size). `getClockHeight()` returns `unitH + dateFS + dateMB`.

The `getDefaults` cache (avoids 7 `getComputedStyle` calls per resize) invalidates on `--unit-w` change (media query breakpoint crossing) or element reference change.

## Testing Quirks
- **Audio tests** use `resetClockState()` in `beforeEach` to reset module state instead of re-importing.
- **`setupClock` / auto-init tests** use dynamic `import('./clock.js')` with `vi.resetModules()` because they test module initialization behavior.
- Helpers: `createFlipUnit(value)`, `createClockElements()`, `createMockAudioContext()`, `resetClockState()`, `createFullClock(unitW, gapW, gapB, ampmW, ampmMargin)`.
- `createFullClock` sets `--ampm-ml-scale` on `:root` and `margin-left: 0` on `#ampm` — tests verify scale uses the former and renders the latter.
- All 138 tests pass in jsdom env.

## Performance Optimizations
- **Card ref cache** (`_cardCache` WeakMap, `_getCardRefs`): stores all 3 `.card-flip` elements per unit after one `querySelectorAll('.card-flip')`. On every tick, roles are resolved via `Array.find(c => c.classList.contains('role'))` on the cached array — zero DOM queries per tick (saves 3×6 = 18 `querySelector` calls).
- **`dataset.flipping` guard**: replaces `flipUnit.querySelector('.card-flip.flipping')` (subtree search) with a dataset flag read (`flipUnit.dataset.flipping`). Set at flip start (`'true'`), deleted at `animationend`. Avoids a DOM query per unit per tick.
- **Pre-allocated noise buffer**: the white noise `AudioBuffer` is created once in `initAudio` and reused by every `playFlipSound()` call — no per-flip GC pressure from buffer allocation (previously created and filled `bufferSize = sampleRate × 0.07` samples each time).
- **Single `new Date()` per tick**: `updateClock` creates one `Date` instance and passes it to both `getFormattedTime(now)` and `getFormattedDate(now)` — down from two.
- **Wrapper reference cached**: `state.wrapper` is set once in `setupClock` and reused by `adjustScale` via `state.wrapper || document.querySelector(...)` — avoids re-query on every resize.
- **Simplified `getDefaults` cache**: removed stale `unit.style.width` check (dead code from the inline-px era) and redundant `getComputedStyle(unit).width` comparison. Only checks `--unit-w` CSS custom property for breakpoint crossing — saves one `getComputedStyle` call per resize.
- **`resetClockState`**: clears `_cardCache = new WeakMap()`, `state.noiseBuffer`, and `state.wrapper` alongside existing state — prevents stale references between test cases.

## Deploy
- Manual Vercel deploy: `vercel --prod` (auto-deploy from GitHub push does not trigger).
- No CI config in repo.


