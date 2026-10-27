# BUG-06 Checkout address step fills the postcode with "missing value"
Severity: major
Area: Checkout
Environment: https://with-bugs.practicesoftwaretesting.com, Chromium (Playwright Desktop Chrome), 1280x720

## Steps to reproduce
1. Sign in as a customer whose profile postcode is 12345.
2. Add any product to the cart, open the cart, Proceed, Proceed.

## Expected
The address step's Postcode field is prefilled with 12345, like the other address fields.

## Actual
The Postcode field contains the text "missing value".

## Evidence
- Failing test: `checkout.spec.ts` > "address step prefills the postcode saved on the customer profile" (received "missing value"), in all 3 stability runs.
- Reproduced in the browser on 2026-10-26.
