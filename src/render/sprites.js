'use strict';

import { GATE_OUT, TAU, TEMPLE, SALA } from '../core/constants.js';
import { isMindful } from '../systems/input.js';
import { ctx } from '../systems/viewport.js';
import { STATUS } from '../entities/ghost-status.js';
import { ghost } from '../entities/ghost.js';
import { player } from '../entities/player.js';

export function drawTree(tree, dawn) {
  const sway = Math.sin(performance.now() * 0.0006 + tree.s * 9) * 2;
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath();
  ctx.ellipse(tree.x + 4, tree.y + 6, tree.c * 0.5, tree.c * 0.18, 0, 0, TAU);
  ctx.fill();

  ctx.fillStyle = dawn ? '#241a10' : '#0c0f08';
  ctx.fillRect(tree.x - 2.5, tree.y - 10, 5, 12);

  const canopyLight = dawn ? '#2c4425' : '#0e2013';
  const canopyDark = dawn ? '#243a1f' : '#0b1a0f';

  ctx.fillStyle = canopyLight;
  ctx.beginPath();
  ctx.arc(tree.x + sway * 0.5, tree.y - tree.c * 0.38, tree.c * 0.62, 0, TAU);
  ctx.fill();

  ctx.fillStyle = canopyDark;
  ctx.beginPath();
  ctx.arc(tree.x - tree.c * 0.3 + sway, tree.y - tree.c * 0.18, tree.c * 0.44, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(tree.x + tree.c * 0.34 + sway, tree.y - tree.c * 0.52, tree.c * 0.4, 0, TAU);
  ctx.fill();
}

export function drawPlayer(dawn) {
  const bob = Math.sin(player.bob) * 1.6;

  ctx.fillStyle = 'rgba(0,0,0,.4)';
  ctx.beginPath();
  ctx.ellipse(player.x, player.y + 12, 12, 5, 0, 0, TAU);
  ctx.fill();

  ctx.fillStyle = dawn ? '#e9e2cf' : '#d5cfba';
  ctx.beginPath();
  ctx.ellipse(player.x, player.y + 3 + bob * 0.4, 11, 9, 0, 0, TAU);
  ctx.fill();

  ctx.fillStyle = dawn ? '#caa877' : '#b99a6c';
  ctx.beginPath();
  ctx.arc(player.x, player.y - 8 + bob, 7, 0, TAU);
  ctx.fill();

  ctx.fillStyle = '#141210';
  ctx.beginPath();
  ctx.arc(player.x, player.y - 10 + bob, 6.4, Math.PI, TAU);
  ctx.fill();

  // The little lamp (ta-kai) the player carries.
  const flicker = 0.75 + Math.sin(performance.now() * 0.011) * 0.25;
  ctx.fillStyle = `rgba(255,206,130,${flicker})`;
  ctx.beginPath();
  ctx.arc(player.x + player.face * 10, player.y + 2, 3, 0, TAU);
  ctx.fill();
}

export function drawGhost() {
  const t = performance.now() * 0.003;
  const alpha = ghost.alpha * (ghost.mode === STATUS.FADE ? Math.max(0, Math.min(1, ghost.fade / 1.4)) : 1);
  if (alpha <= 0) return;

  ghost.trail.forEach((point, i) => {
    const trailAlpha = alpha * 0.16 * (1 - i / ghost.trail.length);
    ctx.fillStyle = `rgba(200,235,220,${trailAlpha})`;
    ctx.beginPath();
    ctx.ellipse(point.x, point.y, 10 - i * 0.5, 16 - i * 0.8, 0, 0, TAU);
    ctx.fill();
  });

  const gx = ghost.x;
  const gy = ghost.y + Math.sin(t * 2.2) * 4;
  const shrink = isMindful() ? 0.82 : 1;

  ctx.save();
  ctx.translate(gx, gy);
  ctx.scale(shrink, shrink);
  ctx.globalAlpha = alpha;

  ctx.fillStyle = 'rgba(200,235,225,.16)';
  ctx.beginPath();
  ctx.arc(0, -6, 34, 0, TAU);
  ctx.fill();

  ctx.fillStyle = ghost.tint || 'rgba(208,238,228,.5)';
  ctx.beginPath();
  ctx.moveTo(-13, 26);
  ctx.quadraticCurveTo(-16, -10, -11, -22);
  ctx.ellipse(0, -26, 11.5, 14, 0, Math.PI, TAU);
  ctx.quadraticCurveTo(16, -10, 13, 26);
  ctx.quadraticCurveTo(6, 20 + Math.sin(t * 4) * 4, 0, 26);
  ctx.quadraticCurveTo(-6, 22 - Math.sin(t * 4) * 4, -13, 26);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(4,10,8,.9)';
  ctx.beginPath();
  ctx.ellipse(-4.5, -27, 2.6, 4, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(4.5, -27, 2.6, 4, 0, 0, TAU);
  ctx.fill();

  ctx.restore();
  ctx.globalAlpha = 1;
}

export function drawPrompt(label) {
  const t = performance.now() * 0.004;
  ctx.save();
  ctx.translate(player.x, player.y - 46 + Math.sin(t) * 2);

  ctx.fillStyle = 'rgba(8,12,10,.85)';
  ctx.strokeStyle = 'rgba(214,180,120,.6)';
  ctx.lineWidth = 1;
  ctx.fillRect(-24, -10, 20, 20);
  ctx.strokeRect(-24, -10, 20, 20);

  ctx.fillStyle = '#e9d9a8';
  ctx.font = "500 11px 'Bai Jamjuree'";
  ctx.textAlign = 'center';
  ctx.fillText('E', -14, 4);

  ctx.fillStyle = '#d8d0b8';
  ctx.font = "300 13px 'Bai Jamjuree'";
  ctx.textAlign = 'left';
  ctx.fillText(label, 4, 4);

  ctx.restore();
  ctx.textAlign = 'left';
}

export function drawTemple(dawn) {
  const T = TEMPLE;
  const now = performance.now();

  ctx.fillStyle = dawn ? '#33271a' : '#1c1410';
  ctx.beginPath();
  ctx.ellipse(T.x, T.y, T.r + 60, T.r * 0.72, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(214,180,120,.16)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(T.x, T.y, T.r + 20, T.r * 0.66, 0, 0, TAU);
  ctx.stroke();

  // Ubosot hall.
  const bx = 540;
  const by = 1330;
  ctx.fillStyle = dawn ? '#2c1f12' : '#1a1109';
  ctx.fillRect(bx - 160, by - 40, 320, 180);
  ctx.strokeStyle = 'rgba(214,180,120,.25)';
  ctx.strokeRect(bx - 160, by - 40, 320, 180);

  ctx.fillStyle = dawn ? '#5a3b1a' : '#3a270e';
  ctx.beginPath();
  ctx.moveTo(bx - 185, by - 40);
  ctx.quadraticCurveTo(bx, by - 150, bx + 185, by - 40);
  ctx.lineTo(bx + 150, by - 40);
  ctx.quadraticCurveTo(bx, by - 118, bx - 150, by - 40);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(233,217,160,.3)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(bx - 185, by - 40);
  ctx.quadraticCurveTo(bx, by - 150, bx + 185, by - 40);
  ctx.stroke();

  for (let i = -2; i <= 2; i++) {
    ctx.fillStyle = dawn ? '#4a3010' : '#26180a';
    ctx.fillRect(bx + i * 62 - 6, by - 38, 12, 120);
  }

  // Centipede banners.
  ctx.fillStyle = '#3a270e';
  ctx.fillRect(830, 1240, 6, 180);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i === 0 ? '#8a5a28' : i === 1 ? '#a8752e' : '#7a4a20';
    const wave = Math.sin(now * 0.002 + i) * 6;
    ctx.beginPath();
    ctx.moveTo(836, 1250 + i * 22);
    ctx.lineTo(836 + 58, 1254 + i * 22 + wave * 0.3);
    ctx.lineTo(836, 1258 + i * 22);
    ctx.closePath();
    ctx.fill();
  }

  // Bodhi tree.
  ctx.fillStyle = 'rgba(0,0,0,.4)';
  ctx.beginPath();
  ctx.ellipse(360, 1830, 150, 44, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = dawn ? '#2a1c0e' : '#120c06';
  ctx.fillRect(344, 1700, 32, 130);
  const canopy = dawn ? '#2e4826' : '#102415';
  ctx.fillStyle = canopy;
  ctx.beginPath(); ctx.arc(360, 1690, 120, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(260, 1730, 74, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(460, 1720, 70, 0, TAU); ctx.fill();
  ctx.fillStyle = dawn ? '#25401e' : '#0c1c11';
  ctx.beginPath(); ctx.arc(360, 1660, 80, 0, TAU); ctx.fill();

  // Candles.
  const candles = [[470, 1420], [700, 1540], [560, 1650], [820, 1600], [380, 1560]];
  for (const [cx, cy] of candles) {
    const flicker = 0.7 + Math.sin(now * 0.01 + cx) * 0.3;
    ctx.fillStyle = `rgba(255,190,110,${flicker})`;
    ctx.beginPath(); ctx.arc(cx, cy, 2.6, 0, TAU); ctx.fill();
    ctx.fillStyle = `rgba(255,170,90,${flicker * 0.2})`;
    ctx.beginPath(); ctx.arc(cx, cy, 14, 0, TAU); ctx.fill();
  }

  // The elder monk.
  const mx = 700;
  const my = 1450;
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath(); ctx.ellipse(mx, my + 12, 14, 5, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = dawn ? '#b08a4a' : '#8a6a34';
  ctx.beginPath();
  ctx.moveTo(mx - 13, my + 12);
  ctx.quadraticCurveTo(mx - 15, my - 14, mx, my - 18);
  ctx.quadraticCurveTo(mx + 15, my - 14, mx + 13, my + 12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = dawn ? '#caa877' : '#a8865a';
  ctx.beginPath(); ctx.arc(mx, my - 24, 8, 0, TAU); ctx.fill();

  // Temple gate (exit to the east).
  ctx.fillStyle = dawn ? '#3a2a16' : '#1e1408';
  ctx.fillRect(GATE_OUT.x - 14, GATE_OUT.y - 58, 14, 116);
  ctx.fillRect(GATE_OUT.x + 42, GATE_OUT.y - 58, 14, 116);
  ctx.fillRect(GATE_OUT.x - 20, GATE_OUT.y - 74, 82, 16);
  ctx.strokeStyle = 'rgba(233,217,160,.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(GATE_OUT.x - 20, GATE_OUT.y - 74, 82, 16);
}

export function drawSala(dawn) {
  const S = SALA;
  const now = performance.now();

  ctx.fillStyle = dawn ? '#3a2a16' : '#241708';
  ctx.fillRect(S.x - 110, S.y - 80, 220, 160);
  ctx.strokeStyle = 'rgba(214,180,120,.2)';
  ctx.strokeRect(S.x - 110, S.y - 80, 220, 160);

  for (let i = -2; i <= 2; i++) {
    ctx.fillStyle = dawn ? '#2c1c0c' : '#170f06';
    ctx.fillRect(S.x + i * 48 - 6, S.y - 76, 12, 150);
  }

  ctx.fillStyle = dawn ? '#5a3b1a' : '#33220c';
  ctx.beginPath();
  ctx.moveTo(S.x - 140, S.y - 80);
  ctx.quadraticCurveTo(S.x, S.y - 160, S.x + 140, S.y - 80);
  ctx.lineTo(S.x + 110, S.y - 80);
  ctx.quadraticCurveTo(S.x, S.y - 128, S.x - 110, S.y - 80);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(233,217,160,.35)';
  ctx.beginPath();
  ctx.moveTo(S.x - 140, S.y - 80);
  ctx.quadraticCurveTo(S.x, S.y - 160, S.x + 140, S.y - 80);
  ctx.stroke();

  const flicker = 0.8 + Math.sin(now * 0.013) * 0.2;
  ctx.fillStyle = `rgba(255,196,120,${flicker})`;
  ctx.beginPath(); ctx.arc(S.x, S.y - 14, 4, 0, TAU); ctx.fill();
  ctx.fillStyle = `rgba(255,170,90,${flicker * 0.22})`;
  ctx.beginPath(); ctx.arc(S.x, S.y - 14, 26, 0, TAU); ctx.fill();
}
