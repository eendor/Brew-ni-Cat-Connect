"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";

import { fetchPublicMenu } from "@/lib/menu/fetch-public-menu";
import { isCatTreatsCategory } from "@/lib/menu/map-menu-catalog";
import type { MenuCatalog as MenuCatalogModel } from "@/types/menu";
import { glowForCategory, publishMenuGlow } from "./category-glow";
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

function getCategoryDisplayName(name: string) {
  return isCatTreatsCategory(name) ? `${name} (For Cats)` : name;
}

function prefersMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Rim-light sheen follows the pointer across a card (fine pointers only). */
function trackSheen(event: PointerEvent<HTMLElement>) {
  if (event.pointerType !== "mouse") return;
  const card = (event.target as HTMLElement).closest<HTMLElement>(".menu-card");
  if (!card) return;
  const r = card.getBoundingClientRect();
  card.style.setProperty("--mx", `${Math.round(event.clientX - r.left)}px`);
  card.style.setProperty("--my", `${Math.round(event.clientY - r.top)}px`);
}

export function MenuCatalog({ loadMenu = fetchPublicMenu }: MenuCatalogProps) {
  const [viewState, setViewState] = useState<ViewState>({ status: "loading" });
  const [requestVersion, setRequestVersion] = useState(0);
  const [activeCategory, setActiveCategory] = useState(0);

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

  // Scroll-spy: highlight the category tab whose section is in view.
  useEffect(() => {
    if (
      viewState.status !== "ready" ||
      typeof IntersectionObserver !== "function"
    ) {
      return;
    }
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-menu-category]"),
    );
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveCategory(
              Number(entry.target.getAttribute("data-menu-category")),
            );
          }
        }
      },
      { rootMargin: "-35% 0px -55% 0px" },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [viewState]);

  // The category in view sets the page glow (hero rim lights, glow field).
  useEffect(() => {
    if (viewState.status !== "ready") return;
    const category = viewState.catalog.categories.filter(
      (entry) => entry.items.length > 0,
    )[activeCategory];
    if (category) publishMenuGlow(glowForCategory(category.name));
  }, [viewState, activeCategory]);

  // Cinematic entrances: each category heading and the cards fly in with a
  // depth stagger the first time they enter the view. Reduced motion and
  // browsers without IntersectionObserver keep everything static.
  const rootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (
      viewState.status !== "ready" ||
      typeof IntersectionObserver !== "function" ||
      !prefersMotion()
    ) {
      return;
    }
    const root = rootRef.current;
    root?.classList.add("menu-cine");
    const reveal = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.in = "true";
          reveal.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
    );
    document
      .querySelectorAll<HTMLElement>(".menu-grid")
      .forEach((grid) =>
        Array.from(grid.children).forEach((card, i) =>
          (card as HTMLElement).style.setProperty("--i", String(i % 4)),
        ),
      );
    document
      .querySelectorAll<HTMLElement>(".menu-cat-head, .menu-grid > .menu-card")
      .forEach((el) => reveal.observe(el));
    return () => {
      reveal.disconnect();
      root?.classList.remove("menu-cine");
    };
  }, [viewState]);

  // Keep the active tab visible inside the horizontally scrolling tab bar
  // without moving the page itself.
  useEffect(() => {
    const bar = document.querySelector<HTMLElement>(".menu-tabs");
    const tab = bar?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!bar || !tab || typeof bar.scrollTo !== "function") {
      return;
    }
    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    bar.scrollTo({
      left: tab.offsetLeft - (bar.clientWidth - tab.offsetWidth) / 2,
      behavior: reduce ? "auto" : "smooth",
    });
  }, [activeCategory]);

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
    <div ref={rootRef} onPointerMove={trackSheen}>
      <nav
        className="menu-tabs sticky top-[4.5rem] z-30 menu-tabs--bleed overflow-x-auto border-y border-[var(--border-soft)] bg-[var(--surface-canvas-translucent)] py-3 backdrop-blur-md lg:top-[5rem]"
        aria-label="Menu categories"
      >
        <ul className="flex w-max min-w-full gap-2">
          {populatedCategories.map((category, index) => (
            <li key={category.id}>
              <a
                href={`#menu-category-${index + 1}`}
                aria-current={activeCategory === index ? "true" : undefined}
                className="menu-tab nav-link inline-flex min-h-11 items-center whitespace-nowrap rounded-full border border-[var(--border-soft)] bg-[var(--surface-card)] px-4 py-2 text-sm font-bold text-[var(--text-strong)] hover:border-[var(--accent-solid)] hover:bg-[var(--accent-soft)]"
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
                {category.items.map((item, itemIndex) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    catalog={viewState.catalog}
                    wide={
                      category.items.length % 2 === 1 &&
                      itemIndex === category.items.length - 1
                    }
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
