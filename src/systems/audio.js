'use strict';

import { clamp } from '../core/math.js';
import { pick, rng } from '../core/rng.js';
import { on, EVENTS } from '../core/events.js';

let ctx = null;
let master = null;
let muted = false;

/** Lazily create the Web Audio graph on the first user gesture. */
export function initAudio() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);

  // Constant night wind: filtered white noise with a slow LFO.
  const len = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 300;

  const windGain = ctx.createGain();
  windGain.gain.value = 0.045;

  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.value = 0.08;
  lfoGain.gain.value = 0.02;
  lfo.connect(lfoGain);
  lfoGain.connect(windGain.gain);
  lfo.start();

  source.connect(lowpass);
  lowpass.connect(windGain);
  windGain.connect(master);
  source.start();
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.9;
}

/** Percussive attack / exponential release envelope. */
function envelope(gain, t0, attack, peak, release) {
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(peak, t0 + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + release);
}

export function playBell() {
  if (!ctx) return;
  const t = ctx.currentTime;
  [[520, 0.11, 2.8], [786, 0.05, 2.2], [1240, 0.028, 1.6]].forEach(([freq, peak, dur]) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.type = 'sine';
    envelope(gain, t, 0.005, peak, dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.1);
  });
}

export function playCall(pan = 0) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(560, t);
  osc.frequency.linearRampToValueAtTime(392, t + 0.9);

  const vibrato = ctx.createOscillator();
  const vibratoGain = ctx.createGain();
  vibrato.frequency.value = 5.2;
  vibratoGain.gain.value = 7;
  vibrato.connect(vibratoGain);
  vibratoGain.connect(osc.frequency);
  vibrato.start(t);
  vibrato.stop(t + 1.4);

  envelope(gain, t, 0.3, 0.07, 1);

  let out = gain;
  if (ctx.createStereoPanner) {
    const panner = ctx.createStereoPanner();
    panner.pan.value = clamp(pan, -1, 1);
    gain.connect(panner);
    out = panner;
  }
  osc.connect(gain);
  out.connect(master);
  osc.start(t);
  osc.stop(t + 1.5);
}

export function playChime() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = pick([523, 587, 659, 784, 880]);
  envelope(gain, t, 0.01, 0.06, 0.7);
  osc.connect(gain);
  gain.connect(master);
  osc.start(t);
  osc.stop(t + 0.8);
}

export function playThud() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(88, t);
  osc.frequency.exponentialRampToValueAtTime(38, t + 0.28);
  envelope(gain, t, 0.005, 0.22, 0.3);
  osc.connect(gain);
  gain.connect(master);
  osc.start(t);
  osc.stop(t + 0.4);
}

export function playHeart() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(54, t);
  osc.frequency.exponentialRampToValueAtTime(30, t + 0.1);
  envelope(gain, t, 0.004, 0.16, 0.13);
  osc.connect(gain);
  gain.connect(master);
  osc.start(t);
  osc.stop(t + 0.16);
}

export function playBird() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const chirps = 2 + ((rng() * 2) | 0);
  for (let i = 0; i < chirps; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = t + i * 0.16 + rng() * 0.05;
    osc.type = 'sine';
    const freq = 2100 + rng() * 900;
    osc.frequency.setValueAtTime(freq, start);
    osc.frequency.linearRampToValueAtTime(freq * 1.25, start + 0.07);
    envelope(gain, start, 0.02, 0.02, 0.09);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + 0.2);
  }
}

export function playDissolve() {
  if (!ctx) return;
  const t = ctx.currentTime;
  [392, 523, 659, 784].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    envelope(gain, t + i * 0.28, 0.02, 0.06, 1.4);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t + i * 0.28);
    osc.stop(t + i * 0.28 + 1.6);
  });
}

export function initAudioControls() {
  on(EVENTS.MUTE_TOGGLE, toggleMute);
}
