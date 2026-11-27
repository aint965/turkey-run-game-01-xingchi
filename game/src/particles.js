// particles.js — game-feel juice: burst dots and floating score text.
// Spawned only on events (pickup, landing, hit, death/escape), never per
// frame, so the hot loop allocates nothing new here. Dots and texts live in
// world coordinates and are updated with REAL time, so they keep moving
// through a hit-stop instead of freezing with the simulation.
export function createParticles() {
  return { dots: [], texts: [] };
}

export function spawnBurst(p, x, y, opts) {
  const count = opts.count || 8;
  const colors = opts.colors || ['#ffd23e'];
  const speed = opts.speed || 220;
  const size = opts.size || 4;
  const life = opts.life || 0.6;
  const gravity = opts.gravity === undefined ? 500 : opts.gravity;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + Math.random() * 0.9;
    const v = speed * (0.4 + Math.random() * 0.6);
    p.dots.push({
      x, y,
      vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120,
      life: life * (0.7 + Math.random() * 0.3), maxLife: life,
      size: size * (0.7 + Math.random() * 0.6),
      color: colors[i % colors.length], gravity,
    });
  }
}

export function spawnFloater(p, x, y, text, color) {
  p.texts.push({ x, y, text, color: color || '#fff', life: 0.9, maxLife: 0.9 });
}

export function updateParticles(p, dt) {
  for (let i = p.dots.length - 1; i >= 0; i--) {
    const d = p.dots[i];
    d.life -= dt;
    if (d.life <= 0) { p.dots.splice(i, 1); continue; }
    d.vy += d.gravity * dt;
    d.x += d.vx * dt;
    d.y += d.vy * dt;
  }
  for (let i = p.texts.length - 1; i >= 0; i--) {
    const t = p.texts[i];
    t.life -= dt;
    if (t.life <= 0) { p.texts.splice(i, 1); continue; }
    t.y -= 42 * dt;
  }
}

export function drawParticles(ctx, p) {
  for (const d of p.dots) {
    ctx.globalAlpha = Math.max(0, d.life / d.maxLife);
    ctx.fillStyle = d.color;
    ctx.beginPath(); ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  ctx.font = 'bold 20px sans-serif';
  for (const t of p.texts) {
    ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}
