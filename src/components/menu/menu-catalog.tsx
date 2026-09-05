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

  if (viewState.status === "loading") {
    return <MenuState state="loading" />;
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
        className="sticky top-[4.45rem] z-30 -mx-5 overflow-x-auto border-y border-[var(--border-soft)] bg-[var(--surface-canvas-translucent)] px-5 py-3 backdrop-blur-md sm:-mx-7 sm:px-7 lg:top-[5.1rem] lg:-mx-8 lg:px-8"
        aria-label="Menu categories"
      >
        <ul className="mx-auto flex w-max min-w-full max-w-[72rem] gap-2">
          {populatedCategories.map((category, index) => (
            <li key={category.id}>
              <a
                href={`#menu-category-${index + 1}`}
                className="inline-flex min-h-11 items-center whitespace-nowrap rounded-full border border-[var(--border-soft)] bg-[var(--surface-card)] px-4 py-2 text-sm font-bold text-[var(--text-strong)] transition-colors hover:border-[var(--accent-solid)] hover:bg-[var(--accent-soft)]"
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
            className="scroll-mt-40"
            aria-labelledby={`menu-category-heading-${index + 1}`}
          >
            <div className="flex items-end justify-between gap-5 border-b border-[var(--border-strong)] pb-4">
              <div>
                <p className="eyebrow">Current category</p>
                <h2
                  id={`menu-category-heading-${index + 1}`}
                  className="font-display mt-2 text-3xl font-semibold text-[var(--text-strong)] sm:text-4xl"
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
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              {category.items.map((item) => (
                <MenuItemCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
