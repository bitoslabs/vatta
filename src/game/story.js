'use strict';

import { on, EVENTS } from '../core/events.js';
import { state } from '../core/state.js';
import { advanceDialogue } from '../ui/dialogue.js';
import { updateChapter } from './chapters.js';
import './story-chapter1.js';
import './story-chapter2.js';
import './story-chapter3.js';
import './story-chapter4.js';
import './story-chapter5.js';
import './story-chapter6.js';
import './story-chapter7.js';
import './story-chapter8.js';
import './story-chapter9.js';
import './story-chapter10.js';
import './story-chapter11.js';
import './story-chapter12.js';
import './story-chapter13.js';

/** Route the generic "action" event to dialogue or the current interaction. */
function onAction() {
  if (state.dialogueOpen) {
    advanceDialogue();
    return;
  }
  if (state.interact) state.interact.fn();
}

export function initStory() {
  on(EVENTS.ACTION, onAction);
}

export function updateStory(dt) {
  updateChapter(dt);
}
