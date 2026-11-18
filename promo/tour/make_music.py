"""A cheerful, bouncy soundtrack for the website tour (synthesised, no samples).

    python3 make_music.py <seconds> <out.wav> [section start times...]

126 BPM in G major, the I-V-vi-IV progression. Ukulele strums, a glockenspiel
tune, hand claps, finger snaps, a walking bass and a light kick. Each new
section of the tour starts a fresh 8-bar phrase with a little sparkle, and the
energy alternates between a lighter "verse" and a fuller "chorus" so six
minutes never feels like the same loop. It ends on a rung-out G chord.

The helpers (envelopes, filters, reverb, drums) come from ../scripts/make-audio.py,
which made the promo's music.
"""

from __future__ import annotations

import importlib.util
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location("promo_audio", os.path.join(HERE, "..", "scripts", "make-audio.py"))
A = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(A)  # type: ignore[union-attr]
SR, tt, env, band, add, reverb, midi = A.SR, A.tt, A.env, A.band, A.add, A.reverb, A.midi
rng = np.random.default_rng(11)

BPM = 126
BEAT = 60 / BPM
BAR = 4 * BEAT

# G - D - Em - C   (root, chord tones for the strum)
CHORDS = [
    (43, [55, 59, 62, 67]),  # G
    (38, [54, 57, 62, 66]),  # D
    (40, [55, 59, 64, 67]),  # Em
    (36, [55, 60, 64, 67]),  # C
]
# a sunny 4-bar tune: (beat in the cycle, midi, beats)
TUNE = [
    (0, 79, 0.5), (0.5, 81, 0.5), (1, 83, 1), (2, 81, 0.5), (2.5, 79, 1), (3.5, 76, 0.5),
    (4, 78, 0.5), (4.5, 79, 0.5), (5, 81, 1), (6, 78, 0.5), (6.5, 74, 1.5),
    (8, 76, 0.5), (8.5, 79, 0.5), (9, 83, 1), (10, 86, 0.5), (10.5, 83, 1), (11.5, 79, 0.5),
    (12, 81, 0.5), (12.5, 79, 0.5), (13, 76, 1), (14, 79, 2),
]
TUNE_B = [  # answer phrase for the second half of each chorus
    (0, 86, 1), (1, 83, 0.5), (1.5, 81, 0.5), (2, 83, 1), (3, 79, 1),
    (4, 81, 1), (5, 78, 0.5), (5.5, 74, 0.5), (6, 78, 1), (7, 81, 1),
    (8, 83, 0.5), (8.5, 81, 0.5), (9, 79, 1), (10, 76, 1), (11, 79, 1),
    (12, 81, 1), (13, 83, 0.5), (13.5, 81, 0.5), (14, 79, 2),
]


def pluck(m: float, dur: float = 0.9, bright: float = 0.5) -> np.ndarray:
    """Karplus-Strong string: a nylon ukulele pluck."""
    f = midi(m)
    n = int(dur * SR)
    p = max(2, int(SR / f))
    buf = band(rng.standard_normal(p * 4), 200, 2500 + 4000 * bright)[:p]
    out = np.empty(n)
    out[:p] = buf
    decay = 0.996
    for i in range(p, n):
        out[i] = decay * 0.5 * (out[i - p] + out[i - p + 1])
    return band(out, 150, 7000) * env(dur, 0.002, 10, 1, 0.08)


_pluck_cache: dict[tuple[int, float], np.ndarray] = {}


def pl(m: int, dur: float) -> np.ndarray:
    k = (m, round(dur, 2))
    if k not in _pluck_cache:
        _pluck_cache[k] = pluck(m, dur)
    return _pluck_cache[k]


def strum(buf: np.ndarray, chord: list[int], at: float, gain: float, down: bool = True, dur: float = 0.5) -> None:
    notes = chord if down else chord[::-1]
    for i, m in enumerate(notes):
        add(buf, pl(m, dur), at + i * 0.011, gain * (1 - 0.08 * i), pan=-0.35 + 0.2 * i)


def glock(m: float, dur: float = 0.8) -> np.ndarray:
    t = tt(dur)
    f = midi(m)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.5) + 0.3 * np.sin(2 * np.pi * 2.76 * f * t) * np.exp(-t / 0.12)
    x += 0.12 * np.sin(2 * np.pi * 5.4 * f * t) * np.exp(-t / 0.04)
    return x * env(dur, 0.001, 10, 1, 0.05)


def snap() -> np.ndarray:
    t = tt(0.12)
    return band(rng.standard_normal(len(t)), 1800, 7000) * np.exp(-t / 0.012) + 0.3 * np.sin(2 * np.pi * 1700 * t) * np.exp(-t / 0.01)


def tamb() -> np.ndarray:
    t = tt(0.14)
    return band(rng.standard_normal(len(t)), 6000) * np.exp(-t / 0.035) * (1 + 0.6 * np.sin(2 * np.pi * 70 * t))


def bass(m: float, dur: float) -> np.ndarray:
    t = tt(dur)
    f = midi(m)
    x = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t)
    return np.tanh(1.5 * x) * env(dur, 0.004, 0.25, 0.4, 0.04)


def music(total: float, sections: list[float]) -> np.ndarray:
    n = int((total + 0.5) * SR)
    mix = np.zeros((2, n))
    starts = sorted(set([0.0] + [s for s in sections if 0 < s < total - 4]))
    # bars snap to the sections: each section restarts the phrase on a downbeat
    bars: list[tuple[float, int, int]] = []  # (time, bar in phrase, section index)
    for si, s0 in enumerate(starts):
        s1 = starts[si + 1] if si + 1 < len(starts) else total - 2.6
        k = 0
        t = s0
        while t + BAR * 0.5 < s1:
            bars.append((t, k, si))
            k += 1
            t = s0 + k * BAR
    kick_times: list[float] = []
    for t0, k, si in bars:
        root, chord = CHORDS[k % 4]
        intro = si == 0 and k < 2
        chorus = (k // 8) % 2 == 1 or (si % 3 == 2 and k >= 2)
        # ukulele: down, down-up, up-down-up (the happy strum)
        for beat, down, g in ((0, True, 0.2), (1, True, 0.14), (1.5, False, 0.1), (2.5, False, 0.12), (3, True, 0.15), (3.5, False, 0.1)):
            strum(mix, chord, t0 + beat * BEAT, g * (0.8 if intro else 1), down)
        if intro:
            for j in range(4):  # glock arpeggio to open the tour
                add(mix, glock(chord[j % 4] + 24, 0.7), t0 + j * BEAT, 0.12, pan=0.3)
            continue
        # bass: root - fifth bounce
        for beat, off in ((0, 0), (1.5, 7), (2, 12), (3, 7)):
            add(mix, bass(root + off, BEAT * 0.45), t0 + beat * BEAT, 0.28)
        # claps on 2 and 4, snaps on the off-beats in the verse
        for beat in (1, 3):
            add(mix, A.clap(), t0 + beat * BEAT, 0.22 if chorus else 0.16, pan=0.05)
        if not chorus:
            for beat in (0.5, 2.5):
                add(mix, snap(), t0 + beat * BEAT, 0.12, pan=-0.4)
        # a light kick, four on the floor in the chorus
        for beat in ((0, 1, 2, 3) if chorus else (0, 2)):
            add(mix, A.kick(), t0 + beat * BEAT, 0.3)
            kick_times.append(t0 + beat * BEAT)
        # tambourine sixteenths in the chorus, eighths in the verse
        steps = 16 if chorus else 8
        for j in range(steps):
            add(mix, tamb(), t0 + j * BAR / steps, (0.05 if j % 2 else 0.08) * (1 if chorus else 0.7), pan=0.45)
        # the tune: verse plays it softly every other phrase, chorus fully with the answer
        cyc = k % 4
        phrase = TUNE_B if chorus and (k // 4) % 2 else TUNE
        if chorus or (k // 4) % 2 == 0:
            for beat, m, d in phrase:
                if cyc * 4 <= beat < cyc * 4 + 4:
                    at = t0 + (beat - cyc * 4) * BEAT
                    add(mix, glock(m, max(0.5, d * BEAT + 0.3)), at, 0.2 if chorus else 0.12, pan=0.2)
                    if chorus:  # doubled by a pluck an octave down
                        add(mix, pl(m - 12, max(0.4, d * BEAT)), at, 0.12, pan=-0.15)
    # a sparkle at the start of every section
    for s in starts[1:]:
        add(mix, A.sparkle(), s - 0.05, 0.1, pan=0.2)
    # the end: a big strummed G with a glock on top
    t_end = total - 2.6
    for j in range(3):
        strum(mix, [43, 50, 55, 59, 62, 67], t_end + j * 0.0, 0.25, True, 2.4)
    add(mix, glock(91, 2.0), t_end, 0.2)
    add(mix, glock(86, 2.0), t_end + 0.12, 0.14)
    add(mix, A.kick(), t_end, 0.35)
    add(mix, A.crash(), t_end, 0.1)
    # gentle pump so the beat breathes
    t = np.arange(n) / SR
    duck = np.ones(n)
    for k in kick_times:
        i = int(k * SR)
        seg = t[i : i + int(0.3 * SR)] - k
        duck[i : i + len(seg)] = np.minimum(duck[i : i + len(seg)], 1 - 0.25 * np.exp(-seg / 0.1))
    mix *= duck
    mix = reverb(mix, 1.2, 0.18)
    mix *= np.clip(t / 0.3, 0, 1) * np.clip((total + 0.5 - t) / 0.8, 0, 1)
    return np.tanh(mix * 1.3)[:, : int(total * SR)]


if __name__ == "__main__":
    total = float(sys.argv[1])
    out = sys.argv[2]
    secs = [float(x) for x in sys.argv[3:]]
    A.OUT = os.path.dirname(os.path.abspath(out))
    A.write(os.path.basename(out), music(total, secs), peak=0.9)
