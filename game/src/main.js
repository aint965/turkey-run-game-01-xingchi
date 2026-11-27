// main.js — Turkey Run: boot, the fixed-step game loop, the state machine
// (title -> playing -> paused -> caught / escaped), spawning, collisions, the
// farmer chase, scoring, and the ?shot= staging hooks used for screenshots.
//
// ?seed=N fixes the spawn pattern. ?shot=title|play|kitchen|caught|escaped
// stages that scene (with &seed=N) so screenshots are real renders of the game.
import { VIEW_W, VIEW_H, GROUND_Y, PX_PER_METRE, TURKEY_X, STAGE_LENGTH_M, ESCAPE_DISTANCE_M, MAX_LIVES, GAP_START, GAP_MAX, GAP_CAUGHT, GAP_HIT_PENALTY, CORN_SCORE, STAGE_BONUS, STAGES, stageIndexFor, ACTION_BUFFER_S, SLIDE_TIME, GRAVITY, JUMP_VELOCITY } from './config.js';
import { createSoundBank } from './audio.js';
import { createInput } from './input.js';
import { createTurkey, turkeyHitbox, turkeyJump, turkeySlide, updateTurkey, drawTurkey } from './turkey.js';
import { createFarmer, updateFarmer, drawFarmer } from './farmer.js';
import { makeHazard, makeCorn, makeHeart, hazardHitbox, overlaps, updateHazard, drawHazard, drawCorn, drawHeart } from './hazards.js';
import { drawStageBackground, drawForestGate } from './stages.js';
import { drawTitle, drawHud, drawPaused, drawEnd } from './screens.js';
import { createParticles, spawnBurst, spawnFloater, updateParticles, drawParticles } from './particles.js';

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
  banner: 0, flash: 0, flashColor: '#ff3b2e',
  best: loadBest(),
  muted: false,
  buttons: {},
  // Game-feel state (game-feel): trauma drives the screen shake, hitStopUntil
  // freezes the sim on a big event, scorePop scales the end-screen score.
  // All three decay/are restored with REAL time, never scaled sim time.
  trauma: 0, hitStopUntil: 0, scorePop: 0,
};

let turkey = createTurkey();
let farmer = createFarmer();
let hazards = [];
let corns = [];
let hearts = [];
let particles = createParticles();
let gateWorldX = ESCAPE_DISTANCE_M * PX_PER_METRE + TURKEY_X;
let nextSpawnWorldX = 0;
let lastStageAnnounced = 0;
// Action buffer (input-systems): presses that could not act yet, stamped in
// GAME time. One entry per action (a new press replaces the old one).
let actionBuffer = [];
// Spawner stats (procedural-gen): how many candidate patterns were
// generated and how many the validator rejected, per page load.
let spawnStats = { generated: 0, rejected: 0 };
// Frame-time ring buffer (performance-optimization): last 300 rAF deltas.
let frameTimes = [];
let realTime = 0;

function resetRun(startDistanceM = 0, stageOverride = null) {
  turkey = createTurkey();
  farmer = createFarmer();
  hazards = [];
  corns = [];
  hearts = [];
  particles = createParticles();
  actionBuffer = [];
  rng = mulberry32(seed);
  state.score = 0; state.corn = 0; state.lives = MAX_LIVES;
  state.distanceM = startDistanceM;
  state.scrollPx = startDistanceM * PX_PER_METRE;
  state.stageIndex = stageOverride !== null ? stageOverride : stageIndexFor(startDistanceM);
  state.speed = STAGES[state.stageIndex].baseSpeed;
  state.farmerGap = GAP_START;
  state.banner = 0; state.flash = 0; state.flashColor = '#ff3b2e';
  state.trauma = 0; state.hitStopUntil = 0; state.scorePop = 0;
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
  // Big-event juice (game-feel): a short hit-stop, a burst of particles at
  // the turkey, trauma shake, and a score pop on the end screen. The
  // hit-stop is restored by REAL time; the latest call wins.
  state.hitStopUntil = performance.now() + (escaped ? 100 : 70);
  state.trauma = Math.max(state.trauma, 0.6);
  state.scorePop = 1;
  state.flash = 1;
  state.flashColor = escaped ? '#7ddc7d' : '#ff3b2e';
  spawnBurst(particles, TURKEY_X + state.scrollPx, turkey.y - 40, {
    count: escaped ? 36 : 28,
    colors: escaped ? ['#7ddc7d', '#ffd23e', '#fff'] : ['#ff6a5a', '#fff', '#ffd23e'],
    speed: 300, size: 5, life: 0.9,
  });
  spawnFloater(particles, TURKEY_X + state.scrollPx, turkey.y - 110, escaped ? 'ESCAPED!' : 'CAUGHT!', escaped ? '#7ddc7d' : '#ff6a5a');
  if (state.score > state.best.score) {
    state.best = { score: Math.floor(state.score), distance: Math.floor(state.distanceM) };
    saveBest(state.best);
  }
  announce(escaped ? `Escaped! Score ${state.score}.` : `Caught! Score ${state.score}. Press Space to run again.`);
}

function announce(text) { statusEl.textContent = text; }

// ---- action buffer (input-systems) ----
// A discrete press that could not act yet (jump while sliding, slide while
// airborne, jump with both jumps spent) is kept for ACTION_BUFFER_S of GAME
// time and consumed exactly once when it becomes legal. One entry per action:
// a fresh press replaces the stale one. Cleared on death, pause and restart.
function bufferAction(action) {
  for (let i = actionBuffer.length - 1; i >= 0; i--) {
    if (actionBuffer[i].action === action) actionBuffer.splice(i, 1);
  }
  actionBuffer.push({ action, t: state.time });
}

function tryBuffered() {
  for (let i = actionBuffer.length - 1; i >= 0; i--) {
    const b = actionBuffer[i];
    if (state.time - b.t > ACTION_BUFFER_S) { actionBuffer.splice(i, 1); continue; }
    const ok = b.action === 'jump' ? turkeyJump(turkey, sounds) : turkeySlide(turkey, sounds);
    if (ok) actionBuffer.splice(i, 1);
  }
}

// ---- pattern validation (procedural-gen) ----
// A candidate pattern is data first, then an ideal controller plays the
// turkey through it at fixed 1/60 steps using the real physics and hitboxes.
// The controller jumps/slides at computed leads (see below) and double-jumps
// while falling over a hazard. If the simulated turkey is hit anywhere, the
// pattern is rejected and re-rolled. This proves every pattern that reaches
// the game is passable in principle; the driver bot proves it in practice.
const silentSounds = { jump() {}, slide() {} };

function patternLead(kind, speed) {
  // Jump lead: the MIDDLE of the action's valid window, not its edge, so
  // the turkey lands with margin on both sides. The window comes from the
  // physics: the turkey is above a hazard's height from t1 to t2 (the two
  // roots of |v|t - (g/2)t^2 = hazard height); the hazard passes from
  // L/speed to (L+C)/speed where C is its crossing (hitbox w + turkey w).
  // The window is [t1*speed, t2*speed - C] and t1+t2 is exactly the full
  // airtime 2|v|/g, so the midpoint is (|v|/g)*speed - C/2 for EVERY
  // hazard — the height only sets the window's width, never its centre.
  // (The earlier version used (min + airtime*speed - C)/2, which is
  // 13-26 px too late: the turkey then landed just as the NEXT hazard
  // arrived, with no time to jump it. That is what killed the bot on
  // doubles, and it made the validator reject passable knife/oven
  // patterns. A slide lasts 0.55 s and must still cover the fence
  // crossing when it ends.)
  const halfAir = Math.abs(JUMP_VELOCITY) / GRAVITY; // 0.377 s
  if (kind === 'fence') return Math.max(20, 0.55 * speed / 2 - 37);
  if (kind === 'oven') return halfAir * speed - 154 / 2;
  if (kind === 'knife') return halfAir * speed - 90 / 2;
  return halfAir * speed - 146 / 2; // hay
}

function patternMinLead(kind, speed) {
  // The earliest the action may start (too early and the turkey lands on
  // the hazard): the height-at-arrival bound.
  if (kind === 'fence') return 0;
  if (kind === 'oven') return 0.13 * speed;
  if (kind === 'knife') return 0.10 * speed;
  return 0.067 * speed; // hay
}

function simulatePattern(items, speed, startScroll) {
  // items: [{kind, x}] in world coordinates, sorted by x. The turkey starts
  // on the ground 500 px before the first item (canonical state).
  const step = 1 / 60;
  const sim = createTurkey();
  sim.x = TURKEY_X;
  let scroll = startScroll;
  // Reaction margin (procedural-gen): after the turkey lands it cannot act
  // for 0.10 s — the time a real player (or the driver bot, one ~50 ms tick
  // under contention plus a frame) needs to see the landing and press. A
  // pattern that only passes with frame-perfect timing is NOT passable: at
  // stage-2 speed the jump covers 294 px but a double is spaced 300 px, so
  // the turkey lands 6 px before the next hazard — 0.015 s, less than one
  // bot tick. Without this margin the validator certified those doubles
  // and the bot died on them (393 m, 563 m, 605 m — falling onto a hay
  // with the double jump correctly blocked by the hazard behind it).
  // 0.06 s was tried first and was not enough under contention (the bot's
  // tick stretched to 51 ms); 0.10 s covers it. With it the tight
  // sequences are rejected and re-rolled.
  let simTime = 0;
  let reactUntil = 0;
  const hs = items.map((it) => makeHazard(it.kind, it.x, () => 0.5));
  const endScroll = hs.length ? hs[hs.length - 1].x + 400 : startScroll + 400;
  const maxSteps = Math.ceil((endScroll - startScroll) / (speed * step)) + 120;
  for (let i = 0; i < maxSteps; i++) {
    scroll += speed * step;
    simTime += step;
    // Nearest hazard that still needs acting on: one whose trailing edge
    // has not yet passed the turkey's front. A fence already under the
    // turkey must not keep the controller from acting on the hazard behind it.
    let next = null;
    let nextD = Infinity;
    for (const h of hs) {
      const hb = hazardHitbox(h);
      const trailD = (hb.x + hb.w - scroll) - (TURKEY_X + 32);
      if (trailD < 0) continue;
      const d = (hb.x - scroll) - (TURKEY_X + 32);
      if (d < nextD) { next = h; nextD = d; }
    }
    if (next) {
      if (next.kind === 'fence') {
        if (simTime >= reactUntil && nextD <= patternLead('fence', speed) && nextD > 0 && sim.y >= GROUND_Y && sim.sliding <= 0) turkeySlide(sim, silentSounds);
      } else if (simTime >= reactUntil && sim.y >= GROUND_Y && sim.jumps === 0 && sim.sliding <= 0) {
        if (nextD <= patternLead(next.kind, speed) && nextD >= patternMinLead(next.kind, speed)) turkeyJump(sim, silentSounds);
      }
      // Double jump: the same last-resort rule as the driver bot — only
      // when falling and the turkey's bottom is within 80 px of the
      // hazard's top, and only when the extra flight lands 40+ px
      // before the next hazard's leading edge reaches the turkey. (A
      // double jump into a 300 px-spaced double lands the turkey
      // descending onto the next hazard, so the validator must not
      // certify patterns that need one there.)
      if (next.kind !== 'fence' && sim.y < GROUND_Y && sim.vy > 0 && sim.jumps === 1 && sim.sliding <= 0) {
        const hb = hazardHitbox(next);
        const tb = turkeyHitbox(sim);
        if (nextD <= 0 && tb.y + tb.h > hb.y - 80) {
          const h0 = GROUND_Y - sim.y;
          const flightS = 820 / 2600 + Math.sqrt(2 * (h0 + 129) / 2600);
          const landPx = flightS * speed;
          let nextN = Infinity;
          for (const h2 of hs) {
            if (h2.x <= next.x) continue;
            const hb2 = hazardHitbox(h2);
            const d2 = (hb2.x - scroll) - (TURKEY_X + 32);
            if (d2 < nextN) nextN = d2;
          }
          if (nextN > landPx + 40) turkeyJump(sim, silentSounds);
        }
      }
    }
    updateTurkey(sim, step, speed);
    if (sim.justLanded) { reactUntil = simTime + 0.10; sim.justLanded = false; }
    const tb = turkeyHitbox(sim);
    const tbWorld = { x: tb.x + scroll, y: tb.y, w: tb.w, h: tb.h };
    for (const h of hs) {
      if (overlaps(tbWorld, hazardHitbox(h))) return false;
    }
    let allPassed = true;
    for (const h of hs) {
      const hb = hazardHitbox(h);
      if (hb.x + hb.w - scroll > TURKEY_X + 32) { allPassed = false; break; }
    }
    if (allPassed) return true;
  }
  return false;
}

function generatePatternCandidate(worldX) {
  const stage = STAGES[state.stageIndex];
  const roll = rng();
  if (roll < 0.12) {
    return { type: 'heart', hearts: [{ x: worldX, y: GROUND_Y - 140 }], corns: [], hazards: [], nextGap: 380 };
  }
  if (roll < 0.30) {
    const corns = [];
    for (let i = 0; i < 4; i++) corns.push(makeCorn(worldX + i * 46, GROUND_Y - 120 - Math.sin(i * 0.9) * 46));
    return { type: 'corn', hearts: [], corns, hazards: [], nextGap: 320 };
  }
  const kind = stage.hazards[Math.floor(rng() * stage.hazards.length)];
  const hazards = [{ kind, x: worldX }];
  const corns = [];
  let nextGap;
  if (rng() < 0.35 && state.stageIndex > 0) {
    const kind2 = stage.hazards[Math.floor(rng() * stage.hazards.length)];
    hazards.push({ kind: kind2, x: worldX + 300 });
    corns.push(makeCorn(worldX + 150, GROUND_Y - 130));
    nextGap = 300 + 340 + rng() * 200;
  } else {
    if (rng() < 0.5) corns.push(makeCorn(worldX - 120, GROUND_Y - 150));
    nextGap = stage.spawnEveryMin + rng() * (stage.spawnEveryMax - stage.spawnEveryMin);
  }
  return { type: 'hazards', hearts: [], corns, hazards, nextGap };
}

function spawnPattern() {
  const stage = STAGES[state.stageIndex];
  const worldX = nextSpawnWorldX;
  // Hazards still ahead of the turkey: the candidate must be passable
  // together with them, not just on its own. Only hazards whose leading
  // edge the turkey has NOT reached yet: one it is currently clearing
  // mid-air would hit the simulated turkey standing on the ground, and
  // that hazard is already being handled by the player's current action.
  const ahead = hazards.filter((h) => {
    const hb = hazardHitbox(h);
    return hb.x > state.scrollPx + TURKEY_X + 32 + 20;
  }).map((h) => ({ kind: h.kind, x: h.x }));
  for (let attempt = 0; attempt < 4; attempt++) {
    const cand = generatePatternCandidate(worldX);
    spawnStats.generated++;
    if (cand.type !== 'hazards') {
      commitPattern(cand, worldX);
      return;
    }
    const items = ahead.concat(cand.hazards);
    const startScroll = items.length ? Math.max(state.scrollPx, items[0].x - 500 - TURKEY_X) : state.scrollPx;
    if (simulatePattern(items, stage.baseSpeed, startScroll)) {
      commitPattern(cand, worldX);
      return;
    }
    spawnStats.rejected++;
  }
  // All re-rolls failed: fall back to a safe breather (corn arc, no hazards).
  const corns = [];
  for (let i = 0; i < 4; i++) corns.push(makeCorn(worldX + i * 46, GROUND_Y - 120 - Math.sin(i * 0.9) * 46));
  commitPattern({ type: 'corn', hearts: [], corns, hazards: [], nextGap: 320 }, worldX);
}

function commitPattern(cand, worldX) {
  for (const h of cand.hazards) hazards.push(makeHazard(h.kind, h.x, rng));
  for (const c of cand.corns) corns.push(c);
  for (const h of cand.hearts) hearts.push(makeHeart(h.x, h.y));
  nextSpawnWorldX = worldX + cand.nextGap;
}

function onHit() {
  if (turkey.invulnerable > 0) return;
  state.lives -= 1;
  farmer.gap = Math.max(GAP_CAUGHT, farmer.gap - GAP_HIT_PENALTY);
  state.farmerGap = farmer.gap;
  turkey.invulnerable = 1.6;
  farmer.lunge = 1;
  state.flash = 1;
  state.flashColor = '#ff3b2e';
  // Medium juice: a dozen red/white particles at the turkey + trauma 0.3.
  spawnBurst(particles, TURKEY_X + state.scrollPx, turkey.y - 40, { count: 12, colors: ['#ff6a5a', '#fff', '#ffd23e'], speed: 240, size: 4, life: 0.6 });
  state.trauma = Math.max(state.trauma, 0.3);
  sounds.hit();
  sounds.spotted();
  announce(`Ouch! ${state.lives} ${state.lives === 1 ? 'life' : 'lives'} left — the farmer is closing in!`);
  if (state.lives <= 0) endRun(false);
}

function updatePlaying(dt) {
  tryBuffered();
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
      spawnFloater(particles, TURKEY_X + 40 + state.scrollPx, turkey.y - 130, `+${STAGE_BONUS} STAGE BONUS`, '#ffd23e');
      sounds.stageClear();
      announce(`${STAGES[idx].name}! ${STAGES[idx].tagline}`);
    }
  }
  if (state.banner > 0) state.banner = Math.max(0, state.banner - dt);
  if (state.flash > 0) state.flash = Math.max(0, state.flash - dt * 1.6);

  updateTurkey(turkey, dt, state.speed);
  // Landing juice: a puff of dust where the turkey touches down + a small
  // trauma nudge. justLanded is set by updateTurkey and consumed here.
  if (turkey.justLanded) {
    turkey.justLanded = false;
    spawnBurst(particles, TURKEY_X + state.scrollPx, GROUND_Y - 4, { count: 6, colors: ['#d8c9a8', '#b8a888', '#fff'], speed: 90, size: 3, life: 0.45, gravity: 120 });
    state.trauma = Math.max(state.trauma, 0.12);
  }
  updateFarmer(farmer, dt, state.speed, stage.baseSpeed, turkey);
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
      // Small juice: a tick of gold + a floating +25, no shake.
      spawnBurst(particles, c.x, c.y, { count: 4, colors: ['#f2c230', '#ffd23e'], speed: 120, size: 3, life: 0.4, gravity: 200 });
      spawnFloater(particles, c.x, c.y - 30, `+${CORN_SCORE}`, '#ffd23e');
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
        spawnFloater(particles, c.x, c.y - 30, '+1 LIFE!', '#ff4d6d');
      } else {
        state.score += 100;
        spawnFloater(particles, c.x, c.y - 30, '+100', '#ff4d6d');
      }
      state.score += 50;
      spawnBurst(particles, c.x, c.y, { count: 8, colors: ['#ff4d6d', '#fff'], speed: 160, size: 4, life: 0.6, gravity: 200 });
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
  // Fit the 1280x720 stage into the window, letterboxed. The canvas backing
  // store is resized ONLY when the window size actually changes: resetting
  // canvas.width every frame reallocates it and was the single biggest
  // per-frame cost.
  const scale = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  ctx.setTransform(scale, 0, 0, scale, (window.innerWidth - VIEW_W * scale) / 2, (window.innerHeight - VIEW_H * scale) / 2);
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  const mouse = input.mousePos();

  if (state.screen === 'title') {
    state.buttons = drawTitle(ctx, state.best, mouse);
    return;
  }
  // Screen shake (game-feel): trauma^2, summed sines of REAL time so it
  // never freezes off-centre during a hit-stop, decaying to exactly 0.
  // It moves the world only — the HUD stays put.
  const shake = state.trauma * state.trauma;
  const shakeX = shake * 14 * (Math.sin(realTime * 47.3) + Math.sin(realTime * 31.7) * 0.5);
  const shakeY = shake * 10 * (Math.sin(realTime * 39.1) + Math.sin(realTime * 27.3) * 0.5);
  ctx.save();
  ctx.translate(shakeX, shakeY);
  drawStageBackground(ctx, state.stageIndex, state.scrollPx, state.time);
  // World-space objects (corn, hearts, hazards, particles) are drawn with
  // the scroll baked into the transform, so no per-item object spread is
  // allocated in the hot loop.
  ctx.save();
  ctx.translate(-state.scrollPx, 0);
  for (const c of corns) {
    if (!c.taken) drawCorn(ctx, c, state.time);
  }
  for (const c of hearts) {
    if (!c.taken) drawHeart(ctx, c, state.time);
  }
  for (const h of hazards) drawHazard(ctx, h);
  drawParticles(ctx, particles);
  ctx.restore();
  // Forest gate, when it scrolls into view.
  const gateScreenX = gateWorldX - state.scrollPx;
  if (gateScreenX < VIEW_W + 260 && gateScreenX > -260) drawForestGate(ctx, gateScreenX, state.time);
  drawFarmer(ctx, farmer, TURKEY_X, GROUND_Y);
  drawTurkey(ctx, turkey);
  ctx.restore();
  drawHud(ctx, state);
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
      // Discrete actions go through the buffer: a press that arrives a hair
      // too early (mid-slide, mid-air, both jumps spent) fires the moment
      // it becomes legal instead of being dropped.
      if (action === 'jump') bufferAction('jump');
      else if (action === 'slide') bufferAction('slide');
      else if (action === 'pause') { state.screen = 'paused'; actionBuffer = []; sounds.stopMusic(); }
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
    else if (state.screen === 'playing' && click.y < 420) bufferAction('jump');
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
  get state() { return { screen: state.screen, score: Math.floor(state.score), distanceM: Math.floor(state.distanceM), lives: state.lives, corn: state.corn, farmerGap: Math.round(state.farmerGap), stageIndex: state.stageIndex, speed: Math.round(state.speed) }; },
  start: startRun,
  forceCaught: () => { if (state.screen === 'playing') endRun(false); },
  forceEscaped: () => { if (state.screen === 'playing') endRun(true); },
  setDistance: (m) => { state.distanceM = m; state.scrollPx = m * PX_PER_METRE; },
  get hazards() {
    // Read-only, for playtests: the hazards still ahead, in screen pixels.
    return hazards.filter((h) => !h.passed).map((h) => ({ kind: h.kind, screenX: Math.round(h.x - state.scrollPx), w: h.w }));
  },
  get turkey() {
    return { y: Math.round(turkey.y), sliding: turkey.sliding > 0, jumps: turkey.jumps };
  },
  get spawnStats() { return { ...spawnStats }; },
  get frameStats() {
    if (frameTimes.length < 10) return { frames: frameTimes.length, avgMs: 0, p50Ms: 0, p95Ms: 0, maxMs: 0 };
    const sorted = [...frameTimes].sort((a, b) => a - b);
    const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
    return { frames: frameTimes.length, avgMs: +avg.toFixed(2), p50Ms: +sorted[Math.floor(sorted.length * 0.5)].toFixed(2), p95Ms: +sorted[Math.floor(sorted.length * 0.95)].toFixed(2), maxMs: +sorted[sorted.length - 1].toFixed(2) };
  },
};

let last = performance.now();
let acc = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  realTime += dt;
  // Frame-time ring buffer (performance-optimization): last 300 rAF deltas.
  frameTimes.push(dt * 1000);
  if (frameTimes.length > 300) frameTimes.shift();
  // Juice that runs on REAL time, never scaled sim time: trauma decay,
  // score-pop decay, particles. They keep moving through a hit-stop.
  if (state.trauma > 0) state.trauma = Math.max(0, state.trauma - dt * 1.8);
  if (state.scorePop > 0) state.scorePop = Math.max(0, state.scorePop - dt * 2);
  updateParticles(particles, dt);
  handleInput();
  // Hit-stop (game-feel): the sim freezes for a short real-time window
  // while input keeps registering and particles keep moving. The latest
  // hit-stop call wins (hitStopUntil is overwritten, not maxed).
  if (now < state.hitStopUntil) {
    render();
    requestAnimationFrame(frame);
    return;
  }
  if (state.screen === 'playing') {
    acc += dt;
    const step = 1 / 60;
    let guard = 0;
    // Guard 12 (was 5): at 10 fps the accumulator needs 6 steps per frame;
    // capping at 5 made sim time fall behind wall time, which is what broke
    // the bot's timing windows in headless. The sim is cheap; 12 steps is
    // still bounded. If the guard is ever hit, drop the debt instead of
    // chasing it (no spiral of death).
    while (acc >= step && guard < 12) { updatePlaying(step); acc -= step; guard++; if (state.screen !== 'playing') { acc = 0; break; } }
    if (guard >= 12) acc = 0;
  } else {
    state.time += dt;
  }
  render();
  requestAnimationFrame(frame);
}

stageShot();
announce('Turkey Run! Press Space or click Start Run to escape the farmer.');
requestAnimationFrame(frame);

// In-page autopilot (?autobot=1 or ?autobot=sprint): a test hook only,
// off by default. It plays through the real input path so a headless run
// can be verified without a DevTools connection (see autobot.js).
const autobotMode = params.get('autobot');
if (autobotMode) {
  import('./autobot.js').then((m) => m.startAutobot(autobotMode === 'sprint')).catch((e) => console.error('autobot failed to load', e));
}
