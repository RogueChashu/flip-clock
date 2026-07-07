import { readFileSync } from 'fs';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  getFormattedTime,
  getFormattedDate,
  getNextDigit,
  updateFlipUnit,
  initClock,
  updateClock,
  initAudio,
  playFlipSound,
  adjustScale,
  getClockWidth,
  getClockHeight,
  resetClockState,
} from './clock.js';

let _savedViewportWidth = null;

function setViewportWidth(width) {
  if (_savedViewportWidth === null) {
    _savedViewportWidth = window.innerWidth;
  }
  Object.defineProperty(window, 'innerWidth', {
    value: width,
    configurable: true,
  });
}

function restoreViewportWidth() {
  if (_savedViewportWidth !== null) {
    Object.defineProperty(window, 'innerWidth', {
      value: _savedViewportWidth,
      configurable: true,
    });
    _savedViewportWidth = null;
  }
}

let _savedViewportHeight = null;

function setViewportHeight(height) {
  if (_savedViewportHeight === null) {
    _savedViewportHeight = window.innerHeight;
  }
  Object.defineProperty(window, 'innerHeight', {
    value: height,
    configurable: true,
  });
}

function restoreViewportHeight() {
  if (_savedViewportHeight !== null) {
    Object.defineProperty(window, 'innerHeight', {
      value: _savedViewportHeight,
      configurable: true,
    });
    _savedViewportHeight = null;
  }
}

function createCard(className) {
  const card = document.createElement('div');
  card.className = 'card-flip ' + className;
  const front = document.createElement('div');
  front.className = 'card-flip-front';
  const frontDigit = document.createElement('div');
  frontDigit.className = 'digit';
  frontDigit.textContent = '';
  front.appendChild(frontDigit);
  const back = document.createElement('div');
  back.className = 'card-flip-back';
  const backDigit = document.createElement('div');
  backDigit.className = 'digit';
  backDigit.textContent = '';
  back.appendChild(backDigit);
  card.appendChild(front);
  card.appendChild(back);
  return card;
}

function createFlipUnit(value = '') {
  const unit = document.createElement('div');
  unit.className = 'flip-unit';
  unit.dataset.value = value;
  unit.appendChild(createCard('upper'));
  unit.appendChild(createCard('pre-upper'));
  unit.appendChild(createCard('lower'));
  if (value !== '') {
    unit.querySelectorAll('.card-flip .digit').forEach(d => {
      d.textContent = value;
    });
  }
  return unit;
}

function createClockElements() {
  const units = Array.from({ length: 6 }, () => createFlipUnit());
  const ampmEl = document.createElement('span');
  const dateEl = document.createElement('div');
  return { units, ampmEl, dateEl };
}

afterEach(() => {
  vi.useRealTimers();
});

// --- getFormattedTime ---

describe('getFormattedTime', () => {
  it('returns 6 digit values', () => {
    const result = getFormattedTime(new Date(2024, 0, 1, 0, 0, 0));
    expect(result.digits).toHaveLength(6);
  });

  it('returns all numeric digits', () => {
    const result = getFormattedTime(new Date(2024, 0, 1, 0, 0, 0));
    result.digits.forEach(d => expect(typeof d).toBe('number'));
  });

  it('formats midnight as 12:00:00 AM', () => {
    const result = getFormattedTime(new Date(2024, 0, 1, 0, 0, 0));
    expect(result.digits).toEqual([1, 2, 0, 0, 0, 0]);
    expect(result.ampm).toBe('AM');
  });

  it('formats noon as 12:00:00 PM', () => {
    const result = getFormattedTime(new Date(2024, 0, 1, 12, 0, 0));
    expect(result.digits).toEqual([1, 2, 0, 0, 0, 0]);
    expect(result.ampm).toBe('PM');
  });

  it('shows 1 AM for hour 1', () => {
    const result = getFormattedTime(new Date(2024, 0, 1, 1, 0, 0));
    expect(result.digits.slice(0, 2)).toEqual([0, 1]);
    expect(result.ampm).toBe('AM');
  });

  it('shows 11 AM for hour 11', () => {
    const result = getFormattedTime(new Date(2024, 0, 1, 11, 0, 0));
    expect(result.digits.slice(0, 2)).toEqual([1, 1]);
    expect(result.ampm).toBe('AM');
  });

  it('shows 1 PM for hour 13', () => {
    const result = getFormattedTime(new Date(2024, 0, 1, 13, 0, 0));
    expect(result.digits.slice(0, 2)).toEqual([0, 1]);
    expect(result.ampm).toBe('PM');
  });

  it('shows 11 PM for hour 23', () => {
    const result = getFormattedTime(new Date(2024, 0, 1, 23, 0, 0));
    expect(result.digits.slice(0, 2)).toEqual([1, 1]);
    expect(result.ampm).toBe('PM');
  });

  it('uses 12-hour format (hour 0 → 12)', () => {
    const result = getFormattedTime(new Date(2024, 0, 1, 0, 0, 0));
    expect(result.digits[0]).toBe(1);
    expect(result.digits[1]).toBe(2);
  });

  it('uses 12-hour format (hour 12 → 12)', () => {
    const result = getFormattedTime(new Date(2024, 0, 1, 12, 0, 0));
    expect(result.digits[0]).toBe(1);
    expect(result.digits[1]).toBe(2);
  });

  it('pads single-digit minutes with leading zero', () => {
    const result = getFormattedTime(new Date(2024, 0, 1, 10, 5, 0));
    expect(result.digits[2]).toBe(0);
    expect(result.digits[3]).toBe(5);
  });

  it('shows double-digit minutes correctly', () => {
    const result = getFormattedTime(new Date(2024, 0, 1, 10, 59, 0));
    expect(result.digits[2]).toBe(5);
    expect(result.digits[3]).toBe(9);
  });

  it('pads single-digit seconds with leading zero', () => {
    const result = getFormattedTime(new Date(2024, 0, 1, 10, 0, 7));
    expect(result.digits[4]).toBe(0);
    expect(result.digits[5]).toBe(7);
  });

  it('shows double-digit seconds correctly', () => {
    const result = getFormattedTime(new Date(2024, 0, 1, 10, 0, 59));
    expect(result.digits[4]).toBe(5);
    expect(result.digits[5]).toBe(9);
  });

  it('returns AM for morning hours', () => {
    const result = getFormattedTime(new Date(2024, 0, 1, 9, 15, 30));
    expect(result.ampm).toBe('AM');
  });

  it('returns PM for afternoon hours', () => {
    const result = getFormattedTime(new Date(2024, 0, 1, 14, 30, 0));
    expect(result.ampm).toBe('PM');
  });

  it('transitions AM to PM at noon', () => {
    const beforeNoon = getFormattedTime(new Date(2024, 0, 1, 11, 59, 59));
    expect(beforeNoon.ampm).toBe('AM');
    const atNoon = getFormattedTime(new Date(2024, 0, 1, 12, 0, 0));
    expect(atNoon.ampm).toBe('PM');
  });

  it('transitions PM to AM at midnight', () => {
    const beforeMid = getFormattedTime(new Date(2024, 0, 1, 23, 59, 59));
    expect(beforeMid.ampm).toBe('PM');
    const atMid = getFormattedTime(new Date(2024, 0, 2, 0, 0, 0));
    expect(atMid.ampm).toBe('AM');
  });

  it('handles seconds 59→00 rollover correctly', () => {
    const t1 = getFormattedTime(new Date(2024, 0, 1, 10, 30, 59));
    expect(t1.digits.slice(4)).toEqual([5, 9]);
    const t2 = getFormattedTime(new Date(2024, 0, 1, 10, 31, 0));
    expect(t2.digits.slice(4)).toEqual([0, 0]);
  });

  it('handles minutes 59→00 rollover correctly', () => {
    const t1 = getFormattedTime(new Date(2024, 0, 1, 10, 59, 59));
    expect(t1.digits.slice(2, 4)).toEqual([5, 9]);
    const t2 = getFormattedTime(new Date(2024, 0, 1, 11, 0, 0));
    expect(t2.digits.slice(2, 4)).toEqual([0, 0]);
  });

  it('handles hour 12→1 rollover correctly', () => {
    const t1 = getFormattedTime(new Date(2024, 0, 1, 12, 59, 59));
    expect(t1.digits.slice(0, 2)).toEqual([1, 2]);
    expect(t1.ampm).toBe('PM');
    const t2 = getFormattedTime(new Date(2024, 0, 1, 13, 0, 0));
    expect(t2.digits.slice(0, 2)).toEqual([0, 1]);
    expect(t2.ampm).toBe('PM');
  });

  it('defaults to current time when no argument given', () => {
    vi.useFakeTimers();
    const now = new Date(2025, 6, 4, 15, 45, 30);
    vi.setSystemTime(now);
    const result = getFormattedTime();
    expect(result.digits).toEqual([0, 3, 4, 5, 3, 0]);
    expect(result.ampm).toBe('PM');
    vi.useRealTimers();
  });
});

// --- getFormattedDate ---

describe('getFormattedDate', () => {
  it('returns a string', () => {
    const result = getFormattedDate(new Date());
    expect(typeof result).toBe('string');
  });

  it('includes day name, day, month, and year', () => {
    const result = getFormattedDate(new Date(2024, 0, 1));
    expect(result).toMatch(/^Monday 1 Jan 2024$/);
  });

  it('correctly formats different dates', () => {
    const result = getFormattedDate(new Date(2024, 11, 25));
    expect(result).toMatch(/^Wednesday 25 Dec 2024$/);
  });

  it('includes leading day without padding', () => {
    const result = getFormattedDate(new Date(2024, 0, 9));
    expect(result).toMatch(/^Tuesday 9 Jan 2024$/);
  });

  it('defaults to current date when no argument given', () => {
    vi.useFakeTimers();
    const now = new Date(2025, 11, 31);
    vi.setSystemTime(now);
    const result = getFormattedDate();
    expect(result).toMatch(/^Wednesday 31 Dec 2025$/);
    vi.useRealTimers();
  });
});

// --- getNextDigit ---

describe('getNextDigit', () => {
  it.each([
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5],
    [5, 6], [6, 7], [7, 8], [8, 9], [9, 0],
  ])('returns %i for %i', (input, expected) => {
    expect(getNextDigit(input)).toBe(expected);
  });
});

// --- updateFlipUnit ---

describe('updateFlipUnit', () => {
  it('pre-upper card front face receives new digit (revealed when upper flips away)', () => {
    const unit = createFlipUnit('5');
    updateFlipUnit(unit, '6');

    const preUpperFront = unit.querySelector('.card-flip.pre-upper .card-flip-front .digit');
    expect(preUpperFront.textContent).toBe('6');
  });

  it('upper card front face keeps old digit (unchanged during flip)', () => {
    const unit = createFlipUnit('5');
    updateFlipUnit(unit, '6');

    const upperFront = unit.querySelector('.card-flip.upper .card-flip-front .digit');
    expect(upperFront.textContent).toBe('5');
  });

  it('upper card back face receives new digit (hidden, for after-flip bottom portion)', () => {
    const unit = createFlipUnit('5');
    updateFlipUnit(unit, '6');

    const upperBack = unit.querySelector('.card-flip.upper .card-flip-back .digit');
    expect(upperBack.textContent).toBe('6');
  });

  it('upper card gains .flipping class on first flip', () => {
    const unit = createFlipUnit('5');
    updateFlipUnit(unit, '6');

    const upper = unit.querySelector('.card-flip.upper');
    expect(upper.classList.contains('flipping')).toBe(true);
  });

  it('all three cards have distinct classes after update', () => {
    const unit = createFlipUnit('5');
    updateFlipUnit(unit, '6');

    expect(unit.querySelector('.card-flip.upper')).toBeTruthy();
    expect(unit.querySelector('.card-flip.pre-upper')).toBeTruthy();
    expect(unit.querySelector('.card-flip.lower')).toBeTruthy();
  });

  it('dataset.value is updated to the new digit', () => {
    const unit = createFlipUnit('5');
    updateFlipUnit(unit, '6');
    expect(unit.dataset.value).toBe('6');
  });

  it('does nothing when value is the same', () => {
    const unit = createFlipUnit('5');
    updateFlipUnit(unit, '5');

    expect(unit.dataset.value).toBe('5');
    expect(unit.querySelector('.card-flip.flipping')).toBeNull();
    expect(unit.querySelector('.card-flip.upper')).toBeTruthy();
    expect(unit.querySelector('.card-flip.pre-upper')).toBeTruthy();
    expect(unit.querySelector('.card-flip.lower')).toBeTruthy();
  });

  it('does nothing when .flipping already exists (early return)', () => {
    const unit = createFlipUnit('5');
    updateFlipUnit(unit, '6');
    expect(unit.dataset.value).toBe('6');

    updateFlipUnit(unit, '7');
    expect(unit.dataset.value).toBe('6');
    expect(unit.querySelectorAll('.card-flip.flipping').length).toBe(1);
    expect(unit.querySelectorAll('.card-flip.upper').length).toBe(1);
    expect(unit.querySelectorAll('.card-flip.pre-upper').length).toBe(1);
    expect(unit.querySelectorAll('.card-flip.lower').length).toBe(1);
  });

  it('handles digit 9→0 rollover', () => {
    const unit = createFlipUnit('9');
    updateFlipUnit(unit, '0');

    expect(unit.dataset.value).toBe('0');
    const preUpperFront = unit.querySelector('.card-flip.pre-upper .card-flip-front .digit');
    expect(preUpperFront.textContent).toBe('0');
    const upperBack = unit.querySelector('.card-flip.upper .card-flip-back .digit');
    expect(upperBack.textContent).toBe('0');
    const upperFront = unit.querySelector('.card-flip.upper .card-flip-front .digit');
    expect(upperFront.textContent).toBe('9');
  });

  it('handles initial empty dataset value', () => {
    const unit = createFlipUnit();
    updateFlipUnit(unit, '1');

    expect(unit.dataset.value).toBe('1');
    const preUpperFront = unit.querySelector('.card-flip.pre-upper .card-flip-front .digit');
    expect(preUpperFront.textContent).toBe('1');
    const upperBack = unit.querySelector('.card-flip.upper .card-flip-back .digit');
    expect(upperBack.textContent).toBe('1');
  });

  it('on animationend: old flipping card becomes .lower', () => {
    const unit = createFlipUnit('5');
    updateFlipUnit(unit, '6');

    const flippingCard = unit.querySelector('.card-flip.flipping');
    expect(flippingCard).toBeTruthy();

    flippingCard.dispatchEvent(new Event('animationend'));

    expect(flippingCard.classList.contains('flipping')).toBe(false);
    expect(flippingCard.classList.contains('upper')).toBe(false);
    expect(flippingCard.classList.contains('lower')).toBe(true);
  });

  it('on animationend: old .pre-upper becomes .upper', () => {
    const unit = createFlipUnit('5');
    const preUpperCard = unit.querySelector('.card-flip.pre-upper');
    updateFlipUnit(unit, '6');

    const flippingCard = unit.querySelector('.card-flip.flipping');
    flippingCard.dispatchEvent(new Event('animationend'));

    expect(preUpperCard.classList.contains('pre-upper')).toBe(false);
    expect(preUpperCard.classList.contains('upper')).toBe(true);
  });

  it('on animationend: old .lower becomes .pre-upper', () => {
    const unit = createFlipUnit('5');
    const lowerCard = unit.querySelector('.card-flip.lower');
    updateFlipUnit(unit, '6');

    const flippingCard = unit.querySelector('.card-flip.flipping');
    flippingCard.dispatchEvent(new Event('animationend'));

    expect(lowerCard.classList.contains('lower')).toBe(false);
    expect(lowerCard.classList.contains('pre-upper')).toBe(true);
  });

  it('on animationend: new lower back face shows new digit (was set at flip start)', () => {
    const unit = createFlipUnit('5');
    updateFlipUnit(unit, '6');

    const flippingCard = unit.querySelector('.card-flip.flipping');
    flippingCard.dispatchEvent(new Event('animationend'));

    const newLower = unit.querySelector('.card-flip.lower');
    const lowerBack = newLower.querySelector('.card-flip-back .digit');
    expect(lowerBack.textContent).toBe('6');
  });

  it('on animationend: new lower front face shows new digit (updated after snap)', () => {
    const unit = createFlipUnit('5');
    updateFlipUnit(unit, '6');

    const flippingCard = unit.querySelector('.card-flip.flipping');
    flippingCard.dispatchEvent(new Event('animationend'));

    const newLower = unit.querySelector('.card-flip.lower');
    const lowerFront = newLower.querySelector('.card-flip-front .digit');
    expect(lowerFront.textContent).toBe('6');
  });

  it('on animationend: new upper front face shows new digit (was set on pre-upper at flip start)', () => {
    const unit = createFlipUnit('5');
    updateFlipUnit(unit, '6');

    const flippingCard = unit.querySelector('.card-flip.flipping');
    flippingCard.dispatchEvent(new Event('animationend'));

    const newUpper = unit.querySelector('.card-flip.upper');
    const upperFront = newUpper.querySelector('.card-flip-front .digit');
    expect(upperFront.textContent).toBe('6');
  });

  it('on animationend: new upper back face shows new digit (set at animationend for next flip)', () => {
    const unit = createFlipUnit('5');
    updateFlipUnit(unit, '6');

    const flippingCard = unit.querySelector('.card-flip.flipping');
    flippingCard.dispatchEvent(new Event('animationend'));

    const newUpper = unit.querySelector('.card-flip.upper');
    const upperBack = newUpper.querySelector('.card-flip-back .digit');
    expect(upperBack.textContent).toBe('6');
  });

  it('second flip works after animationend completes', () => {
    const unit = createFlipUnit('5');
    updateFlipUnit(unit, '6');

    const flippingCard = unit.querySelector('.card-flip.flipping');
    flippingCard.dispatchEvent(new Event('animationend'));

    expect(unit.dataset.value).toBe('6');

    updateFlipUnit(unit, '7');

    const newFlippingCard = unit.querySelector('.card-flip.flipping');
    expect(newFlippingCard).toBeTruthy();
    expect(newFlippingCard.classList.contains('upper')).toBe(true);

    const preUpperFront = unit.querySelector('.card-flip.pre-upper .card-flip-front .digit');
    expect(preUpperFront.textContent).toBe('7');
    const upperBack = newFlippingCard.querySelector('.card-flip-back .digit');
    expect(upperBack.textContent).toBe('7');
    const upperFront = newFlippingCard.querySelector('.card-flip-front .digit');
    expect(upperFront.textContent).toBe('6');
  });

  it('each unit flips independently with its own animationend', () => {
    const unit1 = createFlipUnit('5');
    const unit2 = createFlipUnit('3');

    updateFlipUnit(unit1, '6');
    updateFlipUnit(unit2, '4');

    expect(unit1.querySelector('.card-flip.flipping')).toBeTruthy();
    expect(unit2.querySelector('.card-flip.flipping')).toBeTruthy();

    unit1.querySelector('.card-flip.flipping').dispatchEvent(new Event('animationend'));

    expect(unit1.querySelector('.card-flip.lower')).toBeTruthy();
    expect(unit1.querySelector('.card-flip.upper')).toBeTruthy();
    expect(unit1.querySelector('.card-flip.pre-upper')).toBeTruthy();
    expect(unit2.querySelector('.card-flip.flipping')).toBeTruthy();
  });

  it('animationend fires before the next flip can start on the same unit', () => {
    const unit = createFlipUnit('5');
    updateFlipUnit(unit, '6');

    const flippingCard = unit.querySelector('.card-flip.flipping');
    flippingCard.dispatchEvent(new Event('animationend'));

    expect(unit.querySelector('.card-flip.lower')).toBeTruthy();
    expect(unit.querySelector('.card-flip.upper')).toBeTruthy();
    expect(unit.querySelector('.card-flip.pre-upper')).toBeTruthy();

    updateFlipUnit(unit, '7');
    expect(unit.querySelector('.card-flip.flipping')).toBeTruthy();
    expect(unit.dataset.value).toBe('7');
  });

  it('on animationend: new pre-upper front face shows new digit (set at animationend for next flip)', () => {
    const unit = createFlipUnit('5');
    updateFlipUnit(unit, '6');

    const flippingCard = unit.querySelector('.card-flip.flipping');
    flippingCard.dispatchEvent(new Event('animationend'));

    const newPreUpper = unit.querySelector('.card-flip.pre-upper');
    const preUpperFront = newPreUpper.querySelector('.card-flip-front .digit');
    expect(preUpperFront.textContent).toBe('6');
  });

  it('three flips cycle each card through all three roles', () => {
    const unit = createFlipUnit('5');

    updateFlipUnit(unit, '6');
    unit.querySelector('.card-flip.flipping').dispatchEvent(new Event('animationend'));

    expect(unit.querySelector('.card-flip.upper')).toBeTruthy();
    expect(unit.querySelector('.card-flip.pre-upper')).toBeTruthy();
    expect(unit.querySelector('.card-flip.lower')).toBeTruthy();
    expect(unit.dataset.value).toBe('6');

    updateFlipUnit(unit, '7');
    unit.querySelector('.card-flip.flipping').dispatchEvent(new Event('animationend'));

    expect(unit.querySelector('.card-flip.upper')).toBeTruthy();
    expect(unit.querySelector('.card-flip.pre-upper')).toBeTruthy();
    expect(unit.querySelector('.card-flip.lower')).toBeTruthy();
    expect(unit.dataset.value).toBe('7');

    updateFlipUnit(unit, '8');
    unit.querySelector('.card-flip.flipping').dispatchEvent(new Event('animationend'));

    expect(unit.querySelector('.card-flip.upper')).toBeTruthy();
    expect(unit.querySelector('.card-flip.pre-upper')).toBeTruthy();
    expect(unit.querySelector('.card-flip.lower')).toBeTruthy();
    expect(unit.dataset.value).toBe('8');
  });

  it('three flips: all face values remain correct after each rotation', () => {
    const unit = createFlipUnit('5');

    // Flip 5→6
    updateFlipUnit(unit, '6');
    unit.querySelector('.card-flip.flipping').dispatchEvent(new Event('animationend'));

    expect(unit.querySelector('.card-flip.upper .card-flip-front .digit').textContent).toBe('6');
    expect(unit.querySelector('.card-flip.upper .card-flip-back .digit').textContent).toBe('6');
    expect(unit.querySelector('.card-flip.lower .card-flip-front .digit').textContent).toBe('6');
    expect(unit.querySelector('.card-flip.lower .card-flip-back .digit').textContent).toBe('6');
    expect(unit.querySelector('.card-flip.pre-upper .card-flip-front .digit').textContent).toBe('6');

    // Flip 6→7
    updateFlipUnit(unit, '7');
    unit.querySelector('.card-flip.flipping').dispatchEvent(new Event('animationend'));

    expect(unit.querySelector('.card-flip.upper .card-flip-front .digit').textContent).toBe('7');
    expect(unit.querySelector('.card-flip.upper .card-flip-back .digit').textContent).toBe('7');
    expect(unit.querySelector('.card-flip.lower .card-flip-front .digit').textContent).toBe('7');
    expect(unit.querySelector('.card-flip.lower .card-flip-back .digit').textContent).toBe('7');
    expect(unit.querySelector('.card-flip.pre-upper .card-flip-front .digit').textContent).toBe('7');

    // Flip 7→8
    updateFlipUnit(unit, '8');
    unit.querySelector('.card-flip.flipping').dispatchEvent(new Event('animationend'));

    expect(unit.querySelector('.card-flip.upper .card-flip-front .digit').textContent).toBe('8');
    expect(unit.querySelector('.card-flip.upper .card-flip-back .digit').textContent).toBe('8');
    expect(unit.querySelector('.card-flip.lower .card-flip-front .digit').textContent).toBe('8');
    expect(unit.querySelector('.card-flip.lower .card-flip-back .digit').textContent).toBe('8');
    expect(unit.querySelector('.card-flip.pre-upper .card-flip-front .digit').textContent).toBe('8');
  });

  it('three flips: upper front face preserves the old digit during flip', () => {
    const unit = createFlipUnit('5');

    // Flip 5→6: upper front should still show 5 during the flip
    updateFlipUnit(unit, '6');
    expect(unit.querySelector('.card-flip.upper .card-flip-front .digit').textContent).toBe('5');

    unit.querySelector('.card-flip.flipping').dispatchEvent(new Event('animationend'));

    // Flip 6→7: upper front should show 6 during flip (old digit from before flip)
    updateFlipUnit(unit, '7');
    expect(unit.querySelector('.card-flip.upper .card-flip-front .digit').textContent).toBe('6');

    unit.querySelector('.card-flip.flipping').dispatchEvent(new Event('animationend'));

    // Flip 7→8: upper front should show 7 during flip
    updateFlipUnit(unit, '8');
    expect(unit.querySelector('.card-flip.upper .card-flip-front .digit').textContent).toBe('7');
  });
});

// --- Audio ---

function createMockAudioContext() {
  const noop = vi.fn();
  const mock = {
    currentTime: 0,
    sampleRate: 48000,
    destination: {},
    createBuffer: vi.fn(() => ({
      getChannelData: () => new Float32Array(4800),
    })),
    createBufferSource: vi.fn(() => ({
      buffer: null,
      connect: noop,
      start: noop,
      stop: noop,
    })),
    createBiquadFilter: vi.fn(() => ({
      type: '',
      frequency: { value: 0 },
      Q: { value: 0 },
      connect: noop,
    })),
    createGain: vi.fn(() => ({
      gain: {
        value: 0,
        setValueAtTime: noop,
        linearRampToValueAtTime: noop,
        exponentialRampToValueAtTime: noop,
      },
      connect: noop,
    })),
  };
  return mock;
}

describe('initAudio and playFlipSound', () => {
  beforeEach(() => {
    resetClockState();
    delete window.AudioContext;
    delete window.webkitAudioContext;
  });

  it('creates AudioContext and plays sound without throwing', () => {
    const mockCtx = createMockAudioContext();
    window.AudioContext = vi.fn(() => mockCtx);
    initAudio();
    expect(window.AudioContext).toHaveBeenCalledOnce();
    expect(() => playFlipSound()).not.toThrow();
  });

  it('does not create a second AudioContext if already initialized', () => {
    const mockCtx = createMockAudioContext();
    window.AudioContext = vi.fn(() => mockCtx);
    initAudio();
    initAudio();
    expect(window.AudioContext).toHaveBeenCalledTimes(1);
  });

  it('uses webkitAudioContext as fallback', () => {
    const mockCtx = createMockAudioContext();
    window.webkitAudioContext = vi.fn(() => mockCtx);
    initAudio();
    expect(window.webkitAudioContext).toHaveBeenCalledOnce();
  });

  it('does not throw when AudioContext is unavailable', () => {
    initAudio();
    expect(() => playFlipSound()).not.toThrow();
  });

  it('creates buffers and nodes when AudioContext is available', () => {
    const mockCtx = createMockAudioContext();
    window.AudioContext = vi.fn(() => mockCtx);
    initAudio();
    playFlipSound();
    expect(mockCtx.createBuffer).toHaveBeenCalled();
    expect(mockCtx.createBufferSource).toHaveBeenCalled();
    expect(mockCtx.createBiquadFilter).toHaveBeenCalled();
    expect(mockCtx.createGain).toHaveBeenCalled();
  });

  it('reuses pre-allocated noise buffer across multiple playFlipSound calls', () => {
    const mockCtx = createMockAudioContext();
    window.AudioContext = vi.fn(() => mockCtx);
    initAudio();
    mockCtx.createBuffer.mockClear();

    playFlipSound();
    expect(mockCtx.createBuffer).not.toHaveBeenCalled();

    playFlipSound();
    expect(mockCtx.createBuffer).not.toHaveBeenCalled();
  });

  it('creates biquad filters with correct frequencies', () => {
    const mockCtx = createMockAudioContext();
    window.AudioContext = vi.fn(() => mockCtx);
    initAudio();
    playFlipSound();

    const filters = mockCtx.createBiquadFilter.mock.results.map(r => r.value);

    const lowpass = filters.find(f => f.type === 'lowpass');
    expect(lowpass).toBeTruthy();
    expect(lowpass.frequency.value).toBe(1000);

    const highpass = filters.find(f => f.type === 'highpass');
    expect(highpass).toBeTruthy();
    expect(highpass.frequency.value).toBe(100);

    const bandpass = filters.find(f => f.type === 'bandpass');
    expect(bandpass).toBeTruthy();
    expect(bandpass.frequency.value).toBe(500);
    expect(bandpass.Q.value).toBe(0.7);
  });

  it('sound plays at animationend, not at flip start', () => {
    const mockCtx = createMockAudioContext();
    window.AudioContext = vi.fn(() => mockCtx);
    initAudio();

    const unit = createFlipUnit('5');
    const callsBefore = mockCtx.createBufferSource.mock.calls.length;

    updateFlipUnit(unit, '6');

    expect(mockCtx.createBufferSource).toHaveBeenCalledTimes(callsBefore);

    const flippingCard = unit.querySelector('.card-flip.flipping');
    flippingCard.dispatchEvent(new Event('animationend'));

    expect(mockCtx.createBufferSource).toHaveBeenCalled();
    expect(mockCtx.createBiquadFilter).toHaveBeenCalled();
    expect(mockCtx.createGain).toHaveBeenCalled();
  });

  it('handles missing audio context gracefully in playFlipSound', () => {
    expect(() => playFlipSound()).not.toThrow();
  });
});

// --- initClock ---

describe('initClock', () => {
  it('sets all card-flip faces to the current time digit', () => {
    vi.useFakeTimers();
    const now = new Date(2024, 0, 1, 14, 30, 45);
    vi.setSystemTime(now);

    const { units, ampmEl, dateEl } = createClockElements();
    initClock(units, ampmEl, dateEl);

    units.forEach((unit, i) => {
      const cards = unit.querySelectorAll('.card-flip');
      cards.forEach(card => {
        expect(card.querySelector('.card-flip-front .digit').textContent)
          .toBe(String([0, 2, 3, 0, 4, 5][i]));
        expect(card.querySelector('.card-flip-back .digit').textContent)
          .toBe(String([0, 2, 3, 0, 4, 5][i]));
      });
      expect(unit.dataset.value).toBe(String([0, 2, 3, 0, 4, 5][i]));
    });

    vi.useRealTimers();
  });

  it('does not trigger flip animation on init', () => {
    vi.useFakeTimers();
    const now = new Date(2024, 0, 1, 10, 0, 0);
    vi.setSystemTime(now);

    const { units, ampmEl, dateEl } = createClockElements();
    initClock(units, ampmEl, dateEl);

    units.forEach(unit => {
      unit.querySelectorAll('.card-flip').forEach(card => {
        expect(card.classList.contains('flipping')).toBe(false);
      });
    });

    vi.useRealTimers();
  });

  it('keeps exactly one .upper, one .pre-upper, and one .lower per unit after init', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 1, 10, 0, 0));

    const { units, ampmEl, dateEl } = createClockElements();
    initClock(units, ampmEl, dateEl);

    units.forEach(unit => {
      expect(unit.querySelectorAll('.card-flip.upper').length).toBe(1);
      expect(unit.querySelectorAll('.card-flip.pre-upper').length).toBe(1);
      expect(unit.querySelectorAll('.card-flip.lower').length).toBe(1);
      expect(unit.querySelectorAll('.card-flip.next').length).toBe(0);
      expect(unit.querySelectorAll('.card-flip.flipping').length).toBe(0);
    });

    vi.useRealTimers();
  });

  it('sets ampm text', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 1, 14, 0, 0));

    const { units, ampmEl, dateEl } = createClockElements();
    initClock(units, ampmEl, dateEl);

    expect(ampmEl.textContent).toBe('PM');
    vi.useRealTimers();
  });

  it('sets date text', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 11, 25, 10, 0, 0));

    const { units, ampmEl, dateEl } = createClockElements();
    initClock(units, ampmEl, dateEl);

    expect(dateEl.textContent).toMatch(/^Wednesday 25 Dec 2024$/);
    vi.useRealTimers();
  });

  it('handles all 6 units', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 1, 12, 34, 56));

    const { units, ampmEl, dateEl } = createClockElements();
    expect(units).toHaveLength(6);
    initClock(units, ampmEl, dateEl);

    expect(units[4].dataset.value).toBe('5');
    expect(units[5].dataset.value).toBe('6');
    vi.useRealTimers();
  });
});

// --- updateClock ---

describe('updateClock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('updates flip units to current time', () => {
    vi.setSystemTime(new Date(2024, 0, 1, 10, 0, 0));

    const { units, ampmEl, dateEl } = createClockElements();
    units.forEach((u, i) => {
      u.dataset.value = String(i);
    });

    vi.setSystemTime(new Date(2024, 0, 1, 10, 0, 1));
    updateClock(units, ampmEl, dateEl);

    expect(units[5].dataset.value).toBe('1');
  });

  it('updates ampm text', () => {
    vi.setSystemTime(new Date(2024, 0, 1, 11, 59, 59));

    const { units, ampmEl, dateEl } = createClockElements();
    updateClock(units, ampmEl, dateEl);

    expect(ampmEl.textContent).toBe('AM');

    vi.setSystemTime(new Date(2024, 0, 1, 12, 0, 0));
    updateClock(units, ampmEl, dateEl);

    expect(ampmEl.textContent).toBe('PM');
  });

  it('triggers flip animation when seconds change', () => {
    const { units, ampmEl, dateEl } = createClockElements();
    units.forEach(u => { u.dataset.value = '0'; });

    vi.setSystemTime(new Date(2024, 0, 1, 10, 0, 1));
    updateClock(units, ampmEl, dateEl);

    const upper = units[5].querySelector('.card-flip.upper');
    expect(upper.classList.contains('flipping')).toBe(true);
  });

  it('does not flip when the same time is set', () => {
    const { units, ampmEl, dateEl } = createClockElements();
    const digits = [1, 2, 3, 4, 5, 6];
    units.forEach((u, i) => { u.dataset.value = String(digits[i]); });

    vi.setSystemTime(new Date(2024, 0, 1, 12, 34, 56));
    updateClock(units, ampmEl, dateEl);

    units.forEach(u => {
      u.querySelectorAll('.card-flip').forEach(card => {
        expect(card.classList.contains('flipping')).toBe(false);
      });
    });
  });

  it('handles all 6 digit positions', () => {
    vi.setSystemTime(new Date(2024, 0, 1, 12, 34, 56));

    const { units, ampmEl, dateEl } = createClockElements();
    units.forEach(u => { u.dataset.value = ''; });

    updateClock(units, ampmEl, dateEl);

    expect(units[0].dataset.value).toBe('1');
    expect(units[1].dataset.value).toBe('2');
    expect(units[2].dataset.value).toBe('3');
    expect(units[3].dataset.value).toBe('4');
    expect(units[4].dataset.value).toBe('5');
    expect(units[5].dataset.value).toBe('6');
  });

  it('updates date text across midnight', () => {
    vi.setSystemTime(new Date(2024, 0, 1, 23, 59, 59));

    const { units, ampmEl, dateEl } = createClockElements();
    updateClock(units, ampmEl, dateEl);

    expect(dateEl.textContent).toBe('Monday 1 Jan 2024');

    vi.setSystemTime(new Date(2024, 0, 2, 0, 0, 0));
    updateClock(units, ampmEl, dateEl);

    expect(dateEl.textContent).toBe('Tuesday 2 Jan 2024');
  });

  it('does nothing when flipUnits is null', () => {
    const { units, ampmEl, dateEl } = createClockElements();
    expect(() => updateClock(null, ampmEl, dateEl)).not.toThrow();
  });

  it('does nothing when flipUnits is empty', () => {
    const { ampmEl, dateEl } = createClockElements();
    expect(() => updateClock([], ampmEl, dateEl)).not.toThrow();
  });

  it('does nothing when ampmEl is null', () => {
    const { units, dateEl } = createClockElements();
    expect(() => updateClock(units, null, dateEl)).not.toThrow();
  });

  it('does nothing when dateEl is null', () => {
    const { units, ampmEl } = createClockElements();
    expect(() => updateClock(units, ampmEl, null)).not.toThrow();
  });
});

// --- digit vertical alignment ---

describe('digit vertical alignment', () => {
  // Arbitrary size configurations — single-size CSS + transform:scale handles all sizing
  const breakpoints = [
    { name: 'Set 1', w: 180, h: 280, fontSize: 255, expectedOffset: 12.5 },
    { name: 'Set 2', w: 140, h: 220, fontSize: 200, expectedOffset: 10 },
    { name: 'Set 3', w: 100, h: 160, fontSize: 145, expectedOffset: 7.5 },
    { name: 'Set 4', w: 70, h: 110, fontSize: 100, expectedOffset: 5 },
    { name: 'Set 5', w: 55, h: 88, fontSize: 80, expectedOffset: 4 },
  ];

  breakpoints.forEach(({ name, h, fontSize, expectedOffset }) => {
    it(`computes offset = (H - fontSize)/2 = ${expectedOffset}px at ${name}`, () => {
      const offset = (h - fontSize) / 2;
      expect(offset).toBe(expectedOffset);
    });

    it(`digit center = flip-unit center (H/2 = ${h / 2}) at ${name}`, () => {
      const offset = (h - fontSize) / 2;
      const digitCenter = offset + fontSize / 2;
      expect(digitCenter).toBe(h / 2);
    });
  });

  it('upper visible center mirrors lower visible center across flip-unit center', () => {
    breakpoints.forEach(({ h, fontSize }) => {
      const offset = (h - fontSize) / 2;
      const hingeGap = 2;
      const cardH = h / 2 - 1;

      const upperVisibleTop = offset;
      const upperVisibleBottom = cardH;
      const upperCenter = (upperVisibleTop + upperVisibleBottom) / 2;

      const lowerVisibleTop = h / 2 + 1;
      const lowerVisibleBottom = h - offset;
      const lowerCenter = (lowerVisibleTop + lowerVisibleBottom) / 2;

      const flipCenter = h / 2;
      expect(flipCenter - upperCenter).toBeCloseTo(lowerCenter - flipCenter);
    });
  });

  it('no hardcoded 10px remains in CSS for digit positioning', () => {
    const css = readFileSync('./style.css', 'utf-8');

    expect(css).toContain('.card-flip-front .digit');
    expect(css).toContain('top: calc(100% + 1px - 0.5em)');
    expect(css).not.toMatch(/\.card-flip-front \.digit[^}]*top:\s*10px/);

    expect(css).toContain('.card-flip-back .digit');
    expect(css).toContain('bottom: calc(100% + 1px - 0.5em)');
    expect(css).not.toMatch(/\.card-flip-back \.digit[^}]*bottom:\s*10px/);

    expect(css).toContain('.card-flip.lower .card-flip-front .digit');
    expect(css).toContain('bottom: calc(100% + 1px - 0.5em)');
    expect(css).not.toMatch(/\.card-flip\.lower \.card-flip-front \.digit[^}]*bottom:\s*10px/);
  });

  it('applies calc() positioning to upper card digit in DOM', () => {
    const style = document.createElement('style');
    style.textContent = `
      .card-flip-front .digit { top: calc(100% + 1px - 0.5em); }
      .card-flip-back .digit { bottom: calc(100% + 1px - 0.5em); }
      .card-flip.lower .card-flip-front .digit { top: auto; bottom: calc(100% + 1px - 0.5em); }
    `;
    document.head.appendChild(style);

    const unit = createFlipUnit('8');
    document.body.appendChild(unit);

    const frontDigit = unit.querySelector('.card-flip.upper .card-flip-front .digit');
    const backDigit = unit.querySelector('.card-flip.upper .card-flip-back .digit');
    const lowerFrontDigit = unit.querySelector('.card-flip.lower .card-flip-front .digit');

    expect(getComputedStyle(frontDigit).top).toMatch(/calc/);
    expect(getComputedStyle(backDigit).bottom).toMatch(/calc/);
    expect(getComputedStyle(lowerFrontDigit).bottom).toMatch(/calc/);

    document.head.removeChild(style);
    document.body.removeChild(unit);
  });

  it('calc(100% + 1px - 0.5em) equals (H - fontSize)/2 at every breakpoint', () => {
    breakpoints.forEach(({ h, fontSize }) => {
      const cardH = h / 2 - 1;
      const calcResult = cardH + 1 - fontSize / 2;
      const expected = (h - fontSize) / 2;
      expect(calcResult).toBe(expected);
    });
  });

  it('digit top is always inside the upper card (offset < cardH) at every breakpoint', () => {
    breakpoints.forEach(({ h, fontSize }) => {
      const offset = (h - fontSize) / 2;
      const cardH = h / 2 - 1;
      expect(offset).toBeLessThan(cardH);
    });
  });

  it('digit extends past upper card bottom (offset + fontSize > cardH) at every breakpoint', () => {
    breakpoints.forEach(({ h, fontSize }) => {
      const offset = (h - fontSize) / 2;
      const cardH = h / 2 - 1;
      expect(offset + fontSize).toBeGreaterThan(cardH);
    });
  });

  it('digit extends past lower card top (offset + fontSize > h/2 + 1) at every breakpoint', () => {
    breakpoints.forEach(({ h, fontSize }) => {
      const offset = (h - fontSize) / 2;
      expect(offset + fontSize).toBeGreaterThan(h / 2 + 1);
    });
  });

  it('hinge gap (2px) is smaller than font-size at every breakpoint', () => {
    breakpoints.forEach(({ fontSize }) => {
      expect(fontSize).toBeGreaterThan(2);
    });
  });
});

// --- adjustScale ---

let testStyleTag = null;

function createFullClock(unitW, gapW, gapB, ampmW, ampmMargin) {
  if (testStyleTag) testStyleTag.remove();
  testStyleTag = document.createElement('style');
  testStyleTag.textContent = [
    ':root { --ampm-ml-scale: ' + ampmMargin + 'px; }',
    '.flip-unit { width: ' + unitW + 'px; height: 200px; }',
    '.digit { font-size: 100px; }',
    '.hours { display:flex; gap: ' + gapW + 'px; }',
    '.clock { display:flex; gap: ' + gapB + 'px; }',
    '#ampm { margin-left: 0; width: ' + ampmW + 'px; font-size: 20px; }',
  ].join(' ');
  document.head.appendChild(testStyleTag);

  const unit = document.createElement('div');
  unit.className = 'flip-unit';
  const digit = document.createElement('div');
  digit.className = 'digit';
  unit.appendChild(digit);

  const makeGroup = () => {
    const g = document.createElement('div');
    g.className = 'hours';
    g.appendChild(unit.cloneNode(true));
    g.appendChild(unit.cloneNode(true));
    return g;
  };

  const clock = document.createElement('div');
  clock.className = 'clock';
  clock.appendChild(makeGroup());
  clock.appendChild(makeGroup());
  clock.appendChild(makeGroup());

  const wrapper = document.createElement('div');
  wrapper.className = 'clock-wrapper';
  wrapper.appendChild(clock);

  const ampm = document.createElement('span');
  ampm.id = 'ampm';
  ampm.textContent = 'AM';

  return { unit, clock, ampm, digit, wrapper };
}

function totalWidth(unitW, gapW, gapB, ampmW, ampmMargin) {
  return 6 * unitW + 3 * gapW + 2 * gapB + ampmW + ampmMargin;
}

describe('getClockWidth', () => {
  beforeEach(() => {
    document.querySelectorAll('.clock, #ampm, .flip-unit').forEach(el => el.remove());
  });
  afterEach(() => {
    if (testStyleTag) { testStyleTag.remove(); testStyleTag = null; }
  });

  it('computes width from DOM elements', () => {
    const els = createFullClock(180, 5, 30, 40, 15);
    document.body.appendChild(els.clock);
    document.body.appendChild(els.ampm);
    expect(document.querySelector('.flip-unit')).not.toBeNull();
    expect(document.querySelector('.clock')).not.toBeNull();
    expect(document.querySelector('.hours')).not.toBeNull();
    expect(document.getElementById('ampm')).not.toBeNull();
    const got = getClockWidth();
    const expected = totalWidth(180, 5, 30, 40, 0);
    expect(got).toBeGreaterThan(0);
    expect(got).toBeCloseTo(expected, -1);
    document.body.removeChild(els.clock);
    document.body.removeChild(els.ampm);
  });

  it('returns window.innerWidth when elements are missing', () => {
    const gcw = getClockWidth();
    const iw  = window.innerWidth;
    expect(gcw).toBe(iw);
  });

  it('returns window.innerWidth when .flip-unit is missing', () => {
    const els = createFullClock(180, 5, 30, 40, 15);
    document.body.appendChild(els.clock);
    document.body.appendChild(els.ampm);
    document.querySelectorAll('.flip-unit').forEach(el => el.className = 'x');
    expect(getClockWidth()).toBe(window.innerWidth);
    document.body.removeChild(els.clock);
    document.body.removeChild(els.ampm);
  });

  it('returns window.innerWidth when .clock is missing', () => {
    const els = createFullClock(180, 5, 30, 40, 15);
    document.body.appendChild(els.clock);
    document.body.appendChild(els.ampm);
    els.clock.className = 'not-clock';
    expect(getClockWidth()).toBe(window.innerWidth);
    document.body.removeChild(els.clock);
    document.body.removeChild(els.ampm);
  });

  it('returns window.innerWidth when .hours is missing', () => {
    const els = createFullClock(180, 5, 30, 40, 15);
    document.body.appendChild(els.clock);
    document.body.appendChild(els.ampm);
    document.querySelectorAll('.hours').forEach(el => el.className = 'x');
    expect(getClockWidth()).toBe(window.innerWidth);
    document.body.removeChild(els.clock);
    document.body.removeChild(els.ampm);
  });

  it('returns window.innerWidth when #ampm is missing', () => {
    const els = createFullClock(180, 5, 30, 40, 15);
    document.body.appendChild(els.clock);
    document.body.appendChild(els.ampm);
    els.ampm.id = 'not-ampm';
    expect(getClockWidth()).toBe(window.innerWidth);
    document.body.removeChild(els.clock);
    document.body.removeChild(els.ampm);
  });
});

describe('getClockHeight', () => {
  afterEach(() => {
    document.querySelectorAll('.clock, #ampm, .flip-unit, #date').forEach(el => el.remove());
    if (testStyleTag) { testStyleTag.remove(); testStyleTag = null; }
  });

  it('returns unit height when no date element exists', () => {
    const els = createFullClock(180, 5, 30, 40, 15);
    document.body.appendChild(els.clock);
    document.body.appendChild(els.ampm);
    expect(getClockHeight()).toBe(200);
    document.body.removeChild(els.clock);
    document.body.removeChild(els.ampm);
  });

  it('returns unitH + dateFS + dateMB when date element exists', () => {
    const els = createFullClock(180, 5, 30, 40, 15);
    document.body.appendChild(els.clock);
    document.body.appendChild(els.ampm);
    const dateStyle = document.createElement('style');
    dateStyle.textContent = '#date { font-size: 28px; margin-bottom: 30px; }';
    document.head.appendChild(dateStyle);
    const date = document.createElement('div');
    date.id = 'date';
    document.body.appendChild(date);
    expect(getClockHeight()).toBe(200 + 28 + 30);
    document.body.removeChild(date);
    document.head.removeChild(dateStyle);
    document.body.removeChild(els.clock);
    document.body.removeChild(els.ampm);
  });

  it('returns window.innerHeight when no .flip-unit exists', () => {
    expect(getClockHeight()).toBe(window.innerHeight);
  });
});

describe('adjustScale', () => {
  beforeEach(() => {
    setViewportHeight(2000);
  });
  afterEach(() => {
    restoreViewportWidth();
    restoreViewportHeight();
    document.querySelectorAll('.clock-wrapper, .container, .clock, #ampm, .flip-unit, #date').forEach(el => el.remove());
    document.querySelectorAll('style').forEach(el => el.remove());
    document.documentElement.style.minHeight = '';
    document.documentElement.style.overflowY = '';
    if (testStyleTag) { testStyleTag.remove(); testStyleTag = null; }
  });

  it('is a function', () => {
    expect(typeof adjustScale).toBe('function');
  });

  it('returns without error when no elements exist', () => {
    expect(() => adjustScale()).not.toThrow();
  });

  it('does not set transform when viewport is larger than natural width + margin', () => {
    const els = createFullClock(180, 5, 30, 40, 15);
    document.body.appendChild(els.wrapper);
    document.body.appendChild(els.ampm);
    const natW = totalWidth(180, 5, 30, 40, 15);
    setViewportWidth(natW + 100);
    adjustScale();
    expect(els.wrapper.style.transform).toBe('');
  });

  it('sets transform scale when viewport is narrower', () => {
    const els = createFullClock(180, 5, 30, 40, 15);
    document.body.appendChild(els.wrapper);
    document.body.appendChild(els.ampm);
    const natW = totalWidth(180, 5, 30, 40, 15);
    const vpW = 800;
    setViewportWidth(vpW);
    adjustScale();
    const scale = (vpW - 100) / natW;
    expect(els.wrapper.style.transform).toBe('scale(' + scale + ')');
  });

  it('clears transform when viewport becomes wide after being narrow', () => {
    const els = createFullClock(180, 5, 30, 40, 15);
    document.body.appendChild(els.wrapper);
    document.body.appendChild(els.ampm);
    setViewportWidth(600);
    adjustScale();
    expect(els.wrapper.style.transform).not.toBe('');
    setViewportWidth(2000);
    adjustScale();
    expect(els.wrapper.style.transform).toBe('');
  });

  it('sets transform scale when viewport is narrower (min-scale clamping)', () => {
    const els = createFullClock(180, 5, 30, 40, 15);
    document.body.appendChild(els.wrapper);
    document.body.appendChild(els.ampm);
    const natW = totalWidth(180, 5, 30, 40, 15);
    setViewportWidth(600);
    adjustScale();
    const scale = Math.max((600 - 100) / natW, 0.35);
    expect(els.wrapper.style.transform).toBe('scale(' + scale + ')');
  });

  it('uses (viewport - 100px) as the target for scale calculation (50px padding each side)', () => {
    const els = createFullClock(180, 5, 30, 40, 15);
    document.body.appendChild(els.wrapper);
    document.body.appendChild(els.ampm);
    const natW = totalWidth(180, 5, 30, 40, 15);
    setViewportWidth(800);
    adjustScale();
    const expectedScale = (800 - 100) / natW;
    expect(els.wrapper.style.transform).toBe('scale(' + expectedScale + ')');
  });

  it('adjustScale called twice at same viewport keeps stable styles', () => {
    const els = createFullClock(180, 5, 30, 40, 15);
    document.body.appendChild(els.wrapper);
    document.body.appendChild(els.ampm);
    setViewportWidth(800);
    adjustScale();
    const w1 = els.wrapper.style.transform;
    adjustScale();
    const w2 = els.wrapper.style.transform;
    expect(w1).toBe(w2);
  });

  it('sets transform scale when viewport is narrow and date element exists', () => {
    const els = createFullClock(180, 5, 30, 40, 15);
    document.body.appendChild(els.wrapper);
    document.body.appendChild(els.ampm);
    const date = document.createElement('div');
    date.id = 'date';
    document.body.appendChild(date);
    setViewportWidth(600);
    adjustScale();
    expect(els.wrapper.style.transform).not.toBe('');
    document.body.removeChild(date);
  });

  it('does not scale date when date element does not exist', () => {
    const els = createFullClock(180, 5, 30, 40, 15);
    document.body.appendChild(els.wrapper);
    document.body.appendChild(els.ampm);
    setViewportWidth(600);
    expect(() => adjustScale()).not.toThrow();
  });

  it('does not set transform when width is unconstrained (scale >= 1)', () => {
    const els = createFullClock(180, 5, 30, 40, 15);
    document.body.appendChild(els.wrapper);
    document.body.appendChild(els.ampm);
    const natW = totalWidth(180, 5, 30, 40, 15);
    setViewportWidth(natW + 100);
    setViewportHeight(200);
    adjustScale();
    expect(els.wrapper.style.transform).toBe('');
  });

  it('uses width-scale when width is constrained and height is not', () => {
    const els = createFullClock(180, 5, 30, 40, 15);
    document.body.appendChild(els.wrapper);
    document.body.appendChild(els.ampm);
    const natW = totalWidth(180, 5, 30, 40, 15);
    setViewportWidth(800);
    setViewportHeight(2000);
    adjustScale();
    const scaleW = (800 - 100) / natW;
    const scale = Math.max(scaleW, 0.5);
    expect(els.wrapper.style.transform).toBe('scale(' + scale + ')');
  });

  it('keeps scale from width even when height is very short', () => {
    const els = createFullClock(180, 5, 30, 40, 15);
    document.body.appendChild(els.wrapper);
    document.body.appendChild(els.ampm);
    const natW = totalWidth(180, 5, 30, 40, 15);
    setViewportWidth(800);
    setViewportHeight(50);
    adjustScale();
    const scaleW = (800 - 100) / natW;
    const scale = Math.max(scaleW, 0.5);
    expect(els.wrapper.style.transform).toBe('scale(' + scale + ')');
  });

  it('clears transform when viewport width recovers to unconstrained', () => {
    const els = createFullClock(180, 5, 30, 40, 15);
    document.body.appendChild(els.wrapper);
    document.body.appendChild(els.ampm);
    const natW = totalWidth(180, 5, 30, 40, 15);
    setViewportWidth(400);
    adjustScale();
    expect(els.wrapper.style.transform).not.toBe('');
    setViewportWidth(natW + 100);
    adjustScale();
    expect(els.wrapper.style.transform).toBe('');
  });

  it('does not set transform when both width and height are unconstrained', () => {
    const els = createFullClock(180, 5, 30, 40, 15);
    document.body.appendChild(els.wrapper);
    document.body.appendChild(els.ampm);
    const natW = totalWidth(180, 5, 30, 40, 15);
    setViewportWidth(natW + 100);
    setViewportHeight(400);
    adjustScale();
    expect(els.wrapper.style.transform).toBe('');
  });

  it('clamps scale to MIN_SCALE at extremely small viewport sizes', () => {
    const els = createFullClock(180, 5, 30, 40, 15);
    document.body.appendChild(els.wrapper);
    document.body.appendChild(els.ampm);
    setViewportWidth(1);
    adjustScale();
    expect(els.wrapper.style.transform).toBe('scale(0.35)');
  });

  it('does not set inline height or min-height on container or html (overflow-based height behavior matches width)', () => {
    const container = document.createElement('div');
    container.className = 'container';
    const els = createFullClock(180, 5, 30, 40, 15);
    container.appendChild(els.clock);
    document.body.appendChild(container);
    document.body.appendChild(els.ampm);
    setViewportHeight(150);
    adjustScale();
    expect(container.style.height).toBe('');
    expect(container.style.minHeight).toBe('');
    expect(document.documentElement.style.minHeight).toBe('');
    document.body.removeChild(container);
    document.body.removeChild(els.ampm);
  });

  it('does not set inline height on container even at extremely small viewport (matches width behavior)', () => {
    const container = document.createElement('div');
    container.className = 'container';
    const els = createFullClock(180, 5, 30, 40, 15);
    container.appendChild(els.clock);
    document.body.appendChild(container);
    document.body.appendChild(els.ampm);
    setViewportHeight(1);
    adjustScale();
    expect(container.style.height).toBe('');
    expect(container.style.minHeight).toBe('');
    expect(document.documentElement.style.minHeight).toBe('');
    document.body.removeChild(container);
    document.body.removeChild(els.ampm);
  });
});

// --- resetClockState ---

describe('resetClockState', () => {
  beforeEach(() => {
    delete window.AudioContext;
    delete window.webkitAudioContext;
  });

  afterEach(() => {
    resetClockState();
  });

  it('re-enables audio initialization on next initAudio call', () => {
    const mockCtx = createMockAudioContext();
    window.AudioContext = vi.fn(() => mockCtx);
    initAudio();
    expect(window.AudioContext).toHaveBeenCalledTimes(1);
    resetClockState();
    initAudio();
    expect(window.AudioContext).toHaveBeenCalledTimes(2);
  });

  it('clears the noise buffer so a new one is created on re-init', () => {
    const mockCtx = createMockAudioContext();
    window.AudioContext = vi.fn(() => mockCtx);
    initAudio();
    const callsBefore = mockCtx.createBuffer.mock.calls.length;
    expect(callsBefore).toBeGreaterThan(0);

    resetClockState();
    initAudio();
    expect(mockCtx.createBuffer).toHaveBeenCalledTimes(callsBefore + 1);
  });
});

// --- setupClock (integration smoke test) ---

function createSetupClockDOM() {
  const clockDiv = document.createElement('div');
  clockDiv.className = 'clock';
  const ampm = document.createElement('span');
  ampm.id = 'ampm';
  const date = document.createElement('div');
  date.id = 'date';
  const units = Array.from({ length: 6 }, () => createFlipUnit());
  units.forEach(u => clockDiv.appendChild(u));
  document.body.appendChild(clockDiv);
  document.body.appendChild(ampm);
  document.body.appendChild(date);
  return { clockDiv, ampm, date, units };
}

function removeSetupClockDOM({ clockDiv, ampm, date }) {
  document.body.removeChild(clockDiv);
  document.body.removeChild(ampm);
  document.body.removeChild(date);
}

function cleanupClockDOM() {
  document.querySelectorAll('.clock, #ampm, #date, .flip-unit, #flip-unit-tpl').forEach(el => el.remove());
}

describe('setupClock', () => {
  afterEach(() => {
    vi.useRealTimers();
    resetClockState();
    cleanupClockDOM();
  });

  it('is a function', async () => {
    vi.resetModules();
    const { setupClock } = await import('./clock.js');
    expect(typeof setupClock).toBe('function');
  });

  it('initializes all faces and sets up timer when clock element exists', async () => {
    vi.useFakeTimers();
    vi.resetModules();
    const clockModule = await import('./clock.js');
    const time = clockModule.getFormattedTime();
    const dom = createSetupClockDOM();

    clockModule.setupClock();

    dom.units.forEach((unit, i) => {
      const front = unit.querySelector('.card-flip-front .digit');
      expect(front.textContent).toBe(String(time.digits[i]));
      expect(unit.dataset.value).toBe(String(time.digits[i]));
    });
    expect(dom.ampm.textContent).toBe(time.ampm);
    expect(dom.date.textContent).toBeTruthy();
  });

  it('clears previous tickInterval, resizeHandler, and visibilityHandler when called twice', async () => {
    vi.useFakeTimers();
    vi.resetModules();
    const clockModule = await import('./clock.js');
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    const removeEventListenerSpy = vi.spyOn(globalThis, 'removeEventListener');
    const docRemoveEventListenerSpy = vi.spyOn(document, 'removeEventListener');
    const dom = createSetupClockDOM();

    clockModule.setupClock();
    clearIntervalSpy.mockClear();
    removeEventListenerSpy.mockClear();
    docRemoveEventListenerSpy.mockClear();

    clockModule.setupClock();

    expect(clearIntervalSpy).toHaveBeenCalled();
    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(docRemoveEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  });

  it('generates flip units from template when #flip-unit-tpl exists', async () => {
    vi.useFakeTimers();
    vi.resetModules();
    const clockModule = await import('./clock.js');

    const clock = document.createElement('div');
    clock.className = 'clock';
    ['hours', 'minutes', 'seconds'].forEach(cls => {
      const group = document.createElement('div');
      group.className = cls;
      clock.appendChild(group);
    });
    document.body.appendChild(clock);

    const ampm = document.createElement('span');
    ampm.id = 'ampm';
    document.body.appendChild(ampm);
    const date = document.createElement('div');
    date.id = 'date';
    document.body.appendChild(date);

    const tpl = document.createElement('template');
    tpl.id = 'flip-unit-tpl';
    tpl.content.appendChild(createFlipUnit('0'));
    document.body.appendChild(tpl);

    clockModule.setupClock();

    expect(document.querySelectorAll('.flip-unit').length).toBe(6);
  });
});

describe('module auto-init', () => {
  afterEach(() => {
    vi.useRealTimers();
    cleanupClockDOM();
  });

  it('calls setupClock when .clock element exists in the DOM on import', async () => {
    vi.useFakeTimers();
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    const dom = createSetupClockDOM();

    vi.resetModules();
    await import('./clock.js');

    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
  });
});
