'use strict';

/** Full turn, shared by every canvas routine. */
export const TAU = Math.PI * 2;

/** Finite states of the scene machine. */
export const MODE = Object.freeze({
  TITLE: 'title',
  WORLD: 'world',
  MEDITATION: 'med',
  MEMORY: 'mem',
  END: 'end',
});

/** World bounds. */
export const WORLD = Object.freeze({ w: 4600, h: 3000 });

/** Safe zones. */
export const TEMPLE = Object.freeze({ x: 620, y: 1560, r: 470 });
export const SALA = Object.freeze({ x: 3980, y: 880, r: 300 });

/** Temple east gate — first checkpoint. */
export const GATE_OUT = Object.freeze({ x: 1120, y: 1560 });

/** Player tuning. */
export const PLAYER = Object.freeze({
  x: 620,
  y: 1680,
  radius: 13,
  walkSpeed: 150,
  runSpeed: 240,
  mindSpeed: 84,
  offPathSpeedFactor: 0.7,
  margin: 40,
});

/** Ghost tuning. */
export const GHOST = Object.freeze({
  baseSpeed: 160,
  fearSpeedBonus: 110,
  mindSpeedBase: 60,
  mindSpeedFearBonus: 60,
  stunDuration: 1.1,
  retreatSpeed: 36,
  fadeDuration: 1.4,
  respawnDelay: 10,
  catchDistance: 30,
});

/** Fear / heartbeat tuning. */
export const FEAR = Object.freeze({
  runGain: 0.09,
  ghostGain: 0.13,
  mindRelief: 0.26,
  idleRelief: 0.03,
  walkRelief: 0.015,
  safeRelief: 0.5,
  heartThreshold: 0.32,
  heartFastPeriod: 0.42,
  heartSlowPeriod: 1.35,
});

/** Path detection widths. */
export const PATH_WIDTH = Object.freeze({
  trueWidth: 135,
  falseWidth: 95,
});

/** Interaction radii. */
export const INTERACT = Object.freeze({
  monk: 80,
  sala: 150,
  salaTrigger: 360,
  templeReturn: 340,
});
