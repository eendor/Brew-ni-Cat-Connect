"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

type RevealProps = Readonly<{
  children: ReactNode;
  className?: string;
  /** Extra delay after the element enters the viewport (ms). */
  delayMs?: number;
  as?: "div" | "section" | "article" | "li";
}>;

function prefersReducedMotion(): boolean {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function canObserveIntersection(): boolean {
  return (
    typeof window !== "undefined" && typeof IntersectionObserver === "function"
  );
}

/**
 * Intersection-based fade-up. Initial `visible` is always false so SSR HTML
 * matches the first client render. Under prefers-reduced-motion, globals.css
 * forces opacity without needing a class flip. Missing IntersectionObserver
 * falls back via requestAnimationFrame after mount.
 */
export function Reveal({
  children,
  className = "",
  delayMs = 0,
  as: Tag = "div",
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || prefersReducedMotion()) {
      return;
    }

    if (!canObserveIntersection()) {
      const frame = requestAnimationFrame(() => {
        setVisible(true);
      });
      return () => cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.14, rootMargin: "0px 0px -6% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const style: CSSProperties | undefined =
    delayMs > 0 ? { transitionDelay: `${delayMs}ms` } : undefined;

  return (
    <Tag
      ref={ref as never}
      className={`reveal${visible ? " reveal--visible" : ""}${className ? ` ${className}` : ""}`}
      style={style}
    >
      {children}
    </Tag>
  );
}
