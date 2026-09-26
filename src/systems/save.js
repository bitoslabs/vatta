'use strict';

import { exportReflections, importReflections } from './reflections.js';
import { state } from '../core/state.js';
import { exportKarma, importKarma } from './karma.js';
import { exportTransition, importTransition } from './transition.js';
import { completeLeavings } from './world-effects.js';
import { exportRebirth, importRebirth } from './rebirth.js';
import { exportEchoes, importEchoes } from './karma-memory.js';
import { exportPath, importPath } from './path.js';
import { exportPrecepts, importPrecepts } from './precepts.js';
import { sanitiseEffects } from './world-effects.js';
import { resetChicken } from '../game/burrow.js';
import { resetRain } from '../game/ant.js';
import { resetFishBird } from '../game/fish.js';
import { resetDryMarsh } from '../game/frog.js';
import { resetDeerHazard } from '../game/deer.js';
import { exportDrift, importDrift } from './drift.js';
import { BLOOMS, FIELD, GROVE, HOMES, OWL, SEEDS, TRAIL } from '../world/world-data.js';

const VERSION = 1;
const SLOTS = 3;
const ACTIVE_KEY = 'vimutti.save.active';
const slotKey = (slot) => `vimutti.save.s${slot}`;

let activeSlot = 1;

function emptyStats() {
  return { caught: 0, lost: 0, time: 0, retaliations: 0, looted: 0, clung: 0, selfish: 0, reps: 0 };
}

export function slotCount() {
  return SLOTS;
}

function validSlot(slot) {
  return Number.isInteger(slot) && slot >= 1 && slot <= SLOTS;
}

/** Restore which slot is active (defaults to 1). */
export function initSave() {
  let stored = null;
  try {
    stored = localStorage.getItem(ACTIVE_KEY);
  } catch {
    stored = null;
  }
  const slot = Number.parseInt(stored, 10);
  activeSlot = validSlot(slot) ? slot : 1;
}

export function getActiveSlot() {
  return activeSlot;
}

export function setActiveSlot(slot) {
  if (!validSlot(slot)) return false;
  activeSlot = slot;
  try {
    localStorage.setItem(ACTIVE_KEY, String(slot));
  } catch {
    /* storage may be unavailable — the slot still applies for this session */
  }
  return true;
}

export function snapshot() {
  return {
    v: VERSION,
    savedAt: Date.now(),
    chapter: state.chapter,
    name: state.runName || '',
    realmId: state.realmId,
    lifeMode: state.lifeMode === true,
    lifeId: state.lifeId,
    formId: state.formId,
    formHistory: [...state.formHistory],
    lifeLog: state.lifeLog.map((entry) => ({ ...entry })),
    world: {
      ...state.world,
      removed: Array.isArray(state.world.removed) ? [...state.world.removed] : [],
      crushed: Array.isArray(state.world.crushed) ? [...state.world.crushed] : [],
      snags: Array.isArray(state.world.snags) ? [...state.world.snags] : [],
      planks: Array.isArray(state.world.planks) ? state.world.planks.map((p) => ({ ...p })) : [],
      effects: sanitiseEffects(state.world.effects),
    },
    frog: {
      decided: state.frog?.decided === true,
      opened: state.frog?.opened === true,
    },
    crab: {
      reached: state.crab?.reached === true,
      decided: state.crab?.decided === true,
      kept: state.crab?.decided === true && state.crab?.kept === true,
    },
    rabbit: {
      connected: Object.fromEntries(FIELD.warrens.filter((warren) => state.rabbit?.connected?.[warren.id] === true).map((warren) => [warren.id, true])),
      decided: state.rabbit?.decided === true,
      shared: state.rabbit?.decided === true && state.rabbit?.shared === true,
    },
    snail: {
      decided: state.snail?.decided === true,
      leftTrail: state.snail?.decided === true && state.snail?.leftTrail === true,
    },
    bat: {
      found: state.bat?.found === true,
      decided: state.bat?.decided === true,
      taught: state.bat?.decided === true && state.bat?.taught === true,
    },
    bee: {
      visited: BLOOMS.flowers.map((_, index) => index).filter((index) => state.bee?.visited?.includes(index)),
      decided: state.bee?.decided === true,
      shared: state.bee?.decided === true && state.bee?.shared === true,
    },
    snake: {
      decided: state.snake?.decided === true,
      widened: state.snake?.decided === true && state.snake?.widened === true,
    },
    squirrel: {
      picked: SEEDS.canopies.map((_, index) => index).filter((index) => state.squirrel?.picked?.includes(index)),
      decided: state.squirrel?.decided === true,
      scattered: state.squirrel?.decided === true && state.squirrel?.scattered === true,
    },
    otter: {
      decided: state.otter?.decided === true,
      tended: state.otter?.decided === true && state.otter?.tended === true,
    },
    drift: exportDrift(),
    elephant: {
      lifted: state.elephant?.lifted === true,
      crushed: GROVE.nests.filter((nest) => state.elephant?.crushed?.includes(nest.id)).map((nest) => nest.id),
    },
    boar: {
      eaten: Number.isInteger(state.boar?.eaten) ? Math.max(0, state.boar.eaten) : 0,
      aware: state.boar?.aware === true,
      decided: state.boar?.decided === true,
      tended: state.boar?.decided === true && state.boar?.tended === true,
    },
    cat: {
      visited: HOMES.filter((home) => state.cat?.visited?.includes(home.id)).map((home) => home.id),
      peeked: HOMES.filter((home) => state.cat?.peeked?.includes(home.id)).map((home) => home.id),
      rummaged: HOMES.filter((home) => state.cat?.rummaged?.includes(home.id)).map((home) => home.id),
      decided: state.cat?.decided === true,
    },
    tiger: {
      step: Number.isInteger(state.tiger?.step) ? Math.max(0, Math.min(TRAIL.tracks.length, state.tiger.step)) : 0,
      decided: state.tiger?.decided === true,
      avoided: state.tiger?.decided === true && state.tiger?.avoided === true,
    },
    owl: {
      found: Object.fromEntries(OWL.lost.filter((lost) => state.owl?.found?.[lost.id] === true).map((lost) => [lost.id, true])),
      decided: state.owl?.decided === true,
      watched: state.owl?.decided === true && state.owl?.watched === true,
    },
    buffalo: {
      hauled: state.buffalo?.hauled === true,
      decided: state.buffalo?.decided === true,
      fetched: state.buffalo?.decided === true && state.buffalo?.fetched === true,
    },
    beetle: { pushed: state.beetle?.pushed === true, seated: state.beetle?.seated === true },
    spider: { spun: state.spider?.spun === true },
    gecko: { opened: state.gecko?.opened === true },
    firefly: { signalled: state.firefly?.signalled === true },
    garden: { released: state.garden?.released === true },
    asuraCity: {
      decided: state.asuraCity?.decided === true,
      spanned: state.asuraCity?.decided === true && state.asuraCity?.spanned === true,
    },
    market: {
      carried: Array.isArray(state.market?.carried) ? state.market.carried.filter((key) => typeof key === 'string') : [],
      takenAt: Array.isArray(state.market?.takenAt) ? state.market.takenAt.filter((key) => typeof key === 'string') : [],
      touched: state.market?.touched === true,
      passed: state.market?.passed === true,
    },
    ant: {
      carrying: state.ant?.carrying === true,
      shared: state.ant?.shared === true,
      drainDecided: state.ant?.drainDecided === true,
    },
    fish: {
      decided: state.fish?.decided === true,
      guided: state.fish?.guided === true,
    },
    deer: {
      decided: state.deer?.decided === true,
      waited: state.deer?.waited === true,
    },
    liberated: state.liberated,
    finalChoice: state.finalChoice === 'continue' || state.finalChoice === 'free' ? state.finalChoice : null,
    journeyComplete: state.journeyComplete === true,
    // A life that is mid-ending carries its reservation, so a reload resumes the
    // life that was always going to happen (systems/transition.js).
    transition: exportTransition(),
    runId: state.runId || '',
    // The rebirth draw's own stream: mode, seed and how many draws have been made.
    rebirth: exportRebirth(),
    stats: { ...state.stats },
    karma: exportKarma(),
    reflections: exportReflections(),
    path: exportPath(),
    precepts: exportPrecepts(),
    echoes: exportEchoes(),
  };
}

export function saveRun(slot = activeSlot) {
  if (!validSlot(slot)) return false;
  // Exploring a body writes nothing: the animal book is a separate thing from a
  // journey (systems/explore.js).
  if (state.explore?.active === true) return false;
  try {
    localStorage.setItem(slotKey(slot), JSON.stringify(snapshot()));
    return true;
  } catch {
    return false;
  }
}

/** Read + validate a stored slot, or null when absent/corrupt/incompatible. */
export function readSave(slot = activeSlot) {
  if (!validSlot(slot)) return null;
  try {
    const raw = localStorage.getItem(slotKey(slot));
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.v !== VERSION || typeof data.chapter !== 'number') return null;
    // Chapter 7 used to set liberation before chapters 8–14 existed. Resume
    // those runs at the chapter entrance so they can reach the actual finale.
    if (data.chapter === 7 && data.lifeMode === true) {
      data.liberated = false;
      data.journeyComplete = false;
    }
    return data;
  } catch {
    return null;
  }
}

export function hasSave(slot = activeSlot) {
  return readSave(slot) !== null;
}

export function clearSave(slot = activeSlot) {
  if (!validSlot(slot)) return;
  try {
    localStorage.removeItem(slotKey(slot));
  } catch {
    /* storage may be unavailable — nothing to clear */
  }
}

/** Name the current run, and persist it if the active slot already holds a save. */
export function setRunName(name) {
  state.runName = String(name || '').slice(0, 24);
  if (hasSave()) saveRun();
  return state.runName;
}

export function getRunName() {
  return state.runName || '';
}

/** Every slot with a light summary, for the title screen's slot list. */
export function listSaves() {
  const slots = [];
  for (let slot = 1; slot <= SLOTS; slot++) {
    const data = readSave(slot);
    slots.push({
      slot,
      filled: data !== null,
      chapter: data ? data.chapter : null,
      name: data && typeof data.name === 'string' ? data.name : '',
      savedAt: data ? data.savedAt : null,
      merit: data && data.karma ? data.karma.merit : 0,
      demerit: data && data.karma ? data.karma.demerit : 0,
      liberated: Boolean(data && data.liberated),
    });
  }
  return slots;
}

/**
 * Apply the parts that must exist *before* a chapter loads, so the chapter
 * derives its plane, path and precepts from the restored conduct.
 */
export function applySaveMeta(data) {
  if (!data) return false;
  importKarma(data.karma);
  importPath(data.path);
  importPrecepts(data.precepts);
  importEchoes(data.echoes);
  return true;
}

/** Apply the parts that loadChapter resets (chapter, stats, realm, liberation). */
export function applySaveRuntime(data) {
  if (!data) return;
  // Saves resume at the chapter entrance, so a half-finished peck must not
  // follow the worm from its previous position.
  resetChicken();
  importReflections(data.reflections);
  if (typeof data.chapter === 'number') state.chapter = data.chapter;
  state.runName = typeof data.name === 'string' ? data.name : '';
  state.stats = { ...emptyStats(), ...(data.stats || {}) };
  if (typeof data.realmId === 'string') state.realmId = data.realmId;
  state.lifeMode = Boolean(data.lifeMode);
  state.lifeId = Number(data.lifeId) || 1;
  if (typeof data.formId === 'string') state.formId = data.formId;
  state.formHistory = Array.isArray(data.formHistory) ? [...data.formHistory] : [];
  state.lifeLog = Array.isArray(data.lifeLog) ? data.lifeLog.map((entry) => ({ ...entry })) : [];
  state.world = {
    bridge: false,
    cleared: false,
    removed: [],
    crushed: [],
    snags: [],
    planks: [],
    ...(data.world || {}),
  };
  state.world.removed = Array.isArray(state.world.removed)
    ? state.world.removed.filter((key) => typeof key === 'string' && /^[a-z-]+:[a-z-]+:-?\d+,-?\d+$/.test(key))
    : [];
  state.world.crushed = Array.isArray(state.world.crushed) ? state.world.crushed.filter((id) => typeof id === 'string') : [];
  state.world.snags = Array.isArray(state.world.snags)
    ? state.world.snags.filter((id) => typeof id === 'string')
    : [];
  state.world.planks = Array.isArray(state.world.planks)
    ? state.world.planks.filter((plank) => Number.isFinite(plank?.x) && Number.isFinite(plank?.y))
    : [];
  state.world.effects = sanitiseEffects(data.world && data.world.effects);
  state.world.leavings = completeLeavings(data.world && data.world.leavings, state.world.effects);
  state.frog = {
    decided: data.frog?.decided === true,
    opened: data.frog?.decided === true && data.frog?.opened === true,
    eggsAsked: false,
  };
  state.crab = {
    reached: data.crab?.reached === true,
    decided: data.crab?.decided === true,
    kept: data.crab?.decided === true && data.crab?.kept === true,
  };
  state.rabbit = {
    connected: Object.fromEntries(FIELD.warrens.filter((warren) => data.rabbit?.connected?.[warren.id] === true).map((warren) => [warren.id, true])),
    decided: data.rabbit?.decided === true,
    shared: data.rabbit?.decided === true && data.rabbit?.shared === true,
  };
  state.snail = {
    decided: data.snail?.decided === true,
    leftTrail: data.snail?.decided === true && data.snail?.leftTrail === true,
  };
  state.bat = {
    found: data.bat?.found === true || data.bat?.decided === true,
    decided: data.bat?.decided === true,
    taught: data.bat?.decided === true && data.bat?.taught === true,
  };
  state.bee = {
    visited: BLOOMS.flowers.map((_, index) => index).filter((index) => data.bee?.visited?.includes(index)),
    decided: data.bee?.decided === true,
    shared: data.bee?.decided === true && data.bee?.shared === true,
  };
  state.snake = {
    decided: data.snake?.decided === true,
    widened: data.snake?.decided === true && data.snake?.widened === true,
  };
  const pickedCrowns = SEEDS.canopies.map((_, index) => index).filter((index) => data.squirrel?.picked?.includes(index));
  state.squirrel = {
    picked: pickedCrowns,
    seeds: pickedCrowns.length,
    decided: data.squirrel?.decided === true,
    scattered: data.squirrel?.decided === true && data.squirrel?.scattered === true,
  };
  state.otter = {
    decided: data.otter?.decided === true,
    tended: data.otter?.decided === true && data.otter?.tended === true,
  };
  importDrift(data.drift);
  state.elephant = {
    lifted: data.elephant?.lifted === true,
    crushed: GROVE.nests.filter((nest) => data.elephant?.crushed?.includes(nest.id)).map((nest) => nest.id),
  };
  state.boar = {
    eaten: Number.isInteger(data.boar?.eaten) ? Math.max(0, data.boar.eaten) : 0,
    aware: data.boar?.aware === true,
    decided: data.boar?.decided === true,
    tended: data.boar?.decided === true && data.boar?.tended === true,
  };
  const visitedHomes = HOMES.filter((home) => data.cat?.visited?.includes(home.id)).map((home) => home.id);
  state.cat = {
    visited: visitedHomes,
    peeked: HOMES.filter((home) => visitedHomes.includes(home.id) && data.cat?.peeked?.includes(home.id)).map((home) => home.id),
    rummaged: HOMES.filter((home) => visitedHomes.includes(home.id) && data.cat?.rummaged?.includes(home.id)).map((home) => home.id),
    decided: data.cat?.decided === true,
  };
  state.tiger = {
    step: Number.isInteger(data.tiger?.step) ? Math.max(0, Math.min(TRAIL.tracks.length, data.tiger.step)) : 0,
    decided: data.tiger?.decided === true,
    avoided: data.tiger?.decided === true && data.tiger?.avoided === true,
  };
  state.owl = {
    found: Object.fromEntries(OWL.lost.filter((lost) => data.owl?.found?.[lost.id] === true).map((lost) => [lost.id, true])),
    decided: data.owl?.decided === true,
    watched: data.owl?.decided === true && data.owl?.watched === true,
  };
  state.buffalo = {
    hauled: data.buffalo?.hauled === true,
    decided: data.buffalo?.decided === true,
    fetched: data.buffalo?.decided === true && data.buffalo?.fetched === true,
  };
  state.beetle = { pushed: data.beetle?.pushed === true, seated: data.beetle?.seated === true };
  state.spider = { spun: data.spider?.spun === true };
  state.gecko = { opened: data.gecko?.opened === true };
  state.firefly = { signalled: data.firefly?.signalled === true };
  state.garden = { released: data.garden?.released === true };
  state.asuraCity = {
    decided: data.asuraCity?.decided === true,
    spanned: data.asuraCity?.decided === true && data.asuraCity?.spanned === true,
  };
  const takenAt = Array.isArray(data.market?.takenAt)
    ? [...new Set(data.market.takenAt.filter((key) => typeof key === 'string' && /^-?\d+,-?\d+$/.test(key)))]
    : [];
  state.market = {
    takenAt,
    carried: Array.isArray(data.market?.carried) ? data.market.carried.filter((key) => takenAt.includes(key)) : [],
    touched: data.market?.touched === true || takenAt.length > 0,
    passed: data.market?.passed === true,
  };
  state.ant = {
    carrying: data.ant?.carrying === true,
    shared: data.ant?.carrying === true && data.ant?.shared === true,
    drainDecided: data.ant?.drainDecided === true,
  };
  state.fish = {
    decided: data.fish?.decided === true,
    guided: data.fish?.decided === true && data.fish?.guided === true,
  };
  state.deer = {
    decided: data.deer?.decided === true,
    waited: data.deer?.decided === true && data.deer?.waited === true,
  };
  // Rain inherits the drained channel from the restored world.
  resetRain();
  resetFishBird();
  resetDryMarsh();
  resetDeerHazard();
  state.liberated = Boolean(data.liberated) && !(data.chapter === 7 && data.lifeMode === true);
  state.finalChoice = data.finalChoice === 'continue' || data.finalChoice === 'free' ? data.finalChoice : null;
  state.journeyComplete = Boolean(data.journeyComplete) && !(data.chapter === 7 && data.lifeMode === true);
  state.runId = typeof data.runId === 'string' ? data.runId : (state.runId || '');
  importRebirth(data.rebirth);
  importTransition(data.transition);
}
