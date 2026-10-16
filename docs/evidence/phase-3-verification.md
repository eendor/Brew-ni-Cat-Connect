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
