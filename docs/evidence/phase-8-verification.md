# Phase 8 Verification Evidence Register

Evidence for merged Phase 8 pull requests, in merge order. Test counts come from the pull request descriptions and CI; where a description gives no counts, the row shows the CI result. The case IDs are the rows each pull request added or changed in `docs/test-cases.md`.

| PR | Date | Change | Evidence | Result |
| --- | --- | --- | --- | --- |
| [#105](https://github.com/eendor/Brew-ni-Cat-Connect/pull/105) | 2026-11-09 | Installable web app with an offline page (FR-068, web part) | `tests/unit/manifest.test.ts`, `tests/unit/install-app-button.test.tsx`, `tests/unit/offline-page.test.tsx`, `tests/unit/service-worker-registration.test.tsx`, `tests/unit/site-footer.test.tsx`, `tests/e2e/pwa.spec.ts` (`TC-P8-001`–`TC-P8-021`) | Vitest 572/572 in 73 files; Playwright `chromium` 44 passed, 3 skipped; CI passed |

## Related POS pull requests

None.

## Not merged yet

- Rodnee: the Android app, branch `feat/p8-android-app` (FR-065 to FR-069), the production deploy, and the v1.0.0 release with the APK. Update 2026-11-13: the Android app pull request is open; see section 60 of `docs/test-cases.md`.
- Renier: Phase 8 integrated QA, branch `test/p8-integrated-qa-main` (a new section of `docs/test-cases.md`).
- This docs closeout, PR #112: the Phase 8 status cells, section 23 of `docs/functional-requirements.md`, this register, the development log and the README.

## Release

The v1.0.0 release and its APK are Not published yet. Rodnee's release was due Fri Nov 13; update 2026-11-13: the date is not confirmed yet.
