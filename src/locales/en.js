'use strict';

export default {
  code: 'en',
  label: 'English',
  htmlLang: 'en',
  strings: {
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
  },
};
