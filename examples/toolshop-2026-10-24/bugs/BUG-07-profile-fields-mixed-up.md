# BUG-07 Profile shows first and last name swapped and City "City not found"
Severity: major
Area: Account / profile
Environment: https://with-bugs.practicesoftwaretesting.com, Chromium (Playwright Desktop Chrome), 1280x720

## Steps to reproduce
1. Register with first name "Qa", last name "Tester", city "Testville"; sign in.
2. Open My profile (`/#/account/profile`).

## Expected
First Name "Qa", Last Name "Tester", City "Testville" (the `GET /users/me` response holds exactly these values).

## Actual
First Name shows "Tester", Last Name shows "Qa", City shows "City not found". Because this is an edit form, pressing "Update Profile" would save the wrong values back.

## Evidence
- Failing test: `account.spec.ts` > "the profile shows the customer own name and city" (First Name expected "Qa", received "Tester").
- Exploration: `journeys.md` J5 (API response correct, UI wrong).
