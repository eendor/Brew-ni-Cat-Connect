import { CAT_FRAME, CAT_TAGS, catSheet } from "@/lib/cats/sprites";

type CatSpriteProps = Readonly<{
  cat: string;
  mode?: (typeof CAT_TAGS)[number];
  frame?: number;
  scale?: number;
  className?: string;
}>;

/** One frame of a parade cat's pixel-art sheet, drawn crisp at `scale`. */
export function CatSprite({
  cat,
  mode = "look",
  frame = 0,
  scale = 2,
  className,
}: CatSpriteProps) {
  const row = CAT_TAGS.indexOf(mode);
  const w = CAT_FRAME.width * scale;
  const h = CAT_FRAME.height * scale;
  return (
    <span
      aria-hidden="true"
      data-testid={`cat-sprite-${cat}`}
      className={`pixel-sprite inline-block ${className ?? ""}`}
      style={{
        width: w,
        height: h,
        backgroundImage: `url(${catSheet(cat)})`,
        backgroundSize: `${w * 6}px ${h * CAT_TAGS.length}px`,
        backgroundPosition: `${-frame * w}px ${-row * h}px`,
        imageRendering: "pixelated",
      }}
    />
  );
}
