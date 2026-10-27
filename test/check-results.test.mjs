import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { compareResults, describeResult, testOutcomes } from '../bin/check-results.mjs';

// The shape of a Playwright JSON report, cut down to what the checker reads.
const spec = (file, title, projectName, statuses, status) => ({
  file,
  title,
  tests: [{ projectName, status: status ?? (statuses.at(-1) === 'passed' ? 'expected' : 'unexpected'), results: statuses.map((s) => ({ status: s })) }],
});
const report = (...specs) => ({ suites: [{ title: 'root', suites: [{ title: 'nested', specs }] }] });

const expected = {
  failures: [
    { test: 'desktop > cart.spec.ts > line total is right', reason: 'BUG-04' },
    { test: 'desktop > checkout.spec.ts > order goes through', reason: 'server 500' },
  ],
};

const baseline = [
  spec('cart.spec.ts', 'line total is right', 'desktop', ['failed']),
  spec('checkout.spec.ts', 'order goes through', 'desktop', ['timedOut']),
  spec('catalog.spec.ts', 'search finds pliers', 'desktop', ['passed']),
  spec('../auth.setup.ts', 'sign in', 'setup', ['passed']),
];

describe('testOutcomes', () => {
  test('names each test by project, file and title, at any depth', () => {
    assert.deepEqual(testOutcomes(report(...baseline)), [
      { test: 'desktop > cart.spec.ts > line total is right', outcome: 'failed' },
      { test: 'desktop > checkout.spec.ts > order goes through', outcome: 'failed' },
      { test: 'desktop > catalog.spec.ts > search finds pliers', outcome: 'passed' },
      { test: 'setup > auth.setup.ts > sign in', outcome: 'passed' },
    ]);
  });

  test('Windows paths name the same test', () => {
    const [outcome] = testOutcomes(report(spec('specs\\cart.spec.ts', 'line total is right', 'desktop', ['failed'])));
    assert.equal(outcome.test, 'desktop > cart.spec.ts > line total is right');
  });

  test('a pass on retry is flaky, and the last attempt decides otherwise', () => {
    const outcomes = testOutcomes(report(
      spec('a.spec.ts', 'retried', 'desktop', ['failed', 'passed'], 'flaky'),
      spec('b.spec.ts', 'failed twice', 'desktop', ['failed', 'failed']),
      spec('c.spec.ts', 'skipped', 'desktop', [], 'skipped'),
    ));
    assert.deepEqual(outcomes.map((o) => o.outcome), ['flaky', 'failed', 'skipped']);
  });
});

describe('compareResults', () => {
  test('ok when exactly the expected tests fail', () => {
    const result = compareResults(testOutcomes(report(...baseline)), expected);
    assert.equal(result.ok, true);
    assert.deepEqual(result.counts, { tests: 4, passed: 2, expectedFailures: 2 });
  });

  test('a failure outside the list is a change', () => {
    const run = [...baseline.slice(0, 2), spec('catalog.spec.ts', 'search finds pliers', 'desktop', ['failed'])];
    const result = compareResults(testOutcomes(report(...run)), expected);
    assert.equal(result.ok, false);
    assert.deepEqual(result.newFailures, ['desktop > catalog.spec.ts > search finds pliers']);
  });

  test('an expected failure that passes is a change: the bug may be fixed', () => {
    const run = [spec('cart.spec.ts', 'line total is right', 'desktop', ['passed']), ...baseline.slice(1)];
    const result = compareResults(testOutcomes(report(...run)), expected);
    assert.equal(result.ok, false);
    assert.deepEqual(result.nowPassing.map((f) => f.reason), ['BUG-04']);
  });

  test('a flaky test is a change, even one on the list', () => {
    const run = [spec('cart.spec.ts', 'line total is right', 'desktop', ['passed', 'failed'], 'flaky'), ...baseline.slice(1)];
    const result = compareResults(testOutcomes(report(...run)), expected);
    assert.equal(result.ok, false);
    assert.deepEqual(result.flaky, ['desktop > cart.spec.ts > line total is right']);
  });

  test('an expected test that did not run is a change, so a renamed test cannot slip through', () => {
    const result = compareResults(testOutcomes(report(...baseline.slice(1))), expected);
    assert.equal(result.ok, false);
    assert.deepEqual(result.missing.map((f) => f.test), ['desktop > cart.spec.ts > line total is right']);
  });
});

test('an intermittent expected failure may pass or fail', () => {
  const flaky = { failures: [{ ...expected.failures[0] }, { ...expected.failures[1], intermittent: true }] };
  const passing = [baseline[0], spec('checkout.spec.ts', 'order goes through', 'desktop', ['passed']), ...baseline.slice(2)];
  assert.equal(compareResults(testOutcomes(report(...passing)), flaky).ok, true);
  assert.equal(compareResults(testOutcomes(report(...baseline)), flaky).ok, true);
  const missing = compareResults(testOutcomes(report(baseline[0], ...baseline.slice(2))), flaky);
  assert.equal(missing.ok, false, 'an intermittent test that did not run is still a change');
});

describe('describeResult', () => {
  test('says plainly whether anything changed, and what', () => {
    assert.match(describeResult(compareResults(testOutcomes(report(...baseline)), expected)), /^## No change/);
    const run = [spec('cart.spec.ts', 'line total is right', 'desktop', ['passed']), ...baseline.slice(1)];
    const text = describeResult(compareResults(testOutcomes(report(...run)), expected));
    assert.match(text, /^## Something changed/);
    assert.match(text, /- desktop > cart.spec.ts > line total is right \(BUG-04\)/);
  });
});
