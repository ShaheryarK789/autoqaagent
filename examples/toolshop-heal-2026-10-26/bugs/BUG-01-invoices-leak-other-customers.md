# BUG-01 My invoices returns other customers' invoices (personal data leak)
Severity: critical
Area: Order history / data isolation
Environment: https://with-bugs.practicesoftwaretesting.com, Chromium (Playwright Desktop Chrome), 1280x720

## Steps to reproduce
1. Register a new customer and sign in.
2. Open My account > My invoices (the page calls `GET /invoices?page=1`).

## Expected
Only the signed-in customer's own invoices are listed. A brand-new customer has none.

## Actual
The response lists invoices belonging to other customers, with their billing addresses and totals.

## Evidence
- Failing test: `account.spec.ts` > "My invoices only returns the signed-in customer own invoices" (other owners received: `[2, 3]`), in all 3 stability runs.
- Reproduced in the browser on 2026-10-26: brand-new customer id 5 received invoices owned by users 2 and 3. Earlier the same day, customer id 6 received invoices owned by users 2, 3, 16, 23 and 24.
