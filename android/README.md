# Brew ni Cat Connect for Android

The customer Android app (FR-065 to FR-069). It is a **native Kotlin and
Jetpack Compose app** (ADR-036, which supersedes the Trusted Web Activity in
ADR-035). It uses the same backend as the website:

- **Menu, opening hours and closures:** Supabase REST with the website's public
  (publishable) key, under the same row-level security as the website.
- **Place order:** the website's `POST /api/orders`, so orders get the same rate
  limit, opening-hours check and server-side pricing. The app sends only the
  expected subtotal; the server prices every line.
- **Order tracking:** the `get_online_order` RPC with the order reference and
  its tracking token, polled while the order is open (or with the signed-in
  customer's bearer token from Order history).
- **Customer account & sign-in:** Google OAuth via Supabase PKCE (`S256`) opened
  in Chrome Custom Tabs (`androidx.browser.customtabs`), returning a one-time
  code to `com.brewnicat.connect://auth/callback`. Access and refresh tokens are
  encrypted on device with `AndroidKeyStore` AES-256-GCM (`KeystoreTokenCipher`)
  before saving to private app preferences.
- **Loyalty, favorites, profile, reviews & data requests:** Supabase REST/RPCs
  under the customer's RLS policies (`customer_profiles`, `online_orders`,
  `favorites`, `loyalty_transactions`, `loyalty_rewards`, `loyalty_settings`,
  `redeem_reward`, `reviews`, `my_review`, `data_requests`) and `POST /api/reviews`
  (works signed in or as a guest).

Package `com.brewnicat.connect`; Android 8.0 (API 26) and later; compiled
against and targeting API 36. It asks only for internet access and backs up
nothing. It holds no secret key.

## Layout

```
app/src/main/java/com/brewnicat/connect/
  data/   Menu (mapping), Pricing, Cart, Checkout, Orders, ShopHours, Auth,
          Account, Reorder, Api, Store
  ui/     BrewApp (navigation), AppViewModel, theme/, screens/
app/src/test/  JVM unit tests for the data, auth and account layers
app/src/debug/ debug-only network config for the local mock backend
tools/mock_backend.py  stand-in backend for checkout, OAuth, loyalty, reviews
```

## Build

Requirements: JDK 21, the Android SDK with platform 36 and build-tools 35.

The Supabase address and publishable key are **not committed**. Gradle reads
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from the
environment, then Gradle properties, then the website's `.env.local` one folder
up. Without them the app builds and shows that the menu can't load (CI builds it
this way).

```bash
cd android
./gradlew testDebugUnitTest assembleRelease lintRelease
```

Without a release key the APK in `app/build/outputs/apk/release/` is unsigned.
To sign it, create a properties file outside the repository and point
`BNC_ANDROID_KEYSTORE_PROPERTIES` at it:

```properties
storeFile=/absolute/path/to/connect-release.jks
storePassword=...
keyAlias=connect
keyPassword=...
```

```bash
BNC_ANDROID_KEYSTORE_PROPERTIES=~/.config/brew-ni-cat/android/keystore.properties \
  ./gradlew assembleRelease
```

**Back up the key and its passwords.** Every update must be signed with the same
key, or phones refuse to install it over the old app. Never commit the key.

## Trying checkout without the live shop

`tools/mock_backend.py` forwards menu reads to the real Supabase project but
answers Place order and order tracking itself, in memory. Orders move from
pending to completed, one step every `STEP_SECONDS`. Nothing is written to the
real database.

```bash
# from the repository root, with the public values in the environment
STEP_SECONDS=15 python3 android/tools/mock_backend.py 8787
# in android/, for the emulator (10.0.2.2 is the host computer)
BNC_DEBUG_BACKEND=http://10.0.2.2:8787 ./gradlew installDebug
```

Plain HTTP is allowed only in debug builds (`app/src/debug/`). Release builds
always use the live site over HTTPS.

## Order links

Order links from the website (`https://brew-ni-cat-connect.vercel.app/orders/BNC-…#token=…`)
open in the app once Android verifies `public/.well-known/assetlinks.json`,
which lists this package and the release key's SHA-256 fingerprint.

To change the key or add Google Play App Signing, add the new SHA-256 to
`sha256_cert_fingerprints` in `assetlinks.json`, keeping the existing one:

```bash
keytool -list -v -keystore connect-release.jks -alias connect | grep SHA256
```

## Release

1. Raise `versionCode` (and `versionName`) in `app/build.gradle.kts`.
2. Build the signed APK as above.
3. Check it: `apksigner verify --print-certs app/build/outputs/apk/release/app-release.apk`.
4. Attach it to the GitHub release as `BrewNiCatConnect.apk`.
