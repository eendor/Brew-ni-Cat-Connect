import React from "react";
import {
  linearTiming,
  springTiming,
  TransitionSeries,
  type TransitionPresentation,
} from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import {
  AppFeatures,
  AppReveal,
  Arcade,
  Cats,
  Intro,
  Outro,
  Taste,
  WebHero,
  WebTour,
} from "./scenes";

const T = 16;
const springy = springTiming({ config: { damping: 200 }, durationInFrames: T });

export const SCENES = [
  { id: "intro", C: Intro, frames: 110 },
  { id: "taste", C: Taste, frames: 150 },
  { id: "web-hero", C: WebHero, frames: 180 },
  { id: "web-tour", C: WebTour, frames: 170 },
  { id: "app-reveal", C: AppReveal, frames: 140 },
  { id: "app-features", C: AppFeatures, frames: 4 * 58 + 10 },
  { id: "arcade", C: Arcade, frames: 150 },
  { id: "cats", C: Cats, frames: 120 },
  { id: "outro", C: Outro, frames: 180 },
] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const transitions: TransitionPresentation<any>[] = [
  slide({ direction: "from-bottom" }),
  wipe({ direction: "from-left" }),
  slide({ direction: "from-right" }),
  wipe({ direction: "from-bottom" }),
  fade(),
  slide({ direction: "from-right" }),
  wipe({ direction: "from-top-left" }),
  fade(),
];

export const PROMO_FRAMES =
  SCENES.reduce((n, s) => n + s.frames, 0) - T * (SCENES.length - 1);

export const Promo: React.FC = () => (
  <TransitionSeries>
    {SCENES.map(({ id, C, frames }, i) => (
      <React.Fragment key={id}>
        <TransitionSeries.Sequence durationInFrames={frames}>
          <C />
        </TransitionSeries.Sequence>
        {i < SCENES.length - 1 ? (
          <TransitionSeries.Transition
            presentation={transitions[i]!}
            timing={i % 2 ? linearTiming({ durationInFrames: T }) : springy}
          />
        ) : null}
      </React.Fragment>
    ))}
  </TransitionSeries>
);
