# BUG-16 Unnamed form controls and a broken image
Severity: minor
Area: Accessibility
Environment: https://with-bugs.practicesoftwaretesting.com, Chromium (Playwright Desktop Chrome), 1280x720

Found while exploring, not by a test.

## Steps to reproduce
1. Open the catalogue and inspect it with a screen reader or the accessibility tree.
2. Open a product page and look at the quantity buttons.

## Expected
Every control has an accessible name and every image loads.

## Actual
- The search text box and the sort drop-down have no accessible name.
- The quantity "-" and "+" buttons on product pages have no text or aria-label.
- The header logo requests `/broken.png`, which returns 404.

## Evidence
Browser on 2026-10-26: snapshot shows `textbox` and `combobox` with no name. The product page buttons `decrease-quantity` and `increase-quantity` have empty text and no aria-label. Network: `GET /broken.png => 404`.
