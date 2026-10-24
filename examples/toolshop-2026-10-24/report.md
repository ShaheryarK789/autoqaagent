# Run report: Practice Software Testing - Toolshop (with bugs)

Target: https://with-bugs.practicesoftwaretesting.com (v5.0, "Bug Hunting Mode")
Run: 20261024-124109-generate, 24 October 2026, about 28 minutes, 316 steps
Browser: Chromium, desktop (1280x720) and mobile (390x844) projects

> Run ended after the first full run of the suite. The 3-run stability check was not completed, so the flaky count is not measured. This report is compiled from the run's own files: the journey map, test plan, bug reports and Playwright results.

## Suite summary

| Tests | Passed | Caught a bug | Other failures | Flaky | Bugs |
| --- | --- | --- | --- | --- | --- |
| 31 | 18 | 13 | 0 | not measured | 16 |

31 tests: 30 specs across 8 files plus the sign-in setup step. 28 tests run on the desktop project and 2 on the mobile project.

Each test checks that the shop does the right thing. 18 tests passed: those features work. The other 13 tests caught a bug: the shop did the wrong thing, and each one is written up in `bugs/`. No test failed for any other reason, such as a broken test. 4 more bugs (BUG-13 to BUG-16) were found during exploration and reported without a test, for the reasons given in each report.

## Stability

Not completed. The first full run of the suite gave 18 passed and 13 that caught a bug, exactly the reported bugs. The second run was stopped part-way through. In that partial run 6 more tests failed because the shop itself stopped answering: product pages loaded with no product on them and the contact form returned "Something went wrong". That looks like the public demo API throttling a burst of test traffic, but it was not investigated, so the flaky count is left as not measured rather than given as 0.

## What each test that caught a bug found

| Test | Bug |
| --- | --- |
| Account > My invoices only returns the signed-in customer own invoices | [BUG-01](bugs/BUG-01-invoices-leak-other-customers.md) critical: other customers' invoices, with addresses and payment details, are sent to a new customer |
| Account > the profile data sent to the browser does not include the password hash | [BUG-02](bugs/BUG-02-profile-api-exposes-password-hash.md) major: `GET /users/me` returns the password hash |
| Cart > the + button raises the quantity on the product page | [BUG-03](bugs/BUG-03-quantity-plus-button-does-nothing.md) major: "+" never changes the quantity |
| Cart > each cart line shows unit price times quantity | [BUG-04](bugs/BUG-04-cart-line-total-zero.md) major: every line total shows "$00.00" |
| Catalogue > "Price (Low - High)" lists the cheapest products first | [BUG-05](bugs/BUG-05-sort-options-reversed.md) major: every sort option sorts the wrong way |
| Catalogue > "Name (A - Z)" lists products alphabetically | [BUG-05](bugs/BUG-05-sort-options-reversed.md), same defect |
| Checkout > address step prefills the postcode saved on the customer profile | [BUG-06](bugs/BUG-06-checkout-postcode-missing-value.md) major: the postcode is filled with "missing value" |
| Account > the profile shows the customer own name and city | [BUG-07](bugs/BUG-07-profile-fields-mixed-up.md) major: first and last name swapped, city "City not found" |
| Account > the header user menu shows the customer name | [BUG-08](bugs/BUG-08-user-menu-user-data-not-found.md) minor: the menu reads "User Data not found" |
| Cart > adding to the cart does not report an error | [BUG-09](bugs/BUG-09-success-shows-error-toast.md) minor: a successful action shows "Oeps, something went wrong." |
| Sign in and registration > the Country and State labels point at the right fields | [BUG-10](bugs/BUG-10-register-state-country-labels-swapped.md) minor: the two labels are swapped |
| Navigation > every Categories menu entry opens a category page with products | [BUG-11](bugs/BUG-11-categories-menu-broken-entries.md) major: "UNDEFINED" is empty and "Chainsaws" is a 404 |
| Navigation > the header Home link opens the catalogue | [BUG-12](bugs/BUG-12-home-link-goes-to-contact.md) minor: "Home" opens the Contact page |

## Bug list

| ID | Severity | Bug | Found by |
| --- | --- | --- | --- |
| [BUG-01](bugs/BUG-01-invoices-leak-other-customers.md) | critical | My invoices returns other customers' invoices (personal data leak) | test |
| [BUG-02](bugs/BUG-02-profile-api-exposes-password-hash.md) | major | Profile API sends the password hash to the browser | test |
| [BUG-03](bugs/BUG-03-quantity-plus-button-does-nothing.md) | major | Product page "+" quantity button does nothing | test |
| [BUG-04](bugs/BUG-04-cart-line-total-zero.md) | major | Cart line total always shows "$00.00" | test |
| [BUG-05](bugs/BUG-05-sort-options-reversed.md) | major | All sort options sort in the opposite direction | test |
| [BUG-06](bugs/BUG-06-checkout-postcode-missing-value.md) | major | Checkout fills the postcode with "missing value" | test |
| [BUG-07](bugs/BUG-07-profile-fields-mixed-up.md) | major | Profile shows first and last name swapped and "City not found" | test |
| [BUG-11](bugs/BUG-11-categories-menu-broken-entries.md) | major | Categories menu: "UNDEFINED" is empty, "Chainsaws" is a 404 | test |
| [BUG-13](bugs/BUG-13-payment-fields-ignore-method.md) | major | Payment step asks for bank details for every method and offers a broken one | exploration |
| [BUG-08](bugs/BUG-08-user-menu-user-data-not-found.md) | minor | Header user menu reads "User Data not found" | test |
| [BUG-09](bugs/BUG-09-success-shows-error-toast.md) | minor | Successful add to cart or favourites shows an error toast | test |
| [BUG-10](bugs/BUG-10-register-state-country-labels-swapped.md) | minor | Registration: "State" and "Country" labels are swapped | test |
| [BUG-12](bugs/BUG-12-home-link-goes-to-contact.md) | minor | Header "Home" link opens the Contact page | test |
| [BUG-14](bugs/BUG-14-price-filter-upper-bound-ignored.md) | minor | Price range filter ignores its upper bound | exploration |
| [BUG-15](bugs/BUG-15-typos-and-placeholder-content.md) | minor | Typos, placeholder brand names and error strings shown as options | exploration |
| [BUG-16](bugs/BUG-16-unnamed-controls-and-broken-image.md) | minor | Unnamed buttons and a broken image | exploration |

1 critical, 8 major, 7 minor.

The journey map lists 20 candidates under its own working numbers (B1 to B20). Two were merged when written up: the typos and placeholder brands (B19) and the error strings offered as contact subjects (B18) became BUG-15. Three were not confirmed: the passing tests show that a new order does appear in My invoices (B2), that signing in after a mistyped password reaches My account (B8), and that a valid contact message is sent (B17). They are not reported as bugs.

## What was covered

Browse and buy end to end (product, cart, the 4-step checkout, invoice), order history, sign in, registration, profile, favourites, search, sort, category filter, category navigation, the contact form, and the menu and cart total on a phone screen. The full case list, rated by risk, is in the test plan.

## Not tested, and why

- **Price slider upper bound** (T29): the slider is a drag-only widget with no input for the bound. The defect is shown by request evidence in BUG-14.
- **Update profile and change password** (T30): it would change the account every signed-in test shares during a run.
- **Contact form attachments** (T31): needs fixture files, and lower value than the send path.
- **Admin area** (T32): no admin account was available, and a self-registered customer cannot reach it.
- **Copy and spelling**: reported once in BUG-15 rather than asserted in tests.

## Notes on the environment

- No test account was given, so the suite registers a fresh throwaway `@example.test` customer at the start of each run. No real personal or payment data was used.
- Icons from `cdnjs.cloudflare.com` did not load because the browser is locked to the shop and its API. That is a setting of this run, not a bug in the app.
- The first page load failed twice with an HTTP/3 (QUIC) network error and worked on the third try. That came from the network between this machine and the site, and is not counted as a bug.
