# Stability check: the Toolshop suite, run 3 times without the AI

The agent's run on 2026-10-24 stopped before its own 3-run stability check, so its report has no flaky count. This finishes that check. The suite in [`suite/`](suite/) is exactly as the agent wrote it. It was run 3 times in a row on 2026-10-26 with `npx playwright test`, with no file changed in between and no AI involved, against https://with-bugs.practicesoftwaretesting.com with 2 browsers at once (`WORKERS=2`).

| Run | Passed | Failed | Time |
| --- | --- | --- | --- |
| 1 | 16 | 15 | 2 min 16 s |
| 2 | 16 | 15 | 2 min 28 s |
| 3 | 16 | 15 | 2 min 23 s |

**Flaky tests: 0.** Every one of the 31 tests gave the same result in all 3 runs.

## The 15 failures

**13 caught a reported bug.** They are the same 13 tests that failed in the agent's run, each on the bug it was written to prove (see the [report](report.md)).

**2 fail because placing an order failed on the shop's server:**

- `checkout.spec.ts` > "signed-in customer buys two items by bank transfer and gets an invoice number"
- `checkout.spec.ts` > "a newly placed order appears in My invoices"

Both passed in the agent's run. Now the payment step succeeds (`POST /payment/check` returns 200), but placing the order fails: `POST /invoices` returns **500**, so no confirmation appears and the test times out waiting for it. Running only the first test, alone with 1 browser, gave the same 500, so the cause was not load from the suite. Nothing in the tests changed between the two dates.

**Correction, later the same day:** the failure is intermittent, not permanent. In the [self-repair run](../toolshop-heal-2026-10-26/heal-report.md) that followed, the agent placed orders by hand. Ten went through and others failed with the same 500, in stretches of several minutes. It reported this as a bug, BUG-17: a valid order is sometimes rejected and the customer is shown nothing. It is not on the maintainers' list of planted bugs, so it is not counted in the [score](score.md).

The tests are left as they are. They check the right behaviour, an order that goes through, so they pass whenever the shop accepts the order.

## Re-running the suite yourself

Copy `suite/` into `generated-tests/`, set `TARGET_URL=https://with-bugs.practicesoftwaretesting.com` in `.env` (and `WORKERS=2`, since the shop is a shared public server), then run `npm test`. No AI and no account are needed: the suite registers its own throwaway customer.
