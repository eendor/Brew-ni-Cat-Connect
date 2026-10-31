import type { Metadata, Viewport } from "next";
import { Big_Shoulders, Inter } from "next/font/google";
import type { ReactNode } from "react";

import { CartDrawer } from "@/components/cart/cart-drawer";
import { CartUndoToast } from "@/components/cart/cart-undo-toast";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { MotionDirector } from "@/components/motion/motion-director";
import { RouteCurtain } from "@/components/motion/route-curtain";
import { ScrollMotion } from "@/components/motion/scroll-motion";
import { ThemeSync } from "@/components/theme/theme-toggle";
import { CartFxLayer } from "@/components/three/layers";
import { SiteNotice } from "@/components/layout/site-notice";
import { siteConfig } from "@/config/site";
import { AuthProvider } from "@/context/auth-context";
import { CartProvider } from "@/context/cart-context";
import { ShopFactsProvider } from "@/context/shop-facts-context";
import { getMenuFacts } from "@/lib/menu/load-menu-facts";
import { townLine } from "@/lib/site-content/format";
import { getSiteContent } from "@/lib/site-content/load";
import { SHOP_SECTIONS, type ShopFacts } from "@/lib/site-content/types";
import { THEME_SCRIPT } from "@/lib/theme/theme";

import "./globals.css";

/** The lit signs in the 3D scenes only; the page itself uses the system
 * font (ADR-023). */
const signs = Big_Shoulders({
  subsets: ["latin"],
  weight: ["800", "900"],
  variable: "--font-big-shoulders",
  display: "swap",
  // No metric overrides ship for this family; use a condensed system stack.
  adjustFontFallback: false,
  fallback: ["Impact", "Arial Narrow", "sans-serif"],
});

/** iOS 27 type: Apple devices show SF Pro, everyone else gets Inter, the
 * closest open font (ADR-023). */
const text = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/**
 * Pages are rebuilt in the background at most once a minute, so the owner's
 * content and price changes show without a redeploy (FR-085, FR-086).
 */
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const { address } = await getSiteContent();
  const place = townLine(address);
  const description = `Discover ${siteConfig.name} in ${place}, browse the current menu, and find contact and visit information.`;
  return {
    title: {
      default: `${siteConfig.name} | ${place}`,
      template: `%s | ${siteConfig.shortName}`,
    },
    description,
    applicationName: siteConfig.productName,
    keywords: [
      siteConfig.shortName,
      "coffee shop",
      address.town,
      address.province,
      "café menu",
    ],
    icons: {
      icon: "/images/branding/brew-ni-cat-logo.png",
      apple: "/images/branding/brew-ni-cat-logo.png",
    },
    openGraph: {
      type: "website",
      locale: "en_PH",
      title: siteConfig.name,
      description,
      siteName: siteConfig.name,
    },
  };
}

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

export default async function RootLayout({ children }: RootLayoutProps) {
  const [content, menu] = await Promise.all([getSiteContent(), getMenuFacts()]);
  const facts = {
    ...Object.fromEntries(
      SHOP_SECTIONS.map((section) => [section, content[section]]),
    ),
    takeoutBoxPrice: menu.takeoutBoxPrice,
  } as ShopFacts;

  return (
    <html
      lang="en"
      className={`${signs.variable} ${text.variable}`}
      // lets Next turn smooth scrolling off while it resets the scroll
      // position on navigation (otherwise new pages start part-way down)
      data-scroll-behavior="smooth"
      // the motion flag above and the theme (data-theme) are set before
      // React hydrates
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: MOTION_FLAG }} />
        {/* day or night before the first paint, so night never flashes cream */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <ShopFactsProvider facts={facts}>
          <AuthProvider>
            <CartProvider>
              <div className="flex min-h-dvh flex-col">
                <SiteNotice text={content.notice.text} />
                <SiteHeader />
                <main id="main-content" className="flex-1" tabIndex={-1}>
                  {children}
                </main>
                <SiteFooter content={content} />
              </div>
              <CartDrawer />
              <CartUndoToast />
              <ScrollMotion />
              <MotionDirector />
              <RouteCurtain />
              <CartFxLayer />
              <ThemeSync />
            </CartProvider>
          </AuthProvider>
        </ShopFactsProvider>
      </body>
    </html>
  );
}
