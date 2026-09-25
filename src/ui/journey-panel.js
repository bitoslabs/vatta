import { state } from '../core/state.js';
import { MODE } from '../core/constants.js';
import { on, EVENTS } from '../core/events.js';
import { REALMS, REALM_GROUPS } from '../content/realms.js';
import { REALM_MAPS, mapIdentity } from '../content/realm-maps.js';
import { formAbilityKey, formNameKey } from '../content/forms.js';
import { REFLECTIONS, REFLECTION_THEMES } from '../content/reflections.js';
import { journeyCopy } from '../locales/journey.js';
import { getLocale, t } from '../systems/i18n.js';
import { currentMapId } from '../systems/biome.js';
import { perspectiveFor } from '../systems/perspective.js';
import { answerReflection, exportReflections, reflectionReady, reserveReflection } from '../systems/reflections.js';
import { saveRun } from '../systems/save.js';
import { startExplore, isExploring } from '../systems/explore.js';
import { input } from '../systems/input.js';
import { routeForPlane, RIVER } from '../world/world-data.js';
import { player } from '../entities/player.js';
import { drawFormBody } from '../render/forms-sprites.js';

let overlay, content, launch, priorFocus;
let tab = 'atlas', selected = null;
const local = values => values[['th','lo','en'].indexOf(getLocale())] || values[2];
export const journeyText = key => local(journeyCopy[key]);
function node(tag, className, text) {
  const el = document.createElement(tag);
  el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}
function button(text, fn, className = 'journey-button') {
  const el = node('button', className, text);
  el.type = 'button';
  el.addEventListener('click', fn);
  return el;
}
function svgNode(tag, attrs) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key,value] of Object.entries(attrs)) el.setAttribute(key, value);
  return el;
}
function mapPreview(id) {
  const here = id === state.realmId;
  const mapId = here ? currentMapId() : mapIdentity(id);
  const points = here && state.formId === 'fish' ? RIVER : routeForPlane(mapId);
  const svg = svgNode('svg', { viewBox: '850 650 3350 1400', role: 'img', 'aria-label': journeyText('route') });
  if (here && state.formId === 'fish') svg.setAttribute('viewBox','1050 0 900 3200');
  svg.appendChild(svgNode('polyline', { points: points.map(p=>p.join(',')).join(' '), fill: 'none', stroke: REALM_MAPS[id].accent, 'stroke-width': 16, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
  for (const point of [points[0],points.at(-1)]) {
    svg.appendChild(svgNode('circle',{ cx:point[0], cy:point[1], r:28, fill:REALM_MAPS[id].accent }));
  }
  if (here) svg.appendChild(svgNode('circle', { cx:player.x,cy:player.y,r:34,fill:'#fff',stroke:'#162522','stroke-width':12 }));
  return svg;
}
function renderAtlas() {
  const layout = node('div','journey-atlas');
  const list = node('div','journey-realms');
  for (const group of REALM_GROUPS) {
    list.appendChild(node('h3','journey-group',t(group.labelKey)));
    for (const realm of REALMS.filter(item=>item.group===group.id)) {
      const el = button(`${realm.id === state.realmId ? '● ' : ''}${t(realm.nameKey)}`, () => {
        selected=realm.id; render();
        content.querySelector(`[data-realm="${selected}"]`)?.focus();
      }, `journey-realm${selected===realm.id?' selected':''}`);
      el.dataset.realm = realm.id;
      el.setAttribute('aria-pressed',String(selected===realm.id));
      list.appendChild(el);
    }
  }
  const detail = node('section','journey-detail');
  const profile = REALM_MAPS[selected] || REALM_MAPS.manussa;
  detail.style.setProperty('--realm-accent',profile.accent);
  detail.appendChild(node('p','journey-eyebrow',journeyText(selected===state.realmId?'here':'preview')));
  detail.appendChild(node('h2','',t(profile.nameKey)));
  detail.appendChild(mapPreview(profile.id));
  detail.appendChild(node('p','journey-muted',journeyText('route')));
  detail.appendChild(node('p','',t(`realm.${profile.id}.desc`)));
  detail.appendChild(node('p','journey-muted',journeyText('mapNote')));
  if (isExploring()) detail.appendChild(button(journeyText('visit'),()=> {
    const realmId = selected;
    closeJourney();
    startExplore({ formId:state.formId,chapterId:state.chapter,realmId });
  }));
  else detail.appendChild(node('p','journey-muted',journeyText('exploreNote')));
  layout.appendChild(list); layout.appendChild(detail); content.appendChild(layout);
}
function feedback(result, parent) {
  const item = REFLECTIONS.find(item=>item.id===result.id);
  if (!item) return;
  const theme = REFLECTION_THEMES[item.theme];
  const card = node('section','journey-feedback');
  card.setAttribute('role','status');
  card.appendChild(node('h3','',journeyText(result.choice===0?'constructive':'reconsider')));
  card.appendChild(node('p','',local(theme.feedback)));
  parent.appendChild(card);
}
function renderReflection() {
  content.appendChild(node('p','journey-muted',journeyText('questionNote')));
  const pending = reserveReflection();
  if (!pending) {
    content.appendChild(node('p','journey-rest',journeyText('later')));
    const last = exportReflections().history.at(-1);
    if (last) feedback(last,content);
    return;
  }
  saveRun(); // Reserve question and option order before showing either.
  const item = REFLECTIONS.find(item=>item.id===pending.id);
  const theme = REFLECTION_THEMES[item.theme];
  content.appendChild(node('p','journey-eyebrow',local(theme.label)));
  content.appendChild(node('h2','journey-question',local(item.question)));
  const options = node('div','journey-options');
  pending.order.forEach((option,i)=>options.appendChild(button(local(theme.options[option]),()=> {
    const result = answerReflection(item.id,i);
    if (!result) return;
    saveRun(); render();
  })));
  content.appendChild(options);
}
function renderHistory() {
  const history = exportReflections().history;
  if (!history.length) content.appendChild(node('p','journey-rest',journeyText('empty')));
  for (const entry of history.slice(-20).reverse()) {
    const item = REFLECTIONS.find(item=>item.id===entry.id);
    const card = node('article','journey-history');
    card.appendChild(node('p','journey-eyebrow',`${entry.lifeId} · ${t(formNameKey(entry.formId))} · ${t(REALM_MAPS[entry.realmId]?.nameKey || REALM_MAPS.manussa.nameKey)}`));
    card.appendChild(node('h3','',local(item.question)));
    card.appendChild(node('p','journey-muted',local(REFLECTION_THEMES[item.theme].options[entry.choice])));
    feedback(entry,card); content.appendChild(card);
  }
}
function render() {
  if (!overlay) return;
  overlay.innerHTML='';
  const shell=node('div','journey-shell');
  const heading=node('header','journey-heading');
  const titles=node('div','');
  titles.appendChild(node('p','journey-eyebrow','VATTA / '+journeyText('title')));
  const title=node('h1','',journeyText('title')); title.id='journeyTitle'; titles.appendChild(title);
  titles.appendChild(node('p','journey-muted',journeyText('subtitle')));
  heading.appendChild(titles); heading.appendChild(button(journeyText('close'),closeJourney));
  shell.appendChild(heading);
  const body=node('section','journey-body');
  const canvas=document.createElement('canvas'); canvas.width=100;canvas.height=80;
  const ctx=canvas.getContext('2d');
  if(ctx) drawFormBody(ctx,state.formId,50,60,{ pose:'idle',face:1,phase:.4,t:1 });
  body.appendChild(canvas);
  const identity=node('div','');
  identity.appendChild(node('p','journey-eyebrow',journeyText('body')));
  identity.appendChild(node('h2','',t(formNameKey(state.formId))));
  identity.appendChild(node('p','',journeyText(perspectiveFor().sense)));
  identity.appendChild(node('p','journey-muted',t(formAbilityKey(state.formId))));
  body.appendChild(identity); shell.appendChild(body);
  const nav=node('nav','journey-tabs');
  nav.setAttribute('aria-label',journeyText('title'));
  for(const id of ['atlas','reflection','history']) {
    const el=button(journeyText(id),()=>{tab=id;render();overlay.querySelector(`[data-tab="${id}"]`)?.focus();},tab===id?'active':'');
    el.dataset.tab=id;el.setAttribute('aria-current',String(tab===id));nav.appendChild(el);
  }
  shell.appendChild(nav); content=node('div','journey-content'); shell.appendChild(content);
  overlay.appendChild(shell);
  if(tab==='atlas') renderAtlas(); else if(tab==='reflection') renderReflection(); else renderHistory();
}
export function closeJourney() {
  state.journeyPanelOpen=false;
  overlay?.classList.add('hidden');
  priorFocus?.focus?.();
}
export function openJourney() {
  if (!overlay || state.mode!==MODE.WORLD || state.dialogueOpen || state.choiceOpen || state.story.ended || state.story.released) return;
  priorFocus=document.activeElement;
  state.journeyPanelOpen=true;
  input.keys={}; input.joy.dx=0;input.joy.dy=0;input.run=false;input.sati=false;
  selected=state.realmId; render(); overlay.classList.remove('hidden');
  overlay.querySelector('button')?.focus();
}
let statusKey='';
export function updateJourneyLauncher() {
  if(!launch) return;
  const visible=state.mode===MODE.WORLD && !state.story.released && !state.story.ended && !state.dialogueOpen && !state.choiceOpen;
  launch.classList.toggle('hidden',!visible);
  const key=`${getLocale()}:${reflectionReady()}:${state.formId}`;
  if(key===statusKey)return;
  statusKey=key;
  launch.textContent=journeyText('open')+(reflectionReady()?' · ●':'');
  launch.title=journeyText(perspectiveFor().sense);
}
export function initJourneyPanel() {
  launch=document.querySelector('#journeyLaunch');overlay=document.querySelector('#journeyOverlay');
  if(!launch || !overlay)return;
  launch.addEventListener('click',openJourney);
  overlay.addEventListener('keydown',event=> {
    if(event.key==='Escape'){event.preventDefault();closeJourney();}
    if(event.key==='Tab'){
      const controls=[...overlay.querySelectorAll('button:not([disabled])')];
      const first=controls[0],last=controls.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    }
  });
  on(EVENTS.LOCALE_CHANGED,()=>{statusKey='';if(state.journeyPanelOpen)render();});
}
