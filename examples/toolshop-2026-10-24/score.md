# Score against the planted bugs: Toolshop (with bugs)

The maintainers of [Toolshop (with bugs)](https://with-bugs.practicesoftwaretesting.com) list 94 bugs they planted on purpose ([their list](https://github.com/testsmith-io/practice-software-testing/blob/7766cb71f564c63c2a7f99180a46f089e0527199/sprint5-with-bugs/testSessions/listOfBugs.md)). This compares the run's bug reports with that list.

**24 of 94 planted bugs found (26%)**, 2 of them partial matches. **16 of 16 bug reports** describe at least one planted bug.

| Kind of bug | Planted | Found | Found share |
| --- | --- | --- | --- |
| Behaviour, data and text a user sees in the app | 42 | 21 (1 partial) | 50% |
| Problems visible in the API responses the app itself loads | 4 | 2 (1 partial) | 50% |
| Labels, alt text, contrast and keyboard order | 11 | 1 | 9% |
| Pixel-level layout, or only in Firefox or Edge | 27 | 0 | 0% |
| Needs deliberate attacks or crafted API calls | 9 | 0 | 0% |
| Only visible in emails the app sends | 1 | 0 | 0% |

How this was scored: Each bug report was compared by hand with the maintainers' list after the run. "exact": the report describes that planted bug. "partial": it describes part of it, or the list's wording is too short to be sure.

What the run covered: One run: Chromium on desktop and a Pixel 7 screen, through the app's own pages and the API calls they make. No Firefox or Edge, no pixel comparison, no attack payloads, no email.

## Missed: user-facing and API bugs

These were in reach of the run and were not reported.

- 1: Cart plus and minus buttons do not change the quantity (cart)
- 7: Delete button is disabled (checkout cart)
- 13: No pagination with more than 15 invoices (invoice list)
- 14: Payment method shows 'not found' text (invoice)
- 15: City and country are swapped (invoice)
- 16: Address fields show 'undefined' (invoice)
- 17: Email and password are not validated (login)
- 21: Account locks after one failed attempt (login)
- 25: Email format is not checked (forgot password)
- 28: Logo is a broken image (home)
- 30: Search icon is a broken image (home)
- 38: Saving address changes gives an error (profile)
- 39: Changed password is stored unhashed and stops working (profile)
- 47: No more than 10 pieces can be added (product)
- 50: Duplicate registration reveals a password hint (registration)
- 51: Accented and special characters in names are rejected (registration)
- 54: Typo in the phone placeholder (registration)
- 62: Typo in the message placeholder (contact)
- 68: PDF upload is refused (contact)
- 69: JPG upload is refused (contact)
- 70: An empty file can be uploaded (contact)
- 75: Product responses reveal internal stock details (API products)
- 82: IDs are sequential and easy to guess (API)

## Found but not on the list

The run also reported these. They are not on the maintainers' list, so they are not counted, and they have not been checked against the bug-free version of the app.

- BUG-11: A Categories menu entry labelled "UNDEFINED" opens an empty category
- BUG-13: Every payment method asks for the same bank account fields
- BUG-15: Placeholder brand names "Brand name 1" to "Brand name 10"
- BUG-16: The home page requests /broken.png, which returns 404. It is probably planted bug 28 or 30, but the report does not say which image, so it is not counted
