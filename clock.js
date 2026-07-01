let audioCtx = null;
let audioInitialized = false;

export function getNextDigit(current) {
  return (current + 1) % 10;
}

export function getFormattedTime(now = new Date()) {
  let hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;

  return {
    digits: [
      Math.floor(hours / 10),
      hours % 10,
      Math.floor(minutes / 10),
      minutes % 10,
      Math.floor(seconds / 10),
      seconds % 10,
    ],
    ampm,
  };
}

export function getFormattedDate(now = new Date()) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

export function initAudio() {
  if (audioInitialized) return;
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (AudioCtor) {
    audioCtx = new AudioCtor();
    audioInitialized = true;
  }
}

export function playFlipSound() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const bufferSize = audioCtx.sampleRate * 0.1;
  const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = noiseBuffer;
  const highpass = audioCtx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 3000;
  const bandpass = audioCtx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.value = 6000;
  bandpass.Q.value = 2;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.5, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
  noise.connect(highpass);
  highpass.connect(bandpass);
  bandpass.connect(gain);
  gain.connect(audioCtx.destination);
  noise.start(now);
  noise.stop(now + 0.1);
  const click = audioCtx.createOscillator();
  const clickGain = audioCtx.createGain();
  click.type = 'square';
  click.frequency.setValueAtTime(4000, now);
  click.frequency.exponentialRampToValueAtTime(2000, now + 0.01);
  clickGain.gain.setValueAtTime(0.25, now);
  clickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.015);
  click.connect(clickGain);
  clickGain.connect(audioCtx.destination);
  click.start(now);
  click.stop(now + 0.02);
}

export function updateFlipUnit(flipUnit, oldValue, newValue) {
  const currentValue = flipUnit.dataset.value;
  if (currentValue === String(newValue)) return;
  if (flipUnit.querySelector('.card-flip.flipping')) return;

  const upperCard = flipUnit.querySelector('.card-flip.upper');
  const preUpperCard = flipUnit.querySelector('.card-flip.pre-upper');
  const lowerCard = flipUnit.querySelector('.card-flip.lower');

  upperCard.querySelector('.card-flip-back .digit').textContent = newValue;
  preUpperCard.querySelector('.card-flip-front .digit').textContent = newValue;

  upperCard.classList.add('flipping');

  function onAnimationEnd() {
    upperCard.removeEventListener('animationend', onAnimationEnd);

    upperCard.querySelector('.card-flip-front .digit').textContent = newValue;
    upperCard.classList.remove('flipping', 'upper');
    upperCard.classList.add('lower');

    preUpperCard.querySelector('.card-flip-back .digit').textContent = newValue;
    preUpperCard.classList.remove('pre-upper');
    preUpperCard.classList.add('upper');

    lowerCard.querySelector('.card-flip-front .digit').textContent = newValue;
    lowerCard.classList.remove('lower');
    lowerCard.classList.add('pre-upper');
  }

  upperCard.addEventListener('animationend', onAnimationEnd);

  playFlipSound();
  flipUnit.dataset.value = String(newValue);
}

export function initClock(flipUnits, ampmEl, dateEl) {
  const time = getFormattedTime();

  flipUnits.forEach((unit, index) => {
    const digit = time.digits[index];
    const cards = unit.querySelectorAll('.card-flip');
    cards.forEach(card => {
      card.querySelector('.card-flip-front .digit').textContent = digit;
      card.querySelector('.card-flip-back .digit').textContent = digit;
    });
    unit.dataset.value = String(digit);
  });

  ampmEl.textContent = time.ampm;
  dateEl.textContent = getFormattedDate();
}

export function updateClock(flipUnits, ampmEl) {
  const time = getFormattedTime();

  flipUnits.forEach((unit, index) => {
    const oldValue = unit.dataset.value;
    const newValue = time.digits[index];
    updateFlipUnit(unit, oldValue, newValue);
  });

  ampmEl.textContent = time.ampm;
}

function clearAllInlineSizeStyles() {
  document.querySelectorAll('.flip-unit').forEach(el => {
    el.style.width = '';
    el.style.height = '';
  });
  const clock = document.querySelector('.clock');
  if (clock) clock.style.gap = '';
  document.querySelectorAll('.hours, .minutes, .seconds').forEach(el => {
    el.style.gap = '';
  });
  document.querySelectorAll('.digit').forEach(el => {
    el.style.fontSize = '';
  });
  const ampm = document.getElementById('ampm');
  if (ampm) {
    ampm.style.fontSize = '';
    ampm.style.marginLeft = '';
  }
  const date = document.getElementById('date');
  if (date) {
    date.style.fontSize = '';
    date.style.marginBottom = '';
  }
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
  const groupW = 2 * unitW + gapW;
  const ampmW = parseFloat(getComputedStyle(ampm).width) || 0;
  const ampmMargin = parseFloat(getComputedStyle(ampm).marginLeft) || 0;
  return 3 * groupW + 2 * gapB + ampmW + ampmMargin;
}

export function adjustScale() {
  clearAllInlineSizeStyles();

  const unit = document.querySelector('.flip-unit');
  const clock = document.querySelector('.clock');
  const group = document.querySelector('.hours');
  const ampm = document.getElementById('ampm');
  if (!unit || !clock || !group || !ampm) return;

  const unitW = parseFloat(getComputedStyle(unit).width) || 0;
  const gapW = parseFloat(getComputedStyle(group).gap) || 0;
  const gapB = parseFloat(getComputedStyle(clock).gap) || 0;
  const groupW = 2 * unitW + gapW;
  const ampmW = parseFloat(getComputedStyle(ampm).width) || 0;
  const ampmM = parseFloat(getComputedStyle(ampm).marginLeft) || 0;
  const naturalW = 3 * groupW + 2 * gapB + ampmW + ampmM;

  const scale = (window.innerWidth - 100) / naturalW;
  if (scale >= 1) return;

  const digitEl = unit.querySelector('.digit');
  const unitH = parseFloat(getComputedStyle(unit).height) || 0;
  const digitFS = digitEl ? parseFloat(getComputedStyle(digitEl).fontSize) || 0 : 0;
  const ampmFS = parseFloat(getComputedStyle(ampm).fontSize) || 0;
  const date = document.getElementById('date');

  document.querySelectorAll('.flip-unit').forEach(el => {
    el.style.width = (unitW * scale) + 'px';
    el.style.height = (unitH * scale) + 'px';
  });
  clock.style.gap = (gapB * scale) + 'px';
  document.querySelectorAll('.hours, .minutes, .seconds').forEach(el => {
    el.style.gap = (gapW * scale) + 'px';
  });
  if (digitFS) {
    document.querySelectorAll('.digit').forEach(el => {
      el.style.fontSize = (digitFS * scale) + 'px';
    });
  }
  ampm.style.fontSize = (ampmFS * scale) + 'px';
  ampm.style.marginLeft = (ampmM * scale) + 'px';
  if (date) {
    const dateFS = parseFloat(getComputedStyle(date).fontSize) || 0;
    const dateMB = parseFloat(getComputedStyle(date).marginBottom) || 0;
    date.style.fontSize = (dateFS * scale) + 'px';
    date.style.marginBottom = (dateMB * scale) + 'px';
  }
}

export function setupClock() {
  const flipUnits = document.querySelectorAll('.flip-unit');
  const ampmEl = document.getElementById('ampm');
  const dateEl = document.getElementById('date');

  document.addEventListener('click', initAudio);
  document.addEventListener('keydown', initAudio);

  initClock(flipUnits, ampmEl, dateEl);
  adjustScale();
  window.addEventListener('resize', adjustScale);
  setInterval(() => updateClock(flipUnits, ampmEl), 1000);
}
