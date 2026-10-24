"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";

type NavLinkProps = Readonly<
  Omit<ComponentProps<typeof Link>, "href"> & { href: string }
>;

/** Header link that marks the current section with aria-current="page". */
export function NavLink({ href, ...props }: NavLinkProps) {
  const pathname = usePathname();
  const current =
    pathname !== null &&
    (href === "/" ? pathname === "/" : pathname.startsWith(href));
  return (
    <Link href={href} aria-current={current ? "page" : undefined} {...props} />
  );
}
