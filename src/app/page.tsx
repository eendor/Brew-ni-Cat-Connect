import Link from "next/link";

import { Container } from "@/components/ui/container";

const plannedExperiences = [
  {
    title: "Discover the shop",
    description:
      "Owner-approved story, gallery, location, and contact details will form the public business showcase.",
    phase: "Planned for Phase 2",
  },
  {
    title: "Browse the menu",
    description:
      "Verified products, categories, prices, and customizations will be introduced with the ordering experience.",
    phase: "Planned for Phase 3",
  },
  {
    title: "Stay connected",
    description:
      "Accounts, order tracking, loyalty, and additional customer channels remain part of the approved roadmap.",
    phase: "Planned for later phases",
  },
] as const;

export default function HomePage() {
  return (
    <>
      <section
        className="relative isolate overflow-hidden border-b border-[var(--border-soft)]"
        aria-labelledby="home-heading"
      >
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_20%,rgba(190,122,65,0.2),transparent_33%),linear-gradient(145deg,var(--surface-canvas),var(--surface-warm))]"
          aria-hidden="true"
        />
        <Container className="grid gap-12 py-16 sm:py-20 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)] lg:items-center lg:gap-16 lg:py-28">
          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-bold tracking-[0.16em] text-[var(--accent-strong)] uppercase">
              Customer website foundation
            </p>
            <h1
              id="home-heading"
              className="font-display text-5xl leading-[0.98] font-semibold tracking-[-0.035em] text-balance text-[var(--text-strong)] sm:text-6xl lg:text-7xl"
            >
              Brew ni Cat Connect
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-pretty text-[var(--text-muted)] sm:text-xl">
              A warm, accessible starting point for Brew ni Cat&apos;s future
              customer experience. Verified business content and ordering
              features will be added in their planned phases.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/menu"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--accent-solid)] px-6 py-3 text-base font-bold text-white shadow-[var(--shadow-button)] transition-[background-color,transform] hover:bg-[var(--accent-solid-hover)] active:translate-y-px"
              >
                View menu
              </Link>
              <Link
                href="/about"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-[var(--border-strong)] bg-white/60 px-6 py-3 text-base font-bold text-[var(--text-strong)] transition-colors hover:bg-white"
              >
                About this project
              </Link>
            </div>
          </div>

          <aside
            className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-[var(--surface-card)] p-7 shadow-[var(--shadow-card)] sm:p-9"
            aria-label="Current project status"
          >
            <div
              className="absolute -top-16 -right-12 size-40 rounded-full bg-[var(--accent-soft)] opacity-70 blur-2xl"
              aria-hidden="true"
            />
            <p className="relative text-xs font-bold tracking-[0.16em] text-[var(--accent-strong)] uppercase">
              Now in place
            </p>
            <h2 className="font-display relative mt-3 text-3xl font-semibold tracking-tight text-[var(--text-strong)]">
              A foundation built for every screen.
            </h2>
            <p className="relative mt-4 leading-7 text-[var(--text-muted)]">
              The shared layout, accessible navigation, responsive routes, and
              quality tooling are ready for the next reviewed milestone.
            </p>
            <dl className="relative mt-7 grid grid-cols-2 gap-3 border-t border-[var(--border-soft)] pt-6">
              <div>
                <dt className="text-xs font-bold tracking-wide text-[var(--text-subtle)] uppercase">
                  Experience
                </dt>
                <dd className="mt-1 font-semibold text-[var(--text-strong)]">
                  Mobile-first
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold tracking-wide text-[var(--text-subtle)] uppercase">
                  Ordering
                </dt>
                <dd className="mt-1 font-semibold text-[var(--text-strong)]">
                  Not yet active
                </dd>
              </div>
            </dl>
          </aside>
        </Container>
      </section>

      <section className="py-16 sm:py-20" aria-labelledby="roadmap-heading">
        <Container>
          <div className="max-w-2xl">
            <p className="text-sm font-bold tracking-[0.16em] text-[var(--accent-strong)] uppercase">
              Intentionally incremental
            </p>
            <h2
              id="roadmap-heading"
              className="font-display mt-3 text-3xl font-semibold tracking-tight text-balance text-[var(--text-strong)] sm:text-4xl"
            >
              A clear path from foundation to customer experience.
            </h2>
            <p className="mt-4 leading-7 text-[var(--text-muted)]">
              Each area below is planned, not presented as an implemented
              business feature.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {plannedExperiences.map((experience, index) => (
              <article
                key={experience.title}
                className="rounded-[1.5rem] border border-[var(--border-soft)] bg-[var(--surface-card)] p-6 shadow-[var(--shadow-subtle)]"
              >
                <span
                  className="inline-flex size-9 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-bold text-[var(--accent-strong)]"
                  aria-hidden="true"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-5 text-xl font-bold text-[var(--text-strong)]">
                  {experience.title}
                </h3>
                <p className="mt-3 leading-7 text-[var(--text-muted)]">
                  {experience.description}
                </p>
                <p className="mt-5 text-sm font-bold text-[var(--accent-strong)]">
                  {experience.phase}
                </p>
              </article>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
