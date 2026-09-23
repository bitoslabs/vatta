'use strict';

/** Mutable viewport metrics, updated on resize. */
export const viewport = { W: 0, H: 0, DPR: 1 };

export const canvas = document.getElementById('cv');
export const ctx = canvas.getContext('2d');

/** Off-screen buffer used to composite the darkness / light layer. */
export const lightCanvas = document.createElement('canvas');
export const lightCtx = lightCanvas.getContext('2d');

export function resizeViewport() {
  viewport.DPR = Math.min(window.devicePixelRatio || 1, 2);
  viewport.W = window.innerWidth;
  viewport.H = window.innerHeight;
  canvas.width = viewport.W * viewport.DPR;
  canvas.height = viewport.H * viewport.DPR;
  canvas.style.width = `${viewport.W}px`;
  canvas.style.height = `${viewport.H}px`;
  ctx.setTransform(viewport.DPR, 0, 0, viewport.DPR, 0, 0);
  lightCanvas.width = viewport.W;
  lightCanvas.height = viewport.H;
}

export function initViewport() {
  resizeViewport();
  window.addEventListener('resize', resizeViewport);
}
