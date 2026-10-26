import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, test } from 'node:test';
import { bugMeta, buildHtmlReport, summaryCounts } from '../bin/report-html.mjs';

let base;

// A run folder with the given files; `id` ends in -generate or -heal like real runs.
function run(id, files) {
  const dir = path.join(base, id);
  mkdirSync(path.join(dir, 'bugs'), { recursive: true });
  for (const [name, text] of Object.entries(files)) writeFileSync(path.join(dir, name), text);
  return dir;
}

const build = (dir) => readFileSync(buildHtmlReport(dir), 'utf8');

beforeEach(() => {
  base = mkdtempSync(path.join(os.tmpdir(), 'autoqa-report-'));
});

afterEach(() => {
  rmSync(base, { recursive: true, force: true });
});

describe('summaryCounts', () => {
  test('prefers the exact counts in summary.json', () => {
    const dir = run('20261024-101500-generate', {
      'summary.json': JSON.stringify({ tests: 31, passed: 18, failed: 13, failed_on_bugs: 13, flaky: 0, bugs: 16, bugs_from_tests: 12, stability_runs: 3 }),
    });
    assert.deepEqual(summaryCounts(dir, '| Passed | 1 |\n| Failed | 1 |', false), {
      tests: 31, passed: 18, failed: 13, flaky: 0, stabilityRuns: 3, failedOnBugs: 13, bugsFromTests: 12,
    });
  });

  test('without summary.json, reads the summary table', () => {
    const dir = run('20261001-090000-generate', {});
    const markdown = '| Metric | Count |\n| --- | --- |\n| Tests | 25 |\n| Passed | 21 |\n| Failed | 4 |\n| Flaky | 0 |';
    assert.deepEqual(summaryCounts(dir, markdown, false), { tests: 25, passed: 21, failed: 4, flaky: 0 });
  });

  test('a repair report uses its closing "N passed, M failed" statement', () => {
    const dir = run('20261001-090000-heal', {});
    const markdown = '| | Passed | Failed |\n| Passed | 16 | 9 |\n| Failed | 9 | 0 |\n\nFinal result: 19 passed, 6 failed.';
    assert.deepEqual(summaryCounts(dir, markdown, true), { tests: 25, passed: 19, failed: 6, flaky: null });
  });

  test('a broken summary.json falls back to the text', () => {
    const dir = run('20261001-090000-generate', { 'summary.json': '{ not json' });
    assert.equal(summaryCounts(dir, 'Result: 3 passed and 1 failed', false).passed, 3);
  });

  test('is null when nothing states the counts', () => {
    assert.equal(summaryCounts(run('20261001-090000-generate', {}), 'No tests ran.', false), null);
  });
});

describe('bugMeta', () => {
  test('reads the title and severity, with or without bold', () => {
    assert.deepEqual(bugMeta('# BUG-01 Cart total is zero\n**Severity:** Major\n'), { title: 'BUG-01 Cart total is zero', severity: 'major' });
    assert.deepEqual(bugMeta('# BUG-02 Typo\nSeverity: minor'), { title: 'BUG-02 Typo', severity: 'minor' });
  });

  test('falls back when the report has no title or severity', () => {
    assert.deepEqual(bugMeta('just text'), { title: 'Bug', severity: null });
  });
});

describe('buildHtmlReport', () => {
  test('returns null for a run with no report', () => {
    assert.equal(buildHtmlReport(run('20261001-090000-generate', {})), null);
  });

  test('shows raw HTML from the app under test as text, never as markup', () => {
    const dir = run('20261001-090000-generate', { 'report.md': '# Report\n\nThe page showed <script>alert(1)</script> in a banner.\n' });
    const html = build(dir);
    assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
    assert.ok(!html.includes('<script>alert(1)</script>'));
  });

  test('turns links to bug files into in-page links, and drops other local links', () => {
    const dir = run('20261001-090000-generate', {
      'report.md': '# Report\n\n- [BUG-01](bugs/BUG-01-cart-total.md)\n- [notes](../../secret/notes.md)\n- [docs](https://playwright.dev)\n',
      'bugs/BUG-01-cart-total.md': '# BUG-01 Cart total\nSeverity: major\n',
    });
    const html = build(dir);
    assert.ok(html.includes('href="#bug-BUG-01-cart-total"'));
    assert.ok(html.includes('<a href="#">notes</a>'));
    assert.ok(html.includes('href="https://playwright.dev"'));
    assert.ok(html.includes('id="bug-BUG-01-cart-total"'));
    assert.ok(html.includes('<span class="badge major">major</span>'));
  });

  test('a test that failed on a reported bug is shown as "caught a bug", not failed', () => {
    const dir = run('20261024-101500-generate', {
      'report.md': '# Report\n',
      'summary.json': JSON.stringify({ tests: 10, passed: 7, failed: 3, failed_on_bugs: 2, flaky: 0, bugs: 2, bugs_from_tests: 1, stability_runs: 3 }),
      'bugs/BUG-01-a.md': '# BUG-01 A\n',
      'bugs/BUG-02-b.md': '# BUG-02 B\n',
    });
    const html = build(dir);
    assert.match(html, /<div class="n warn">2<\/div><div class="l">Tests caught a bug<\/div>/);
    assert.match(html, /<div class="n fail">1<\/div><div class="l">Failed, not a bug yet<\/div>/);
    assert.match(html, /<div class="l">Flaky in 3 runs<\/div>/);
    assert.ok(html.includes('1 by tests + 1 while exploring'));
  });

  test('no "Failed" tile when every failure caught a bug', () => {
    const dir = run('20261024-101500-generate', {
      'report.md': '# Report\n',
      'summary.json': JSON.stringify({ tests: 5, passed: 4, failed: 1, failed_on_bugs: 1, flaky: null, bugs: 1, bugs_from_tests: 1, stability_runs: 1 }),
    });
    const html = build(dir);
    assert.ok(html.includes('Test caught a bug'));
    assert.ok(!html.includes('Failed, not a bug yet'));
    assert.ok(!html.includes('Flaky'));
  });

  test('a repair run keeps a "Still failing" tile', () => {
    const dir = run('20261001-090000-heal', { 'heal-report.md': '# Repair\n\nFinal: 24 passed, 1 failed.\n' });
    const html = build(dir);
    assert.ok(html.includes('Self-healing run'));
    assert.match(html, /<div class="n fail">1<\/div><div class="l">Still failing<\/div>/);
  });
});
