import Image from "next/image";

import { getMenuItemImage } from "@/config/menu-item-images";
import type { MenuItem } from "@/types/menu";

type MenuItemMediaProps = Readonly<{
  item: MenuItem;
}>;

/**
 * The picture at the top of a Menu card: the product photo. Items without a
 * photo show none here; their 3D picture is in the Add to order dialog.
 */
export function MenuItemMedia({ item }: MenuItemMediaProps) {
  const image = getMenuItemImage(item.name);
  if (!image) return null;

  return (
    <div className="menu-card__media">
      <Image
        src={image.src}
        alt={image.alt}
        fill
        sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 92vw"
        className="object-cover"
      />
    </div>
  );
}
