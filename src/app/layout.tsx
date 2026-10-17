import type { Metadata, Viewport } from "next";
import { Archivo, Big_Shoulders } from "next/font/google";
import type { ReactNode } from "react";

import { CartDrawer } from "@/components/cart/cart-drawer";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ScrollMotion } from "@/components/motion/scroll-motion";
import { CartFxLayer } from "@/components/three/layers";
import { siteConfig } from "@/config/site";
import { CartProvider } from "@/context/cart-context";

import "./globals.css";

const display = Big_Shoulders({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  variable: "--font-big-shoulders",
  display: "swap",
  // No metric overrides ship for this family; use a condensed system stack.
  adjustFontFallback: false,
  fallback: ["Impact", "Arial Narrow", "sans-serif"],
});

const body = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-archivo",
  display: "swap",
});

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
  themeColor: "#0b0a0d",
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <CartProvider>
          <div className="flex min-h-dvh flex-col">
            <SiteHeader />
            <main id="main-content" className="flex-1" tabIndex={-1}>
              {children}
            </main>
            <SiteFooter />
          </div>
          <CartDrawer />
          <ScrollMotion />
          <CartFxLayer />
        </CartProvider>
      </body>
    </html>
  );
}
