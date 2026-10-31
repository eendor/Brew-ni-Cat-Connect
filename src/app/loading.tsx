import { Container } from "@/components/ui/container";

export default function Loading() {
  return (
    <Container className="flex min-h-[45vh] items-center justify-center py-16">
      <div
        className="flex items-center gap-3 rounded-full border border-[var(--glass-stroke)] bg-[var(--glass-fill-strong)] px-5 py-3 text-sm font-semibold text-[var(--text-muted)] shadow-[var(--glass-rim),var(--glass-shadow)]"
        role="status"
        aria-live="polite"
      >
        <span
          className="size-3 animate-pulse rounded-full bg-[var(--accent-fill)]"
          aria-hidden="true"
        />
        Loading Brew ni Cat…
      </div>
    </Container>
  );
}
