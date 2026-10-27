# BUG-18 Shop intermittently fails to load pages, scripts and product lists
Severity: major
Area: Site-wide availability
Environment: https://with-bugs.practicesoftwaretesting.com, Chromium (Playwright Desktop Chrome), 1280x720

## Steps to reproduce
Not deterministic. Use the shop normally for a few minutes (for example, run the generated suite with 2 browsers) and watch the network panel.

## Expected
Pages, their lazy-loaded scripts and the product API respond every time. If something fails, the page says so.

## Actual
At random, one of these happens, and the page is left blank or half-rendered with no message:
- A lazy-loaded route script fails with `net::ERR_CONNECTION_RESET` (`chunk-RGBTLOVQ.js`, seen 2026-10-26 ~15:35 UTC). The router then stays on the current page, so clicking "Sign in" leaves the catalogue showing, and the failure persists until a full page reload. In the first suite run today, the account page after sign-in rendered with no content, even after a reload.
- Navigations fail with `net::ERR_TIMED_OUT` or `net::ERR_ABORTED`, or never reach the `load` event within 30 s.
- The catalogue renders its filters but the product list never appears.

How often (9 full-suite runs today): 5 runs had 1 to 4 tests fail on one of these, and each of those tests passed again in a later run. In the 3-run stability check, run 1 had 4 such failures and runs 2 and 3 had none.

Separately, between 16:00 and 16:04 UTC the shop dropped every account registered today (sign-in returned 401, new user ids restarted at 5). This looks like a scheduled data reset of the demo. It isn't counted as a bug, but a signed-in test that runs across a reset will fail.

## Evidence
- Tests that failed this way, then passed in later runs with no file changed: `cart.spec.ts` > "an out-of-stock product cannot be added to the cart"; `catalog.spec.ts` > "searching \"pliers\" lists only pliers", "searching a nonsense term reports no products", "the Hammer category filter lists only hammers" (all in stability run 1). Earlier runs: `auth.setup.ts` (blank account page), `mobile.spec.ts` > "@mobile the cart total is correct on a phone" (`net::ERR_TIMED_OUT at …/#/product/5`), `cart.spec.ts` > "changing the cart quantity recalculates the cart total", `contact.spec.ts` > "a signed-in customer can send a contact message".
- Screenshot: `test-results/catalog-Catalogue-searching-pliers-lists-only-pliers-desktop/test-failed-1.png` (filters shown, no products).
- Browser console on 2026-10-26: `Failed to load resource: net::ERR_CONNECTION_RESET @ …/chunk-RGBTLOVQ.js` followed by `TypeError: Failed to fetch dynamically imported module`.
