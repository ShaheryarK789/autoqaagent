---
name: test-design
description: Turn a journey map into a prioritised, risk-rated set of test cases (happy path, edge, negative) and decide what not to test. Use after exploration and before writing Playwright code.
---

# Test design

Input: `runs/<run-id>/journeys.md`. Output: a test plan appended to the same run folder as `test-plan.md`, then specs written with the `playwright-conventions` skill.

## Rate risk first

Score each journey on impact (revenue, trust, data loss) and likelihood (complex logic, calculations, state, responsive layout, third-party input).

| Risk | Typical examples | Coverage |
| --- | --- | --- |
| High | checkout, payment, totals and discounts, login | happy path + key negatives + one edge |
| Medium | search, filters, cart edits, registration, order history | happy path + one negative |
| Low | static content, footer links, marketing sections | one smoke check at most, or skip |

## Case types

- **Happy path:** the journey as a real customer does it, asserting the business outcome (order confirmed with a number, correct total), not just that a page loaded.
- **Negative:** invalid input the app must reject (bad code, declined card, wrong password, empty required fields). Assert the specific message.
- **Edge:** boundaries the app states (free shipping threshold, max quantity, sold-out item, case of search terms, small viewport).

## Assertions that matter

- Assert computed values exactly: subtotal, discount, shipping, total. Recompute the expected value in the test from the prices you saw; do not copy the number the app shows.
- Assert state changes: cart count after add, empty cart after order, history shows the new order.
- For negatives, assert the app refused (message shown, no navigation, nothing charged).

## Skip low-value tests

Do not write tests for: visual styling, copy that changes often, every item in a list, third-party widgets, or anything already covered by another test's steps. Aim for a suite of about 10 to 20 focused tests, not 100 shallow ones.

## `test-plan.md` format

```markdown
| ID | Journey | Case | Type | Risk | Spec file |
| T01 | Checkout | Guest completes checkout with test card | happy | high | checkout.spec.ts |
```

Every row must end up as a real test, or be marked `skipped: <reason>`.
