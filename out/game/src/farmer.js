// farmer.js — the pursuer. Farmer Bram chases from the left with a pitchfork,
// closing in whenever the turkey stumbles and falling back when it runs clean.
// His mood is visible at a glance: calm walk far away, red-faced sprint when
// close, and a triumphant grab when he catches the turkey.
export function createFarmer() {
  return { gap: 220, runPhase: 0, lunge: 0, grabbed: false };
}

export function farmerX(farmer, turkeyX) {
  return turkeyX - farmer.gap;
}

// The farmer closes when the turkey is slow or stumbles, and drops back when
// the turkey sprints. Returns 'close' while he is near enough to threaten.
export function updateFarmer(farmer, dt, playerSpeed, baseSpeed) {
  farmer.runPhase += dt * (7 + playerSpeed / 55);
  if (farmer.lunge > 0) farmer.lunge = Math.max(0, farmer.lunge - dt * 2.2);
  const drift = (playerSpeed - baseSpeed) * 0.45;
  farmer.gap += drift * dt;
  if (farmer.gap > 280) farmer.gap = 280;
  if (farmer.gap < 34) farmer.gap = 34;
}

export function drawFarmer(ctx, farmer, turkeyX, groundY) {
  const x = farmerX(farmer, turkeyX);
  if (x < -120) return; // fully off-screen to the left
  const close = farmer.gap < 90;
  const lunge = farmer.lunge > 0 ? Math.sin(farmer.lunge * Math.PI) * 26 : 0;
  const legSwing = Math.sin(farmer.runPhase) * 0.8;
  ctx.save();
  ctx.translate(x + lunge, groundY);

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
