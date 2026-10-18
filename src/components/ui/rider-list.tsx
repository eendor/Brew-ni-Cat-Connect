import Image from "next/image";

import { ExternalLink } from "@/components/ui/external-link";
import { FacebookIcon } from "@/components/ui/icons";
import { siteConfig } from "@/config/site";

type RiderListProps = Readonly<{
  className?: string;
}>;

/**
 * The local delivery services a customer can message. Each card opens the
 * service's Facebook page; the rider orders at the shop and delivers.
 * The list sizes itself to its container: compact rows in narrow panels and
 * on phones, larger rows from 20rem, and three columns from 42rem.
 */
export function RiderList({ className = "" }: RiderListProps) {
  return (
    <div className={`@container ${className}`}>
      <ul
        aria-label="Rider delivery services"
        className="grid gap-3 @2xl:grid-cols-3"
      >
        {siteConfig.externalRiders.map((rider) => (
          <li key={rider.href}>
            <ExternalLink
              href={rider.href}
              className="surface-lift flex h-full min-h-11 items-center gap-3 rounded-2xl p-3 @xs:gap-4 @xs:p-4 @2xl:flex-col @2xl:items-start @2xl:gap-3"
            >
              <Image
                src={rider.logo}
                width={56}
                height={56}
                alt=""
                className="size-10 shrink-0 rounded-full bg-[var(--surface-raised)] object-cover ring-1 ring-[var(--border-soft)] @xs:size-14"
              />
              <span className="min-w-0">
                <span className="block font-extrabold leading-snug text-[var(--text-strong)]">
                  {rider.name}
                </span>{" "}
                <span className="mt-1 inline-flex items-center gap-1 whitespace-nowrap text-sm font-bold text-[var(--accent-strong)]">
                  <FacebookIcon className="size-3.5 shrink-0" />
                  Facebook page
                  <svg
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-3.5"
                    aria-hidden="true"
                  >
                    <path d="M5 11 11 5M6 5h5v5" />
                  </svg>
                </span>
              </span>
            </ExternalLink>
          </li>
        ))}
      </ul>
    </div>
  );
}
