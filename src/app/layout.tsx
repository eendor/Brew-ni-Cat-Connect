import type { Metadata, Viewport } from "next";
import { Archivo, Big_Shoulders } from "next/font/google";
import type { ReactNode } from "react";

import { CartDrawer } from "@/components/cart/cart-drawer";
import { CartUndoToast } from "@/components/cart/cart-undo-toast";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { MotionDirector } from "@/components/motion/motion-director";
import { RouteCurtain } from "@/components/motion/route-curtain";
import { ScrollMotion } from "@/components/motion/scroll-motion";
import { CartFxLayer } from "@/components/three/layers";
import { siteConfig } from "@/config/site";
import { AuthProvider } from "@/context/auth-context";
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
  themeColor: "#f6eee1",
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

/**
 * Runs before the first paint: flags the page for the motion director so
 * animated content waits for its entrance instead of flashing in place.
 * Reduced motion (unless `?motion`) leaves the page static.
 */
const MOTION_FLAG = `try{if(new URLSearchParams(location.search).has("motion")||!matchMedia("(prefers-reduced-motion: reduce)").matches)document.documentElement.setAttribute("data-motion","on")}catch(e){}`;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable}`}
      // lets Next turn smooth scrolling off while it resets the scroll
      // position on navigation (otherwise new pages start part-way down)
      data-scroll-behavior="smooth"
      // the motion flag above is set before React hydrates
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: MOTION_FLAG }} />
      </head>
      <body>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <AuthProvider>
          <CartProvider>
            <div className="flex min-h-dvh flex-col">
              <SiteHeader />
              <main id="main-content" className="flex-1" tabIndex={-1}>
                {children}
              </main>
              <SiteFooter />
            </div>
            <CartDrawer />
            <CartUndoToast />
            <ScrollMotion />
            <MotionDirector />
            <RouteCurtain />
            <CartFxLayer />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
