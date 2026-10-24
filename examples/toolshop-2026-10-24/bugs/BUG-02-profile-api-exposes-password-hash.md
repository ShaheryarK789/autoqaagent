# BUG-02 Profile API sends the password hash to the browser
Severity: major
Area: Account / security
Environment: https://with-bugs.practicesoftwaretesting.com, Chromium (Playwright Desktop Chrome), 1280x720

## Steps to reproduce
1. Sign in as any customer.
2. Open My profile (`/#/account/profile`).
3. Inspect the `GET /users/me` response.

## Expected
The response carries profile fields only; no password or password hash ever leaves the server.

## Actual
The response includes a `password` field holding the account's password hash (64 hex characters), plus `failed_login_attempts`. Anyone with access to the browser (XSS, shared machine, proxy logs) gets an offline-crackable hash.

## Evidence
- Failing test: `account.spec.ts` > "the profile data sent to the browser does not include the password hash" (`expect(me).not.toHaveProperty('password')` fails).
- Exploration: `journeys.md` J5.
