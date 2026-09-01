// ============================================================================
//  audio.js — every sound synthesised in the browser. No files, no downloads.
// ============================================================================
//
// Roblox's sound identity is small and very recognisable: the coin ding, the
// checkpoint chime, and the death "oof". None of the original samples are used
// here — each is rebuilt from oscillators and noise, which also means the whole
// game stays one HTML file.

let ctx = null;
let master = null;
let musicGain = null;
let noiseBuffer = null;
let musicTimer = null;

export const Sfx = {
  enabled: true,
  musicEnabled: true,
};

export function initAudio() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
  musicGain = ctx.createGain();
  musicGain.gain.value = 0.16;
  musicGain.connect(master);

  noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuffer.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}

export function resumeAudio() {
  if (!ctx) initAudio();
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

function now() { return ctx ? ctx.currentTime : 0; }

function tone(freq, dur, type = 'sine', vol = 0.2, slideTo = null, delay = 0, dest = null) {
  if (!ctx || !Sfx.enabled) return;
  const t = now() + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.02, dur * 0.3));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest || master);
  o.start(t); o.stop(t + dur + 0.02);
}

function noise(dur, vol = 0.2, filterFreq = 1200, q = 1, delay = 0, type = 'bandpass') {
  if (!ctx || !Sfx.enabled) return;
  const t = now() + delay;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = filterFreq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t); src.stop(t + dur + 0.02);
}

// ------------------------------------------------------------------ the kit

export const sfx = {
  // A soft cloth whoosh as the Robloxian leaves the ground.
  jump() { noise(0.16, 0.10, 900, 0.8, 0, 'bandpass'); tone(360, 0.11, 'sine', 0.07, 620); },

  land() { noise(0.10, 0.13, 260, 1.2, 0, 'lowpass'); },

  // The "oof". A short, falling, throaty vowel — a saw run through a low-pass
  // that closes as the pitch drops.
  oof() {
    if (!ctx || !Sfx.enabled) return;
    const t = now();
    const o = ctx.createOscillator();
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(196, t);
    o.frequency.exponentialRampToValueAtTime(88, t + 0.30);
    f.type = 'lowpass';
    f.frequency.setValueAtTime(1500, t);
    f.frequency.exponentialRampToValueAtTime(380, t + 0.30);
    f.Q.value = 6;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.34, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
    o.connect(f); f.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.36);
    noise(0.06, 0.05, 500, 1, 0, 'lowpass');
  },

  // The coin. Two bright partials a fifth apart, very short.
  coin() {
    tone(1318, 0.09, 'square', 0.11);
    tone(1975, 0.16, 'square', 0.09, null, 0.05);
  },

  // Landing on the right brick.
  correct() {
    tone(523, 0.10, 'triangle', 0.20);
    tone(659, 0.10, 'triangle', 0.20, null, 0.08);
    tone(784, 0.22, 'triangle', 0.20, null, 0.16);
  },

  // Landing on the wrong one: the brick gives way.
  wrong() {
    tone(300, 0.16, 'square', 0.13, 150);
    noise(0.30, 0.16, 400, 0.7, 0.04, 'lowpass');
  },

  // Claiming a checkpoint — Roblox's rising two-note.
  checkpoint() {
    tone(659, 0.13, 'sine', 0.22);
    tone(988, 0.30, 'sine', 0.22, null, 0.11);
    tone(1318, 0.30, 'sine', 0.10, null, 0.11);
  },

  // Finishing the course.
  fanfare() {
    const notes = [523, 659, 784, 1046];
    notes.forEach((n, i) => {
      tone(n, 0.42, 'triangle', 0.20, null, i * 0.13);
      tone(n / 2, 0.42, 'sine', 0.12, null, i * 0.13);
    });
    tone(1568, 0.7, 'triangle', 0.16, null, 0.55);
  },

  badge() {
    tone(1046, 0.14, 'sine', 0.18);
    tone(1318, 0.14, 'sine', 0.18, null, 0.1);
    tone(1568, 0.35, 'sine', 0.20, null, 0.2);
  },

  click() { tone(880, 0.05, 'square', 0.08); },

  respawn() { tone(300, 0.28, 'sine', 0.15, 720); },
};

// ------------------------------------------------------------------- music
// A slow major-key loop in the spirit of a Roblox lobby: pleasant, repetitive,
// and quiet enough to talk over in a classroom.

const MELODY = [
  [523, 1], [659, 1], [784, 1], [659, 1],
  [587, 1], [784, 1], [880, 2],
  [523, 1], [659, 1], [1046, 1], [880, 1],
  [784, 2], [659, 2],
];

export function startMusic() {
  if (!ctx || musicTimer) return;
  let i = 0;
  const beat = 0.42;
  const step = () => {
    if (!Sfx.musicEnabled) { musicTimer = setTimeout(step, 800); return; }
    const [freq, len] = MELODY[i % MELODY.length];
    tone(freq, beat * len * 0.9, 'triangle', 0.09, null, 0, musicGain);
    tone(freq / 2, beat * len * 0.95, 'sine', 0.06, null, 0, musicGain);
    if (i % 4 === 0) tone(freq / 4, beat * 1.8, 'sine', 0.07, null, 0, musicGain);
    i++;
    musicTimer = setTimeout(step, beat * len * 1000);
  };
  step();
}

export function stopMusic() {
  if (musicTimer) { clearTimeout(musicTimer); musicTimer = null; }
}

export function setMusicEnabled(on) {
  Sfx.musicEnabled = !!on;
  if (musicGain) musicGain.gain.value = on ? 0.16 : 0;
}

export function setSfxEnabled(on) {
  Sfx.enabled = !!on;
}
