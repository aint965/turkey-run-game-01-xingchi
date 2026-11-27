// In-page autopilot for Turkey Run! — the same bot logic as the CDP driver
// (turkey-driver.mjs), but running inside the page so it needs no DevTools
// connection. Activated only by an explicit URL param (?autobot=1 or
// ?autobot=sprint); normal play is untouched. When the run ends it writes
// the result into document.title (readable by --dump-dom) and
// window.__autoResult, so a headless run can be verified without CDP.
//
// Why in-page: under CPU contention the CDP round-trips stall and the
// driver can no longer observe a long run, even though the game itself
// keeps playing fine. The bot plays through the REAL input path
// (KeyboardEvents -> input module -> action buffer), so a completion here
// proves the game is passable with the same timing a player faces.
const TURKEY_X = 300;

function jumpLead(kind, speed, delayPx) {
  // The true midpoint lead: (|v|/g)*speed - C/2, where C is the hazard's
  // crossing (hitbox w + turkey w). The turkey is above a hazard's height
  // from t1 to t2 and t1+t2 is exactly the full airtime 2|v|/g, so the
  // midpoint is (|v|/g)*speed - C/2 for every hazard. (The earlier
  // formula used (min + airtime*speed - C)/2, 13-26 px too late: the
  // turkey landed just as the NEXT hazard arrived, with no time to jump
  // it — that is what killed the bot on doubles.) PLUS 32 px: nearEdge
  // is measured from the turkey's CENTRE, but the collision happens at
  // the hitbox FRONT, 32 px ahead. PLUS the bot's own tick delay
  // (delayPx, measured live).
  const halfAir = 980 / 2600; // |JUMP_VELOCITY| / GRAVITY = 0.377 s
  if (kind === 'oven') return halfAir * speed - 154 / 2 + 32 + delayPx;
  if (kind === 'knife') return halfAir * speed - 90 / 2 + 32 + delayPx;
  return halfAir * speed - 146 / 2 + 32 + delayPx; // hay
}

// The 0.55 s slide must last until the fence rail's trailing edge has
// passed the turkey's BACK (nearEdge -94): L <= 0.55*speed - 94, minus
// 10 px sampling margin.
function slideLead(speed) { return 0.55 * speed - 104; }

export function startAutobot(sprint) {
  const bot = {
    sprint: !!sprint, lastY: 600, lastLives: 3, minGap: 999,
    ring: [], hits: [], started: false,
    lastJumpPress: 0, lastSlidePress: 0, lastTick: 0, tickMs: 33,
  };
  window.__auto = bot;
  const key = (code, keyName, type) => window.dispatchEvent(new KeyboardEvent(type, { code, key: keyName, bubbles: true }));
  const pressSpace = () => { key('Space', ' ', 'keydown'); setTimeout(() => key('Space', ' ', 'keyup'), 40); };
  const tapSlide = () => { key('ArrowDown', 'ArrowDown', 'keydown'); setTimeout(() => key('ArrowDown', 'ArrowDown', 'keyup'), 80); };
  const nearEdgeOf = (h) => h.screenX - TURKEY_X - h.w / 2;

  function report(screen) {
    const g = window.__turkeyGame;
    const st = g.state;
    const result = {
      screen, distanceM: st.distanceM, lives: st.lives, score: st.score,
      corn: st.corn, minGap: bot.minGap, hits: bot.hits.length,
      frameStats: g.frameStats, spawnStats: g.spawnStats,
    };
    window.__autoResult = result;
    document.title = 'AUTOBOT ' + JSON.stringify(result);
  }

  function tick() {
    const g = window.__turkeyGame;
    if (!g) { requestAnimationFrame(tick); return; }
    const nowMs = performance.now();
    if (bot.lastTick) bot.tickMs = bot.tickMs * 0.8 + (nowMs - bot.lastTick) * 0.2;
    bot.lastTick = nowMs;
    const st = g.state;
    if (st.screen === 'caught' || st.screen === 'escaped') {
      if (!bot.reported) { bot.reported = true; report(st.screen); }
      requestAnimationFrame(tick);
      return;
    }
    if (st.screen === 'title' && !bot.started) {
      bot.started = true;
      if (bot.sprint) key('ArrowRight', 'ArrowRight', 'keydown');
      pressSpace();
      requestAnimationFrame(tick);
      return;
    }
    if (st.screen !== 'playing') { requestAnimationFrame(tick); return; }
    const hz = g.hazards, tk = g.turkey;
    const speed = st.speed || 300;
    const delayPx = speed * (bot.tickMs / 1000);
    if (st.farmerGap < bot.minGap) bot.minGap = st.farmerGap;
    bot.ring.push({ d: st.distanceM, y: tk.y, j: tk.jumps, s: tk.sliding, lives: st.lives, gap: st.farmerGap, h: hz.slice(0, 2).map((x) => x.kind + '@' + x.screenX) });
    if (bot.ring.length > 150) bot.ring.shift();
    if (st.lives < bot.lastLives) { bot.hits.push({ d: st.distanceM, lives: bot.lastLives + '->' + st.lives, gap: st.farmerGap, ring: bot.ring.slice(-30) }); bot.lastLives = st.lives; }
    const ahead = hz.filter((h) => h.screenX > TURKEY_X - 140 && h.screenX < TURKEY_X + 470).sort((a, b) => a.screenX - b.screenX);
    const crossed = ahead.find((h) => nearEdgeOf(h) <= 0 && nearEdgeOf(h) > -140);
    const next = ahead.find((h) => nearEdgeOf(h) > 0);
    const now = performance.now();
    if (next) {
      const nearEdge = nearEdgeOf(next);
      if (next.kind === 'fence') {
        if (nearEdge < slideLead(speed) && now - bot.lastSlidePress > 120) {
          if (tk.y >= 600 && !tk.sliding) { tapSlide(); bot.lastSlidePress = now; }
          else if (tk.y < 600 && nearEdge < 60) { tapSlide(); bot.lastSlidePress = now; }
        }
      } else {
        const lead = jumpLead(next.kind, speed, delayPx);
        if (tk.sliding) {
          // Do NOT press while sliding: a jump buffered at slide start
          // fires the moment the slide ends, when the hazard behind a
          // fence is still 125+ px away at 300 px/s — the turkey would
          // land on it. After the slide ends the ground-jump logic below
          // fires at the hazard's own window, which the validator proves
          // is passable.
        } else if (tk.y >= 600 && tk.jumps === 0 && nearEdge <= lead) {
          // No lower bound: a late jump is still better than running
          // into the hazard — the double jump over the crossed hazard
          // saves it.
          pressSpace(); bot.lastJumpPress = now;
        } else if (tk.y < 600 && tk.jumps === 2 && nearEdge < 170 && now - bot.lastJumpPress > 120) {
          // Both jumps spent mid-air: buffer the press for landing.
          pressSpace(); bot.lastJumpPress = now;
        }
      }
    }
    // Double jump: a LAST-RESORT save, fired LATE — only when falling and
    // the turkey's bottom is within 80 px of the crossed hazard's top
    // (it is about to clip it). The 40 px window was crossed in a single
    // tick at 30 fps, so the bot never saw it (the 271 m hay hit: y went
    // 493 -> 539 in one tick). And the extra flight (~0.75-0.81 s,
    // ~300-316 px at stage-2 speed) must land well BEFORE the next
    // hazard arrives: a double jump into a 300 px-spaced double lands
    // the turkey descending onto the next hazard (the 666 m knife hit:
    // the double jump fired, the turkey descended onto the knife with
    // no jumps left). So it only fires when the nearest hazard ahead —
    // any kind — is far enough that the landing comes 40+ px before
    // that hazard's leading edge reaches the turkey.
    if (tk.y < 600 && tk.jumps === 1 && tk.y > bot.lastY) {
      const over = crossed && crossed.kind !== 'fence';
      if (over) {
        const topY = { oven: 490, knife: 512, hay: 538 }[crossed.kind];
        if (tk.y > topY - 80) {
          const h0 = 600 - tk.y;
          const flightS = 820 / 2600 + Math.sqrt(2 * (h0 + 129) / 2600);
          const landPx = flightS * speed;
          const nextHaz = hz.filter((h) => h.screenX > crossed.screenX).sort((a, b) => a.screenX - b.screenX)[0];
          const nextN = nextHaz ? nearEdgeOf(nextHaz) : Infinity;
          if (nextN > landPx + 72) pressSpace();
        }
      }
    }
    bot.lastY = tk.y;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  return 'autobot installed';
}
