/**
 * The soft meow on page transitions (ADR-032). It is synthesized with the
 * Web Audio API, so there is no sound file to license or download: a
 * rising-then-falling voice through a sweeping formant filter. It is quiet,
 * short (under half a second), only follows a visitor's own navigation, and
 * the footer's "Cat sounds" switch turns it off (remembered on the device).
 */

export const CAT_SOUNDS_KEY = "brew-ni-cat:cat-sounds";
export const CAT_SOUNDS_EVENT = "brew-ni-cat:cat-sounds";

/** On unless the visitor turned it off on this device. */
export function catSoundsOn(): boolean {
  try {
    return window.localStorage.getItem(CAT_SOUNDS_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setCatSounds(on: boolean) {
  try {
    window.localStorage.setItem(CAT_SOUNDS_KEY, on ? "on" : "off");
  } catch {
    // storage blocked: the switch still works for this page view
  }
  window.dispatchEvent(new CustomEvent(CAT_SOUNDS_EVENT, { detail: on }));
}

/** Pitch shape of one meow, in Hz over its length (0..1). */
export type MeowShape = Readonly<{
  start: number;
  peak: number;
  end: number;
  ms: number;
}>;

/** A meow a little different each time, from one random number. */
export function meowShape(random: number): MeowShape {
  const r = Math.min(Math.max(random, 0), 1);
  const start = 520 + r * 160;
  return {
    start,
    peak: start * (1.55 + r * 0.2),
    end: start * (1.05 + r * 0.1),
    ms: Math.round(340 + r * 140),
  };
}

let context: AudioContext | null = null;

/** Plays one meow, if sound is allowed and the browser can make it. */
export function meow(random = Math.random(), volume = 0.08) {
  if (typeof window === "undefined" || !catSoundsOn()) return false;
  const Context =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Context) return false;
  try {
    context ??= new Context();
    if (context.state === "suspended") void context.resume();
    const shape = meowShape(random);
    const now = context.currentTime;
    const length = shape.ms / 1000;

    const voice = context.createOscillator();
    voice.type = "sawtooth";
    voice.frequency.setValueAtTime(shape.start, now);
    voice.frequency.exponentialRampToValueAtTime(
      shape.peak,
      now + length * 0.35,
    );
    voice.frequency.exponentialRampToValueAtTime(shape.end, now + length);

    // the "ee-ow" vowel: the formant opens, then closes
    const formant = context.createBiquadFilter();
    formant.type = "bandpass";
    formant.Q.value = 6;
    formant.frequency.setValueAtTime(900, now);
    formant.frequency.linearRampToValueAtTime(2000, now + length * 0.4);
    formant.frequency.linearRampToValueAtTime(1100, now + length);

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.04);
    gain.gain.setValueAtTime(volume, now + length * 0.6);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + length);

    voice.connect(formant).connect(gain).connect(context.destination);
    voice.start(now);
    voice.stop(now + length + 0.02);
    return true;
  } catch {
    return false;
  }
}
