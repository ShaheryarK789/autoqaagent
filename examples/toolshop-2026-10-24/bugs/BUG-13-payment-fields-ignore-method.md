# BUG-13 Payment step asks for bank account details for every method and offers a broken method
Severity: major
Area: Checkout / payment
Environment: https://with-bugs.practicesoftwaretesting.com, Chromium (Playwright browser tools), 1280x720

## Steps to reproduce
1. Signed in, add a product, proceed through checkout to the Payment step.
2. Choose "Cash on Delivery", then "Credit Card", then "Gift Card".
3. Open the payment method list.

## Expected
Fields depend on the method: nothing extra for Cash on Delivery, card fields for Credit Card, a gift card number and code for Gift Card. Only working methods are offered.

## Actual
Every method shows the same two required fields, "Your Account name *" and "Your Account number *", and "Confirm" stays disabled until they are filled. A Cash on Delivery customer must invent a bank account. The list also offers "Errror 304 - Missing Payment Gateway" as a selectable method.

## Evidence
- Found during exploration (`journeys.md` J1 step 7); not automated (low value once reported; the bank-transfer happy path is covered by `checkout.spec.ts`).
