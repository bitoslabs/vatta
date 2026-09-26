import assert from 'node:assert/strict';
import { planNextLife } from '../src/systems/life-route.js';
import { FORMS } from '../src/content/forms.js';
import { inWater } from '../src/systems/forms.js';

const elements = new Map();
function element() {
 const classes=new Set(['hidden']); const events={};
 return {style:{},dataset:{},children:[],textContent:'',innerHTML:'',
 classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle(x,yes){if(yes)classes.add(x);else classes.delete(x);}},
 addEventListener:(key,fn)=>events[key]=fn,click(){events.click?.({target:{blur(){}}});},
 appendChild(child){this.children.push(child);},querySelectorAll:()=>[],getContext:()=>({}),setAttribute(){}};
}
const query = id => { if(!elements.has(id))elements.set(id,element());return elements.get(id); };
globalThis.document={hidden:false,querySelector:query,querySelectorAll:()=>[],getElementById:id=>query('#'+id),createElement:element};
globalThis.window={matchMedia:()=>({matches:false}),addEventListener(){}};
const storage=new Map(); globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
let nextTimer=0; const timers=new Map();
globalThis.setInterval=fn=>{const id=++nextTimer;timers.set(id,fn);return id;};
globalThis.clearInterval=id=>timers.delete(id);
const tick=()=>[...timers.values()].forEach(fn=>fn());

// A planned life must be one the body can actually start: a water-bound body is
// born in water (game/chapters.js#chapterSpawn), not on the bank — the old rule was
// simply "never offer a fish", before there was anywhere for it to be born.
const { CHAPTERS, chapterSpawn } = await import('../src/game/chapters.js');
const chapterIds = Array.from({length:14},(_,i)=>i+1);
let route = {chapter:1,lifeId:1,history:['human'],chapterIds};
for(let i=0;i<140;i++) {
 const next=planNextLife(route);
 assert.equal(next.chapter,route.chapter%14+1);
 assert.ok(!route.history.slice(-2).includes(next.formId));
 const form = FORMS.find(entry=>entry.id===next.formId);
 assert.ok(form, `the planned form ${next.formId} exists`);
 if (form.waterBound) {
   const chapter = CHAPTERS.find(entry=>entry.id===next.chapter) || { start: { x: 0, y: 0 } };
   const spawn = chapterSpawn(chapter, { waterBound: true, start: chapter.start });
   assert.equal(inWater(spawn.x, spawn.y), true, 'a water-bound body is born in water');
 }
 assert.deepEqual(next,planNextLife(route));
 route={...next,history:[...route.history,next.formId],chapterIds};
}
const {state}=await import('../src/core/state.js');
const {MODE}=await import('../src/core/constants.js');
const {showLifeSummary,initLifeSummary}=await import('../src/ui/life-summary.js');
const {readSave,applySaveRuntime}=await import('../src/systems/save.js');
const {loadChapter}=await import('../src/game/chapters.js');
initLifeSummary();
Object.assign(state,{lifeMode:true,lifeId:1,chapter:1,formId:'human',formHistory:['human'],lifeLog:[],journeyComplete:false,liberated:false});
showLifeSummary(); showLifeSummary();
assert.equal(timers.size,1); assert.equal(state.lifeLog.length,1); assert.equal(state.mode,MODE.END);
query('#lifeClose').click(); for(let i=0;i<7;i++)tick(); assert.equal(state.lifeId,1);
query('#lifeClose').click(); document.hidden=true; for(let i=0;i<7;i++)tick();assert.equal(state.lifeId,1);document.hidden=false;
for(let i=0;i<5;i++)tick();
assert.equal(state.lifeId,2);assert.equal(state.chapter,2);assert.equal(state.formId,'human');assert.equal(state.mode,MODE.WORLD);assert.equal(timers.size,0);
query('#lifeReborn').click();assert.equal(state.lifeId,2);
showLifeSummary();const saved=readSave();assert.equal(saved.lifeLog.length,2);
applySaveRuntime(saved);loadChapter(saved.chapter,{autosave:false});applySaveRuntime(saved);showLifeSummary();
query('#lifeReborn').click();assert.equal(state.lifeId,3);assert.equal(state.chapter,3);assert.equal(timers.size,0);
showLifeSummary();for(let i=0;i<5;i++)tick();assert.equal(state.lifeId,4);assert.equal(state.chapter,4);
state.liberated=true;showLifeSummary();assert.equal(timers.size,0);
const { upgradeLegacyLifeMode } = await import('../src/systems/life.js');
state.liberated = false;
state.journeyComplete = false;
state.lifeMode = false;
state.lifeId = 1;
state.formId = 'human';
state.formHistory = [];
state.runId = '';
assert.equal(upgradeLegacyLifeMode(), true, 'an older story save enters the life cycle');
assert.equal(state.lifeMode, true);
assert.deepEqual(state.formHistory, ['human']);
assert.equal(readSave().lifeMode, true, 'the upgrade is kept in the save');
console.log('PASS: duplicate completion, pause, hidden tab, auto/manual rebirth, save/resume, beyond 3 lives, liberation guard');
