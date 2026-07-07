# Flip Clock App Specification

## Project Overview
- **Project name**: Flip Clock
- **Type**: Single-page web app (HTML/CSS/JS)
- **Core functionality**: A retro-style flip clock displaying hours, minutes, and seconds with animated card flipping
- **Target users**: Anyone wanting an elegant browser-based clock

## Project Structure

All source files live in the `flip clock/` directory:

```
flip clock/
├── clock.js          # App logic (module)
├── clock.test.js     # Vitest test suite (138 tests)
├── index.html        # Entry HTML (imports clock.js as module)
├── style.css         # All styles + media queries
├── favicon.svg       # Dark clock SVG favicon
├── package.json      # Dependencies + scripts
├── vite.config.js    # Vite dev server config
├── vitest.config.js  # Vitest config (jsdom environment)
└── SPEC.md           # This document
```

- `npm run dev` — starts Vite dev server with HMR
- `npm test` — runs all 138 Vitest tests
- `npm run build` — production build (Vite)
- `npm run preview` — preview production build

## UI/UX Specification

### Layout Structure
- Full viewport height, centered content
- Clock digits arranged horizontally: HH MM SS (no separator)
- Each digit is a flip card composed of three card layers (upper, pre-upper, lower)
- Digit groups (hours, minutes, seconds) at 38px gap; individual digit cards at 5px gap
- Date shown above clock; AM/PM indicator to the right of seconds, no left margin

### Visual Design

**Color Palette**
- Background: `#000000` (pure black)
- Card background: `#151515` (dark gray)
- Digit color: `#cccccc` (light gray)

**Typography**
- Font: "Helvetica Neue Condensed Bold", "HelveticaNeue-CondensedBold", sans-serif
- Font weight: 600
- Digit size: 255px (responsive — scales via wrapper transform)
- Date size: 32px (responsive); AM/PM size: 28px (responsive)

**Card Dimensions (default)**
- Width: 180px
- Height: 280px (each card half ≈ 139px, hinge gap 2px total)
- Border-radius: 6px (outer corners)
- Hinge gap: `calc(50% - 1px)` per half, `calc(50% + 1px)` lower offset → 2px visible gap at center
- Digit vertical centering: `top: calc(100% + 1px - 0.5em)` / `bottom: calc(100% + 1px - 0.5em)` dynamically centers digit in flip-unit at all font-sizes

**Responsive approach**
- Single-size: `:root` defines one set of CSS custom properties (largest/natural size)
- No CSS media-query breakpoints — `transform: scale(s)` on `.clock-wrapper` handles all responsive sizing

### Responsive Sizing (Viewport Overflow Prevention)

When the clock's natural width exceeds the viewport, `adjustScale()` computes a scale factor and applies it as `transform: scale(s)` on `.clock-wrapper`.

**Mechanism:**
1. Read base CSS values from a cached dict (`_defaults`), populated on first call via `getComputedStyle()`:
   - `.flip-unit`: `width`, `height`
   - `.clock`: `gap`
   - `.hours`, `.minutes`, `.seconds`: `gap`
   - `.digit`: `font-size`
   - `#ampm`: `font-size`, `margin-left`
   - `#date`: `font-size`, `margin-bottom`
   - `:root`: `--ampm-ml-scale` (original margin value for width calculation)
2. Compute natural clock width: `3 × (2 × unitW + gapW) + 2 × gapB + ampmW + ampmMS`
   - `ampmMS` comes from `--ampm-ml-scale` (the original margin before setting it to 0 visually)
3. Compute scale: `(viewportWidth − 100) / naturalWidth` (50px side padding on each side), clamped to `MIN_SCALE = 0.35`
4. If `scale ≥ 1` → no scaling needed, `wrapper.style.transform` is cleared (defaults to CSS natural size)
5. If `scale < 1` → `wrapper.style.transform = 'scale(s)'` is set. No inline `px` values on children.

**Why this works:** CSS `transform: scale()` is a composite-layer operation that doesn't trigger layout or paint recalculations. The 3D flip animation (`rotateX`) runs on the compositor thread and is not interrupted by transform changes on the wrapper. Since the wrapper transform does not set inline `px` values on children, there is no layout thrashing during resize or animation.

**Side padding:** The `.container` has `padding: 50px` (all four sides) to provide visual breathing room. The scale calculation targets `(viewportWidth − 100)` so the clock fits within the padded content area.

**AM/PM margin removed:** `--ampm-ml` is `0` (no visual gap). The original margin values are preserved in `--ampm-ml-scale` for the width calculation so the scale (and thus the clock digits) remain the same size as before the margin was removed.

**Defaults cache:** `_defaults` caches CSS default values after the first `adjustScale` call, eliminating 7 `getComputedStyle` reads per resize. The cache is invalidated when the `.flip-unit` element reference changes (test cleanup) or when `--unit-w` CSS value changes (breakpoint crossing via media queries).

**Resize throttling:** The resize handler uses `requestAnimationFrame` (via `state.resizeRafId`) to avoid redundant calculations. Stale RAF IDs are cancelled before scheduling a new frame.

**Components**
- Flip unit: contains three `.card-flip` elements (`.upper`, `.pre-upper`, `.lower`)
- Date display: `#date` element above clock
- AM/PM indicator: `#ampm` element to the right of seconds

### Animations
- Flip duration: 900ms
- Easing: `cubic-bezier(0.65, 0, 0.8, 1)` — slow start, fast middle, deceleration at end
- CSS animation `flipDown`: `rotateX(0deg)` → `rotateX(-180deg) translateY(-2px)`
  - `translateY(-2px)` compensates for the hinge gap at -180° rotation (inverted Y axis), keeping digits continuous at `animationend` class swap
- Transform origin: `bottom center` on the flipping card
- `.flipping` class adds only `animation` (does not override `overflow`, `border-radius`, etc.)
- `overflow: visible` is inherited from `.card-flip.upper`'s static rule
- No `will-change: transform` on `.card-flip.upper` — prevents composited-layer promotion shift at pre-upper→upper swap
- All three card roles (`.upper`, `.pre-upper`, `.lower`) have `height: 100%; top: 0` on front/back faces so digit `calc()` formulas consistently reference full card height
- Flip triggers when digit value changes (every second for seconds, every minute for minutes, every hour for hours)

## Three-Card Model

Each flip unit has three physical `.card-flip` elements that cycle roles at every animationend.

### Card roles and CSS

| Class | Position | Height | z-index | Visual role |
|-------|----------|--------|---------|-------------|
| `.card-flip.upper` | `top: 0` | `calc(50% - 1px)` | 10 | Visible top half. Falls forward (flips) to reveal pre-upper. |
| `.card-flip.pre-upper` | `top: 0` | `calc(50% - 1px)` | 3 | Hidden behind upper. Carries new digit on front face; revealed when upper flips away. |
| `.card-flip.lower` | `top: calc(50% + 1px)` | `calc(50% - 1px)` | 3 | Visible bottom half. Stays static during flip; gets covered by the falling upper card. |

The 1px offset on each side creates a 2px total hinge gap visible between the upper and lower card halves.

### Flip cycle

#### At flip start (`updateFlipUnit` called with new digit)

1. **Upper back face** → set to **new digit** (upside-down). After the card flips -180°, this becomes the visible bottom portion.
2. **Pre-upper front face** → set to **new digit**. When the upper flips past 90°, this is revealed as the visible top portion.
3. **Upper gains `.flipping` class** → starts 900ms `flipDown` animation.

No textContent on the upper's front face is changed — it keeps the old digit, which is what the user sees during the first 90° of the flip.

#### During the flip

| Degrees | What the user sees |
|---------|-------------------|
| 0°–90° | Upper front face (old digit) visible at top; lower front face (current digit) visible at bottom |
| 90° | Upper card edge-on; pre-upper front face (new digit) revealed at top |
| 90°–180° | Upper back face (new digit, now right-side up) progressively covers the bottom half |
| 180° | Upper back face (new digit) fully covers bottom; pre-upper front face (new digit) at top |

#### At `animationend`

Four things happen in order:

1. **Sound plays** — `playFlipSound()` fires (upper card hits lower card)
2. **Face updates** (all set to `newValue` before class swap):
   - New Lower's front face → new digit (visible after snap to `rotateX(0deg)`)
   - New Upper's front face → new digit (set at animationend, visible as top half)
   - New Upper's back face → new digit (hidden, ready for next flip's back-face preparation)
   - New Pre-upper's front face → new digit (hidden, ready for next flip's front-face preparation)
3. **Class swap** (three-way rotation):
   - `.flipping.upper` → `.lower` (the card that just finished flipping)
   - `.pre-upper` → `.upper` (was hidden behind, now at top)
   - `.lower` → `.pre-upper` (was at bottom, now hidden behind)

Note: `dataset.value` is set at **flip start** (alongside adding the `.flipping` class), not at `animationend`.

### Role cycle across three flips

Each of the three physical cards visits all three roles over three consecutive flips:

| Flip | Card A | Card B | Card C |
|------|--------|--------|--------|
| After flip 1 (5→6) | Lower | Upper | Pre-upper |
| After flip 2 (6→7) | Pre-upper | Lower | Upper |
| After flip 3 (7→8) | Upper | Pre-upper | Lower |
| After flip 4 (8→9) | Lower | Upper | Pre-upper |

The cycle repeats every 3 flips.

### Digit lifecycle per card (what each face shows at each stage)

| Stage | Upper front | Upper back | Pre-upper front | Pre-upper back | Lower front | Lower back |
|-------|-------------|------------|-----------------|----------------|-------------|------------|
| At rest after init | 5 | 5 | 5 | 5 | 5 | 5 |
| Flip 5→6 start | 5 (unchanged) | **6** | **6** | 5 | 5 | 5 |
| Flip 5→6 animating | 5 → hidden | 6 → visible | 6 → revealed | 5 | 5 (hidden by flip) | 5 |
| Flip 5→6 animationend | — | — | — | — | **6** (front, visible) | 6 (back, hidden) |
| After flip 1 | — | — | **6** (was Pre-upper→Upper, front visible) | **6** (was Pre-upper back→Upper back, hidden) | 6 (was flipping→Lower, front visible) | 6 (was Upper back, hidden) |
| At rest after flip 1 | 6 (Upper front, visible) | 6 (Upper back, hidden) | 6 (Pre-upper front, hidden) | 5 (Pre-upper back, hidden) | 6 (Lower front, visible) | 6 (Lower back, hidden) |

### Module-based Script

- `index.html` contains zero JavaScript — it is purely declarative HTML
- Entry point is `<script type="module" src="clock.js"></script>` — the module auto-initializes when a `.clock` element is present in the DOM
- Vite handles ES module resolution and HMR — changes to `clock.js` or `style.css` trigger instant hot updates without full-page reload

### CSS File

- All styles are in `style.css`, linked via `<link rel="stylesheet" href="style.css">` in `index.html` head
- Contains base styles (`.container`, `.clock-wrapper`, `.clock`, `.flip-unit`, `.digit`, `.card-flip`, `#ampm`, `#date`)
- Single-size approach — `:root` defines one set of CSS custom properties; no media-query breakpoints
- `.container` has `padding: 50px` (all four sides) — spacing around `.clock-wrapper`, never overridden by inline JS
- `--ampm-ml: 0` (no visual gap); original margin values preserved in `--ampm-ml-scale` for width calculation

### Favicon

- `favicon.svg` is a dark clock icon matching the app's color scheme
- Linked in `<head>` via `<link rel="icon" type="image/svg+xml" href="/favicon.svg">`

### Sound

- Flip sound is a short noise burst (0.07s white noise with highpass at 100Hz, bandpass at 500Hz Q0.7, and lowpass at 1kHz, peak gain 0.08) — no click oscillator, meant to evoke a playing card falling on another
- Sound plays at `animationend` (when the upper card finishes flipping and contacts the lower card), not at flip start
- AudioContext is initialized on first user interaction (click or keydown)
- Uses `window.AudioContext` with `window.webkitAudioContext` fallback
- Graceful no-op if AudioContext is unavailable

### Invariants

1. There are three physical `.card-flip` elements per flip unit with classes `.upper`, `.pre-upper`, `.lower` that cycle at each `animationend`.
2. The upper card changes every flip: `.pre-upper` becomes `.upper`; flipping `.upper` becomes `.lower`; `.lower` becomes `.pre-upper`. Each physical card visits all three roles over three flips.
3. At flip start, only **two hidden surfaces** receive the new digit:
   - **Upper back face** → new digit (upside-down, will become visible as bottom portion after flip)
   - **Pre-upper front face** → new digit (will be revealed as top portion when upper flips away)
4. The **upper front face is never updated at flip start** — it keeps the old digit. The user sees the old digit during the first 90° of the flip, and it disappears naturally as the card rotates.
5. At `animationend`, **sound plays** followed by **three face updates** then the class swap:
   - `playFlipSound()` fires first (upper card hits lower card)
   - The new Lower's front face → new digit (visible after snap from -180° to `rotateX(0deg)`)
   - The new Upper's front face → new digit (set at animationend, visible as top half)
   - The new Upper's back face → new digit (hidden, will be overwritten at next flip start)
   - The new Pre-upper's front face → new digit (hidden, will be overwritten at next flip start)
6. The `.flipping` class is always added to the `.upper` card and removed at `animationend`. It adds only `animation` (does not override `overflow`, `border-radius`, etc.).
7. During a flip (900ms), subsequent calls to `updateFlipUnit` for the same unit return early (no-op).
8. The flip animation only reveals what was prepared — no `textContent` changes occur during the animation.
9. The hinge gap between upper and lower halves is 2px total (1px on each side of center), achieved via `calc(50% - 1px)` heights and `calc(50% + 1px)` lower offset.
10. Front/back faces on all three card roles have `height: 100%; top: 0` so digit `calc()` formulas consistently reference full card height, preventing position shifts at class swap.
11. Keyframes end at `rotateX(-180deg) translateY(-2px)` — the `translateY` compensates for the hinge gap at -180° (inverted Y axis), keeping the digit continuous at `animationend` class swap.
12. Responsive sizing uses `transform: scale(s)` on `.clock-wrapper` — no inline `px` values set on children. This avoids layout recalculations during 3D flip animation and produces fully fluid resizing.

## Functionality Specification

### Core Features
1. Display current time in HH:MM:SS format
2. Auto-update every second, flip when value changes (seconds flip every second, minutes flip every 60s, hours flip every 60min)
3. 12-hour format with AM/PM indicator
4. Smooth flip animation on digit change
5. Sound effect on each flip (requires user interaction to enable AudioContext)

### User Interactions
- Click or keypress: initializes AudioContext for flip sound
- No other interactions required — passive display

### Data Handling
- Get current time from browser `Date` object
- Format hours as 12-hour (1–12)
- Format minutes with leading zero (00–59)
- Format seconds with leading zero (00–59)
- Date format: "Monday 1 Jan 2024"

## Acceptance Criteria
- [ ] Black background with light-gray digits visible
- [ ] Shows hours, minutes, and seconds with AM/PM
- [ ] Shows current date above clock
- [ ] Flip animation plays when seconds change (every second)
- [ ] Flip animation plays when minutes change (every 60s)
- [ ] Flip animation plays when hours change (every 60min)
- [ ] Clock updates correctly every second
- [ ] Sound plays on flip (after user interaction)
- [ ] Hinge gap visible between upper and lower card halves
- [ ] Responsive layout works at all breakpoints

### Hot Module Reload (HMR)

- `npm run dev` starts Vite dev server on the project root
- `index.html` imports `clock.js` via `<script type="module">` — Vite tracks module imports and pushes updates on save
- Changes to `clock.js`, `index.html`, or any CSS trigger an instant hot update without full-page reload
- Vite config: `vite.config.js` (minimal — defaults suffice for this single-page app)

## Testing Specification

### Framework
- Vitest (ES module `clock.js` tested as ES module)

### Test suite structure (138 tests)

| Module | Tests | Coverage |
|--------|-------|----------|
| `getFormattedTime` | 22 | Digit values, AM/PM transitions, 12-hour format, padding, rollovers (59→00, 12→1), defaults |
| `getFormattedDate` | 5 | String format, specific dates, leading day padding, defaults |
| `getNextDigit` | 10 | All digit transitions 0→1 through 9→0 |
| `updateFlipUnit` | 24 | Pre-upper front update, upper front preservation, upper back update, `.flipping` class, three-class coexistence, dataset update, no-op for same value, early return during flip, 9→0 rollover, empty dataset, animationend class swaps (all three cards), face values after animationend (all six faces), second flip, independent units, pre-empting, 3-flip full cycle with face validity |
| `initAudio` / `playFlipSound` | 9 | AudioContext creation, deduplication, webkit fallback, missing AudioContext, buffer/node creation (no oscillator), filter frequency verification (lowpass 1kHz, highpass 100Hz, bandpass 500Hz Q0.7), sound plays at animationend (not at flip start), no-throw guarantees, **noise buffer reuse across multiple calls** |
| `initClock` | 6 | All faces set, no flip on init, class counts (one each of upper/pre-upper/lower), AM/PM, date, all 6 units |
| `updateClock` | 10 | Time update, AM/PM update, flip trigger on change, no flip on same time, all 6 digit positions, date rollover at midnight, null/empty guards (null units, empty array, null ampmEl, null dateEl) |
| `digit vertical alignment` | 18 | Offset and center math (5 size-configurations × 2), symmetry across hinge, calc() equivalence, CSS rule audit, DOM integration, bounds sanity (offset < cardH, offset + fontSize > cardH, offset + fontSize > h/2 + 1), hinge gap < font-size |
| `getClockWidth` | 6 | Width computation from DOM elements, fallback to `window.innerWidth` when elements missing (6 cases no elements, .flip-unit missing, .clock missing, .hours missing, #ampm missing) |
| `getClockHeight` | 3 | Unit height when no date, unitH + dateFS + dateMB when date exists, fallback to window.innerHeight when no .flip-unit |
| `adjustScale` | 18 | No-op when viewport wider than content, scaled wrapper transform when narrower, transform clearing on resize from narrow to wide, digit font-size scaling, 50px-padding scale target verification (100px total margin), stability across repeated calls, greedy no-op when elements missing, date font-size/margin scaling, no-scale when no date, width-only scaling (no height effect), various viewport scenarios, clears transform on width recovery, no-scale when unconstrained, MIN_SCALE clamping, no height enforcement |
| `resetClockState` | 2 | Audio re-initialization on next `initAudio` call, noise buffer regeneration on re-init |
| `setupClock` | 4 | Function existence, initializes timer when clock element exists, clears previous interval/handlers on re-call, generates flip units from `<template>` |
| `module auto-init` | 1 | Calls `setupClock` when `.clock` element exists in the DOM on import |
| **Total** | **138** | |
