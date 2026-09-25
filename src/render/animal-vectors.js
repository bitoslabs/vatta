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
    case 'boar': {
      // Low and heavy: the snout down in the soil, the ridge bristled, short legs.
      const root = moving ? Math.sin(actor.phase * 1.4) * 2.5 : 0;
      // the body, a thick wedge, with the rump behind it
      ellipse(-4, -11, 20, 12, '#6b5644');
      ellipse(-18, -13, 9, 9, '#61503f');
      // the bristled ridge along the back
      for (let i = 0; i < 6; i++) {
        const x = -18 + i * 5.4;
        line([[x, -20], [x - 1.5, -26]], '#4a3a2c', 1.6);
      }
      // the head, low and forward, rooting into the ground
      ellipse(15, -8 + root, 11, 9, '#5f4c3c');
      ellipse(24, -5 + root, 5, 4, '#4d3d30');
      eye(16, -12);
      line([[13, -16], [10, -24], [16, -20]], '#5f4c3c', 2.4);
      // small tusks, turned to the soil rather than to anyone
      line([[27, -3 + root], [32, 1 + root]], '#e0d8c0', 2);
      line([[27, -6 + root], [31, -11 + root]], '#e0d8c0', 2);
      // short heavy legs
      for (const [legX, lift] of [[-14, 0], [-6, 1], [4, 0], [12, 1]]) {
        const stepLeg = step * (lift ? -1 : 1) * 1.4;
        line([[legX, -3], [legX + stepLeg, 4]], '#5a4a3a', 3.4);
      }
      if (active) for (let i = 0; i < 4; i++) {
        ellipse(30 + i * 5, 3 + i, 4 - i * .5, 2, 'rgba(150,128,92,.45)');
      }
      break;
    }
    case 'firefly': {
      // A small dark body with a lamp: the flicker is the whole creature.
      const flicker = 0.55 + Math.abs(Math.sin(actor.phase * 2.2)) * 0.45;
      // the body
      ellipse(0, -14, 5, 7, '#3a3630');
      // wings, lifted and pale
      ellipse(-4, -20, 6, 3.4, 'rgba(226,232,238,.5)');
      ellipse(5, -20, 6, 3.4, 'rgba(226,232,238,.5)');
      // the lamp, and its halo
      ctx.fillStyle = `rgba(248,236,168,${(flicker * 0.35).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(0, -9, 7 + flicker * 5, 0, Math.PI * 2);
      ctx.fill();
      ellipse(0, -9, 3, 3, `rgba(248,244,196,${flicker.toFixed(2)})`);
      if (active) {
        // signalling: the rhythm, written out
        ctx.fillStyle = 'rgba(248,236,168,.55)';
        for (let i = 1; i <= 3; i++) {
          ctx.beginPath();
          ctx.arc(0, -9, 12 + i * 9, -0.6, 0.6);
          ctx.fill();
        }
      }
      break;
    }
    case 'beetle': {
      // Low, domed and heavy at the front: this is a body built to push.
      const shove = moving ? Math.abs(Math.sin(actor.phase * 1.6)) * 2 : 0;
      // six legs, braced
      for (const [side, spread] of [[-1, 7], [-1, 12], [1, 12], [1, 7]]) {
        line([[-2, 0], [side * spread, 3]], '#3a3428', 2.4);
      }
      // the shell
      ellipse(-2, -8, 13, 9, '#4a4132');
      ellipse(-2, -8, 9, 6, '#5b5140');
      line([[-12, -8], [4, -12]], '#6d6250', 1.6);
      // the head and the horn it pushes with
      ellipse(10, -6 + shove, 6, 5, '#3f382c');
      line([[14, -6 + shove], [21, -9 + shove]], '#8a7d63', 3);
      eye(11, -8 + shove);
      if (active) {
        // the push itself: dust, and a straight line of effort
        for (let i = 0; i < 4; i++) {
          ellipse(-16 - i * 5, 4, 4 - i * 0.5, 1.8, 'rgba(150,132,96,.5)');
        }
      }
      break;
    }
    case 'spider': {
      // Low and round, eight legs bent high, and a thread trailing behind.
      const drum = moving ? Math.abs(Math.sin(actor.phase * 3)) : 0;
      for (const [side, spread] of [[-1, 12], [-1, 6], [1, 6], [1, 12]]) {
        const lift = spread + drum * 2;
        line([[-2, 0], [side * lift * 0.6, -lift], [side * (lift + 8), 2]], '#3f3a44', 2.2);
        line([[4, 0], [side * lift * 0.7 + 4, -lift * 0.8], [side * (lift + 6) + 6, 3]], '#4a4450', 2);
      }
      // the body: two beads
      ellipse(2, -4, 9, 7, '#4a4450');
      ellipse(12, -3, 6, 5, '#3f3a44');
      eye(14, -5);
      eye(11, -6);
      line([[16, 2], [22, 6]], '#b9c4d6', 1.4);
      if (active) {
        // the thread it is spinning
        line([[20, 4], [30, -6]], 'rgba(220,228,240,.6)', 1.6);
        line([[30, -6], [24, -2]], 'rgba(220,228,240,.4)', 1.2);
      }
      break;
    }
    case 'snail': {
      // A spiral shell carried low, with the body stretching forward as it crawls.
      const stretch = moving ? Math.abs(Math.sin(actor.phase * 0.6)) * 4 : 0;
      // the foot: a long low smear that leads the shell
      ellipse(6 + stretch, 0, 16, 4.5, '#b7a98d');
      // the head and its two eye stalks
      ellipse(19 + stretch, -2, 5, 4, '#c8bba0');
      for (const side of [-1, 1]) {
        line([[19 + stretch, -4], [21 + stretch + side * 1.5, -11]], '#a99b80', 1.4);
        ellipse(21.5 + stretch + side * 1.5, -12, 1.6, 1.6, '#3d3a30');
      }
      // the shell: a spiral, the one shape everyone knows
      ellipse(-6, -5, 10, 9, '#8a7355');
      line([[-6, -5], [-2, -9], [-8, -12], [-12, -6], [-8, -2], [-4, -5]], '#c9b48f', 1.8);
      if (active) for (let i = 0; i < 3; i++) {
        ellipse(4 - i * 8, 3, 4 - i, 1.6, 'rgba(168,198,180,.5)');
      }
      break;
    }
    case 'buffalo': {
      // A broad low body with a heavy head and horns; slow legs, a fly-swish tail.
      const swish = Math.sin(actor.phase * 0.9) * 5;
      line([[-18, -8], [-28, -10 + swish], [-33, -16 + swish * 1.5]], '#5a5348', 2.2);
      ellipse(-2, -12, 22, 13, '#6d6459');
      ellipse(16, -14, 12, 11, '#7c7266');
      for (const side of [-1, 1]) {
        line([[16, -20], [12, -27], [15 - side * 2, -30]], '#4f4a40', 3);
      }
      eye(20, -16);
      ellipse(25, -9, 5, 4, '#8d8377');
      for (const [legX, lift] of [[-12, 0], [-4, 1], [6, 0], [14, 1]]) {
        const stepLeg = step * (lift ? -1 : 1) * 1.6;
        line([[legX, -6], [legX + stepLeg, 2]], '#5a5348', 3.4);
      }
      if (active) for (let i = 0; i < 3; i++) {
        ellipse(24 + i * 7, -4 + i * 2, 4, 2, 'rgba(160,140,100,.4)');
      }
      break;
    }
    case 'cat': {
      // A long low body with a raised tail, drawn standing on the ridge of a wall:
      // the tail is the balance, so it swings with the step.
      const swing = Math.sin(actor.phase * 1.2) * 6;
      line([[-14, -6], [-24, -10 + swing], [-30, -20 + swing * 1.6], [-26, -28 + swing]], '#6b6256', 3.6);
      ellipse(-2, -8, 15, 8, '#8d8375');
      ellipse(9, -11, 8, 7, '#9c9285');
      for (const side of [-1, 1]) {
        line([[10 + side * 3, -15], [13 + side * 4, -22]], '#7d7467', 2.6);
      }
      eye(12, -12);
      line([[14, -9], [17, -7]], '#6b6256', 1.2);
      for (const [legX, lift] of [[-8, 0], [-2, 1], [5, 0], [10, 1]]) {
        const stepLeg = step * (lift ? -1 : 1) * 2.2;
        line([[legX, -3], [legX + stepLeg, 1]], '#6b6256', 2.6);
      }
      if (active) for (let i = 0; i < 2; i++) {
        ctx.strokeStyle = `rgba(216,200,168,${.4 - i * .14})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(12, -12, 6 + i * 6, -0.7, 0.7);
        ctx.stroke();
      }
      break;
    }
    case 'bee': {
      // A striped abdomen, two pairs of wings beating fast, and a pollen basket.
      const beat = Math.sin(actor.phase * 4) * 4;
      ctx.globalAlpha *= 0.75;
      for (const side of [-1, 1]) {
        ellipse(-2, -16 - beat * .3, 11, 4, 'rgba(226,232,240,.5)', side * .5);
      }
      ctx.globalAlpha /= 0.75;
      ellipse(-8, -12, 9, 7, '#e0c05a');
      for (let i = 0; i < 3; i++) {
        line([[-11 + i * 3, -18], [-11 + i * 3, -6]], 'rgba(40,34,20,.75)', 2.2);
      }
      ellipse(4, -13, 7, 6, '#5a4a2e');
      eye(7, -15);
      line([[9, -16], [13, -21], [17, -22]], '#3f3420', 1.2);
      line([[9, -12], [14, -15], [18, -14]], '#3f3420', 1.2);
      for (const side of [-1, 1]) line([[-4, -8], [-6 + side, -4], [-3 + side, -3]], '#3f3420', 1.4);
      // the pollen basket: fuller as the bee works (the flourish)
      if (active) ellipse(-10, -6, 4.4, 3.4, '#e8c86a', .3);
      else ellipse(-10, -6, 2.6, 2, 'rgba(232,200,106,.7)');
      break;
    }
    case 'otter': {
      // A long low body with a thick tapering tail, paddling: drawn in profile so
      // the tail reads behind it.
      const paddle = Math.sin(actor.phase * 1.5) * 3;
      line([[-8, -6], [-20, -4 + paddle], [-30, -6 + paddle * 1.4]], '#6b5340', 4);
      ellipse(-2, -8, 14, 8, '#8a6b4e');
      ellipse(8, -11, 8, 6.5, '#9b7a58');
      ellipse(12, -14, 4.5, 4, '#a8875f');
      eye(13, -15);
      line([[10, -9], [14, -7], [16, -4]], '#6b5340', 1.6);
      for (const side of [-1, 1]) {
        const swing = step * side * 2.6;
        line([[-4, -3], [-1 + swing, 1], [2 + swing, 3]], '#6b5340', 2.4);
        line([[4, -3], [7 - swing, 1], [10 - swing, 3]], '#6b5340', 2.4);
      }
      for (const side of [-1, 1]) {
        line([[side * 3, -12], [side * 7, -17], [side * 11, -19]], '#6b5340', 2);
      }
      if (active) ellipse(18, -10, 6, 3.4, '#9fd6b8', .35);
      break;
    }
    case 'crab': {
      // A wide low shell with claws forward and legs out to the sides, walking
      // sideways: the body is drawn as a shield, the legs tick in step.
      for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
        const x = side * (7 + i * 5);
        const tick = step * side * 2.2 * (i % 2 ? -1 : 1);
        line([[x, -4], [x + side * 4, -1 + tick * .3], [x + side * 7, 2 + tick * .5]], '#8a4f42', 2.2);
      }
      ellipse(0, -7, 13, 8, '#b5644f');
      ellipse(0, -9, 10, 5, '#c9775f');
      eye(-5, -12); eye(5, -12);
      // claws, held up in front (and to the sides — this body faces you)
      for (const side of [-1, 1]) {
        const lift = active ? 3 : 0;
        line([[side * 10, -8], [side * 15, -12 - lift], [side * 18, -16 - lift]], '#8a4f42', 2.6);
        ellipse(side * 19, -17 - lift, 4.4, 3.4, '#c9775f', side * .4);
      }
      if (active) for (let i = 0; i < 3; i++) {
        ellipse(-10 + i * 10, -20 - i * 2, 3, 1.4, 'rgba(159,198,221,.55)');
      }
      break;
    }
    case 'squirrel': {
      // An upright body with a plume of a tail, and paws that hold a seed.
      const wag = Math.sin(actor.phase * 1.4) * 4;
      line([[-6, -6], [-14, -14 + step], [-9, -20]], '#8a6b45', 3.4);
      ellipse(-2, -9, 9, 8, '#a8825a');
      ellipse(0, -20, 6.5, 6, '#b98f63');
      line([[2, -25], [4, -30], [7, -31]], '#8a6b45', 1.6);
      eye(3, -21);
      for (const side of [-1, 1]) {
        line([[side * 2, -2], [side * 4, 2]], '#8a6b45', 1.8);
      }
      // the tail: the animal's signature, drawn last so it reads over the body
      line([[-6, -6], [-16, -12 + wag], [-20, -24 + wag * 1.4], [-13, -30 + wag]], '#9c7b4e', 5);
      if (active) ellipse(5, -14, 5, 4, '#d9bd7b', .3);
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
