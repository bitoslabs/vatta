'use strict';

/** Floating world captions. */
export const floaters = [];
/** Release / dissolve particles. */
export const sparks = [];
/** Center-screen notices (meditation feedback). */
export const screenNotes = [];

export function addFloater(x, y, text, color = '#b9cfbf', size = 15) {
  floaters.push({ x, y, t: 0, life: 3.4, text, color, size });
}

export function addScreenNote(text) {
  screenNotes.push({ text, t: 0, life: 2.6 });
}

export function addSpark(spark) {
  sparks.push(spark);
}

export function updateEffects(dt) {
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i];
    f.t += dt;
    f.y -= 9 * dt;
    if (f.t >= f.life) floaters.splice(i, 1);
  }
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    s.t += dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.vy -= 26 * dt;
    if (s.t >= s.life) sparks.splice(i, 1);
  }
  ageScreenNotes(dt);
}

/** Screen notes are aged separately because meditation runs outside the world loop. */
export function ageScreenNotes(dt) {
  for (let i = screenNotes.length - 1; i >= 0; i--) {
    const n = screenNotes[i];
    n.t += dt;
    if (n.t >= n.life) screenNotes.splice(i, 1);
  }
}
