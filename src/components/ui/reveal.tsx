import type { ReactNode } from "react";

type RevealProps = Readonly<{
  children: ReactNode;
  className?: string;
  /** Extra delay after the element enters the viewport (ms). */
  delayMs?: number;
  as?: "div" | "section" | "article" | "li";
}>;

/**
 * A block that rises into view when it reaches the viewport. The motion
 * director (src/components/motion) animates every `data-rise` element;
 * without motion the content is simply there.
 */
export function Reveal({
  children,
  className = "",
  delayMs = 0,
  as: Tag = "div",
}: RevealProps) {
  return (
    <Tag
      className={className || undefined}
      data-rise={delayMs > 0 ? String(delayMs) : ""}
    >
      {children}
    </Tag>
  );
}
