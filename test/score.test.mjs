import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { renderScore, scoreRun } from '../bin/score.mjs';

const key = {
  app: 'Shop',
  url: 'https://shop.test',
  source: 'https://example.test/bugs.md',
  categories: { functional: 'What users see', security: 'Attacks' },
  bugs: [
    { id: 1, page: 'cart', label: 'Total is zero', category: 'functional' },
    { id: 2, page: 'cart', label: 'Delete is disabled', category: 'functional' },
    { id: 3, page: 'home', label: 'Typo', category: 'functional' },
    { id: 4, page: 'API', label: 'SQL injection', category: 'security' },
  ],
};

const matchesOf = (matches, extra = {}) => ({ method: 'by hand', coverage: 'one run', matches, ...extra });

describe('scoreRun', () => {
  test('counts found bugs overall and per category', () => {
    const score = scoreRun(key, matchesOf([
      { report: 'BUG-01', planted: [{ id: 1, fit: 'exact' }] },
      { report: 'BUG-02', planted: [{ id: 3, fit: 'partial' }] },
    ]), ['BUG-01', 'BUG-02']);
    assert.equal(score.total, 4);
    assert.equal(score.found, 2);
    assert.equal(score.partial, 1);
    assert.deepEqual(score.foundIds, [1, 3]);
    assert.deepEqual(score.missed.map((bug) => bug.id), [2, 4]);
    assert.deepEqual(score.byCategory.map(({ category, total, found, partial }) => [category, total, found, partial]), [
      ['functional', 3, 2, 1],
      ['security', 1, 0, 0],
    ]);
  });

  test('a bug found by two reports counts once, as exact if either is exact', () => {
    const score = scoreRun(key, matchesOf([
      { report: 'BUG-01', planted: [{ id: 1, fit: 'partial' }] },
      { report: 'BUG-02', planted: [{ id: 1, fit: 'exact' }] },
      { report: 'BUG-03', planted: [{ id: 1, fit: 'partial' }] },
    ]), ['BUG-01', 'BUG-02', 'BUG-03']);
    assert.equal(score.found, 1);
    assert.equal(score.partial, 0);
  });

  test('a report that matches no planted bug lowers the matched-report count', () => {
    const score = scoreRun(key, matchesOf([
      { report: 'BUG-01', planted: [{ id: 1, fit: 'exact' }] },
      { report: 'BUG-02', planted: [] },
    ]), ['BUG-01', 'BUG-02']);
    assert.equal(score.reports, 2);
    assert.equal(score.reportsMatched, 1);
  });

  test('every bug report must be accounted for', () => {
    const matches = matchesOf([{ report: 'BUG-01', planted: [{ id: 1, fit: 'exact' }] }]);
    assert.throws(() => scoreRun(key, matches, ['BUG-01', 'BUG-02']), /missing from matches.json: BUG-02/);
    assert.throws(() => scoreRun(key, matches, []), /reports the run does not have: BUG-01/);
  });

  test('rejects unknown bug IDs, fits and duplicate reports', () => {
    assert.throws(() => scoreRun(key, matchesOf([{ report: 'BUG-01', planted: [{ id: 99, fit: 'exact' }] }]), ['BUG-01']), /not in the answer key/);
    assert.throws(() => scoreRun(key, matchesOf([{ report: 'BUG-01', planted: [{ id: 1, fit: 'close' }] }]), ['BUG-01']), /use exact or partial/);
    const twice = matchesOf([{ report: 'BUG-01', planted: [] }, { report: 'BUG-01', planted: [] }]);
    assert.throws(() => scoreRun(key, twice, ['BUG-01']), /listed twice/);
  });

  test('rejects a broken answer key', () => {
    const duplicate = { ...key, bugs: [...key.bugs, key.bugs[0]] };
    assert.throws(() => scoreRun(duplicate, matchesOf([]), []), /same bug ID twice/);
    const badCategory = { ...key, bugs: [{ id: 1, page: 'x', label: 'y', category: 'nope' }] };
    assert.throws(() => scoreRun(badCategory, matchesOf([]), []), /unknown category/);
  });
});

describe('renderScore', () => {
  test('states the headline, the table and the missed user-facing bugs', () => {
    const matches = matchesOf(
      [{ report: 'BUG-01', planted: [{ id: 1, fit: 'exact' }] }],
      { not_on_list: [{ report: 'BUG-01', finding: 'Also a broken banner' }] },
    );
    const markdown = renderScore(scoreRun(key, matches, ['BUG-01']), { key, matches });
    assert.ok(markdown.includes('**1 of 4 planted bugs found (25%)**'));
    assert.ok(markdown.includes('| What users see | 3 | 1 | 33% |'));
    assert.ok(markdown.includes('- 2: Delete is disabled (cart)'));
    assert.ok(!markdown.includes('SQL injection'), 'security bugs are out of reach, so not listed as missed');
    assert.ok(markdown.includes('- BUG-01: Also a broken banner'));
  });
});

describe('the published Toolshop answer key', () => {
  const real = JSON.parse(readFileSync(new URL('../benchmarks/toolshop/answer-key.json', import.meta.url), 'utf8'));

  test('lists bugs 1 to 94, each in a known category', () => {
    assert.deepEqual(real.bugs.map((bug) => bug.id), Array.from({ length: 94 }, (_, i) => i + 1));
    for (const bug of real.bugs) assert.ok(real.categories[bug.category], `bug ${bug.id}: ${bug.category}`);
  });

  test('pins the source list to one commit', () => {
    assert.match(real.source, /\/blob\/[0-9a-f]{40}\//);
  });
});
