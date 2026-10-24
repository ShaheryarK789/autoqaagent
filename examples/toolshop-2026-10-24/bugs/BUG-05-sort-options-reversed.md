# BUG-05 All sort options sort in the opposite direction
Severity: major
Area: Catalogue / sort
Environment: https://with-bugs.practicesoftwaretesting.com, Chromium (Playwright Desktop Chrome), 1280x720

## Steps to reproduce
1. Open `/#/`.
2. Choose "Price (Low - High)" in the sort dropdown.
3. Repeat with "Price (High - Low)", "Name (A - Z)", "Name (Z - A)".

## Expected
Low - High lists the cheapest first; A - Z lists names alphabetically.

## Actual
Every option is inverted. "Price (Low - High)" sends `sort=price,desc` and lists $125.23, $119.24, ... first; "Price (High - Low)" lists $4.92 first; "Name (A - Z)" sends `sort=name,desc` and starts with Wood Saw; "Name (Z - A)" starts with Adjustable Wrench.

## Evidence
- Failing tests: `catalog.spec.ts` > '"Price (Low - High)" lists the cheapest products first' (received descending prices 125.23 ... 46.5) and '"Name (A - Z)" lists products alphabetically'.
- Exploration: `journeys.md` J7 (request URLs).
