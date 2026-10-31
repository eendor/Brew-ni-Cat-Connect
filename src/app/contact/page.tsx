import type { Metadata } from "next";

import { VisitStage } from "@/components/three/visit-stage";
import { visitFacts } from "@/components/three/visit-facts";
import { Container } from "@/components/ui/container";
import { ExternalLink } from "@/components/ui/external-link";
import {
  ClockIcon,
  FacebookIcon,
  HouseIcon,
  ImagesIcon,
  MailIcon,
  MapPinIcon,
  MessageCircleIcon,
  NavigationIcon,
  PackageIcon,
  PhoneIcon,
  StoreIcon,
  TikTokIcon,
  WalletIcon,
} from "@/components/ui/icons";
import { PageIntro } from "@/components/ui/page-intro";
import { Reveal } from "@/components/ui/reveal";
import { RiderList } from "@/components/ui/rider-list";
import { siteConfig } from "@/config/site";
import { getMenuFacts } from "@/lib/menu/load-menu-facts";
import {
  emailHref,
  hoursSentence,
  localityLine,
  midSentence,
  phoneHref,
  sentenceStart,
  streetLine,
  takeoutBoxText,
} from "@/lib/site-content/format";
import { getSiteContent } from "@/lib/site-content/load";

export async function generateMetadata(): Promise<Metadata> {
  const { address } = await getSiteContent();
  const landmark = address.landmark ? `, ${midSentence(address.landmark)}` : "";
  return {
    title: "Contact and Location",
    description: `Find ${siteConfig.name} on ${address.street} in ${address.area}, ${address.town}${landmark}, and view current contact details.`,
  };
}

// Amber marks beside facts; icons inside links and buttons keep the
// link's own color instead.
const factIconClass = "shrink-0 text-[var(--accent-strong)]";

export default async function ContactPage() {
  const [content, menu] = await Promise.all([getSiteContent(), getMenuFacts()]);
  const { address, contact, hours, social } = content;
  const takeoutBox = takeoutBoxText(menu.takeoutBoxPrice);
  const contactCards = [
    {
      label: "Call or text",
      value: contact.phone,
      href: phoneHref(contact.phone),
      icon: <PhoneIcon className="size-4 shrink-0" />,
    },
    {
      label: "Email",
      value: contact.email,
      href: emailHref(contact.email),
      icon: <MailIcon className="size-4 shrink-0" />,
    },
  ];
  const socialLinks = [
    { href: social.facebook, label: "Facebook page", Icon: FacebookIcon },
    { href: social.facebookPhotos, label: "Facebook photos", Icon: ImagesIcon },
    { href: social.tiktok, label: "TikTok", Icon: TikTokIcon },
  ].filter((link) => link.href);

  return (
    <>
      <PageIntro
        mood="contact"
        eyebrow="Plan your visit"
        title="Contact & location"
        description={
          <p>
            Find {siteConfig.shortName} on {address.street} in {address.area},{" "}
            {address.town}, and get in touch before your visit.
          </p>
        }
      />

      <section
        className="py-16 sm:py-20 lg:py-24"
        aria-labelledby="location-heading"
      >
        <Container className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center">
          <div>
            <p className="eyebrow" data-rise="">
              Where to find us
            </p>
            <h2
              data-split=""
              id="location-heading"
              className="font-display mt-3 text-4xl text-[var(--text-strong)] sm:text-5xl"
            >
              Find us on {address.street}
            </h2>
            <address
              className="mt-6 flex gap-3 text-lg leading-8 text-[var(--text-muted)] not-italic"
              data-rise=""
            >
              <MapPinIcon className={`mt-1.5 size-5 ${factIconClass}`} />
              <span>
                <strong className="text-[var(--text-strong)]">
                  {siteConfig.name}
                </strong>
                <br />
                {streetLine(address)}
                <br />
                {localityLine(address)}
                <br />
                {address.country}
                {address.landmark ? (
                  <>
                    <br />
                    <strong className="mt-2 inline-block text-[var(--accent-solid)]">
                      {address.landmark}
                    </strong>
                  </>
                ) : null}
              </span>
            </address>
            <div data-rise="">
              <p className="mt-8 flex gap-3 text-lg font-semibold text-[var(--text-strong)]">
                <ClockIcon className={`mt-1 size-5 ${factIconClass}`} />
                <span>{hoursSentence(hours, " – ")}</span>
              </p>
              {hours.note ? (
                <p className="mt-2 pl-8 text-sm leading-6 text-[var(--text-muted)]">
                  {hours.note}
                </p>
              ) : null}
            </div>
            <div className="mt-8" data-rise="">
              <ExternalLink
                href={address.mapUrl}
                className="button-primary"
                data-magnetic=""
              >
                <NavigationIcon className="size-4.5 shrink-0" />
                Get directions
              </ExternalLink>
            </div>
          </div>
          <VisitStage facts={visitFacts(hours, address)} />
        </Container>
      </section>

      <section
        className="border-y border-[var(--separator)] bg-[var(--surface-accent)] py-16 sm:py-20"
        aria-labelledby="contact-heading"
      >
        <Container>
          <Reveal className="max-w-2xl">
            <p className="eyebrow">Get in touch</p>
            <h2
              data-split=""
              id="contact-heading"
              className="font-display mt-3 text-4xl text-[var(--text-strong)] sm:text-5xl"
            >
              Contact Brew ni Cat directly.
            </h2>
          </Reveal>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {contactCards.map((contact, index) => (
              <Reveal key={contact.label} delayMs={index * 90}>
                <a
                  href={contact.href}
                  className="surface-lift block h-full rounded-[var(--shape-xl)] p-6"
                >
                  <span className="eyebrow flex items-center gap-2">
                    {contact.icon}
                    {contact.label}
                  </span>
                  <span className="mt-3 block text-lg font-semibold wrap-anywhere text-[var(--accent-solid)] sm:text-xl">
                    {contact.value}
                  </span>
                </a>
              </Reveal>
            ))}
          </div>

          {socialLinks.length > 0 ? (
            <Reveal delayMs={120} className="ios-card mt-8 p-6 sm:p-8">
              <h3 className="font-display text-2xl text-[var(--text-strong)]">
                Follow {siteConfig.shortName}
              </h3>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                {socialLinks.map(({ href, label, Icon }) => (
                  <ExternalLink
                    key={label}
                    href={href}
                    className="button-secondary"
                  >
                    <Icon className="size-4.5 shrink-0" />
                    {label}
                  </ExternalLink>
                ))}
              </div>
            </Reveal>
          ) : null}
        </Container>
      </section>

      <section
        className="py-16 sm:py-20 lg:py-24"
        aria-labelledby="visit-details-heading"
      >
        <Container>
          <div className="grid gap-6 lg:grid-cols-3">
            <Reveal className="ios-card p-7">
              <p className="eyebrow">At the shop</p>
              <h2
                data-split=""
                id="visit-details-heading"
                className="font-display mt-3 text-3xl text-[var(--text-strong)]"
              >
                Payment & takeout
              </h2>
              <dl className="mt-6 grid gap-4">
                <div>
                  <dt className="flex items-center gap-2 text-sm font-semibold text-[var(--text-subtle)]">
                    <WalletIcon className={`size-4 ${factIconClass}`} />
                    Payment methods
                  </dt>
                  <dd className="mt-1 text-lg font-semibold text-[var(--text-strong)]">
                    {content.payments.methods.join(" · ")}
                  </dd>
                </div>
                <div>
                  <dt className="flex items-center gap-2 text-sm font-semibold text-[var(--text-subtle)]">
                    <PackageIcon className={`size-4 ${factIconClass}`} />
                    Takeout packaging
                  </dt>
                  <dd className="mt-1 text-lg font-semibold text-[var(--text-strong)]">
                    {sentenceStart(takeoutBox)}
                  </dd>
                </div>
              </dl>
            </Reveal>

            <Reveal
              delayMs={100}
              className="ios-card @container p-7 lg:col-span-2"
            >
              <p className="eyebrow">Rider delivery</p>
              <h2
                data-split=""
                className="font-display mt-3 text-3xl text-[var(--text-strong)]"
              >
                Let a local rider order it for you.
              </h2>
              <ol className="mt-5 grid gap-3 text-[var(--text-muted)] @xl:grid-cols-3">
                <li className="ios-well p-4">
                  <MessageCircleIcon
                    className={`mb-3 size-6 ${factIconClass}`}
                  />
                  <strong className="block text-[var(--text-strong)]">
                    1. Message a rider
                  </strong>
                  Send your order to one of the riders below. Checkout can
                  prepare the order summary for you.
                </li>
                <li className="ios-well p-4">
                  <StoreIcon className={`mb-3 size-6 ${factIconClass}`} />
                  <strong className="block text-[var(--text-strong)]">
                    2. The rider orders
                  </strong>
                  The rider orders it at Brew ni Cat and picks it up.
                </li>
                <li className="ios-well p-4">
                  <HouseIcon className={`mb-3 size-6 ${factIconClass}`} />
                  <strong className="block text-[var(--text-strong)]">
                    3. Delivered to you
                  </strong>
                  The rider brings your order to your address.
                </li>
              </ol>
              <p className="mt-5 leading-7 text-[var(--text-muted)]">
                Delivery fee, timing and payment are agreed with your rider.
                Brew ni Cat doesn&apos;t book riders or charge rider fees, and
                the {takeoutBox} fee doesn&apos;t include any rider charge.
              </p>
              <RiderList className="mt-6" partners={content.riders.partners} />
            </Reveal>
          </div>
        </Container>
      </section>
    </>
  );
}
