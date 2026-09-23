'use strict';

import { MODE } from '../core/constants.js';
import { state } from '../core/state.js';
import { playBell } from '../systems/audio.js';
import { t } from '../systems/i18n.js';
import { $ } from './dom.js';

export function showEndScreen() {
  state.mode = MODE.END;
  const minutes = Math.floor(state.stats.time / 60);
  const seconds = Math.floor(state.stats.time % 60);
  const time = `${minutes}:${String(seconds).padStart(2, '0')}`;

  $('#endStats').innerHTML = t('end.stats', {
    caught: state.stats.caught,
    lost: state.stats.lost,
    time,
  });
  $('#endScreen').classList.remove('hidden');
  playBell();
}

export function initEndScreen() {
  $('#restartBtn').addEventListener('click', () => window.location.reload());
}
