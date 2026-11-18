import React from "react";
import { Audio, interpolate, Sequence, staticFile } from "remotion";

import { PROMO_FRAMES, SCENE_START } from "./Promo";

/**
 * Music and sound effects. Everything in public/audio is synthesised by
 * scripts/make-audio.py, so there is nothing to license. Cue frames are
 * relative to each scene's start and match the animation delays in scenes.tsx.
 */
type Cue = [frame: number, file: string, volume: number];

const at = (scene: keyof typeof SCENE_START, cues: Cue[]): Cue[] =>
  cues.map(([f, file, v]) => [SCENE_START[scene] + f, file, v]);

// Built lazily: Promo.tsx imports this file, so SCENE_START is not ready at
// module load.
const cues = (): Cue[] => [
  ...Object.entries(SCENE_START)
    .filter(([id]) => id !== "intro")
    .map(([, start]): Cue => [start - 6, "whoosh", 0.45]),
  ...at("intro", [
    [3, "impact", 0.55],
    ...[0, 1, 2, 3, 5, 6, 8, 9, 10].map((i): Cue => [
      Math.round(18 + i * 2.2),
      "tick",
      0.12,
    ]),
  ]),
  // 3x3 grid of menu photos, one every 3 frames
  ...at(
    "taste",
    [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i): Cue => [
      7 + i * 3,
      `pop-${(i % 4) + 1}`,
      0.22,
    ]),
  ),
  ...at("web-hero", [
    [36, "ding-1", 0.3],
    [46, "ding-2", 0.3],
    [56, "ding-3", 0.3],
    [76, "tap", 0.35],
  ]),
  ...at("web-tour", [
    [9, "whoosh-up", 0.25],
    [18, "whoosh-up", 0.25],
    [27, "whoosh-up", 0.25],
    [40, "pop-2", 0.3],
  ]),
  ...at("app-reveal", [
    [8, "pop-1", 0.35],
    [18, "pop-2", 0.35],
    [26, "pop-3", 0.35],
  ]),
  ...at("app-features", [
    [44, "tap", 0.4],
    [102, "tap", 0.4],
    [118, "coin", 0.25], // "Earn points & rewards"
    [160, "tap", 0.4],
  ]),
  ...at("arcade", [
    ...[0, 1, 2, 3].map((i): Cue => [14 + i * 6, `pop-${i + 1}`, 0.3]),
    ...[0, 1, 2, 3, 4].map((i): Cue => [50 + i * 6, `blip-${i + 1}`, 0.16]),
  ]),
  ...at("cats", [
    ...[0, 1, 2, 3, 4, 5].map((i): Cue => [4 + i * 5, "paper", 0.35]),
    [28, "pop-4", 0.25],
  ]),
  ...at("outro", [
    [2, "pop-1", 0.35],
    [30, "pop-3", 0.35],
    [40, "sparkle", 0.3],
    [44, "ding-1", 0.22],
    [50, "ding-3", 0.22],
  ]),
];

export const Soundtrack: React.FC = () => (
  <>
    <Audio
      src={staticFile("audio/music.mp3")}
      volume={(f) =>
        0.7 *
        interpolate(f, [PROMO_FRAMES - 20, PROMO_FRAMES], [1, 0.6], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      }
    />
    {cues().map(([from, file, volume], i) => (
      <Sequence key={i} from={Math.max(0, from)} layout="none" name={file}>
        <Audio src={staticFile(`audio/${file}.wav`)} volume={volume} />
      </Sequence>
    ))}
  </>
);
