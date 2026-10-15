# Menu Photos and Motion Verification

Date/time and timezone: 2026-10-15, 22:45 PHT (UTC+8)
Tester or CI workflow: Lead developer (local) and GitHub Actions CI
Git commit: see PR #16 head
Branch / pull request: `feat/menu-photos-motion` / #16
Environment and relevant versions: Node 24.22.0, Next.js 16.3.8, Playwright 1.62.1 (Chromium)
Exact command or manual procedure: `npm run lint`, `npm run typecheck`, `npm run format:check`, `npm test`, `npm run build`, `npx playwright test`, `python scripts/validate_phase0_docs.py`; screenshots of every page at 1440px and 320px, top and scrolled, plus each Menu category
Test-data identifier (synthetic): Playwright Menu fixtures; screenshots used the live public catalog read
Literal summary output: `Tests  109 passed (109)`; `13 passed`; `✓ Generating static pages using 7 workers (9/9)`; `PHASE0_DOC_VALIDATION=PASS`
Total / passed / failed / skipped: Vitest 109/109/0/0; Playwright 13/13/0/0
Exit status: 0
Evidence path or run link: compact captures in this folder
Related bugs: duplicated noodle photo on all four noodle cards (fixed)
