import type { ReactNode } from "react";

type SectionHeadingProps = Readonly<{
  id?: string;
  eyebrow: string;
  title: string;
  description?: ReactNode;
  align?: "left" | "center";
}>;

export function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  align = "left",
}: SectionHeadingProps) {
  return (
    <div
      className={
        align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"
      }
    >
      <p className="eyebrow">{eyebrow}</p>
      <h2
        id={id}
        className="font-display mt-3 text-3xl font-semibold tracking-[-0.025em] text-balance text-[var(--text-strong)] sm:text-4xl lg:text-5xl"
      >
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-base leading-7 text-pretty text-[var(--text-muted)] sm:text-lg">
          {description}
        </p>
      ) : null}
    </div>
  );
}
