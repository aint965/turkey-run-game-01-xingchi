// stages.js — the three stages of the escape, painted as parallax scenery:
// the sunny farmyard, the dusty barn, and the tiled kitchen, ending in the
// forest gate the turkey runs through to freedom. Each stage draws its own
// sky, sun, distant shapes, mid-ground props and ground, all in code.
import { GROUND_Y, VIEW_W, VIEW_H, STAGES } from './config.js';

// The sky gradient depends only on the stage colours: one cached gradient
// per stage, rebuilt only when the stage changes.
let skyGradCache = { stage: -1, grad: null };

function drawSun(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,240,180,0.35)';
  ctx.beginPath(); ctx.arc(x, y, r * 1.5, 0, Math.PI * 2); ctx.fill();
}

function drawCloud(ctx, x, y, s, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 22 * s, 0, Math.PI * 2);
  ctx.arc(x + 24 * s, y - 8 * s, 18 * s, 0, Math.PI * 2);
  ctx.arc(x + 48 * s, y, 20 * s, 0, Math.PI * 2);
  ctx.fill();
}

function drawPumpkin(ctx, x, y, s) {
  ctx.fillStyle = '#e07b2a';
  ctx.beginPath(); ctx.ellipse(x, y, 26 * s, 21 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f09a3e';
  ctx.beginPath(); ctx.ellipse(x, y, 15 * s, 19 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#b5541f';
  ctx.lineWidth = 2 * s;
  ctx.beginPath(); ctx.moveTo(x - 10 * s, y - 18 * s); ctx.quadraticCurveTo(x - 13 * s, y, x - 10 * s, y + 18 * s); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 10 * s, y - 18 * s); ctx.quadraticCurveTo(x + 13 * s, y, x + 10 * s, y + 18 * s); ctx.stroke();
  ctx.fillStyle = '#4a7a2e';
  ctx.fillRect(x - 2 * s, y - 28 * s, 5 * s, 10 * s);
}

function drawTree(ctx, x, y, s, trunk, leaf) {
  ctx.fillStyle = trunk;
  ctx.fillRect(x - 6 * s, y - 46 * s, 12 * s, 46 * s);
  ctx.fillStyle = leaf;
  ctx.beginPath(); ctx.arc(x, y - 62 * s, 30 * s, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x - 22 * s, y - 44 * s, 20 * s, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 22 * s, y - 44 * s, 20 * s, 0, Math.PI * 2); ctx.fill();
}

function drawCurtain(ctx, x, y, w, h) {
  // Gingham curtain: red panels with cream stripes and a darker hem.
  ctx.fillStyle = '#a03a2e';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(247,232,200,0.8)';
  for (let sx = x + 9; sx < x + w - 5; sx += 20) ctx.fillRect(sx, y, 6, h);
  ctx.fillStyle = '#7e2c22';
  ctx.fillRect(x, y + h - 6, w, 6);
}

function drawWallClock(ctx, x, y, r) {
  // A round kitchen clock: cream face, brown rim, twelve ticks, hands on five.
  ctx.fillStyle = '#7a4a26';
  ctx.beginPath(); ctx.arc(x, y, r + 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f7e8c8';
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3a2a1a';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath(); ctx.arc(x + Math.sin(a) * (r - 6), y - Math.cos(a) * (r - 6), i % 3 === 0 ? 3 : 1.8, 0, Math.PI * 2); ctx.fill();
  }
  // Five o'clock — dinner time. Hour hand to the 5, minute hand to the 12.
  ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.sin(5 * Math.PI / 6) * (r - 14), y - Math.cos(5 * Math.PI / 6) * (r - 14)); ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - (r - 10)); ctx.stroke();
  ctx.fillStyle = '#a03a2e';
  ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
}

function drawCopperPot(ctx, x, y) {
  // A copper pot hanging from its hook: round body, highlight, side handles.
  ctx.strokeStyle = '#5a3a1e'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x, y - 14); ctx.lineTo(x, y); ctx.stroke();
  ctx.fillStyle = '#b87333';
  ctx.beginPath(); ctx.arc(x, y + 16, 20, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#d89a4e';
  ctx.beginPath(); ctx.arc(x - 6, y + 10, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#8a5a2b';
  ctx.fillRect(x - 28, y + 10, 8, 5); ctx.fillRect(x + 20, y + 10, 8, 5);
}

function drawSkillet(ctx, x, y) {
  // A flat iron skillet on its hook, handle sticking out to the side.
  ctx.strokeStyle = '#5a3a1e'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x, y - 14); ctx.lineTo(x, y); ctx.stroke();
  ctx.fillStyle = '#3a3a40';
  ctx.beginPath(); ctx.arc(x, y + 18, 19, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#55555e';
  ctx.beginPath(); ctx.arc(x, y + 18, 13, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3a3a40';
  ctx.fillRect(x + 16, y + 14, 26, 7);
}

function drawLadle(ctx, x, y) {
  // A ladle: long handle down to a small shining bowl.
  ctx.strokeStyle = '#5a3a1e'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x, y - 14); ctx.lineTo(x, y + 22); ctx.stroke();
  ctx.fillStyle = '#c9c9c9';
  ctx.beginPath(); ctx.arc(x, y + 30, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#8a8a92';
  ctx.beginPath(); ctx.arc(x, y + 30, 5, 0, Math.PI * 2); ctx.fill();
}

function drawJar(ctx, x, baseY, color) {
  // A squat preserve jar with a wooden lid, sitting on the shelf (baseY is the shelf top).
  ctx.fillStyle = '#8a5a2b';
  ctx.fillRect(x - 9, baseY - 40, 18, 6);
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(x, baseY - 20, 12, 20, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath(); ctx.ellipse(x - 5, baseY - 26, 3, 7, 0, 0, Math.PI * 2); ctx.fill();
}

export function drawStageBackground(ctx, stageIndex, scrollPx, time) {
  const stage = STAGES[stageIndex];
  // The sky gradient depends only on the stage colours, so it is built once
  // per stage instead of allocating a new gradient every frame.
  if (skyGradCache.stage !== stageIndex) {
    const grad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    grad.addColorStop(0, stage.skyTop);
    grad.addColorStop(1, stage.skyBottom);
    skyGradCache = { stage: stageIndex, grad };
  }
  ctx.fillStyle = skyGradCache.grad;
  ctx.fillRect(0, 0, VIEW_W, GROUND_Y + 2);

  const far = scrollPx * 0.15;
  const mid = scrollPx * 0.45;

  if (stageIndex === 0) {
    drawSun(ctx, 1080 - (far % 200), 90, 44, '#fff3b0');
    drawCloud(ctx, 200 - (far % 1400), 80, 1, 'rgba(255,255,255,0.85)');
    drawCloud(ctx, 800 - (far % 1400), 140, 0.8, 'rgba(255,255,255,0.7)');
    // Distant barn + windmill silhouettes.
    ctx.fillStyle = '#a34a28';
    const barnX = 420 - (far % 1300);
    ctx.fillRect(barnX, 420, 170, 120);
    ctx.beginPath(); ctx.moveTo(barnX - 12, 420); ctx.lineTo(barnX + 85, 350); ctx.lineTo(barnX + 182, 420); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#7a3a20';
    ctx.fillRect(barnX + 70, 470, 30, 70);
    // Mid-ground: autumn trees and pumpkins drifting past.
    for (let i = 0; i < 4; i++) {
      const tx = ((i * 340 - mid) % 1360 + 1360) % 1360 - 40;
      drawTree(ctx, tx, GROUND_Y, 1.1, '#6b4423', i % 2 ? '#c96a2b' : '#d97b2e');
      drawPumpkin(ctx, (tx + 150) % 1280, GROUND_Y - 16, 0.9);
    }
  } else if (stageIndex === 1) {
    drawSun(ctx, 150, 80, 36, '#ffd98a');
    // Barn interior: big beams, hanging lanterns, hay stacks.
    ctx.fillStyle = 'rgba(90,50,20,0.55)';
    for (let i = 0; i < 5; i++) {
      const bx = ((i * 300 - far) % 1500 + 1500) % 1500 - 60;
      ctx.fillRect(bx, 0, 26, GROUND_Y);
    }
    ctx.fillStyle = 'rgba(60,32,12,0.5)';
    ctx.fillRect(0, 120, VIEW_W, 18);
    for (let i = 0; i < 3; i++) {
      const lx = ((i * 460 - mid) % 1380 + 1380) % 1380 - 50;
      ctx.strokeStyle = '#3a2410';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(lx, 138); ctx.lineTo(lx, 168); ctx.stroke();
      ctx.fillStyle = '#ffca5e';
      ctx.beginPath(); ctx.arc(lx, 182, 12 + Math.sin(time * 4 + i) * 1.5, 0, Math.PI * 2); ctx.fill();
    }
    for (let i = 0; i < 3; i++) {
      const hx = ((i * 520 - mid) % 1560 + 1560) % 1560 - 80;
      ctx.fillStyle = '#c9962e';
      ctx.beginPath(); ctx.ellipse(hx, GROUND_Y - 26, 70, 30, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e0b34e';
      ctx.beginPath(); ctx.ellipse(hx, GROUND_Y - 34, 52, 20, 0, 0, Math.PI * 2); ctx.fill();
    }
  } else {
    // Kitchen: checkered wall tiles, a window with evening light, hanging pans.
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    const tile = 72;
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 19; x++) {
        if ((x + y) % 2 === 0) ctx.fillRect(x * tile - (mid % tile), y * tile, tile, tile);
      }
    }
    // A few terracotta accent tiles break the checkerboard up.
    ctx.fillStyle = 'rgba(120,40,20,0.14)';
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 19; x++) {
        if ((x * 5 + y * 3) % 7 === 0) ctx.fillRect(x * tile - (mid % tile) + 8, y * tile + 8, tile - 16, tile - 16);
      }
    }
    ctx.fillStyle = '#f7e8c8';
    ctx.fillRect(880, 90, 220, 170);
    ctx.fillStyle = '#2b4d6e';
    ctx.fillRect(896, 106, 188, 138);
    ctx.fillStyle = '#f7b733';
    ctx.beginPath(); ctx.arc(1030, 150, 26, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7a4a26';
    ctx.fillRect(986, 240, 8, 20); ctx.fillRect(1076, 240, 8, 20);
    // Gingham curtains frame the window, and the wall clock reads five o'clock.
    // The clock sits below the HUD progress bar (y 86-96), so its face is
    // never clipped: centre y 140 puts its top edge at 103.
    drawCurtain(ctx, 866, 84, 46, 182);
    drawCurtain(ctx, 1068, 84, 46, 182);
    drawWallClock(ctx, 430, 140, 32);
    for (let i = 0; i < 4; i++) {
      const px = ((i * 330 - mid) % 1320 + 1320) % 1320 - 20;
      ctx.fillStyle = '#3a3a40';
      ctx.beginPath(); ctx.arc(px, 300, 26, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#55555e';
      ctx.beginPath(); ctx.arc(px, 300, 18, 0, Math.PI * 2); ctx.fill();
    }
    // A hanging rail: copper pots, a skillet and a ladle, drifting past.
    for (let i = 0; i < 5; i++) {
      const rx = ((i * 300 - mid) % 1500 + 1500) % 1500 - 60;
      ctx.fillStyle = '#4a2c14';
      ctx.fillRect(rx, 336, 300, 7);
      const hx = rx + 150;
      if (i % 3 === 0) drawCopperPot(ctx, hx, 343);
      else if (i % 3 === 1) drawSkillet(ctx, hx, 343);
      else drawLadle(ctx, hx, 343);
    }
    // A wooden shelf with preserve jars and a little herb plant.
    for (let i = 0; i < 3; i++) {
      const sx = ((i * 460 - mid) % 1380 + 1380) % 1380 - 80;
      ctx.fillStyle = '#7a4a26';
      ctx.fillRect(sx, 468, 170, 10);
      drawJar(ctx, sx + 26, 468, '#d88a2e');
      drawJar(ctx, sx + 76, 468, '#6a8a3a');
      drawJar(ctx, sx + 126, 468, '#e8dcc0');
      if (i % 2 === 0) {
        ctx.fillStyle = '#b5541f';
        ctx.beginPath(); ctx.ellipse(sx + 156, 458, 9, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#4a7a2e';
        ctx.beginPath(); ctx.ellipse(sx + 150, 444, 5, 10, -0.4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(sx + 162, 444, 5, 10, 0.4, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Dried garlic braids and chili strings on the far wall.
    for (let i = 0; i < 3; i++) {
      const gx = ((i * 520 - far) % 1560 + 1560) % 1560 - 40;
      ctx.strokeStyle = '#8a7a5a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(gx, 350); ctx.lineTo(gx, 452); ctx.stroke();
      ctx.fillStyle = '#f2ead8';
      for (let j = 0; j < 4; j++) {
        ctx.beginPath(); ctx.ellipse(gx, 366 + j * 24, 9, 12, 0, 0, Math.PI * 2); ctx.fill();
      }
      const cx = gx + 34;
      ctx.strokeStyle = '#8a7a5a';
      ctx.beginPath(); ctx.moveTo(cx, 350); ctx.lineTo(cx, 440); ctx.stroke();
      ctx.fillStyle = '#b03a2e';
      for (let j = 0; j < 4; j++) {
        ctx.beginPath(); ctx.ellipse(cx, 366 + j * 22, 5, 10, 0.25, 0, Math.PI * 2); ctx.fill();
      }
    }
    // A row of recipe notes pinned to the wall.
    ctx.fillStyle = '#fff8dc';
    ctx.fillRect(120, 130, 130, 90);
    ctx.fillStyle = '#8a5a2b';
    ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('RECIPE:', 185, 155);
    ctx.fillText('1 TURKEY', 185, 178);
    ctx.fillText('— DO NOT —', 185, 200);
  }

  // Ground: a dirt floor with grass tufts (farmyard), planks (barn) or tiles (kitchen).
  ctx.fillStyle = stage.ground;
  ctx.fillRect(0, GROUND_Y, VIEW_W, VIEW_H - GROUND_Y);
  ctx.fillStyle = stage.groundDark;
  ctx.fillRect(0, GROUND_Y, VIEW_W, 10);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  const step = 90;
  const off = scrollPx % step;
  for (let x = -off; x < VIEW_W; x += step) {
    ctx.beginPath(); ctx.ellipse(x + 30, GROUND_Y + 62, 26, 5, 0, 0, Math.PI * 2); ctx.fill();
  }
  if (stageIndex === 0) {
    ctx.strokeStyle = '#5d8a2e';
    ctx.lineWidth = 3;
    for (let x = -off; x < VIEW_W; x += 130) {
      ctx.beginPath(); ctx.moveTo(x, GROUND_Y + 18); ctx.lineTo(x - 6, GROUND_Y + 2); ctx.moveTo(x + 6, GROUND_Y + 18); ctx.lineTo(x + 12, GROUND_Y + 4); ctx.stroke();
    }
  }
}

export function drawForestGate(ctx, gateX, time) {
  // The escape: two big autumn trees framing a glowing green gate.
  const glow = 0.7 + Math.sin(time * 4) * 0.3;
  ctx.save();
  ctx.fillStyle = `rgba(120,255,140,${0.25 * glow})`;
  ctx.beginPath(); ctx.ellipse(gateX, GROUND_Y - 110, 90, 130, 0, 0, Math.PI * 2); ctx.fill();
  drawTree(ctx, gateX - 110, GROUND_Y, 1.9, '#4a2c14', '#2f7a2e');
  drawTree(ctx, gateX + 110, GROUND_Y, 1.9, '#4a2c14', '#3a9a3a');
  ctx.fillStyle = '#7a4a26';
  ctx.fillRect(gateX - 84, GROUND_Y - 210, 14, 210);
  ctx.fillRect(gateX + 70, GROUND_Y - 210, 14, 210);
  ctx.fillStyle = '#8f5a2e';
  ctx.fillRect(gateX - 96, GROUND_Y - 216, 192, 16);
  ctx.fillStyle = '#2f7a2e';
  ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('FREEDOM!', gateX, GROUND_Y - 228);
  ctx.fillStyle = `rgba(180,255,190,${glow})`;
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('>>> THE FOREST >>>', gateX, GROUND_Y - 120);
  ctx.restore();
}
