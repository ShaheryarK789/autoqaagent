# BUG-15 Typos, placeholder brand names and error strings shown as options
Severity: minor
Area: Content (site-wide)
Environment: https://with-bugs.practicesoftwaretesting.com, Chromium (Playwright browser tools), 1280x720

## Steps to reproduce
Browse the home page, a product page, checkout and the contact form.

## Expected
Correct, finished copy.

## Actual
- Header link "Contakt" (Contact); home headings "Sorth" (Sort) and button "Serch" (Search); product page heading "Reltded products"; checkout heading "Blliling Adress".
- Brand filter and product pages show placeholder brands "Brand name 1" to "Brand name 10".
- Contact subject list offers "Error 101: Subject not found" and "Error 202: Translation error" as subjects.

## Evidence
- Found during exploration (`journeys.md` routes table, J1, J10). Not automated (copy checks are low value; see test plan "Not tested").
