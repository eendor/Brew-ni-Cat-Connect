"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

import {
  cutoutSpec,
  menuModelSpec,
  type ModelSpec,
} from "@/components/three/menu-models";
import { useThreeEnabled } from "@/components/three/use-three-enabled";
import { getMenuCutout, getMenuItemImage } from "@/config/menu-item-images";
import type { MenuItem, MenuVariant } from "@/types/menu";

const MenuStageCanvas = dynamic(
  () => import("@/components/three/canvas/menu-stage-canvas"),
  { ssr: false },
);

type MenuOrderPreviewProps = Readonly<{
  item: MenuItem;
  categoryName: string;
  variant: MenuVariant | null;
  flavor: string | null;
}>;

/**
 * The floating 3D picture at the top of the Add to order dialog. A product
 * with a photo floats its cut-out; one without gets a built model, or a
 * generic cup or box. The photo shows while it loads and when 3D is off.
 */
export function MenuOrderPreview({
  item,
  categoryName,
  variant,
  flavor,
}: MenuOrderPreviewProps) {
  const threeEnabled = useThreeEnabled();
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const photo = getMenuItemImage(item.name);
  const cutout = getMenuCutout(item.name, flavor);
  const spec: ModelSpec = useMemo(
    () =>
      cutout
        ? cutoutSpec(item, cutout.src)
        : menuModelSpec(item, categoryName, variant, flavor),
    [item, categoryName, variant, flavor, cutout],
  );
  const live = threeEnabled && !failed;
  if (!photo && !live) return null;

  return (
    <div
      className="order-preview"
      style={live ? { ["--stage-glow" as string]: spec.glow } : undefined}
      data-stage={live ? (ready ? "ready" : "loading") : "photo"}
    >
      {photo && !(live && ready) ? (
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          sizes="(min-width: 640px) 32rem, 92vw"
          className="object-cover"
        />
      ) : null}
      {live ? (
        <MenuStageCanvas
          spec={spec}
          onReady={() => setReady(true)}
          onError={() => setFailed(true)}
        />
      ) : null}
    </div>
  );
}
