import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { Container } from "@/components/ui/container";
import { ExternalLink } from "@/components/ui/external-link";
import { FacebookIcon, MailIcon, PhoneIcon } from "@/components/ui/icons";
import { ScrollToHash } from "@/components/privacy/scroll-to-hash";
import { PageIntro } from "@/components/ui/page-intro";
import { PRIVACY_POLICY_UPDATED } from "@/config/privacy";
import { siteConfig } from "@/config/site";
import { emailHref, formatDate, phoneHref } from "@/lib/site-content/format";
import { getSiteContent } from "@/lib/site-content/load";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `What ${siteConfig.productName} collects, why, and how to ask ${siteConfig.name} to correct or delete it.`,
};

const contactLinkClass =
  "inline-flex min-h-11 items-center gap-2 rounded-sm font-semibold text-[var(--accent-solid)] underline-offset-4 hover:underline";

function PolicySection({
  id,
  title,
  children,
}: Readonly<{ id: string; title: string; children: ReactNode }>) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-28">
      <h2
        id={`${id}-heading`}
        className="font-display text-3xl text-balance text-[var(--text-strong)] sm:text-4xl"
      >
        {title}
      </h2>
      <div className="mt-4 grid gap-4 text-base leading-7 text-[var(--text-muted)]">
        {children}
      </div>
    </section>
  );
}

function List({ children }: Readonly<{ children: ReactNode }>) {
  return <ul className="grid list-disc gap-2 pl-5">{children}</ul>;
}

function Term({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <strong className="font-semibold text-[var(--text-strong)]">
      {children}
    </strong>
  );
}

export default async function PrivacyPage() {
  const { address, contact, social } = await getSiteContent();

  return (
    <>
      <PageIntro
        eyebrow="Your data"
        title="Privacy Policy"
        description={
          <p>
            What {siteConfig.productName} collects, why we need it, and how to
            ask us to show, correct or delete it.
          </p>
        }
      />

      <Container className="pb-16 sm:pb-20 lg:pb-24">
        <div className="max-w-3xl">
          <p className="text-sm text-[var(--text-subtle)]">
            Last updated{" "}
            <time dateTime={PRIVACY_POLICY_UPDATED}>
              {formatDate(PRIVACY_POLICY_UPDATED)}
            </time>
          </p>

          <div className="mt-10 grid gap-12">
            <PolicySection id="who-we-are" title="Who we are">
              <p>
                {siteConfig.productName} is the website and Facebook Messenger
                assistant of {siteConfig.name} in {address.area}, {address.town}
                . The shop decides how the details you give us are used, and you
                can reach it about your data through the contact details at the
                end of this page. We follow the Data Privacy Act of 2012
                (Republic Act No. 10173).
              </p>
            </PolicySection>

            <PolicySection id="what-we-collect" title="What we collect and why">
              <List>
                <li>
                  <Term>Browsing.</Term> You can use every public page without
                  an account. The site has no analytics or tracking cookies, and
                  its fonts and pictures come from our own site.
                </li>
                <li>
                  <Term>Your account.</Term> If you create one, we keep your
                  email address and a password. Supabase, our sign-in service,
                  stores the password only in scrambled (hashed) form, so we
                  never see it. We use your email to sign you in, to confirm the
                  address and to send a password reset link when you ask for
                  one.
                </li>
                <li>
                  <Term>Your profile.</Term> You can add your name and a
                  Philippine mobile number. Checkout fills them in for you so
                  you don&apos;t have to type them again.
                </li>
                <li>
                  <Term>Favorites.</Term> The menu items you save, so you can
                  find them again.
                </li>
                <li>
                  <Term>Pickup orders.</Term> When you place an order on the
                  site, we keep your name, mobile number, notes, payment
                  preference, the items, the total and each change of the
                  order&apos;s status. The shop uses them to prepare your order
                  and to contact you about it. If you are signed in, the order
                  is also linked to your account so you can see it in your
                  orders.
                </li>
                <li>
                  <Term>Your order link.</Term> It ends with a private code
                  after the # sign. Browsers don&apos;t send that part to our
                  server, and we keep only a scrambled copy of it, so only
                  someone with the full link can open the order. The order page
                  never shows your phone number.
                </li>
                <li>
                  <Term>Rider delivery.</Term> Checkout only makes a summary for
                  you to copy. The website doesn&apos;t send it anywhere; you
                  send it yourself to the shop or to a rider.
                </li>
                <li>
                  <Term>Our Messenger assistant.</Term> When you message our
                  Facebook Page, the assistant reads your message or the button
                  you tap so it can reply with our menu, hours, location, how to
                  order or the status of your orders. Asking questions and
                  looking at the menu saves nothing to our database, and its
                  logs hold only counts, never your name, Facebook ID or
                  message. To avoid repeating itself, it remembers recent chats
                  for at most 24 hours in the server&apos;s memory. Messages it
                  doesn&apos;t answer are left for our staff to read.
                </li>
                <li>
                  <Term>Orders placed in Messenger.</Term> If you order in the
                  chat, the assistant asks for your mobile number and reads the
                  name on your Messenger profile through Meta. We keep the same
                  details as for a website order: your name, mobile number, a
                  note that the order came from Messenger and when you will pick
                  it up, your payment preference, the items, the total and each
                  change of the order&apos;s status. We don&apos;t save your
                  Facebook ID. We keep only a scrambled code made from it, so
                  Order status can list the orders from your own chat without an
                  order link. The shop sees the order on its POS like any other
                  online order.
                </li>
                <li>
                  <Term>Order attempts.</Term> To stop floods of fake orders,
                  our server counts order attempts from each network (IP)
                  address for ten minutes. The count is kept in memory only and
                  is never saved.
                </li>
                <li>
                  <Term>Technical logs.</Term> Like every website, our host
                  receives the details your browser sends with each visit, such
                  as your IP address, the page and the time, and keeps them in
                  short-lived logs. When an order fails, our own log holds only
                  an error code, never your name, number or order link.
                </li>
              </List>
            </PolicySection>

            <PolicySection
              id="on-your-device"
              title="What stays on your device"
            >
              <p>
                The site keeps a few things in your browser so it works the way
                you left it. You can clear them at any time in your
                browser&apos;s settings.
              </p>
              <List>
                <li>
                  Your cart: the items and your pickup or delivery choice, never
                  your name or number.
                </li>
                <li>
                  The order summary you prepare at checkout, until you close the
                  tab.
                </li>
                <li>Your day or night theme choice.</li>
                <li>
                  Whether this device should show lighter 3D scenes, for up to 7
                  days.
                </li>
                <li>Your sign-in session, while you are signed in.</li>
                <li>
                  A copy of the offline page and the app icons, so the site can
                  still show a page when you lose your connection.
                </li>
              </List>
            </PolicySection>

            <PolicySection id="service-providers" title="Who helps us run it">
              <List>
                <li>
                  <Term>Supabase</Term> keeps our database and runs sign-in.
                </li>
                <li>
                  <Term>Vercel</Term> hosts the website and the Messenger
                  assistant.
                </li>
                <li>
                  <Term>Meta</Term> runs Facebook Messenger, where our chats
                  happen, and keeps those chats under its own privacy policy.
                </li>
                <li>
                  <Term>Google</Term> sends account emails, such as password
                  reset links, from the shop&apos;s email account.
                </li>
                <li>
                  <Term>Adsterra</Term> may show one ad in the mini-games,
                  labeled &ldquo;Ad&rdquo;. It loads only if you tap Show ads,
                  never on the menu, cart, checkout, order or account pages, and
                  it may use its own cookies inside the ad. We don&apos;t send
                  it your account, orders or contact details, and you can turn
                  ads off at any time.
                </li>
              </List>
              <p>We don&apos;t sell your data or share it for advertising.</p>
            </PolicySection>

            <PolicySection id="how-long" title="How long we keep it">
              <List>
                <li>
                  Your account, profile and favorites: until you delete them or
                  ask us to.
                </li>
                <li>
                  Orders: as part of the shop&apos;s sales records. When an
                  account is deleted, its past orders stay as guest orders with
                  no link to the account.
                </li>
                <li>
                  The checkout summary in your browser: until you close the tab,
                  and never more than 12 hours.
                </li>
                <li>
                  The Messenger assistant&apos;s memory: at most 24 hours.
                </li>
              </List>
            </PolicySection>

            <PolicySection id="your-rights" title="Your rights">
              <p>Under the Data Privacy Act of 2012, you have the right to:</p>
              <List>
                <li>be told how your data is used, as on this page;</li>
                <li>see the data we hold about you;</li>
                <li>have wrong or incomplete data corrected;</li>
                <li>object to its use, or have it blocked or deleted;</li>
                <li>get a copy of it in a form you can use;</li>
                <li>claim damages if it is misused; and</li>
                <li>file a complaint with the National Privacy Commission.</li>
              </List>
              <p>
                You can change your name and mobile number yourself on your{" "}
                <Link
                  href="/account/profile"
                  className="font-semibold text-[var(--accent-solid)] underline underline-offset-4"
                >
                  profile page
                </Link>
                . For anything else, contact us below.
              </p>
            </PolicySection>

            <PolicySection
              id="delete-your-data"
              title="How to delete your data"
            >
              <p>You can ask us to delete your data at any time:</p>
              <ol className="grid list-decimal gap-2 pl-5">
                <li>
                  Email or call us from the email address or mobile number on
                  your account, or message our Facebook Page, and say you want
                  your data deleted.
                </li>
                <li>
                  We may ask you to confirm from your account&apos;s email
                  address, so no one can delete someone else&apos;s data.
                </li>
                <li>
                  We delete your account, profile and favorites and tell you
                  when it is done. Past orders, which hold the name and number
                  given at checkout, stay in the shop&apos;s sales records with
                  no link to your account.
                </li>
              </ol>
              <p>
                Our Messenger assistant keeps no copy of your chat. To remove a
                conversation from your own Messenger, delete it there; Meta
                handles the copy it keeps. An order you placed in Messenger
                stays in the shop&apos;s sales records, like a website order.
              </p>
            </PolicySection>

            <PolicySection id="contact-us" title="Contact us">
              <p>Questions about this policy or your data go to the shop:</p>
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

            <PolicySection id="changes" title="Changes to this policy">
              <p>
                When we change this policy, we update the date at the top of
                this page.
              </p>
            </PolicySection>
          </div>
        </div>
      </Container>
      <ScrollToHash />
    </>
  );
}
