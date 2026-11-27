[![turkey-run-game-01](https://make.fun/badge/turkey-run-game-01.svg)](https://make.fun/bounty/turkey-run-game-01)
[![rank](https://make.fun/badge/turkey-run-game-01/aint965/turkey-run-game-01-xingchi/rank.svg)](https://make.fun/bounty/turkey-run-game-01)
[![reward](https://make.fun/badge/turkey-run-game-01/aint965/turkey-run-game-01-xingchi/reward.svg)](https://make.fun/bounty/turkey-run-game-01)

# Turkey Run! — Escape Thanksgiving Dinner

A complete original 2D canvas turkey escape game for the make.fun bounty
[turkey-run-game-01](https://make.fun/bounty/turkey-run-game-01). You are the
turkey, and Thanksgiving is coming. Farmer Bram is chasing you with his
pitchfork, the oven is hot, and the carving knife is sharp — run through the
farmyard, the barn and the kitchen, and escape through the forest gate.

## How to play

- **SPACE / ↑ / W** — jump (press twice for a double jump)
- **↓ / S** — slide and hide under fences
- **← / →** — slow down / speed up (speed up to pull away from the farmer)
- **Mouse** — click the menu buttons
- **M** — mute, **P** — pause

Grab corn for points (+25 each) and to pull a little further ahead of the
farmer. A rare pumpkin-pie heart restores a lost life (+50 points at full
health). Hitting an oven, a hay bale, a fence or a swinging carving knife costs
a life and lets the farmer close in — lose all 3 lives, or let him catch up
completely, and you are caught. Reach the forest gate at 900 m to escape.
Each stage is faster and throws hazards closer together, and your best score
and distance are saved for the session so there is always a run to beat.

## Features

- Title screen, live HUD (score, distance, stage, lives, corn), pause card,
  and end screens for both **CAUGHT** and **ESCAPED** with a restart button
- A farmer who chases, closes in when you stumble, and lunges when he is close
- Three stages — Farmyard, The Barn, The Kitchen — with their own palettes,
  scenery, speed and hazard mixes, ending at the forest gate
- Jumping, double-jumping, sliding/hiding, speed control, corn pickups, stage
  bonuses and a saved best escape
- All art drawn in code on canvas (no image files) and all sounds synthesized
  with WebAudio (no audio files) — the game makes zero network requests

## Play it

Serve `game/` with any static server and open `game/index.html` in desktop
Chrome, for example:

```sh
node serve.ts
# open http://localhost:8080
```

## Files

- `game/index.html` — the page; `game/src/` holds the game's own source, one
  job per file: `config.js` (tuning + stages), `main.js` (loop + state
  machine), `turkey.js` (player physics + drawing), `farmer.js` (the
  pursuer), `hazards.js` (ovens, knives, fences, hay, corn), `stages.js`
  (scenery), `screens.js` (title / HUD / pause / end screens), `audio.js`
  (synthesized sounds), `input.js` (keyboard + mouse)
- `screenshots/` — four real renders of the game
- `main.ts` — the hand-in program (copies `game/` + `screenshots/` to
  `/output` and writes `dossier.json`); `vendor/makefun-game.ts` is the kit's
  library, unchanged

## License

MIT — see [LICENSE](LICENSE).
