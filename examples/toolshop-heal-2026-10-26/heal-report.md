# Heal report: Toolshop suite, 2026-10-26

Target: https://with-bugs.practicesoftwaretesting.com (Chromium, Desktop Chrome 1280x720 and the mobile project), 2 workers.

## Result

| | Count |
| --- | --- |
| Tests (including the setup step) | 31 |
| Passed | 16 |
| Failed | 15 |
| Failed because of a reported bug | 15 |
| Flaky in the 3 stability runs | 4 |
| Bugs reported | 16 (13 proven by failing tests, 3 found while exploring) |

All 15 remaining failures are reported app bugs. The 4 flaky tests flaked because the shop failed to serve pages (BUG-18), not because of a test fault. See Stability.

## What changed in the app, and the repairs

The first run failed in setup, so 30 tests never ran. Once setup passed, 27 of 30 failed. 13 of those were the known bug tests. The other failures came from three renamed controls, plus the two checkout tests that also fail on an app bug (BUG-17).

### Locator repairs (broken locator, confidence 95%)

Each control still exists with the same `data-test` id and the same behaviour; only its accessible name or test id changed. Every fix is in a page object; no spec was edited.

| Page object | Before | After | Evidence |
| --- | --- | --- | --- |
| `generated-tests/pages/product.page.ts` `addToCartButton` | `page.getByRole('button', { name: 'Add to basket' })` | `page.getByRole('button', { name: 'Add to cart' })` | Product page buttons: `{"text":"Add to cart","test":"add-to-cart"}`. No "Add to basket" button exists. Clicking it still adds the item. |
| `generated-tests/pages/catalog.page.ts` `searchBox` | `page.getByTestId('search-input')` | `page.getByTestId('search-query')` | The search form's input is now `data-test="search-query"`. Searching "pliers" with it calls `/products/search?q=pliers` (200) and lists the same 4 pliers. |
| `generated-tests/pages/contact.page.ts` `send` | `page.getByRole('button', { name: 'Send message' })` | `page.getByRole('button', { name: 'Send', exact: true })` | The submit is `<input type="submit" value="Send" data-test="contact-submit">`. The guest and signed-in field labels are unchanged. |

Failures these fixed (14): every test that opens a product page (cart x5, checkout x3, favourites, mobile cart total), both catalogue search tests, and all 3 contact tests. Some of them then failed on their known bug instead.

No timing, test-data or test-logic repairs were needed. I temporarily added a response log to `checkout.page.ts` to capture the `POST /invoices` status, then removed it. The file is back to its original content.

## Failure triage

| Test | Classification | Evidence (expected / actual / rule broken) | Confidence |
| --- | --- | --- | --- |
| `auth.setup.ts` register and sign in (first run only) | Real bug, BUG-18 | Expected the My account heading after sign-in and reload. Got a page with only the header and footer. In the browser, a lazy route script failed with `ERR_CONNECTION_RESET`. Passed in every later run. | 80% |
| 14 tests listed above | Broken locator, repaired | See table above | 95% |
| account > header user menu shows the customer name | Real bug, BUG-08 | Expected "Qa Tester", got "User Data not found" | 95% |
| account > profile shows own name and city | Real bug, BUG-07 | First Name field shows "Tester", City "City not found" | 95% |
| account > profile data has no password hash | Real bug, BUG-02 | `/users/me` contains `password` | 99% |
| account > My invoices only own invoices | Real bug, BUG-01 | Received other owners `[2, 3]` | 99% |
| auth > Country and State labels | Real bug, BUG-10 | No combobox named "Country"; the drop-down is labelled "State" | 95% |
| cart > each cart line shows unit price x quantity | Real bug, BUG-04 | Expected $18.34, got "$00.00" | 99% |
| cart > + button raises the quantity | Real bug, BUG-03 | Expected 2, got 1 | 95% |
| cart > adding to the cart does not report an error | Real bug, BUG-09 | Item added, toast "Oeps, something went wrong." | 95% |
| catalog > "Price (Low - High)" | Real bug, BUG-05 | Request sends `sort=price,desc`; most expensive first | 99% |
| catalog > "Name (A - Z)" | Real bug, BUG-05 | Names come back in reverse order | 99% |
| checkout > address step prefills the postcode | Real bug, BUG-06 | Expected 12345, got "missing value" | 95% |
| checkout > buys two items by bank transfer | Real bug, BUG-17 | `POST /invoices` -> 500 `{"message":"Something went wrong"}`; no confirmation or error shown | 85% |
| checkout > newly placed order appears in My invoices | Real bug, BUG-17 | Same as above | 85% |
| navigation > every Categories entry opens a category with products | Real bug, BUG-11 | "UNDEFINED" category has 0 products; Chainsaws/Rentals leave the category routes | 95% |
| navigation > header Home link opens the catalogue | Real bug, BUG-12 | Home link href is `#/contact` | 99% |

### How BUG-17 was separated from a test problem

The two order tests passed when the checkout spec ran alone at about 15:47 UTC, and failed in every full-suite run. That pattern looks like test interference, so I checked before calling it a bug:
- The failing request is identical to accepted ones (same customer, product, address and payment fields).
- It fails for brand-new customers too, including when only the checkout spec runs, straight after a full-suite run.
- I reproduced it by hand outside the test runner (2 manual orders → 500 at about 15:55 UTC). At other times, 10 manual orders went through.
- Ruled out: token expiry (the token lasts 180 days), favourites on the account, and the number of earlier orders.
- The shop's own invoice list has no successful order from anyone between 15:47:48 and 15:58:40.

The server rejects a valid order and the page gives the customer no feedback, so this is an app bug. The tests are left asserting the correct behaviour: an order that goes through.

## Bugs

| Bug | Title | Severity | Proven by a failing test |
| --- | --- | --- | --- |
| BUG-01 | My invoices returns other customers' invoices | critical | yes |
| BUG-17 | Placing an order intermittently fails with HTTP 500, and the checkout shows nothing | critical | yes (2 tests) |
| BUG-02 | Profile API sends the password hash to the browser | major | yes |
| BUG-03 | Product page "+" quantity button does nothing | major | yes |
| BUG-04 | Cart line total always shows "$00.00" | major | yes |
| BUG-05 | Sort options sort in the opposite direction | major | yes (2 tests) |
| BUG-06 | Checkout postcode prefilled with "missing value" | major | yes |
| BUG-07 | Profile shows names swapped and City "City not found" | major | yes |
| BUG-11 | Categories menu has "UNDEFINED" and broken entries | major | yes |
| BUG-18 | Shop intermittently fails to load pages, scripts and product lists | major | only as flaky failures (stability run 1); no test fails on it in the final run |
| BUG-08 | Header user menu reads "User Data not found" | minor | yes |
| BUG-09 | Successful add to cart shows an error toast | minor | yes |
| BUG-10 | Registration "State" and "Country" labels swapped | minor | yes |
| BUG-12 | Header "Home" link opens the Contact page | minor | yes |
| BUG-15 | Typos in visible labels ("Contakt", "Sorth", "Serch") | minor | no, found while exploring |
| BUG-16 | Unnamed form controls and a broken image | minor | no, found while exploring |

Each bug has a report in `bugs/`. I reproduced every test-proven bug in the browser today with a fresh customer. BUG-13 (payment fields ignore the method) and BUG-14 (price filter upper bound) from the 2026-10-24 run were not re-checked in this run, so they are not counted here.

Also noted, not counted as a bug: between 16:00 and 16:04 UTC the shop dropped every account registered today (new user ids restarted at 5). This looks like the demo's scheduled data reset. The suite registers its own customer at the start of each run, so only a run that spans a reset would be affected.

## Stability

3 full runs of `npx playwright test`, back to back, with no file changed between or during them (the last file change, removing the temporary diagnostic, came before run 1).

| Run | Passed | Failed |
| --- | --- | --- |
| 1 | 12 | 19 |
| 2 | 16 | 15 |
| 3 | 16 | 15 |

| Group | Tests |
| --- | --- |
| Stable pass | 12 |
| Consistent failure (each one a reported bug, same error every run) | 15 |
| Flaky | 4 |

The 4 flaky tests failed in run 1 and passed in runs 2 and 3:
- `cart.spec.ts` > an out-of-stock product cannot be added to the cart: the product page never rendered (waiting for "Add to cart").
- `catalog.spec.ts` > searching "pliers" lists only pliers, searching a nonsense term reports no products, the Hammer category filter lists only hammers: the catalogue rendered its filters but no products, or `page.goto` failed with `net::ERR_ABORTED`.

Cause: the shop failed to serve its pages and product API for a stretch of run 1 (BUG-18). Each of these tests passes whenever the shop responds; they share no data and don't depend on test order. The only test-side "fix" would be a retry or a longer wait, which the house rules forbid and which would hide a real availability problem. So I changed no file, reported the cause as BUG-18 (with how often it happened) and counted these 4 tests as flaky. Earlier runs today showed the same pattern in other tests (setup, mobile cart total, cart quantity recalculation, signed-in contact). All of them passed in every stability run.

Fixed along the way: the 3 locator repairs above. Nothing was changed during the stability runs.

## Final count

31 tests: 16 passed, 15 failed. All 15 failures are reported bugs (BUG-01 to BUG-12 and BUG-17). Flaky: 4, caused by the shop's intermittent failures (BUG-18).
