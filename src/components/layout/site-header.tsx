import Image from "next/image";
import Link from "next/link";

import { siteConfig } from "@/config/site";

import { CartTriggerButton } from "../cart/cart-trigger-button";
import { Container } from "../ui/container";
import { AccountNav } from "./account-nav";
import { MobileNavigation } from "./mobile-navigation";
import { NavLink } from "./nav-link";

export function SiteHeader() {
  return (
    <header className="site-header sticky top-0 z-50 border-b border-white/10 bg-[var(--surface-canvas-translucent)] backdrop-blur-2xl backdrop-saturate-[1.3] transition-[background-color,border-color,box-shadow] duration-500 ease-[var(--ease-cinematic)] supports-[backdrop-filter]:bg-[rgb(11_10_13_/_62%)]">
      <Container className="site-header__bar flex min-h-18 items-center justify-between gap-4 py-2.5 lg:min-h-20">
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
            className="size-12 rounded-full bg-white object-contain p-0.5 transition-transform group-hover:-rotate-2 lg:size-14"
          />
          <span className="leading-tight">
            <span className="font-display block text-xl leading-none text-[var(--text-strong)]">
              {siteConfig.shortName}
            </span>
            <span className="block text-xs font-bold tracking-[0.08em] text-[var(--accent-solid)] uppercase">
              Coffee Shop
            </span>
          </span>
        </Link>

        <nav className="hidden lg:block" aria-label="Desktop navigation">
          <ul className="flex items-center gap-1">
            {siteConfig.navigation.map((item) => (
              <li key={item.href}>
                <NavLink
                  href={item.href}
                  className="nav-link inline-flex min-h-11 items-center rounded-full px-3 py-2 text-xs xl:px-4 font-bold tracking-[0.1em] text-[var(--text-muted)] uppercase hover:text-[var(--text-strong)] aria-[current=page]:text-[var(--text-strong)]"
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden lg:flex lg:items-center lg:gap-4 xl:gap-5">
          <AccountNav />
          <CartTriggerButton />
          <Link
            href="/contact"
            className="nav-link inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--accent-solid)] px-5 py-2 text-xs font-extrabold tracking-[0.08em] text-[var(--on-accent)] uppercase shadow-[var(--shadow-button)] hover:bg-[var(--accent-solid-hover)]"
          >
            Visit us
          </Link>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <CartTriggerButton />
          <MobileNavigation items={siteConfig.navigation} />
        </div>
      </Container>
    </header>
  );
}
