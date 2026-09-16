import type { AnchorHTMLAttributes, ReactNode } from "react";

type ExternalLinkProps = Readonly<{
  children: ReactNode;
}> &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "rel" | "target">;

export function ExternalLink({ children, ...anchorProps }: ExternalLinkProps) {
  return (
    <a {...anchorProps} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}
