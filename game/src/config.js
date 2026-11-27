// config.js — every tunable number for Turkey Run lives here, so tuning never
// means hunting through the game loop. All distances are in logical pixels on a
// 1280x720 stage; distances in metres are scroll pixels divided by PX_PER_METRE.
export const VIEW_W = 1280;
export const VIEW_H = 720;
export const GROUND_Y = 600;
export const PX_PER_METRE = 50;

export const TURKEY_X = 300;
export const GRAVITY = 2600;
export const JUMP_VELOCITY = -980;
export const DOUBLE_JUMP_VELOCITY = -820;
export const SLIDE_TIME = 0.55;

// Action buffer (input-systems): a discrete press (jump/slide) that arrives a
// hair too early stays valid for this long in GAME time, is consumed exactly
// once when the action becomes legal, then is dropped. It forgives the
// 0.1-0.3 s timing windows without changing what a press does.
export const ACTION_BUFFER_S = 0.15;

export const STAGE_LENGTH_M = 300;
export const ESCAPE_DISTANCE_M = STAGE_LENGTH_M * 3; // farmyard -> barn -> kitchen -> forest gate
export const MAX_LIVES = 3;

export const GAP_START = 220;
export const GAP_MAX = 280;
export const GAP_CAUGHT = 34;
export const GAP_HIT_PENALTY = 85;
export const GAP_STUMBLE_PENALTY = 55;

export const CORN_SCORE = 25;
export const STAGE_BONUS = 500;

// Per-stage tuning: how fast the world scrolls, how often hazards appear, and
// which hazards the stage throws at the turkey.
export const STAGES = [
  {
    name: 'FARMYARD',
    tagline: 'The farmyard — mind the fences!',
    skyTop: '#f7b733', skyBottom: '#fcdd8a',
    ground: '#b5773a', groundDark: '#8f5a28',
    baseSpeed: 300, spawnEveryMin: 430, spawnEveryMax: 700,
    hazards: ['fence', 'hay', 'knife'],
  },
  {
    name: 'THE BARN',
    tagline: 'Through the barn — hay, hooks and knives!',
    skyTop: '#c96f2e', skyBottom: '#e8a04c',
    ground: '#7a4a26', groundDark: '#5d371c',
    baseSpeed: 345, spawnEveryMin: 380, spawnEveryMax: 620,
    hazards: ['hay', 'knife', 'oven', 'fence'],
  },
  {
    name: 'THE KITCHEN',
    tagline: 'The kitchen — the oven is HOT!',
    skyTop: '#8e3b2f', skyBottom: '#d97b4f',
    ground: '#6e3b2a', groundDark: '#542b1e',
    baseSpeed: 390, spawnEveryMin: 330, spawnEveryMax: 560,
    hazards: ['oven', 'knife', 'oven', 'hay'],
  },
];

export function stageIndexFor(distanceM) {
  return Math.min(STAGES.length - 1, Math.floor(distanceM / STAGE_LENGTH_M));
}
