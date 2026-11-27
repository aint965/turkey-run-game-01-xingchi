// audio.js — every sound in Turkey Run is synthesized with WebAudio. No audio
// files are loaded, so the game stays silent on the network and tiny on disk.
// The context is created lazily on the first user gesture (browsers block audio
// before that), and every effect is a short oscillator/noise envelope.
export function createSoundBank() {
  let ctx = null;
  let muted = false;
  let musicTimer = null;
  let musicStep = 0;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type = 'sine', vol = 0.16, slideTo = null, delay = 0) {
    const c = ensure();
    if (!c || muted) return;
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noiseBurst(dur, vol = 0.2, lowpass = 1200) {
    const c = ensure();
    if (!c || muted) return;
    const t0 = c.currentTime;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = c.createGain();
    gain.gain.value = vol;
    src.connect(filter).connect(gain).connect(c.destination);
    src.start(t0);
  }

  // A two-note gobble: the turkey's signature sound.
  function gobble() {
    tone(520, 0.09, 'square', 0.10, 380);
    tone(660, 0.09, 'square', 0.10, 300, 0.10);
    tone(440, 0.12, 'square', 0.08, 520, 0.20);
  }

  function jump() { tone(280, 0.18, 'sine', 0.14, 620); }
  function pickup() { tone(880, 0.08, 'triangle', 0.16); tone(1320, 0.12, 'triangle', 0.14, null, 0.07); }
  function hit() { noiseBurst(0.22, 0.28, 900); tone(160, 0.25, 'sawtooth', 0.16, 60); }
  function slide() { noiseBurst(0.14, 0.10, 2400); }
  function click() { tone(700, 0.06, 'triangle', 0.12); }
  function spotted() { tone(980, 0.10, 'square', 0.12, 1240); tone(1240, 0.14, 'square', 0.12, 980, 0.10); }
  function caught() {
    tone(392, 0.22, 'sawtooth', 0.16, 370);
    tone(311, 0.22, 'sawtooth', 0.16, 294, 0.22);
    tone(233, 0.5, 'sawtooth', 0.18, 110, 0.44);
    noiseBurst(0.3, 0.12, 500);
  }
  function escaped() {
    // A little harvest fanfare: C E G C, bright and quick.
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => tone(f, 0.22, 'triangle', 0.16, null, i * 0.13));
    tone(1319, 0.5, 'triangle', 0.14, null, 0.55);
  }
  function stageClear() {
    tone(784, 0.12, 'triangle', 0.14);
    tone(988, 0.18, 'triangle', 0.14, null, 0.11);
  }

  // A bouncy bass-and-pluck loop, scheduled one beat at a time from the game loop.
  const BASS = [131, 0, 165, 0, 196, 0, 165, 0, 131, 0, 165, 0, 220, 196, 165, 147];
  function musicBeat() {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    const f = BASS[musicStep % BASS.length];
    musicStep++;
    if (f) tone(f, 0.22, 'triangle', 0.07);
    if (musicStep % 4 === 1) tone(660 + (musicStep % 8) * 20, 0.08, 'sine', 0.03);
  }

  function startMusic() {
    if (musicTimer !== null) return;
    musicTimer = setInterval(musicBeat, 210);
  }
  function stopMusic() {
    if (musicTimer !== null) { clearInterval(musicTimer); musicTimer = null; }
  }
  function unlock() { ensure(); }
  function toggleMute() { muted = !muted; return muted; }
  function isMuted() { return muted; }

  return { unlock, gobble, jump, pickup, hit, slide, click, spotted, caught, escaped, stageClear, startMusic, stopMusic, toggleMute, isMuted };
}
