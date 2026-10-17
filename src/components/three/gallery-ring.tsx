"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";

import type { GalleryRingControls } from "./canvas/gallery-ring-canvas";
import type { RingPhoto } from "./scenes/gallery-ring";
import { useThreeEnabled } from "./use-three-enabled";

const GalleryRingCanvas = dynamic(
  () => import("./canvas/gallery-ring-canvas"),
  {
    ssr: false,
  },
);

/**
 * Curved, draggable 3D ring of the gallery photos with button controls and
 * a live caption. The full accessible photo grid stays below it.
 */
export function GalleryRing({
  photos,
}: Readonly<{ photos: readonly RingPhoto[] }>) {
  const enabled = useThreeEnabled();
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [focus, setFocus] = useState(0);
  const controls = useRef<GalleryRingControls>(null);
  const onFocus = useCallback((index: number) => setFocus(index), []);
  const onReady = useCallback(() => setReady(true), []);
  const onError = useCallback(() => setFailed(true), []);
  if (!enabled || failed) return null;
  const current = photos[focus];

  return (
    <section className="gallery-ring" aria-label="3D photo ring">
      <div className={`gallery-ring__stage${ready ? " is-ready" : ""}`}>
        <GalleryRingCanvas
          photos={photos}
          controlsRef={controls}
          onFocus={onFocus}
          onReady={onReady}
          onError={onError}
        />
      </div>
      <div className="gallery-ring__controls">
        <button
          type="button"
          className="round-button"
          aria-label="Previous photo"
          onClick={() => controls.current?.go(-1)}
        >
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path
              d="M12.5 4.5 7 10l5.5 5.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <p className="gallery-ring__caption" aria-live="polite">
          <span className="gallery-ring__count">
            {focus + 1} / {photos.length}
          </span>
          <span>{current?.alt}</span>
        </p>
        <button
          type="button"
          className="round-button"
          aria-label="Next photo"
          onClick={() => controls.current?.go(1)}
        >
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path
              d="M7.5 4.5 13 10l-5.5 5.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </section>
  );
}
