# BUG-02 Profile API sends the password hash to the browser
Severity: major
Area: Account / security
Environment: https://with-bugs.practicesoftwaretesting.com, Chromium (Playwright Desktop Chrome), 1280x720

## Steps to reproduce
1. Sign in as any customer.
2. Open My profile. The page calls `GET /users/me`.

## Expected
The response has no `password` field.

## Actual
The response includes `password` with the stored hash.

## Evidence
- Failing test: `account.spec.ts` > "the profile data sent to the browser does not include the password hash", in all 3 stability runs.
- Reproduced in the browser on 2026-10-26 with a fresh customer: `/users/me` contains a `password` field. The value is not copied here.
