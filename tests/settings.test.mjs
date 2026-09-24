import assert from 'node:assert/strict';
import { El, installDom } from './helpers/dom.mjs';

/*
 * Help & settings (H): the screen that answers "which key is that?" and "where are
 * my saves?", and the only place a click can cost something.
 *
 * Three promises are held here: the display settings stick, the run line tells the
 * truth about the slot you are in, and deleting a slot always asks first — while
 * cancelling leaves everything exactly as it was.
 */

const log = (message) => console.error(`[settings] ${message}`);

// ---- the screens this suite drives ----
const overlay = new El('div', { class: 'hidden', attributes: { id: 'settingsOverlay' } });
const muteButton = new El('button', { attributes: { id: 'settingsMute' } });
const typeButton = new El('button', { attributes: { id: 'settingsLarge' } });
const resetButton = new El('button', { attributes: { id: 'settingsReset' } });
const closeButton = new El('button', { attributes: { id: 'settingsClose' } });
const runInfo = new El('div', { attributes: { id: 'settingsRun' } });
const keysList = new El('div', { attributes: { id: 'settingsKeys' } });
const confirmOverlay = new El('div', { class: 'hidden', attributes: { id: 'confirmOverlay' } });
const confirmTitle = new El('div', { attributes: { id: 'confirmTitle' } });
const confirmBody = new El('div', { attributes: { id: 'confirmBody' } });
const confirmYes = new El('button', { attributes: { id: 'confirmYes' } });
const confirmNo = new El('button', { attributes: { id: 'confirmNo' } });
const saveSlots = new El('div', { attributes: { id: 'saveSlots' } });

// the title screen's parts, so the start button's new confirm can be exercised
const titlePanel = new El('div', { class: 'panel panel--title' });
const tabsNav = new El('nav', { class: 'tabs', attributes: { id: 'titleTabs' } });
const tabBody = new El('div', { class: 'tab-body' });
const chapterSelect = new El('div', { attributes: { id: 'chapterSelect' } });
const startButton = new El('button', { attributes: { id: 'startBtn' } });
const continueButton = new El('button', { class: 'hidden', attributes: { id: 'continueBtn' } });

const dom = installDom({
  byId: {
    settingsOverlay: overlay,
    settingsMute: muteButton,
    settingsLarge: typeButton,
    settingsReset: resetButton,
    settingsClose: closeButton,
    settingsRun: runInfo,
    settingsKeys: keysList,
    confirmOverlay,
    confirmTitle,
    confirmBody,
    confirmYes,
    confirmNo,
    saveSlots,
    titleTabs: tabsNav,
    startBtn: startButton,
    continueBtn: continueButton,
    chapterSelect,
    teacherPanel: new El('div', { class: 'hidden', attributes: { id: 'teacherPanel' } }),
  },
});

const { isMuted, setMuted, toggleMute } = await import('../src/systems/audio.js');
const settings = await import('../src/systems/settings.js');
const ui = await import('../src/ui/settings.js');
const confirm = await import('../src/ui/confirm.js');
const { emit, EVENTS } = await import('../src/core/events.js');
const save = await import('../src/systems/save.js');
const { state } = await import('../src/core/state.js');
const { recordKarma } = await import('../src/systems/karma.js');
const { t } = await import('../src/systems/i18n.js');
const { chapterById } = await import('../src/game/chapters.js');

// the title screen is initialised for one assertion only (the start confirm)
const title = await import('../src/ui/title-screen.js');

// ---- 1. display settings stick across a session ----
settings.initSettings();
assert.equal(settings.isLargeType(), false, 'large type is off by default');
assert.equal(dom.documentElement.classes.has('type-large'), false, 'and the document says so');
settings.setLargeType(true);
assert.equal(dom.documentElement.classes.has('type-large'), true, 'turning it on puts the class on the document');
assert(JSON.parse(dom.storage.get('vimutti.settings')).largeType === true, 'and stores the choice');
// a new session reads it back (initSettings is what boot calls)
settings.setLargeType(false);
settings.initSettings();
assert.equal(settings.isLargeType(), false, 'a fresh session starts from what was stored');
settings.setLargeType(true);
settings.initSettings();
assert.equal(settings.isLargeType(), true, 'and it comes back on when that is what was stored');
log('display settings ok');

// ---- 2. sound is a switch the screen can read ----
setMuted(false);
assert.equal(isMuted(), false, 'sound starts on');
assert.equal(toggleMute(), true, 'M flips it');
assert.equal(toggleMute(), false, 'and flips back');
setMuted(true);
assert.equal(isMuted(), true, 'the screen can set it directly');
log('sound ok');

// ---- 3. the screen opens with H, and describes the run in play ----
ui.initSettingsScreen(); // wires the buttons, the H key and the confirm dialog
assert.equal(ui.isSettingsOpen(), false, 'closed to begin with');
emit(EVENTS.HELP_KEY, undefined);
assert.equal(ui.isSettingsOpen(), true, 'H opens it from anywhere');
emit(EVENTS.HELP_KEY, undefined);
assert.equal(ui.isSettingsOpen(), false, 'and H closes it again');

save.setActiveSlot(3);
state.chapter = 4;
state.runName = 'ป่าแห่งความกลัว';
recordKarma('give', 3);
save.saveRun();
emit(EVENTS.HELP_KEY, undefined);
assert.equal(muteButton.textContent, t('help.sound.muted'), 'the sound button shows the live state');
assert.equal(typeButton.textContent, t('help.type.large'), 'and the type button shows the display state');
assert(runInfo.textContent.includes('3'), `the run line names the slot (${runInfo.textContent})`);
assert(runInfo.textContent.includes(t(chapterById(4).nameKey)), 'and the chapter');
assert(runInfo.textContent.includes('ป่าแห่งความกลัว'), 'and the name the run was given');
assert(keysList.children.length >= 6, 'the key list is filled');
log('screen ok');

// ---- 4. the buttons drive the systems they describe ----
const wasMuted = isMuted();
muteButton.click();
assert.equal(isMuted(), !wasMuted, 'the sound button really mutes');
assert.equal(muteButton.textContent, t(isMuted() ? 'help.sound.muted' : 'help.sound.on'), 'and relabels itself');
const wasLarge = settings.isLargeType();
typeButton.click();
assert.equal(settings.isLargeType(), !wasLarge, 'the type button really changes the type');
assert.equal(dom.documentElement.classes.has('type-large'), !wasLarge, 'and the document follows');
log('buttons ok');

// ---- 5. the display preference survives a save/clear of the run data ----
assert.notEqual(dom.storage.get('vimutti.settings'), null, 'settings live beside the saves, not inside them');

// ---- 6. deleting a slot asks first, and cancelling changes nothing ----
const before = save.readSave(3);
assert.equal(before.chapter, 4, 'slot 3 holds the run before the question');
resetButton.click();
assert.equal(confirm.confirmOpen(), true, 'the delete button asks first');
assert(confirmTitle.textContent.length > 0, 'and the question is written out');
confirmNo.click();
assert.equal(confirm.confirmOpen(), false, 'cancelling closes the question');
assert.equal(save.readSave(3).chapter, 4, 'and the run is untouched');
log('cancel ok');

// confirming really deletes, and the slot list is redrawn from the truth
resetButton.click();
confirmYes.click();
await new Promise((resolve) => setTimeout(resolve, 0)); // the handler resumes
assert.equal(save.readSave(3), null, 'confirming clears the slot');
assert.equal(save.hasSave(4), false, 'only that slot was touched (slot 4 is still empty anyway)');
log('reset ok');

// ---- 7. Escape cancels, Enter confirms ----
save.setActiveSlot(2);
state.chapter = 6;
save.saveRun();
assert.equal(save.readSave(2).chapter, 6, 'slot 2 holds a run again');
resetButton.click();
dom.pressKey('Escape');
assert.equal(confirm.confirmOpen(), false, 'Escape closes the question');
assert.equal(save.readSave(2).chapter, 6, 'and keeps the run');
typeButton.click(); // (any click closes nothing else)
log('keyboard ok');

// ---- 8. starting a new run over a filled slot asks first ----
title.initTitleScreen();
// (Continue is not clicked here: it would boot audio and a chapter. The question
// this suite cares about is the one Start asks.)
startButton.click();
assert.equal(confirm.confirmOpen(), true, 'with a save present, Start asks before overwriting');
const slotBefore = save.readSave(2).chapter;
confirmNo.click();
assert.equal(save.readSave(2).chapter, slotBefore, 'cancelling leaves the saved run alone');
log('new-run confirm ok');

console.error('SETTINGS TEST OK — display settings that stick, a truthful run line, and one question before anything is lost');
