# Brew ni Cat Connect for Android

The customer Android app (FR-065 to FR-069). It is a **Trusted Web Activity**
(ADR-035): a small Android app that opens the live website,
`https://brew-ni-cat-connect.vercel.app/`, full screen in the phone's browser
engine, with no address bar. Every screen, every rule and every price comes
from the website and its backend, so the app and the site can never disagree.

- Package: `com.brewnicat.connect`
- Android 7.0 (API 24) and later; built against API 36, targets API 36
- Needs Chrome, or another browser that supports Trusted Web Activities. Without one, the site opens in a Custom Tab.
- Holds no backend key and keeps no session of its own. Sign-in stays in the browser's storage.

## How the full-screen check works

The app and the site prove they belong together with Digital Asset Links:

1. The app declares the site in `asset_statements` (set in `app/build.gradle.kts`).
2. The site serves `public/.well-known/assetlinks.json` with this package name and the SHA-256 fingerprint of the key that signs the app.

If the fingerprint doesn't match the key that signed the installed APK, the app
still works, but Chrome shows an address bar at the top.

## Build

Requirements: JDK 21, the Android SDK with platform 36 and build-tools 35.

```bash
cd android
./gradlew assembleRelease lintRelease
```

Without a release key the APK in `app/build/outputs/apk/release/` is unsigned
(CI builds it this way). To sign it, create a properties file outside the
repository and point `BNC_ANDROID_KEYSTORE_PROPERTIES` at it:

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

## Changing the signing key or adding Google Play

Print the key's SHA-256 fingerprint and add it to `sha256_cert_fingerprints` in
`public/.well-known/assetlinks.json`:

```bash
keytool -list -v -keystore connect-release.jks -alias connect | grep SHA256
```

If the app is published on Google Play with Play App Signing, Play re-signs it
with its own key. Add the "App signing key certificate" SHA-256 from the Play
Console to the same list, keeping the existing one for the GitHub APK.

## Release

1. Raise `versionCode` (and `versionName`) in `app/build.gradle.kts`.
2. Build the signed APK as above.
3. Check it: `apksigner verify --print-certs app/build/outputs/apk/release/app-release.apk`.
4. Attach it to the GitHub release as `BrewNiCatConnect.apk`.
