import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { JukeboxControl } from "@/components/sound/jukebox-control";
import {
  arrange,
  chordNotes,
  frequency,
  jukeboxState,
  midi,
  nextSong,
  playJukebox,
  SONGS,
  stopJukebox,
} from "@/lib/sound/jukebox";

/** A Web Audio stand-in that counts what the jukebox builds. */
class FakeAudioContext {
  static made = 0;
  static oscillators = 0;
  currentTime = 0;
  state = "running";
  destination = {};
  constructor() {
    FakeAudioContext.made++;
  }
  resume() {
    return Promise.resolve();
  }
  private node() {
    const param = {
      value: 0,
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      cancelScheduledValues: vi.fn(),
    };
    return {
      gain: param,
      frequency: { ...param },
      detune: { ...param },
      type: "",
      connect: (next: unknown) => next,
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
  }
  createGain() {
    return this.node();
  }
  createBiquadFilter() {
    return this.node();
  }
  createOscillator() {
    FakeAudioContext.oscillators++;
    return this.node();
  }
}

const beats = (notes: readonly (readonly [string, number])[]) =>
  notes.reduce((sum, [, b]) => sum + b, 0);

describe("café jukebox (FR-115)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeAudioContext.made = 0;
    FakeAudioContext.oscillators = 0;
  });
  afterEach(() => {
    act(() => stopJukebox());
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("TC-P9-022 four songs, each traditional (public domain) or written for the shop, with whole bars", () => {
    expect(SONGS).toHaveLength(4);
    expect(new Set(SONGS.map((s) => s.id)).size).toBe(4);
    for (const song of SONGS) {
      expect(song.credit).toMatch(
        /^(French folk song, traditional \(public domain\)|Written for Brew ni Cat)$/,
      );
      expect(song.bars.length).toBeGreaterThanOrEqual(8);
      for (const bar of song.bars) {
        expect(beats(bar.notes)).toBe(song.beatsPerBar);
        for (const [pitch] of bar.notes) {
          if (pitch !== "-") expect(() => midi(pitch)).not.toThrow();
        }
        expect(() => chordNotes(bar.chord)).not.toThrow();
      }
    }
    // round and round
    expect(nextSong(SONGS.length - 1)).toBe(0);
  });

  it("TC-P9-023 notes, chords and pitches are in tune", () => {
    expect(midi("A4")).toBe(69);
    expect(midi("C5")).toBe(72);
    expect(midi("G#4")).toBe(68);
    expect(frequency(69)).toBeCloseTo(440);
    expect(frequency(81)).toBeCloseTo(880);
    expect(() => midi("H2")).toThrow();
    // A minor: A, C and E in close voicing, the root in the bass
    const am = chordNotes("Am");
    expect(am.tones.map((n) => n % 12).sort()).toEqual([0, 4, 9]);
    expect(am.root % 12).toBe(9);
    const g7 = chordNotes("G7");
    expect(g7.tones.map((n) => n % 12).sort((a, b) => a - b)).toEqual([
      2, 5, 7, 11,
    ]);
    for (const chord of ["C", "Dm", "E7", "F", "G", "Am", "D"]) {
      const { root, tones } = chordNotes(chord);
      expect(root).toBeGreaterThanOrEqual(40);
      expect(root).toBeLessThan(52);
      for (const tone of tones) {
        expect(tone).toBeGreaterThanOrEqual(55);
        expect(tone).toBeLessThan(67);
      }
    }
  });

  it("TC-P9-024 each song is arranged as a melody over an oom-pah bass and chords, inside the song's length", () => {
    for (const song of SONGS) {
      const { events, seconds } = arrange(song);
      const beat = 60 / song.bpm;
      expect(seconds).toBeCloseTo(song.bars.length * song.beatsPerBar * beat);
      for (const e of events) {
        expect(e.at).toBeGreaterThanOrEqual(0);
        expect(e.at + e.length).toBeLessThanOrEqual(seconds + 1e-9);
      }
      const bass = events.filter((e) => e.voice === "bass");
      // oom on beat one of every bar (and beat three in 4/4)
      expect(bass).toHaveLength(
        song.bars.length * (song.beatsPerBar === 4 ? 2 : 1),
      );
      expect(events.some((e) => e.voice === "chord")).toBe(true);
      expect(events.filter((e) => e.voice === "melody").length).toBe(
        song.bars.flatMap((b) => b.notes).filter(([p]) => p !== "-").length,
      );
    }
  });

  it("TC-P9-025 the footer button plays only when pressed, names the song, skips and stops", () => {
    vi.stubGlobal("AudioContext", FakeAudioContext);
    render(<JukeboxControl />);
    // never autoplays
    expect(FakeAudioContext.made).toBe(0);
    const play = screen.getByTestId("jukebox-play");
    expect(play).toHaveTextContent("Play café music");
    expect(play).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByTestId("jukebox-next")).toBeNull();

    fireEvent.click(play);
    expect(FakeAudioContext.made).toBe(1);
    expect(FakeAudioContext.oscillators).toBeGreaterThan(0);
    expect(play).toHaveAttribute("aria-pressed", "true");
    expect(play).toHaveTextContent("Stop music");
    expect(screen.getByTestId("jukebox-now")).toHaveTextContent(
      `Now playing: ${SONGS[0]!.title} (${SONGS[0]!.credit})`,
    );

    fireEvent.click(screen.getByTestId("jukebox-next"));
    expect(screen.getByTestId("jukebox-now")).toHaveTextContent(
      SONGS[1]!.title,
    );
    // the next song starts by itself after this one
    const { seconds } = arrange(SONGS[1]!);
    act(() => vi.advanceTimersByTime((seconds + 1.3) * 1000));
    expect(jukeboxState()).toEqual({ playing: true, song: 2 });

    fireEvent.click(play);
    expect(play).toHaveTextContent("Play café music");
    expect(screen.getByTestId("jukebox-now")).toBeEmptyDOMElement();
    expect(jukeboxState().playing).toBe(false);
  });

  it("TC-P9-026 without Web Audio the button stays quiet and nothing breaks", () => {
    vi.stubGlobal("AudioContext", undefined);
    render(<JukeboxControl />);
    expect(playJukebox()).toBe(false);
    fireEvent.click(screen.getByTestId("jukebox-play"));
    expect(jukeboxState().playing).toBe(false);
    expect(screen.getByTestId("jukebox-play")).toHaveTextContent(
      "Play café music",
    );
  });
});
