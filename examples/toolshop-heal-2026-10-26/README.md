# Self-repair run on Toolshop, 2026-10-26

This run tests `npm run heal`: when a suite breaks, can the agent tell a test that needs repairing from an app that is broken, and fix only the first?

## What was broken on purpose

Toolshop's code cannot be changed, so a UI change was simulated in the suite instead. Starting from the [suite the agent wrote on 2026-10-24](../toolshop-2026-10-24/suite), three locators were renamed by hand, as if the shop had once used these names and later changed them. These three lines are the whole change:

```diff
 // pages/product.page.ts
-    this.addToCartButton = page.getByRole('button', { name: 'Add to cart' });
+    this.addToCartButton = page.getByRole('button', { name: 'Add to basket' });
 // pages/catalog.page.ts
-    this.searchBox = page.getByTestId('search-query');
+    this.searchBox = page.getByTestId('search-input');
 // pages/contact.page.ts
-    this.send = page.getByRole('button', { name: 'Send' });
+    this.send = page.getByRole('button', { name: 'Send message' });
```

The agent was told only that the suite had been green on an earlier version of the app and the app had changed since. It was not told what was renamed, or how many locators were.

## What the agent did

- **It repaired exactly the three renamed locators.** Each fix is in the page object, not the specs, and each is backed by what the live page shows. One fix is slightly stricter than the original (`exact: true` on Send). No other line of the suite changed.
- **It did not touch the 13 tests that fail on real bugs.** It reproduced each bug in the browser with a fresh customer and left its test failing.
- **It did not "fix" the 2 checkout tests either.** Placing an order sometimes fails on the server (HTTP 500) with no message to the customer. To tell this apart from a test fault, it placed orders by hand (10 went through, 2 failed the same way), then reported it as a bug (BUG-17).
- **It counted 4 flaky tests and changed none of them.** The shop stopped serving pages for a stretch of the first stability run. A retry or a longer wait would have hidden that, so it reported the cause instead (BUG-18).

Final count: 31 tests, 16 passed, 15 failed, every failure on a reported bug. The full reasoning, with before-and-after locators and evidence for each failure, is in the [heal report](heal-report.md), also available as one [HTML page](report.html).

## Run details

- About 46 minutes and 118 agent turns, run with `node bin/autoqa.mjs heal --site toolshop`, headless, against https://with-bugs.practicesoftwaretesting.com. The time limit for this site had been raised in its settings file.
- BUG-17 and BUG-18 are not on the maintainers' list of planted bugs, so they do not change the [score](../toolshop-2026-10-24/score.md).
- The files here are as the agent wrote them. The run's raw event log is not published because it contains local file paths.
