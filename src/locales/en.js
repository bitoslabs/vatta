'use strict';

import karmaStrings from './karma.en.js';
import realmStrings from './realms.en.js';

export default {
  code: 'en',
  label: 'English',
  htmlLang: 'en',
  strings: {
    ...realmStrings,
    ...karmaStrings,
    'app.title': 'Vimutti — The Forest Call',

    'title.name': 'Vimutti',
    'title.subtitle': 'The Forest Call — Chapter One',
    'title.tagline': 'The night the rain had just stopped, something called from the far edge of the forest.<br>The ghost chasing us was never behind… it was inside.<br>Surviving is not enough — you must know what you are running from.',
    'title.keys.move': 'Move',
    'title.keys.run': 'Run',
    'title.keys.mind': 'Hold = mindfulness',
    'title.keys.act': 'Interact',
    'title.start': 'Begin the practice',
    'title.note': 'Headphones recommended · Press M to mute',
    'title.language': 'Language',

    'hud.fear': 'M I N D',
    'hud.controls': 'WASD move · SHIFT run · SPACE hold for mindfulness · E interact · M sound',

    'dialogue.next': 'Click to continue',

    'meditation.label': 'M E D I T A T I O N',
    'meditation.quote': 'Know that you are breathing in · Know that you are breathing out',
    'meditation.start': 'Hold — breathe in',
    'meditation.disturbHint': 'Press X — push it away',
    'meditation.inhale': 'Breathe in — hold… release when the circle touches the outer ring',
    'meditation.exhale': 'Breathe out… when the circle shrinks to the inner ring, hold again',
    'meditation.chaseAway': 'The more you push… the more it returns',
    'meditation.goodBreath': 'Aware of the breath… good',
    'meditation.notFull': 'Not yet full… return to the breath',
    'meditation.held': 'Held too long… let it be',
    'meditation.rushed': 'Too rushed… feel the breath first, then press',

    'end.title': 'Chapter One Complete',
    'end.name': 'The Forest Call',
    'end.lesson': '<span style="color:#d9c58c">Right Mindfulness</span> — amid fear, know the body, know the mind, know the breath<br><br><span style="color:#d9c58c">Impermanence</span> — you can love without holding on forever',
    'end.restart': 'Practice again',
    'end.stats': 'Swallowed by fear {caught} times · Lost to light gates {lost} times<br>Practice time {time}',

    'touch.run': 'Run',
    'touch.sati': 'Mind<br>(hold)',
    'touch.act': 'E',

    'prompt.talkMonk': 'Talk to the elder monk',
    'prompt.meditate': 'Sit in meditation',

    'toast.night.title': 'The Forest Call',
    'toast.night.sub': 'Nightfall',
    'toast.sala.title': 'The sala lamp',
    'toast.sala.sub': 'A pounding heart… slowly easing',
    'toast.caught.title': 'Fear swallowed us whole…',
    'toast.caught.sub': 'But all is not lost',
    'toast.dawn.title': 'Dawn',
    'toast.dawn.sub': 'Walk back to the temple',

    'floater.coldWind': 'The air grows colder the deeper we walk…',
    'floater.sala': 'The ghost will not step into this light… yet the heart still trembles',
    'floater.loop': '…we have circled back here again',
    'hint.sati': 'The more agitated… the faster it moves — hold SPACE for mindfulness',
    'hint.loop': 'Stop (hold SPACE), then look for the glowing footprints',
    'voice.callShort': '"Come here, child…"',
    'voice.callHome': '"Come home, my child…"',

    'title.chapters': 'Chapters',
    'title.codex': 'The 31 Planes',
    'end.next': 'Next chapter',
    'end.rebirth': 'Destination — where kamma leads',
    'hud.karma': 'Merit {merit} · Demerit {demerit} · Kusala {kusala} · Akusala {akusala}',
    'hud.realm': 'Current plane: {realm}',
    'samsara.jati': 'Rebirth · {realm}',
    'codex.title': 'The 31 Planes of Existence',
    'codex.close': 'Close',

    'chapter1.name': 'The Forest Call',
    'chapter1.subtitle': 'Chapter One — Fear',
    'chapter2.name': 'The Fire Within',
    'chapter2.subtitle': 'Chapter Two — Anger',

    'hud.agitation': 'A N G E R',
    'prompt.retaliate': 'Retaliate',

    'ch2.toast.start.title': 'The Fire Within',
    'ch2.toast.start.sub': 'Chapter Two — Anger',
    'ch2.floater.retaliate': 'The more you strike, the brighter it burns',
    'ch2.hint.endure': 'Anger is met by not striking — hold SPACE and let the fire burn out',
    'ch2.toast.pacified.title': 'Anger has settled',
    'ch2.toast.pacified.sub': 'Walk back to the bodhi tree',
    'ch2.floater.angerReturns': 'The fire returns… step back into the forest and let it be',
    'ch2.end.title': 'Chapter Two Complete',
    'ch2.end.name': 'The Fire Within',
    'ch2.end.lesson': '<span style="color:#d9c58c">Loving-kindness</span> — anger is never quenched by anger<br><br><span style="color:#d9c58c">Not retaliating</span> — the one who burns you is burning in their own fire',
    'ch2.end.stats': 'Swallowed by anger {caught} times · Retaliated {retaliations} times<br>Practice time {time}',
  },

  lists: {
    'hud.mind': [
      'Afraid… know that you are afraid',
      'Breathing in… know that you are breathing in',
      'Breathing out… know that you are breathing out',
    ],
    'meditation.disturb': [
      "A mother's voice… where is it coming from",
      'Something is breathing behind you',
      'Run! Right now!',
      'The fist you clench… you cannot let go',
      'If you let go, she will vanish forever',
      'The ghost is still following, surely',
      'What did I do wrong…',
    ],
    'memory.question': [
      '"It must be so… if I let go, love means nothing"',
      '"Not necessarily… you can love without holding on forever"',
      '"I don\'t know… only that it hurts"',
    ],
    'hud.mind.anger': [
      'Angry… know that you are angry',
      'Not retaliating… just noticing',
      'The breath cools… the fire slowly fades',
    ],
    'ch2.question': [
      '"Answer anger with anger — let them feel it too"',
      '"Do not retaliate — see that they too are suffering"',
      '"Run far away — I want no part of it"',
    ],
  },

  dialogue: {
    intro: [
      { who: '', text: 'That night… the rain had just stopped, the last drop fell from the eaves, and we heard a call from the far edge of the forest.' },
      { who: '', text: 'A voice so familiar… yet it should no longer be in this world.' },
      { who: '', text: 'Speak with the elder monk first (walk close, then press E).' },
    ],
    monkFirst: [
      { who: 'Elder Monk', text: 'Child… tonight the calling grows louder. It calls your name from the far edge of the forest.' },
      { who: 'Elder Monk', text: 'If you must go, remember only this — when fear rises, do not run in agitation.' },
      { who: 'Elder Monk', text: 'Stop… know the breath… and the path will reveal itself.' },
      { who: 'Elder Monk', text: 'A sala stands at the forest\'s edge; its lamp is still lit. Rest there first.' },
    ],
    monkAfterRelease: [
      { who: 'Elder Monk', text: 'The heart is calm now… petrichor — this scent is like the first morning of a life.' },
    ],
    monkRepeat: [
      { who: 'Elder Monk', text: 'Stop… know the breath, and the path will reveal itself.' },
    ],
    final: [
      { who: 'Elder Monk', text: 'You have returned… child. What did you find in the forest tonight?' },
      { who: '', text: '"I found that… the ghost chasing me was my own mind. The more I ran, the stronger it grew."' },
      { who: 'Elder Monk', text: 'And when the mind was steady, the calling fell silent… This is the first chapter of the path. Walk on.' },
    ],
    memory1: [
      { who: 'Memory', text: 'In memory… mother sat by the hearth. Those rough hands once stroked my head every night before sleep.' },
      { who: 'Memory', text: 'The day she left, we clenched our fists and begged time to stop — begged everything to stay right there forever.' },
      { who: 'Memory', text: 'Since that day we hear her calling every night… in the forest of our own mind.' },
    ],
    memoryCold: [
      { who: '', text: 'The clenched fist… never grew warm. Mother did not return; only the pain grew, day after day.' },
      { who: "Mother's voice", text: 'Child… holding on like this, how much will you hurt? How much?' },
    ],
    memoryCool: [
      { who: "Mother's voice", text: 'You may hurt, child… true love never commanded you not to feel pain.' },
      { who: "Mother's voice", text: 'But do not let the pain lead you astray into the forest…' },
    ],
    memoryWarm: [
      { who: '', text: 'Those words passed through like a deep breath… something loosened.' },
      { who: '', text: 'Mother smiled… then slowly faded into the light — not gone, but returned to the heart.' },
    ],
    release: [
      { who: '', text: 'The calling has fallen silent… the scent of wet earth drifts on the dawn wind.' },
      { who: '', text: 'The forest that was pitch dark last night is clear now — one path, the same one we walked in.' },
      { who: '', text: 'Let us walk back to the temple, following our own footprints.' },
    ],
    'ch2.intro': [
      { who: '', text: 'Morning at the sala… the light is thin, but the chest still burns. The anger we carry has not consented to go out.' },
      { who: '', text: 'On the way back to the temple, something follows — not the ghost of fear, but our own anger.' },
      { who: '', text: 'It grows every time we strike back. Walk to the bodhi tree, and do not let the fire rise again.' },
    ],
    'ch2.pacified': [
      { who: '', text: 'When we do not retaliate… the fire has no fuel. The flame of anger dims into ash.' },
      { who: '', text: 'Walk back to the bodhi tree. Only a settled mind can see the answer waiting there.' },
    ],
    'ch2.bodhi': [
      { who: 'Elder Monk', text: 'Sit beneath the bodhi tree… anger does not live in others; it lives in the mind that still clings.' },
      { who: 'Elder Monk', text: 'The one who harmed us is burning in their own fire as well — what will you choose?' },
    ],
    'ch2.answerCold': [
      { who: '', text: 'We raised our hand… the fire floods the chest again. It did not hurt them. It never ends.' },
      { who: "Anger's voice", text: 'Good… keep fighting, and we will burn together forever.' },
    ],
    'ch2.answerCool': [
      { who: 'Elder Monk', text: 'Fleeing anger is not quenching it — it only carries it everywhere with you.' },
      { who: 'Elder Monk', text: 'Sit down once more… and see clearly whom you are truly angry with.' },
    ],
    'ch2.answerWarm': [
      { who: '', text: 'We lowered our hand… and saw that their fire is already burning them, so we passed none on.' },
      { who: '', text: 'The anger settles into ash… something in the chest grows light. Not gone — released.' },
    ],
  },
};
