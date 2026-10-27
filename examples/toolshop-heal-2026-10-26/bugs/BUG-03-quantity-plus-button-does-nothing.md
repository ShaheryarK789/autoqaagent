# BUG-03 Product page "+" quantity button does nothing
Severity: major
Area: Product / add to cart
Environment: https://with-bugs.practicesoftwaretesting.com, Chromium (Playwright Desktop Chrome), 1280x720

## Steps to reproduce
1. Open `/#/product/5` (Slip Joint Pliers). The quantity shows 1.
2. Click the "+" button next to the quantity.

## Expected
The quantity becomes 2.

## Actual
The quantity stays at 1.

## Evidence
- Failing test: `cart.spec.ts` > "the + button raises the quantity on the product page" (expected "2", received "1"), in all 3 stability runs.
- Reproduced in the browser on 2026-10-26: quantity after "+" = 1.
