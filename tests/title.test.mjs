import assert from 'node:assert/strict';

/*
 * The title screen's shell (UX pass): one panel, four small views.
 *
 * The screen used to be a single column holding a tagline, four key hints, two
 * calls to action, fourteen chapter chips, three save chips, a name field and
 * seven link buttons — which overflowed the window on ordinary laptop heights and
 * gave every action the same visual weight. It is now เล่น / บท / บันทึก /
 * เครื่องมือ behind one scrolling body. This suite holds that structure to its
 * promises: tabs switch, the keyboard drives them, chapters read as numbered
 * choices, slots read as rows, and a tool row keeps its description when its
 * label changes.
 */

// ---- a small DOM: enough for $, class selectors, events and clicks ----
class El {
  constructor(tag = 'div', attrs = {}, children = []) {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.parentElement = null;
    this.dataset = { ...(attrs.dataset || {}) };
    this.attributes = {};
    this.classes = new Set(attrs.class ? attrs.class.split(/\s+/).filter(Boolean) : []);
    this.listeners = {};
    this.textContent = attrs.text || '';
    this.hidden = attrs.hidden === true;
    this.value = attrs.value || '';
    this.classList = {
      add: (...c) => c.forEach((x) => this.classes.add(x)),
      remove: (...c) => c.forEach((x) => this.classes.delete(x)),
      contains: (c) => this.classes.has(c),
      toggle: (c, on) => {
        const want = on === undefined ? !this.classes.has(c) : on;
        if (want) this.classes.add(c); else this.classes.delete(c);
        return want;
      },
    };
    for (const child of children) this.appendChild(child);
    for (const [k, v] of Object.entries(attrs.attributes || {})) this.setAttribute(k, v);
  }

  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  get className() { return [...this.classes].join(' '); }
  set className(value) { this.classes = new Set(String(value).split(/\s+/).filter(Boolean)); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); }
  dispatch(type, event = {}) { for (const fn of this.listeners[type] || []) fn({ target: this, preventDefault() {}, ...event }); }
  click() { this.dispatch('click'); }
  focus() { focused = this; }
  blur() {}
  querySelectorAll(selector) { return all(this, selector); }
  querySelector(selector) { return all(this, selector)[0] || null; }
  get innerHTML() { return ''; }
  set innerHTML(_v) { this.children = []; }
}

function matches(el, selector) {
  if (selector.startsWith('.')) return el.classes.has(selector.slice(1));
  if (selector.startsWith('#')) return el.attributes.id === selector.slice(1);
  return el.tagName === selector.toUpperCase();
}

/** Depth-first search under `root`, including nested elements. */
function all(root, selector) {
  const out = [];
  const visit = (node) => {
    for (const child of node.children) {
      if (selector.split(',').map((s) => s.trim()).some((s) => matches(child, s))) out.push(child);
      visit(child);
    }
  };
  visit(root);
  return out;
}

let focused = null;
const root = new El('body');

// the title panel: tabs, panes, and the elements the screen's own code fills
const tabs = new El('nav', { class: 'tabs', attributes: { id: 'titleTabs' } }, [
  new El('button', { class: 'tab is-active', dataset: { tab: 'play' } }),
  new El('button', { class: 'tab', dataset: { tab: 'chapters' } }),
  new El('button', { class: 'tab', dataset: { tab: 'save' } }),
  new El('button', { class: 'tab', dataset: { tab: 'tools' } }),
]);
const body = new El('div', { class: 'tab-body' }, [
  new El('section', { class: 'tab-pane is-active', dataset: { pane: 'play' } }),
  new El('section', { class: 'tab-pane', dataset: { pane: 'chapters' }, hidden: true }),
  new El('section', { class: 'tab-pane', dataset: { pane: 'save' }, hidden: true }),
  new El('section', { class: 'tab-pane', dataset: { pane: 'tools' }, hidden: true }),
]);
const panel = new El('div', { class: 'panel panel--title' }, [tabs, body]);
root.appendChild(panel);

const chapterSelect = new El('div', { class: 'chapter-list chapter-list--grid', attributes: { id: 'chapterSelect' } });
body.children[1].appendChild(chapterSelect);
const saveSlots = new El('div', { class: 'slot-list', attributes: { id: 'saveSlots' } });
body.children[2].appendChild(saveSlots);
const runNameInput = new El('input', { attributes: { id: 'runNameInput' } });
body.children[2].appendChild(runNameInput);

const byId = {
  titleTabs: tabs,
  teacherPanel: new El('div', { class: 'hidden', attributes: { id: 'teacherPanel' } }),
  teacherTitle: new El('div', { attributes: { id: 'teacherTitle' } }),
  teacherText: new El('div', { attributes: { id: 'teacherText' } }),
  teacherTour: new El('div', { attributes: { id: 'teacherTour' } }),
  teacherSeed: new El('div', { attributes: { id: 'teacherSeed' } }),
  teacherHint: new El('div', { attributes: { id: 'teacherHint' } }), chapterSelect, saveSlots, runNameInput,
  startBtn: new El('button', { attributes: { id: 'startBtn' } }),
  continueBtn: new El('button', { class: 'btn hidden', attributes: { id: 'continueBtn' } }),
  codexBtn: new El('button', { class: 'tool-btn', attributes: { id: 'codexBtn' } }, [
    new El('span', { class: 'tool-name', text: 'ไตรภูมิ 31' }),
    new El('span', { class: 'tool-sub', text: 'ดูภูมิทั้ง 31 และกรรมที่พาไป' }),
  ]),
  teacherBtn: new El('button', { class: 'tool-btn', attributes: { id: 'teacherBtn' } }, [
    new El('span', { class: 'tool-name', text: 'โหมดครู: ปิด' }),
    new El('span', { class: 'tool-sub', text: 'โหมดสำหรับสอนในห้องเรียน' }),
  ]),
  projectorBtn: new El('button', { class: 'tool-btn', attributes: { id: 'projectorBtn' } }, [
    new El('span', { class: 'tool-name', text: 'โหมดฉายภาพ: ปิด' }),
    new El('span', { class: 'tool-sub', text: 'ตัวอักษรและป้ายขนาดใหญ่' }),
  ]),
  recapBtn: new El('button', { attributes: { id: 'recapBtn' } }),
  worksheetBtn: new El('button', { attributes: { id: 'worksheetBtn' } }),
  lifeBtn: new El('button', { attributes: { id: 'lifeBtn' } }),
  exploreBtn: new El('button', { class: 'hidden', attributes: { id: 'exploreBtn' } }),
};
for (const el of Object.values(byId)) {
  if (!el.parentElement) body.children[3].appendChild(el);
}

globalThis.document = {
  hidden: false,
  querySelector: (selector) => (selector.startsWith('#') ? byId[selector.slice(1)] || all(root, selector)[0] || null : all(root, selector)[0] || null),
  querySelectorAll: (selector) => all(root, selector),
  createElement: (tag) => new El(tag),
};
globalThis.window = { matchMedia: () => ({ matches: false }), addEventListener() {}, location: { reload() {} } };
globalThis.localStorage = (() => {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
})();
globalThis.performance = { now: () => 0 };

const log = (message) => console.error(`[title] ${message}`);

const title = await import('../src/ui/title-screen.js');
const teacherPanel = await import('../src/ui/teacher-panel.js');
const { isTeacher, toggleTeacher } = await import('../src/systems/teacher.js');
const save = await import('../src/systems/save.js');
const { CHAPTERS } = await import('../src/game/chapters.js');

title.initTitleScreen();

// ---- 1. the screen is four views, and Play is the one you land on ----
assert.equal(tabs.children.length, 4, 'four tabs');
const paneOf = (name) => body.children.find((pane) => pane.dataset.pane === name);
assert.equal(paneOf('play').hidden, false, 'Play is open first');
for (const name of ['chapters', 'save', 'tools', 'play']) {
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
  for (const other of ['play', 'chapters', 'save', 'tools']) {
    if (other === name) continue;
    assert.equal(paneOf(other).hidden, true, `${other} hides while ${name} is open`);
  }
}
log('tabs ok');

// ---- 3. the keyboard drives the tabs too ----
tabs.children[0].click();
tabs.children[0].dispatch('keydown', { key: 'ArrowRight' });
assert.equal(paneOf('chapters').hidden, false, 'ArrowRight moves to the next tab');
assert.equal(focused, tabs.children[1], 'and takes the focus with it');
tabs.children[1].dispatch('keydown', { key: 'ArrowLeft' });
assert.equal(paneOf('play').hidden, false, 'ArrowLeft comes back');
tabs.children[0].dispatch('keydown', { key: 'ArrowLeft' });
assert.equal(paneOf('tools').hidden, false, 'and from the first it wraps to the last');
tabs.children[0].click();
log('keyboard ok');

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
assert.notEqual(teacherName.textContent, 'โหมดครู: ปิด', `the label reflects the toggle (${teacherName.textContent})`);
assert.equal(teacherSub.textContent.length > 0, true, 'and the description survived it');
teacherPanel.updateTeacherPanel();
assert.equal(teacherSub.textContent.length > 0, true, 'still there after a frame update');
byId.teacherBtn.click();
assert.equal(isTeacher(), false, 'and clicking again turns it off');
assert(teacherName.textContent.includes('ปิด'), 'the label comes back to off');
log('tool rows ok');

// ---- 6. every id the screen reaches for exists in index.html ----
const fs = await import('node:fs');
const html = fs.readFileSync('index.html', 'utf8');
for (const id of ['titleScreen', 'titleTabs', 'chapterSelect', 'saveSlots', 'runNameInput', 'continueBtn', 'startBtn', 'codexBtn', 'teacherBtn', 'projectorBtn', 'recapBtn', 'worksheetBtn', 'lifeBtn', 'exploreBtn']) {
  assert(html.includes(`id="${id}"`), `index.html still has #${id}`);
}
for (const needle of ['data-pane="play"', 'data-pane="chapters"', 'data-pane="save"', 'data-pane="tools"', 'class="tab-body"', 'chapter-list--grid', 'slot-list', 'tool-list']) {
  assert(html.includes(needle), `index.html has ${needle}`);
}
log('markup ok');

console.error('TITLE TEST OK — four views in one scrolling panel, keyboard tabs, numbered chapters, slot rows and intact tool descriptions');
