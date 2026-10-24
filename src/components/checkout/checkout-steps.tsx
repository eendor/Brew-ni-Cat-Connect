const STEPS = [
  { id: "details", label: "Details" },
  { id: "review", label: "Review" },
  { id: "send", label: "Send" },
] as const;

type Props = { step: "details" | "review" | "send" };

export function CheckoutSteps({ step }: Props) {
  const currentIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <ol aria-label="Checkout steps" className="mb-6 flex items-center gap-2">
      {STEPS.map((s, index) => {
        const isDone = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <li
            key={s.id}
            aria-current={isCurrent ? "step" : undefined}
            className={`flex flex-1 items-center gap-2 text-sm ${
              isCurrent
                ? "font-bold text-[var(--text-strong)]"
                : "text-[var(--text-subtle)]"
            }`}
          >
            <span
              aria-hidden="true"
              className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs ${
                isCurrent
                  ? "bg-[var(--accent-solid)] text-[var(--on-accent)]"
                  : isDone
                    ? "bg-[var(--surface-accent)] text-[var(--accent-solid)]"
                    : "bg-[var(--surface-warm)]"
              }`}
            >
              {isDone ? "✓" : index + 1}
            </span>
            <span>{s.label}</span>
            {isDone && <span className="sr-only">(done)</span>}
          </li>
        );
      })}
    </ol>
  );
}