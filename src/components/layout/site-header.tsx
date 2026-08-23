import Link from "next/link";

import { siteConfig } from "@/config/site";

import { Container } from "../ui/container";
import { MobileNavigation } from "./mobile-navigation";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border-soft)] bg-[var(--surface-canvas-translucent)] backdrop-blur-md">
      <Container className="flex min-h-18 items-center justify-between gap-5 py-3">
        <Link
          href="/"
          className="group inline-flex items-center gap-3 rounded-lg"
          aria-label={siteConfig.name}
        >
          <span
            className="font-display inline-flex size-10 items-center justify-center rounded-full bg-[var(--accent-solid)] text-lg font-bold text-white shadow-sm transition-transform group-hover:-rotate-3"
            aria-hidden="true"
          >
            B
          </span>
          <span className="leading-tight">
            <span className="block text-base font-extrabold tracking-tight text-[var(--text-strong)]">
              {siteConfig.name}
            </span>
            <span className="block text-[0.68rem] font-bold tracking-[0.16em] text-[var(--accent-strong)] uppercase">
              Connect
            </span>
          </span>
        </Link>

        <nav className="hidden lg:block" aria-label="Desktop navigation">
          <ul className="flex items-center gap-1">
            {siteConfig.navigation.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex min-h-11 items-center rounded-full px-4 py-2 text-sm font-bold text-[var(--text-muted)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--text-strong)]"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden lg:block">
          <Link
            href="/menu"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--text-strong)] px-5 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[var(--accent-solid)]"
          >
            View menu
          </Link>
        </div>

        <MobileNavigation items={siteConfig.navigation} />
      </Container>
    </header>
  );
}
