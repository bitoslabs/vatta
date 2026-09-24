/** Simple Canvas paths, matching the original game's procedural characters. */
import { animalMotion } from '../prototypes/animal-catalog.js';

export function drawAnimalVector(ctx, animal, actor, moving, options = {}) {
  const motion = animalMotion(animal, actor.phase, moving, actor.action);
  const step = moving ? Math.sin(actor.phase) : 0;
  const active = motion.active;
  const ellipse = (x, y, rx, ry, color, angle = 0) => {
    ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, angle, 0, Math.PI * 2); ctx.fill();
  };
  const line = (points, color, width = 2) => {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
  };
  const eye = (x, y) => { ellipse(x, y, 1.7, 1.9, '#1e2925'); ellipse(x + .5, y - .6, .5, .5, '#fff5db'); };
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // The main game draws the shared shadow itself; the lab relies on this one.
  if (options.shadow !== false) {
    ellipse(0, 2, animal.id === 'elephant' ? 24 : 16, 3.5, `rgba(0,0,0,${.23 - motion.lift * .004})`);
  }
  if (animal.id === 'worm' && active) {
    ctx.setLineDash([2, 3]); line([[-20, 2], [0, 5], [20, 2]], '#81634d', 2); ctx.setLineDash([]);
  }
  ctx.translate(0, -motion.lift); ctx.scale(actor.face, 1); ctx.globalAlpha = motion.alpha;
  switch (animal.id) {
    case 'worm': {
      for (let i = 0; i < 12; i++) {
        const x = -22 + i * 4;
        const y = -3 - Math.sin(i * .55 + actor.phase * (moving ? 1 : .3)) * 3;
        ellipse(x, y, 3.1, i === 7 || i === 8 ? 3.5 : 2.8, i === 7 || i === 8 ? '#a86b60' : '#ca9180');
      }
      break;
    }
    case 'ant': {
      for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
        const x = -6 + i * 5, swing = step * (i % 2 ? -1 : 1) * side * 3;
        line([[x, -8], [x - 3 + swing, -2], [x + side * 5 + swing, 2]], '#624334', 1.3);
      }
      ellipse(-12, -9, 8, 5, '#79503b'); ellipse(0, -10, 5, 3.7, '#986446'); ellipse(9, -12, 5, 4.5, '#79503b');
      line([[10, -16], [13, -22], [18, -24]], '#624334', 1);
      line([[7, -16], [7, -22], [11, -25]], '#624334', 1);
      eye(11, -13);
      if (active) ellipse(20, -9, 6, 3.5, '#d9bd7b', -.35);
      break;
    }
    case 'frog': {
      ellipse(-8, -4, 8, 5, '#658755');
      line([[-10, -8], [-17, -2], [-7 - step * 2, 1]], '#4d724c', 3);
      ellipse(1, -8, 12, 7, '#86a85e'); ellipse(8, -11, 7, 5, '#96b76e');
      ellipse(10, -16, 3.5, 4, '#b4c889'); eye(11, -17);
      line([[7, -5], [12 + step * 2, 1], [17, 1]], '#658755', 2);
      ellipse(0, -5, 5, 2, '#c9c897');
      break;
    }
    case 'snake': {
      const points = [];
      for (let i = 0; i < 25; i++) points.push([-25 + i * 2, -4 + Math.sin(i * .35 + actor.phase) * (active ? 1 : 5)]);
      line(points, '#596f47', 5); line(points, '#8eaa69', 2);
      const [x, y] = points[24]; ellipse(x + 1, y - 1, 5, 3.5, '#81995a'); eye(x + 3, y - 2);
      if (active) line([[x + 6, y], [x + 10, y]], '#ac7765', .8);
      break;
    }
    case 'rabbit': {
      ellipse(-2, -10, 12, 8, '#b19b7d'); ellipse(-10, -4, 7, 5, '#9c876e');
      ellipse(-15, -10, 4, 4, '#e0d5bd');
      line([[-7, -3], [-3 + step * 3, 1]], '#8e7863', 3);
      line([[8, -6], [10 - step * 3, 1]], '#8e7863', 2);
      ellipse(10, -15, 6, 6, '#c2ab8c');
      ellipse(7, -26, 2.8, 9, '#b19b7d', -.15); ellipse(12, -26, 2.8, 9, '#c2ab8c', .2);
      ellipse(12, -26, 1, 6, '#d9b0a0', .2); eye(13, -16);
      break;
    }
    case 'elephant': {
      for (const [x, sign] of [[-16, 1], [-8, -1], [8, -1], [16, 1]]) {
        line([[x, -12], [x + step * sign * 3, 1]], '#758785', 6);
      }
      ellipse(-3, -20, 23, 15, '#8e9e98'); ellipse(19, -23, 12, 12, '#9aaa9f');
      ellipse(11, -24, 9, 12, '#7a918a');
      ctx.strokeStyle = '#9aaa9f'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(27, -22);
      ctx.quadraticCurveTo(39, active ? -42 : 3, 32, active ? -42 : 0); ctx.stroke();
      line([[-25, -23], [-30, -11], [-29, -7]], '#687f78', 2); eye(23, -27);
      break;
    }
    case 'tiger': {
      const crouch = active ? 5 : 0;
      for (const [x, sign] of [[-13, 1], [-7, -1], [10, -1], [16, 1]]) {
        line([[x, -9 + crouch], [x + step * sign * 3, 1]], '#b48045', 3);
      }
      line([[-21, -12], [-29, -16 + step * 2], [-32, -23]], '#b48045', 3);
      ellipse(-2, -14 + crouch, 21, 8, '#c49353'); ellipse(20, -16 + crouch, 8, 7, '#d1a263');
      ellipse(17, -23 + crouch, 3, 3, '#7d6143'); ellipse(25, -13 + crouch, 5, 3, '#daccab');
      for (const x of [-14, -6, 2, 10]) line([[x, -20 + crouch], [x + 2, -14 + crouch]], '#514a38', 2);
      eye(23, -18 + crouch);
      break;
    }
    case 'bat': {
      // Wings spread on a beat, and the ears that do the seeing.
      const flap = Math.sin(actor.phase * 1.6) * 8;
      for (const side of [-1, 1]) {
        line([[side * 4, -16], [side * 20, -20 - flap * .3], [side * 30, -14 - flap * .5], [side * 22, -8]], '#4a4356', 3);
        line([[side * 8, -14], [side * 22, -16 - flap * .3], [side * 28, -12]], 'rgba(90,82,104,.8)', 1.4);
      }
      ellipse(0, -14, 8, 9, '#5d5468');
      ellipse(0, -22, 6.5, 6, '#6d6379');
      for (const side of [-1, 1]) {
        line([[side * 3, -26], [side * 7, -34], [side * 4, -28]], '#4a4356', 2.2);
      }
      if (!active) { ellipse(-3, -21, 1.6, 1.8, '#1e1b24'); ellipse(3, -21, 1.6, 1.8, '#1e1b24'); }
      if (active) for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = `rgba(203,214,234,${.5 - i * .14})`; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(0, -18, 14 + i * 9 + step * 2, 0, Math.PI * 2); ctx.stroke();
      }
      break;
    }
    case 'gecko': {
      // A low splayed lizard: four legs out to the sides, a long tail, wide eyes.
      for (const side of [-1, 1]) for (const [legX, reach] of [[-6, 7], [5, 6]]) {
        const swing = step * side * 2.4;
        line([[legX, -5], [legX + side * 5, -2], [legX + side * reach, 1 + swing * .3]], '#5f7550', 2.4);
      }
      line([[-10, -6], [-19, -4 + step * 1.6], [-25, -6 + step * 2.6]], '#7d9463', 3);
      ellipse(0, -7, 13, 6.5, '#8aa06a');
      ellipse(-5, -9, 6, 4, '#9db27b', -.2);
      ellipse(9, -9, 7, 5.5, '#8aa06a');
      eye(11, -11);
      line([[1, -11], [3, -14], [6, -15]], '#6b7f57', 1.2);
      if (active) for (let i = 0; i < 3; i++) ellipse(-16 + i * 8, -12, 3.4, 1.6, 'rgba(214,232,190,.5)');
      break;
    }
    case 'owl': {
      const flap = Math.sin(actor.phase * 2) * 7;
      if (active) {
        for (const side of [-1, 1]) ellipse(side * 17, -16 - flap * .4, 17, 5, '#87785e', side * (.4 + flap * .06));
      }
      ellipse(0, -12, 10, 13, '#8c7e66'); ellipse(0, -24, 11, 9, '#9d8e72');
      for (const side of [-1, 1]) {
        ellipse(side * 4, -24, 4.8, 5, '#d6c8a4'); eye(side * 4, -24);
        line([[side * 3, -1], [side * 6, 2]], '#a28c5b', 1.5);
      }
      line([[-1, -20], [0, -17], [2, -20]], '#c6aa62', 1.5);
      if (!active) { ellipse(-7, -11, 3, 9, '#716951', -.2); ellipse(7, -11, 3, 9, '#716951', .2); }
      break;
    }
  }
  ctx.restore();
}
