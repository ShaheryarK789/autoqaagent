# BUG-05 Sort options sort in the opposite direction
Severity: major
Area: Catalogue / sort
Environment: https://with-bugs.practicesoftwaretesting.com, Chromium (Playwright Desktop Chrome), 1280x720

## Steps to reproduce
1. Open the catalogue.
2. Choose "Price (Low - High)" in the sort list. Separately, choose "Name (A - Z)".

## Expected
Cheapest products first; names in A to Z order.

## Actual
"Price (Low - High)" sends `sort=price,desc` and lists $125.23, $119.24, $100.79, $80.19 first. "Name (A - Z)" lists names in reverse order.

## Evidence
- Failing tests: `catalog.spec.ts` > "\"Price (Low - High)\" lists the cheapest products first" and "\"Name (A - Z)\" lists products alphabetically", in all 3 stability runs.
- Reproduced in the browser on 2026-10-26: request query `sort=price,desc&between=price,1&page=0`.
