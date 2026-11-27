// input.js — keyboard + mouse input for Turkey Run. Keys are tracked as a live
// set so holding Left/Right adjusts speed smoothly, and presses are queued as
// single "just pressed" events so a jump never fires twice from one keypress.
export function createInput(canvas) {
  const held = new Set();
  const pressedQueue = [];
  let clickQueue = [];
  let mouse = { x: 0, y: 0 };

  const KEYMAP = {
    Space: 'jump', ArrowUp: 'jump', KeyW: 'jump',
    ArrowDown: 'slide', KeyS: 'slide',
    ArrowLeft: 'slower', KeyA: 'slower',
    ArrowRight: 'faster', KeyD: 'faster',
    Enter: 'confirm', KeyM: 'mute', KeyP: 'pause', Escape: 'pause',
  };

  function onKeyDown(e) {
    const action = KEYMAP[e.code];
    if (!action) return;
    e.preventDefault();
    if (!held.has(action)) pressedQueue.push(action);
    held.add(action);
  }
  function onKeyUp(e) {
    const action = KEYMAP[e.code];
    if (action) held.delete(action);
  }
  function onMouseDown(e) {
    const rect = canvas.getBoundingClientRect();
    mouse = { x: (e.clientX - rect.left) * (canvas.width / rect.width), y: (e.clientY - rect.top) * (canvas.height / rect.height) };
    clickQueue.push({ ...mouse });
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousedown', onMouseDown);

  function isHeld(action) { return held.has(action); }
  // Drain the presses since the last frame; each press is reported exactly once.
  function drainPressed() { const out = pressedQueue.splice(0); return out; }
  function drainClicks() { const out = clickQueue.splice(0); return out; }
  function mousePos() { return mouse; }

  return { isHeld, drainPressed, drainClicks, mousePos };
}
