# BUG-07 Profile shows first and last name swapped and City "City not found"
Severity: major
Area: Account / profile
Environment: https://with-bugs.practicesoftwaretesting.com, Chromium (Playwright Desktop Chrome), 1280x720

## Steps to reproduce
1. Register as First name "Qa", Last name "Tester", City "Testville", and sign in.
2. Open My profile.

## Expected
First Name "Qa", Last Name "Tester", City "Testville".

## Actual
First Name "Tester", Last Name "Qa", City "City not found". `/users/me` returns the correct values, so the page maps them wrongly.

## Evidence
- Failing test: `account.spec.ts` > "the profile shows the customer own name and city", in all 3 stability runs.
- Reproduced in the browser on 2026-10-26: `first-name=Tester, last-name=Qa, city=City not found, postcode=12345`.
