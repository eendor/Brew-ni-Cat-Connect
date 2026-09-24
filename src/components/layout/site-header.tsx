import Image from "next/image";
import Link from "next/link";

import { siteConfig } from "@/config/site";

import { Container } from "../ui/container";
import { MobileNavigation } from "./mobile-navigation";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/40 bg-[var(--surface-canvas-translucent)] shadow-[var(--shadow-subtle)] backdrop-blur-2xl backdrop-saturate-150 transition-[background-color,border-color,box-shadow] duration-500 ease-[var(--ease-cinematic)] supports-[backdrop-filter]:bg-[rgb(255_253_248_/_62%)]">
      <Container className="flex min-h-18 items-center justify-between gap-4 py-2.5 lg:min-h-20">
        <Link
          href="/"
          className="group inline-flex items-center gap-2.5 rounded-lg"
          aria-label={`${siteConfig.name} home`}
        >
          <Image
            src="/images/branding/brew-ni-cat-logo.png"
            width={52}
            height={52}
            alt=""
            priority
            className="size-12 object-contain transition-transform group-hover:-rotate-2 lg:size-14"
          />
          <span className="leading-tight">
            <span className="block text-base font-extrabold tracking-tight text-[var(--text-strong)]">
              {siteConfig.shortName}
            </span>
            <span className="block text-[0.64rem] font-bold tracking-[0.15em] text-[var(--deep-green)] uppercase">
              Coffee Shop
            </span>
          </span>
        </Link>

        <nav className="hidden lg:block" aria-label="Desktop navigation">
          <ul className="flex items-center gap-1">
            {siteConfig.navigation.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="nav-link inline-flex min-h-11 items-center rounded-full px-4 py-2 text-sm font-bold text-[var(--text-muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--text-strong)]"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden lg:block">
          <Link
            href="/contact"
            className="nav-link inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--deep-green)] px-5 py-2 text-sm font-bold text-white shadow-[var(--shadow-button)] hover:bg-[var(--deep-green-hover)]"
          >
            Visit us
          </Link>
        </div>

        <MobileNavigation items={siteConfig.navigation} />
      </Container>
    </header>
  );
}
