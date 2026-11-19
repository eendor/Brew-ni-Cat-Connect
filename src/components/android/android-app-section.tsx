import Image from "next/image";

import { androidRelease, apkSizeLabel } from "@/config/android-app";
import { Container } from "@/components/ui/container";
import { DownloadIcon, SmartphoneIcon } from "@/components/ui/icons";
import { Reveal } from "@/components/ui/reveal";

const features = [
  ["Order ahead", "Pick from the full menu and pay when you pick it up."],
  ["Follow your order", "See when it's being made and when it's ready."],
  ["Coins and rewards", "Earn coins, redeem rewards and keep your codes."],
  ["Games while you wait", "Play the cat arcade while your order is made."],
] as const;

/**
 * Home page section for the Android app (FR-116). The APK is served by this
 * site, not an app store, so the note says what Android will ask the first
 * time.
 */
export function AndroidAppSection() {
  const release = androidRelease;
  return (
    <section
      className="border-y border-[var(--separator)] bg-[var(--surface-raised)] py-16 text-[var(--text-strong)] sm:py-20"
      aria-labelledby="android-app-heading"
    >
      <Container className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16">
        <Reveal>
          <p className="flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
            <SmartphoneIcon className="size-4 shrink-0" />
            Android app
          </p>
          <h2
            id="android-app-heading"
            className="font-display mt-3 text-4xl text-balance sm:text-5xl"
          >
            Brew ni Cat on your phone
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--text-muted)]">
            Order pickup, follow your order and collect coins in the Brew ni Cat
            app for Android.
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {features.map(([title, text]) => (
              <li key={title} className="glass-panel rounded-2xl p-4">
                <strong className="block text-base font-semibold">
                  {title}
                </strong>
                <span className="mt-1 block text-sm leading-6 text-[var(--text-muted)]">
                  {text}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href={release.url}
              download
              type="application/vnd.android.package-archive"
              className="button-primary"
              data-magnetic=""
            >
              <DownloadIcon className="size-5 shrink-0" />
              Download for Android
            </a>
            <span className="text-sm text-[var(--text-muted)]">
              Version {release.versionName} · {apkSizeLabel(release.size)} ·
              Android {release.minAndroid} or newer
            </span>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
            The app comes straight from this website. The first time, your phone
            may ask you to allow installs from your browser. After that, the app
            tells you when there&rsquo;s an update.
          </p>
        </Reveal>
        <Reveal delayMs={120} className="mx-auto w-full max-w-xs">
          <div className="glass-panel flex flex-col items-center gap-4 rounded-[2rem] p-8 text-center">
            <Image
              src="/icons/icon-512.png"
              width={160}
              height={160}
              alt=""
              className="size-32 rounded-[2rem] shadow-[var(--shadow-card)]"
            />
            <p className="font-display text-2xl">Brew ni Cat</p>
            <p className="text-sm text-[var(--text-muted)]">
              Free · No account needed to order
            </p>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
