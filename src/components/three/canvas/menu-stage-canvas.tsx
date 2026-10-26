"use client";

import { useEffect, useRef } from "react";

import { getQuality } from "../engine/runtime";
import type { ModelSpec } from "../menu-models";
import { initMenuStage, type MenuStage } from "../scenes/menu-stage";

type MenuStageCanvasProps = Readonly<{
  spec: ModelSpec;
  onReady?: () => void;
  onError?: () => void;
}>;

/** One stage serves every card; it lives while at least one card does. */
let shared: Promise<MenuStage> | null = null;
let users = 0;

function acquire(): Promise<MenuStage> {
  users += 1;
  shared ??= initMenuStage(getQuality()).catch((error: unknown) => {
    shared = null;
    throw error;
  });
  return shared;
}

function release() {
  users -= 1;
  if (users > 0 || !shared) return;
  const closing = shared;
  shared = null;
  closing.then((stage) => stage.dispose()).catch(() => {});
}

/**
 * A Menu card's 3D picture. The canvas is plain 2D; the shared stage draws
 * the card's model into it while the card is near the screen. If the stage
 * can't start or its context is lost, `onError` lets the card show its photo.
 */
export default function MenuStageCanvas({
  spec,
  onReady,
  onError,
}: MenuStageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const specRef = useRef(spec);
  const slotRef = useRef<ReturnType<MenuStage["attach"]> | null>(null);
  const callbacks = useRef({ onReady, onError });
  useEffect(() => {
    specRef.current = spec;
    callbacks.current = { onReady, onError };
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    acquire().then(
      (stage) => {
        if (cancelled) return;
        slotRef.current = stage.attach(canvas, specRef.current, {
          onReady: () => callbacks.current.onReady?.(),
          onError: () => callbacks.current.onError?.(),
        });
      },
      (error: unknown) => {
        if (cancelled) return;
        console.warn("3D menu unavailable, keeping the photos", error);
        callbacks.current.onError?.();
      },
    );
    return () => {
      cancelled = true;
      slotRef.current?.dispose();
      slotRef.current = null;
      release();
    };
  }, []);

  useEffect(() => {
    slotRef.current?.setSpec(spec);
  }, [spec]);

  return (
    <canvas
      ref={canvasRef}
      className="menu-card__stage"
      role="img"
      aria-label="Rotating 3D picture of this item. Drag to turn it."
    />
  );
}
