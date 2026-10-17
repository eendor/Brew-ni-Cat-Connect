import { layoutCategory } from "@/components/menu/menu-layout";

const photo = { hasImage: true };
const plain = { hasImage: false };

describe("layoutCategory", () => {
  it("TC-P4-013 — leads with the first photo card and fills every row", () => {
    const layout = layoutCategory([photo, photo, plain, plain]);
    expect(layout.featured).toBe(0);
    expect(layout.spans.map((span) => span.xl)).toEqual([8, 4, 6, 6]);
    expect(layout.spans.map((span) => span.md)).toEqual([2, 1, 1, 2]);
  });

  it("TC-P4-014 — stretches a lone card and the featured card to full rows", () => {
    expect(layoutCategory([plain]).spans).toEqual([{ md: 2, xl: 12 }]);
    const three = layoutCategory([plain, plain, plain]);
    expect(three.featured).toBe(0);
    expect(three.spans.map((span) => span.xl)).toEqual([8, 4, 12]);
  });

  it("TC-P4-015 — keeps two plain cards side by side without a lead", () => {
    const layout = layoutCategory([plain, plain]);
    expect(layout.featured).toBe(-1);
    expect(layout.spans).toEqual([
      { md: 1, xl: 6 },
      { md: 1, xl: 6 },
    ]);
  });
});
