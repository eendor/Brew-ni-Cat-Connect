import type { ReactNode } from "react";

type ContainerProps = Readonly<{
  children: ReactNode;
  className?: string;
}>;

export function Container({ children, className = "" }: ContainerProps) {
  return (
    <div
      className={`mx-auto w-full max-w-[72rem] px-5 sm:px-7 lg:px-8 ${className}`}
    >
      {children}
    </div>
  );
}
