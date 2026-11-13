import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import manifest from "@/app/manifest";

/**
 * The Android app (FR-065 to FR-069) is a Trusted Web Activity over the live
 * site (ADR-035). These checks keep the Android project, the site's
 * assetlinks.json and the web app manifest in step, so the app opens full
 * screen and never carries a backend key.
 */
const gradle = readFileSync("android/app/build.gradle.kts", "utf8");
const androidManifest = readFileSync(
  "android/app/src/main/AndroidManifest.xml",
  "utf8",
);
const assetLinks = JSON.parse(
  readFileSync("public/.well-known/assetlinks.json", "utf8"),
) as Array<{
  relation: string[];
  target: {
    namespace: string;
    package_name: string;
    sha256_cert_fingerprints: string[];
  };
}>;

function gradleValue(name: string): string {
  const match = gradle.match(new RegExp(`${name}\\s*=\\s*"([^"]+)"`));
  const value = match?.[1];
  if (!value) throw new Error(`${name} not found in build.gradle.kts`);
  return value;
}

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (["build", ".gradle"].includes(name)) return [];
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

describe("Android app", () => {
  it("TC-P8-022 — assetlinks.json names the app's package and a SHA-256 signing fingerprint", () => {
    expect(assetLinks).toHaveLength(1);
    const [link] = assetLinks;
    if (!link) throw new Error("assetlinks.json is empty");
    expect(link.relation).toEqual([
      "delegate_permission/common.handle_all_urls",
    ]);
    expect(link.target.namespace).toBe("android_app");
    expect(link.target.package_name).toBe(gradleValue("applicationId"));
    expect(link.target.sha256_cert_fingerprints.length).toBeGreaterThan(0);
    for (const fingerprint of link.target.sha256_cert_fingerprints) {
      expect(fingerprint).toMatch(/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/);
    }
  });

  it("TC-P8-023 — the app opens the site's start page and claims only that site's links", () => {
    const host = gradleValue("siteHost");
    expect(host).toBe("brew-ni-cat-connect.vercel.app");
    expect(gradle).toContain('val siteUrl = "https://$siteHost/"');
    expect(gradle).toContain('\\"site\\": \\"https://$siteHost\\"');
    expect(manifest().start_url).toBe("/");
    expect(androidManifest).toContain('android:host="${siteHost}"');
    expect(androidManifest).toContain('android:autoVerify="true"');
    expect(androidManifest).not.toMatch(/android:scheme="http"/);
  });

  it("TC-P8-024 — the Android project holds no backend key or address and asks only for internet access", () => {
    const text = filesUnder("android")
      .filter((path) => /\.(kts|xml|properties|toml|pro)$/.test(path))
      .filter((path) => !path.endsWith("local.properties"))
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");
    expect(text).not.toMatch(/supabase/i);
    expect(text).not.toMatch(/service_role|sb_secret_|sb_publishable_/i);
    expect(text).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
    const permissions = [
      ...androidManifest.matchAll(/uses-permission android:name="([^"]+)"/g),
    ].map((match) => match[1]);
    expect(permissions).toEqual(["android.permission.INTERNET"]);
    expect(androidManifest).toContain('android:allowBackup="false"');
  });

  it("TC-P8-025 — the app's colours match the web app manifest", () => {
    const colors = readFileSync(
      "android/app/src/main/res/values/colors.xml",
      "utf8",
    );
    const cream = colors.match(/name="brand_cream">(#[0-9A-F]{6})</i)?.[1];
    expect(cream?.toLowerCase()).toBe(manifest().theme_color);
    expect(cream?.toLowerCase()).toBe(manifest().background_color);
  });
});
