# BUG-10 Registration form: "State" and "Country" labels are swapped
Severity: minor
Area: Registration / accessibility
Environment: https://with-bugs.practicesoftwaretesting.com, Chromium (Playwright Desktop Chrome), 1280x720

## Steps to reproduce
1. Open `/#/auth/register`.
2. Look at the fields labelled "Country" and "State".

## Expected
"Country" labels the country dropdown; "State" labels the free-text state field.

## Actual
The label "Country" is attached to the state text field (placeholder "Your state *") and "State" is attached to the country dropdown. Screen-reader users hear the wrong field name, and sighted users type a country into the state box.

## Evidence
- Failing test: `auth.spec.ts` > "the Country and State labels point at the right fields" (no combobox named "Country").
