# Test plan: Practice Software Testing - Toolshop (with bugs)

Source: `journeys.md` in this run folder.

## Approach
- No shared test account exists, so `auth.setup.ts` registers a fresh throwaway `@example.test` customer through the UI at the start of every run, with a password generated in memory, signs in and saves the session to `.auth/user.json`. Signed-in specs opt in with that storage state. The credentials are never written to disk.
- Specs that need their own login (register-then-sign-in) register their own throwaway account.
- Every test asserts the correct business behaviour. Where the app is buggy the test fails and the failure is written up in `bugs/`; assertions are never weakened.
- Expected totals are recomputed in the test from catalogue prices (Combination Pliers $14.15, Slip Joint Pliers $9.17).
- Angular `<select>` controls ignore Playwright's `selectOption` in some forms (country, subject), so page objects pick options with the keyboard, as a real user would.

## Risk rating
| Journey | Impact | Likelihood | Risk |
| --- | --- | --- | --- |
| Checkout / totals | revenue | calculations, multi-step state | high |
| Order history and data isolation | trust, privacy | server-side filtering | high |
| Login / register | access | state, redirects | high |
| Cart edits | revenue | calculations | high |
| Profile / account data | trust | data binding | medium |
| Search / sort / filter | conversion | query building | medium |
| Category navigation | conversion | routing | medium |
| Contact | support | form submission | medium |
| Favourites | low | simple CRUD | low |
| Mobile menu | conversion on mobile | responsive layout | low |

## Cases
| ID | Journey | Case | Type | Risk | Spec file |
| --- | --- | --- | --- | --- | --- |
| T01 | Checkout | Signed-in customer buys 2 Combination Pliers by bank transfer: total $28.30, invoice number shown, cart emptied | happy | high | checkout.spec.ts |
| T02 | Checkout | Address step prefills the postcode saved on the customer's profile | edge | high | checkout.spec.ts |
| T03 | Order history | A newly placed order appears in My invoices | happy | high | checkout.spec.ts |
| T04 | Order history | Invoices returned to a customer belong only to that customer | negative (security) | high | account.spec.ts |
| T05 | Cart | Changing cart quantity to 3 recalculates the cart total to 3 × $9.17 | happy | high | cart.spec.ts |
| T06 | Cart | Each cart line shows price × quantity | edge | high | cart.spec.ts |
| T07 | Product | The "+" button raises the quantity before adding to cart | happy | high | cart.spec.ts |
| T08 | Product | Adding to cart does not show an error message | negative | medium | cart.spec.ts |
| T09 | Product | Out-of-stock product cannot be added to the cart | edge | medium | cart.spec.ts |
| T10 | Login | Wrong password is rejected with "Invalid email or password" | negative | high | auth.spec.ts |
| T11 | Register + login | New customer registers, signs in and lands on "My account" | happy | high | auth.spec.ts |
| T12 | Register | Empty registration form shows required-field errors and creates nothing | negative | medium | auth.spec.ts |
| T13 | Register | "Country" label belongs to the country dropdown (and "State" to the state field) | edge (a11y) | medium | auth.spec.ts |
| T14 | Account | Header user menu shows the signed-in customer's name | happy | medium | account.spec.ts |
| T15 | Account | Profile shows the customer's own first name, last name and city | happy | medium | account.spec.ts |
| T16 | Account | Profile API response does not expose the password hash | negative (security) | high | account.spec.ts |
| T17 | Favourites | Added favourite appears in My favorites | happy | low | account.spec.ts |
| T18 | Search | Searching "pliers" lists only products whose name contains "pliers" | happy | medium | catalog.spec.ts |
| T19 | Search | Searching a nonsense term shows "0 products found" | negative | medium | catalog.spec.ts |
| T20 | Sort | "Price (Low - High)" lists products in ascending price | happy | medium | catalog.spec.ts |
| T21 | Sort | "Name (A - Z)" lists products alphabetically | happy | medium | catalog.spec.ts |
| T22 | Filter | Category "Hammer" lists only hammers | happy | medium | catalog.spec.ts |
| T23 | Navigation | Every Categories menu entry opens a category page with products | happy | medium | navigation.spec.ts |
| T24 | Navigation | Header "Home" link opens the catalogue | happy | low | navigation.spec.ts |
| T25 | Contact | Empty contact form shows required-field errors | negative | medium | contact.spec.ts |
| T26 | Contact | Valid contact message is sent and confirmed | happy | medium | contact.spec.ts |
| T27 | Mobile | @mobile Hamburger menu opens and navigates to the contact page | edge | low | mobile.spec.ts |
| T28 | Mobile | @mobile Cart total is correct on a phone viewport | edge | low | mobile.spec.ts |
| T29 | Filter | Price slider upper bound hides products above it | edge | medium | skipped: the slider is a drag-only custom widget and there is no input for the bound; the defect is shown by request evidence (`between=price,1` without an upper bound) in bug B14 |
| T30 | Profile | Update profile / change password | happy | medium | skipped: mutates the account that every signed-in spec shares in a run; lower value than the read checks |
| T31 | Contact | File attachment type validation | negative | low | skipped: needs fixture files and the send path is already broken (T26) |
| T32 | Admin | Admin area | n/a | n/a | skipped: no admin account available; a self-registered customer cannot reach it |

## Not tested
Static footer links, third-party chat widget, typos and copy (reported from exploration as B19), rentals detail, forgot-password email flow (no mailbox), visual styling.
