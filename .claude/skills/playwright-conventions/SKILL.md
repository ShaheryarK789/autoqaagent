---
name: playwright-conventions
description: House style for the Playwright tests this agent writes - Page Object Model, role-based locators, no hard waits, naming, fixtures and a template spec. Use whenever writing or editing files in generated-tests/.
---

# Playwright conventions

## Structure

- `generated-tests/pages/<name>.page.ts`: one class per page or major component. Locators are readonly properties; actions are async methods named for user intent (`addToCart`, `applyDiscount`). No assertions inside page objects, except `waitFor` style readiness checks.
- `generated-tests/fixtures.ts`: extends `test` with page-object fixtures and exports `expect`. Specs import from here, never from `@playwright/test` directly.
- `generated-tests/specs/<area>.spec.ts`: one file per journey area. `test.describe('<Area>')`, test titles read as behaviour: `completes checkout as a guest with the test card`.
- `generated-tests/data.ts`: test data the app advertises (accounts, cards, codes, prices used in expectations).

## Locators, in order of preference

1. `page.getByRole('button', { name: 'Add to cart' })`, with `exact: true` when a name is a prefix of another.
2. `page.getByLabel('Email')` for form fields.
3. `page.getByText(...)` for messages, scoped to a region when possible.
4. `page.getByTestId(...)` only when the app provides a test id and no accessible name is stable (for example computed totals).
5. Never CSS classes, XPath, or nth-child. They break on every redesign.

Scope with `.filter({ hasText })` or a parent locator instead of `.nth()` when lists repeat.

## Waiting

- Never `waitForTimeout`. Use web-first assertions (`await expect(locator).toHaveText(...)`) and `page.waitForURL(...)`.
- After an action that triggers a server round trip, assert the visible result it produces.

## Isolation

- Each test starts from a fresh context (Playwright default) and builds its own state through the UI or a fixture. No test depends on another test's order.
- Use unique emails for registration: `` `qa+${Date.now()}@example.test` ``.

## Authentication (only when the task provides a test account)

Sign in once, save the session, and reuse it. Do not sign in through the UI in every test.

- `generated-tests/auth.setup.ts` signs in with the test account and saves the session. The config picks this file up automatically and runs it before the other projects.
- Credentials come from `process.env.TEST_USERNAME` and `process.env.TEST_PASSWORD` only. Never write the values, or a fallback default, into any file.
- Export `AUTH_FILE = '.auth/user.json'` from `fixtures.ts`. A spec that needs to be signed in opts in with `test.use({ storageState: AUTH_FILE })` at the top of its `describe`. Specs without it start signed out, which the sign-in, registration and access-control tests need.
- Keep one test that signs in through the form itself (in the sign-in spec), so a broken login page fails a named test and not just the setup.
- The test account is shared between tests running in parallel. Do not change its password or profile, and do not assert on data other tests may add (order counts, history length); assert on what your own test created.

```ts
// generated-tests/auth.setup.ts
import { test as setup, expect } from '@playwright/test';
import { LoginPage } from './pages/auth.page';
import { AUTH_FILE } from './fixtures';

setup('sign in with the test account', async ({ page }) => {
  const username = process.env.TEST_USERNAME;
  const password = process.env.TEST_PASSWORD;
  if (!username || !password) throw new Error('Set TEST_USERNAME and TEST_PASSWORD in .env');

  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.signIn(username, password);
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible(); // whatever proves it in this app
  await page.context().storageState({ path: AUTH_FILE });
});
```

## Template

```ts
// generated-tests/specs/checkout.spec.ts
import { test, expect } from '../fixtures';
import { CARDS } from '../data';

test.describe('Checkout', () => {
  test('completes checkout as a guest with the test card', async ({ productPage, cartPage, checkoutPage, page }) => {
    await productPage.open('canvas-tote');
    await productPage.addToCart({ quantity: 2 });
    await cartPage.open();
    await cartPage.proceedToCheckout();
    await checkoutPage.fillContact('buyer@example.test');
    await checkoutPage.fillShipping({ /* ... */ });
    await checkoutPage.fillCard(CARDS.success);
    await checkoutPage.submit();
    await page.waitForURL(/\/order\//);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('confirmed');
  });
});
```

## Before you finish

Run `npx playwright test` and read the result. A red test is either a test mistake (fix it) or a real bug (keep it red, mark it with `test.fail()` and a comment linking the bug report only if the task says to keep the suite green; otherwise leave it failing and report it).
