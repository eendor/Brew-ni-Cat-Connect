import Link from "next/link";

type MenuStateProps = Readonly<{
  state: "loading" | "empty" | "error";
  onRetry?: () => void;
}>;

const content = {
  loading: {
    eyebrow: "Fetching current menu",
    title: "Brewing up the latest choices…",
    description: "We’re checking Brew ni Cat’s current catalog.",
  },
  empty: {
    eyebrow: "Menu update in progress",
    title: "The public menu is not available right now.",
    description:
      "Please check Facebook or contact the shop for today’s choices and prices.",
  },
  error: {
    eyebrow: "Temporary interruption",
    title: "We couldn’t retrieve the current menu.",
    description:
      "Try again in a moment, or contact Brew ni Cat for current choices and prices.",
  },
} as const;

export function MenuState({ state, onRetry }: MenuStateProps) {
  const stateContent = content[state];

  return (
    <div
      className="mx-auto max-w-2xl rounded-[2rem] border border-[var(--border-soft)] bg-[var(--surface-card)] p-7 text-center shadow-[var(--shadow-subtle)] sm:p-10"
      role={
        state === "loading" ? "status" : state === "error" ? "alert" : "status"
      }
      aria-live="polite"
    >
      {state === "loading" ? (
        <span
          className="mx-auto block size-10 animate-pulse rounded-full border-4 border-[var(--accent-soft)] border-t-[var(--accent-solid)]"
          aria-hidden="true"
        />
      ) : (
        <span
          className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-[var(--accent-soft)] text-2xl"
          aria-hidden="true"
        >
          {state === "error" ? "!" : "☕"}
        </span>
      )}
      <p className="eyebrow mt-5">{stateContent.eyebrow}</p>
      <h2 className="font-display mt-3 text-3xl font-semibold text-[var(--text-strong)]">
        {stateContent.title}
      </h2>
      <p className="mt-4 leading-7 text-[var(--text-muted)]">
        {stateContent.description}
      </p>
      <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
        {state === "error" && onRetry ? (
          <button type="button" onClick={onRetry} className="button-primary">
            Try again
          </button>
        ) : null}
        {state !== "loading" ? (
          <Link href="/contact" className="button-secondary">
            Contact the shop
          </Link>
        ) : null}
      </div>
    </div>
  );
}
