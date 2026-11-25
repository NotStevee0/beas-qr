let ctx = null;

/** Call from a click/tap so the browser allows sound later. */
export function unlockAudio() {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
  } catch (_) { /* no audio support */ }
}

/** Short two-tone "scanner" beep + vibration. */
export function beep() {
  try {
    unlockAudio();
    if (ctx) {
      const t = ctx.currentTime;
      [[1046, 0], [1568, 0.11]].forEach(([freq, delay]) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, t + delay);
        g.gain.exponentialRampToValueAtTime(0.35, t + delay + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.13);
        o.connect(g).connect(ctx.destination);
        o.start(t + delay);
        o.stop(t + delay + 0.14);
      });
    }
  } catch (_) { /* ignore */ }
  if (navigator.vibrate) navigator.vibrate(80);
}
