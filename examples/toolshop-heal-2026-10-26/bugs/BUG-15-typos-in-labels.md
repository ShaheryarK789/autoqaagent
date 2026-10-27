# BUG-15 Typos in visible labels
Severity: minor
Area: Content (site-wide)
Environment: https://with-bugs.practicesoftwaretesting.com, Chromium (Playwright Desktop Chrome), 1280x720

Found while exploring, not by a test.

## Steps to reproduce
1. Open the catalogue and look at the header menu, the sort heading and the search button.

## Expected
"Contact", "Sort", "Search".

## Actual
"Contakt" (header menu), "Sorth" (sort heading), "Serch" (search button).

## Evidence
Browser snapshot on 2026-10-26: `menuitem "Contakt"`, `heading "Sorth" [level=4]`, `button "Serch"`.
