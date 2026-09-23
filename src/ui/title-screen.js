'use strict';

import { MODE } from '../core/constants.js';
import { state } from '../core/state.js';
import { initAudio, playBell } from '../systems/audio.js';
import { t } from '../systems/i18n.js';
import { $ } from './dom.js';
import { say } from './dialogue.js';
import { toast } from './feedback.js';

export function initTitleScreen() {
  const button = $('#startBtn');

  button.addEventListener('click', () => {
    initAudio();
    $('#titleScreen').classList.add('hidden');
    $('#ctrlHint').classList.remove('hidden');
    state.mode = MODE.WORLD;
    playBell();
    say('intro', () => toast(t('toast.night.title'), t('toast.night.sub')));
  });

  button.addEventListener('click', (e) => e.target.blur());
}
