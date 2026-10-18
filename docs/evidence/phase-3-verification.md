# Phase 3 Verification Evidence Register

Evidence for merged Phase 3 pull requests. Test counts come from the pull request descriptions and CI.

| PR | Date | Change | Evidence | Result |
| --- | --- | --- | --- | --- |
| [#7](https://github.com/eendor/Brew-ni-Cat-Connect/pull/7) | 2026-09-18 | Ordering core and cart domain | `tests/unit/cart-*.test.ts` (`TC-P3-001`–`TC-P3-047`) | Vitest 69/69, Playwright 13/13, CI passed |
| [#12](https://github.com/eendor/Brew-ni-Cat-Connect/pull/12) | 2026-10-11 | `sharp` and `source-map-js` security updates | `npm audit --omit=dev` | 0 production vulnerabilities; Vitest 73/73 |
| [#13](https://github.com/eendor/Brew-ni-Cat-Connect/pull/13) | 2026-10-11 | Shop hours 11 AM to 10 PM, closed Sunday | `tests/unit/business-pages.test.tsx` | Vitest 73/73 |
| [#15](https://github.com/eendor/Brew-ni-Cat-Connect/pull/15) | 2026-10-14 | Playwright baseline fix | `tests/e2e/showcase.spec.ts` | Vitest 73/73, Playwright 13/13 |
| [#14](https://github.com/eendor/Brew-ni-Cat-Connect/pull/14) | 2026-10-15 | Cart drawer, cart page, checkout | `tests/unit/cart-components.test.tsx`, `cart-context.test.tsx`, `checkout.test.tsx`, `menu-order-dialog.test.tsx` | Vitest 108/108, Playwright 13/13 |
| [#16](https://github.com/eendor/Brew-ni-Cat-Connect/pull/16) | 2026-10-15 | Menu product photos and scroll/page motion | [`phase-3/menu-photos-motion/verification.md`](phase-3/menu-photos-motion/verification.md) and screenshots | Vitest 109/109, Playwright 13/13 |
| [#17](https://github.com/eendor/Brew-ni-Cat-Connect/pull/17) | 2026-10-15 | Menu card hover and photo sizes | Production-build browser measurements in the PR | Vitest 109/109, Playwright 13/13 |
| [#18](https://github.com/eendor/Brew-ni-Cat-Connect/pull/18) | 2026-10-15 | Menu layout, order dialog, header polish | Production-build measurements at 1280, 375, and 320px in the PR | Vitest 109/109, Playwright 13/13 |
| [#20](https://github.com/eendor/Brew-ni-Cat-Connect/pull/20) | 2026-10-16 | Checkout validation helpers | `tests/unit/checkout-validation.test.ts` (`TC-P3-053`, `TC-P3-054`) | Vitest 115/115 in 15 files, Playwright 13/13; CI passed on the pull request, and the push run hit the `TC-P3-052` flake fixed in #21 |
| [#21](https://github.com/eendor/Brew-ni-Cat-Connect/pull/21) | 2026-10-17 | Category tab highlight test stabilized | `tests/unit/menu-catalog.test.tsx` (`TC-P3-052`), run three times in a row | Vitest 115/115 in 15 files, CI passed |
| [#22](https://github.com/eendor/Brew-ni-Cat-Connect/pull/22) | 2026-10-17 | Direct-to-main docs commits recorded as process exceptions | `docs/code-review.md` | Docs validator PASS, CI passed |
| [#23](https://github.com/eendor/Brew-ni-Cat-Connect/pull/23) | 2026-10-18 | Three.js experience, motion layer and dark redesign | `tests/unit/three-layer.test.tsx`, `menu-order-dialog.test.tsx`, `checkout.test.tsx`, `menu-options.test.tsx`, `tests/e2e/three.spec.ts`, `menu.spec.ts` (`TC-P4-001`–`TC-P4-022`; `TC-P4-013`–`TC-P4-015` retired) | Vitest 127/127 in 17 files, Playwright 21/21 (14 + 7), CI passed |
| [#24](https://github.com/eendor/Brew-ni-Cat-Connect/pull/24) | 2026-10-18 | PR #23 follow-ups: phone checks, tap targets, duplicate photos, lint advisory | `tests/e2e/phone.spec.ts`, `three.spec.ts` (`TC-P4-023`–`TC-P4-026`), MAN-P4-003 click-through | Vitest 127/127 in 17 files, Playwright 25/25 (16 + 9), audit 0 vulnerabilities, CI passed |
| [#25](https://github.com/eendor/Brew-ni-Cat-Connect/pull/25) | 2026-10-18 | Rider delivery flow: a local rider orders at the shop and delivers; delivery address for riders; rider list with names and logos | `tests/unit/checkout-validation.test.ts`, `checkout.test.tsx`, `rider-list.test.tsx`, `business-pages.test.tsx`, `tests/e2e/showcase.spec.ts`, `foundation.spec.ts` (`TC-P4-027`–`TC-P4-029`, `TC-P2-017`, `TC-P2-025`, `TC-P1-009`), MAN-P4-008 screenshots | Vitest 130/130 in 18 files, Playwright 25/25 (16 + 9), audit 0 vulnerabilities, CI passed |
