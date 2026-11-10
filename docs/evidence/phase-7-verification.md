# Phase 7 Verification Evidence Register

Evidence for merged Phase 7 pull requests, in merge order. Test counts come from the pull request descriptions and CI; where a description gives no counts, the row shows the CI result. The case IDs are the rows each pull request added or changed in `docs/test-cases.md`.

| PR | Date | Change | Evidence | Result |
| --- | --- | --- | --- | --- |
| [#106](https://github.com/eendor/Brew-ni-Cat-Connect/pull/106) | 2026-11-09 | Messenger assistant webhook with button replies (FR-058 to FR-063) | `tests/unit/messenger-signature.test.ts`, `tests/unit/messenger-route.test.ts`, `tests/unit/messenger-events.test.ts`, `tests/unit/messenger-intents.test.ts`, `tests/unit/messenger-replies.test.ts` and `tests/unit/messenger-send.test.ts` (`TC-P7-001`–`TC-P7-041`, in `docs/test-cases.md` section 40; the live checks `TC-P7-042`–`TC-P7-049` are in section 40f) | Vitest 722/722 in 79 files, including 150 new Messenger tests; Playwright `chromium` 44 passed, 3 skipped; CI passed. The live checks `TC-P7-042`–`TC-P7-049` are Not run yet. |
| [#109](https://github.com/eendor/Brew-ni-Cat-Connect/pull/109) | 2026-11-09 | Buttons inside Messenger replies, and a clearer sign-up screen (FR-059, FR-062) | `tests/unit/messenger-send.test.ts` and `tests/unit/account-forms.test.tsx` (`TC-P7-050` and `TC-P5-096`; `TC-P7-034`, `TC-P7-035`, `TC-P4-164` and `TC-P4-165` updated, in `docs/test-cases.md` section 42) | Vitest 730/730 in 80 files; CI passed. The buttons in a live Messenger chat are Not run yet. |

PR #107 adds the Privacy Policy page that the Meta app needs before it can be published, and PR #108 fixes its section links; their evidence is in the Phase 5 register because their requirements are FR-042 and NFR-026. They change no FR-058 to FR-063 status.

## Related POS pull requests

None.

## Not merged yet

- Renier: the Phase 7 integrated QA on `main`, branch `test/p7-integrated-qa-main`, which adds section 43 of `docs/test-cases.md`. This docs closeout is also waiting for that merge before its final run.
