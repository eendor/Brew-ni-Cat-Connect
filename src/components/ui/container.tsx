import type { HTMLAttributes, ReactNode } from "react";

type ContainerProps = Readonly<
  HTMLAttributes<HTMLDivElement> & {
    children: ReactNode;
    className?: string;
  }
>;

export function Container({
  children,
  className = "",
  ...rest
}: ContainerProps) {
  return (
    <div
      {...rest}
      className={`mx-auto w-full max-w-[var(--shell-width)] px-[var(--shell-pad)] ${className}`}
    >
      {children}
    </div>
  );
}
