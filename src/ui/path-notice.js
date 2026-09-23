'use strict';

import { on, EVENTS } from '../core/events.js';
import { t } from '../systems/i18n.js';
import { toast } from './feedback.js';

/**
 * Practice notices: announce factors of the path as they open, and precepts as
 * they are first broken — the world noting what happened, not judging it.
 */
export function initPathNotice() {
  on(EVENTS.PATH_UNLOCKED, (id) => {
    toast(t('path.unlocked.title'), t(`path.${id}.name`));
  });

  on(EVENTS.PRECEPT_BROKEN, (id) => {
    toast(t('precept.broken.title'), t(`precept.${id}.name`));
  });
}
