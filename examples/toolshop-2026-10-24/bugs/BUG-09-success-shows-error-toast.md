# BUG-09 Successful add to cart / add to favourites shows an error toast
Severity: minor
Area: Product
Environment: https://with-bugs.practicesoftwaretesting.com, Chromium (Playwright Desktop Chrome), 1280x720

## Steps to reproduce
1. Open `/#/product/5` and click "Add to cart".
2. (Signed in) open `/#/product/2` and click "Add to favourites".

## Expected
A success confirmation.

## Actual
A red toast "Oeps, something went wrong." appears, although the cart badge goes to 1 and `POST /favorites` returns 201 and the favourite is listed. Customers are told the action failed when it succeeded, and may add the item again.

## Evidence
- Failing test: `cart.spec.ts` > "adding to the cart does not report an error" (toast text " Oeps, something went wrong. ").
- Exploration: `journeys.md` J1 step 3, J11.
