# Phase 6 Verification Evidence Register

Evidence for merged Phase 6 pull requests, in merge order. Test counts come from the pull request descriptions and CI; where a description gives no counts, the row shows the CI result. The case IDs are the rows each pull request added or changed in `docs/test-cases.md`.

| PR | Date | Change | Evidence | Result |
| --- | --- | --- | --- | --- |
| [#62](https://github.com/eendor/Brew-ni-Cat-Connect/pull/62) | 2026-10-28 | Staff change online order statuses, and completed orders become POS sales | `tests/database/online-order-status.test.ts` (`TC-P6-180`–`TC-P6-190`), on PGlite with a copy of the live POS tables | Vitest 300/300 in 40 files; CI passed |
| [#82](https://github.com/eendor/Brew-ni-Cat-Connect/pull/82) | 2026-11-02 | The POS Online orders screen and release 10140 recorded | `docs/test-cases.md` (`TC-P6-191`–`TC-P6-199`, Android unit tests in POS PR #13) | Docs validator and Prettier passed; CI passed |
| [#88](https://github.com/eendor/Brew-ni-Cat-Connect/pull/88) | 2026-11-03 | Undo a status change within five minutes (FR-095) | `tests/database/online-order-undo.test.ts` (`TC-P6-200`–`TC-P6-204`); `TC-P6-205`–`TC-P6-207` are Android unit tests in POS PR #15 | Vitest 469/469 in 56 files; CI passed |
| [#89](https://github.com/eendor/Brew-ni-Cat-Connect/pull/89) | 2026-11-03 | Split payment between cash and GCash recorded (FR-096) | `docs/test-cases.md` (`TC-P6-208`–`TC-P6-210`, Android unit tests in POS PR #17) | Docs validator and Prettier passed; CI passed |
| [#91](https://github.com/eendor/Brew-ni-Cat-Connect/pull/91) | 2026-11-04 | The undo and rider services migrations recorded as live (FR-085, FR-095) | `docs/database-design.md`; a live read-back of `20261103120000` and `20261104120000` | CI passed |
| [#99](https://github.com/eendor/Brew-ni-Cat-Connect/pull/99) | 2026-11-05 | The daily cash count marked as not planned (FR-097) | `docs/functional-requirements.md`, `docs/system-architecture.md` | Docs validator passed (`FR_IDS=99`, `NFR_IDS=40`, `ERRORS=0`); CI passed |
| [#104](https://github.com/eendor/Brew-ni-Cat-Connect/pull/104) | 2026-11-07 | Phase 6 closeout: integrated QA and final check on Connect `main` (`a3c4584`) and POS `main` (`ba11805`), and the Phase 6 records | `docs/test-cases.md` (section 34), this register, `docs/development-log.md` (Phase 6 closeout entry), `docs/functional-requirements.md` (section 18), `README.md` | npm ci, audit (0 production vulnerabilities), format, docs validator, lint, typecheck, Vitest 538/538 in 66 files and build passed; Playwright `chromium` 32 passed, 3 skipped; `chromium-3d` 20 passed; TC-P4-021 failed only because CI's placeholder Supabase host doesn't resolve here, and passed with the real settings; POS 90/90 unit tests, lint and release build passed; CI passed |

PRs #90, #92, #95 and #98 also use `TC-P6` case IDs (`TC-P6-211`–`TC-P6-222`), but they change the menu and the website content, so their rows are in `docs/evidence/phase-4-verification.md`.

## Related POS pull requests

The POS side of Phase 6 is in the POS repository (`eendor/Brew-ni-Cat-POS`). It runs its tests locally, so their results are in each POS pull request.

- Online orders screen: POS PR #13 (live list, chime, dashboard badge and status steps) and build 10140 (POS PR #14).
- Undo (FR-095): POS PR #15 and build 10141 (POS PR #16).
- Split payment (FR-096): POS PR #17, the payment dialog fixes in POS PR #20 and the split chip icon in POS PR #21, with builds 10142 (POS PR #19) and 10143 (POS PR #22).
- POS PR #18: the POS README says the POS is part of the Brew ni Cat Connect project.
- Live orders: POS PR #23 (build 10144) and POS PR #25 (build 10145) removed the tablet's local copies of two online-order sales that were deleted from the shared database: an order the owner gave for free, and the November 2 test order. Both orders had reached the tablet live and became POS sales when they were completed.

## Closeout

Phase 6 closed on 2026-11-07. The three items still open on the Phase 6 card are done in #104:

- The integrated QA on `main`, recorded in `docs/test-cases.md`, section 34.
- The docs closeout: the requirement statuses and section 18 of `docs/functional-requirements.md`, this register, the development log and the README.
- The final check: CI green on Connect, and the POS unit tests, lint and release build pass.

FR-072, FR-077 and FR-079 carry over as In development, and FR-073, FR-074, FR-078 and FR-081 stay Planned, as section 18 of `docs/functional-requirements.md` explains.
