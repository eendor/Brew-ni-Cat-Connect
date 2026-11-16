import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AndroidAppSection } from "@/components/android/android-app-section";
import { SiteFooter } from "@/components/layout/site-footer";
import { androidRelease, apkSizeLabel } from "@/config/android-app";
import { fallbackAbout } from "@/lib/site-content/fallback-pages";
import { fallbackShop } from "@/lib/site-content/fallback-shop";
import nextConfig from "../../next.config";

/**
 * The site hosts the Android app (FR-116), and public/android/latest.json is
 * what the app reads to update itself (FR-117, ADR-038).
 */
const gradle = readFileSync("android/app/build.gradle.kts", "utf8");
const apkPath = `public${androidRelease.url}`;

describe("Android app on the website", () => {
  it("TC-P9-068 — latest.json describes the APK the site serves, and matches the Android project", () => {
    expect(androidRelease.url).toMatch(/^\/android\/[a-z0-9.-]+\.apk$/);
    expect(androidRelease.sha256).toMatch(/^[0-9a-f]{64}$/);
    const apk = readFileSync(apkPath);
    expect(createHash("sha256").update(apk).digest("hex")).toBe(
      androidRelease.sha256,
    );
    expect(statSync(apkPath).size).toBe(androidRelease.size);
    expect(gradle).toContain(`versionCode = ${androidRelease.versionCode}`);
    expect(gradle).toContain(`versionName = "${androidRelease.versionName}"`);
    expect(gradle).toContain("minSdk = 26");
    expect(androidRelease.minAndroid).toBe("8.0");
    // Only the current build is kept, so the repository doesn't grow with old APKs.
    expect(
      readdirSync("public/android").filter((name) => name.endsWith(".apk")),
    ).toEqual([androidRelease.url.split("/").pop()]);
  });

  it("TC-P9-069 — the home section and the footer link download the APK", async () => {
    render(<AndroidAppSection />);
    const download = screen.getByRole("link", { name: "Download for Android" });
    expect(download).toHaveAttribute("href", androidRelease.url);
    expect(download).toHaveAttribute("download");
    expect(
      screen.getByText(
        `Version ${androidRelease.versionName} · ${apkSizeLabel(androidRelease.size)} · Android 8.0 or newer`,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/the app tells you when there.s an update/),
    ).toBeInTheDocument();

    render(<SiteFooter content={{ ...fallbackShop, about: fallbackAbout }} />);
    expect(screen.getByRole("link", { name: "Android app" })).toHaveAttribute(
      "href",
      androidRelease.url,
    );

    const headers = await nextConfig.headers!();
    const manifestRule = headers.find(
      (rule) => rule.source === "/android/latest.json",
    );
    expect(manifestRule?.headers).toContainEqual({
      key: "Cache-Control",
      value: "no-cache, max-age=0",
    });
    const apkRule = headers.find((rule) => rule.source.endsWith(".apk"));
    expect(apkRule?.headers).toContainEqual({
      key: "Content-Type",
      value: "application/vnd.android.package-archive",
    });
  });
});
