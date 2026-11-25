# Google Play Release

**Last updated:** 2026-11-25

Customers install the Android app from the website today, and it updates itself from there (FR-117, ADR-038). This page covers putting the same app on Google Play (ADR-039): the Play build, signing, the Play Console answers, the store listing, and what to fix before the public release.

## 1. The Play Build

```bash
cd android
./gradlew bundleRelease -Pbnc.store=play
```

This writes `android/app/build/outputs/bundle/release/app-release.aab`, signed with the release key in `android/keystore.properties`, which is never committed. The build refuses to run without the Supabase settings, the same as the website APK.

The Play build differs from the website APK in three ways:

- **No website updater.** Google Play updates the app. In Account, the version row says "Updates come from Google Play" and opens the app's Play page (`BuildConfig.SELF_UPDATE` is false).
- **No install permission.** `android/app/src/play/AndroidManifest.xml` removes `REQUEST_INSTALL_PACKAGES`, which Play restricts.
- **No order-screen ads**, unless the build adds `-Pbnc.playAds=true`. A first review then doesn't include a third-party ad network. If ads are turned on, the Console's Ads answer must change to Yes.

The package name (`com.brewnicat.connect`) and the version are the same as the website APK. Each upload to Play needs a higher `versionCode` than the last one on Play.

Checked on 2026-11-25:

- The app targets API 36, which Play has required for new apps and updates since 2026-08-31.
- Its only native library (`libandroidx.graphics.path.so`, from Compose) is aligned to 16 KB pages.

## 2. Signing: Keep One Key

A phone with the website APK can install the Play version over it, keeping the customer signed in, only when both are signed with the same key. When the first release asks how to sign the app (Play App Signing), choose to export and upload the existing release key from its Java keystore. The Console gives the PEPK command and the encryption key for this. Don't let Google generate a new key: website installs would then have to uninstall first.

The upload key can stay the same keystore. Never commit the keystore, its passwords or the exported key.

## 3. The Account and the Closed Test

- The registration fee is US$25, paid once. Google verifies the developer's identity.
- A personal account made after 2023-11-13 can't publish to everyone until a **closed test** has had at least **12 testers opted in for 14 days in a row**. Plan the order:
  1. Upload the AAB to **Internal testing** first. It has no review wait, so it checks that the build installs from Play.
  2. Make a **Closed testing** track and add the testers' Gmail addresses. Send them the opt-in link, and have each one install the app from Play and keep it.
  3. After 14 days with 12 or more testers still opted in, use **Apply for production** on the Dashboard and answer the questions about the test.
- An organization account doesn't have the tester rule, but it needs the business's D-U-N-S number.

## 4. Store Listing

| Field             | Value                                                                                                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App name          | Brew ni Cat Connect                                                                                                                                                                                                                         |
| Short description | Order ahead from Brew ni Cat Coffee Shop, earn coins and play with the cats.                                                                                                                                                                |
| Category          | Food & Drink (an app, not a game)                                                                                                                                                                                                           |
| Contact email     | The shop's email, as on the [Privacy Policy](https://brew-ni-cat-connect.vercel.app/privacy#contact-us)                                                                                                                                     |
| Website           | <https://brew-ni-cat-connect.vercel.app>                                                                                                                                                                                                    |
| Privacy policy    | <https://brew-ni-cat-connect.vercel.app/privacy>                                                                                                                                                                                            |
| App icon          | [`play-store/icon-512.png`](play-store/icon-512.png), 512 × 512                                                                                                                                                                             |
| Feature graphic   | [`play-store/feature-graphic.png`](play-store/feature-graphic.png), 1024 × 500                                                                                                                                                              |
| Phone screenshots | 4 to 8 portrait screenshots of the Play build on a phone, at least 1080 px wide. Suggested: the menu, an item, the cart, an order being tracked, the rewards and a game. Take them with a test account, so no customer's name or number shows |

Full description:

```text
Brew ni Cat Connect is the ordering app of Brew ni Cat Coffee Shop in Kabacan, Cotabato.

• See the live menu, with prices and what's available today.
• Order ahead for pickup, and pay when you pick up your order.
• Follow your order's status live.
• Sign in with Google to earn coins on your orders, spend them at checkout and redeem rewards.
• Play quick games with the café cats while you wait.
• Save favorites, reorder past orders, and read or write shop reviews.

The shop's hours, notices and contact details come straight from the shop.
```

## 5. App Content Answers

| Console question                 | Answer                                                                                                                                                                                                                                                                                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Privacy policy                   | <https://brew-ni-cat-connect.vercel.app/privacy>                                                                                                                                                                                                                                                                                            |
| Ads                              | No, for the default Play build. Yes, if it is built with `-Pbnc.playAds=true`                                                                                                                                                                                                                                                               |
| App access                       | Some features need sign-in: "Tap Sign in with Google on the Account tab. Any Google account works, and no code is needed."                                                                                                                                                                                                                  |
| Target audience                  | 13 and over, not children. The app isn't made for children, so the Families policy doesn't apply                                                                                                                                                                                                                                           |
| Content rating                   | No violence, sexual content, bad language, drugs or real-money gambling. Users can interact: yes, because reviews are public. The games are free, take no bets, and pay loyalty coins with the odds in the Terms                                                                                                                            |
| Data safety: collected           | Personal info: name, email address, phone number, user ID. Financial info: purchase history (orders). App activity: in-app actions (game plays, favorites, coins), user-generated content (reviews). Messages: data requests sent in the app. All for app functionality and account management. Name and phone number are required to order; the email address, user ID and the rest only when the customer signs in (optional) |
| Data safety: shared              | None. Supabase stores the data for the shop as a service provider, which Play doesn't count as sharing                                                                                                                                                                                                                                      |
| Data safety: security            | Encrypted in transit: yes (HTTPS). Users can ask for deletion: yes                                                                                                                                                                                                                                                                          |
| Delete account URL               | <https://brew-ni-cat-connect.vercel.app/privacy#delete-your-data>. In the app: Account → Data requests → Deletion (signed in)                                                                                                                                                                                                                           |
| Government, financial, health    | None                                                                                                                                                                                                                                                                                                                                        |

The website APK isn't the same as the Play build: it has the updater and the ads, so its answers would differ. These answers are for the Play build only.

## 6. Before Applying for Production

- **Game odds (done on 2026-11-25).** The games pay coins, which take money off an order, and the results are random. Play allows chance-based rewards in the loyalty program of an app that isn't a game if the program's terms give the odds. Points that come with purchases must be earned and spent at a fixed rate, and rewards must stay secondary to purchases. Read the current policy before applying: rewards and prize codes that need no purchase may need a closer look. The Terms now give the odds of each game, the daily coin limit, the prize plays and the checkout rate (₱1 off a coin, up to 20% of the subtotal), and the app links to them from Account. If the odds change in `private.mini_game_settings()`, change the Terms the same day.
- **Reviews (to do).** Reviews are public text from customers. Play's user-generated content policy expects a way in the app to report a review, and a way for the shop to act on it. Today staff can hide a review only in the database (`reviews.hidden`). Add a Report button on reviews and a POS screen to hide them before applying.
- **Screenshots (to do).** Take them on a phone from the Play build, as in section 4.

## 7. Each Release

1. Raise `versionCode` and `versionName` in `android/app/build.gradle.kts`.
2. Build and publish the website APK as before (ADR-038).
3. Build the AAB with `-Pbnc.store=play`, upload it to the track, and add the release notes.

Both builds can use the same version. A website install then sees no new version on Play until the next release.

Sources checked on 2026-11-25: [target API level](https://developer.android.com/google/play/requirements/target-sdk), [testing requirements for new personal accounts](https://support.google.com/googleplay/android-developer/answer/14151465) and [real-money gambling, games and contests, including gamified loyalty programs](https://support.google.com/googleplay/android-developer/answer/9877032).
