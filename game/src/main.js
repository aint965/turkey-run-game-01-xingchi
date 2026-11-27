// main.js — Turkey Run: boot, the fixed-step game loop, the state machine
// (title -> playing -> paused -> caught / escaped), spawning, collisions, the
// farmer chase, scoring, and the ?shot= staging hooks used for screenshots.
//
// ?seed=N fixes the spawn pattern. ?shot=title|play|kitchen|caught|escaped
// stages that scene (with &seed=N) so screenshots are real renders of the game.
import { VIEW_W, VIEW_H, GROUND_Y, PX_PER_METRE, TURKEY_X, STAGE_LENGTH_M, ESCAPE_DISTANCE_M, MAX_LIVES, GAP_START, GAP_MAX, GAP_CAUGHT, GAP_HIT_PENALTY, CORN_SCORE, STAGE_BONUS, STAGES, stageIndexFor } from './config.js';
import { createSoundBank } from './audio.js';
import { createInput } from './input.js';
import { createTurkey, turkeyHitbox, turkeyJump, turkeySlide, updateTurkey, drawTurkey } from './turkey.js';
import { createFarmer, updateFarmer, drawFarmer } from './farmer.js';
import { makeHazard, makeCorn, makeHeart, hazardHitbox, overlaps, updateHazard, drawHazard, drawCorn, drawHeart } from './hazards.js';
import { drawStageBackground, drawForestGate } from './stages.js';
import { drawTitle, drawHud, drawPaused, drawEnd } from './screens.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const sounds = createSoundBank();
const input = createInput(canvas);

const params = new URLSearchParams(window.location.search);
const seedParam = Number(params.get('seed'));
let seed = Number.isFinite(seedParam) && seedParam > 0 ? seedParam : (Date.now() % 2147483647);

// A tiny seeded RNG so ?seed=1 always stages the same run.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let rng = mulberry32(seed);

function loadBest() {
  try {
    const raw = sessionStorage.getItem('turkey-run-best');
    if (raw) { const b = JSON.parse(raw); return { score: b.score | 0, distance: b.distance | 0 }; }
  } catch { /* storage unavailable: best score lives for this page load only */ }
  return { score: 0, distance: 0 };
}
function saveBest(best) {
  try { sessionStorage.setItem('turkey-run-best', JSON.stringify(best)); } catch { /* ignore */ }
}

const state = {
  screen: 'title', // title | playing | paused | caught | escaped
  time: 0,
  score: 0, corn: 0, lives: MAX_LIVES,
  scrollPx: 0, distanceM: 0, stageIndex: 0,
  speed: STAGES[0].baseSpeed,
  farmerGap: GAP_START,
  banner: 0, flash: 0,
  best: loadBest(),
  muted: false,
  buttons: {},
};

let turkey = createTurkey();
let farmer = createFarmer();
let hazards = [];
let corns = [];
let hearts = [];
let gateWorldX = ESCAPE_DISTANCE_M * PX_PER_METRE + TURKEY_X;
let nextSpawnWorldX = 0;
let lastStageAnnounced = 0;

function resetRun(startDistanceM = 0, stageOverride = null) {
  turkey = createTurkey();
  farmer = createFarmer();
  hazards = [];
  corns = [];
  hearts = [];
  rng = mulberry32(seed);
  state.score = 0; state.corn = 0; state.lives = MAX_LIVES;
  state.distanceM = startDistanceM;
  state.scrollPx = startDistanceM * PX_PER_METRE;
  state.stageIndex = stageOverride !== null ? stageOverride : stageIndexFor(startDistanceM);
  state.speed = STAGES[state.stageIndex].baseSpeed;
  state.farmerGap = GAP_START;
  state.banner = 0; state.flash = 0;
  gateWorldX = ESCAPE_DISTANCE_M * PX_PER_METRE + TURKEY_X;
  nextSpawnWorldX = state.scrollPx + 900;
  lastStageAnnounced = state.stageIndex;
  state.screen = 'playing';
  sounds.startMusic();
  announce('Run! Escape the farmer!');
}

function startRun() {
  sounds.unlock();
  sounds.click();
  resetRun(0);
}

function endRun(escaped) {
  state.screen = escaped ? 'escaped' : 'caught';
  sounds.stopMusic();
  if (escaped) sounds.escaped(); else sounds.caught();
  if (state.score > state.best.score) {
    state.best = { score: Math.floor(state.score), distance: Math.floor(state.distanceM) };
    saveBest(state.best);
  }
  announce(escaped ? `Escaped! Score ${state.score}.` : `Caught! Score ${state.score}. Press Space to run again.`);
}

function announce(text) { statusEl.textContent = text; }

function spawnPattern() {
  const stage = STAGES[state.stageIndex];
  const worldX = nextSpawnWorldX;
  const roll = rng();
  if (roll < 0.12) {
    // A rare pumpkin-pie heart: the turkey's one chance to win a life back.
    hearts.push(makeHeart(worldX, GROUND_Y - 140));
    nextSpawnWorldX = worldX + 380;
    return;
  }
  if (roll < 0.30) {
    // A corn arc over open ground — a breather with a reward.
    for (let i = 0; i < 4; i++) {
      corns.push(makeCorn(worldX + i * 46, GROUND_Y - 120 - Math.sin(i * 0.9) * 46));
    }
    nextSpawnWorldX = worldX + 320;
    return;
  }
  const kind = stage.hazards[Math.floor(rng() * stage.hazards.length)];
  hazards.push(makeHazard(kind, worldX, rng));
  // Sometimes a second hazard close behind, with a corn trail between them.
  if (rng() < 0.35 && state.stageIndex > 0) {
    const kind2 = stage.hazards[Math.floor(rng() * stage.hazards.length)];
    hazards.push(makeHazard(kind2, worldX + 300, rng));
    corns.push(makeCorn(worldX + 150, GROUND_Y - 130));
    nextSpawnWorldX = worldX + 300 + 340 + rng() * 200;
  } else {
    if (rng() < 0.5) corns.push(makeCorn(worldX - 120, GROUND_Y - 150));
    nextSpawnWorldX = worldX + stage.spawnEveryMin + rng() * (stage.spawnEveryMax - stage.spawnEveryMin);
  }
}

function onHit() {
  if (turkey.invulnerable > 0) return;
  state.lives -= 1;
  farmer.gap = Math.max(GAP_CAUGHT, farmer.gap - GAP_HIT_PENALTY);
  state.farmerGap = farmer.gap;
  turkey.invulnerable = 1.6;
  farmer.lunge = 1;
  state.flash = 1;
  sounds.hit();
  sounds.spotted();
  announce(`Ouch! ${state.lives} ${state.lives === 1 ? 'life' : 'lives'} left — the farmer is closing in!`);
  if (state.lives <= 0) endRun(false);
}

function updatePlaying(dt) {
  const stage = STAGES[state.stageIndex];
  let targetSpeed = stage.baseSpeed;
  if (input.isHeld('faster')) targetSpeed += 75;
  if (input.isHeld('slower')) targetSpeed -= 95;
  state.speed += (targetSpeed - state.speed) * Math.min(1, dt * 4);
  state.speed = Math.max(140, Math.min(520, state.speed));

  state.scrollPx += state.speed * dt;
  state.distanceM = state.scrollPx / PX_PER_METRE;
  state.score += (state.speed * dt) / PX_PER_METRE; // 1 point per metre run
  state.time += dt;

  // Stage changes: banner, bonus, fanfare.
  const idx = stageIndexFor(state.distanceM);
  if (idx !== state.stageIndex) {
    state.stageIndex = idx;
    if (idx > lastStageAnnounced) {
      lastStageAnnounced = idx;
      state.banner = 2.4;
      state.score += STAGE_BONUS;
      sounds.stageClear();
      announce(`${STAGES[idx].name}! ${STAGES[idx].tagline}`);
    }
  }
  if (state.banner > 0) state.banner = Math.max(0, state.banner - dt);
  if (state.flash > 0) state.flash = Math.max(0, state.flash - dt * 1.6);

  updateTurkey(turkey, dt, state.speed);
  updateFarmer(farmer, dt, state.speed, stage.baseSpeed);
  state.farmerGap = farmer.gap;

  // Spawn ahead of the turkey.
  while (nextSpawnWorldX < state.scrollPx + 1500) spawnPattern();

  // Move hazards/corn: their world x is fixed, screen x is world minus scroll.
  for (const h of hazards) updateHazard(h, dt, state.time);
  hazards = hazards.filter((h) => h.x - state.scrollPx > -220);
  corns = corns.filter((c) => !c.taken && c.x - state.scrollPx > -120);
  hearts = hearts.filter((c) => !c.taken && c.x - state.scrollPx > -120);

  const tb = turkeyHitbox(turkey);
  // Convert the turkey hitbox to world coordinates for collision.
  const tbWorld = { x: tb.x + state.scrollPx, y: tb.y, w: tb.w, h: tb.h };
  for (const h of hazards) {
    if (h.passed) continue;
    const hb = hazardHitbox(h);
    if (overlaps(tbWorld, hb)) { h.passed = true; onHit(); if (state.screen !== 'playing') return; }
    else if (h.x + h.w / 2 < tbWorld.x && !h.passed) { h.passed = true; state.score += 10; }
  }
  for (const c of corns) {
    if (c.taken) continue;
    const cb = { x: c.x - 17, y: c.y - 22, w: 34, h: 44 };
    if (overlaps(tbWorld, cb)) {
      c.taken = true;
      state.corn += 1;
      state.score += CORN_SCORE;
      state.farmerGap = Math.min(GAP_MAX, state.farmerGap + 6);
      farmer.gap = state.farmerGap;
      sounds.pickup();
    }
  }
  for (const c of hearts) {
    if (c.taken) continue;
    const cb = { x: c.x - 18, y: c.y - 17, w: 36, h: 34 };
    if (overlaps(tbWorld, cb)) {
      c.taken = true;
      if (state.lives < MAX_LIVES) {
        state.lives += 1;
        announce('Pumpkin pie! +1 life!');
      } else {
        state.score += 100;
      }
      state.score += 50;
      sounds.stageClear();
      sounds.pickup();
    }
  }

  // The farmer catches the turkey when the gap closes completely.
  if (state.farmerGap <= GAP_CAUGHT + 1) { endRun(false); return; }

  // The forest gate: run through it to escape.
  if (state.scrollPx + TURKEY_X >= gateWorldX) { endRun(true); return; }
}

function render() {
  // Fit the 1280x720 stage into the window, letterboxed.
  const scale = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  ctx.setTransform(scale, 0, 0, scale, (window.innerWidth - VIEW_W * scale) / 2, (window.innerHeight - VIEW_H * scale) / 2);
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  const mouse = input.mousePos();

  if (state.screen === 'title') {
    state.buttons = drawTitle(ctx, state.best, mouse);
    return;
  }
  drawStageBackground(ctx, state.stageIndex, state.scrollPx, state.time);
  // Forest gate, when it scrolls into view.
  const gateScreenX = gateWorldX - state.scrollPx;
  if (gateScreenX < VIEW_W + 260 && gateScreenX > -260) drawForestGate(ctx, gateScreenX, state.time);
  for (const c of corns) {
    if (!c.taken) drawCorn(ctx, { ...c, x: c.x - state.scrollPx }, state.time);
  }
  for (const c of hearts) {
    if (!c.taken) drawHeart(ctx, { ...c, x: c.x - state.scrollPx }, state.time);
  }
  for (const h of hazards) drawHazard(ctx, { ...h, x: h.x - state.scrollPx });
  drawFarmer(ctx, farmer, TURKEY_X, GROUND_Y);
  drawTurkey(ctx, turkey);
  drawHud(ctx, { ...state, farmerGap: state.farmerGap });
  if (state.screen === 'paused') state.buttons = drawPaused(ctx, mouse);
  if (state.screen === 'caught' || state.screen === 'escaped') state.buttons = drawEnd(ctx, state, mouse);
}

function pointIn(r, p) { return r && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h; }

// Convert a click in window pixels to stage coordinates (matches render()).
function toStageCoords(p) {
  const scale = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  const ox = (window.innerWidth - VIEW_W * scale) / 2;
  const oy = (window.innerHeight - VIEW_H * scale) / 2;
  return { x: (p.x - ox) / scale, y: (p.y - oy) / scale };
}

function handleInput() {
  const pressed = input.drainPressed();
  const rawClicks = input.drainClicks();
  const clicks = rawClicks.map((c) => toStageCoords(c));
  for (const action of pressed) {
    if (action === 'mute') { state.muted = sounds.toggleMute(); continue; }
    if (state.screen === 'title') {
      if (action === 'jump' || action === 'confirm') startRun();
    } else if (state.screen === 'playing') {
      if (action === 'jump') turkeyJump(turkey, sounds);
      else if (action === 'slide') turkeySlide(turkey, sounds);
      else if (action === 'pause') { state.screen = 'paused'; sounds.stopMusic(); }
    } else if (state.screen === 'paused') {
      if (action === 'pause' || action === 'confirm' || action === 'jump') { state.screen = 'playing'; sounds.startMusic(); }
    } else if (action === 'jump' || action === 'confirm') {
      startRun();
    }
  }
  for (const click of clicks) {
    sounds.unlock();
    if (state.screen === 'title' && pointIn(state.buttons.start, click)) startRun();
    else if (state.screen === 'paused' && pointIn(state.buttons.resume, click)) { state.screen = 'playing'; sounds.startMusic(); }
    else if ((state.screen === 'caught' || state.screen === 'escaped') && pointIn(state.buttons.again, click)) startRun();
    else if (state.screen === 'playing' && click.y < 420) turkeyJump(turkey, sounds);
  }
  // Holding Down slides; holding it is enough, no press needed.
  if (state.screen === 'playing' && input.isHeld('slide')) turkeySlide(turkey, sounds);
}

// ---- screenshot staging (?shot=...) and the debug hooks playtests use ----
function stageShot() {
  const shot = params.get('shot');
  if (!shot) return;
  if (shot === 'play') {
    resetRun(120);
    hazards.push(makeHazard('oven', state.scrollPx + 950, rng));
    hazards.push(makeHazard('knife', state.scrollPx + 1200, rng));
    hazards.push(makeHazard('fence', state.scrollPx + 1450, rng));
    corns.push(makeCorn(state.scrollPx + 480, GROUND_Y - 160));
    corns.push(makeCorn(state.scrollPx + 530, GROUND_Y - 180));
    state.farmerGap = 170; farmer.gap = 170;
    state.score = 1840; state.corn = 6;
    nextSpawnWorldX = state.scrollPx + 1800;
  } else if (shot === 'kitchen') {
    resetRun(820, 2);
    hazards.push(makeHazard('oven', state.scrollPx + 1400, rng));
    hazards.push(makeHazard('oven', state.scrollPx + 1680, rng));
    hazards.push(makeHazard('knife', state.scrollPx + 1950, rng));
    corns.push(makeCorn(state.scrollPx + 420, GROUND_Y - 150));
    state.farmerGap = 170; farmer.gap = 170;
    state.score = 9210; state.corn = 18; state.lives = 2;
    nextSpawnWorldX = state.scrollPx + 2200;
  } else if (shot === 'caught') {
    resetRun(430);
    state.score = 5120; state.corn = 9; state.lives = 0; state.distanceM = 430;
    endRun(false);
  } else if (shot === 'escaped') {
    resetRun(900);
    state.score = 14820; state.corn = 24; state.distanceM = 900;
    endRun(true);
  }
  // 'title' is the default: nothing to stage.
}

// Playtest + automation hooks (also how the end screens are reached in tests).
window.__turkeyGame = {
  get state() { return { screen: state.screen, score: Math.floor(state.score), distanceM: Math.floor(state.distanceM), lives: state.lives, corn: state.corn, farmerGap: Math.round(state.farmerGap), stageIndex: state.stageIndex }; },
  start: startRun,
  forceCaught: () => { if (state.screen === 'playing') endRun(false); },
  forceEscaped: () => { if (state.screen === 'playing') endRun(true); },
  setDistance: (m) => { state.distanceM = m; state.scrollPx = m * PX_PER_METRE; },
};

let last = performance.now();
let acc = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  handleInput();
  if (state.screen === 'playing') {
    acc += dt;
    const step = 1 / 60;
    let guard = 0;
    while (acc >= step && guard < 5) { updatePlaying(step); acc -= step; guard++; if (state.screen !== 'playing') { acc = 0; break; } }
  } else {
    state.time += dt;
  }
  render();
  requestAnimationFrame(frame);
}

stageShot();
announce('Turkey Run! Press Space or click Start Run to escape the farmer.');
requestAnimationFrame(frame);
