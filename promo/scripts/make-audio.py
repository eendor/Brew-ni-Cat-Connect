"""Synthesise the promo soundtrack and sound effects (no samples, no licences).

    python3 scripts/make-audio.py      # needs numpy; writes public/audio/*.wav

The music is 120 BPM, so one beat is 15 video frames at 30 fps and a bar is 60.
The grid starts at video frame 2 so that bar 12 lands on the "Now on Android"
scene (frame 722), bar 19 on the café cats (1142) and the final chord (bar 23)
on frame 1382 of the end card. If you change SCENES in src/Promo.tsx, update TOTAL_FRAMES, BAR0 and
the *_BAR numbers here too.

The cat sounds (meows, a trill, a purr, paw pats) are synthesised as well: a
pitch contour drives a stack of harmonics shaped by moving formants, so they
sound like a voice and not a beep.
"""

from __future__ import annotations

import os
import wave

import numpy as np

SR = 44100
FPS = 30
TOTAL_FRAMES = 1432
BPM = 120
BEAT = 60 / BPM
BAR = 4 * BEAT
BAR0 = 2 / FPS  # seconds: video frame 2
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "audio")
rng = np.random.default_rng(7)


# --- helpers ---------------------------------------------------------------
def midi(m: float) -> float:
    return 440.0 * 2 ** ((m - 69) / 12)


def tt(dur: float) -> np.ndarray:
    return np.arange(int(dur * SR)) / SR


def env(dur: float, a: float = 0.005, d: float = 0.3, s: float = 0.0, r: float = 0.05) -> np.ndarray:
    """Attack / exponential decay towards s / release at the end."""
    t = tt(dur)
    e = np.where(t < a, t / max(a, 1e-6), s + (1 - s) * np.exp(-(t - a) / max(d, 1e-6)))
    tail = int(r * SR)
    if 0 < tail < len(e):
        e[-tail:] *= np.linspace(1, 0, tail)
    return e


def band(x: np.ndarray, lo: float = 0, hi: float = SR / 2, soft: float = 0.15) -> np.ndarray:
    """FFT band-pass with soft log-frequency edges."""
    n = len(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    X = np.fft.rfft(x)
    lf = np.log2(np.maximum(f, 1))
    m = np.ones_like(f)
    if lo > 0:
        m *= 1 / (1 + np.exp(-(lf - np.log2(lo)) / soft))
    if hi < SR / 2:
        m *= 1 / (1 + np.exp((lf - np.log2(hi)) / soft))
    return np.fft.irfft(X * m, n)


def add(buf: np.ndarray, sig: np.ndarray, at: float, gain: float = 1.0, pan: float = 0.0) -> None:
    """Mix a mono signal into a stereo buffer at `at` seconds."""
    i = int(round(at * SR))
    if i >= buf.shape[1] or i + len(sig) <= 0:
        return
    s0 = max(0, -i)
    j = min(buf.shape[1], i + len(sig))
    seg = sig[s0 : s0 + j - max(i, 0)] * gain
    buf[0, max(i, 0) : j] += seg * np.cos((pan + 1) * np.pi / 4) * 1.414
    buf[1, max(i, 0) : j] += seg * np.sin((pan + 1) * np.pi / 4) * 1.414


def reverb(x: np.ndarray, secs: float = 1.6, wet: float = 0.25) -> np.ndarray:
    out = np.empty_like(x)
    n_ir = int(secs * SR)
    t = np.arange(n_ir) / SR
    for ch in range(x.shape[0]):
        ir = rng.standard_normal(n_ir) * np.exp(-t * 6.9 / secs)
        ir = band(ir, 200, 6000)
        ir[: int(0.012 * SR)] = 0  # pre-delay
        ir /= np.sqrt(np.sum(ir**2))
        n = 1 << int(np.ceil(np.log2(x.shape[1] + n_ir)))
        y = np.fft.irfft(np.fft.rfft(x[ch], n) * np.fft.rfft(ir, n), n)[: x.shape[1]]
        out[ch] = x[ch] + wet * y
    return out


def write(name: str, x: np.ndarray, peak: float = 0.89) -> None:
    if x.ndim == 1:
        x = np.stack([x, x])
    m = np.max(np.abs(x))
    if m > 0:
        x = x / m * peak
    data = (np.clip(x.T, -1, 1) * 32767).astype("<i2")
    os.makedirs(OUT, exist_ok=True)
    with wave.open(os.path.join(OUT, name), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())
    print(f"{name:16s} {x.shape[1] / SR:5.2f}s")


# --- instruments -----------------------------------------------------------
def ep(m: float, dur: float) -> np.ndarray:
    """Electric-piano-ish: soft sine partials with a bell attack."""
    t = tt(dur + 0.6)
    f = midi(m)
    trem = 1 + 0.08 * np.sin(2 * np.pi * 4.5 * t)
    x = (
        np.sin(2 * np.pi * f * t)
        + 0.35 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.4)
        + 0.18 * np.sin(2 * np.pi * 7 * f * t) * np.exp(-t / 0.05)
    )
    return x * trem * env(dur + 0.6, 0.004, 0.9, 0.0, 0.25) * np.where(t < dur, 1, np.exp(-(t - dur) / 0.12))


def marimba(m: float, dur: float = 0.6) -> np.ndarray:
    t = tt(dur)
    f = midi(m)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.28) + 0.25 * np.sin(2 * np.pi * 3.93 * f * t) * np.exp(-t / 0.05)
    return x * env(dur, 0.002, 10, 1, 0.05)


def pad(m: float, dur: float) -> np.ndarray:
    t = tt(dur)
    f = midi(m)
    x = np.zeros_like(t)
    for d in (-0.12, 0.0, 0.11):
        ph = rng.uniform(0, 1)
        x += 2 * ((f * (2 ** (d / 12)) * t + ph) % 1) - 1  # saw
    x = band(x, 80, 1400)
    a = np.minimum(1, t / 0.5) * np.minimum(1, (dur - t) / 0.6)
    return x * np.clip(a, 0, 1)


def bass(m: float, dur: float) -> np.ndarray:
    t = tt(dur)
    f = midi(m)
    x = np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * 2 * f * t) + 0.2 * np.sin(2 * np.pi * 3 * f * t)
    return np.tanh(1.8 * x) * env(dur, 0.004, 0.35, 0.55, 0.04)


def kick() -> np.ndarray:
    t = tt(0.45)
    f = 45 + 95 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t / 0.16) + 0.5 * band(rng.standard_normal(len(t)), 1500, 6000) * np.exp(-t / 0.004)


def clap() -> np.ndarray:
    t = tt(0.3)
    n = band(rng.standard_normal(len(t)), 900, 5000)
    e = np.exp(-t / 0.09)
    for k in (0.0, 0.011, 0.022):  # three hands
        e = e + 0.6 * np.exp(-np.maximum(t - k, 0) / 0.006) * (t >= k)
    return n * e * 0.5 + 0.25 * np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.04)


def hat(open_: bool = False) -> np.ndarray:
    t = tt(0.3 if open_ else 0.06)
    return band(rng.standard_normal(len(t)), 7000) * np.exp(-t / (0.09 if open_ else 0.018))


def crash() -> np.ndarray:
    t = tt(2.2)
    return band(rng.standard_normal(len(t)), 4000) * np.exp(-t / 0.7)


def riser(dur: float) -> np.ndarray:
    """Noise that rises in pitch and level over `dur` seconds."""
    hop, size = 512, 2048
    n = int(dur * SR) + size
    x = rng.standard_normal(n)
    out = np.zeros(n)
    win = np.hanning(size)
    f = np.fft.rfftfreq(size, 1 / SR)
    for i in range(0, n - size, hop):
        p = i / (n - size)
        fc = 300 * (40 ** p)
        m = np.exp(-((np.log2(np.maximum(f, 1)) - np.log2(fc)) ** 2) / 0.5)
        out[i : i + size] += np.fft.irfft(np.fft.rfft(x[i : i + size] * win) * m, size) * win
    out = out[: int(dur * SR)]
    return out * np.linspace(0, 1, len(out)) ** 2


# --- the track -------------------------------------------------------------
CHORDS = [
    (41, [53, 57, 60, 64]),  # Fmaj7
    (38, [50, 53, 57, 60]),  # Dm7
    (34, [50, 53, 58, 60]),  # Bb(add9)
    (36, [52, 55, 60, 62]),  # C(add9)
]
MELODY = [  # (beat in 4-bar cycle, midi, beats)
    (0, 81, 1), (1, 79, 0.5), (1.5, 77, 0.5), (2, 72, 1), (3, 74, 0.5), (3.5, 77, 0.5),
    (4, 77, 1), (5, 74, 0.5), (5.5, 72, 0.5), (6, 69, 1.5), (7.5, 72, 0.5),
    (8, 74, 1), (9, 77, 0.5), (9.5, 74, 0.5), (10, 70, 1), (11, 72, 0.5), (11.5, 74, 0.5),
    (12, 76, 1.5), (13.5, 79, 0.5), (14, 76, 0.5), (14.5, 74, 0.5), (15, 72, 1),
]
DROP_BAR = 12  # frame 722: "Now on Android"
CATS_BAR = 19  # frame 1142: the café cats (lighter)
END_BAR = 23  # frame 1382: final chord


def music() -> np.ndarray:
    total = TOTAL_FRAMES / FPS
    n = int(total * SR)
    keys = np.zeros((2, n))  # ducked by the kick
    rest = np.zeros((2, n))
    kicks: list[float] = []

    def bar_t(b: float) -> float:
        return BAR0 + b * BAR

    for b in range(END_BAR):
        root, chord = CHORDS[b % 4]
        t0 = bar_t(b)
        intro = b < 2
        build = b == DROP_BAR - 1
        cats = b == CATS_BAR
        full = b >= DROP_BAR and not cats

        # pad under everything
        for i, m in enumerate(chord):
            add(keys, pad(m, BAR + 0.3), t0, 0.05, pan=-0.5 + i / 3)

        if intro or cats:
            # marimba arpeggio
            for k in range(8):
                m = chord[k % 4] + (12 if k >= 4 else 0) + 12
                add(rest, marimba(m), t0 + k * BEAT / 2, 0.16 if cats else 0.13, pan=0.4 if k % 2 else -0.4)
            if cats:
                add(rest, bass(root, BAR * 0.95), t0, 0.22)
            continue

        # electric piano stabs (syncopated)
        for beat, dur, g in ((0, 1.3, 0.12), (1.5, 0.45, 0.08), (2.5, 1.2, 0.1)):
            for m in chord:
                add(keys, ep(m, dur * BEAT), t0 + beat * BEAT, g * 1.4)

        # bass
        if not build:
            for k, (step, octv) in enumerate(((0, 0), (1.5, 0), (2, 0), (3, 12), (3.5, 0))):
                add(rest, bass(root + octv, BEAT * 0.45), t0 + step * BEAT, 0.22)

        # drums
        if build:
            for k in range(16):
                at = t0 + k * BEAT / 4
                add(rest, clap(), at, 0.08 + 0.2 * k / 16, pan=0.1)
            add(rest, riser(BAR), t0, 0.1)
            for k in range(8):
                add(rest, hat(), t0 + k * BEAT / 2, 0.05, pan=0.3)
            continue
        beats = (0, 1, 2, 3) if full else (0, 2, 2.75)
        for k in beats:
            add(rest, kick(), t0 + k * BEAT, 0.38)
            kicks.append(t0 + k * BEAT)
        for k in (1, 3):
            add(rest, clap(), t0 + k * BEAT, 0.3, pan=0.05)
        for k in range(8):
            add(rest, hat(), t0 + k * BEAT / 2 + (0.012 if k % 2 else 0), 0.11 if k % 2 else 0.07, pan=0.35)
            if full and k % 2:
                add(rest, hat(True), t0 + k * BEAT / 2, 0.07, pan=-0.3)

        # melody in the full sections
        if full:
            cyc = (b - DROP_BAR) % 4
            for beat, m, d in MELODY:
                if cyc * 4 <= beat < cyc * 4 + 4:
                    add(rest, marimba(m, max(0.4, d * BEAT + 0.2)), t0 + (beat - cyc * 4) * BEAT, 0.3, pan=0.15)

    for b in (2, DROP_BAR, CATS_BAR + 1):
        add(rest, crash(), bar_t(b), 0.12, pan=-0.2)

    # final chord: Fmaj9, rung out
    t_end = bar_t(END_BAR)
    for m in (41, 53, 57, 60, 64, 67):
        add(rest, ep(m, 1.2), t_end, 0.12)
    add(rest, marimba(89, 1.2), t_end, 0.15)
    add(rest, marimba(84, 1.2), t_end + 0.12, 0.1)
    add(rest, kick(), t_end, 0.38)
    add(rest, crash(), t_end, 0.14)

    # sidechain duck on keys/pad
    t = np.arange(n) / SR
    duck = np.ones(n)
    for k in kicks:
        i = int(k * SR)
        seg = t[i : i + int(0.4 * SR)] - k
        duck[i : i + len(seg)] = np.minimum(duck[i : i + len(seg)], 1 - 0.5 * np.exp(-seg / 0.12))
    mix = keys * duck + rest
    mix = reverb(mix, 1.8, 0.22)
    # fade in over the first frames and out at the very end
    mix *= np.clip(t / 0.15, 0, 1)
    mix *= np.clip((total - t) / 1.0, 0, 1) ** 1.5
    return np.tanh(mix * 1.4)


# --- sound effects ---------------------------------------------------------
def whoosh(dur: float = 0.6, lo: float = 350, hi: float = 2800) -> np.ndarray:
    hop, size = 256, 1024
    n = int(dur * SR) + size
    x = rng.standard_normal(n)
    out = np.zeros(n)
    win = np.hanning(size)
    f = np.fft.rfftfreq(size, 1 / SR)
    for i in range(0, n - size, hop):
        p = i / (n - size)
        fc = lo * (hi / lo) ** np.sin(np.pi * p)  # up, then down
        m = np.exp(-((np.log2(np.maximum(f, 1)) - np.log2(fc)) ** 2) / 0.6)
        out[i : i + size] += np.fft.irfft(np.fft.rfft(x[i : i + size] * win) * m, size) * win
    out = out[: int(dur * SR)]
    t = tt(dur)
    shape = np.sin(np.pi * np.minimum(1, t / dur)) ** 2 * np.exp(-t / dur)
    return out * shape


def stereo_sweep(x: np.ndarray) -> np.ndarray:
    p = np.linspace(-0.7, 0.7, len(x))
    return np.stack([x * np.cos((p + 1) * np.pi / 4), x * np.sin((p + 1) * np.pi / 4)])


def pop(f0: float) -> np.ndarray:
    t = tt(0.16)
    f = f0 * (1 + 0.9 * np.exp(-t / 0.012))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.045)
    x += 0.15 * band(rng.standard_normal(len(t)), 2000) * np.exp(-t / 0.003)
    return x * env(0.16, 0.001, 10, 1, 0.03)


def tick() -> np.ndarray:
    t = tt(0.05)
    return band(rng.standard_normal(len(t)), 2500, 9000) * np.exp(-t / 0.006) + 0.5 * np.sin(
        2 * np.pi * 2600 * t
    ) * np.exp(-t / 0.01)


def ding(m: float, dur: float = 1.0) -> np.ndarray:
    t = tt(dur)
    f = midi(m)
    x = np.zeros_like(t)
    for r, a, d in ((1, 1, 0.5), (2.0, 0.4, 0.25), (3.01, 0.2, 0.12), (4.2, 0.12, 0.06)):
        x += a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / d)
    return x * env(dur, 0.002, 10, 1, 0.1)


def tap() -> np.ndarray:
    t = tt(0.09)
    return np.sin(2 * np.pi * 170 * t) * np.exp(-t / 0.02) + 0.5 * band(
        rng.standard_normal(len(t)), 1500, 6000
    ) * np.exp(-t / 0.004)


def square(m: float, dur: float) -> np.ndarray:
    t = tt(dur)
    x = np.sign(np.sin(2 * np.pi * midi(m) * t))
    return band(x, 100, 5000) * env(dur, 0.002, 10, 1, 0.02)


def coin() -> np.ndarray:
    a = square(83, 0.07)
    b = square(88, 0.4) * np.exp(-tt(0.4) / 0.14)
    return np.concatenate([a, b])


def blip(m: float) -> np.ndarray:
    t = tt(0.12)
    f = midi(m) * (1 + 0.5 * (t < 0.03))
    x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR))
    return band(x, 100, 5000) * np.exp(-t / 0.05)


def paper() -> np.ndarray:
    t = tt(0.14)
    return band(rng.standard_normal(len(t)), 900, 6000) * np.exp(-t / 0.035) * np.minimum(1, t / 0.008)


def sparkle() -> np.ndarray:
    dur = 1.4
    out = np.zeros(int(dur * SR))
    notes = [84, 88, 91, 96, 100, 103, 108]
    for i, m in enumerate(notes):
        s = ding(m, 0.6) * (0.9 - i * 0.08)
        i0 = int(i * 0.07 * SR)
        out[i0 : i0 + len(s)] += s[: len(out) - i0]
    return out + 0.08 * band(rng.standard_normal(len(out)), 8000) * np.exp(-tt(dur) / 0.4)


def impact() -> np.ndarray:
    t = tt(1.2)
    f = 38 + 70 * np.exp(-t / 0.08)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.4)
    return boom + 0.4 * np.pad(pop(700), (0, len(t) - len(pop(700))))


# --- cat sounds -------------------------------------------------------------
def voice(dur: float, f0_pts: list[tuple[float, float]], formants: list[list[tuple[float, float]]],
          breath: float = 0.012, vib: float = 0.012, am: tuple[float, float] = (0.0, 0.0)) -> np.ndarray:
    """A voiced sound: harmonics of a gliding pitch, shaped by moving formants.

    f0_pts and each formant track are (time 0..1, Hz) points; am is
    (rate Hz, depth) for a trill's flutter."""
    t = tt(dur)
    p = t / dur
    f0 = np.interp(p, *zip(*f0_pts)) * (1 + vib * np.sin(2 * np.pi * 5.5 * t))
    tracks = [np.interp(p, *zip(*fm)) for fm in formants]
    gains = (1.0, 0.7, 0.35)
    x = np.zeros_like(t)
    phase = 2 * np.pi * np.cumsum(f0) / SR
    for k in range(1, 40):
        fk = k * f0
        if np.min(fk) > 9000:
            break
        a = np.zeros_like(t)
        for g, F in zip(gains, tracks):
            a += g * np.exp(-((np.log2(fk) - np.log2(F)) ** 2) / (2 * 0.22**2))
        x += a * np.sin(k * phase) / k**0.4 * (fk < 10000)
    x += breath * band(rng.standard_normal(len(t)), 2000, 6000) * np.exp(-((p - 0.3) ** 2) / 0.1)
    if am[0]:
        x *= 1 - am[1] * (0.5 + 0.5 * np.sin(2 * np.pi * am[0] * t))
    return x * env(dur, 0.035, 10, 1, min(0.18, dur * 0.35))


def meow() -> np.ndarray:  # "mi-aaa-ow"
    return voice(0.75, [(0, 520), (0.25, 780), (0.5, 720), (1, 430)],
                 [[(0, 420), (0.3, 950), (0.75, 800), (1, 550)],
                  [(0, 1400), (0.3, 2000), (0.7, 1500), (1, 1000)],
                  [(0, 3000), (1, 2900)]])


def mew() -> np.ndarray:  # a short, high kitten mew
    return voice(0.38, [(0, 820), (0.3, 1050), (1, 760)],
                 [[(0, 600), (0.4, 1200), (1, 900)], [(0, 1800), (0.4, 2400), (1, 1900)], [(0, 3400), (1, 3300)]],
                 breath=0.01)


def chirp() -> np.ndarray:  # a rising "mrrp?"
    return voice(0.32, [(0, 480), (0.6, 620), (1, 900)],
                 [[(0, 450), (1, 900)], [(0, 1300), (1, 2100)], [(0, 2800), (1, 3100)]],
                 breath=0.006, am=(32, 0.8))


def trill() -> np.ndarray:  # a happy rolling "brrrrt"
    return voice(0.55, [(0, 560), (0.5, 700), (1, 640)],
                 [[(0, 500), (0.5, 800), (1, 650)], [(0, 1500), (0.5, 1900), (1, 1700)], [(0, 3000), (1, 3000)]],
                 breath=0.004, am=(27, 0.9))


def purr(dur: float = 1.6) -> np.ndarray:
    t = tt(dur)
    pulse = np.maximum(0, np.sin(2 * np.pi * 24 * t)) ** 3
    breath = 0.65 + 0.35 * np.sin(2 * np.pi * t / 1.1)  # in and out
    x = band(rng.standard_normal(len(t)), 60, 900) * 0.8 + np.sin(2 * np.pi * 48 * t) + 0.4 * np.sin(2 * np.pi * 96 * t)
    return np.tanh(2 * x * pulse * breath) * env(dur, 0.15, 10, 1, 0.3)


def pat() -> np.ndarray:  # a soft paw step
    t = tt(0.12)
    return np.sin(2 * np.pi * (120 + 80 * np.exp(-t / 0.01)) * t) * np.exp(-t / 0.03) + 0.3 * band(
        rng.standard_normal(len(t)), 300, 2500) * np.exp(-t / 0.012)


def coins() -> np.ndarray:  # a little shower of coins
    out = np.zeros(int(1.0 * SR))
    for i in range(7):
        c = coin() * (0.9 - i * 0.09)
        i0 = int((i * 0.075 + rng.uniform(0, 0.02)) * SR)
        out[i0 : i0 + len(c)] += c[: len(out) - i0]
    return out


def boing() -> np.ndarray:
    t = tt(0.45)
    f = 180 + 260 * np.exp(-t / 0.08) * (1 + 0.3 * np.sin(2 * np.pi * 14 * t))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.15)


def swoosh_big() -> np.ndarray:  # a fuller whoosh for the shader transitions
    w = whoosh(0.8, 200, 3500) + 0.5 * riser(0.8)[: int(0.8 * SR)] * np.linspace(1, 0, int(0.8 * SR))
    return w


if __name__ == "__main__":
    write("music.wav", music(), peak=0.95)
    write("whoosh.wav", reverb(stereo_sweep(whoosh()), 0.8, 0.2))
    write("whoosh-up.wav", reverb(stereo_sweep(whoosh(0.4, 500, 4000)), 0.6, 0.2))
    for i, f in enumerate((520, 640, 760, 900)):
        write(f"pop-{i + 1}.wav", pop(f))
    write("tick.wav", tick())
    for i, m in enumerate((84, 88, 91)):  # C6 E6 G6
        write(f"ding-{i + 1}.wav", reverb(np.stack([ding(m)] * 2), 1.0, 0.25))
    write("tap.wav", tap())
    write("coin.wav", coin())
    for i, m in enumerate((72, 74, 77, 79, 84)):
        write(f"blip-{i + 1}.wav", blip(m))
    write("paper.wav", paper())
    write("sparkle.wav", reverb(np.stack([sparkle()] * 2), 1.2, 0.3))
    write("impact.wav", reverb(np.stack([impact()] * 2), 1.4, 0.2))
    write("meow.wav", reverb(np.stack([meow()] * 2), 0.9, 0.18))
    write("mew.wav", reverb(np.stack([mew()] * 2), 0.8, 0.18))
    write("chirp.wav", reverb(np.stack([chirp()] * 2), 0.7, 0.15))
    write("trill.wav", reverb(np.stack([trill()] * 2), 0.8, 0.15))
    write("purr.wav", purr())
    write("pat.wav", pat())
    write("coins.wav", coins())
    write("boing.wav", boing())
    write("swoosh.wav", reverb(stereo_sweep(swoosh_big()), 0.9, 0.25))
