// farmer.js — the pursuer. Farmer Bram chases from the left with a pitchfork,
// closing in whenever the turkey stumbles and falling back when it runs clean.
// His mood is visible at a glance: calm walk far away, red-faced sprint when
// close, and a triumphant grab when he catches the turkey.
//
// He runs an INTERCEPT, not a drift: he aims at where the turkey will be —
// the landing spot of a jump, the far side of a fence — and runs the short
// way there. The turkey's jump arc is longer than his straight run under it,
// the slide ducks under a rail he steps over, and a landing costs the turkey
// a beat: each is a corner he cuts. His closing tapers as he nears the
// turkey (he cannot sprint through the last few steps), so cuts alone never
// catch a clean run — only stumbles and hits let him finish the job.
import { GROUND_Y, GAP_MAX, GAP_CAUGHT } from './config.js';

// How fast the farmer closes the gap (px/s) while the turkey takes the long
// way round. Small on purpose: the gap is also the turkey's safety margin,
// and a clean run must still escape — the autoplay traces in the repo's
// verification runs are what these numbers were tuned against.
const AIR_CUT = 4; // turkey airborne: farmer runs straight under the arc
const SLIDE_CUT = 3; // turkey sliding: farmer steps over the low fence
const STUMBLE_CUT = 3; // just landed: the turkey loses a beat

export function createFarmer() {
  return { gap: 220, runPhase: 0, lunge: 0, grabbed: false, closing: false };
}

export function farmerX(farmer, turkeyX) {
  return turkeyX - farmer.gap;
}

// The farmer matches the turkey's pace on open ground, so the gap only moves
// when the turkey sprints, dawdles, or takes the long way round. Returns
// 'close' while he is near enough to threaten.
export function updateFarmer(farmer, dt, playerSpeed, baseSpeed, turkey) {
  farmer.runPhase += dt * (7 + playerSpeed / 55);
  if (farmer.lunge > 0) farmer.lunge = Math.max(0, farmer.lunge - dt * 2.2);
  const air = turkey.y < GROUND_Y;
  const sliding = turkey.sliding > 0;
  const stumbling = turkey.squash > 0.45;
  let cut = 0;
  if (air) cut += AIR_CUT;
  if (sliding) cut += SLIDE_CUT;
  if (stumbling) cut += STUMBLE_CUT;
  farmer.closing = cut > 0;
  // Taper (quadratic): the closer he already is, the less each cut gains
  // him — he cannot sprint through the last few steps, so cuts alone never
  // catch a clean run, and the gap settles where corn and sprinting can
  // rebuild it above one hit's worth. Only stumbles and hits let him
  // finish the job.
  const t = Math.max(0.1, Math.min(1, (farmer.gap - GAP_CAUGHT) / (GAP_MAX - GAP_CAUGHT)));
  const taper = t * t;
  const drift = (playerSpeed - baseSpeed) * 0.45 - cut * taper;
  farmer.gap += drift * dt;
  if (farmer.gap > GAP_MAX) farmer.gap = GAP_MAX;
  if (farmer.gap < GAP_CAUGHT) farmer.gap = GAP_CAUGHT;
}

export function drawFarmer(ctx, farmer, turkeyX, groundY) {
  const x = farmerX(farmer, turkeyX);
  if (x < -120) return; // fully off-screen to the left
  const close = farmer.gap < 90;
  const lunge = farmer.lunge > 0 ? Math.sin(farmer.lunge * Math.PI) * 26 : 0;
  const legSwing = Math.sin(farmer.runPhase) * 0.8;
  ctx.save();
  ctx.translate(x + lunge, groundY);
  // Leaning into the chase: while he is cutting a corner he sprints low and forward.
  if (farmer.closing) ctx.rotate(0.07);

  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(0, 2, 34, 7, 0, 0, Math.PI * 2); ctx.fill();

  // Legs: blue overalls pumping.
  ctx.strokeStyle = '#2f4d7a';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-6, -52); ctx.lineTo(-6 + legSwing * 14, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(6, -52); ctx.lineTo(6 - legSwing * 14, 0); ctx.stroke();

  // Body: red plaid shirt + denim overalls.
  ctx.fillStyle = '#b03a2e';
  ctx.beginPath(); ctx.ellipse(0, -78, 24, 28, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2f4d7a';
  ctx.fillRect(-20, -72, 40, 24);
  ctx.fillStyle = '#d8c27a';
  ctx.fillRect(-14, -70, 6, 6); ctx.fillRect(8, -70, 6, 6);
  // Plaid stripes.
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-22, -88); ctx.lineTo(22, -88); ctx.moveTo(-22, -76); ctx.lineTo(22, -76); ctx.stroke();

  // Arm reaching forward with the pitchfork.
  const reach = close ? 26 : 16;
  ctx.strokeStyle = '#e8b98a';
  ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(10, -92); ctx.lineTo(26 + reach, -78); ctx.stroke();
  // Pitchfork: wooden handle, three steel prongs.
  ctx.strokeStyle = '#7a5230';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(24 + reach, -110); ctx.lineTo(40 + reach, -52); ctx.stroke();
  ctx.strokeStyle = '#c9c9c9';
  ctx.lineWidth = 3;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath(); ctx.moveTo(24 + reach + i * 5, -110); ctx.lineTo(30 + reach + i * 7, -128); ctx.stroke();
  }

  // Head: straw hat, moustache, and a face that turns redder as he closes in.
  ctx.fillStyle = close ? '#e0705a' : '#e8b98a';
  ctx.beginPath(); ctx.arc(0, -112, 15, 0, Math.PI * 2); ctx.fill();
  // Straw hat.
  ctx.fillStyle = '#d8b25e';
  ctx.beginPath(); ctx.ellipse(0, -122, 26, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, -128, 15, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#a03a2e';
  ctx.fillRect(-15, -126, 30, 4);
  // Eyes + angry brows + moustache.
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(-5, -114, 3.4, 0, Math.PI * 2); ctx.arc(6, -114, 3.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1c1c1c';
  ctx.beginPath(); ctx.arc(-4, -114, 1.6, 0, Math.PI * 2); ctx.arc(7, -114, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#4a2c14';
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(-9, -119); ctx.lineTo(-1, -117); ctx.moveTo(3, -117); ctx.lineTo(11, -119); ctx.stroke();
  ctx.fillStyle = '#4a2c14';
  ctx.beginPath(); ctx.ellipse(1, -104, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
  // Shout lines when close.
  if (close) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('COME BACK HERE!', 10, -152);
  }
  ctx.restore();
}
