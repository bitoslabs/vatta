'use strict';

/** Floating world captions. */
export const floaters = [];
/** Release / dissolve particles. */
export const sparks = [];
/** Center-screen notices (meditation feedback). */
export const screenNotes = [];
/**
 * The light a life leaves when it ends (docs/rebirth-effects.md): one ring that
 * gathers and opens once, and — unless reduced motion is on — a small ring of warm
 * sparks around it. Drawn by the world renderer, aged here.
 */
export const lifeLights = [];

export function addFloater(x, y, text, color = '#b9cfbf', size = 15) {
  floaters.push({ x, y, t: 0, life: 3.4, text, color, size });
}

export function addScreenNote(text) {
  screenNotes.push({ text, t: 0, life: 2.6 });
}

export function addSpark(spark) {
  sparks.push(spark);
}

/**
 * A life's ending light at a place. Reduced motion keeps the ring and drops the
 * particles, because the event must read the same either way.
 */
export function addLifeLight(x, y, reduced = false) {
  lifeLights.push({ x, y, t: 0, life: reduced ? 0.9 : 1.6, kind: 'ending' });
  if (reduced) return lifeLights.length;
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const speed = 18 + (i % 4) * 9;
    sparks.push({
      x: x + Math.cos(angle) * 8,
      y: y - 10 + Math.sin(angle) * 5,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed * 0.6 + 14,
      t: 0,
      life: 1.1 + (i % 3) * 0.3,
    });
  }
  return lifeLights.length;
}

/** A small inward ring at the safe spawn, coloured by the arriving body. */
export function addBirthLight(x, y, formId, reduced = false) {
  const kind = formId === 'fish' ? 'water' : formId === 'deva' ? 'heaven'
    : ['niraya', 'peta', 'asura'].includes(formId) ? 'lower' : 'birth';
  lifeLights.push({ x, y, t: 0, life: reduced ? 0.65 : 1.2, kind });
  if (reduced) return lifeLights.length;
  for (let i = 0; i < 12; i++) {
    const angle = i * Math.PI / 6;
    sparks.push({ x: x + Math.cos(angle) * 34, y: y - 14 + Math.sin(angle) * 18,
      vx: -Math.cos(angle) * 22, vy: -Math.sin(angle) * 12,
      t: 0, life: 0.8 });
  }
  return lifeLights.length;
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
  for (let i = lifeLights.length - 1; i >= 0; i--) {
    const light = lifeLights[i];
    light.t += dt;
    if (light.t >= light.life) lifeLights.splice(i, 1);
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
