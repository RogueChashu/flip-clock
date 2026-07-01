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
├── clock.test.js     # Vitest test suite (109 tests)
├── index.html        # Entry HTML (imports clock.js as module)
├── style.css         # All styles + media queries
├── favicon.svg       # Dark clock SVG favicon
├── package.json      # Dependencies + scripts
├── vite.config.js    # Vite dev server config
├── vitest.config.js  # Vitest config (jsdom environment)
└── SPEC.md           # This document
```

- `npm run dev` — starts Vite dev server with HMR
- `npm test` — runs all 109 Vitest tests
- `npm run build` — production build (Vite)
- `npm run preview` — preview production build

## UI/UX Specification

### Layout Structure
- Full viewport height, centered content
- Clock digits arranged horizontally: HH MM SS (no separator)
- Each digit is a flip card composed of three card layers (upper, pre-upper, lower)
- Digit groups (hours, minutes, seconds) at 30px gap; individual digit cards at 5px gap
- Date shown above clock; AM/PM indicator to the right of seconds

### Visual Design

**Color Palette**
- Background: `#000000` (pure black)
- Card background: `#151515` (dark gray)
- Digit color: `#cccccc` (light gray)

**Typography**
- Font: "Helvetica Neue Condensed Bold", "HelveticaNeue-CondensedBold", sans-serif
- Font weight: 600
- Digit size: 255px (responsive — scales down at breakpoints)
- Date/AMPM size: 28px (responsive)

**Card Dimensions (default)**
- Width: 180px
- Height: 280px (each card half ≈ 139px, hinge gap 2px total)
- Border-radius: 6px (outer corners)
- Hinge gap: `calc(50% - 1px)` per half, `calc(50% + 1px)` lower offset → 2px visible gap at center
- Digit vertical centering: `top: calc(100% + 1px - 0.5em)` / `bottom: calc(100% + 1px - 0.5em)` dynamically centers digit in flip-unit at all font-sizes

**Responsive Breakpoints**
- ≤1200px: 140×220px, digit 200px
- ≤900px: 100×160px, digit 145px
- ≤600px: 70×110px, digit 100px
- ≤400px: 55×88px, digit 80px

### Responsive Sizing (Viewport Overflow Prevention)

When the clock's natural width exceeds the viewport, `adjustScale()` computes a scale factor and applies it as explicit inline pixel dimensions on every layout-affecting element — avoiding CSS `transform` or `zoom` which only affect visual rendering and leave the layout box unchanged.

**Mechanism:**
1. `clearAllInlineSizeStyles()` — removes any previously-set inline dimension styles so the next step reads fresh CSS media-query values
2. Read base CSS values from `getComputedStyle()` on each element type:
   - `.flip-unit`: `width`, `height`
   - `.clock`: `gap`
   - `.hours`, `.minutes`, `.seconds`: `gap`
   - `.digit`: `font-size`
   - `#ampm`: `font-size`, `margin-left`
   - `#date`: `font-size`, `margin-bottom`
3. Compute natural clock width: `3 × (2 × unitW + gapW) + 2 × gapB + ampmW + ampmM`
4. Compute scale: `(viewportWidth − 100) / naturalWidth` (50px side padding on each side)
5. If `scale ≥ 1` → no scaling needed, inline styles remain cleared (CSS media queries take over)
6. If `scale < 1` → set every dimension to `baseValue × scale` as inline `px` values

**Why this works:** Unlike `transform: scale()` or `zoom`, setting explicit inline dimensions changes the **layout box** of every element. The clock's rendered width exactly equals `naturalWidth × scale`, which fits within `viewportWidth − 100px`. No `overflow: hidden` clipping occurs because the layout never exceeds the available space.

**Side padding:** The `.container` has `padding: 0 50px` to provide visual breathing room. The scale calculation targets `(viewportWidth − 100)` so the clock fits within the padded content area at every viewport width, including exact breakpoint boundaries.

**Components**
- Flip unit: contains three `.card-flip` elements (`.upper`, `.pre-upper`, `.lower`)
- Date display: `#date` element above clock
- AM/PM indicator: `#ampm` element to the right of seconds

### Animations
- Flip duration: 600ms
- Easing: `ease-in`
- CSS animation `flipDown`: `rotateX(0deg)` → `rotateX(-180deg)`
- Transform origin: `bottom center` on the flipping card
- `overflow: visible` on flipping card to show content during rotation
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
3. **Upper gains `.flipping` class** → starts 600ms `flipDown` animation.

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
- Contains base styles (`.container`, `.clock-wrapper`, `.clock`, `.flip-unit`, `.digit`, `.card-flip`, `#ampm`, `#date`) and all responsive breakpoints
- Media queries: ≤1200px, ≤900px, ≤600px, ≤400px

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
   - The new Upper's back face → new digit (hidden, will be overwritten at next flip start)
   - The new Pre-upper's front face → new digit (hidden, will be overwritten at next flip start)
6. The `.flipping` class is always added to the `.upper` card and removed at `animationend`.
7. During a flip (600ms), subsequent calls to `updateFlipUnit` for the same unit return early (no-op).
8. The flip animation only reveals what was prepared — no `textContent` changes occur during the animation.
9. The hinge gap between upper and lower halves is 2px total (1px on each side of center), achieved via `calc(50% - 1px)` heights and `calc(50% + 1px)` lower offset.

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

### Test suite structure (109 tests)

| Module | Tests | Coverage |
|--------|-------|----------|
| `getFormattedTime` | 22 | Digit values, AM/PM transitions, 12-hour format, padding, rollovers (59→00, 12→1), defaults |
| `getFormattedDate` | 5 | String format, specific dates, leading day padding, defaults |
| `getNextDigit` | 10 | All digit transitions 0→1 through 9→0 |
| `updateFlipUnit` | 24 | Pre-upper front update, upper front preservation, upper back update, `.flipping` class, three-class coexistence, dataset update, no-op for same value, early return during flip, 9→0 rollover, empty dataset, animationend class swaps (all three cards), face values after animationend (all six faces), second flip, independent units, pre-empting, 3-flip full cycle with face validity |
| `initAudio` / `playFlipSound` | 8 | AudioContext creation, deduplication, webkit fallback, missing AudioContext, buffer/node creation (no oscillator), filter frequency verification (lowpass 1kHz, highpass 100Hz, bandpass 500Hz Q0.7), sound plays at animationend (not at flip start), no-throw guarantees |
| `initClock` | 6 | All faces set, no flip on init, class counts (one each of upper/pre-upper/lower), AM/PM, date, all 6 units |
| `updateClock` | 5 | Time update, AM/PM update, flip trigger on change, no flip on same time, all digit positions |
| `digit vertical alignment` | 18 | Per-breakpoint offset and center math (5 breakpoints × 2), symmetry across hinge, calc() equivalence, CSS rule audit, DOM integration, bounds sanity (offset < cardH, offset + fontSize > cardH, offset + fontSize > h/2 + 1), hinge gap < font-size at every breakpoint |
| `getClockWidth` | 2 | Width computation from DOM elements, fallback to `window.innerWidth` when elements missing |
| `adjustScale` | 8 | No-op when viewport wider than content, scaled inline widths applied when narrower, style clearing on resize from narrow to wide, digit font-size scaling, 50px-padding scale target verification (100px total margin), stability across repeated calls, graceful no-op when elements missing |
| `setupClock` | 1 | Function existence (smoke test) |
| **Total** | **109** | |
