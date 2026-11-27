// hazards.js — everything the turkey must dodge or collect: ovens, carving
// knives, fences, hay bales and corn. Each hazard knows how to spawn, move,
// collide and draw itself. Knives swing from above (jump or slide past),
// ovens and hay bales sit on the ground (jump them), fences are low (slide
// under them). Corn floats in arcs and is always worth the risk.
import { GROUND_Y } from './config.js';

let nextId = 1;

export function makeHazard(kind, x, rng) {
  const base = { id: nextId++, kind, x, passed: false, phase: rng() * Math.PI * 2 };
  if (kind === 'oven') return { ...base, w: 92, h: 110, y: GROUND_Y - 110 };
  if (kind === 'hay') return { ...base, w: 84, h: 62, y: GROUND_Y - 62 };
  if (kind === 'fence') return { ...base, w: 70, h: 58, y: GROUND_Y - 58 };
  if (kind === 'knife') return { ...base, w: 46, h: 150, y: GROUND_Y - 150, swing: 0 };
  return base;
}

export function makeCorn(x, y) {
  return { id: nextId++, kind: 'corn', x, y, w: 34, h: 44, taken: false, phase: Math.random() * Math.PI * 2 };
}

// A rare pumpkin-pie heart: restores one lost life (or +100 points at full
// health). The turkey's one chance to undo a mistake.
export function makeHeart(x, y) {
  return { id: nextId++, kind: 'heart', x, y, w: 36, h: 34, taken: false, phase: Math.random() * Math.PI * 2 };
}

export function hazardHitbox(h) {
  if (h.kind === 'knife') {
    // Only the blade near the ground hurts; the rope above is harmless.
    return { x: h.x - 14, y: h.y + 62, w: 28, h: 88 };
  }
  if (h.kind === 'fence') {
    // The fence is one top rail on posts: sliding under the rail is safe,
    // running into it standing up is not.
    return { x: h.x - 32, y: h.y, w: 64, h: 18 };
  }
  return { x: h.x - h.w / 2, y: h.y, w: h.w, h: h.h };
}

export function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function updateHazard(h, dt, time) {
  if (h.kind === 'knife') h.swing = Math.sin(time * 2.2 + h.phase) * 0.35;
}

export function drawHazard(ctx, h) {
  ctx.save();
  if (h.kind === 'oven') {
    // A squat iron oven, door glowing with fire, chimney puffing smoke.
    ctx.fillStyle = '#3a3a40';
    ctx.fillRect(h.x - 46, h.y, 92, 110);
    ctx.fillStyle = '#55555e';
    ctx.fillRect(h.x - 46, h.y, 92, 12);
    ctx.fillStyle = '#22222a';
    ctx.fillRect(h.x - 34, h.y + 30, 68, 56);
    // Fire glow: solid colour + globalAlpha instead of a fresh rgba string
    // every frame (no string building in the hot loop).
    const flicker = 0.75 + Math.sin(h.phase * 7 + Date.now() / 90) * 0.25;
    ctx.globalAlpha = flicker;
    ctx.fillStyle = '#ff7814';
    ctx.fillRect(h.x - 28, h.y + 36, 56, 44);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath();
    ctx.moveTo(h.x - 18, h.y + 76); ctx.lineTo(h.x - 6, h.y + 44); ctx.lineTo(h.x + 4, h.y + 76);
    ctx.lineTo(h.x + 14, h.y + 52); ctx.lineTo(h.x + 22, h.y + 76);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c9c9c9';
    ctx.fillRect(h.x - 10, h.y + 92, 20, 4);
    ctx.fillStyle = '#3a3a40';
    ctx.fillRect(h.x + 22, h.y - 26, 16, 26);
    ctx.fillStyle = 'rgba(200,200,200,0.5)';
    ctx.beginPath(); ctx.arc(h.x + 30, h.y - 36, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff5a2a';
    ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('HOT!', h.x, h.y + 20);
  } else if (h.kind === 'hay') {
    // A golden hay bale with twine bands.
    ctx.fillStyle = '#d8a93c';
    ctx.beginPath(); ctx.ellipse(h.x, h.y + 31, 44, 31, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8c25e';
    ctx.beginPath(); ctx.ellipse(h.x, h.y + 26, 38, 24, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#a87c1e';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(h.x, h.y + 31, 44, 31, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(h.x - 16, h.y + 4); ctx.lineTo(h.x - 16, h.y + 58); ctx.moveTo(h.x + 16, h.y + 4); ctx.lineTo(h.x + 16, h.y + 58); ctx.stroke();
    // Loose straw sticking out.
    ctx.strokeStyle = '#f0d47a';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const sx = h.x - 30 + i * 15;
      ctx.beginPath(); ctx.moveTo(sx, h.y + 6); ctx.lineTo(sx + 4, h.y - 8); ctx.stroke();
    }
  } else if (h.kind === 'fence') {
    // A low wooden fence: one top rail on two posts — slide under the rail.
    ctx.fillStyle = '#7a4a26';
    ctx.fillRect(h.x - 35, h.y + 2, 70, 9);
    ctx.fillStyle = '#8f5a2e';
    ctx.fillRect(h.x - 32, h.y, 8, 58);
    ctx.fillRect(h.x + 24, h.y, 8, 58);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('SLIDE!', h.x, h.y - 6);
  } else if (h.kind === 'knife') {
    // A huge carving knife swinging from a rope — the blade is the danger.
    ctx.save();
    ctx.translate(h.x, h.y - 10);
    ctx.rotate(h.swing);
    ctx.strokeStyle = '#5a3a1e';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 58); ctx.stroke();
    ctx.fillStyle = '#2b1a10';
    ctx.fillRect(-7, 58, 14, 34);
    ctx.fillStyle = '#e8ecf2';
    ctx.beginPath();
    ctx.moveTo(-11, 92); ctx.lineTo(11, 92); ctx.lineTo(6, 158); ctx.lineTo(0, 170); ctx.lineTo(-6, 158);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#9aa2b0';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-11, 92); ctx.lineTo(11, 92); ctx.lineTo(6, 158); ctx.lineTo(0, 170); ctx.lineTo(-6, 158); ctx.closePath(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath(); ctx.moveTo(-5, 98); ctx.lineTo(2, 150); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

export function drawCorn(ctx, c, time) {
  const bob = Math.sin(time * 3 + c.phase) * 4;
  ctx.save();
  ctx.translate(c.x, c.y + bob);
  ctx.fillStyle = '#2f7a2e';
  ctx.beginPath(); ctx.ellipse(0, -22, 6, 12, -0.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, -22, 6, 12, 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f2c230';
  ctx.beginPath(); ctx.ellipse(0, 0, 13, 20, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#d8a93c';
  for (let r = -1; r <= 1; r++) {
    ctx.beginPath(); ctx.ellipse(r * 6, 0, 2.5, 18, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath(); ctx.ellipse(-5, -8, 3, 8, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function drawHeart(ctx, c, time) {
  const bob = Math.sin(time * 3 + c.phase) * 4;
  const pulse = 1 + Math.sin(time * 5 + c.phase) * 0.12;
  ctx.save();
  ctx.translate(c.x, c.y + bob);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = '#ff4d6d';
  ctx.beginPath();
  ctx.moveTo(0, 12);
  ctx.bezierCurveTo(-18, -4, -12, -18, 0, -8);
  ctx.bezierCurveTo(12, -18, 18, -4, 0, 12);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath(); ctx.arc(-6, -8, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('+1 LIFE', 0, 26);
  ctx.restore();
}
