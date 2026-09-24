'use strict';

import { MODE } from '../core/constants.js';
import { dist } from '../core/math.js';
import { state } from '../core/state.js';
import { addFloater } from '../systems/effects.js';
import { t } from '../systems/i18n.js';
import { recordKarma } from '../systems/karma.js';
import { player } from '../entities/player.js';
import { choose } from '../ui/choices.js';

/**
 * เปรตแห่งภาชนะรั่ว (design §6) — a roadside being whose bowl always leaks.
 *
 * It is not a monster to defeat: filling the bowl never ends the hunger. The
 * player may keep giving, or sit and observe the cause; the world answers each
 * without judging.
 */
export const PETA = Object.freeze({ x: 2000, y: 1290, r: 115 });

export function updatePeta() {
  if (state.mode !== MODE.WORLD) return;
  if (state.dialogueOpen || state.choiceOpen) return;
  if (state.interact) return; // chapters, the guardian and the bridge come first
  if (dist(player.x, player.y, PETA.x, PETA.y) >= PETA.r) return;

  state.interact = { fn: talkToPeta, labelKey: 'prompt.talkPeta' };
}

function talkToPeta() {
  choose(
    [
      { t: t('peta.choice.give') },
      { t: t('peta.choice.observe') },
    ],
    (index) => {
      if (index === 0) {
        recordKarma('give');
        addFloater(player.x, player.y - 130, t('peta.answer.give'), '#d9c58c', 15);
      } else {
        recordKarma('mindful');
        addFloater(player.x, player.y - 130, t('peta.answer.observe'), '#bfd9cd', 15);
      }
    },
  );
}
