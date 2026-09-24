'use strict';

import { GATE_OUT, MODE, PLAYER, SALA } from '../core/constants.js';
import { resetStoryFlags, state } from '../core/state.js';
import { floaters, screenNotes, sparks } from '../systems/effects.js';
import { $ } from '../ui/dom.js';
import { resetChoices } from '../ui/choices.js';
import { resetDialogue } from '../ui/dialogue.js';
import { resetGhost } from '../entities/ghost.js';
import { player } from '../entities/player.js';
import { cam } from './camera.js';
import { resetRelease } from './release.js';
import { getKarma } from '../systems/karma.js';
import { resolveRebirth } from '../systems/rebirth.js';
import { enterRealm } from '../systems/samsara.js';
import { evaluatePath } from '../systems/path.js';
import { evaluatePrecepts } from '../systems/precepts.js';
import { saveRun } from '../systems/save.js';

/**
 * Chapter catalogue. Everything scene-specific (start point, HUD meter label,
 * ghost tuning, end-screen copy) lives here so new chapters are data, not forks.
 */
export const CHAPTERS = [
  {
    id: 1,
    nameKey: 'chapter1.name',
    subtitleKey: 'chapter1.subtitle',
    meterKey: 'hud.fear',
    mindHintKey: 'hud.mind',
    start: { x: PLAYER.x, y: PLAYER.y },
    checkpoint: GATE_OUT,
    ghost: { mindDissolve: true, respawnOnFade: true },
    end: {
      titleKey: 'end.title',
      nameKey: 'end.name',
      lessonKey: 'end.lesson',
      statsKey: 'end.stats',
    },
  },
  {
    id: 2,
    nameKey: 'chapter2.name',    subtitleKey: 'chapter2.subtitle',
    meterKey: 'hud.agitation',
    mindHintKey: 'hud.mind.anger',
    start: { x: SALA.x - 60, y: SALA.y + 150 },
    checkpoint: { x: SALA.x - 60, y: SALA.y + 150 },
    ghost: {
      mindDissolve: true,
      respawnOnFade: false,
      tint: 'rgba(226,166,138,.55)',
      profile: {
        baseSpeed: 140,
        fearSpeedBonus: 120,
        mindSpeedBase: 55,
        mindSpeedFearBonus: 70,
        mindDissolveTime: 3.2,
        enrageSpeedFactor: 1.7,
      },
    },
    end: {
      titleKey: 'ch2.end.title',
      nameKey: 'ch2.end.name',
      lessonKey: 'ch2.end.lesson',
      statsKey: 'ch2.end.stats',
    },
  },
  {
    id: 3,
    nameKey: 'chapter3.name',
    subtitleKey: 'chapter3.subtitle',
    meterKey: 'hud.craving',
    mindHintKey: 'hud.mind.craving',
    start: { x: GATE_OUT.x + 40, y: GATE_OUT.y },
    checkpoint: GATE_OUT,
    ghost: {
      mindDissolve: true,
      respawnOnFade: false,
      tint: 'rgba(232,196,106,.55)',
      profile: {
        baseSpeed: 130,
        fearSpeedBonus: 90,
        mindSpeedBase: 50,
        mindSpeedFearBonus: 55,
        mindDissolveTime: 3.0,
        enrageSpeedFactor: 1.5,
      },
    },
    end: {
      titleKey: 'ch3.end.title',
      nameKey: 'ch3.end.name',
      lessonKey: 'ch3.end.lesson',
      statsKey: 'ch3.end.stats',
    },
  },
  {
    id: 4,
    nameKey: 'chapter4.name',
    subtitleKey: 'chapter4.subtitle',
    meterKey: 'hud.clinging',
    mindHintKey: 'hud.mind.clinging',
    start: { x: SALA.x - 60, y: SALA.y + 150 },
    checkpoint: { x: SALA.x - 60, y: SALA.y + 150 },
    ghost: {
      mindDissolve: false,
      respawnOnFade: false,
      tint: 'rgba(226,214,240,.55)',
      profile: {
        baseSpeed: 92,
        fearSpeedBonus: 40,
        mindSpeedBase: 60,
        mindSpeedFearBonus: 30,
        mindDissolveTime: 99,
        enrageSpeedFactor: 1.2,
        standOff: 190,
      },
    },
    end: {
      titleKey: 'ch4.end.title',
      nameKey: 'ch4.end.name',
      lessonKey: 'ch4.end.lesson',
      statsKey: 'ch4.end.stats',
    },
  },
  {
    id: 5,
    nameKey: 'chapter5.name',
    subtitleKey: 'chapter5.subtitle',
    meterKey: 'hud.self',
    mindHintKey: 'hud.mind.self',
    start: { x: PLAYER.x, y: PLAYER.y },
    checkpoint: GATE_OUT,
    ghost: {
      mindDissolve: true,
      respawnOnFade: false,
      tint: 'rgba(150,150,178,.5)',
      profile: {
        baseSpeed: 118,
        fearSpeedBonus: 70,
        mindSpeedBase: 55,
        mindSpeedFearBonus: 45,
        mindDissolveTime: 2.6,
        enrageSpeedFactor: 1.4,
        standOff: 0,
      },
    },
    end: {
      titleKey: 'ch5.end.title',
      nameKey: 'ch5.end.name',
      lessonKey: 'ch5.end.lesson',
      statsKey: 'ch5.end.stats',
    },
  },
  {
    id: 6,
    nameKey: 'chapter6.name',
    subtitleKey: 'chapter6.subtitle',
    meterKey: 'hud.suffering',
    mindHintKey: 'hud.mind.wheel',
    start: { x: GATE_OUT.x + 40, y: GATE_OUT.y },
    checkpoint: GATE_OUT,
    ghost: {
      mindDissolve: false,
      respawnOnFade: false,
      tint: 'rgba(200,180,200,.5)',
      profile: {
        baseSpeed: 150,
        fearSpeedBonus: 130,
        mindSpeedBase: 60,
        mindSpeedFearBonus: 60,
        mindDissolveTime: 3.2,
        enrageSpeedFactor: 1.5,
        standOff: 0,
      },
    },
    end: {
      titleKey: 'ch6.end.title',
      nameKey: 'ch6.end.name',
      lessonKey: 'ch6.end.lesson',
      statsKey: 'ch6.end.stats',
    },
  },
  {
    id: 7,
    nameKey: 'chapter7.name',
    subtitleKey: 'chapter7.subtitle',
    meterKey: 'hud.path',
    mindHintKey: 'hud.mind.wheel',
    start: { x: SALA.x - 60, y: SALA.y + 150 },
    checkpoint: { x: SALA.x - 60, y: SALA.y + 150 },
    ghost: { mindDissolve: false, respawnOnFade: false, tint: null },
    end: {
      titleKey: 'ch7.end.title',
      nameKey: 'ch7.end.name',
      lessonKey: 'ch7.end.lesson',
      statsKey: 'ch7.end.stats',
    },
  },
  {
    id: 8,
    nameKey: 'chapter8.name',
    subtitleKey: 'chapter8.subtitle',
    meterKey: 'hud.mirror',
    mindHintKey: 'hud.mind.mirror',
    start: { x: GATE_OUT.x + 40, y: GATE_OUT.y },
    checkpoint: GATE_OUT,
    ghost: {
      mindDissolve: true,
      respawnOnFade: false,
      tint: 'rgba(180,190,210,.5)',
      profile: {
        baseSpeed: 130,
        fearSpeedBonus: 100,
        mindSpeedBase: 55,
        mindSpeedFearBonus: 50,
        mindDissolveTime: 3.0,
        enrageSpeedFactor: 1.5,
        standOff: 0,
      },
    },
    end: {
      titleKey: 'ch8.end.title',
      nameKey: 'ch8.end.name',
      lessonKey: 'ch8.end.lesson',
      statsKey: 'ch8.end.stats',
    },
  },
  {
    id: 9,
    nameKey: 'chapter9.name',
    subtitleKey: 'chapter9.subtitle',
    meterKey: 'hud.tendency',
    mindHintKey: 'hud.mind.tendency',
    start: { x: GATE_OUT.x + 40, y: GATE_OUT.y },
    checkpoint: GATE_OUT,
    ghost: {
      mindDissolve: true,
      respawnOnFade: false,
      tint: 'rgba(170,160,190,.5)',
      profile: {
        baseSpeed: 150,
        fearSpeedBonus: 40,
        mindSpeedBase: 70,
        mindSpeedFearBonus: 20,
        mindDissolveTime: 3.0,
        enrageSpeedFactor: 1.3,
        standOff: 0,
        replay: true,
      },
    },
    end: {
      titleKey: 'ch9.end.title',
      nameKey: 'ch9.end.name',
      lessonKey: 'ch9.end.lesson',
      statsKey: 'ch9.end.stats',
    },
  },
  {
    id: 10,
    nameKey: 'chapter10.name',
    subtitleKey: 'chapter10.subtitle',
    meterKey: 'hud.rep',
    mindHintKey: 'hud.mind.rep',
    start: { x: GATE_OUT.x + 40, y: GATE_OUT.y },
    checkpoint: GATE_OUT,
    ghost: {
      mindDissolve: true,
      respawnOnFade: false,
      tint: 'rgba(190,150,170,.55)',
      profile: {
        baseSpeed: 120,
        fearSpeedBonus: 50,
        mindSpeedBase: 55,
        mindSpeedFearBonus: 30,
        mindDissolveTime: 3.2,
        enrageSpeedFactor: 1.4,
        standOff: 0,
        replay: false,
      },
    },
    end: {
      titleKey: 'ch10.end.title',
      nameKey: 'ch10.end.name',
      lessonKey: 'ch10.end.lesson',
      statsKey: 'ch10.end.stats',
    },
  },
  {
    id: 11,
    nameKey: 'chapter11.name',
    subtitleKey: 'chapter11.subtitle',
    meterKey: 'hud.pair',
    mindHintKey: 'hud.mind.pair',
    start: { x: GATE_OUT.x + 40, y: GATE_OUT.y },
    checkpoint: GATE_OUT,
    ghost: {
      mindDissolve: true,
      respawnOnFade: false,
      tint: 'rgba(200,170,190,.55)',
      profile: {
        baseSpeed: 138,
        fearSpeedBonus: 70,
        mindSpeedBase: 55,
        mindSpeedFearBonus: 40,
        mindDissolveTime: 3.0,
        enrageSpeedFactor: 1.4,
        standOff: 0,
        replay: false,
      },
    },
    end: {
      titleKey: 'ch11.end.title',
      nameKey: 'ch11.end.name',
      lessonKey: 'ch11.end.lesson',
      statsKey: 'ch11.end.stats',
    },
  },
  {
    id: 12,
    nameKey: 'chapter12.name',
    subtitleKey: 'chapter12.subtitle',
    meterKey: 'hud.swarm',
    mindHintKey: 'hud.mind.swarm',
    start: { x: GATE_OUT.x + 40, y: GATE_OUT.y },
    checkpoint: GATE_OUT,
    ghost: {
      mindDissolve: false,
      respawnOnFade: false,
      tint: 'rgba(180,180,200,.5)',
      profile: {
        baseSpeed: 126,
        fearSpeedBonus: 45,
        mindSpeedBase: 62,
        mindSpeedFearBonus: 30,
        mindDissolveTime: 99,
        enrageSpeedFactor: 1.2,
        standOff: 0,
        replay: false,
      },
    },
    end: {
      titleKey: 'ch12.end.title',
      nameKey: 'ch12.end.name',
      lessonKey: 'ch12.end.lesson',
      statsKey: 'ch12.end.stats',
    },
  },
  {
    id: 13,
    nameKey: 'chapter13.name',
    subtitleKey: 'chapter13.subtitle',
    meterKey: 'hud.allshadows',
    mindHintKey: 'hud.mind.allshadows',
    start: { x: GATE_OUT.x + 40, y: GATE_OUT.y },
    checkpoint: GATE_OUT,
    ghost: {
      mindDissolve: false,
      respawnOnFade: false,
      tint: 'rgba(175,165,195,.5)',
      profile: {
        baseSpeed: 120,
        fearSpeedBonus: 50,
        mindSpeedBase: 60,
        mindSpeedFearBonus: 30,
        mindDissolveTime: 99,
        enrageSpeedFactor: 1.25,
        standOff: 0,
        replay: false,
      },
    },
    end: {
      titleKey: 'ch13.end.title',
      nameKey: 'ch13.end.name',
      lessonKey: 'ch13.end.lesson',
      statsKey: 'ch13.end.stats',
    },
  },
];

const handlers = new Map();

/** Story modules register their `{ start, update }` handler for a chapter. */
export function registerChapterHandler(id, handler) {
  handlers.set(id, handler);
}

export function chapterById(id) {
  return CHAPTERS.find((chapter) => chapter.id === id) || null;
}

export function chapterCount() {
  return CHAPTERS.length;
}

export function nextChapterId(id) {
  const index = CHAPTERS.findIndex((chapter) => chapter.id === id);
  if (index < 0 || index >= CHAPTERS.length - 1) return null;
  return CHAPTERS[index + 1].id;
}

/** Reset run state and enter a chapter in the world scene. */
export function loadChapter(id, { autosave = true } = {}) {
  const def = chapterById(id);
  if (!def) return false;

  state.chapter = id;
  state.meterKey = def.meterKey || 'hud.fear';
  state.mindHintKey = def.mindHintKey || 'hud.mind';
  state.fear = 0;
  state.interact = null;
  state.luresVisible = false;
  state.liberated = false;
  state.dialogueOpen = false;
  state.choiceOpen = false;
  state.checkpoint = { ...(def.checkpoint || def.start) };
  state.stats = {
    caught: 0, lost: 0, time: 0, retaliations: 0, looted: 0, clung: 0, selfish: 0, reps: 0,
  };
  resetStoryFlags();
  resetGhost(def.ghost || {});
  resetRelease();
  // You are reborn into this chapter in the plane your kamma has earned.
  enterRealm(resolveRebirth(getKarma()).realmId);
  // Conduct so far may have opened further factors of the path.
  evaluatePath();
  evaluatePrecepts();

  player.x = def.start.x;
  player.y = def.start.y;
  player.face = 1;
  player.moving = false;
  player.bob = 0;
  cam.x = player.x;
  cam.y = player.y;
  cam.shake = 0;

  floaters.length = 0;
  sparks.length = 0;
  screenNotes.length = 0;

  resetDialogue();
  resetChoices();
  $('#titleScreen').classList.add('hidden');
  $('#endScreen').classList.add('hidden');
  $('#medOverlay').classList.add('hidden');
  $('#memOverlay').classList.add('hidden');
  $('#disturbCard').classList.add('hidden');
  $('#hud').classList.remove('hidden');
  $('#ctrlHint').classList.remove('hidden');

  state.mode = MODE.WORLD;

  const handler = handlers.get(id);
  if (handler && handler.start) handler.start(def);

  // Autosave at every chapter start so a run can be continued later.
  if (autosave) saveRun();
  return true;
}

/** Run the active chapter's per-frame story logic. */
export function updateChapter(dt) {
  const handler = handlers.get(state.chapter);
  if (handler && handler.update) handler.update(dt);
}
