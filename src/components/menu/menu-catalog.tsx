"use client";

import { useEffect, useState } from "react";

import { fetchPublicMenu } from "@/lib/menu/fetch-public-menu";
import { isCatTreatsCategory } from "@/lib/menu/map-menu-catalog";
import type { MenuCatalog as MenuCatalogModel } from "@/types/menu";
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
    <div>
      <nav
        className="menu-tabs sticky top-[4.45rem] z-30 -mx-5 overflow-x-auto border-y border-[var(--border-soft)] bg-[var(--surface-canvas-translucent)] px-5 py-3 backdrop-blur-md sm:-mx-7 sm:px-7 lg:top-[5.1rem] lg:-mx-8 lg:px-8"
        aria-label="Menu categories"
      >
        <ul className="mx-auto flex w-max min-w-full max-w-[72rem] gap-2">
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
        {populatedCategories.map((category, index) => (
          <section
            key={category.id}
            id={`menu-category-${index + 1}`}
            data-menu-category={index}
            className="scroll-mt-40"
            aria-labelledby={`menu-category-heading-${index + 1}`}
          >
            <div className="flex items-end justify-between gap-5 border-b border-[var(--border-strong)] pb-4">
              <div>
                <h2
                  id={`menu-category-heading-${index + 1}`}
                  className="font-display text-3xl font-semibold text-[var(--text-strong)] sm:text-4xl"
                >
                  {getCategoryDisplayName(category.name)}
                </h2>
                {isCatTreatsCategory(category.name) ? (
                  <p className="mt-2 text-sm font-medium text-[var(--text-subtle)]">
                    These treats are for cats, not food for people.
                  </p>
                ) : null}
              </div>
              <p className="hidden text-sm font-semibold text-[var(--text-subtle)] sm:block">
                {category.items.length}{" "}
                {category.items.length === 1 ? "item" : "items"}
              </p>
            </div>
            <div className="menu-grid mt-6 grid gap-5 md:grid-cols-2">
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
        ))}
      </div>
    </div>
  );
}
