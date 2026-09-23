'use strict';

import { MODE } from '../core/constants.js';
import { state } from '../core/state.js';
import { renderMemoryScene } from '../render/memory-renderer.js';
import { renderWorld } from '../render/world-renderer.js';
import { updateMeditation } from './meditation.js';
import { updateWorld } from './world-update.js';

let last = performance.now();

/** The single requestAnimationFrame driver. */
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (state.mode === MODE.WORLD || state.mode === MODE.TITLE) {
    updateWorld(dt);
    renderWorld();
  } else if (state.mode === MODE.MEDITATION) {
    updateMeditation(dt);
  } else if (state.mode === MODE.MEMORY) {
    renderMemoryScene(dt);
  }

  requestAnimationFrame(frame);
}

export function startLoop() {
  requestAnimationFrame(frame);
}
