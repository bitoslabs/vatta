'use strict';

import en from './en.js';
import lo from './lo.js';
import th from './th.js';

/** Locale registry. `default` is used when nothing is stored yet. */
export const locales = {
  th,
  lo,
  en,
  default: 'th',
  order: ['th', 'lo', 'en'],
};
