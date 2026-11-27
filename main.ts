// Turkey Run! — the hand-in program for turkey-run-game-01 (Node 22, standard
// library only). It takes this repository's game/ (the playable turkey escape
// game: plain static files, no build step, no network request) and screenshots/
// (four real renders of the game) and hands them in: it copies both folders
// into the output directory and writes /output/dossier.json with buildDossier
// from the vendored make.fun library, so the judge reads exactly the game and
// images that were built here.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// The output directory is cleared first, so running the program twice from the
// same repository writes byte-identical output both times.

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Never clear a directory that is not clearly an output directory: a stray
// MAKEFUN_OUTPUT_DIR pointing at / or at this repository would delete the
// wrong thing. /output and any path ending in /out or /out2 is fine.
const outBase = outDir.replace(/\/$/, '').split('/').pop();
if (outDir === '/' || outDir === repoRoot.replace(/\/$/, '') || (outBase !== 'output' && outBase !== 'out' && outBase !== 'out2' && !outDir.endsWith('/output'))) {
  throw new Error(`refusing to clear unexpected MAKEFUN_OUTPUT_DIR: ${outDir}`);
}

// Start from an empty output directory: a stale file from an earlier run must
// never leak into a later hand-in, and clearing first keeps the two grader
// runs byte-identical.
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// Pre-flight: the four dossier screenshots are the judge's first look, so
// check them before the dossier is built — a missing or oversized shot fails
// here with a clear message instead of a cryptic dossier error.
const shotDir = join(repoRoot, 'screenshots');
if (existsSync(shotDir)) {
  for (const name of ['1-play.png', '2-title.png', '3-kitchen.png', '4-end.png']) {
    const p = join(shotDir, name);
    if (!existsSync(p)) throw new Error(`missing dossier screenshot: screenshots/${name} (run the driver shots mode first)`);
    const bytes = statSync(p).size;
    if (bytes > 262144) throw new Error(`dossier screenshot too big: screenshots/${name} is ${bytes} bytes (cap 262144)`);
  }
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the others refuse an entry the scorer would refuse (more than 4
// screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of
// game files in all, or a path under game/ over 1000 bytes: game/ counts
// beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
const dossierCaps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};
const dossier = buildDossier(outDir, dossierCaps);
writeFileSync(join(outDir, 'dossier.json'), dossier);

// Self-check: buildDossier must be a pure function of the output
// directory's contents (game/ + screenshots/), so rebuilding it from the
// written directory has to reproduce the exact bytes just written. If it
// does not, the hand-in is not reproducible across the grader's two runs —
// fail loudly here instead of handing in a dossier the second run would
// not reproduce.
const rebuilt = buildDossier(outDir, dossierCaps);
const written = readFileSync(join(outDir, 'dossier.json'));
if (rebuilt.length !== written.length || !rebuilt.every((b, i) => b === written[i])) {
  throw new Error('dossier self-check failed: rebuilt dossier differs from the written one');
}
