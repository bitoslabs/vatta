'use strict';

import { APP } from '../core/app-meta.js';
import { $ } from './dom.js';

/** Fill the About tab from `core/app-meta.js` so release facts live in one place. */
export function initAbout() {
  const version = $('#aboutVersion');
  if (version) version.textContent = APP.version;

  const repo = $('#aboutRepo');
  if (repo) repo.href = APP.repo;

  const maker = $('#aboutMaker');
  if (maker) maker.href = APP.maker;
}
