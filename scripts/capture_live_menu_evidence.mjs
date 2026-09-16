import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.EVIDENCE_BASE_URL ?? "http://127.0.0.1:3000";
const outputDirectory = path.resolve(
  process.env.EVIDENCE_OUTPUT_DIRECTORY ?? "test-results/live-menu-evidence",
);

const viewports = [
  { width: 320, height: 900 },
  { width: 375, height: 900, screenshot: "menu-mobile-375.png" },
  { width: 768, height: 900 },
  { width: 1024, height: 900 },
  { width: 1440, height: 1000, screenshot: "menu-desktop-1440.png" },
];

await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    const consoleErrors = [];
    const publicDataRequests = [];

    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });
    page.on("pageerror", (error) => {
      consoleErrors.push(`Page error: ${error.message}`);
    });
    page.on("request", (request) => {
      const resource = ["categories", "items"].find((table) =>
        request.url().includes(`/rest/v1/${table}`),
      );

      if (!resource) return;

      const headers = request.headers();
      const apiKey = headers.apikey ?? "";

      publicDataRequests.push({
        resource,
        method: request.method(),
        keyClassification: apiKey.startsWith("sb_publishable_")
          ? "publishable"
          : "unexpected",
        authorizationScheme: headers.authorization?.startsWith("Bearer ")
          ? "Bearer"
          : "missing",
      });
    });

    const response = await page.goto(`${baseUrl}/menu`, {
      waitUntil: "networkidle",
    });

    await page
      .getByRole("heading", { name: "Buldak & Sedaap", exact: true })
      .waitFor({ timeout: 15_000 });

    const inspection = await page.evaluate(() => {
      const articles = [...document.querySelectorAll("main article")];
      const cardHeights = articles.map((article) =>
        Math.round(article.getBoundingClientRect().height),
      );

      return {
        title: document.title,
        heading: document.querySelector("main h1")?.textContent?.trim() ?? null,
        categories: [...document.querySelectorAll("main h2")]
          .map((heading) => heading.textContent?.trim())
          .filter(Boolean),
        itemNames: [...document.querySelectorAll("main article h3")]
          .map((heading) => heading.textContent?.trim())
          .filter(Boolean),
        itemCount: articles.length,
        flavorListCount: document.querySelectorAll('ul[aria-label$=" flavors"]')
          .length,
        flavorPriceListCount: document.querySelectorAll(
          'ul[aria-label$=" flavor prices"]',
        ).length,
        minimumCardHeight: Math.min(...cardHeights),
        maximumCardHeight: Math.max(...cardHeights),
        viewportWidth: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
        hasHorizontalOverflow:
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
        showsUnavailableMessage: document.body.innerText.includes(
          "The public menu is not available right now.",
        ),
        containsOrderingControl: /add to cart|checkout/i.test(
          document.body.innerText,
        ),
        visibleUuidCount:
          document.body.innerText.match(
            /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,
          )?.length ?? 0,
        showsZeroPrice: [...document.querySelectorAll("main span")].some(
          (element) => element.textContent?.trim() === "₱0",
        ),
        representativeContent: {
          buldak: document.body.innerText.includes("Buldak Carbo"),
          fries: document.body.innerText.includes("Fries (Cat Claws)"),
          matcha: document.body.innerText.includes(
            "Matcha (The Lucky Green Neko)",
          ),
          takoyaki: document.body.innerText.includes(
            "Takoyaki (Pawsome Balls)",
          ),
          combo: document.body.innerText.includes("Scaredy Cats"),
          takeoutPrice: document.body.innerText.includes("₱10"),
        },
      };
    });

    if (viewport.screenshot) {
      await page.screenshot({
        path: path.join(outputDirectory, viewport.screenshot),
        fullPage: true,
      });
    }

    results.push({
      viewport,
      httpStatus: response?.status() ?? null,
      consoleErrors,
      publicDataRequests,
      ...inspection,
    });

    await page.close();
  }

  const homePage = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  await homePage.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  const favoriteLinks = await homePage.evaluate(() =>
    [...document.querySelectorAll("main a")]
      .filter((link) => /menu/i.test(link.textContent ?? ""))
      .map((link) => ({
        text: link.textContent?.trim() ?? "",
        href: link.getAttribute("href"),
      })),
  );
  await homePage.close();

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    dataSource: "Live public Supabase runtime; no route mocking",
    favoriteLinks,
    results,
  };

  const violations = results.flatMap((result) => {
    const failures = [];

    if (result.httpStatus !== 200) failures.push("HTTP status was not 200");
    if (result.consoleErrors.length > 0) failures.push("console errors exist");
    if (result.hasHorizontalOverflow)
      failures.push("horizontal overflow exists");
    if (result.showsUnavailableMessage)
      failures.push("empty state remained visible");
    if (result.containsOrderingControl)
      failures.push("ordering controls appeared");
    if (result.visibleUuidCount > 0) failures.push("internal UUIDs appeared");
    if (result.showsZeroPrice) failures.push("zero placeholder price appeared");
    if (result.categories.length === 0) failures.push("no categories rendered");
    if (result.itemCount === 0) failures.push("no items rendered");
    if (
      result.publicDataRequests.length !== 2 ||
      result.publicDataRequests.some(
        (request) =>
          request.method !== "GET" ||
          request.keyClassification !== "publishable" ||
          request.authorizationScheme !== "Bearer",
      )
    ) {
      failures.push("public catalog request configuration was unexpected");
    }
    if (Object.values(result.representativeContent).some((value) => !value)) {
      failures.push("representative content was missing");
    }

    return failures.map((failure) => `${result.viewport.width}px: ${failure}`);
  });

  if (
    favoriteLinks.length < 3 ||
    favoriteLinks.some((link) => link.href !== "/menu")
  ) {
    violations.push(
      "Homepage menu/favorite links did not consistently target /menu",
    );
  }

  report.violations = violations;

  await writeFile(
    path.join(outputDirectory, "live-menu-review.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );

  console.log(JSON.stringify(report, null, 2));

  if (violations.length > 0) {
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}
