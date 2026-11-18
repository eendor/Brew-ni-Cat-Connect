import React from "react";
import {
  linearTiming,
  TransitionSeries,
  type TransitionPresentation,
} from "@remotion/transitions";
import { bookFlip } from "@remotion/transitions/book-flip";
import { clockWipe } from "@remotion/transitions/clock-wipe";
import { crossZoom } from "@remotion/transitions/cross-zoom";
import { crosswarp } from "@remotion/transitions/crosswarp";
import { dreamyZoom } from "@remotion/transitions/dreamy-zoom";
import { filmBurn } from "@remotion/transitions/film-burn";
import { ripple } from "@remotion/transitions/ripple";
import { swap } from "@remotion/transitions/swap";
import { zoomBlur } from "@remotion/transitions/zoom-blur";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { easeInOut, Grain, LightLeak, Vignette } from "./components";
import {
  AppFeatures,
  AppReveal,
  Arcade,
  Cats,
  Intro,
  Outro,
  STEP,
  Taste,
} from "./scenes";
import { Soundtrack } from "./Soundtrack";
import {
  ORDER_BEAT,
  PERK_BEAT,
  WebHero,
  WebOrder,
  WebPerks,
} from "./web-scenes";

const T = 16;

export const SCENES = [
  { id: "intro", C: Intro, frames: 110 },
  { id: "taste", C: Taste, frames: 130 },
  { id: "web-hero", C: WebHero, frames: 150 },
  { id: "web-order", C: WebOrder, frames: 3 * ORDER_BEAT + 20 },
  { id: "web-perks", C: WebPerks, frames: 4 * PERK_BEAT + 10 },
  { id: "app-reveal", C: AppReveal, frames: 120 },
  { id: "app-features", C: AppFeatures, frames: 4 * STEP + 10 },
  { id: "arcade", C: Arcade, frames: 130 },
  { id: "cats", C: Cats, frames: 120 },
  { id: "outro", C: Outro, frames: 186 },
] as const;

// Shader transitions render the two scenes into a canvas and mix them on the
// GPU. They need the HTML-in-canvas support that ships with Remotion's
// Chrome Headless Shell.
const transitions = (
  width: number,
  height: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): TransitionPresentation<any>[] => [
  zoomBlur({}),
  crossZoom({ strength: 0.5 }),
  swap({}),
  ripple({ amplitude: 80 }),
  filmBurn({ seed: 3 }), // the drop: "Now on Android"
  dreamyZoom({}),
  bookFlip({}),
  clockWipe({ width, height }),
  crosswarp({}),
];

export const PROMO_FRAMES =
  SCENES.reduce((n, s) => n + s.frames, 0) - T * (SCENES.length - 1);

/** Frame at which each scene starts (it overlaps the previous transition). */
export const SCENE_START = Object.fromEntries(
  SCENES.map((s, i) => [
    s.id,
    SCENES.slice(0, i).reduce((n, p) => n + p.frames - T, 0),
  ]),
) as Record<(typeof SCENES)[number]["id"], number>;

const timing = linearTiming({ durationInFrames: T, easing: easeInOut });

export const Promo: React.FC = () => {
  const { width, height } = useVideoConfig();
  const list = transitions(width, height);
  return (
    <AbsoluteFill>
      <Soundtrack />
      <TransitionSeries>
        {SCENES.map(({ id, C, frames }, i) => (
          <React.Fragment key={id}>
            <TransitionSeries.Sequence durationInFrames={frames}>
              <C />
            </TransitionSeries.Sequence>
            {i < SCENES.length - 1 ? (
              <TransitionSeries.Transition
                presentation={list[i]!}
                timing={timing}
              />
            ) : null}
          </React.Fragment>
        ))}
      </TransitionSeries>
      {/* A warm light leak flares over every scene change. */}
      {SCENES.slice(1).map((s, i) => (
        <LightLeak
          key={s.id}
          at={SCENE_START[s.id] + T / 2}
          flip={i % 2 === 1}
        />
      ))}
      <Vignette />
      <Grain />
    </AbsoluteFill>
  );
};
