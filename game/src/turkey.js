// turkey.js — the player: physics (run, jump, double jump, slide/hide) and the
// canvas-drawn turkey itself. The turkey is drawn entirely in code: a plump
// brown body, a fanned tail, a red wattle and a panicked expression that sells
// the escape. Legs pump while running; the body squashes on landing.
import { GRAVITY, GROUND_Y, JUMP_VELOCITY, DOUBLE_JUMP_VELOCITY, SLIDE_TIME, TURKEY_X } from './config.js';

export function createTurkey() {
  return {
    x: TURKEY_X, y: GROUND_Y, vy: 0,
    jumps: 0, sliding: 0, runPhase: 0, squash: 0, stretch: 0,
    invulnerable: 0, blink: 0, justLanded: false,
  };
}

export function turkeyHitbox(t) {
  if (t.sliding > 0) return { x: t.x - 34, y: t.y - 34, w: 78, h: 34 };
  return { x: t.x - 30, y: t.y - 72, w: 62, h: 72 };
}

export function turkeyJump(t, sounds) {
  // Returns true when a jump actually fired (single or double), false when
  // the press could not act (sliding, or both jumps already spent). The
  // caller (action buffer) keeps a false press for a short window instead of
  // dropping it.
  if (t.sliding > 0) return false;
  if (t.y >= GROUND_Y && t.jumps === 0) {
    t.vy = JUMP_VELOCITY; t.jumps = 1; t.squash = 0; t.stretch = 1; sounds.jump();
    return true;
  } else if (t.jumps === 1) {
    t.vy = DOUBLE_JUMP_VELOCITY; t.jumps = 2; t.squash = 0; t.stretch = 1; sounds.jump();
    return true;
  }
  return false;
}

export function turkeySlide(t, sounds) {
  if (t.y < GROUND_Y) return false; // can't hide mid-air
  if (t.sliding <= 0) sounds.slide();
  t.sliding = SLIDE_TIME;
  return true;
}

export function updateTurkey(t, dt, speed) {
  t.runPhase += dt * (6 + speed / 60);
  if (t.squash > 0) t.squash = Math.max(0, t.squash - dt * 4);
  if (t.stretch > 0) t.stretch = Math.max(0, t.stretch - dt * 5);
  if (t.sliding > 0) t.sliding = Math.max(0, t.sliding - dt);
  if (t.invulnerable > 0) { t.invulnerable = Math.max(0, t.invulnerable - dt); t.blink += dt * 18; }
  if (t.y < GROUND_Y || t.vy !== 0) {
    t.vy += GRAVITY * dt;
    t.y += t.vy * dt;
    if (t.y >= GROUND_Y) { t.y = GROUND_Y; t.vy = 0; t.jumps = 0; t.squash = 1; t.justLanded = true; }
  }
}

// easeOutBack: 0 -> 0, 1 -> 1, with an overshoot past 1 in between — the
// squash settles exactly at rest (scale 1) instead of easing to a stop.
function easeOutBack(u) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);
}

export function drawTurkey(ctx, t) {
  if (t.invulnerable > 0 && Math.floor(t.blink) % 2 === 0) return; // hurt blink
  const air = t.y < GROUND_Y;
  const slide = t.sliding > 0;
  // Squash & stretch (game-feel): landing squashes to 0.7 tall / 1.3 wide and
  // springs back with an overshoot, ending exactly at 1; a jump stretches to
  // 1.15 tall / 0.88 wide and relaxes. Both timers end at exactly scale 1.
  const e = easeOutBack(1 - t.squash);
  const squashY = 1 - 0.30 * (1 - e);
  const squashX = 1 + 0.30 * (1 - e);
  const stretchY = 1 + 0.15 * t.stretch;
  const stretchX = 1 - 0.12 * t.stretch;
  const legSwing = air ? 0.5 : Math.sin(t.runPhase) * 0.9;
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.scale(squashX * stretchX, squashY * stretchY);

  if (slide) {
    // Hiding low: body flattened, tail tucked, eyes peeking over the back.
    ctx.fillStyle = '#6b4423';
    ctx.beginPath(); ctx.ellipse(4, -18, 46, 16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8a5a2b';
    ctx.beginPath(); ctx.ellipse(10, -24, 30, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(38, -30, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1c1c1c';
    ctx.beginPath(); ctx.arc(40, -30, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8a13a';
    ctx.beginPath(); ctx.moveTo(46, -32); ctx.lineTo(58, -28); ctx.lineTo(46, -24); ctx.closePath(); ctx.fill();
    ctx.restore();
    return;
  }

  // Tail fan: five autumn feathers fanning behind the body.
  const featherColors = ['#c96a2b', '#e8a13a', '#8a5a2b', '#d97b4f', '#b5541f'];
  for (let i = 0; i < 5; i++) {
    const a = -0.55 - i * 0.42;
    ctx.save();
    ctx.translate(-26, -46);
    ctx.rotate(a);
    ctx.fillStyle = featherColors[i];
    ctx.beginPath(); ctx.ellipse(0, -30, 11, 32, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,235,180,0.85)';
    ctx.beginPath(); ctx.ellipse(0, -52, 5, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // Legs: two orange sticks pumping while running, tucked while airborne.
  ctx.strokeStyle = '#e07b2a';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  const legA = legSwing * 12;
  ctx.beginPath(); ctx.moveTo(-8, -14); ctx.lineTo(-8 + legA, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(8, -14); ctx.lineTo(8 - legA, 0); ctx.stroke();

  // Body: a plump brown oval with a lighter belly.
  ctx.fillStyle = '#6b4423';
  ctx.beginPath(); ctx.ellipse(0, -42, 34, 30, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#8a5a2b';
  ctx.beginPath(); ctx.ellipse(6, -36, 24, 20, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#a9743f';
  ctx.beginPath(); ctx.ellipse(10, -30, 14, 10, 0, 0, Math.PI * 2); ctx.fill();

  // Wing, flapping a little when airborne.
  const flap = air ? -0.5 : Math.sin(t.runPhase * 0.5) * 0.08;
  ctx.save();
  ctx.translate(-6, -46);
  ctx.rotate(flap);
  ctx.fillStyle = '#5a3a1e';
  ctx.beginPath(); ctx.ellipse(0, 0, 20, 12, -0.4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Neck + head, leaning forward into the run.
  ctx.fillStyle = '#8a5a2b';
  ctx.beginPath(); ctx.ellipse(24, -72, 9, 16, 0.25, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c98a4b';
  ctx.beginPath(); ctx.arc(30, -88, 13, 0, Math.PI * 2); ctx.fill();
  // Panicked eye, wide white with a darting pupil.
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(34, -90, 5.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1c1c1c';
  ctx.beginPath(); ctx.arc(36, -90, 2.6, 0, Math.PI * 2); ctx.fill();
  // Beak + wattle.
  ctx.fillStyle = '#e8a13a';
  ctx.beginPath(); ctx.moveTo(40, -90); ctx.lineTo(52, -86); ctx.lineTo(40, -82); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#d23b2e';
  ctx.beginPath(); ctx.ellipse(38, -78, 4, 7, 0.3, 0, Math.PI * 2); ctx.fill();
  // Sweat drop of comic panic.
  ctx.fillStyle = '#9fd8ff';
  ctx.beginPath(); ctx.arc(18, -102, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
