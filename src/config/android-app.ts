import latest from "../../public/android/latest.json";

/**
 * The Android app the site hosts itself (FR-116, ADR-038). public/android/
 * holds the signed APK and latest.json, which the app also reads to update
 * itself (FR-117). android/README.md says how to publish a new build.
 */
export type AndroidRelease = Readonly<{
  versionCode: number;
  versionName: string;
  url: string;
  sha256: string;
  size: number;
  minAndroid: string;
  notes: string;
}>;

export const androidRelease: AndroidRelease = latest;

/** "2.7 MB" */
export function apkSizeLabel(bytes: number): string {
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}
