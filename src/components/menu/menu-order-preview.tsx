"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

import { menuModelSpec, type ModelSpec } from "@/components/three/menu-models";
import { useThreeEnabled } from "@/components/three/use-three-enabled";
import { getMenuItemImage } from "@/config/menu-item-images";
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
 * The floating 3D picture at the top of the Add to order dialog: the item's
 * built model, or a generic cup or box. The photo shows only when 3D is off
 * or fails; while it loads the dialog shows the empty glow.
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
  const spec: ModelSpec = useMemo(
    () => menuModelSpec(item, categoryName, variant, flavor),
    [item, categoryName, variant, flavor],
  );
  const live = threeEnabled && !failed;
  if (!photo && !live) return null;

  return (
    <div
      className="order-preview"
      style={live ? { ["--stage-glow" as string]: spec.glow } : undefined}
      data-stage={live ? (ready ? "ready" : "loading") : "photo"}
    >
      {photo && !live ? (
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
