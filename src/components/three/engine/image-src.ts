/**
 * URL of the Next image optimizer for a local photo, so WebGL textures load
 * the same resized, cached file the page already uses. Kept free of
 * three.js imports so ordinary cards can call it without pulling in WebGL.
 */
export function optimizedSrc(src: string, width: 384 | 640 | 828 = 640) {
  if (!src.startsWith("/")) return src;
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=75`;
}
