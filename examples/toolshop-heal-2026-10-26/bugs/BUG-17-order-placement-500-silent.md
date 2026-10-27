# BUG-17 Placing an order intermittently fails with HTTP 500, and the checkout shows nothing
Severity: critical
Area: Checkout / order placement
Environment: https://with-bugs.practicesoftwaretesting.com, Chromium (Playwright Desktop Chrome), 1280x720

## Steps to reproduce
1. Sign in as a customer and add Combination Pliers to the cart.
2. Cart > Proceed > Proceed > Postcode 12345 > Proceed.
3. Payment: Bank Transfer, account name "Test Account", account number 123456789, then Confirm. "Payment was successful" appears.
4. Click Confirm again to place the order.

## Expected
`POST /invoices` succeeds and the page says "Thanks for your order! Your invoice number is INV-…". If the order can't be placed, the customer sees an error and can retry.

## Actual
For periods of several minutes, `POST /invoices` returns **500** `{"message":"Something went wrong"}` for every customer, including brand-new ones. The page shows no error: the Confirm button stays and nothing happens, so the customer cannot tell whether they have ordered.

The request is identical to ones the server accepts (201) at other times: same customer, product, address and payment fields. The window comes and goes:
- Failed (500): every full-suite run today in which checkout reached the order step (7 of 7), the checkout spec run alone right after a full-suite run, and 2 manual orders at about 15:55 UTC.
- Succeeded (201): 10 manual orders between 15:46 and 16:00 UTC, and the checkout spec run alone at about 15:47 UTC.
- The shop's own invoice list shows no successful order from anyone between 15:47:48 and 15:58:40 (INV-2026000009 to INV-2026000010).

Ruled out: the test session (the token is valid for 180 days and `/users/me` returns 200 during the failures), favourites on the account (a fresh account with a favourite ordered fine), and the number of earlier orders (a fresh account placed 4 orders in a row).

The trigger isn't known. The failures cluster during and just after bursts of traffic (a full suite run with 2 browsers), so the order service may fail under modest load.

## Evidence
- Failing tests: `checkout.spec.ts` > "signed-in customer buys two items by bank transfer and gets an invoice number" and "a newly placed order appears in My invoices": timeout waiting for the confirmation, in all 3 stability runs.
- A temporary response log in a diagnostic run (removed afterwards) printed: `POST https://api-with-bugs.practicesoftwaretesting.com/invoices 500 {"message":"Something went wrong"}`.
- Screenshot: `BUG-17-order-fails-after-favourite.png` (payment step after the failed Confirm: "Payment was successful", no confirmation, no error).
