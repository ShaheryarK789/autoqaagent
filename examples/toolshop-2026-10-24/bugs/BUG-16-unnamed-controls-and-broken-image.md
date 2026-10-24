# BUG-16 Unnamed buttons and a broken image
Severity: minor
Area: Accessibility
Environment: https://with-bugs.practicesoftwaretesting.com, Chromium (Playwright browser tools), 1280x720

## Steps to reproduce
1. Open `/#/` and check the console / network: `/broken.png` returns 404.
2. Open a product page and inspect the quantity "-" and "+" buttons.
3. In checkout step 3 inspect the proceed button.

## Expected
Every image loads; every button has an accessible name.

## Actual
- The home page requests `https://with-bugs.practicesoftwaretesting.com/broken.png`, which returns 404.
- The quantity decrease/increase buttons, the cart delete control and the checkout step-3 proceed button have no accessible name (screen readers announce just "button").

Note: icon glyphs are also missing in this environment because `cdnjs.cloudflare.com` (Font Awesome) is blocked by the test origin lock; that part is environmental, not an app bug.

## Evidence
- Found during exploration (`journeys.md` routes table, J1). Not automated.
