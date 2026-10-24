# BUG-14 Price range filter ignores its upper bound
Severity: minor
Area: Catalogue / filters
Environment: https://with-bugs.practicesoftwaretesting.com, Chromium (Playwright browser tools), 1280x720

## Steps to reproduce
1. Open `/#/`. The Price Range slider shows 1 to 100.
2. Sort by price so the most expensive products are on page 1.

## Expected
Only products priced 1 to 100 are listed.

## Actual
Products at $100.79, $119.24 and $125.23 are listed. Every product request sends `between=price,1` with no upper value, so the maximum is never applied.

## Evidence
- Found during exploration (`journeys.md` J8, request URLs). Not automated: the slider is a drag-only widget (test plan T29).
