# BUG-08 Header user menu reads "User Data not found" for a signed-in customer
Severity: minor
Area: Account / header
Environment: https://with-bugs.practicesoftwaretesting.com, Chromium (Playwright Desktop Chrome), 1280x720

## Steps to reproduce
1. Sign in as any customer.
2. Look at the user menu in the header.

## Expected
The menu shows the customer's name ("Qa Tester"), as the checkout and contact pages do ("Hello Qa Tester").

## Actual
The menu label is "User Data not found".

## Evidence
- Failing test: `account.spec.ts` > "the header user menu shows the customer name" (received " User Data not found ").
