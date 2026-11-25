import type { Metadata } from "next";
import Link from "next/link";

import { List, PolicySection, Term } from "@/components/legal/policy-parts";
import { Container } from "@/components/ui/container";
import { ExternalLink } from "@/components/ui/external-link";
import { FacebookIcon, MailIcon, PhoneIcon } from "@/components/ui/icons";
import { PageIntro } from "@/components/ui/page-intro";
import { PRIVACY_POLICY_PATH } from "@/config/privacy";
import { siteConfig } from "@/config/site";
import { TERMS_UPDATED } from "@/config/terms";
import { emailHref, formatDate, phoneHref } from "@/lib/site-content/format";
import { getSiteContent } from "@/lib/site-content/load";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: `The rules for ordering, coins, rewards, games and reviews on ${siteConfig.productName}.`,
};

const linkClass =
  "font-semibold text-[var(--accent-solid)] underline underline-offset-4";

const contactLinkClass =
  "inline-flex min-h-11 items-center gap-2 rounded-sm font-semibold text-[var(--accent-solid)] underline-offset-4 hover:underline";

export default async function TermsPage() {
  const { address, contact, social } = await getSiteContent();

  return (
    <>
      <PageIntro
        eyebrow="The rules"
        title="Terms of Use"
        description={
          <p>
            How ordering, coins, rewards, games and reviews work on{" "}
            {siteConfig.productName}, in plain words.
          </p>
        }
      />

      <Container className="pb-16 sm:pb-20 lg:pb-24">
        <div className="max-w-3xl">
          <p className="text-sm text-[var(--text-subtle)]">
            Last updated{" "}
            <time dateTime={TERMS_UPDATED}>{formatDate(TERMS_UPDATED)}</time>
          </p>

          <div className="mt-10 grid gap-12">
            <PolicySection id="about-these-terms" title="About these terms">
              <p>
                {siteConfig.productName} is the website, Android app and
                Facebook Messenger assistant of {siteConfig.name} in{" "}
                {address.area}, {address.town}. By using them you agree to these
                terms. How we handle your details is explained in our{" "}
                <Link href={PRIVACY_POLICY_PATH} className={linkClass}>
                  Privacy Policy
                </Link>
                .
              </p>
            </PolicySection>

            <PolicySection id="orders" title="Orders and payment">
              <List>
                <li>
                  <Term>Pickup orders.</Term> You can order ahead on the
                  website, in the app or in Messenger. An order is ready only
                  after the shop accepts and prepares it; you can follow it on
                  your order page. The shop may refuse an order, for example
                  when an item has run out.
                </li>
                <li>
                  <Term>Prices.</Term> When you tap Place order, our server
                  checks every item against the current menu and its prices. The
                  order uses those prices, not ones saved earlier in your
                  browser.
                </li>
                <li>
                  <Term>Payment.</Term> The website and the app don&apos;t take
                  payments. You pay the shop with the method you chose at
                  checkout (cash or GCash).
                </li>
                <li>
                  <Term>Rider delivery.</Term> Checkout only makes an order
                  summary. You send it yourself to the shop or to a rider, and
                  the delivery is arranged between you and them.
                </li>
                <li>
                  <Term>Changes.</Term> To change or cancel an order, contact
                  the shop using the details below.
                </li>
              </List>
            </PolicySection>

            <PolicySection id="your-account" title="Your account">
              <p>
                Give your own name and mobile number, and keep your password to
                yourself. You can change your details on your{" "}
                <Link href="/account/profile" className={linkClass}>
                  profile page
                </Link>{" "}
                or ask us to delete your account, as the Privacy Policy
                explains.
              </p>
            </PolicySection>

            <PolicySection id="points-and-rewards" title="Coins and rewards">
              <List>
                <li>
                  <Term>Earning and limits.</Term> You earn coins on completed
                  orders and from the cat games, counted to 0.1 of a coin, and
                  redeem rewards or spend them at checkout. You can&apos;t buy
                  coins, and they have no cash value. How many you earn, and how
                  many rewards you can redeem each week, follow the rules shown
                  on the{" "}
                  <Link href="/account/rewards" className={linkClass}>
                    rewards page
                  </Link>
                  . A reward can sell out or reach its limit for the day.
                </li>
                <li>
                  <Term>Spending at checkout.</Term> Each coin takes ₱1 off an
                  order, in steps of 0.1 of a coin, up to 20% of the
                  order&apos;s subtotal.
                </li>
                <li>
                  <Term>Codes.</Term> Each redeemed reward and each won prize
                  gets a one-time code. Show it at the counter, where staff
                  check it. A code works once; a reward code expires 30 days
                  after you redeem it and a prize code 7 days after you win it.
                </li>
              </List>
            </PolicySection>

            <PolicySection id="games-and-ads" title="Mini-games and ads">
              <List>
                <li>
                  {/* The odds and limits are set in private.mini_game_settings()
                  (supabase/migrations/20261119130000_coins.sql): change both
                  together, with the date above. */}
                  <Term>Games.</Term> The games are free, and you can play as
                  often as you like. Our server decides every result, with these
                  odds: in Cat cups, Oreo is under one of three cups, so a pick
                  has a 1 in 3 chance of winning 0.2 coins, and a miss earns
                  0.1; in Lucky paw, a shake gives 0.1 coins (60 in 100) or 0.2
                  coins (40 in 100). Games earn up to 2 coins a day (Philippine
                  time); after that, a play is just for fun. Your first 3 plays
                  each day can also win one of the shop&apos;s prizes, and the
                  games page shows each prize&apos;s chance. Don&apos;t use
                  tricks, scripts or extra accounts to get more plays or prizes.
                </li>
                <li>
                  <Term>Ads.</Term> An ad shows only after you tap Show ads, and
                  it is labeled &ldquo;Ad&rdquo;. Tapping it opens the
                  advertiser&apos;s page, which we don&apos;t control.
                </li>
              </List>
            </PolicySection>

            <PolicySection id="reviews" title="Reviews">
              <p>
                Write about your own visit, keep it respectful, and don&apos;t
                post anyone&apos;s personal details. The shop may hide a review
                that breaks these rules.
              </p>
            </PolicySection>

            <PolicySection id="contact-us" title="Contact us">
              <p>Questions about these terms or your orders go to the shop:</p>
              <ul className="grid gap-1">
                <li>
                  <a
                    href={phoneHref(contact.phone)}
                    className={contactLinkClass}
                  >
                    <PhoneIcon className="size-4 shrink-0" />
                    {contact.phone}
                  </a>
                </li>
                <li>
                  <a
                    href={emailHref(contact.email)}
                    className={contactLinkClass}
                  >
                    <MailIcon className="size-4 shrink-0" />
                    <span className="min-w-0 break-all">{contact.email}</span>
                  </a>
                </li>
                {social.facebook ? (
                  <li>
                    <ExternalLink
                      href={social.facebook}
                      className={contactLinkClass}
                    >
                      <FacebookIcon className="size-4 shrink-0" />
                      Facebook Page
                    </ExternalLink>
                  </li>
                ) : null}
              </ul>
            </PolicySection>

            <PolicySection id="changes" title="Changes to these terms">
              <p>
                When we change these terms, we update the date at the top of
                this page.
              </p>
            </PolicySection>
          </div>
        </div>
      </Container>
    </>
  );
}
