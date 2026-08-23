# Phase 1 Verification Record

**Project:** Brew ni Cat Connect
**Specification version:** 0.1 Draft
**Date:** 2026-08-23
**Timezone:** Asia/Manila
**Phase:** Phase 1 — Project Foundation
**Scope:** Local application-foundation verification before teammate QA and pull-request review

## 1. Run Identity and Environment

| Field | Recorded value |
| --- | --- |
| Repository | `https://github.com/eendor/Brew-ni-Cat-Connect` |
| Branch | `feat/project-foundation` |
| Git HEAD during final local runs | `193d69c8f17f6d5c91556789bb3fa98f2563e9fc` (`ci: add project validation workflow`) plus documentation/evidence-only working-tree changes |
| Working directory | `D:\Documents\BrewniCat` |
| Operating system / shell | Windows / PowerShell |
| Node.js | `v24.19.0` |
| npm | `12.0.2` |
| Python | `3.14.7` |
| Next.js | `16.3.2` |
| Vitest | `4.1.11` |
| Playwright | `1.62.1` |
| Browser | Chrome for Testing `151.0.7922.34` / Playwright Chromium `v1234` |
| Runtime input/data | Static Phase 1 shell only; no environment credentials, customer data, backend, or external service |

The application, configuration, and automated tests were committed as `9c3fdfeae4ee12acea9819fca12b21ebfc0757c2` and `90c43cca6b047c6bb11a285660ec5ce2a27d8626`; the CI workflow was committed as `193d69c8f17f6d5c91556789bb3fa98f2563e9fc`. The remaining working-tree changes during the final local rerun were documentation/evidence only. Pull Request [#1](https://github.com/eendor/Brew-ni-Cat-Connect/pull/1) provides the remote review boundary; its final GitHub Actions run is reported only after completion.

## 2. Reproducible Dependency Installation

Procedure: create a clean temporary directory, copy only `package.json` and `package-lock.json`, then run:

```powershell
npm ci
```

Literal summary output:

```text
added 477 packages, and audited 478 packages
found 0 vulnerabilities
```

**Exit status:** `0`

The package manifest explicitly denies the optional `unrs-resolver` postinstall through npm 12 `allowScripts`; the clean run completed without a blocked-script warning. No install script was approved for that package. A separate `npm ci --dry-run` also exited `0`.

### 2.1 Development Server Smoke Check

Command:

```powershell
npm run dev -- --hostname 127.0.0.1
```

Literal server/result summary:

```text
▲ Next.js 16.3.2 (Turbopack)
- Local: http://127.0.0.1:3000
✓ Ready in 569ms
STATUS=200
TITLE_MATCH=True
AGENT_FILES_PRESENT=False
```

**Result:** The development server returned the homepage with the expected title. It was terminated normally after the smoke check. `agentRules: false` prevented framework-generated agent-instruction files from entering the working tree.

## 3. Static Checks

### 3.1 Formatting

Command and input:

```powershell
npm run format:check
```

Input: repository files included by the Prettier configuration; legacy specification Markdown remains under the dedicated document validator.

Literal summary output:

```text
Checking formatting...
All matched files use Prettier code style!
```

**Exit status:** `0`

### 3.2 Specification Documentation

Command and input:

```powershell
python scripts/validate_phase0_docs.py
```

Input: required root documents and Markdown specification set.

Literal summary output:

```text
REQUIRED_ROOT=5
REQUIRED_DOCS=14
MARKDOWN_FILES_CHECKED=20
FR_IDS=81 (001-081)
NFR_IDS=40 (001-040)
ERRORS=0
PHASE0_DOC_VALIDATION=PASS
```

**Exit status:** `0`

### 3.3 Lint

Command and input:

```powershell
npm run lint
```

Input: repository application, configuration, and test source.

Literal output:

```text
npm notice run brew-ni-cat-connect@0.1.0 lint
npm notice run eslint . --max-warnings=0
```

**Result:** no lint error or warning was emitted.
**Exit status:** `0`

### 3.4 Type Checking

Command and input:

```powershell
npm run typecheck
```

Input: generated App Router types and the TypeScript project.

Literal output:

```text
npm notice run brew-ni-cat-connect@0.1.0 typecheck
npm notice run next typegen && tsc --noEmit
Generating route types...
✓ Types generated successfully
```

**Result:** route generation and `tsc --noEmit` completed.
**Exit status:** `0`

## 4. Unit / Component Verification

Command and input:

```powershell
npm run test
```

Input: `tests/unit/home-page.test.tsx` and `tests/unit/site-header.test.tsx` in JSDOM.

Literal summary output:

```text
RUN  v4.1.11 D:/Documents/BrewniCat

Test Files  2 passed (2)
     Tests  4 passed (4)
  Duration  2.67s
```

**Result:** TC-P1-001 through TC-P1-004 passed; zero failed/skipped tests were reported.
**Exit status:** `0`

### 4.1 Targeted Coverage

Command and input:

```powershell
npm run test:coverage
```

Input: the same two unit/component test files and the production source units they import.

Literal summary output:

```text
Test Files  2 passed (2)
     Tests  4 passed (4)

Statements   : 96% ( 24/25 )
Branches     : 88.88% ( 8/9 )
Functions    : 100% ( 13/13 )
Lines        : 95.65% ( 22/23 )
```

**Result:** coverage generation completed.
**Exit status:** `0`

Coverage scope limitation: Vitest currently reports only source units imported by these tests. The percentages are not a whole-application coverage claim and are not yet an enforced project-wide threshold.

## 5. Production Build and End-to-End Verification

### 5.1 Production Build

Command and input:

```powershell
npm run build
```

Input: Next.js application source and static foundation routes.

Literal summary output:

```text
▲ Next.js 16.3.2 (Turbopack)
✓ Compiled successfully
✓ Generating static pages using 5 workers (7/7)

Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /about
├ ○ /contact
├ ○ /gallery
└ ○ /menu

○  (Static)  prerendered as static content
```

**Result:** the build completed 7/7 static-generation tasks; its route table listed six application routes: the homepage, four public placeholders, and the internal not-found route.
**Exit status:** `0`

### 5.2 Playwright Chromium Smoke Suite

Command and input:

```powershell
npm run test:e2e
```

Input: production build served at `http://127.0.0.1:3000`; Chromium; static Phase 1 routes; responsive widths 320, 375, 768, 1024, and 1440 CSS pixels.

Literal summary output:

```text
Running 5 tests using 3 workers

ok  TC-P1-005 — homepage loads with its heading and desktop navigation
ok  TC-P1-006 — mobile navigation opens without horizontal overflow
ok  TC-P1-007 — placeholder routes preserve the application shell
ok  TC-P1-008 — unknown routes show the not-found experience
ok  TC-P1-009 — shell has no horizontal overflow at representative widths

5 passed (3.9s)
```

**Result:** TC-P1-005 through TC-P1-009 passed; zero failed/skipped tests were reported. The command also rebuilt the production application successfully before starting Playwright.
**Exit status:** `0`

## 6. Dependency Audit

Command and input:

```powershell
npm run audit
```

Input: current npm lockfile dependency graph.

Literal output:

```text
found 0 vulnerabilities
```

**Exit status:** `0`

This result is the npm advisory state at execution time, not a guarantee against undiscovered vulnerabilities.

### 6.1 Repository Credential-Pattern Review

Procedure: a dependency-free Python scan read 62 repository text files while excluding Git metadata, dependencies, generated build/test output, and binary screenshots. It checked private-key headers, common credential prefixes, non-empty secret-like assignments, and `.env.example` values.

Literal output:

```text
TEXT_FILES_SCANNED=62
CREDENTIAL_PATTERN_FINDINGS=0
ENV_EXAMPLE_NONEMPTY_VALUES=0
```

**Exit status:** `0`

This focused review reduces accidental-credential risk but does not replace a maintained secret-scanning service or later deployment/bundle inspection.

## 7. Developer Responsive and Accessibility Inspection

### 7.1 Responsive Screenshots

The developer visually inspected these captured production-shell states:

| View | Evidence path | Observed result |
| --- | --- | --- |
| Mobile, 375 px | `docs/evidence/phase-1/screenshots/mobile-375.png` | One-column shell, controls, content cards, and footer displayed without obvious clipping or overlap |
| Mobile navigation open, 375 px | `docs/evidence/phase-1/screenshots/mobile-navigation-open-375.png` | Expanded control and five navigation destinations were visible; page content continued below the menu |
| Tablet, 768 px | `docs/evidence/phase-1/screenshots/tablet-768.png` | Shell reflowed without obvious horizontal overflow or overlapping content |
| Desktop, 1440 px | `docs/evidence/phase-1/screenshots/desktop-1440.png` | Desktop navigation, two-column hero, card row, and footer columns rendered without obvious overlap or clipped controls |

TC-P1-009 additionally checked 320 and 1024 pixels through exact `scrollWidth === clientWidth` assertions. Those two widths do not have retained screenshots in this run.

### 7.2 Keyboard, Focus, Skip Link, and Reduced Motion

Procedure and literal observed state changes against the production server:

```text
First Tab: Skip to main content received focus.
Computed focus outline: 3px solid.
Enter on skip link: focus moved to MAIN#main-content.
Keyboard navigation: focus reached Open navigation.
Enter on Open navigation: aria-expanded changed to true.
Escape: focus returned to the trigger and aria-expanded changed to false.
Reduced-motion context: computed transition-duration was 1e-05s.
```

**Result:** the inspected foundation interactions had a visible focus indication, functional skip link, keyboard-operable mobile control, Escape recovery, and minimized transition duration under reduced motion.
**Status:** Passed developer inspection.

A WCAG relative-luminance calculation for the primary token pairs produced: strong text/canvas `15.36:1`, muted text/canvas `6.50:1`, accent text/canvas `7.79:1`, white/accent button `6.94:1`, and muted footer text/footer `10.29:1`. The focus outline measured `3.69:1` against the canvas and `4.21:1` against the footer. These sampled text pairs exceed the 4.5:1 normal-text threshold and the focus pairs exceed 3:1; this check does not cover every composited/translucent state.

This is developer verification, not Renier's independent QA, accessibility approval, or full WCAG conformance evidence.

## 8. GitHub Actions Boundary

`.github/workflows/ci.yml` is configured to select Python 3.14 and npm 12.0.2, then run clean install, dependency audit, format check, specification-document validation, lint, typecheck, unit/component tests, and the production build for relevant pushes and pull requests. Playwright is intentionally omitted from this initial hosted workflow to avoid browser installation overhead; local E2E remains required and passed above.

**Remote workflow result at the time of this record:** Not Run / pending feature-branch push and pull-request workflow. A GitHub Actions pass must be linked separately after it actually completes.

## 9. Summary

The focused `.gitignore` change/rollback fixture is preserved under `docs/evidence/phase-1/transaction/`. Its `VERIFICATION.txt` records the original and modified SHA-256 hashes, baseline and modified behavior, and a successful rollback test on a separate copy; `MODIFIED_FILE` remains in the changed state.

| Check | Result | Exit / status |
| --- | --- | --- |
| Clean lockfile install | 477 packages added; 478 audited; 0 vulnerabilities | `0` |
| Development server smoke | Homepage HTTP 200; expected title present | Passed, then stopped |
| Format check | All matched files use Prettier code style | `0` |
| Specification document validation | 20 Markdown files checked; 0 errors | `0` |
| Lint | No findings | `0` |
| Typecheck | Next route types and TypeScript completed | `0` |
| Unit/component tests | 2 files; 4 passed; 0 failed | `0` |
| Targeted coverage | 96% statements; 88.88% branches; 100% functions; 95.65% lines | `0` |
| Production build | Compiled; 7/7 generation tasks completed; six application routes listed | `0` |
| Chromium E2E | 5 passed; 0 failed | `0` |
| Responsive width matrix | 320/375/768/1024/1440 had no document overflow | Passed in TC-P1-009 |
| Developer accessibility inspection | Skip link, focus, mobile-menu keyboard state, Escape recovery, and reduced motion behaved as recorded | Passed inspection |
| npm audit | 0 vulnerabilities | `0` |
| Credential-pattern review | 62 text files scanned; 0 credential patterns; 0 non-empty example values | `0` |
| Teammate manual QA | Awaiting Renier | Not Run |
| Peer code review | Awaiting reviewer on open PR | Not Run |
| GitHub Actions | Awaiting remote workflow run | Not Run at record time |

No Phase 2 feature, customer data, real business content, backend, Supabase, Messenger, Android, or POS integration was exercised or claimed by this record.
