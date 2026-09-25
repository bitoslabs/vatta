'use strict';

import { state } from '../core/state.js';
import { hashUnit, seedFrom } from '../core/rng.js';
import { FORMS, mapsFor } from '../content/forms.js';
import { CHAPTER_ANIMALS } from './life-route.js';

/**
 * คติภูมิ — where a mind is reborn (design §4, "จุติ–ปฏิสนธิ").
 *
 * The resolver reads **both the fruit and the roots**: the merit and demerit a life
 * ripened (วิบาก), and the tendencies (อนุสัย) each intention reinforced. A mind
 * whose strongest tendency is unwholesome falls to the plane that tendency ripens
 * into — anger to the hells, greed to the petas, delusion to the animals, clinging
 * to the asuras — *unless* a wholesome tendency is at least as strong, in which
 * case the wholesome path decides: concentration lifts the mind up the jhāna ladder
 * through the form and formless planes, metta opens the deva planes, and any lesser
 * merit simply returns a human birth.
 *
 * Nothing here ranks one birth as a punishment and another as a prize: the planes
 * are where a mind is *at home*, and the reason is named for the player
 * (`reasonKey`) rather than scored. The same file also holds the seeded draw for
 * choosing the next *body* (see the second half, and systems/transition.js).
 */
const AKUSALA_PLANES = Object.freeze({
  anger: { realmId: 'niraya', reasonKey: 'rebirth.reason.anger' },
  greed: { realmId: 'peta', reasonKey: 'rebirth.reason.greed' },
  delusion: { realmId: 'tiracchana', reasonKey: 'rebirth.reason.delusion' },
  clinging: { realmId: 'asurakaya', reasonKey: 'rebirth.reason.clinging' },
});

/** Concentration (jhāna) lifts the mind: score → plane, strongest first. */
const JHANA_LADDER = Object.freeze([
  Object.freeze({ at: 18, realmId: 'nevasannanasannayatana', reasonKey: 'rebirth.reason.absorption' }),
  Object.freeze({ at: 14, realmId: 'vinnanancayatana', reasonKey: 'rebirth.reason.absorption' }),
  Object.freeze({ at: 10, realmId: 'akasanancayatana', reasonKey: 'rebirth.reason.absorption' }),
  Object.freeze({ at: 8, realmId: 'mahabrahma', reasonKey: 'rebirth.reason.jhana' }),
  Object.freeze({ at: 5, realmId: 'brahma-purohita', reasonKey: 'rebirth.reason.jhana' }),
  Object.freeze({ at: 3, realmId: 'brahma-parisajja', reasonKey: 'rebirth.reason.jhana' }),
]);

/** Metta (and the merit of giving) opens the planes of the devas, strongest first. */
const DEVAS_LADDER = Object.freeze([
  Object.freeze({ at: 8, realmId: 'paranimmita', reasonKey: 'rebirth.reason.metta' }),
  Object.freeze({ at: 7, realmId: 'nimmanarati', reasonKey: 'rebirth.reason.metta' }),
  Object.freeze({ at: 6, realmId: 'tusita', reasonKey: 'rebirth.reason.metta' }),
  Object.freeze({ at: 4, realmId: 'yama', reasonKey: 'rebirth.reason.metta' }),
  Object.freeze({ at: 3, realmId: 'tavatimsa', reasonKey: 'rebirth.reason.metta' }),
  Object.freeze({ at: 1, realmId: 'catumaharajika', reasonKey: 'rebirth.reason.metta' }),
]);

const DEFAULT_REALM_ID = 'manussa';

/** The strongest tendency and its score; a tendency can be negative (weakened). */
export function dominantTendency(tendencies = {}) {
  let key = null;
  let score = 0;
  for (const [name, value] of Object.entries(tendencies)) {
    if (!Number.isFinite(value) || value <= 0) continue;
    if (value > score) {
      key = name;
      score = value;
    }
  }
  return { key, score, akusala: AKUSALA_PLANES[key] !== undefined };
}

/** The strongest unwholesome tendency, whatever else is present. */
function strongestAkusala(tendencies = {}) {
  let key = null;
  let score = 0;
  for (const name of Object.keys(AKUSALA_PLANES)) {
    const value = tendencies[name];
    if (Number.isFinite(value) && value > score) {
      key = name;
      score = value;
    }
  }
  return { key, score };
}

function ladderPick(ladder, score) {
  for (const rung of ladder) if (score >= rung.at) return rung;
  return null;
}

/**
 * Which plane this kamma ripens into, and why.
 * @param {{ tendencies?: object, merit?: number, demerit?: number }} karma
 * @returns {{ realmId: string, reasonKey: string }}
 */
export function resolveRebirth(karma = {}) {
  const tendencies = karma.tendencies || {};
  const merit = Number.isFinite(karma.merit) ? karma.merit : 0;
  const wholesome = dominantTendencyWholesome(tendencies);
  const akusala = strongestAkusala(tendencies);

  // An unwholesome tendency decides only while it is the strongest thing in the
  // mind — and the roots of wholesome conduct are counted with it, so a life of
  // harm with a little greed in it still answers for the harm.
  if (akusala.key && akusala.score >= 1 && akusala.score > wholesome.score) {
    const plane = AKUSALA_PLANES[akusala.key];
    return { realmId: plane.realmId, reasonKey: plane.reasonKey };
  }

  // Concentration lifts the mind through the jhānas, whether or not much fruit was
  // ripened: the ladder is read from the tendency itself.
  if (wholesome.key === 'concentration') {
    const rung = ladderPick(JHANA_LADDER, wholesome.score);
    if (rung) return { realmId: rung.realmId, reasonKey: rung.reasonKey };
    return { realmId: DEFAULT_REALM_ID, reasonKey: 'rebirth.reason.smallMerit' };
  }

  // Metta and the merit of giving open the deva planes.
  if (wholesome.key === 'metta' || wholesome.key === 'generosity') {
    const rung = ladderPick(DEVAS_LADDER, Math.max(wholesome.score, Math.floor(merit / 10)));
    if (rung) return { realmId: rung.realmId, reasonKey: rung.reasonKey };
  }

  if (merit > 0 || wholesome.score > 0) {
    return { realmId: DEFAULT_REALM_ID, reasonKey: 'rebirth.reason.smallMerit' };
  }
  return { realmId: DEFAULT_REALM_ID, reasonKey: 'rebirth.reason.noRecord' };
}

/** The strongest wholesome tendency (metta, sati, generosity, concentration). */
function dominantTendencyWholesome(tendencies = {}) {
  let key = null;
  let score = 0;
  for (const name of ['concentration', 'metta', 'sati', 'generosity']) {
    const value = tendencies[name];
    if (Number.isFinite(value) && value > score) {
      key = name;
      score = value;
    }
  }
  return { key, score };
}

/** Every plane the resolver can name, for tests and for documentation. */
export function rebirthPlanes() {
  return {
    akusala: Object.values(AKUSALA_PLANES).map((plane) => plane.realmId),
    jhana: JHANA_LADDER.map((rung) => rung.realmId),
    devas: DEVAS_LADDER.map((rung) => rung.realmId),
    human: DEFAULT_REALM_ID,
  };
}

/** The reason keys this resolver can return (all of them live in src/locales). */
export function rebirthReasonKeys() {
  return [
    ...Object.values(AKUSALA_PLANES).map((plane) => plane.reasonKey),
    ...JHANA_LADDER.map((rung) => rung.reasonKey),
    ...DEVAS_LADDER.map((rung) => rung.reasonKey),
    'rebirth.reason.smallMerit',
    'rebirth.reason.noRecord',
  ];
}



/**
 * Drawing the next life (docs/rebirth-modes.md, docs/next-production-plan.md item 3).
 *
 * The choice of body is a *weighted seeded draw*, not a rotation: the same run
 * seed and the same history always give the same result, and the draw is made
 * once, when the life is reserved — so a reload, a skip, or a reopened summary
 * cannot re-roll it.
 *
 *   weight = base 1
 *          × freshness   never worn ×1.5, worn ×1
 *          × event fit   in this chapter's own pool ×1.2 (its events are solvable
 *                        by that body — every offered body passes tests/roster)
 *
 * The last two bodies are held out while other options remain, and when nothing
 * else remains they are drawn at ×0.2 rather than excluded. No body is ever chosen
 * because a player did badly: memory changes the story, never the worth of a form.
 *
 * All three modes are live: flow draws a body, choice offers three cards, and
 * explore waits for a compatible body from the animal book.
 */
export const REBIRTH_MODES = Object.freeze(['flow', 'choice', 'explore']);
const MODE_DEFAULT = 'flow';
const ALGORITHM_VERSION = 1;
export const REBIRTH_ALGORITHM_VERSION = ALGORITHM_VERSION;

const FRESH_BONUS = 1.5;
const EVENT_FIT = 1.2;
const REPEAT_PENALTY = 0.2;

function memory() {
  if (!state.rebirth) {
    state.rebirth = { mode: MODE_DEFAULT, runSeed: null, draws: 0, algorithmVersion: ALGORITHM_VERSION };
  }
  return state.rebirth;
}

export function rebirthMode() {
  return memory().mode;
}

/** Unknown modes fall back to the flow draw. */
export function setRebirthMode(mode) {
  memory().mode = REBIRTH_MODES.includes(mode) ? mode : MODE_DEFAULT;
  return memory().mode;
}

/**
 * The seed this run draws from. Set once per run; a save that has none derives one
 * from its run id, so an older save still gets a stable stream.
 */
export function runSeed() {
  const data = memory();
  if (!Number.isFinite(data.runSeed)) {
    data.runSeed = seedFrom(state.runId || `slot-${state.lifeLog.length}`);
  }
  return data.runSeed;
}

export function setRunSeed(seed) {
  memory().runSeed = Number.isFinite(seed) ? seed >>> 0 : null;
  return runSeed();
}

/** How many draws this run has made from its seed. */
export function drawCount() {
  return memory().draws;
}

export function resetRebirth(runId = state.runId || '') {
  state.rebirth = {
    mode: MODE_DEFAULT,
    runSeed: seedFrom(runId || 'run'),
    draws: 0,
    algorithmVersion: ALGORITHM_VERSION,
  };
  return state.rebirth;
}

/** What a chapter can carry: the union of its own pool's maps. */
export function chapterCapabilities(chapterId) {
  const pool = CHAPTER_ANIMALS[(chapterId - 1) % CHAPTER_ANIMALS.length] || [];
  const maps = new Set();
  for (const id of pool) for (const map of mapsFor(id)) maps.add(map);
  return maps.size ? [...maps] : ['land', 'water', 'burrow', 'air'];
}

/** Is this body one the life cycle may wear, and one this chapter can carry? */
export function formEligible(form, maps) {
  if (!form || form.rebirth !== true) return false;
  const formMaps = mapsFor(form.id);
  if (formMaps.length === 0) return false;
  return formMaps.some((map) => maps.includes(map));
}

/**
 * Every body the next life could wear in this chapter: the chapter's own pool
 * first (its events are known to be solvable by them), then any other rebirthable
 * body the chapter's maps can carry.
 */
export function eligibleForms(chapterId) {
  const maps = chapterCapabilities(chapterId);
  const pool = CHAPTER_ANIMALS[(chapterId - 1) % CHAPTER_ANIMALS.length] || [];
  const inPool = new Set(pool.filter((id) => {
    const form = FORMS.find((entry) => entry.id === id);
    return formEligible(form, maps);
  }));
  const others = FORMS.filter((form) => formEligible(form, maps) && !inPool.has(form.id)).map((form) => form.id);
  return { maps, pool: [...inPool], others, all: [...inPool, ...others] };
}

/**
 * The weight of one body, and why. Returned rather than hidden so the summary can
 * show real odds and the tests can reason about the formula.
 */
export function weighForm(formId, { chapterId, history = [] } = {}) {
  const { pool } = eligibleForms(chapterId);
  const worn = history.filter((id) => id === formId).length;
  const novelty = worn === 0 ? FRESH_BONUS : 1;
  const fit = pool.includes(formId) ? EVENT_FIT : 1;
  const recent = history.slice(-2);
  const held = recent.includes(formId) ? REPEAT_PENALTY : 1;
  return { formId, base: 1, novelty, fit, held, weight: 1 * novelty * fit * held };
}

/**
 * The draw itself: weighted, seeded, and stable. Returns the chosen body, the
 * weight it was drawn with, and the normalised odds of every option — the odds the
 * UI is allowed to show because they are the real ones.
 */
export function drawLife({ chapterId, history = [], index = null } = {}) {
  const { maps, all } = eligibleForms(chapterId);
  if (!all.length) {
    return { formId: null, maps, reason: 'no-eligible-form', weights: [], odds: [] };
  }
  const recent = history.slice(-2);
  let candidates = all.filter((id) => !recent.includes(id));
  if (!candidates.length) candidates = all; // nothing else left: drawn at a penalty
  const weights = candidates.map((id) => weighForm(id, { chapterId, history }));
  const total = weights.reduce((sum, entry) => sum + entry.weight, 0);
  const at = Number.isFinite(index) ? index : drawCount();
  const roll = hashUnit(runSeed(), at) * total;
  let cursor = 0;
  let chosen = weights[weights.length - 1];
  for (const entry of weights) {
    cursor += entry.weight;
    if (roll < cursor) { chosen = entry; break; }
  }
  const odds = weights.map((entry) => ({ formId: entry.formId, probability: entry.weight / total }));
  return {
    formId: chosen.formId,
    maps,
    reason: null,
    weight: chosen.weight,
    probability: chosen.weight / total,
    weights,
    odds,
  };
}

/**
 * Plan the next life with the draw (systems/life-route.js plans; this replaces the
 * rotation with the seeded one, and consumes one draw from the run's stream).
 */
export function drawNextLife({ chapter, lifeId, history = [], chapterIds, consume = true }) {
  const current = chapterIds.indexOf(chapter);
  const nextChapter = chapterIds[(current + 1) % chapterIds.length];
  const data = memory();
  const index = drawCount();
  // In choice mode the life is reserved as a *set*: three bodies, and whichever the
  // player picks. The first is only a placeholder until they choose.
  if (data.mode === 'choice') {
    const { candidates, maps, reason } = drawCandidates({ chapterId: nextChapter, history, index });
    if (consume) data.draws += 1;
    return {
      chapter: nextChapter,
      lifeId: lifeId + 1,
      formId: candidates.length ? candidates[0].formId : (history[history.length - 1] || 'human'),
      candidateIds: candidates.map((entry) => entry.formId),
      probabilities: Object.fromEntries(candidates.map((entry) => [entry.formId, entry.probability])),
      chosen: false,
      drawn: candidates.length > 0,
      reason,
      probability: candidates.length ? candidates[0].probability : null,
      maps,
    };
  }
  // Explore mode: the body is chosen from the book, so the reservation carries only
  // the chapter — and says so, so the summary offers the book instead of a draw.
  if (data.mode === 'explore') {
    if (consume) data.draws += 1;
    return {
      chapter: nextChapter,
      lifeId: lifeId + 1,
      formId: history[history.length - 1] || 'human',
      explore: true,
      chosen: false,
      drawn: false,
      reason: null,
      probability: null,
      maps: null,
    };
  }
  const draw = drawLife({ chapterId: nextChapter, history, index });
  if (consume) data.draws += 1;
  const formId = draw.formId || history[history.length - 1] || 'human';
  return {
    chapter: nextChapter,
    lifeId: lifeId + 1,
    formId,
    drawn: draw.formId !== null,
    reason: draw.reason,
    probability: draw.probability,
    maps: draw.maps,
  };
}

/**
 * Three bodies to choose from (the design's "ทางเลือกสามร่าง"), drawn without
 * replacement from the same weights, and *recorded* the moment the life is
 * reserved — so a reload shows the same three cards and never re-rolls them.
 *
 * Each card carries the chance that body had in the whole draw (not renormalised
 * among the three): the player is shown a real number or none.
 */
export function drawCandidates({ chapterId, history = [], index = null, count = 3 } = {}) {
  const { maps, all } = eligibleForms(chapterId);
  if (!all.length) return { candidates: [], maps, reason: 'no-eligible-form' };
  const recent = history.slice(-2);
  let pool = all.filter((id) => !recent.includes(id));
  if (!pool.length) pool = [...all];
  const weights = pool.map((id) => weighForm(id, { chapterId, history }));
  const total = weights.reduce((sum, entry) => sum + entry.weight, 0);
  const remaining = weights.map((entry) => ({ ...entry, probability: entry.weight / total }));
  const at = Number.isFinite(index) ? index : drawCount();
  const candidates = [];
  const pickCount = Math.min(count, remaining.length);
  for (let pick = 0; pick < pickCount; pick++) {
    const sum = remaining.reduce((acc, entry) => acc + entry.weight, 0);
    const roll = hashUnit(runSeed(), at + pick * 977) * sum;
    let cursor = 0;
    let chosen = remaining[remaining.length - 1];
    for (const entry of remaining) {
      cursor += entry.weight;
      if (roll < cursor) { chosen = entry; break; }
    }
    candidates.push({ formId: chosen.formId, probability: chosen.probability, weight: chosen.weight });
    remaining.splice(remaining.indexOf(chosen), 1);
  }
  return { candidates, maps, reason: null, poolSize: all.length };
}

/** The odds of one body in one chapter, for the summary and for tests. */
export function oddsFor(formId, { chapterId, history = [] } = {}) {
  const { all } = eligibleForms(chapterId);
  const recent = history.slice(-2);
  let candidates = all.filter((id) => !recent.includes(id));
  if (!candidates.length) candidates = all;
  const weights = candidates.map((id) => weighForm(id, { chapterId, history }));
  const total = weights.reduce((sum, entry) => sum + entry.weight, 0);
  const found = weights.find((entry) => entry.formId === formId);
  return found ? found.weight / total : 0;
}

/** What the summary shows as "chance": only ever the real number. */
export function lastDrawOdds() {
  const pending = state.transition?.next;
  if (!pending || typeof pending.probability !== 'number') return null;
  return pending.probability;
}

/** What goes into the save. */
export function exportRebirth() {
  const data = memory();
  return {
    mode: data.mode,
    runSeed: data.runSeed,
    draws: data.draws,
    algorithmVersion: data.algorithmVersion,
  };
}

/** Read it back: an unknown mode or algorithm falls back to the flow draw. */
export function importRebirth(raw) {
  const data = memory();
  if (!raw || typeof raw !== 'object') {
    data.mode = MODE_DEFAULT;
    data.algorithmVersion = ALGORITHM_VERSION;
    return false;
  }
  data.mode = REBIRTH_MODES.includes(raw.mode) ? raw.mode : MODE_DEFAULT;
  data.runSeed = Number.isFinite(raw.runSeed) ? raw.runSeed >>> 0 : null;
  data.draws = Number.isFinite(raw.draws) && raw.draws >= 0 ? Math.floor(raw.draws) : 0;
  data.algorithmVersion = ALGORITHM_VERSION;
  return raw.algorithmVersion === ALGORITHM_VERSION;
}
