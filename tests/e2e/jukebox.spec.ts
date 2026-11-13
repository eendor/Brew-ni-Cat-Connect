import { expect, test } from "@playwright/test";

/**
 * The café jukebox in the footer (FR-115, ADR-033). Set CAPTURE_EVIDENCE=1
 * to refresh the screenshots in docs/evidence/phase-9/jukebox/.
 */
const CAPTURE_EVIDENCE = process.env.CAPTURE_EVIDENCE === "1";
const EVIDENCE_DIR = "docs/evidence/phase-9/jukebox";

test("TC-P9-027 — café music plays only when pressed, names the song, skips and stops", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/menu");
  const footer = page.locator("footer");
  await footer.scrollIntoViewIfNeeded();
  const play = page.getByTestId("jukebox-play");
  await expect(play).toHaveText("Play café music");
  await expect(play).toHaveAttribute("aria-pressed", "false");
  // nothing has made a sound before the press
  expect(
    await page.evaluate(
      () => document.querySelector('[data-testid="jukebox-now"]')?.textContent,
    ),
  ).toBe("");
  if (CAPTURE_EVIDENCE)
    await footer.screenshot({ path: `${EVIDENCE_DIR}/jukebox-idle-1440.png` });

  await play.click();
  await expect(play).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("jukebox-now")).toContainText(
    "Now playing: Valse du chat (Written for Brew ni Cat)",
  );
  if (CAPTURE_EVIDENCE)
    await footer.screenshot({
      path: `${EVIDENCE_DIR}/jukebox-playing-1440.png`,
    });

  await page.getByTestId("jukebox-next").click();
  await expect(page.getByTestId("jukebox-now")).toContainText(
    "Au clair de la lune (French folk song, traditional (public domain))",
  );

  // it keeps playing from page to page
  await page.getByRole("link", { name: "About", exact: true }).first().click();
  await expect(page).toHaveURL(/\/about/);
  await expect(page.getByTestId("jukebox-play")).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.getByTestId("jukebox-play").click();
  await expect(page.getByTestId("jukebox-play")).toHaveText("Play café music");
  await expect(page.getByTestId("jukebox-next")).toHaveCount(0);
  expect(errors).toEqual([]);
});
