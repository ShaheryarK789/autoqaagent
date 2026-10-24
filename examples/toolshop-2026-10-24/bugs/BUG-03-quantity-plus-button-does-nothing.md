# BUG-03 Product page "+" quantity button does nothing
Severity: major
Area: Product / add to cart
Environment: https://with-bugs.practicesoftwaretesting.com, Chromium (Playwright Desktop Chrome), 1280x720

## Steps to reproduce
1. Open `/#/product/5` (Slip Joint Pliers). Quantity shows 1.
2. Click the "+" (increase quantity) button, once or several times.

## Expected
Quantity increases to 2, 3, ...

## Actual
Quantity stays at 1. Adding to cart then adds a single item. Typing a number in the field works, so only the button is broken.

## Evidence
- Failing test: `cart.spec.ts` > "the + button raises the quantity on the product page" (expected "2", received "1").
- Screenshot: `test-results/cart-Cart-the-button-raises-the-quantity-on-the-product-page-desktop/test-failed-1.png` (latest run).
