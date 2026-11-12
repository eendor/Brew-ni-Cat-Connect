# Phase 7 Verification Evidence Register

Evidence for merged Phase 7 pull requests, in merge order. Test counts come from the pull request descriptions and CI; where a description gives no counts, the row shows the CI result. The case IDs are the rows each pull request added or changed in `docs/test-cases.md`.

| PR | Date | Change | Evidence | Result |
| --- | --- | --- | --- | --- |
| [#106](https://github.com/eendor/Brew-ni-Cat-Connect/pull/106) | 2026-11-09 | Messenger assistant webhook with button replies (FR-058 to FR-063) | `tests/unit/messenger-signature.test.ts`, `tests/unit/messenger-route.test.ts`, `tests/unit/messenger-events.test.ts`, `tests/unit/messenger-intents.test.ts`, `tests/unit/messenger-replies.test.ts` and `tests/unit/messenger-send.test.ts` (`TC-P7-001`–`TC-P7-041`, in `docs/test-cases.md` section 40; the live checks `TC-P7-042`–`TC-P7-049` are in section 40f) | Vitest 722/722 in 79 files, including 150 new Messenger tests; Playwright `chromium` 44 passed, 3 skipped; CI passed. The live checks `TC-P7-042`–`TC-P7-049` are Not run yet. |
| [#109](https://github.com/eendor/Brew-ni-Cat-Connect/pull/109) | 2026-11-09 | Buttons inside Messenger replies, and a clearer sign-up screen (FR-059, FR-062) | `tests/unit/messenger-send.test.ts` and `tests/unit/account-forms.test.tsx` (`TC-P7-050` and `TC-P5-096`; `TC-P7-034`, `TC-P7-035`, `TC-P4-164` and `TC-P4-165` updated, in `docs/test-cases.md` section 42) | Vitest 730/730 in 80 files; CI passed. The buttons in a live Messenger chat are Not run yet. |
| [#113](https://github.com/eendor/Brew-ni-Cat-Connect/pull/113) | 2026-11-10 | Order and track orders inside Messenger | `tests/database/messenger-order-status.test.ts`, `tests/unit/messenger-order-flow.test.ts`, `tests/unit/messenger-order-state.test.ts` and the other Messenger unit tests | CI passed |
| [#114](https://github.com/eendor/Brew-ni-Cat-Connect/pull/114) | 2026-11-10 | Numbered long choices, a Back button and no "No flavor" choice | `tests/unit/messenger-{intents,order-flow,replies,send}.test.ts` (section 45) | CI passed |
| [#115](https://github.com/eendor/Brew-ni-Cat-Connect/pull/115) | 2026-11-10 | Ask the customer to type the number when the phone button has none | `tests/unit/messenger-{intents,order-flow}.test.ts` | CI passed |
| [#116](https://github.com/eendor/Brew-ni-Cat-Connect/pull/116) | 2026-11-10 | The owner's Closed today switch for the website and Messenger (FR-111) | `tests/database/closed-today.test.ts`, `tests/database/site-content.test.ts`, `tests/unit/messenger-order-flow.test.ts`, `tests/unit/orders-route.test.ts`, `tests/unit/site-content.test.tsx` | CI passed |
| [#117](https://github.com/eendor/Brew-ni-Cat-Connect/pull/117) | 2026-11-10 | Stop offering the phone button when its number isn't a Philippine mobile | `tests/unit/messenger-{intents,order-flow}.test.ts` (TC-P7-080) | CI passed |
| [#118](https://github.com/eendor/Brew-ni-Cat-Connect/pull/118) | 2026-11-10 | Log the format of unusable phone button numbers | `tests/unit/messenger-intents.test.ts` | CI passed |
| [#121](https://github.com/eendor/Brew-ni-Cat-Connect/pull/121) | 2026-11-10 | Start the order when the customer sends only their mobile number | `tests/unit/messenger-events.test.ts` | CI passed |
| [#128](https://github.com/eendor/Brew-ni-Cat-Connect/pull/128) | 2026-11-11 | Answer a typed question about being open with the hours | `tests/unit/messenger-events.test.ts`, `tests/unit/messenger-intents.test.ts` | CI passed |

PR #107 adds the Privacy Policy page that the Meta app needs before it can be published, and PR #108 fixes its section links. They are Phase 5 evidence because their requirements are FR-042 and NFR-026, and they change no FR-058 to FR-063 status. The Phase 5 register is in PR #110.

## Related POS pull requests

None.

## Not merged yet

- Renier: the Phase 7 integrated QA on `main`, branch `test/p7-integrated-qa-main`, which adds section 43 of `docs/test-cases.md`. This docs closeout is also waiting for that merge before its final run.

Update 2026-11-13: the rows for #113 to #118, #121 and #128 were added before the merge. The Phase 7 integrated QA has no branch yet, so Phase 7 is not closed.
