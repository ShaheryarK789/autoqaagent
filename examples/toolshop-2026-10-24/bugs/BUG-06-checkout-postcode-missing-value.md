# BUG-06 Checkout address step fills the postcode with "missing value"
Severity: major
Area: Checkout
Environment: https://with-bugs.practicesoftwaretesting.com, Chromium (Playwright Desktop Chrome), 1280x720

## Steps to reproduce
1. Sign in as a customer whose profile postcode is 12345.
2. Add any product, open the cart, "Proceed to checkout", then proceed past the sign-in step.

## Expected
The billing address form is prefilled from the profile, postcode 12345.

## Actual
Address, city, state and country are prefilled correctly, but the postcode field contains the literal text "missing value". A customer who does not notice places an order with an invalid billing postcode.

## Evidence
- Failing test: `checkout.spec.ts` > "address step prefills the postcode saved on the customer profile" (received "missing value").
- Exploration: `journeys.md` J1 step 6.
