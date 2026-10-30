import { Container } from "../ui/container";

/**
 * The owner's notice, such as a holiday closing, above every page while it
 * isn't empty (FR-085).
 */
export function SiteNotice({ text }: Readonly<{ text: string }>) {
  if (!text) return null;
  return (
    <aside
      aria-label="Shop notice"
      className="border-b border-[var(--notice-border)] bg-[var(--notice-surface)] text-[var(--notice-text)]"
    >
      <Container className="py-2.5 text-center text-sm leading-6 font-semibold">
        {text}
      </Container>
    </aside>
  );
}
