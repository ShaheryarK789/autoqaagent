---
name: failure-triage
description: Classify a failing test or an unexpected app behaviour as broken locator, timing, test data, test logic, or real bug, with evidence. Use whenever a generated test fails or the app does something surprising during exploration.
---

# Failure triage

A failing test is a question, not an instruction to change the test. Answer it with evidence before touching any file.

## Classify

| Class | Signature | Action |
| --- | --- | --- |
| Broken locator | Element not found, but the same control exists with a different name, role or position, and doing the step manually still works | Fix the locator (self-healing). Behaviour unchanged. |
| Timing | Passes on retry, or the element appears shortly after | Replace the wait with a web-first assertion on the result. Never add a sleep. |
| Test data | Depends on stock, an account, a code or state that changed | Fix the data or create it inside the test. |
| Test logic | The test asserts something the app never promised | Fix the test, and note why in the report. |
| **Real bug** | The app contradicts its own stated rules, the journey cannot be completed, or a value is computed wrongly | **Do not change the test.** Write a bug report. |

## Evidence required

Reproduce the step in the browser tools and look at the snapshot before deciding. State in one line each: what the test expected, what the app did, and which rule or promise that breaks. Give a confidence from 0 to 100 percent.

Treat it as a real bug when any of these hold, even if a locator also changed:
- a number is wrong (total, discount, shipping, stock, count);
- the app accepts something it says it rejects, or rejects something it says it accepts;
- the behaviour differs by viewport or input case when nothing says it should.

If confidence is below 80 percent for anything other than a real bug, report it as needs review instead of changing the test.

## Stability check

One green run proves little: a test that passes by luck will fail next week. When the task asks for a stability check, do it after the suite is written and every failure is triaged.

1. Run the full suite the number of times the task gives, one after another. Change no file between runs.
2. After each run, read `playwright-report/results.json` and note every test's result. The file is overwritten by the next run.
3. Compare the runs and put each test in one group:

| Group | Result across the runs | Action |
| --- | --- | --- |
| Stable pass | Passed every time | None. |
| Consistent failure | Failed every time, the same way | It must already be a reported bug. If it is not, triage it now. |
| Flaky | Passed in some runs, failed in others | Triage it. The cause is almost always timing or test data shared between tests. Fix the test, never with a sleep or a retry. |

4. If you changed any file, the earlier runs no longer count: start the runs again from the first.
5. Stop when a full set of runs needs no change. If a test is still flaky after two attempts to fix it, leave it, count it as flaky and say why in the report.

A test that fails differently from run to run because the app itself misbehaves at random is a real bug, not a flaky test: report it and say how often it happened.

In the report, write a Stability section: how many runs, and how many tests were stable passes, consistent failures and flaky, plus what you fixed along the way.

## Bug report: `runs/<run-id>/bugs/BUG-<nn>-<slug>.md`

```markdown
# BUG-01 <short title>
Severity: critical | major | minor
Area: <journey>
Environment: <URL>, <browser>, <viewport>

## Steps to reproduce
1. ...
## Expected
## Actual
## Evidence
Screenshot path, failing test name, relevant snapshot excerpt.
```
