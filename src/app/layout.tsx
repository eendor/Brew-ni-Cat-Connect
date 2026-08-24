import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { siteConfig } from "@/config/site";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Brew ni Cat Coffee Shop | Kabacan, Cotabato",
    template: `%s | ${siteConfig.shortName}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.productName,
  keywords: ["Brew ni Cat", "coffee shop", "Kabacan", "Cotabato", "café menu"],
  icons: {
    icon: "/images/branding/brew-ni-cat-logo.png",
    apple: "/images/branding/brew-ni-cat-logo.png",
  },
  openGraph: {
    type: "website",
    locale: "en_PH",
    title: "Brew ni Cat Coffee Shop",
    description: siteConfig.description,
    siteName: siteConfig.name,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f0df" },
    { media: "(prefers-color-scheme: dark)", color: "#173f38" },
  ],
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <div className="flex min-h-dvh flex-col">
          <SiteHeader />
          <main id="main-content" className="flex-1" tabIndex={-1}>
            {children}
          </main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
