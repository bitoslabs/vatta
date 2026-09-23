'use strict';

import { emit, EVENTS } from '../core/events.js';
import { input } from '../systems/input.js';
import { $ } from './dom.js';

const JOY_RADIUS = 44;
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
  input.joy.dx = dx / JOY_RADIUS;
  input.joy.dy = dy / JOY_RADIUS;
  joyKnob.style.left = `${input.joy.ox + dx - KNOB_OFFSET}px`;
  joyKnob.style.top = `${input.joy.oy + dy - KNOB_OFFSET}px`;
}

function bindHold(el, onPress, onRelease) {
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    onPress();
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((evt) => el.addEventListener(evt, onRelease));
}

export function initTouchControls() {
  const ui = $('#touchUI');
  if (input.coarse) ui.classList.remove('hidden');

  joyZone.addEventListener('pointerdown', (e) => {
    input.joy.id = e.pointerId;
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

  window.addEventListener('pointerup', (e) => {
    if (e.pointerId !== input.joy.id) return;
    input.joy.id = null;
    input.joy.dx = 0;
    input.joy.dy = 0;
    joyBase.style.display = 'none';
    joyKnob.style.display = 'none';
  });

  bindHold(
    $('#btnRun'),
    () => { input.run = true; },
    () => { input.run = false; },
  );

  bindHold(
    $('#btnSati'),
    () => { input.sati = true; emit(EVENTS.SPACE_DOWN); },
    () => { input.sati = false; emit(EVENTS.SPACE_UP); },
  );

  $('#btnAct').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    emit(EVENTS.ACTION);
  });
}
