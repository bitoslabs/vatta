'use strict';

import { on, EVENTS } from '../core/events.js';
import { t } from '../systems/i18n.js';
import { toast } from './feedback.js';

/** Announce each factor of the path as the run's conduct opens it. */
export function initPathNotice() {
  on(EVENTS.PATH_UNLOCKED, (id) => {
    toast(t('path.unlocked.title'), t(`path.${id}.name`));
  });
}
