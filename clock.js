const CONTAINER_PADDING = 100;
const MIN_SCALE = 0.35;

const AUDIO = {
  HIGHPASS_FREQ: 100,
  BANDPASS_FREQ: 500,
  BANDPASS_Q: 0.7,
  LOWPASS_FREQ: 1000,
  GAIN_PEAK: 0.08,
  GAIN_ATTACK_S: 0.005,
  GAIN_RELEASE_S: 0.06,
  NOISE_DURATION_S: 0.07,
};

const state = {
  audioCtx: null,
  audioInitialized: false,
  fxChain: null,
  tickInterval: null,
  resizeHandler: null,
  resizeRafId: null,
  visibilityHandler: null,
  noiseBuffer: null,
  wrapper: null,
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

let _defaults = null;
let _cardCache = new WeakMap();

function _getCardRefs(unit) {
  let refs = _cardCache.get(unit);
  if (!refs) {
    const allCards = [...unit.querySelectorAll('.card-flip')];
    refs = { allCards };
    _cardCache.set(unit, refs);
  }
  return {
    upper: refs.allCards.find(c => c.classList.contains('upper')),
    preUpper: refs.allCards.find(c => c.classList.contains('pre-upper')),
    lower: refs.allCards.find(c => c.classList.contains('lower')),
  };
}

export function getNextDigit(current) {
  return (current + 1) % 10;
}

export function getFormattedTime(now = new Date()) {
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;

  return {
    digits: [
      Math.floor(displayHours / 10),
      displayHours % 10,
      Math.floor(minutes / 10),
      minutes % 10,
      Math.floor(seconds / 10),
      seconds % 10,
    ],
    ampm,
  };
}

export function getFormattedDate(now = new Date()) {
  return `${DAYS[now.getDay()]} ${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
}

export function initAudio() {
  if (state.audioInitialized) return;
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (AudioCtor) {
    state.audioCtx = new AudioCtor();

    const highpass = state.audioCtx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = AUDIO.HIGHPASS_FREQ;
    const bandpass = state.audioCtx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = AUDIO.BANDPASS_FREQ;
    bandpass.Q.value = AUDIO.BANDPASS_Q;
    const lowpass = state.audioCtx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = AUDIO.LOWPASS_FREQ;
    const gain = state.audioCtx.createGain();

    highpass.connect(bandpass);
    bandpass.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(state.audioCtx.destination);

    const bufferSize = state.audioCtx.sampleRate * AUDIO.NOISE_DURATION_S;
    const noiseBuffer = state.audioCtx.createBuffer(1, bufferSize, state.audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    state.noiseBuffer = noiseBuffer;

    state.fxChain = { highpass, bandpass, lowpass, gain };
    state.audioInitialized = true;
  }
}

export function playFlipSound() {
  if (!state.audioCtx || !state.fxChain || !state.noiseBuffer) return;
  const now = state.audioCtx.currentTime;
  const noise = state.audioCtx.createBufferSource();
  noise.buffer = state.noiseBuffer;
  state.fxChain.gain.gain.setValueAtTime(0, now);
  state.fxChain.gain.gain.linearRampToValueAtTime(AUDIO.GAIN_PEAK, now + AUDIO.GAIN_ATTACK_S);
  state.fxChain.gain.gain.exponentialRampToValueAtTime(0.01, now + AUDIO.GAIN_RELEASE_S);
  noise.connect(state.fxChain.highpass);
  noise.start(now);
  noise.stop(now + AUDIO.NOISE_DURATION_S);
}

export function updateFlipUnit(flipUnit, newValue) {
  const currentValue = flipUnit.dataset.value;
  if (currentValue === String(newValue)) return;
  if (flipUnit.dataset.flipping) return;

  const { upper, preUpper, lower } = _getCardRefs(flipUnit);
  if (!upper || !preUpper || !lower) return;

  upper.querySelector('.card-flip-back .digit').textContent = newValue;
  preUpper.querySelector('.card-flip-front .digit').textContent = newValue;

  flipUnit.dataset.flipping = 'true';
  upper.classList.add('flipping');

  upper.addEventListener('animationend', function onEnd() {
    playFlipSound();

    upper.querySelector('.card-flip-front .digit').textContent = newValue;
    upper.classList.remove('flipping', 'upper');
    upper.classList.add('lower');

    preUpper.querySelector('.card-flip-back .digit').textContent = newValue;
    preUpper.classList.remove('pre-upper');
    preUpper.classList.add('upper');

    lower.querySelector('.card-flip-front .digit').textContent = newValue;
    lower.classList.remove('lower');
    lower.classList.add('pre-upper');

    delete flipUnit.dataset.flipping;
  }, { once: true });

  flipUnit.dataset.value = String(newValue);
}

export function initClock(flipUnits, ampmEl, dateEl) {
  const now = new Date();
  const time = getFormattedTime(now);

  flipUnits.forEach((unit, index) => {
    const digit = time.digits[index];
    const { upper, preUpper, lower } = _getCardRefs(unit);
    [upper, preUpper, lower].forEach(card => {
      card.querySelector('.card-flip-front .digit').textContent = digit;
      card.querySelector('.card-flip-back .digit').textContent = digit;
    });
    unit.dataset.value = String(digit);
  });

  ampmEl.textContent = time.ampm;
  dateEl.textContent = getFormattedDate(now);
}

export function updateClock(flipUnits, ampmEl, dateEl) {
  if (!flipUnits || !flipUnits.length || !ampmEl || !dateEl) return;
  const now = new Date();
  const time = getFormattedTime(now);

  flipUnits.forEach((unit, index) => {
    const newValue = time.digits[index];
    updateFlipUnit(unit, newValue);
  });

  if (ampmEl.textContent !== time.ampm) ampmEl.textContent = time.ampm;
  const dateStr = getFormattedDate(now);
  if (dateEl.textContent !== dateStr) dateEl.textContent = dateStr;
}

function naturalClockWidth(unitW, gapW, gapB, ampmW, ampmM) {
  return 3 * (2 * unitW + gapW) + 2 * gapB + ampmW + ampmM;
}

function naturalClockHeight(unitH, dateFS, dateMB) {
  return unitH + dateFS + dateMB;
}

export function getClockWidth() {
  const unit = document.querySelector('.flip-unit');
  const clock = document.querySelector('.clock');
  const group = document.querySelector('.hours');
  const ampm = document.getElementById('ampm');
  if (!unit || !clock || !group || !ampm) return window.innerWidth;

  const unitW = parseFloat(getComputedStyle(unit).width) || 0;
  const gapW = parseFloat(getComputedStyle(group).gap) || 0;
  const gapB = parseFloat(getComputedStyle(clock).gap) || 0;
  const ampmW = parseFloat(getComputedStyle(ampm).width) || 0;
  const ampmM = parseFloat(getComputedStyle(ampm).marginLeft) || 0;
  return naturalClockWidth(unitW, gapW, gapB, ampmW, ampmM);
}

export function getClockHeight() {
  const unit = document.querySelector('.flip-unit');
  if (!unit) return window.innerHeight;

  const unitH = parseFloat(getComputedStyle(unit).height) || 0;
  const date = document.getElementById('date');
  if (!date) return unitH;

  const dateFS = parseFloat(getComputedStyle(date).fontSize) || 0;
  const dateMB = parseFloat(getComputedStyle(date).marginBottom) || 0;
  return naturalClockHeight(unitH, dateFS, dateMB);
}

function readDefaults() {
  const unit = document.querySelector('.flip-unit');
  const clock = document.querySelector('.clock');
  const group = document.querySelector('.hours');
  const ampm = document.getElementById('ampm');
  if (!unit || !clock || !group || !ampm) return null;

  const rootStyle = getComputedStyle(document.documentElement);

  return {
    _unit: unit,
    _unitW: parseFloat(rootStyle.getPropertyValue('--unit-w')) || 0,
    unitW: parseFloat(getComputedStyle(unit).width) || 0,
    unitH: parseFloat(getComputedStyle(unit).height) || 0,
    gapW: parseFloat(getComputedStyle(group).gap) || 0,
    gapB: parseFloat(getComputedStyle(clock).gap) || 0,
    ampmW: parseFloat(getComputedStyle(ampm).width) || 0,
    ampmMS: parseFloat(rootStyle.getPropertyValue('--ampm-ml-scale')) || 0,
  };
}

function getDefaults() {
  if (!_defaults) {
    _defaults = readDefaults();
    return _defaults;
  }
  const unit = document.querySelector('.flip-unit');
  if (!unit || unit !== _defaults._unit) {
    _defaults = readDefaults();
    return _defaults;
  }
  const rootStyle = getComputedStyle(document.documentElement);
  const curUnitW = parseFloat(rootStyle.getPropertyValue('--unit-w')) || 0;
  if (curUnitW !== _defaults._unitW) {
    _defaults = readDefaults();
  }
  return _defaults;
}

export function adjustScale() {
  const wrapper = state.wrapper || document.querySelector('.clock-wrapper');
  if (!wrapper) return;

  const defs = getDefaults();
  if (!defs) return;

  const naturalW = naturalClockWidth(defs.unitW, defs.gapW, defs.gapB, defs.ampmW, defs.ampmMS);
  const scale = Math.max((window.innerWidth - CONTAINER_PADDING) / naturalW, MIN_SCALE);

  if (scale >= 1) {
    wrapper.style.transform = '';
    return;
  }

  wrapper.style.transform = 'scale(' + scale + ')';
}

export function resetClockState() {
  if (state.tickInterval) clearInterval(state.tickInterval);
  if (state.resizeHandler) window.removeEventListener('resize', state.resizeHandler);
  if (state.resizeRafId) cancelAnimationFrame(state.resizeRafId);
  if (state.visibilityHandler) document.removeEventListener('visibilitychange', state.visibilityHandler);
  _defaults = null;
  _cardCache = new WeakMap();
  state.audioCtx = null;
  state.audioInitialized = false;
  state.fxChain = null;
  state.noiseBuffer = null;
  state.wrapper = null;
  state.tickInterval = null;
  state.resizeHandler = null;
  state.resizeRafId = null;
  state.visibilityHandler = null;
}

export function setupClock() {
  if (state.tickInterval) clearInterval(state.tickInterval);
  if (state.resizeHandler) window.removeEventListener('resize', state.resizeHandler);
  if (state.resizeRafId) cancelAnimationFrame(state.resizeRafId);
  if (state.visibilityHandler) document.removeEventListener('visibilitychange', state.visibilityHandler);

  const tpl = document.getElementById('flip-unit-tpl');
  if (tpl) {
    ['.hours', '.minutes', '.seconds'].forEach(sel => {
      const group = document.querySelector(sel);
      if (!group) return;
      for (let i = 0; i < 2; i++) {
        group.appendChild(tpl.content.cloneNode(true));
      }
    });
  }

  const flipUnits = document.querySelectorAll('.flip-unit');
  const ampmEl = document.getElementById('ampm');
  const dateEl = document.getElementById('date');

  state.wrapper = document.querySelector('.clock-wrapper');

  document.removeEventListener('click', initAudio);
  document.removeEventListener('keydown', initAudio);
  document.addEventListener('click', initAudio);
  document.addEventListener('keydown', initAudio);

  initClock(flipUnits, ampmEl, dateEl);
  adjustScale();

  state.visibilityHandler = () => {
    if (document.visibilityState === 'hidden') {
      clearInterval(state.tickInterval);
      state.tickInterval = null;
    } else if (document.visibilityState === 'visible' && !state.tickInterval) {
      updateClock(flipUnits, ampmEl, dateEl);
      state.tickInterval = setInterval(() => updateClock(flipUnits, ampmEl, dateEl), 1000);
    }
  };
  document.addEventListener('visibilitychange', state.visibilityHandler);

  state.resizeHandler = () => {
    if (state.resizeRafId) cancelAnimationFrame(state.resizeRafId);
    state.resizeRafId = requestAnimationFrame(adjustScale);
  };
  window.addEventListener('resize', state.resizeHandler);
  state.tickInterval = setInterval(() => updateClock(flipUnits, ampmEl, dateEl), 1000);
}

if (document.querySelector('.clock')) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupClock);
  } else {
    setupClock();
  }
}
