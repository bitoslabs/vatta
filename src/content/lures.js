'use strict';

/**
 * Chapter 3 lures — the greed ghost's bait.
 *
 * Placements follow the level geometry on purpose: two sit on the true path
 * (easy to take "in passing"), three sit at the ends of the false branches,
 * so craving literally pulls the player off the road.
 *
 * `greed` is how strongly taking it feeds the craving (ghost speed).
 */
export const LURES = Object.freeze([
  { id: 'coins', x: 1980, y: 1300, greed: 1 },
  { id: 'ring', x: 2280, y: 860, greed: 2 },
  { id: 'gem', x: 2470, y: 340, greed: 3 },
  { id: 'idol', x: 3260, y: 1980, greed: 2 },
  { id: 'chest', x: 3420, y: 2280, greed: 3 },
]);

export const lureNameKey = (id) => `lure.${id}.name`;
