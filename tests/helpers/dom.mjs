/*
 * A small DOM for the UI suites.
 *
 * The gameplay suites run headless with a stub that answers every call; the screen
 * suites need a little more: class selectors, events you can click, a document
 * element with a class list (the display settings live there), and `querySelector`
 * that honestly returns null for children that do not exist. This is that, and
 * nothing more.
 */

export class El {
  constructor(tag = 'div', attrs = {}, children = []) {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.parentElement = null;
    this.dataset = { ...(attrs.dataset || {}) };
    this.attributes = { ...(attrs.attributes || {}) };
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
        const want = on === undefined ? !this.classes.has(c) : Boolean(on);
        if (want) this.classes.add(c); else this.classes.delete(c);
        return want;
      },
    };
    for (const child of children) this.appendChild(child);
  }

  get className() { return [...this.classes].join(' '); }
  set className(value) { this.classes = new Set(String(value).split(/\s+/).filter(Boolean)); }

  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); }
  dispatch(type, event = {}) { for (const fn of this.listeners[type] || []) fn({ target: this, preventDefault() {}, ...event }); }
  click() { this.dispatch('click'); }
  focus() { globalThis.__focused = this; }
  blur() {}
  querySelectorAll(selector) { return matchesAll(this, selector); }
  querySelector(selector) { return matchesAll(this, selector)[0] || null; }
  get innerHTML() { return ''; }
  set innerHTML(_value) { this.children = []; }
}

function matches(el, selector) {
  if (selector.startsWith('.')) return el.classes.has(selector.slice(1));
  if (selector.startsWith('#')) return el.attributes.id === selector.slice(1);
  return el.tagName === selector.toUpperCase();
}

export function matchesAll(root, selector) {
  const selectors = selector.split(',').map((s) => s.trim());
  const out = [];
  const visit = (node) => {
    for (const child of node.children) {
      if (selectors.some((s) => matches(child, s))) out.push(child);
      visit(child);
    }
  };
  visit(root);
  return out;
}

/** Put a document, a window and storage in place, and hand back the pieces. */
export function installDom({ byId = {}, root = new El('body') } = {}) {
  const documentElement = new El('html');
  const store = new Map();
  let keydown = [];

  globalThis.document = {
    hidden: false,
    documentElement,
    querySelector: (selector) => {
      if (selector.startsWith('#')) return byId[selector.slice(1)] || matchesAll(root, selector)[0] || null;
      return matchesAll(root, selector)[0] || null;
    },
    querySelectorAll: (selector) => (selector.startsWith('#') && byId[selector.slice(1)]
      ? [byId[selector.slice(1)]]
      : matchesAll(root, selector)),
    createElement: (tag) => new El(tag),
    createElementNS: (_ns, tag) => new El(tag),
  };

  globalThis.window = {
    matchMedia: () => ({ matches: false }),
    addEventListener: (type, fn) => { if (type === 'keydown') keydown.push(fn); },
    removeEventListener: () => {},
    location: { reload() {} },
  };
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
  globalThis.performance = { now: () => 0 };

  return {
    root,
    byId,
    documentElement,
    storage: store,
    /** Fire a key event the way the browser would (confirm dialogs listen this way). */
    pressKey: (key) => { for (const fn of keydown) fn({ key, preventDefault() {} }); },
  };
}
