# BUG-09 Successful add to cart shows an error toast
Severity: minor
Area: Product
Environment: https://with-bugs.practicesoftwaretesting.com, Chromium (Playwright Desktop Chrome), 1280x720

## Steps to reproduce
1. Open Slip Joint Pliers and click Add to cart.

## Expected
The cart badge updates and a success message appears.

## Actual
The item is added (the cart badge updates), but the red toast says "Oeps, something went wrong."

## Evidence
- Failing test: `cart.spec.ts` > "adding to the cart does not report an error", in all 3 stability runs.
- Reproduced in the browser on 2026-10-26: toast "Oeps, something went wrong.", cart badge "2" after adding 2.
