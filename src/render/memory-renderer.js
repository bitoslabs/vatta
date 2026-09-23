'use strict';

import { TAU } from '../core/constants.js';
import { clamp, lerp } from '../core/math.js';
import { viewport } from '../systems/viewport.js';
import { $ } from '../ui/dom.js';
import { mem } from '../game/memory.js';

const canvas = $('#memCv');
const g = canvas.getContext('2d');

/** Render the warm-memory scene: fireplace glow, dust, mother and child. */
export function renderMemoryScene(dt) {
  const { W, H } = viewport;
  if (canvas.width !== W) {
    canvas.width = W;
    canvas.height = H;
  }

  mem.t += dt;
  g.clearRect(0, 0, W, H);

  const cold = mem.phase === 'cold';
  const warm = mem.phase === 'warm';
  if (warm) mem.warm = clamp(mem.warm + dt * 0.25, 0, 1);

  drawFireplace(W, H, cold, warm);
  drawDust(W, H, warm, dt);
  drawFigures(W, H);
  if (warm) drawWarmSpecks(W, H);
}

function drawFireplace(W, H, cold, warm) {
  g.fillStyle = cold ? '#050a10' : '#0a0603';
  g.fillRect(0, 0, W, H);

  const fx = W / 2;
  const fy = H * 0.62;
  const flicker = 0.85 + Math.sin(mem.t * 9) * 0.06 + Math.sin(mem.t * 23) * 0.04;
  const glow = g.createRadialGradient(fx, fy, 10, fx, fy, H * 0.42 * flicker);
  const color = cold ? [70, 110, 150] : [190, 130, 60];
  glow.addColorStop(0, `rgba(${color[0]},${color[1]},${color[2]},${0.34 + mem.warm * 0.2})`);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);
}

function drawDust(W, H, warm, dt) {
  g.fillStyle = warm ? 'rgba(240,220,160,.5)' : 'rgba(200,190,170,.25)';
  for (const particle of mem.particles) {
    particle.y -= particle.v * dt;
    if (particle.y < 0) particle.y = 1;
    const x = particle.x * W + Math.sin(mem.t * 0.7 + particle.s * 9) * 8;
    const y = particle.y * H;
    g.beginPath();
    g.arc(x, y, 1 + particle.s, 0, TAU);
    g.fill();
  }
}

function drawFigures(W, H) {
  const opacity = lerp(1, 0, mem.warm * 0.9);
  const fx = W / 2;
  const fy = H * 0.62;

  g.fillStyle = `rgba(10,6,3,${0.92 * opacity})`;
  g.save();
  g.translate(fx, fy);

  // Mother.
  g.beginPath(); g.arc(0, -72, 24, 0, TAU); g.fill();
  g.beginPath();
  g.moveTo(-26, 96);
  g.quadraticCurveTo(-34, -20, -8, -48);
  g.quadraticCurveTo(30, -30, 38, 96);
  g.closePath();
  g.fill();

  // Child leaning in.
  g.fillStyle = `rgba(10,6,3,${0.8 * opacity})`;
  g.beginPath(); g.arc(52, -30, 15, 0, TAU); g.fill();
  g.beginPath();
  g.moveTo(40, 96);
  g.quadraticCurveTo(38, -10, 66, -18);
  g.quadraticCurveTo(86, 10, 84, 96);
  g.closePath();
  g.fill();

  g.restore();
}

function drawWarmSpecks(W, H) {
  const fx = W / 2;
  const fy = H * 0.62;
  g.fillStyle = 'rgba(240,215,150,.6)';
  for (let i = 0; i < 24; i++) {
    const t = (mem.t * 0.14 + i * 0.13) % 1;
    g.beginPath();
    g.arc(fx + Math.sin(i * 2.4 + mem.t * 0.6) * 70, fy - t * H * 0.5, 1.6 + t * 2, 0, TAU);
    g.fill();
  }
}
