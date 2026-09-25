'use strict';

import { emit, on, EVENTS } from '../core/events.js';
import { input } from '../systems/input.js';
import { canEcho } from '../systems/echo.js';
import { $ } from './dom.js';

const JOY_RADIUS = 44;
const JOY_DEAD_ZONE = 12;
const KNOB_OFFSET = 20;
const BASE_OFFSET = 48;

const joyBase = $('#joyBase');
const joyKnob = $('#joyKnob');
const joyZone = $('#joyZone');

function moveKnob(x, y) {
  let dx = x - input.joy.ox;
  let dy = y - input.joy.oy;
  const magnitude = Math.hypot(dx, dy);
  if (magnitude > JOY_RADIUS) {
    dx *= JOY_RADIUS / magnitude;
    dy *= JOY_RADIUS / magnitude;
  }
  // A thumb rarely travels the full ring on a phone. Match keyboard walking
  // speed once it clears the dead zone; the angle still controls direction.
  input.joy.dx = magnitude > JOY_DEAD_ZONE ? dx / Math.hypot(dx, dy) : 0;
  input.joy.dy = magnitude > JOY_DEAD_ZONE ? dy / Math.hypot(dx, dy) : 0;
  joyKnob.style.left = `${input.joy.ox + dx - KNOB_OFFSET}px`;
  joyKnob.style.top = `${input.joy.oy + dy - KNOB_OFFSET}px`;
}

function bindHold(el, onPress, onRelease) {
  let pointerId = null;
  const release = (e) => {
    if (e?.pointerId !== undefined && e.pointerId !== pointerId) return;
    if (pointerId === null) return;
    pointerId = null;
    el.setAttribute('aria-pressed', 'false');
    onRelease();
  };
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (pointerId !== null) return;
    pointerId = e.pointerId;
    el.setPointerCapture?.(e.pointerId);
    el.setAttribute('aria-pressed', 'true');
    onPress();
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((evt) => el.addEventListener(evt, release));
  ['pointerup', 'pointercancel'].forEach((evt) => window.addEventListener(evt, release));
  window.addEventListener('blur', () => release());
  document.addEventListener('visibilitychange', () => { if (document.hidden) release(); });
  return release;
}

export function initTouchControls() {
  const ui = $('#touchUI');
  if (input.coarse) ui.classList.remove('hidden');

  joyZone.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (input.joy.id !== null) return;
    input.joy.id = e.pointerId;
    joyZone.setPointerCapture?.(e.pointerId);
    joyZone.classList.add('is-active');
    input.joy.ox = e.clientX;
    input.joy.oy = e.clientY;
    input.joy.dx = 0;
    input.joy.dy = 0;
    joyBase.style.display = 'block';
    joyKnob.style.display = 'block';
    joyBase.style.left = `${e.clientX - BASE_OFFSET}px`;
    joyBase.style.top = `${e.clientY - BASE_OFFSET}px`;
    moveKnob(e.clientX, e.clientY);
  });

  window.addEventListener('pointermove', (e) => {
    if (e.pointerId === input.joy.id) moveKnob(e.clientX, e.clientY);
  });

  const releaseJoy = (e) => {
    if (e?.pointerId !== undefined && e.pointerId !== input.joy.id) return;
    if (input.joy.id === null) return;
    input.joy.id = null;
    input.joy.dx = 0;
    input.joy.dy = 0;
    joyBase.style.display = 'none';
    joyKnob.style.display = 'none';
    joyZone.classList.remove('is-active');
  };
  ['pointerup', 'pointercancel'].forEach((evt) => window.addEventListener(evt, releaseJoy));
  joyZone.addEventListener('lostpointercapture', releaseJoy);
  window.addEventListener('blur', () => releaseJoy());
  document.addEventListener('visibilitychange', () => { if (document.hidden) releaseJoy(); });

  const releaseRun = bindHold(
    $('#btnRun'),
    () => { input.run = true; },
    () => { input.run = false; },
  );

  const releaseSati = bindHold(
    $('#btnSati'),
    () => { input.sati = true; emit(EVENTS.SPACE_DOWN); },
    () => { input.sati = false; emit(EVENTS.SPACE_UP); },
  );

  bindHold(
    $('#breathBtn'),
    () => emit(EVENTS.SPACE_DOWN),
    () => emit(EVENTS.SPACE_UP),
  );

  $('#disturbCard').addEventListener('click', () => emit(EVENTS.DISMISS));

  $('#btnAct').addEventListener('click', () => emit(EVENTS.ACTION));
  $('#btnMenu').addEventListener('click', () => {
    releaseJoy();
    releaseRun();
    releaseSati();
    emit(EVENTS.HELP_KEY);
  });

  const echoButton = $('#btnEcho');
  const syncEcho = () => echoButton.classList.toggle('hidden', !canEcho());
  echoButton.addEventListener('click', () => emit(EVENTS.ECHO_PULSE));
  on(EVENTS.FORM_CHANGED, syncEcho);
  on(EVENTS.EFFECT_RECORDED, syncEcho);
  on(EVENTS.REBIRTH, syncEcho);
  syncEcho();
}
