import type { ReactNode } from "react";

type ContainerProps = Readonly<{
  children: ReactNode;
  className?: string;
}>;

export function Container({ children, className = "" }: ContainerProps) {
  return (
    <div
      className={`mx-auto w-full max-w-[var(--shell-width)] px-[var(--shell-pad)] ${className}`}
    >
      {children}
    </div>
  );
}
