import assert from 'node:assert/strict';

/*
 * The title screen's shell (UX pass): one panel, five small views.
 *
 * The screen used to be a single column holding a tagline, four key hints, two
 * calls to action, fourteen chapter chips, three save chips, a name field and
 * seven link buttons — which overflowed the window on ordinary laptop heights and
 * gave every action the same visual weight. It is now เล่น / บท / บันทึก /
 * เครื่องมือ / เกี่ยวกับ behind one scrolling body. This suite holds that structure
 * to its promises: tabs switch, the keyboard drives them, chapters read as numbered
 * choices, slots read as rows, a tool row keeps its description when its label
 * changes, and the About view is filled from one release source.
 */

// ---- a small DOM: enough for $, class selectors, events and clicks ----
import { El, installDom } from './helpers/dom.mjs';

// the title screen's shell: tabs, panes, and the elements its own code fills
const tabs = new El('nav', { class: 'tabs', attributes: { id: 'titleTabs' } }, [
  new El('button', { class: 'tab is-active', dataset: { tab: 'play' } }),
  new El('button', { class: 'tab', dataset: { tab: 'chapters' } }),
  new El('button', { class: 'tab', dataset: { tab: 'save' } }),
  new El('button', { class: 'tab', dataset: { tab: 'tools' } }),
  new El('button', { class: 'tab', dataset: { tab: 'about' } }),
]);
const PANES = ['play', 'chapters', 'save', 'tools', 'about'];
const body = new El('div', { class: 'tab-body' }, [
  new El('section', { class: 'tab-pane is-active', dataset: { pane: 'play' } }),
  new El('section', { class: 'tab-pane', dataset: { pane: 'chapters' }, hidden: true }),
  new El('section', { class: 'tab-pane', dataset: { pane: 'save' }, hidden: true }),
  new El('section', { class: 'tab-pane', dataset: { pane: 'tools' }, hidden: true }),
  new El('section', { class: 'tab-pane', dataset: { pane: 'about' }, hidden: true }),
]);
const panel = new El('div', { class: 'panel panel--title' }, [tabs, body]);

const chapterSelect = new El('div', { class: 'chapter-list chapter-list--grid', attributes: { id: 'chapterSelect' } });
body.children[1].appendChild(chapterSelect);
const saveSlots = new El('div', { class: 'slot-list', attributes: { id: 'saveSlots' } });
body.children[2].appendChild(saveSlots);
const runNameInput = new El('input', { attributes: { id: 'runNameInput' } });
body.children[2].appendChild(runNameInput);

const toolRow = (id, name, sub) => new El('button', { class: 'tool-btn', attributes: { id } }, [
  new El('span', { class: 'tool-name', text: name }),
  new El('span', { class: 'tool-sub', text: sub }),
]);

const byId = {
  titleTabs: tabs,
  teacherPanel: new El('div', { class: 'hidden', attributes: { id: 'teacherPanel' } }),
  teacherTitle: new El('div', { attributes: { id: 'teacherTitle' } }),
  teacherText: new El('div', { attributes: { id: 'teacherText' } }),
  teacherTour: new El('div', { attributes: { id: 'teacherTour' } }),
  teacherSeed: new El('div', { attributes: { id: 'teacherSeed' } }),
  teacherHint: new El('div', { attributes: { id: 'teacherHint' } }),
  chapterSelect,
  saveSlots,
  runNameInput,
  startBtn: new El('button', { attributes: { id: 'startBtn' } }),
  continueBtn: new El('button', { class: 'btn hidden', attributes: { id: 'continueBtn' } }),
  aboutVersion: new El('span', { attributes: { id: 'aboutVersion' } }),
  aboutRepo: new El('a', { attributes: { id: 'aboutRepo' } }),
  aboutMaker: new El('a', { attributes: { id: 'aboutMaker' } }),
  codexBtn: toolRow('codexBtn', 'ไตรภูมิ 31', 'ดูภูมิทั้ง 31 และกรรมที่พาไป'),
  teacherBtn: toolRow('teacherBtn', 'โหมดครู: ปิด', 'โหมดสำหรับสอนในห้องเรียน'),
  projectorBtn: toolRow('projectorBtn', 'โหมดฉายภาพ: ปิด', 'ตัวอักษรและป้ายขนาดใหญ่'),
  recapBtn: new El('button', { attributes: { id: 'recapBtn' } }),
  worksheetBtn: new El('button', { attributes: { id: 'worksheetBtn' } }),
  lifeBtn: new El('button', { attributes: { id: 'lifeBtn' } }),
  exploreBtn: new El('button', { class: 'hidden', attributes: { id: 'exploreBtn' } }),
  settingsBtn: new El('button', { attributes: { id: 'settingsBtn' } }),
  settingsOverlay: new El('div', { class: 'hidden', attributes: { id: 'settingsOverlay' } }),
  titleScreen: new El('div', { attributes: { id: 'titleScreen' } }),
  dlgBox: new El('div', { class: 'hidden', attributes: { id: 'dlgBox' } }),
  dlgWho: new El('div', { attributes: { id: 'dlgWho' } }),
  dlgText: new El('div', { attributes: { id: 'dlgText' } }),
  choiceBox: new El('div', { class: 'hidden', attributes: { id: 'choiceBox' } }),
  medOverlay: new El('div', { class: 'hidden', attributes: { id: 'medOverlay' } }),
  memOverlay: new El('div', { class: 'hidden', attributes: { id: 'memOverlay' } }),
  disturbCard: new El('div', { class: 'hidden', attributes: { id: 'disturbCard' } }),
  hud: new El('div', { class: 'hidden', attributes: { id: 'hud' } }),
  ctrlHint: new El('div', { class: 'hidden', attributes: { id: 'ctrlHint' } }),
  endScreen: new El('div', { class: 'hidden', attributes: { id: 'endScreen' } }),
  endTitle: new El('div', { attributes: { id: 'endTitle' } }),
  endName: new El('div', { attributes: { id: 'endName' } }),
  endLesson: new El('div', { attributes: { id: 'endLesson' } }),
  endStats: new El('div', { attributes: { id: 'endStats' } }),
  nextBtn: new El('button', { attributes: { id: 'nextBtn' } }),
  realmName: new El('div', { attributes: { id: 'realmName' } }),
  realmPali: new El('div', { attributes: { id: 'realmPali' } }),
  realmDesc: new El('div', { attributes: { id: 'realmDesc' } }),
  realmReason: new El('div', { attributes: { id: 'realmReason' } }),
  karmaSummary: new El('div', { attributes: { id: 'karmaSummary' } }),
  preceptSummary: new El('div', { attributes: { id: 'preceptSummary' } }),
  confirmOverlay: new El('div', { class: 'hidden', attributes: { id: 'confirmOverlay' } }),
  confirmTitle: new El('div', { attributes: { id: 'confirmTitle' } }),
  confirmBody: new El('div', { attributes: { id: 'confirmBody' } }),
  confirmYes: new El('button', { attributes: { id: 'confirmYes' } }),
  confirmNo: new El('button', { attributes: { id: 'confirmNo' } }),
};
for (const el of Object.values(byId)) {
  if (!el.parentElement) body.children[3].appendChild(el);
}

const wrapper = new El('div', {}, [panel]);
installDom({ byId, root: wrapper })
const log = (message) => console.error(`[title] ${message}`);

const title = await import('../src/ui/title-screen.js');
const about = await import('../src/ui/about.js');
const teacherPanel = await import('../src/ui/teacher-panel.js');
const { isTeacher, toggleTeacher } = await import('../src/systems/teacher.js');
const save = await import('../src/systems/save.js');
const { CHAPTERS } = await import('../src/game/chapters.js');
const { APP } = await import('../src/core/app-meta.js');

title.initTitleScreen();
about.initAbout();

// ---- 1. the screen is five views, and Play is the one you land on ----
assert.equal(tabs.children.length, 5, 'five tabs');
const paneOf = (name) => body.children.find((pane) => pane.dataset.pane === name);
assert.equal(paneOf('play').hidden, false, 'Play is open first');
for (const name of PANES) {
  if (name !== 'play') assert.equal(paneOf(name).hidden, true, `${name} starts closed`);
}
assert.equal(paneOf('play').classes.has('is-active'), true, 'and is marked active');
log('landing ok');

// ---- 2. clicking a tab moves the whole panel, never the whole screen ----
for (const [tab, name] of tabs.children.map((tab) => [tab, tab.dataset.tab])) {
  tab.click();
  assert.equal(tab.classes.has('is-active'), true, `${name} becomes active`);
  assert.equal(tab.getAttribute('aria-selected'), 'true', `${name} says so to a screen reader`);
  assert.equal(paneOf(name).hidden, false, `${name}'s view shows`);
  for (const other of PANES) {
    if (other === name) continue;
    assert.equal(paneOf(other).hidden, true, `${other} hides while ${name} is open`);
  }
}
log('tabs ok');

// ---- 3. the keyboard drives the tabs too ----
tabs.children[0].click();
tabs.children[0].dispatch('keydown', { key: 'ArrowRight' });
assert.equal(paneOf('chapters').hidden, false, 'ArrowRight moves to the next tab');
assert.equal(globalThis.__focused, tabs.children[1], 'and takes the focus with it');
tabs.children[1].dispatch('keydown', { key: 'ArrowLeft' });
assert.equal(paneOf('play').hidden, false, 'ArrowLeft comes back');
tabs.children[0].dispatch('keydown', { key: 'ArrowLeft' });
assert.equal(paneOf('about').hidden, false, 'and from the first it wraps to the last');
tabs.children[0].click();
log('keyboard ok');

// ---- 3b. the About view is filled from one release source ----
assert.equal(byId.aboutVersion.textContent, APP.version, 'the version comes from app-meta');
assert.equal(byId.aboutRepo.href, APP.repo, 'the source link comes from app-meta');
assert.equal(byId.aboutMaker.href, APP.maker, 'the maker link comes from app-meta');
assert(APP.repo.includes('github.com/bitoslabs/vatta'), 'the repo points at the Vatta project');
assert(APP.maker.includes('bitos.space'), 'the maker points at bits.space');
log('about ok');

// ---- 4. chapters read as numbered choices, and the saved one is marked ----
assert.equal(chapterSelect.children.length, CHAPTERS.length, 'every chapter has a button');
assert(/^1 · /.test(chapterSelect.children[0].textContent), `the first chapter is numbered (${chapterSelect.children[0].textContent})`);
assert(chapterSelect.children[0].classes.has('is-current') === false, 'and nothing is current on a fresh profile');

const { state } = await import('../src/core/state.js');
const { recordKarma } = await import('../src/systems/karma.js');
save.setActiveSlot(2);
state.chapter = 6;
recordKarma('give', 2);
save.saveRun();
assert.equal(save.readSave(2).chapter, 6, 'slot 2 holds a run standing in chapter 6');
// the screen re-marks on locale change, which is the same path a reload takes
const { emit, EVENTS } = await import('../src/core/events.js');
emit(EVENTS.LOCALE_CHANGED, 'th');
const marked = chapterSelect.children.filter((button) => button.classes.has('is-current'));
assert.equal(marked.length, 1, 'exactly one chapter is marked as the saved one');
assert.equal(marked[0].dataset.chapter, '6', 'and it is the chapter the save stands in');
// and the continue button names the chapter the run stands in
assert.equal(byId.continueBtn.classes.has('hidden'), false, 'with a save present, Continue is offered');
const { t } = await import('../src/systems/i18n.js');
const { chapterById } = await import('../src/game/chapters.js');
assert(
  byId.continueBtn.textContent.includes(t(chapterById(6).nameKey)),
  `Continue names the saved chapter (${byId.continueBtn.textContent})`,
);
log('chapters ok');

// ---- 4b. save slots read as rows: number badge plus what is in them ----
const slots = await import('../src/ui/save-slots.js');
slots.renderSaveSlots();
assert.equal(saveSlots.children.length, 3, 'three slot rows');
const rows = saveSlots.children;
assert(rows.every((row) => row.classes.has('save-slot')), 'each is a slot row');
assert(rows.every((row) => row.querySelector('.slot-num')), 'each carries its number badge');
assert(rows.every((row) => row.querySelector('.slot-text')), 'and its summary text');
assert.equal(rows[0].classes.has('is-empty'), true, 'slot 1 is marked empty');
assert.equal(rows[1].classes.has('is-active'), true, 'slot 2 is the active one');
assert.equal(rows[1].getAttribute('aria-pressed'), 'true', 'and says so');
assert.equal(rows[1].querySelector('.slot-text').textContent.length > 0, true, 'a filled row says something useful');
log('slots ok');

// ---- 5. a tool row keeps its description when the label changes ----
assert.equal(teacherPanel && typeof teacherPanel.updateTeacherPanel === 'function', true, 'the tool panel is wired');
const teacherName = byId.teacherBtn.querySelector('.tool-name');
const teacherSub = byId.teacherBtn.querySelector('.tool-sub');
assert.equal(teacherSub.textContent.length > 0, true, 'the teacher row has a description');
// the panel wires the button and re-renders its chrome on the toggle event
teacherPanel.initTeacherPanel();
byId.teacherBtn.click();
assert.equal(isTeacher(), true, 'clicking the tool row turns classroom mode on');
assert.equal(teacherName.textContent, t('teacher.toggle.on'), 'the label reflects the toggle in the active locale');
assert.equal(teacherSub.textContent.length > 0, true, 'and the description survived it');
teacherPanel.updateTeacherPanel();
assert.equal(teacherSub.textContent.length > 0, true, 'still there after a frame update');
byId.teacherBtn.click();
assert.equal(isTeacher(), false, 'and clicking again turns it off');
assert.equal(teacherName.textContent, t('teacher.toggle.off'), 'the label comes back to off in the active locale');
log('tool rows ok');

// ---- 6. every id the screen reaches for exists in index.html ----
const fs = await import('node:fs');
const html = fs.readFileSync('index.html', 'utf8');
for (const id of ['titleScreen', 'titleTabs', 'chapterSelect', 'saveSlots', 'runNameInput', 'continueBtn', 'startBtn', 'codexBtn', 'teacherBtn', 'projectorBtn', 'recapBtn', 'worksheetBtn', 'lifeBtn', 'exploreBtn', 'aboutVersion', 'aboutRepo', 'aboutMaker']) {
  assert(html.includes(`id="${id}"`), `index.html still has #${id}`);
}
for (const needle of ['data-pane="play"', 'data-pane="chapters"', 'data-pane="save"', 'data-pane="tools"', 'data-pane="about"', 'class="tab-body"', 'chapter-list--grid', 'slot-list', 'tool-list']) {
  assert(html.includes(needle), `index.html has ${needle}`);
}

// ---- 7. the Lao locale and the Vatta name are wired in ----
for (const css of ['https://fonts.mts.la/fonts/lao-buhan/lao-buhan.css', 'https://fonts.mts.la/fonts/kom/kom.css']) {
  assert(html.includes(css), `index.html links ${css}`);
}
const baseCss = fs.readFileSync('src/styles/base.css', 'utf8');
assert(baseCss.includes("html[lang='lo']"), 'the Lao font stack is scoped to html[lang=\'lo\']');
assert(baseCss.includes("'Lao_Buhan'"), 'Lao headings use Lao_Buhan');
assert(baseCss.includes("'Kom'"), 'Lao body text uses Kom');

const { locales } = await import('../src/locales/index.js');
assert.equal(locales.default, 'lo', 'new players open in Lao');
assert(html.includes('<html lang="lo">'), 'the unhydrated document starts in Lao');
assert(html.includes('<title>ວັດຕະ — ປ່າສຽງເອີ້ນ</title>'), 'the initial browser title is Lao');
assert.equal(locales.th.strings['title.name'], 'วัฏฏะ', 'Thai name is วัฏฏะ');
assert.equal(locales.lo.strings['title.name'], 'ວັດຕະ', 'Lao name is ວັດຕະ');
assert.equal(locales.en.strings['title.name'], 'Vatta', 'English name is Vatta');
log('markup + name + fonts ok');

// ---- 8. a completed save reopens its ending through either entry point ----
const { MODE } = await import('../src/core/constants.js');
const audioNode = () => ({ connect() {}, start() {}, stop() {}, frequency: { value: 0 },
  gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} } });
window.AudioContext = class {
  constructor() { this.sampleRate = 8; this.currentTime = 0; this.destination = audioNode(); }
  createGain() { return audioNode(); }
  createBuffer() { return { getChannelData: () => new Float32Array(16) }; }
  createBufferSource() { return audioNode(); }
  createBiquadFilter() { return audioNode(); }
  createOscillator() { return audioNode(); }
};
const { resetKarma } = await import('../src/systems/karma.js');
const { currentMapId } = await import('../src/systems/biome.js');
resetKarma();
state.chapter = 6;
state.formId = 'niraya';
state.realmId = 'niraya';
state.lifeMode = true;
state.liberated = false;
state.journeyComplete = false;
save.saveRun(2);
byId.continueBtn.click();
assert.equal(state.realmId, 'niraya', 'Continue keeps the saved realm');
assert.equal(state.dynamic.mapId, currentMapId(), 'Continue builds the map for that realm');
slots.renderSaveSlots();
saveSlots.children[1].click();
assert.equal(state.dynamic.mapId, currentMapId(), 'opening a slot builds the map for its saved realm');
state.chapter = 14;
state.lifeMode = true;
state.liberated = true;
state.finalChoice = 'free';
save.saveRun(2);
byId.continueBtn.click();
assert.equal(state.mode, MODE.END, 'Continue restores the completed ending');
assert.equal(byId.endScreen.classes.has('hidden'), false, 'the end card is visible again');
byId.endScreen.classList.add('hidden');
slots.renderSaveSlots();
saveSlots.children[1].click();
assert.equal(state.mode, MODE.END, 'opening the slot also restores the ending');
assert.equal(byId.endScreen.classes.has('hidden'), false);
log('completed save resumes ok');

console.error('TITLE TEST OK — five views in one scrolling panel, keyboard tabs, numbered chapters, slot rows, an About page and the Vatta name/fonts');
