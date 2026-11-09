# Phase 5 Verification Evidence Register

Evidence for merged Phase 5 pull requests, in merge order. Test counts come from the pull request descriptions and CI; where a description gives no counts, the row shows the CI result. The case IDs are the rows each pull request added or changed in `docs/test-cases.md`.

| PR | Date | Change | Evidence | Result |
| --- | --- | --- | --- | --- |
| [#87](https://github.com/eendor/Brew-ni-Cat-Connect/pull/87) | 2026-11-04 | Customer order history and reorder (FR-039, FR-041) | `tests/unit/order-history-service.test.ts`, `tests/unit/order-history.test.tsx`, `tests/unit/reorder.test.ts`, `tests/e2e/order-history.spec.ts` (`TC-P5-020`, `TC-P5-023`–`TC-P5-024`, `TC-P5-030`–`TC-P5-033`); `TC-P4-076` covers no disclosure | Vitest 333/333 in 50 unit files; Playwright `chromium` 4 passed; typecheck, lint, format and build passed; CI passed |
| [#96](https://github.com/eendor/Brew-ni-Cat-Connect/pull/96) | 2026-11-05 | Order history evidence screenshots retaken without the footer mask (FR-039, FR-041) | `tests/e2e/order-history.spec.ts` (`TC-P5-030`–`TC-P5-033`); four screenshots in `docs/evidence/phase-5/screenshots/` | Vitest 490/490 in 61 files; Playwright `chromium` 28 passed, 1 skipped; CI passed |
| [#97](https://github.com/eendor/Brew-ni-Cat-Connect/pull/97) | 2026-11-05 | Ratings and reviews planned (FR-098), with the daily cash count and cat characters (FR-097, FR-099) | `docs/functional-requirements.md`, `docs/development-log.md`; no test cases yet | Docs validator passed (`FR_IDS=99`, `NFR_IDS=40`, `ERRORS=0`); Prettier passed; CI passed |
| [#93](https://github.com/eendor/Brew-ni-Cat-Connect/pull/93) | 2026-11-06 | Live order tracking (FR-044 to FR-049) | `tests/unit/order-confirmation-page.test.tsx`, `tests/unit/use-order-status.test.ts`, `tests/unit/fetch-order.test.ts`, `tests/unit/order-status-tracker.test.tsx`, `tests/e2e/order-tracking.spec.ts` (`TC-P5-040`–`TC-P5-064`) | Vitest 538/538 in 66 files; Playwright `chromium` 32 passed, 3 skipped; typecheck, lint, format and build passed; CI passed |
| [#103](https://github.com/eendor/Brew-ni-Cat-Connect/pull/103) | 2026-11-07 | Customer favorites (FR-040) | `tests/unit/favorites-helper.test.ts`, `tests/unit/favorite-button.test.tsx`, `tests/unit/favorites-page.test.tsx`, `tests/unit/site-header.test.tsx`, `tests/e2e/favorites.spec.ts` (`TC-P5-065`–`TC-P5-087`) | Vitest 559/559 in 69 files; Playwright `chromium` 36 passed, 3 skipped; CI passed |
| [#107](https://github.com/eendor/Brew-ni-Cat-Connect/pull/107) | 2026-11-09 | Privacy Policy page with data deletion steps (FR-042, NFR-026) | `tests/unit/privacy-page.test.tsx`, `tests/unit/site-footer.test.tsx`, `tests/unit/account-forms.test.tsx`, `tests/unit/checkout.test.tsx`, `tests/e2e/privacy.spec.ts` (`TC-P5-088`–`TC-P5-095`) | Vitest 728/728 in 80 files; Playwright `chromium` 46 passed, 3 skipped; CI passed |
| [#108](https://github.com/eendor/Brew-ni-Cat-Connect/pull/108) | 2026-11-09 | Privacy Policy section links land after the page loads (FR-042) | `tests/e2e/privacy.spec.ts` (`TC-P5-094`) | Playwright privacy 2 passed; docs validator, typecheck, lint and build passed; CI passed |

#94 customer profiles (FR-038) is also a Phase 5 requirement, but it merged on 2026-11-05 and its row is in `docs/evidence/phase-4-verification.md`.

## Related POS pull requests

None.

## Not merged yet

These items on the Phase 5 card are not merged yet, so this register does not cover them:

- Renier: loyalty points and rewards, branch `feat/p5-loyalty` (FR-050 to FR-055).
- Rizjie: account home and data requests, branch `feat/p5-account-home` (FR-042).
- Van: ratings and reviews, branch `feat/p5-reviews` (FR-098, the website part).
- Rodnee: the POS screen that hides reviews, in `eendor/Brew-ni-Cat-POS` (the rest of FR-098). Shan will get the pull request number from Rodnee.
- Renier: the Phase 5 integrated QA on `main`, branch `test/p5-integrated-qa-main`, in the Phase 5 integrated QA section of `docs/test-cases.md`.
