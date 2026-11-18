import React from "react";
import { Audio, interpolate, Sequence, staticFile } from "remotion";

import { PROMO_FRAMES, SCENE_START } from "./Promo";
import { STEP } from "./scenes";
import { ORDER_BEAT, PERK_BEAT } from "./web-scenes";

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
  // A whoosh into every scene change; the shader transitions get the fuller one.
  ...Object.entries(SCENE_START)
    .filter(([id]) => id !== "intro")
    .map(([, start]): Cue => [start - 8, "swoosh", 0.4]),
  ...at("intro", [
    [6, "impact", 0.55],
    [8, "meow", 0.5],
    ...[0, 1, 2, 3, 5, 6, 8, 9, 10].map((i): Cue => [
      Math.round(18 + i * 2.2),
      "tick",
      0.12,
    ]),
    [40, "sparkle", 0.18],
    [58, "chirp", 0.4], // the cat peeks up
  ]),
  // 3x3 grid of menu photos, one every 3 frames
  ...at("taste", [
    ...[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i): Cue => [
      7 + i * 3,
      `pop-${(i % 4) + 1}`,
      0.22,
    ]),
    [44, "mew", 0.3],
  ]),
  ...at("web-hero", [
    [4, "whoosh-up", 0.3],
    [32, "boing", 0.25], // the phone bounces in
    [36, "ding-1", 0.28],
    [46, "ding-2", 0.28],
    [56, "ding-3", 0.28],
    [72, "paper", 0.3],
    [86, "sparkle", 0.16],
  ]),
  ...at("web-order", [
    ...[0, 1, 2].map((i): Cue => [4 + i * ORDER_BEAT, "whoosh-up", 0.3]),
    ...[0, 1, 2].map((i): Cue => [10 + i * ORDER_BEAT, "pat", 0.5]),
    [ORDER_BEAT + 26, "boing", 0.3], // ₱59 sticker
    [ORDER_BEAT + 28, "coin", 0.2],
    [2 * ORDER_BEAT + 18, "pop-3", 0.35], // "Order placed!" + confetti
    [2 * ORDER_BEAT + 20, "trill", 0.45],
  ]),
  ...at("web-perks", [
    ...[1, 2, 3].map((i): Cue => [i * PERK_BEAT - 6, "paper", 0.35]),
    [12, "coins", 0.3], // rewards
    [14, "ding-3", 0.2],
    [PERK_BEAT + 12, "chirp", 0.45], // cat games
    [PERK_BEAT + 14, "pat", 0.5],
    [PERK_BEAT + 18, "pat", 0.45],
    [PERK_BEAT + 22, "pat", 0.4],
    [2 * PERK_BEAT + 12, "mew", 0.4], // gallery
    [3 * PERK_BEAT + 10, "sparkle", 0.25], // find us
    [3 * PERK_BEAT + 14, "meow", 0.4],
  ]),
  ...at("app-reveal", [
    [8, "impact", 0.5],
    [10, "meow", 0.45],
    [8, "pop-1", 0.3],
    [18, "pop-2", 0.3],
    [26, "pop-3", 0.3],
    [30, "sparkle", 0.2],
  ]),
  ...at("app-features", [
    [STEP - 14, "tap", 0.4],
    [STEP + 8, "chirp", 0.3],
    [2 * STEP - 14, "tap", 0.4],
    [2 * STEP + 8, "coins", 0.3], // "Earn points & rewards"
    [3 * STEP - 14, "tap", 0.4],
    [3 * STEP + 6, "mew", 0.3],
  ]),
  ...at("arcade", [
    ...[0, 1, 2, 3].map((i): Cue => [14 + i * 6, `pop-${i + 1}`, 0.3]),
    ...[0, 1, 2, 3, 4].map((i): Cue => [50 + i * 6, `blip-${i + 1}`, 0.16]),
    [88, "trill", 0.4], // the cat peeks up
  ]),
  ...at("cats", [
    ...[0, 1, 2, 3, 4, 5].map((i): Cue => [4 + i * 5, "paper", 0.35]),
    [10, "purr", 0.55],
    [28, "pop-4", 0.25],
    [30, "sparkle", 0.2],
    [42, "mew", 0.45],
    [56, "meow", 0.45],
    [70, "chirp", 0.35],
  ]),
  ...at("outro", [
    [2, "pop-1", 0.35],
    [8, "meow", 0.4],
    [30, "pop-3", 0.35],
    [30, "impact", 0.25],
    [32, "coins", 0.15],
    [40, "sparkle", 0.3],
    [44, "ding-1", 0.22],
    [50, "ding-3", 0.22],
    [94, "trill", 0.45], // the cat peeks up
    [140, "purr", 0.45],
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
