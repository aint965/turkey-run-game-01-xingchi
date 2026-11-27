// screens.js — every screen that is not the run itself: the title screen, the
// HUD that rides along the top of a run, the pause card, and both end screens
// (caught and escaped). Buttons are drawn on the canvas and their rectangles
// are returned so main.js can hit-test mouse clicks against them.
import { VIEW_W, VIEW_H, STAGES, ESCAPE_DISTANCE_M } from './config.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawButton(ctx, x, y, w, h, label, hover) {
  ctx.save();
  ctx.fillStyle = hover ? '#ff8a3c' : '#e07b2a';
  roundRect(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = '#7a3a10';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  ctx.restore();
  return { x, y, w, h };
}

function panel(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = 'rgba(43,26,16,0.82)';
  roundRect(ctx, x, y, w, h, 20);
  ctx.fill();
  ctx.strokeStyle = '#e8a13a';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

export function drawTitle(ctx, best, mouse) {
  ctx.save();
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  grad.addColorStop(0, '#f7b733');
  grad.addColorStop(0.55, '#e8862e');
  grad.addColorStop(1, '#8e3b2f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Autumn leaves drifting.
  for (let i = 0; i < 14; i++) {
    const lx = (i * 173) % VIEW_W;
    const ly = (i * 97) % 300 + 40;
    ctx.fillStyle = i % 3 ? '#d97b2e' : '#b5541f';
    ctx.beginPath(); ctx.ellipse(lx, ly, 12, 6, (i * 0.7) % 1.2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#2b1a10';
  ctx.beginPath(); ctx.ellipse(640, 640, 420, 26, 0, 0, Math.PI * 2); ctx.fill();

  panel(ctx, 150, 84, 980, 540);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'bold 84px sans-serif';
  ctx.fillText('TURKEY RUN!', 640, 190);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText('Escape becoming Thanksgiving dinner!', 640, 244);
  ctx.fillStyle = '#ffd9a0';
  ctx.font = '22px sans-serif';
  ctx.fillText('Farmer Bram is behind you. The oven is hot.', 640, 288);
  ctx.fillText('The carving knife is sharp. Run for the forest!', 640, 318);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 21px sans-serif';
  ctx.fillText('SPACE / ↑  jump (twice for a double jump)      ↓  slide & hide', 640, 380);
  ctx.fillText('← →  slow down / speed up      M  mute      P  pause', 640, 412);
  ctx.fillStyle = '#ffd23e';
  ctx.font = '20px sans-serif';
  ctx.fillText('Grab corn for points — but never let the farmer catch you.', 640, 448);
  if (best.score > 0) {
    ctx.fillStyle = '#9fd8ff';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(`Best escape so far: ${best.score} pts — ${best.distance} m`, 640, 486);
  }
  const hover = mouse.x >= 490 && mouse.x <= 790 && mouse.y >= 512 && mouse.y <= 576;
  const start = drawButton(ctx, 490, 512, 300, 64, '▶  START RUN', hover);
  // A friendly turkey peeking over the panel's bottom-right corner.
  ctx.save();
  ctx.translate(1090, 622);
  ctx.scale(0.55, 0.55);
  const featherColors = ['#c96a2b', '#e8a13a', '#8a5a2b', '#d97b4f', '#b5541f'];
  for (let i = 0; i < 5; i++) {
    ctx.save();
    ctx.translate(-52, -88);
    ctx.rotate(-0.6 - i * 0.3);
    ctx.fillStyle = featherColors[i];
    ctx.beginPath(); ctx.ellipse(0, -42, 15, 44, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  ctx.strokeStyle = '#e07b2a'; ctx.lineWidth = 7; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-12, -14); ctx.lineTo(-16, 0); ctx.moveTo(12, -14); ctx.lineTo(16, 0); ctx.stroke();
  ctx.fillStyle = '#6b4423';
  ctx.beginPath(); ctx.ellipse(0, -55, 62, 48, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#8a5a2b';
  ctx.beginPath(); ctx.ellipse(10, -46, 44, 34, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c98a4b';
  ctx.beginPath(); ctx.arc(48, -118, 22, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(54, -122, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1c1c1c';
  ctx.beginPath(); ctx.arc(57, -122, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8a13a';
  ctx.beginPath(); ctx.moveTo(66, -120); ctx.lineTo(88, -113); ctx.lineTo(66, -106); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#d23b2e';
  ctx.beginPath(); ctx.ellipse(62, -100, 5, 9, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.restore();
  return { start };
}

export function drawHud(ctx, state) {
  ctx.save();
  ctx.fillStyle = 'rgba(43,26,16,0.78)';
  roundRect(ctx, 16, 14, 1248, 64, 12);
  ctx.fill();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(`SCORE ${Math.floor(state.score)}`, 34, 46);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(`${Math.floor(state.distanceM)} m / ${ESCAPE_DISTANCE_M} m`, 300, 46);
  const stage = STAGES[state.stageIndex];
  ctx.fillStyle = '#ffb37a';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(stage.name, 560, 46);
  // Lives as hearts.
  for (let i = 0; i < 3; i++) {
    const hx = 830 + i * 40;
    ctx.fillStyle = i < state.lives ? '#ff4d4d' : 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.arc(hx, 42, 11, 0, Math.PI * 2);
    ctx.arc(hx + 14, 42, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx - 8, 46); ctx.lineTo(hx + 22, 46); ctx.lineTo(hx + 7, 62); ctx.closePath(); ctx.fill();
  }
  // Corn count.
  ctx.fillStyle = '#f2c230';
  ctx.beginPath(); ctx.ellipse(1010, 46, 10, 15, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(`x ${state.corn}`, 1028, 46);
  ctx.fillStyle = state.muted ? '#ff8a8a' : '#9fd8ff';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(state.muted ? 'MUTED (M)' : 'SOUND ON (M)', 1108, 46);

  // Progress bar to the forest gate.
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  roundRect(ctx, 16, 86, 1248, 10, 5);
  ctx.fill();
  ctx.fillStyle = '#7ddc7d';
  const frac = Math.min(1, state.distanceM / ESCAPE_DISTANCE_M);
  roundRect(ctx, 16, 86, Math.max(10, 1248 * frac), 10, 5);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('🌲 FOREST GATE', 1264, 112);

  // Farmer proximity warning.
  if (state.farmerGap < 90 && state.screen === 'playing') {
    const blink = Math.floor(state.time * 6) % 2 === 0;
    ctx.fillStyle = blink ? '#ff3b2e' : '#fff';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("⚠ HE'S RIGHT BEHIND YOU! RUN! ⚠", 640, 140);
  }
  // Stage banner, shown briefly after each stage change.
  if (state.banner > 0) {
    ctx.globalAlpha = Math.min(1, state.banner * 2);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(stage.name, 640, 240);
    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = '#ffd23e';
    ctx.fillText(stage.tagline, 640, 282);
    ctx.globalAlpha = 1;
  }
  // "SPOTTED!" flash on a hit.
  if (state.flash > 0) {
    ctx.globalAlpha = Math.min(0.55, state.flash);
    ctx.fillStyle = '#ff3b2e';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 52px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SPOTTED!', 640, 330);
  }
  ctx.restore();
}

export function drawPaused(ctx, mouse) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  panel(ctx, 440, 240, 400, 220);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText('PAUSED', 640, 310);
  ctx.fillStyle = '#ffd9a0';
  ctx.font = '22px sans-serif';
  ctx.fillText('The turkey waits… the farmer does not.', 640, 352);
  const hover = mouse.x >= 540 && mouse.x <= 740 && mouse.y >= 380 && mouse.y <= 436;
  const resume = drawButton(ctx, 540, 380, 200, 56, 'RESUME', hover);
  ctx.restore();
  return { resume };
}

export function drawEnd(ctx, state, mouse) {
  ctx.save();
  const escaped = state.screen === 'escaped';
  ctx.fillStyle = escaped ? 'rgba(20,60,25,0.72)' : 'rgba(60,15,10,0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  panel(ctx, 290, 110, 700, 500);
  ctx.textAlign = 'center';
  if (escaped) {
    ctx.fillStyle = '#7ddc7d';
    ctx.font = 'bold 72px sans-serif';
    ctx.fillText('ESCAPED!', 640, 200);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('The turkey made it to the forest!', 640, 250);
    ctx.font = '22px sans-serif';
    ctx.fillStyle = '#ffd9a0';
    ctx.fillText('Farmer Bram is still looking under the hay bales.', 640, 284);
    ctx.fillText('No turkey became dinner today. Gobble gobble!', 640, 314);
  } else {
    ctx.fillStyle = '#ff6a5a';
    ctx.font = 'bold 72px sans-serif';
    ctx.fillText('CAUGHT!', 640, 200);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('Farmer Bram got his Thanksgiving dinner…', 640, 250);
    ctx.font = '22px sans-serif';
    ctx.fillStyle = '#ffd9a0';
    ctx.fillText('…almost. This turkey has nine lives of running left.', 640, 284);
    ctx.fillText('Shake those feathers and try again!', 640, 314);
  }
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText(`SCORE  ${Math.floor(state.score)}`, 640, 380);
  ctx.font = '24px sans-serif';
  ctx.fillText(`Distance  ${Math.floor(state.distanceM)} m    •    Corn  x ${state.corn}    •    Stage  ${STAGES[state.stageIndex].name}`, 640, 420);
  const isBest = state.score >= state.best.score && state.score > 0;
  if (isBest) {
    ctx.fillStyle = '#ffd23e';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('★ NEW BEST ESCAPE! ★', 640, 458);
  } else if (state.best.score > 0) {
    ctx.fillStyle = '#9fd8ff';
    ctx.font = '22px sans-serif';
    ctx.fillText(`Best escape: ${state.best.score} pts — ${state.best.distance} m`, 640, 458);
  }
  const hover = mouse.x >= 490 && mouse.x <= 790 && mouse.y >= 496 && mouse.y <= 560;
  const again = drawButton(ctx, 490, 496, 300, 64, escaped ? 'RUN AGAIN' : 'TRY AGAIN', hover);
  ctx.fillStyle = '#ffd9a0';
  ctx.font = '20px sans-serif';
  ctx.fillText('or press SPACE to run again', 640, 590);
  ctx.restore();
  return { again };
}
