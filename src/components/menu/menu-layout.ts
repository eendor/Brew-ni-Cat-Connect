export type CardSpan = Readonly<{ md: number; xl: number }>;

/**
 * Breaks a category into rows so the grid is never a flat run of identical
 * boxes: the lead card (first item with a shop photo) takes two thirds of a
 * row on wide screens, and a short last row stretches to fill the width.
 */
export function layoutCategory(
  items: readonly Readonly<{ hasImage: boolean }>[],
): Readonly<{ featured: number; spans: CardSpan[] }> {
  const n = items.length;
  const firstPhoto = items.findIndex((entry) => entry.hasImage);
  const featured = n >= 2 && firstPhoto !== -1 ? firstPhoto : n >= 3 ? 0 : -1;

  function pack(columns: number, lead: number, normal: number) {
    const spans: number[] = items.map((_, index) =>
      index === featured ? lead : normal,
    );
    let row: number[] = [];
    let used = 0;
    const close = () => {
      const left = columns - used;
      if (left > 0 && row.length > 0) {
        if (row.includes(featured)) {
          spans[featured] = lead + left;
        } else {
          for (const index of row) spans[index] = columns / row.length;
        }
      }
      row = [];
      used = 0;
    };
    spans.forEach((want, index) => {
      if (used + want > columns) close();
      row.push(index);
      used += want;
    });
    close();
    return spans;
  }

  const md = pack(2, 2, 1);
  const xl = pack(12, 8, 4);
  return {
    featured,
    spans: md.map((value, index) => ({ md: value, xl: xl[index] ?? 4 })),
  };
}
