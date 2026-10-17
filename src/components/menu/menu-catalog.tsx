"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

import { fetchPublicMenu } from "@/lib/menu/fetch-public-menu";
import { isCatTreatsCategory } from "@/lib/menu/map-menu-catalog";
import type { MenuCatalog as MenuCatalogModel } from "@/types/menu";
import { glowForCategory } from "./category-glow";
import { MenuItemCard } from "./menu-item-card";
import { MenuState } from "./menu-state";

type MenuLoader = (signal?: AbortSignal) => Promise<MenuCatalogModel>;

type MenuCatalogProps = Readonly<{
  loadMenu?: MenuLoader;
}>;

type ViewState =
  | Readonly<{ status: "loading" }>
  | Readonly<{ status: "ready"; catalog: MenuCatalogModel }>
  | Readonly<{ status: "error" }>;

/** How long the page has to stay still before a tab click lets go. */
const CLICK_HOLD_MS = 150;
/** Keys that scroll the page; pressing one hands control back to the spy. */
const SCROLL_KEYS = new Set([
  "ArrowDown",
  "ArrowUp",
  "PageDown",
  "PageUp",
  "Home",
  "End",
  " ",
]);

function getCategoryDisplayName(name: string) {
  return isCatTreatsCategory(name) ? `${name} (For Cats)` : name;
}

function allowsMotion() {
  return (
    typeof window.matchMedia === "function" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function MenuCatalog({ loadMenu = fetchPublicMenu }: MenuCatalogProps) {
  const [viewState, setViewState] = useState<ViewState>({ status: "loading" });
  const [requestVersion, setRequestVersion] = useState(0);
  const [activeCategory, setActiveCategory] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    void loadMenu(controller.signal)
      .then((catalog) => {
        if (!controller.signal.aborted) {
          setViewState({ status: "ready", catalog });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setViewState({ status: "error" });
        }
      });

    return () => controller.abort();
  }, [loadMenu, requestVersion]);

  // Scroll spy. The active category is the last section whose top has
  // passed the reading line, a third of the way down the space under the
  // sticky bars, or the last section once the page bottoms out. It is
  // measured from the layout at most once a frame while the page scrolls,
  // so the tab follows the page instead of trailing it. A tab click selects
  // its category straight away and holds it until the scroll it started
  // settles, so the highlight doesn't walk through the categories between;
  // a wheel, touch or scroll key in the meantime hands control back at once.
  useEffect(() => {
    const nav = navRef.current;
    if (viewState.status !== "ready" || !nav) {
      return;
    }
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-menu-category]"),
    );
    let frame = 0;
    let held = false;
    let release = 0;

    const measure = () => {
      frame = 0;
      if (held) return;
      const barBottom = nav.getBoundingClientRect().bottom;
      const line = barBottom + (window.innerHeight - barBottom) / 3;
      const page = document.documentElement;
      const atBottom =
        page.scrollHeight - window.innerHeight > 4 &&
        window.innerHeight + window.scrollY >= page.scrollHeight - 4;
      let next = 0;
      sections.forEach((section, index) => {
        const box = section.getBoundingClientRect();
        if (box.height > 0 && box.top <= line) next = index;
      });
      setActiveCategory(atBottom ? sections.length - 1 : next);
    };
    const settle = () => {
      window.clearTimeout(release);
      release = window.setTimeout(() => {
        held = false;
      }, CLICK_HOLD_MS);
    };
    const onScroll = () => {
      if (held) settle();
      else if (!frame) frame = window.requestAnimationFrame(measure);
    };
    const onClick = (event: MouseEvent) => {
      const tab = (event.target as Element | null)?.closest<HTMLElement>(
        "[data-menu-tab]",
      );
      if (!tab) return;
      held = true;
      setActiveCategory(Number(tab.dataset.menuTab));
      settle();
    };
    const takeOver = () => {
      held = false;
      window.clearTimeout(release);
    };
    const onKey = (event: KeyboardEvent) => {
      if (SCROLL_KEYS.has(event.key)) takeOver();
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("wheel", takeOver, { passive: true });
    window.addEventListener("touchstart", takeOver, { passive: true });
    window.addEventListener("keydown", onKey);
    nav.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("wheel", takeOver);
      window.removeEventListener("touchstart", takeOver);
      window.removeEventListener("keydown", onKey);
      nav.removeEventListener("click", onClick);
      window.cancelAnimationFrame(frame);
      window.clearTimeout(release);
    };
  }, [viewState]);

  // Keep the active tab inside the tab bar, scrolling the bar (never the
  // page) only when the tab is cut off at either end.
  useEffect(() => {
    const bar = navRef.current;
    const tab = bar?.querySelector<HTMLElement>(
      `[data-menu-tab="${activeCategory}"]`,
    );
    if (!bar || !tab || typeof bar.scrollTo !== "function") {
      return;
    }
    const inset = Math.min(
      Number.parseFloat(getComputedStyle(bar).paddingLeft) || 0,
      64,
    );
    const start = tab.offsetLeft - inset;
    const end = tab.offsetLeft + tab.offsetWidth + inset - bar.clientWidth;
    const left =
      start < bar.scrollLeft ? start : end > bar.scrollLeft ? end : null;
    if (left !== null) {
      bar.scrollTo({ left, behavior: allowsMotion() ? "smooth" : "auto" });
    }
  }, [activeCategory, viewState]);

  // Entrances: each category heading and its cards rise in the first time
  // they reach the view, and cards that arrive together follow each other
  // in reading order. Reduced motion and browsers without
  // IntersectionObserver keep everything static.
  useEffect(() => {
    const root = rootRef.current;
    if (
      viewState.status !== "ready" ||
      !root ||
      typeof IntersectionObserver !== "function" ||
      !allowsMotion()
    ) {
      return;
    }
    root.classList.add("menu-cine");
    const reveal = new IntersectionObserver(
      (entries) => {
        let order = 0;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const element = entry.target as HTMLElement;
          if (element.classList.contains("menu-card")) {
            element.style.setProperty("--i", String(Math.min(order++, 5)));
          }
          element.dataset.in = "true";
          reveal.unobserve(element);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
    );
    root
      .querySelectorAll<HTMLElement>(".menu-cat-head, .menu-grid > .menu-card")
      .forEach((element) => reveal.observe(element));
    return () => {
      reveal.disconnect();
      root.classList.remove("menu-cine");
    };
  }, [viewState]);

  if (viewState.status === "loading") {
    return (
      <div>
        <MenuState state="loading" />
        <div
          className="mt-10 grid gap-5 md:grid-cols-2"
          aria-hidden="true"
          data-testid="menu-skeleton"
        >
          {[0, 1, 2, 3].map((key) => (
            <div key={key} className="skeleton-card p-5 sm:p-6">
              <div className="flex items-center gap-4">
                <div className="skeleton size-20 shrink-0 rounded-2xl sm:size-24" />
                <div className="grid flex-1 gap-2">
                  <div className="skeleton h-6 w-2/3" />
                  <div className="skeleton h-4 w-1/3" />
                </div>
              </div>
              <div className="mt-6 grid gap-3">
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-4/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (viewState.status === "error") {
    return (
      <MenuState
        state="error"
        onRetry={() => {
          setViewState({ status: "loading" });
          setRequestVersion((version) => version + 1);
        }}
      />
    );
  }

  const populatedCategories = viewState.catalog.categories.filter(
    (category) => category.items.length > 0,
  );

  if (populatedCategories.length === 0) {
    return <MenuState state="empty" />;
  }

  return (
    <div ref={rootRef}>
      <nav
        ref={navRef}
        className="menu-tabs menu-tabs--bleed sticky top-[4.5rem] z-30 overflow-x-auto border-y border-[var(--border-soft)] bg-[var(--surface-canvas-translucent)] py-3 backdrop-blur-md lg:top-[5rem]"
        aria-label="Menu categories"
      >
        <ul className="flex w-max min-w-full gap-2">
          {populatedCategories.map((category, index) => (
            <li key={category.id}>
              <a
                href={`#menu-category-${index + 1}`}
                data-menu-tab={index}
                aria-current={activeCategory === index ? "true" : undefined}
                className="menu-tab inline-flex min-h-11 items-center whitespace-nowrap rounded-full border border-[var(--border-soft)] bg-[var(--surface-card)] px-4 py-2 text-sm font-bold text-[var(--text-strong)] hover:border-[var(--accent-solid)] hover:bg-[var(--accent-soft)]"
              >
                {getCategoryDisplayName(category.name)}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="grid gap-16 pt-12 sm:pt-16">
        {populatedCategories.map((category, index) => {
          const glow = glowForCategory(category.name);
          return (
            <section
              key={category.id}
              id={`menu-category-${index + 1}`}
              data-menu-category={index}
              className="menu-category scroll-mt-40"
              style={{ "--ga": glow.a, "--gb": glow.b } as CSSProperties}
              aria-labelledby={`menu-category-heading-${index + 1}`}
            >
              <div className="menu-cat-head">
                <p className="menu-cat-head__index" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                  <span>
                    / {String(populatedCategories.length).padStart(2, "0")}
                  </span>
                </p>
                <div className="flex items-end justify-between gap-5">
                  <div>
                    <h2
                      id={`menu-category-heading-${index + 1}`}
                      className="menu-cat-head__title"
                    >
                      {getCategoryDisplayName(category.name)}
                    </h2>
                    {isCatTreatsCategory(category.name) ? (
                      <p className="mt-2 text-sm font-medium text-[var(--text-subtle)]">
                        These treats are for cats, not food for people.
                      </p>
                    ) : null}
                  </div>
                  <p className="hidden shrink-0 text-sm font-semibold text-[var(--text-subtle)] sm:block">
                    {category.items.length}{" "}
                    {category.items.length === 1 ? "item" : "items"}
                  </p>
                </div>
                <span className="menu-cat-head__rule" aria-hidden="true" />
              </div>
              <div className="menu-grid mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {category.items.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    catalog={viewState.catalog}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
