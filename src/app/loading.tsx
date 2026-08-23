import { Container } from "@/components/ui/container";

export default function Loading() {
  return (
    <Container className="flex min-h-[45vh] items-center justify-center py-16">
      <div
        className="flex items-center gap-3 rounded-full border border-[var(--border-soft)] bg-[var(--surface-card)] px-5 py-3 text-sm font-semibold text-[var(--text-muted)] shadow-sm"
        role="status"
        aria-live="polite"
      >
        <span
          className="size-3 animate-pulse rounded-full bg-[var(--accent-solid)]"
          aria-hidden="true"
        />
        Loading Brew ni Cat Connect…
      </div>
    </Container>
  );
}
