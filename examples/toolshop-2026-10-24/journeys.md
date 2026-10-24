# Journey map: Practice Software Testing - Toolshop (v5.0 "with bugs")

## App summary
An Angular single-page tool shop (hash routing, `/#/...`) used for software-testing training. Visitors browse a catalogue of hand tools, power tools and rentals (27 products over 3 pages of 9), search, sort and filter by category, brand, price and eco-friendliness, add to a cart, and check out through a 4-step wizard (Cart, Sign in, Address, Payment) that produces an invoice. Customers can register, sign in, manage profile, favourites, invoices and messages, and use a contact form. The front end talks to the API at `api-with-bugs.practicesoftwaretesting.com`. The banner says "Bug Hunting Mode": the build contains deliberate defects. Almost every interactive element carries a stable `data-test` attribute.

No test account was given in the task and the app does not advertise one, so I registered a throwaway account with an `@example.test` email. A self-registered customer has role `user`; no admin area is reachable from that role, so admin pages were not explored (see "Not explored").

## Routes
| Route | Purpose | Key elements (role: name / data-test) |
| --- | --- | --- |
| `/#/` | Catalogue home | combobox sort (`sort`), sliders "ngx-slider"/"ngx-slider-max", textbox search (`search-query`), button "Serch" (`search-submit`), button "X" (`search-reset`), checkboxes per category and brand, checkbox "Show only eco-friendly products", product card links (`product-<id>`), navigation "Pagination" |
| `/#/product/:id` | Product detail | heading level 1 product name (`product-name`), `unit-price`, buttons `decrease-quantity`/`increase-quantity` (no accessible name), spinbutton `quantity`, button "Add to cart" (`add-to-cart`), button "Add to favourites" (`add-to-favorites`), "Reltded products" list, `out-of-stock` badge |
| `/#/category/hand-tools`, `/#/category/power-tools` | Category listing | heading "Category: Hand Tools" (`page-title`), product cards |
| `/#/category/undefined` | Linked from Categories > "UNDEFINED" | empty page (bug) |
| `/#/chainsaws` | Linked from Categories > "Chainsaws" | 404 page (bug) |
| `/#/rentals` | Rentals list | heading "Rentals", rental cards (Excavator, ...) |
| `/#/contact` | Contact form | signed out: textboxes First name, Last name, Email address; always: combobox Subject (`subject`), textbox Message (`message`), file Attachment (`attachment`), button "Send" (`contact-submit`) |
| `/#/auth/login` | Sign in | textbox "Your E-mail *" (`email`), textbox "Your password *" (`password`), button "Login" (`login-submit`), `login-error`, links "Register your account", "Forgot your Password?" |
| `/#/auth/register` | Register | `first-name`, `last-name`, `dob` (YYYY-MM-DD), `address`, `postcode`, `city`, `state` (text, labelled "Country"), `country` (select, labelled "State"), `phone`, `email`, `password`, button "Register" (`register-submit`); per-field `<name>-error` |
| `/#/auth/forgot-password` | Password reset | linked, not exercised |
| `/#/checkout` | Cart + checkout wizard | cart table (`product-title`, `product-quantity`, `product-price`, `line-price`, `cart-total`), `proceed-1`; step 2 `proceed-2` ("Hello <name>, you are already logged in"); step 3 heading "Blliling Adress", `address`/`city`/`state`/`country`/`postcode`, `proceed-3`; step 4 `payment-method`, `account-name`, `account-number`, button "Confirm" (`finish`) |
| `/#/account` | My account | heading "My account", buttons Favorites, Profile, Invoices, Messages |
| `/#/account/profile` | Profile + change password | `first-name`, `last-name`, `email`, `phone`, `address`, `postcode`, `city`, `state`, `country`, `update-profile-submit`, `current-password`, `new-password`, `new-password-confirm`, `change-password-submit` |
| `/#/account/favorites` | Favourites | `favorite-<id>`, `product-name`, `delete` |
| `/#/account/invoices` | Order history | heading "Invoices" |
| `/#/account/messages` | Messages | "There are no messages yet..." |

Header: link "Practice Software Testing - Toolshop" (`/`), link "Home" (`nav-home`), button "Categories" (`nav-categories`), link "Contakt" (`nav-contact`), link "Sign in" (`nav-sign-in`), user menu (`nav-user-menu`) with `nav-sign-out`, link "cart" (`nav-cart`) with badge `cart-quantity`. On mobile (390px) a button "Toggle navigation" (`.navbar-toggler`) opens the menu.

## Journeys

### J1 Browse and buy (money path) (risk: high)
1. `/#/` → click product card "Combination Pliers" (`product-1`) → `/#/product/1`, price $14.15.
2. Click `increase-quantity` → quantity stays at 1 (bug B4). Typing 3 into `quantity` works.
3. Click "Add to cart" → badge `cart-quantity` = 1, toast "Oeps, something went wrong." (bug B9) even though the item was added.
4. Click "cart" → `/#/checkout`. Line total `line-price` shows "$00.00" (bug B5); `cart-total` = $14.15. Changing quantity to 3 updates `cart-total` to $42.45 but line total stays "$00.00".
5. "Proceed to checkout" → step 2 sign in (or "Hello Qa Tester, you are already logged in") → `proceed-2`.
6. Step 3 heading "Blliling Adress"; address prefilled from profile but `postcode` is the literal text "missing value" (bug B12). Corrected → `proceed-3`.
7. Step 4: payment methods Bank Transfer, Cash on Delivery, Credit Card, Buy Now Pay Later, Gift Card, "Errror 304 - Missing Payment Gateway". Every method shows the same "Account name"/"Account number" fields (bug B13). Bank Transfer + fake values → "Confirm" → "Payment was successful" → "Confirm" again → "Thanks for your order! Your invoice number is INV-2026000005." Cart badge cleared. Invoice total 42.45 is correct.

### J2 Order history (risk: high)
`/#/account/invoices` after J1 shows only the heading "Invoices", no rows (bug B2). The `GET /invoices` response the page receives contains 11 invoices, including invoices belonging to other customers (other user_ids, their billing addresses and payment account names) (bug B1, security).

### J3 Register (risk: high)
1. `/#/auth/register`, click "Register" empty → 11 required-field errors (`first-name-error` ... `password-error`).
2. Fill all fields. Labels for `state` and `country` are swapped (bug B10).
3. Note: setting the `country` select with Playwright `selectOption` leaves the Angular control invalid; selecting via keyboard (focus, ArrowDown, Enter) works. Same for the contact `subject` select. Tests use a keyboard helper.
4. "Register" → `POST /users/register` 201 → redirected to `/#/auth/login`.

### J4 Sign in / sign out (risk: high)
1. Wrong password → `login-error` "Invalid email or password".
2. Correct password → URL becomes `/#/account`, but the login form (with the stale error) stays on screen until a reload (bug B8). Header user menu reads "User Data not found" instead of the user's name (bug B7).
3. User menu → "Sign out" → `/#/auth/login`, "Sign in" link back.

### J5 Profile (risk: medium)
`/#/account/profile` shows First Name = last name and Last Name = first name, and City = "City not found", although `GET /users/me` returns the correct values (bug B6). `GET /users/me` also returns the password hash (bug B3, security). Profile update and change password not exercised (would modify the shared state of the account under test; see test plan).

### J6 Search (risk: medium)
"pliers" + "Serch" → caption "Searched for: pliers", 4 products (Combination Pliers, Long Nose Pliers, Pliers, Slip Joint Pliers). Nonsense term → "0 products found for 'zzqxnothing'". "X" resets.

### J7 Sort (risk: medium)
All four sort options are reversed (bug B11): "Price (Low - High)" sends `sort=price,desc` and lists $125.23 first; "Price (High - Low)" lists $4.92 first; "Name (A - Z)" lists Wood Saw first; "Name (Z - A)" lists Adjustable Wrench first.

### J8 Filters and pagination (risk: medium)
Category checkbox "Hammer" → 7 hammer products (works). Price slider shows 1-100 but products above $100 are listed; the request only sends `between=price,1` (bug B14). Pagination "page 2" works (9 different products).

### J9 Category navigation (risk: medium)
Categories > Hand Tools → "Category: Hand Tools" with 9 products (works). Categories > "UNDEFINED" → `/#/category/undefined`, empty (bug B15). Categories > "Chainsaws" → `/#/chainsaws` 404 page (bug B15). Header link "Home" points to `/#/contact` (bug B16).

### J10 Contact (risk: medium)
Empty "Send" → "Subject is required", "Message is required". Short message → "Message must be minimal 50 characters". Valid subject + 76-char message → no request sent, no confirmation, nothing in Messages (bug B17). Subject list contains "Error 101: Subject not found" and "Error 202: Translation error" (bug B18).

### J11 Favourites (risk: low)
Product 2 → "Add to favourites" → `POST /favorites` 201 but toast "Oeps, something went wrong." (bug B9). `/#/account/favorites` lists "Pliers" (works).

### J12 Out of stock (risk: low)
`/#/product/4` Long Nose Pliers: "Out of stock" badge, "Add to cart" and quantity disabled (works).

### J13 Mobile 390x844 (risk: low)
Hamburger "Toggle navigation" opens the menu with Home, Categories, Contakt, Sign in, cart. Cart total correct. Document is 2px wider than the viewport (cosmetic).

## Rules and test data
- Throwaway accounts: register a fresh `autoqa.<timestamp>@example.test` user per run; no shared test account (TEST_USERNAME) was provided.
- Password rules: a strong password (upper, lower, digit, symbol, 14 chars) was accepted.
- Date of birth format YYYY-MM-DD, required.
- Contact message minimum 50 characters; attachments limited to txt, pdf, jpg.
- Payment: fake Bank Transfer values ("Test Account" / "123456789") are accepted; no real card data needed.
- Product facts used by tests: Combination Pliers (id 1) $14.15; Pliers (id 2) $12.01; Long Nose Pliers (id 4) out of stock; Slip Joint Pliers (id 5) $9.17. 27 products, 9 per page, 3 pages.

## Anomalies seen (bug candidates)
| ID | Summary | Severity guess |
| --- | --- | --- |
| B1 | `GET /invoices` returns other customers' invoices (billing address, payment account) to a new customer | Critical |
| B2 | My invoices page shows no rows although the user has an invoice | High |
| B3 | `GET /users/me` exposes the password hash | High |
| B4 | Product page "+" quantity button does nothing | High |
| B5 | Cart line total always "$00.00" | High |
| B6 | Profile shows first/last name swapped and City "City not found" | Medium |
| B7 | Header user menu says "User Data not found" | Medium |
| B8 | After login the URL changes to /account but the login form stays with a stale error until reload | Medium |
| B9 | Success actions (add to cart, add to favourites) show the error toast "Oeps, something went wrong." | Medium |
| B10 | Register form: "State" and "Country" labels swapped | Medium |
| B11 | All four sort options sort in the opposite direction | Medium |
| B12 | Checkout address postcode prefilled with "missing value" | Medium |
| B13 | Every payment method asks for bank account name/number; junk method "Errror 304 - Missing Payment Gateway" offered | Medium |
| B14 | Price range filter upper bound ignored (products > $100 shown with slider at 100) | Medium |
| B15 | Categories menu items "UNDEFINED" (empty page) and "Chainsaws" (404) | Medium |
| B16 | Header "Home" link points to /contact | Medium |
| B17 | Contact form with valid input never sends and gives no feedback | High |
| B18 | Contact subjects include "Error 101: Subject not found" and "Error 202: Translation error" | Low |
| B19 | Typos: "Contakt", "Sorth", "Serch", "Reltded products", "Blliling Adress"; brand names "Brand name 1..10" | Low |
| B20 | Image `/broken.png` 404 on the home page; quantity +/- buttons and checkout step-3 proceed button have no accessible name | Low |

Blocked hosts (origin lock, not app bugs): `cdnjs.cloudflare.com` (Font Awesome icons) and `static.cloudflareinsights.com` (analytics) are blocked, which removes icon glyphs. The API host `api-with-bugs.practicesoftwaretesting.com` is reachable. Allowing `cdnjs.cloudflare.com` would restore icons.

## Not explored
- Admin / back-office: not reachable with a self-registered customer account and no admin test account was provided.
- Forgot password submission, profile update and change password, file attachments on contact, rental booking, the chat widget, and the "Bug Hunting Guide" (it would hand over the answers).
