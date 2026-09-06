import { formatPrice, getLowestItemPrice } from "@/lib/menu/format-price";
import type { MenuItem } from "@/types/menu";

type MenuItemCardProps = Readonly<{
  item: MenuItem;
}>;

function getItemPrices(item: MenuItem): readonly (number | null)[] {
  return item.variants.flatMap((variant) => {
    const flavorPrices = variant.flavorPrices.map((entry) => entry.price);
    const basePrice =
      variant.basePrice === 0 && flavorPrices.length > 0
        ? []
        : [variant.basePrice];

    return [...basePrice, ...flavorPrices];
  });
}

export function MenuItemCard({ item }: MenuItemCardProps) {
  const lowestPrice = getLowestItemPrice(getItemPrices(item));
  const unavailable = item.availability === "unavailable";

  return (
    <article
      className={`rounded-[1.5rem] border bg-[var(--surface-card)] p-5 shadow-[var(--shadow-subtle)] sm:p-6 ${
        unavailable
          ? "border-[var(--border-strong)] opacity-75"
          : "border-[var(--border-soft)]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-2xl font-semibold leading-tight text-[var(--text-strong)]">
            {item.name}
          </h3>
          {item.availability !== "available" ? (
            <p className="mt-2 inline-flex rounded-full bg-[var(--notice-surface)] px-3 py-1 text-xs font-bold text-[var(--notice-text)]">
              {unavailable
                ? "Temporarily unavailable"
                : "Availability not confirmed"}
            </p>
          ) : null}
        </div>
        {lowestPrice !== null ? (
          <p className="shrink-0 text-right text-sm font-semibold text-[var(--text-muted)]">
            <span className="block text-xs tracking-wide uppercase">From</span>
            <span className="text-lg font-extrabold text-[var(--accent-strong)]">
              {formatPrice(lowestPrice)}
            </span>
          </p>
        ) : null}
      </div>

      {item.flavors.length > 0 ? (
        <div className="mt-5">
          <h4 className="text-xs font-extrabold tracking-[0.12em] text-[var(--text-subtle)] uppercase">
            Flavors
          </h4>
          <ul
            className="mt-2 flex flex-wrap gap-2"
            aria-label={`${item.name} flavors`}
          >
            {item.flavors.map((flavor) => (
              <li
                key={flavor}
                className="rounded-full bg-[var(--surface-warm)] px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)]"
              >
                {flavor}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {item.variants.length > 0 ? (
        <div className="mt-5 border-t border-[var(--border-soft)] pt-4">
          <h4 className="sr-only">Sizes, options, and prices</h4>
          <ul className="grid gap-3">
            {item.variants.map((variant) => (
              <li key={variant.id} className="text-sm">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-bold text-[var(--text-strong)]">
                    {variant.name}
                  </span>
                  {variant.basePrice !== null &&
                  !(
                    variant.basePrice === 0 && variant.flavorPrices.length > 0
                  ) ? (
                    <span className="shrink-0 font-extrabold text-[var(--accent-strong)]">
                      {formatPrice(variant.basePrice)}
                    </span>
                  ) : null}
                </div>
                {variant.description ? (
                  <p className="mt-1 leading-6 text-[var(--text-muted)]">
                    {variant.description}
                  </p>
                ) : null}
                {variant.flavorPrices.length > 0 ? (
                  <ul
                    className="mt-2 grid gap-1 border-l-2 border-[var(--accent-soft)] pl-3 text-[var(--text-muted)]"
                    aria-label={`${variant.name} flavor prices`}
                  >
                    {variant.flavorPrices.map((entry) => (
                      <li
                        key={entry.flavor}
                        className="flex justify-between gap-4"
                      >
                        <span>{entry.flavor}</span>
                        <span className="font-bold text-[var(--text-strong)]">
                          {formatPrice(entry.price)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-5 border-t border-[var(--border-soft)] pt-4 text-sm text-[var(--text-muted)]">
          Contact the shop for current price details.
        </p>
      )}
    </article>
  );
}
