'use strict';

/**
 * The ground's own say on how fast a body moves (story table ch.11, ควาย — "ลุยโคลน").
 *
 * The first terrain in the game that is not a wall and not a road: a mud flat you
 * can cross at any pace you like, only slowly — unless you are built for it. The
 * speed belongs to the ground, and the body only says whether it has the feet for
 * it (`wade`, content/forms.js), which is what makes the buffalo's life a
 * different walk from everyone else's through the same place.
 */
export const MUD_SPEED = 0.55;

export const TERRAIN = Object.freeze({ mudSpeed: MUD_SPEED });

/** Is this point in mud? (Any `mud` feature the map is carrying.) */
export function mudAt(features, x, y) {
  return features.some((feature) => (
    feature.type === 'mud' && Math.hypot(x - feature.x, y - feature.y) < feature.r
  ));
}

/** The multiplier this body's pace takes from the ground under it. */
export function terrainSpeed(features, x, y, abilities = {}) {
  if (!mudAt(features, x, y)) return 1;
  return abilities.wade === true ? 1 : MUD_SPEED;
}
