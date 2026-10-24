# BUG-04 Cart line total always shows "$00.00"
Severity: major
Area: Cart
Environment: https://with-bugs.practicesoftwaretesting.com, Chromium (Playwright Desktop Chrome), 1280x720

## Steps to reproduce
1. Open `/#/product/5` (Slip Joint Pliers, $9.17), type quantity 2, click "Add to cart".
2. Open the cart (`/#/checkout`).

## Expected
The line's Total column shows $18.34 (2 × $9.17).

## Actual
The line total shows "$00.00" for every line and quantity. The cart total at the bottom is correct ($18.34), so the customer sees contradictory numbers.

## Evidence
- Failing test: `cart.spec.ts` > "each cart line shows unit price times quantity" (expected "$18.34", received "$00.00").
- Exploration: `journeys.md` J1 step 4.
