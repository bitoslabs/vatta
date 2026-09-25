import { state } from '../core/state.js';
import { seedFrom, hashUnit } from '../core/rng.js';
import { REFLECTIONS } from '../content/reflections.js';
import { REALM_MAPS } from '../content/realm-maps.js';
import { getKarma } from './karma.js';

const empty = () => ({ history: [], pending: null, lifeKey: '', count: 0, elapsed: 0, nextAt: 0 });
const key = () => `${state.runId || ''}:${state.lifeId}:${state.formId}:${state.realmId}`;
export function resetReflections() { state.reflections = empty(); }
function journal() {
  if (!state.reflections) resetReflections();
  const data = state.reflections;
  if (data.lifeKey !== key()) {
    Object.assign(data, { lifeKey: key(), pending: null, count: 0, elapsed: 0, nextAt: 0 });
  }
  return data;
}
export function tickReflections(dt) {
  if (Number.isFinite(dt) && dt > 0) journal().elapsed += Math.min(dt, 1);
}
export function reflectionReady() {
  const data = journal();
  return Boolean(data.pending) || (data.count < 3 && data.elapsed >= data.nextAt);
}

export function reserveReflection() {
  const data = journal();
  if (data.pending) return data.pending;
  if (!reflectionReady()) return null;
  const recent = new Set(data.history.slice(-4).map(entry => entry.id));
  const tendency = getKarma().tendencies;
  const theme = REALM_MAPS[state.realmId]?.theme || 'change';
  const actionTheme = tendency.anger > 2 ? 'kindness' : tendency.greed > 2 ? 'giving'
    : tendency.clinging > 2 ? 'letting' : state.formId !== 'human' ? 'care' : 'attention';
  const seed = seedFrom(`${key()}:${data.count}:${data.history.length}`);
  const candidates = REFLECTIONS.filter(item => !recent.has(item.id)).map((item, i) => {
    const past = data.history.filter(entry => entry.id === item.id);
    return { item, score: -past.length * 10 + (item.theme === theme ? 3 : 0)
      + (item.theme === actionTheme ? 2 : 0)
      + (past.at(-1)?.choice > 0 ? 1 : 0) + hashUnit(seed, i) };
  }).sort((a,b) => b.score-a.score);
  const id = candidates[0].item.id;
  const order = [0,1,2].sort((a,b) => hashUnit(seed, a+100)-hashUnit(seed,b+100));
  data.pending = { id, order };
  return data.pending;
}

export function answerReflection(id, displayIndex) {
  const data = journal();
  if (!data.pending || data.pending.id !== id || !Number.isInteger(displayIndex)
      || displayIndex < 0 || displayIndex > 2) return null;
  const choice = data.pending.order[displayIndex];
  const result = { id, choice, lifeId: state.lifeId, formId: state.formId, realmId: state.realmId };
  data.history = [...data.history, result].slice(-140);
  data.pending = null;
  data.count += 1;
  data.nextAt = data.elapsed + 90;
  return result;
}

export function exportReflections() {
  return JSON.parse(JSON.stringify(journal()));
}
export function importReflections(raw) {
  const validId = id => REFLECTIONS.some(item => item.id === id);
  const count = n => Number.isFinite(n) && n >= 0 ? n : 0;
  const data = empty();
  if (raw && typeof raw === 'object') {
    data.lifeKey = typeof raw.lifeKey === 'string' ? raw.lifeKey : '';
    data.history = Array.isArray(raw.history) ? raw.history.filter(entry => entry && validId(entry.id)
      && [0,1,2].includes(entry.choice)).slice(-140).map(entry => ({
        id: entry.id, choice: entry.choice, lifeId: count(entry.lifeId),
        formId: typeof entry.formId === 'string' ? entry.formId : 'human',
        realmId: REALM_MAPS[entry.realmId] ? entry.realmId : 'manussa',
      })) : [];
    data.count = Math.min(3, Math.floor(count(raw.count)));
    data.elapsed = count(raw.elapsed);
    data.nextAt = Math.min(data.elapsed + 90, count(raw.nextAt));
    if (raw.pending && validId(raw.pending.id) && Array.isArray(raw.pending.order)
        && raw.pending.order.length === 3 && new Set(raw.pending.order).size === 3
        && raw.pending.order.every(n => [0,1,2].includes(n))) {
      data.pending = { id: raw.pending.id, order: [...raw.pending.order] };
    }
  }
  state.reflections = data;
}
