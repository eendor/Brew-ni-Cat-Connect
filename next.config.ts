import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  poweredByHeader: false,
  reactStrictMode: true,
  // Accounts use Google sign-in (ADR-030), so the password pages are gone.
  // Old bookmarks and emailed links land on Sign In.
  async redirects() {
    return ["/account/forgot-password", "/account/reset-password"].map(
      (source) => ({
        source,
        destination: "/account/sign-in",
        permanent: false,
      }),
    );
  },
  async headers() {
    return [
      {
        // The app checks this for updates (FR-117), so it must never be stale.
        source: "/android/latest.json",
        headers: [{ key: "Cache-Control", value: "no-cache, max-age=0" }],
      },
      {
        // Each build has its own file name, so the APK itself can be cached.
        source: "/android/:file*.apk",
        headers: [
          {
            key: "Content-Type",
            value: "application/vnd.android.package-archive",
          },
          { key: "Content-Disposition", value: "attachment" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
