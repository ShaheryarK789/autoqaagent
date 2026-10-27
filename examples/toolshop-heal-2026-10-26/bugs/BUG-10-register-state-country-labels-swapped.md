# BUG-10 Registration form: "State" and "Country" labels are swapped
Severity: minor
Area: Registration / accessibility
Environment: https://with-bugs.practicesoftwaretesting.com, Chromium (Playwright Desktop Chrome), 1280x720

## Steps to reproduce
1. Open `/#/auth/register`.
2. Look at the State and Country fields.

## Expected
"Country" labels the country drop-down and "State" labels the free-text state field.

## Actual
The free-text field (placeholder "Your state *") is labelled "Country", and the country drop-down is labelled "State". Screen-reader users and anyone going by the labels fill the wrong field.

## Evidence
- Failing test: `auth.spec.ts` > "the Country and State labels point at the right fields" (no combobox named "Country"), in all 3 stability runs.
- Reproduced in the browser on 2026-10-26: `state(INPUT) label="Country"`, `country(SELECT) label="State"`.
