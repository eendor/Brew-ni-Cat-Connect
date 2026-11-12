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
