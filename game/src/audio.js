// Synthesised sound: engine hum, ring chime and touchdown thuds via WebAudio.
export function createAudio() {
  let context = null;
  let engineOsc = null;
  let engineGain = null;
  let muted = false;
  function ensureContext() {
    if (context) return context;
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return null;
    context = new AudioCtor();
    engineOsc = context.createOscillator();
    engineGain = context.createGain();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    engineGain.gain.value = 0;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    engineOsc.connect(filter);
    filter.connect(engineGain);
    engineGain.connect(context.destination);
    engineOsc.start();
    return context;
  }
  function blip(frequency, seconds, type, volume) {
    const ctx = ensureContext();
    if (!ctx || muted) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(volume || 0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + seconds);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + seconds);
  }
  return {
    unlock() {
      const ctx = ensureContext();
      if (ctx && ctx.state === 'suspended') ctx.resume();
    },
    setEngine(throttle, speed) {
      if (!context || !engineOsc) return;
      const target = muted ? 0 : 0.015 + throttle * 0.05;
      engineGain.gain.setTargetAtTime(target, context.currentTime, 0.08);
      engineOsc.frequency.setTargetAtTime(52 + throttle * 68 + speed * 0.25, context.currentTime, 0.08);
    },
    ringChime() {
      blip(880, 0.18, 'sine', 0.14);
      setTimeout(() => blip(1320, 0.22, 'sine', 0.1), 90);
    },
    thud() {
      blip(82, 0.28, 'triangle', 0.2);
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
  };
}
