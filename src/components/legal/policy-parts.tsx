import type { ReactNode } from "react";

/** A linkable section of a policy page (privacy, terms). */
export function PolicySection({
  id,
  title,
  children,
}: Readonly<{ id: string; title: string; children: ReactNode }>) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-28">
      <h2
        id={`${id}-heading`}
        className="font-display text-3xl text-balance text-[var(--text-strong)] sm:text-4xl"
      >
        {title}
      </h2>
      <div className="mt-4 grid gap-4 text-base leading-7 text-[var(--text-muted)]">
        {children}
      </div>
    </section>
  );
}

export function List({ children }: Readonly<{ children: ReactNode }>) {
  return <ul className="grid list-disc gap-2 pl-5">{children}</ul>;
}

export function Term({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <strong className="font-semibold text-[var(--text-strong)]">
      {children}
    </strong>
  );
}
