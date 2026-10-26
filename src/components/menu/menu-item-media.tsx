"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

import { menuModelSpec } from "@/components/three/menu-models";
import { useThreeEnabled } from "@/components/three/use-three-enabled";
import { getMenuItemImage } from "@/config/menu-item-images";
import type { MenuItem } from "@/types/menu";

const MenuStageCanvas = dynamic(
  () => import("@/components/three/canvas/menu-stage-canvas"),
  { ssr: false },
);

type MenuItemMediaProps = Readonly<{
  item: MenuItem;
  categoryName: string;
}>;

/**
 * The picture at the top of a Menu card: the product floating in 3D when the
 * device can run it, otherwise the photo. Items the shop adds later have no
 * photo, and still get a generic 3D model for their category.
 */
export function MenuItemMedia({ item, categoryName }: MenuItemMediaProps) {
  const threeEnabled = useThreeEnabled();
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const image = getMenuItemImage(item.name);
  const spec = useMemo(
    () => menuModelSpec(item, categoryName),
    [item, categoryName],
  );
  const live = threeEnabled && !failed;
  if (!image && !live) return null;

  return (
    <div
      className="menu-card__media"
      style={live ? { ["--stage-glow" as string]: spec.glow } : undefined}
      data-stage={live ? (ready ? "ready" : "loading") : "photo"}
    >
      {image && !(live && ready) ? (
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 92vw"
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
