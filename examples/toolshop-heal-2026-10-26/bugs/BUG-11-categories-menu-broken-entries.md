# BUG-11 Categories menu: "UNDEFINED" and broken entries
Severity: major
Area: Navigation
Environment: https://with-bugs.practicesoftwaretesting.com, Chromium (Playwright Desktop Chrome), 1280x720

## Steps to reproduce
1. Open the header Categories menu.
2. Open each entry.

## Expected
Every entry opens a category page that lists products.

## Actual
The menu has an entry "UNDEFINED" (`#/category/undefined`) that opens a category with no products, and entries "Chainsaws" (`#/chainsaws`) and "Rentals" (`#/rentals`) that point outside the category routes.

## Evidence
- Failing test: `navigation.spec.ts` > "every Categories menu entry opens a category page with products" ("products in category" received 0), in all 3 stability runs.
- Reproduced in the browser on 2026-10-26. Menu links: Hand Tools, Power Tools, UNDEFINED -> #/category/undefined, Chainsaws -> #/chainsaws, Rentals -> #/rentals.
