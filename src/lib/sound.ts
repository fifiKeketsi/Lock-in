// Synthesized Web Audio API sound effects for Lock-In
// Zero external assets or network requests required.

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Urgent two-tone alert for active procrastination nudges
 * Plays when user attempts to leave screen or picks up device mid-study session.
 */
export function playAlertNudge() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Tone 1: High alarm beep
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = "sawtooth";
  osc1.frequency.setValueAtTime(880, now); // A5
  osc1.frequency.exponentialRampToValueAtTime(440, now + 0.15);
  gain1.gain.setValueAtTime(0.25, now);
  gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.16);

  // Tone 2: Immediate follow-up warning
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = "square";
  osc2.frequency.setValueAtTime(659.25, now + 0.16); // E5
  osc2.frequency.exponentialRampToValueAtTime(329.63, now + 0.35);
  gain2.gain.setValueAtTime(0.22, now + 0.16);
  gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now + 0.16);
  osc2.stop(now + 0.36);
}

/**
 * Celebratory, relaxing chime when deep-work study block completes and official break begins
 */
export function playBreakChime() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 (Major chord)
  notes.forEach((freq, idx) => {
    const now = ctx.currentTime + idx * 0.12;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.75);
  });
}

/**
 * Inspiring deep-work lock-in engagement tone
 */
export function playStartChime() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const notes = [440, 554.37, 659.25]; // A4, C#5, E5
  notes.forEach((freq, idx) => {
    const now = ctx.currentTime + idx * 0.09;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.5);
  });
}
