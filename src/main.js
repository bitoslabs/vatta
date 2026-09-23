'use strict';

import { initAudioControls } from './systems/audio.js';
import { initI18n } from './systems/i18n.js';
import { initTeacher } from './systems/teacher.js';
import { initInput } from './systems/input.js';
import { initViewport } from './systems/viewport.js';
import { initChoices } from './ui/choices.js';
import { initCodex } from './ui/codex.js';
import { initDialogue } from './ui/dialogue.js';
import { initEndScreen } from './ui/end-screen.js';
import { initLanguageSwitcher } from './ui/language-switcher.js';
import { initPathNotice } from './ui/path-notice.js';
import { initTeacherPanel } from './ui/teacher-panel.js';
import { initTitleScreen } from './ui/title-screen.js';
import { initTouchControls } from './ui/touch.js';
import { initTextures } from './world/textures.js';
import { initMeditation } from './game/meditation.js';
import { initStory } from './game/story.js';
import { startLoop } from './game/loop.js';

function bootstrap() {
  initTeacher();
  initI18n();
  initViewport();
  initTextures();
  initInput();
  initAudioControls();
  initDialogue();
  initChoices();
  initTouchControls();
  initMeditation();
  initStory();
  initTitleScreen();
  initEndScreen();
  initLanguageSwitcher();
  initPathNotice();
  initTeacherPanel();
  initCodex();
  startLoop();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
} else {
  bootstrap();
}
