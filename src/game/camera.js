'use strict';

import { PLAYER } from '../core/constants.js';

/** Smoothed camera with a decaying shake impulse. */
export const cam = {
  x: PLAYER.x,
  y: PLAYER.y,
  shake: 0,
};
