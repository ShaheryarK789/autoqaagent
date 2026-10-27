#!/usr/bin/env node
// Compares a Playwright run with a list of tests expected to fail (each on a
// known bug). A suite that proves real bugs is never all green, so "did it
// pass" is the wrong question for CI. The right one is "did anything change":
//   - a test outside the list failed, or gave mixed results: a new problem;
//   - a test on the list passed: the bug may be fixed, so update the list.
//     Entries marked "intermittent" may pass or fail: the bug does not always show.
// Either one exits with 1. No AI involved.
//
//   node bin/check-results.mjs <expected-failures.json> [results.json]
//   (results.json defaults to playwright-report/results.json)

import { appendFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Every test in a Playwright JSON report as { test, outcome }, outcome one of passed, failed, flaky, skipped. */
export function testOutcomes(report) {
  const out = [];
  const walk = (suite) => {
    for (const child of suite.suites ?? []) walk(child);
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests) {
        const file = path.basename(spec.file.replaceAll('\\', '/'));
        const outcome =
          test.status === 'flaky' ? 'flaky'
          : test.status === 'skipped' ? 'skipped'
          : test.results.at(-1)?.status === 'passed' ? 'passed'
          : 'failed';
        out.push({ test: `${test.projectName} > ${file} > ${spec.title}`, outcome });
      }
    }
  };
  for (const suite of report.suites ?? []) walk(suite);
  return out;
}

/** What changed compared with the expected failures. `ok` is true when nothing did. */
export function compareResults(outcomes, expected) {
  const expectedTests = new Set(expected.failures.map((f) => f.test));
  const byTest = new Map(outcomes.map((o) => [o.test, o.outcome]));
  const result = {
    newFailures: outcomes.filter((o) => o.outcome === 'failed' && !expectedTests.has(o.test)).map((o) => o.test),
    flaky: outcomes.filter((o) => o.outcome === 'flaky').map((o) => o.test),
    nowPassing: expected.failures.filter((f) => !f.intermittent && byTest.get(f.test) === 'passed'),
    missing: expected.failures.filter((f) => !byTest.has(f.test)),
    counts: {
      tests: outcomes.length,
      passed: outcomes.filter((o) => o.outcome === 'passed').length,
      expectedFailures: outcomes.filter((o) => o.outcome === 'failed' && expectedTests.has(o.test)).length,
    },
  };
  result.ok = !result.newFailures.length && !result.flaky.length && !result.nowPassing.length && !result.missing.length;
  return result;
}

/** The result as Markdown, for the console and the GitHub job summary. */
export function describeResult(result) {
  const { tests, passed, expectedFailures } = result.counts;
  const lines = [
    result.ok ? '## No change: only the known failures' : '## Something changed',
    '',
    `${tests} tests: ${passed} passed, ${expectedFailures} failed for a known reason.`,
  ];
  const list = (title, items) => {
    if (items.length) lines.push('', `**${title}**`, ...items.map((item) => `- ${item}`));
  };
  list('New failures (not on the expected list):', result.newFailures);
  list('Flaky (passed only on a retry):', result.flaky);
  list('Expected to fail but passed (bug fixed? update the list):', result.nowPassing.map((f) => `${f.test} (${f.reason})`));
  list('On the expected list but not in this run:', result.missing.map((f) => f.test));
  return lines.join('\n') + '\n';
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [expectedFile, resultsFile = path.join(ROOT, 'playwright-report', 'results.json')] = process.argv.slice(2);
  if (!expectedFile) {
    console.error('Usage: node bin/check-results.mjs <expected-failures.json> [results.json]');
    process.exit(1);
  }
  const expected = JSON.parse(readFileSync(expectedFile, 'utf8'));
  const result = compareResults(testOutcomes(JSON.parse(readFileSync(resultsFile, 'utf8'))), expected);
  const text = describeResult(result);
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, text);
  process.exit(result.ok ? 0 : 1);
}
