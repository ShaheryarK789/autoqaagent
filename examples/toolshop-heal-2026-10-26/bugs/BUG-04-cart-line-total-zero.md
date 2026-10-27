# BUG-04 Cart line total always shows "$00.00"
Severity: major
Area: Cart
Environment: https://with-bugs.practicesoftwaretesting.com, Chromium (Playwright Desktop Chrome), 1280x720

## Steps to reproduce
1. Open Slip Joint Pliers ($9.17), set quantity 2, click Add to cart.
2. Open the cart (`/#/checkout`).

## Expected
The line total reads $18.34 (2 x $9.17).

## Actual
The line total reads "$00.00". The cart total is correct, so the two values disagree.

## Evidence
- Failing test: `cart.spec.ts` > "each cart line shows unit price times quantity" (received "$00.00"), in all 3 stability runs.
- Reproduced in the browser on 2026-10-26: line price "$00.00".
