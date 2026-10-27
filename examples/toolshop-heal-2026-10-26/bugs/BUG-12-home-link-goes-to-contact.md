# BUG-12 Header "Home" link opens the Contact page
Severity: minor
Area: Navigation
Environment: https://with-bugs.practicesoftwaretesting.com, Chromium (Playwright Desktop Chrome), 1280x720

## Steps to reproduce
1. Open any page and click "Home" in the header.

## Expected
The catalogue (`#/`) opens.

## Actual
The Contact page opens. The link's href is `#/contact`.

## Evidence
- Failing test: `navigation.spec.ts` > "the header Home link opens the catalogue", in all 3 stability runs.
- Reproduced in the browser on 2026-10-26: Home link href `#/contact`.
