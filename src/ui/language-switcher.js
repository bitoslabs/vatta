'use strict';

import { on, EVENTS } from '../core/events.js';
import { availableLocales, getLocale, localeLabel, setLocale } from '../systems/i18n.js';
import { $ } from './dom.js';

export function initLanguageSwitcher() {
  const container = $('#langSwitch');
  container.innerHTML = '';

  for (const code of availableLocales()) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'lang-btn';
    button.dataset.locale = code;
    button.textContent = localeLabel(code);
    button.addEventListener('click', () => setLocale(code));
    container.appendChild(button);
  }

  const syncActive = () => {
    const active = getLocale();
    container.querySelectorAll('.lang-btn').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.locale === active);
    });
  };

  on(EVENTS.LOCALE_CHANGED, syncActive);
  syncActive();
}
