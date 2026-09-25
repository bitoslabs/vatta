import { FORMS } from '../content/forms.js';
import { drawFormBody, drawFormAura, drawActFlourish } from '../render/forms-sprites.js';
import { ANIMALS, animalMotion } from './animal-catalog.js';
import { drawAnimalVector } from '../render/animal-vectors.js';
import { canvasFont } from '../systems/fonts.js';
import { registerPwa } from '../systems/pwa.js';

registerPwa();

const names = { human: 'มนุษย์', deer: 'กวาง', dog: 'สุนัข', crane: 'นกกระเรียน', turtle: 'เต่า', monkey: 'ลิง', butterfly: 'ผีเสื้อ', asura: 'อสุร', deva: 'เทวดา', fish: 'ปลา' };
const descriptions = {
  human: 'ร่างพื้นฐานสำหรับเทียบขนาดและความเร็ว', deer: 'ขายาว เคลื่อนที่เร็ว · กด J หรือปุ่มกระโดดเพื่อดูท่ากระโดดและลงพื้น',
  dog: 'ร่างสุนัข · ทดลองเดินและท่ากระดิกหาง', crane: 'ร่างนกกระเรียน · ทดลองกระพือปีกขณะบิน',
  turtle: 'ร่างเต่า · ทดลองการเดินช้าและรูปทรงกระดอง', monkey: 'ร่างลิง · ทดลองจังหวะแขนขาและหาง',
  butterfly: 'ร่างผีเสื้อ · ทดลองปีกในพื้นที่แสดงตัวละคร', asura: 'ร่างอสุร · ทดลองรูปทรงใหญ่และการเดินหนัก',
  deva: 'ร่างเทวดา · ทดลองผ้าพลิ้วและแสงรอบตัว', fish: 'ร่างปลา · ทดลองท่าว่ายน้ำในพื้นที่แสดงตัวละคร',
};
for (const animal of ANIMALS) { names[animal.id] = animal.name; descriptions[animal.id] = animal.description; }
const roster = [...ANIMALS, ...FORMS];
const canvas = document.querySelector('#stage');
const ctx = canvas.getContext('2d');
const select = document.querySelector('#form');
const scale = document.querySelector('#scale');
const action = document.querySelector('#action');
const status = document.querySelector('#status');
const assetStatus = document.querySelector('#asset-status');
const ground = document.querySelector('#ground');
const keys = new Set();
const heldPointers = new Map();
const actor = { x: 480, y: 270, face: 1, phase: 0, action: 0, jump: 0, cooldown: 0 };
let form = ANIMALS[0];
for (const item of roster) {
  const option = document.createElement('option');
  option.value = item.id;
  option.textContent = `${names[item.id] || item.id}${item.ability ? ' · ใหม่' : ''}`;
  select.append(option);
}
select.value = form.id;
function describe() {
  document.querySelector('#description').textContent = descriptions[form.id];
  action.textContent = `${form.ability || (form.id === 'deer' ? 'กระโดด' : 'ทดลองท่า')} (J)`;
  status.textContent = `กำลังทดลอง: ${names[form.id]}`;
}
function reset() {
  Object.assign(actor, { x: 480, y: 270, face: 1, phase: 0, action: 0, jump: 0, cooldown: 0 });
  keys.clear(); heldPointers.clear(); action.disabled = false;
  describe();
}
function perform() {
  if (actor.cooldown > 0) return;
  actor.action = form.duration || .55;
  actor.cooldown = (form.duration || .95) + .35;
  if (form.id === 'deer') actor.jump = .95;
  status.textContent = `${names[form.id]} · ${form.ability || 'ทดลองท่า'} → พัก → พร้อมอีกครั้ง`;
}
select.addEventListener('change', () => { form = roster.find(item => item.id === select.value); reset(); });
document.querySelector('#reset').addEventListener('click', reset);
action.addEventListener('click', perform);
const movement = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright']);
canvas.addEventListener('keydown', event => {
  const key = event.key.toLowerCase();
  if (movement.has(key) || key === 'j') event.preventDefault();
  if (movement.has(key)) keys.add(key);
  if (key === 'j' && !event.repeat) perform();
});
window.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
canvas.addEventListener('blur', () => keys.clear());
function clearInput() { keys.clear(); heldPointers.clear(); }
window.addEventListener('blur', clearInput);
document.addEventListener('visibilitychange', clearInput);
for (const button of document.querySelectorAll('[data-key]')) {
  button.addEventListener('pointerdown', event => {
    event.preventDefault(); button.setPointerCapture(event.pointerId);
    heldPointers.set(event.pointerId, button.dataset.key);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    button.addEventListener(type, event => heldPointers.delete(event.pointerId));
  }
}
const down = key => keys.has(key) || [...heldPointers.values()].includes(key);
const terrain = document.createElement('canvas');
terrain.width = 960; terrain.height = 480;
const brush = terrain.getContext('2d');
const wash = brush.createLinearGradient(0, 0, 0, 480);
wash.addColorStop(0, '#77856c'); wash.addColorStop(1, '#b4ac83');
brush.fillStyle = wash; brush.fillRect(0, 0, 960, 480);
brush.fillStyle = '#c7b68d'; brush.beginPath();
brush.ellipse(480, 310, 470, 170, -.06, 0, Math.PI * 2); brush.fill();
let seed = 42;
const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
for (let i = 0; i < 1600; i++) {
  brush.fillStyle = i % 2 ? 'rgba(75,82,41,.12)' : 'rgba(255,239,195,.18)';
  brush.fillRect(random() * 960, random() * 480, 1 + random() * 3, 1 + random() * 2);
}
for (let i = 0; i < 140; i++) {
  const x = random() * 960, y = random() * 480;
  if (x > 70 && x < 890 && y > 155 && y < 405) continue;
  brush.strokeStyle = '#65764b'; brush.lineWidth = 1.4;
  brush.beginPath(); brush.moveTo(x - 3, y - 5); brush.lineTo(x, y); brush.lineTo(x + 2, y - 8); brush.stroke();
}
let previous = performance.now();
function frame(now) {
  const dt = Math.min(0.04, (now - previous) / 1000); previous = now;
  let dx = Number(down('d') || down('arrowright')) - Number(down('a') || down('arrowleft'));
  let dy = Number(down('s') || down('arrowdown')) - Number(down('w') || down('arrowup'));
  const magnitude = Math.hypot(dx, dy);
  if (magnitude > 1) { dx /= magnitude; dy /= magnitude; }
  const moving = magnitude > 0;
  const motion = form.ability ? animalMotion(form, actor.phase, moving, actor.action) : { speed: 1 };
  const zoom = Number(scale.value);
  const margin = Math.max(100, (form.width || 66) * zoom / 2 + 12);
  actor.x = Math.max(margin, Math.min(960 - margin, actor.x + dx * 135 * form.speed * motion.speed * dt));
  actor.y = Math.max(Math.max(180, (form.width || 66) * zoom * .82 + 32), Math.min(420, actor.y + dy * 135 * form.speed * motion.speed * dt));
  if (dx) actor.face = Math.sign(dx);
  actor.phase += dt * (moving ? 8 : 2);
  actor.action = Math.max(0, actor.action - dt);
  actor.jump = Math.max(0, actor.jump - dt);
  actor.cooldown = Math.max(0, actor.cooldown - dt);
  action.disabled = actor.cooldown > 0;
  ctx.clearRect(0, 0, 960, 480);
  if (ground.value === 'forest') ctx.drawImage(terrain, 0, 0);
  else {
  ctx.strokeStyle = '#cfc6ae'; ctx.lineWidth = 1;
  for (let x = 0; x <= 960; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 480); ctx.stroke(); }
  for (let y = 0; y <= 480; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(960, y); ctx.stroke(); }
  }
  // The lab draws with the same face as the game, per locale (systems/fonts.js).
  ctx.fillStyle = '#405346'; ctx.font = canvasFont(18, 400);
  ctx.fillText(`${names[form.id]} · ×${scale.value}`, 24, 34);
  const jump = actor.jump > 0 ? Math.sin(Math.PI * (1 - actor.jump / .95)) * 22 : 0;
  const kind = form.id === 'fish' ? 'swim' : form.abilities?.flying || form.id === 'butterfly' ? 'fly' : 'walk';
  ctx.save(); ctx.translate(actor.x, actor.y); ctx.scale(Number(scale.value), Number(scale.value));
  if (form.ability) {
    drawAnimalVector(ctx, form, actor, moving);
  } else {
  drawFormAura(ctx, form.id, 0, 0, actor.phase);
  drawFormBody(ctx, form.id, 0, 0, { face: actor.face, phase: actor.phase, bob: Math.sin(actor.phase) * 1.2, moving, kind, act: actor.action, lift: jump });
  if (actor.action > 0) drawActFlourish(ctx, 0, -6 - jump, actor.action);
  }
  ctx.restore();
  const message = `ภาพวาดด้วยโค้ด · ${actor.action > 0 || actor.jump > 0 ? form.ability || 'ทดลองท่า' : moving ? 'เคลื่อนที่' : 'พัก'}`;
  if (assetStatus.textContent !== message) assetStatus.textContent = message;
  requestAnimationFrame(frame);
}
describe(); requestAnimationFrame(frame);
