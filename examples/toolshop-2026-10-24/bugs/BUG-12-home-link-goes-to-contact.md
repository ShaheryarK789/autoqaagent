# BUG-12 Header "Home" link opens the Contact page
Severity: minor
Area: Navigation
Environment: https://with-bugs.practicesoftwaretesting.com, Chromium (Playwright Desktop Chrome), 1280x720

## Steps to reproduce
1. Open any page, e.g. `/#/contact`.
2. Click "Home" in the header menu.

## Expected
The catalogue home page `/#/` opens.

## Actual
The link's href is `#/contact`; the user stays on (or is taken to) the Contact page. Only the logo leads home.

## Evidence
- Failing test: `navigation.spec.ts` > "the header Home link opens the catalogue" (URL stays `.../#/contact`).
