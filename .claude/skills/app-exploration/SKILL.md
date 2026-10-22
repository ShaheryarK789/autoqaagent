---
name: app-exploration
description: How to explore an unfamiliar web app systematically with the Playwright browser tools and produce a journey map. Use at the start of any explore or generate run, before writing tests.
---

# App exploration

Goal: in as few browser actions as practical, understand what the app is for, which user journeys matter, and what data and rules they depend on. Output a journey map, not tests.

## Method

1. **Orient (1 to 3 actions).** Open the target root. Read the snapshot, not screenshots, unless layout matters. Note: app type, main navigation, global elements (header, search, cart, account), banners that describe rules (test cards, discount codes, shipping thresholds).
2. **Inventory the navigation.** List every top-level route reachable from the header and footer. Visit each once. Do not follow every product or item; sample one or two per list.
3. **Walk the money path first.** For a store: browse, product, add to cart, cart, checkout, confirmation. For other apps: the path that creates the thing the business sells. Complete it end to end once with test data.
4. **Then the supporting journeys.** Search, filters and sorting, sign in, register, account and history, error pages.
5. **Probe rules, lightly.** Where the app states a rule (free shipping over X, a discount code, a sold-out state, required fields), try the obvious edge once: the invalid code, the empty form, the sold-out item. Record what happened.
6. **Check one small viewport pass** of the cart or checkout if the app is responsive (resize to 390x844), because layout-dependent logic is a common bug source.

## Rules of the road

- **Avoid loops.** Keep a visited list of routes. Do not re-open a route unless you are completing a journey.
- **Do not log out mid-journey.** Sign in only when a journey needs it, and sign out at the end of that journey.
- **Handle login** with credentials the app or task provides. If none exist, register a new throwaway account with an `@example.test` email.
- **With a provided test account** (the task names the secrets `TEST_USERNAME` and `TEST_PASSWORD`): map the signed-out app first, then sign in once by typing the secret names into the sign-in form, and explore everything behind the login in that one session. Record the sign-in form's fields and the element that proves you are signed in; the tests need both. Treat the account as shared: do not change its password, email or security settings, and do not delete it. If sign-in demands a CAPTCHA, a one-time code or an email link, stop and record it as a blocker.
- **Know when to stop.** Stop exploring when every navigation route is visited, the money path is complete, and each stated rule has been probed once. Exploration should rarely need more than about 40 browser actions.
- **Prefer semantics.** Record elements by role and accessible name (button "Add to cart", link "Cart, 2 items", textbox "Email"), because tests will use `getByRole` and `getByLabel`.

## Output: `runs/<run-id>/journeys.md`

```markdown
# Journey map: <app name>

## App summary
One paragraph: what it is, who uses it, key rules observed.

## Routes
| Route | Purpose | Key elements (role: name) |

## Journeys
### J1 <name> (risk: high|medium|low)
Steps with the exact accessible names used.
Observed result.

## Rules and test data
Codes, cards, accounts, thresholds, limits the app states. Refer to a provided test account as "the test account (TEST_USERNAME)", never by its real values.

## Anomalies seen
Anything that looked wrong while exploring, with steps. These become bug candidates.
```
