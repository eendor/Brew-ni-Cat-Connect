import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import manifest from "@/app/manifest";

/**
 * The Android app (FR-065 to FR-069) is a native Kotlin and Jetpack Compose app
 * (ADR-036). It reads the menu and orders with the website's public Supabase
 * key and places orders through the website's /api/orders. These checks keep
 * the Android project, the site's assetlinks.json and the web app manifest in
 * step, and make sure no backend value or secret is ever committed.
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

const projectText = filesUnder("android")
  .filter((path) => /\.(kts|kt|xml|properties|toml|pro|py|md)$/.test(path))
  .filter((path) => !path.endsWith("local.properties"))
  .map((path) => readFileSync(path, "utf8"))
  .join("\n");

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

  it("TC-P8-023 — the app talks to the live site over HTTPS and claims only its order links", () => {
    const host = gradleValue("siteHost");
    expect(host).toBe("brew-ni-cat-connect.vercel.app");
    expect(gradle).toContain('val siteUrl = "https://$siteHost"');
    expect(androidManifest).toContain('android:host="${siteHost}"');
    expect(androidManifest).toContain('android:pathPrefix="/orders/"');
    expect(androidManifest).toContain('android:autoVerify="true"');
    expect(androidManifest).not.toMatch(/android:scheme="http"/);
    // Plain HTTP (for the local mock backend) is allowed only in debug builds.
    expect(androidManifest).not.toMatch(
      /usesCleartextTraffic|networkSecurityConfig/,
    );
    expect(
      existsSync("android/app/src/main/res/xml/network_security_config.xml"),
    ).toBe(false);
  });

  it("TC-P8-024 — the Android project commits no backend key or address and asks only for internet access", () => {
    expect(projectText).not.toMatch(/https:\/\/[a-z0-9]{20}\.supabase\.co/);
    expect(projectText).not.toMatch(/service_role|sb_secret_|sb_publishable_/i);
    expect(projectText).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
    expect(projectText).not.toMatch(/GEMINI_API_KEY|SUPABASE_SERVICE_ROLE/);
    // The public Supabase values come from the build environment or .env.local.
    expect(gradle).toContain('publicConfig("NEXT_PUBLIC_SUPABASE_URL")');
    expect(gradle).toContain(
      'publicConfig("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")',
    );
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

  it("TC-P8-028 — the native app places orders through the website and tracks them with the public RPC", () => {
    const api = readFileSync(
      "android/app/src/main/java/com/brewnicat/connect/data/Api.kt",
      "utf8",
    );
    expect(api).toContain("/api/orders");
    expect(api).toContain("rpc/get_online_order");
    // Prices are the server's job: the app sends only the expected subtotal.
    const checkout = readFileSync(
      "android/app/src/main/java/com/brewnicat/connect/data/Checkout.kt",
      "utf8",
    );
    expect(checkout).toContain("expectedSubtotal");
    expect(checkout).not.toMatch(/put\("unitPrice"/);
  });
});
