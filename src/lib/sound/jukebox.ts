/**
 * The footer jukebox (FR-115, ADR-033): soft French café music, played only
 * when a visitor presses play. Every note is synthesized with the Web Audio
 * API in the style of a musette accordion (two reeds tuned a little apart),
 * over an "oom-pah" bass and chords, so there is no recording to license or
 * download. The songs are two French folk songs in the public domain and two
 * waltzes written for the shop.
 */

/** A note name and octave, like "C5" or "G#4", or "-" for a rest. */
export type Pitch = string;

/** One bar: the chord under it and the melody notes as [pitch, beats]. */
export type Bar = Readonly<{
  chord: string;
  notes: readonly (readonly [Pitch, number])[];
}>;

export type Song = Readonly<{
  id: string;
  title: string;
  credit: string;
  bpm: number;
  beatsPerBar: 3 | 4;
  bars: readonly Bar[];
}>;

const TRADITIONAL = "French folk song, traditional (public domain)";
const ORIGINAL = "Written for Brew ni Cat";

const clair = (chords: [string, string, string, string]): Bar[] => [
  {
    chord: chords[0],
    notes: [
      ["C5", 1],
      ["C5", 1],
      ["C5", 1],
      ["D5", 1],
    ],
  },
  {
    chord: chords[1],
    notes: [
      ["E5", 2],
      ["D5", 2],
    ],
  },
  {
    chord: chords[2],
    notes: [
      ["C5", 1],
      ["E5", 1],
      ["D5", 1],
      ["D5", 1],
    ],
  },
  { chord: chords[3], notes: [["C5", 4]] },
];

const jacques: Bar[] = [
  {
    chord: "C",
    notes: [
      ["C5", 1],
      ["D5", 1],
      ["E5", 1],
      ["C5", 1],
    ],
  },
  {
    chord: "C",
    notes: [
      ["E5", 1],
      ["F5", 1],
      ["G5", 2],
    ],
  },
  {
    chord: "C",
    notes: [
      ["G5", 0.5],
      ["A5", 0.5],
      ["G5", 0.5],
      ["F5", 0.5],
      ["E5", 1],
      ["C5", 1],
    ],
  },
  {
    chord: "C",
    notes: [
      ["C5", 1],
      ["G4", 1],
      ["C5", 2],
    ],
  },
];

/** Waltz bars from [chord, three quarter-note pitches or a held note]. */
const waltz = (rows: readonly (readonly [string, string])[]): Bar[] =>
  rows.map(([chord, line]) => {
    const parts = line.split(" ");
    const notes: [Pitch, number][] = [];
    for (const part of parts) {
      const [pitch, beats] = part.split(":");
      notes.push([pitch!, Number(beats ?? 1)]);
    }
    return { chord, notes };
  });

export const SONGS: readonly Song[] = [
  {
    id: "valse-du-chat",
    title: "Valse du chat",
    credit: ORIGINAL,
    bpm: 150,
    beatsPerBar: 3,
    bars: waltz([
      ["Am", "A4 C5 E5"],
      ["Dm", "F5:2 E5"],
      ["E7", "D5 B4 G#4"],
      ["Am", "A4:3"],
      ["Am", "A4 C5 E5"],
      ["Dm", "A5:2 F5"],
      ["G7", "G5 F5 D5"],
      ["C", "E5:3"],
      ["F", "F5 E5 D5"],
      ["Dm", "D5 C5 A4"],
      ["E7", "B4 G#4 E4"],
      ["Am", "A4:2 C5"],
      ["Dm", "D5 F5 A5"],
      ["Am", "E5:2 C5"],
      ["E7", "B4 D5 G#4"],
      ["Am", "A4:3"],
    ]),
  },
  {
    id: "au-clair-de-la-lune",
    title: "Au clair de la lune",
    credit: TRADITIONAL,
    bpm: 112,
    beatsPerBar: 4,
    bars: [
      ...clair(["C", "C", "G7", "C"]),
      ...clair(["C", "C", "G7", "C"]),
      {
        chord: "G",
        notes: [
          ["D5", 1],
          ["D5", 1],
          ["D5", 1],
          ["D5", 1],
        ],
      },
      {
        chord: "D",
        notes: [
          ["A4", 2],
          ["A4", 2],
        ],
      },
      {
        chord: "G",
        notes: [
          ["D5", 1],
          ["C5", 1],
          ["B4", 1],
          ["A4", 1],
        ],
      },
      { chord: "G7", notes: [["G4", 4]] },
      ...clair(["C", "C", "G7", "C"]),
    ],
  },
  {
    id: "cafe-du-matin",
    title: "Café du matin",
    credit: ORIGINAL,
    bpm: 156,
    beatsPerBar: 3,
    bars: waltz([
      ["C", "G4 C5 E5"],
      ["C", "G5:2 E5"],
      ["G7", "F5 D5 B4"],
      ["C", "C5:3"],
      ["Am", "A4 C5 E5"],
      ["F", "A5:2 F5"],
      ["G7", "G5 F5 D5"],
      ["C", "E5:2 G4"],
      ["F", "A4 C5 F5"],
      ["C", "E5 C5 G4"],
      ["Dm", "F4 A4 D5"],
      ["G7", "B4:2 G4"],
      ["C", "C5 E5 G5"],
      ["Am", "A5:2 E5"],
      ["G7", "D5 F5 B4"],
      ["C", "C5:3"],
    ]),
  },
  {
    id: "frere-jacques",
    title: "Frère Jacques",
    credit: TRADITIONAL,
    bpm: 108,
    beatsPerBar: 4,
    // each line twice, as it is sung
    bars: jacques.flatMap((bar) => [bar, bar]),
  },
];

const NOTE_INDEX: Record<string, number> = {
  C: 0,
  "C#": 1,
  D: 2,
  "D#": 3,
  E: 4,
  F: 5,
  "F#": 6,
  G: 7,
  "G#": 8,
  A: 9,
  "A#": 10,
  B: 11,
};

/** MIDI number of a pitch like "A4" (69) or "G#4". */
export function midi(pitch: Pitch): number {
  const match = /^([A-G]#?)(-?\d)$/.exec(pitch);
  if (!match) throw new Error(`Not a pitch: ${pitch}`);
  return NOTE_INDEX[match[1]!]! + (Number(match[2]) + 1) * 12;
}

export function frequency(note: number): number {
  return 440 * 2 ** ((note - 69) / 12);
}

/**
 * A chord like "Am", "G7" or "C" as MIDI numbers: the bass root between E2
 * and D#3, and the chord tones in close voicing between G3 and F#4.
 */
export function chordNotes(chord: string): { root: number; tones: number[] } {
  const match = /^([A-G]#?)(m?)(7?)$/.exec(chord);
  if (!match) throw new Error(`Not a chord: ${chord}`);
  const pitch = NOTE_INDEX[match[1]!]!;
  const intervals = [0, match[2] ? 3 : 4, 7, ...(match[3] ? [10] : [])];
  const tones = intervals
    .map((i) => 55 + ((pitch + i - 7 + 24) % 12))
    .sort((a, b) => a - b);
  return { root: 40 + ((pitch - 4 + 12) % 12), tones };
}

export type NoteEvent = Readonly<{
  voice: "melody" | "bass" | "chord";
  note: number;
  /** Seconds from the start of the song. */
  at: number;
  length: number;
}>;

/** Every note of a song in time: the melody, then oom on beat one, pah on the rest. */
export function arrange(song: Song): { events: NoteEvent[]; seconds: number } {
  const beat = 60 / song.bpm;
  const events: NoteEvent[] = [];
  song.bars.forEach((bar, b) => {
    const start = b * song.beatsPerBar * beat;
    let offset = 0;
    for (const [pitch, beats] of bar.notes) {
      if (pitch !== "-") {
        events.push({
          voice: "melody",
          note: midi(pitch),
          at: start + offset * beat,
          length: beats * beat * 0.92,
        });
      }
      offset += beats;
    }
    const { root, tones } = chordNotes(bar.chord);
    for (let i = 0; i < song.beatsPerBar; i++) {
      const at = start + i * beat;
      if (i === 0 || (song.beatsPerBar === 4 && i === 2)) {
        // in 4/4 the bass alternates root and fifth
        const note = i === 0 ? root : root + 7 - (root + 7 > 52 ? 12 : 0);
        events.push({ voice: "bass", note, at, length: beat * 0.8 });
      } else {
        for (const note of tones)
          events.push({ voice: "chord", note, at, length: beat * 0.35 });
      }
    }
  });
  return { events, seconds: song.bars.length * song.beatsPerBar * beat };
}

/** The song after this one, round and round. */
export function nextSong(index: number): number {
  return (index + 1) % SONGS.length;
}

export const JUKEBOX_EVENT = "brew-ni-cat:jukebox";

export type JukeboxState = Readonly<{ playing: boolean; song: number }>;

let state: JukeboxState = { playing: false, song: 0 };
let context: AudioContext | null = null;
let master: GainNode | null = null;
let voices: OscillatorNode[] = [];
let timer = 0;

export function jukeboxState(): JukeboxState {
  return state;
}

function announce(next: JukeboxState) {
  state = next;
  window.dispatchEvent(new CustomEvent(JUKEBOX_EVENT, { detail: next }));
}

function audio(): AudioContext | null {
  const Context =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Context) return null;
  context ??= new Context();
  if (context.state === "suspended") void context.resume();
  return context;
}

/** One note through an envelope; the accordion has two reeds a little apart. */
function sound(
  ctx: AudioContext,
  out: AudioNode,
  event: NoteEvent,
  t0: number,
) {
  const at = t0 + event.at;
  const end = at + event.length;
  const gain = ctx.createGain();
  const peak =
    event.voice === "melody" ? 0.22 : event.voice === "bass" ? 0.3 : 0.07;
  const attack = event.voice === "melody" ? 0.035 : 0.01;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + attack);
  gain.gain.setValueAtTime(peak, Math.max(at + attack, end - 0.06));
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value =
    event.voice === "melody" ? 2400 : event.voice === "bass" ? 600 : 1400;
  filter.connect(gain).connect(out);
  const reeds = event.voice === "melody" ? [-7, 7] : [0];
  for (const cents of reeds) {
    const osc = ctx.createOscillator();
    osc.type = event.voice === "bass" ? "triangle" : "sawtooth";
    osc.frequency.value = frequency(event.note);
    osc.detune.value = cents;
    osc.connect(filter);
    osc.start(at);
    osc.stop(end + 0.02);
    voices.push(osc);
  }
}

function playSong(index: number) {
  const ctx = audio();
  if (!ctx || !master) return;
  voices = [];
  const { events, seconds } = arrange(SONGS[index]!);
  const t0 = ctx.currentTime + 0.12;
  for (const event of events) sound(ctx, master, event, t0);
  announce({ playing: true, song: index });
  // a short breath between songs, then the next one
  timer = window.setTimeout(
    () => playSong(nextSong(index)),
    (seconds + 1.2) * 1000,
  );
}

function silence() {
  window.clearTimeout(timer);
  const ctx = context;
  const old = master;
  const playing = voices;
  voices = [];
  master = null;
  if (!ctx || !old) return;
  const now = ctx.currentTime;
  old.gain.cancelScheduledValues(now);
  old.gain.setValueAtTime(old.gain.value, now);
  old.gain.linearRampToValueAtTime(0, now + 0.25);
  for (const osc of playing) {
    try {
      osc.stop(now + 0.3);
    } catch {
      // not started yet: it was scheduled for later and is dropped with the gain
    }
  }
  window.setTimeout(() => old.disconnect(), 400);
}

/** Starts the music at a song (only ever from a visitor's press). */
export function playJukebox(index = state.song, volume = 0.18) {
  if (typeof window === "undefined") return false;
  silence();
  try {
    const ctx = audio();
    if (!ctx) return false;
    master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);
    playSong(((index % SONGS.length) + SONGS.length) % SONGS.length);
    return true;
  } catch {
    return false;
  }
}

export function stopJukebox() {
  if (typeof window === "undefined") return;
  silence();
  announce({ playing: false, song: state.song });
}

export function skipJukebox() {
  const next = nextSong(state.song);
  if (state.playing) playJukebox(next);
  else announce({ playing: false, song: next });
}
