# BUG-01 My invoices returns other customers' invoices (personal data leak)
Severity: critical
Area: Order history / data isolation
Environment: https://with-bugs.practicesoftwaretesting.com, Chromium (Playwright Desktop Chrome), 1280x720

## Steps to reproduce
1. Register a brand-new customer and sign in.
2. Open My account > Invoices (`/#/account/invoices`).
3. Inspect the `GET /invoices?page=1` response the page loads.

## Expected
The response contains only invoices whose `user_id` is the signed-in customer's id (a new customer has none, or only the orders they placed).

## Actual
The response contains invoices of other customers (other `user_id` values), including each invoice's billing address, city, postcode, country, payment method, payment account name and payment account number. During exploration a new account received 11 invoices, 10 of them belonging to other users. Personal details are deliberately not copied into this report.

## Evidence
- Failing test: `account.spec.ts` > "My invoices only returns the signed-in customer own invoices". Received foreign owner ids `[4, 2, 3]` for a freshly registered customer.
- Screenshot / trace: `test-results/account-Account-My-invoices-only-returns-the-signed-in-customer-own-invoices-desktop/` (latest run).
- Exploration: `journeys.md` J2.
