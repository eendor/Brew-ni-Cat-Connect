# Phase 8 Verification Evidence Register

Evidence for merged Phase 8 pull requests, in merge order. Test counts come from the pull request descriptions and CI; where a description gives no counts, the row shows the CI result. The case IDs are the rows each pull request added or changed in `docs/test-cases.md`.

| PR | Date | Change | Evidence | Result |
| --- | --- | --- | --- | --- |
| [#105](https://github.com/eendor/Brew-ni-Cat-Connect/pull/105) | 2026-11-09 | Installable web app with an offline page (FR-068, web part) | `tests/unit/manifest.test.ts`, `tests/unit/install-app-button.test.tsx`, `tests/unit/offline-page.test.tsx`, `tests/unit/service-worker-registration.test.tsx`, `tests/unit/site-footer.test.tsx`, `tests/e2e/pwa.spec.ts` (`TC-P8-001`–`TC-P8-021`) | Vitest 572/572 in 73 files; Playwright `chromium` 44 passed, 3 skipped; CI passed |
| [#146](https://github.com/eendor/Brew-ni-Cat-Connect/pull/146) | 2026-11-13 | Customer Android app (Trusted Web Activity, ADR-035) | `tests/unit/android-app.test.ts`, `tests/e2e/pwa.spec.ts`, Android release build + lint, Pixel 6 emulator (`TC-P8-022`–`TC-P8-027`) | CI passed (superseded 2026-11-14 by ADR-036) |
| [#150](https://github.com/eendor/Brew-ni-Cat-Connect/pull/150) | 2026-11-14 | Native Kotlin/Compose customer ordering app — phase 1 (ADR-036) | `android` JVM tests (32/32), `./gradlew assembleRelease lintRelease`, `tests/unit/android-app.test.ts`, `bnc_phone` emulator end-to-end (`TC-P8-028`–`TC-P8-030`) | All 8 CI checks passed |

## Related POS pull requests

None.

## Not merged yet

- Rodnee: native Android app phase 2 (`feat/p8-native-auth` — Google PKCE sign-in, Keystore token encryption, loyalty/rewards, order history & reorder, favorites, profile, reviews & data requests; `TC-P8-031`–`TC-P8-034`, `MAN-P8-009`), followed by phase 3 (mini-games & waiting/completed order ads). The v1.0.0 release with the APK is on hold until phase 3 is complete.
- Renier: Phase 8 integrated QA, branch `test/p8-integrated-qa-main` (a new section of `docs/test-cases.md`).
- Docs closeout references: PR #112 noted earlier for the TWA/web closeout table rows above.

## Release

The v1.0.0 release and its APK are Not published yet. Rodnee's release was due Fri Nov 13; update 2026-11-13: the date is not confirmed yet.
