# BUG-11 Categories menu: "UNDEFINED" opens an empty category, "Chainsaws" opens a 404
Severity: major
Area: Navigation
Environment: https://with-bugs.practicesoftwaretesting.com, Chromium (Playwright Desktop Chrome), 1280x720

## Steps to reproduce
1. Open `/#/`, click "Categories" in the header.
2. Click "UNDEFINED", then reopen the menu and click "Chainsaws".

## Expected
Each entry has a real category name and opens a category page with its products (Hand Tools and Power Tools do).

## Actual
- The third entry is labelled "UNDEFINED" and links to `/#/category/undefined`; the page shows "Category: Undefined" and the API returns 0 products (`by_category_slug=undefined`).
- The fourth entry is labelled "Chainsaws" and links to `/#/chainsaws`, which shows "404 Error / Page Not Found".
Two of the four category entries are dead ends.

## Evidence
- Failing test: `navigation.spec.ts` > "every Categories menu entry opens a category page with products", step "Categories > UNDEFINED" (0 products).
- Exploration: `journeys.md` J9.
