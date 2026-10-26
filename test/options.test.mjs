import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { excludedPaths, extraOrigins, makeRedactor, parseArgs, runLimits, stabilityRuns } from '../bin/options.mjs';

describe('parseArgs', () => {
  test('reads the command, valued flags and bare flags', () => {
    const { command, opts } = parseArgs(['generate', '--url', 'https://shop.test', '--headed', '--model', 'm1']);
    assert.equal(command, 'generate');
    assert.deepEqual(opts, { url: 'https://shop.test', headed: true, model: 'm1' });
  });

  test('a flag followed by another flag is a bare flag', () => {
    assert.deepEqual(parseArgs(['heal', '--panel', '--headed']).opts, { panel: true, headed: true });
  });

  test('defaults to help with no arguments', () => {
    assert.equal(parseArgs([]).command, 'help');
  });
});

describe('extraOrigins', () => {
  test('turns hosts and URLs into origins, with any separator', () => {
    const env = { ALLOWED_ORIGINS: 'api.shop.test, https://cdn.shop.test/assets/x.js;http://localhost:3000' };
    assert.deepEqual(extraOrigins(env), ['https://api.shop.test', 'https://cdn.shop.test', 'http://localhost:3000']);
  });

  test('is empty when unset', () => {
    assert.deepEqual(extraOrigins({}), []);
  });

  test('rejects an entry that is not a host', () => {
    assert.throws(() => extraOrigins({ ALLOWED_ORIGINS: 'https://' }), /invalid entry/);
  });
});

describe('excludedPaths', () => {
  test('nothing is excluded unless listed, so admin areas stay in scope', () => {
    assert.deepEqual(excludedPaths({}), []);
    assert.deepEqual(excludedPaths({ EXCLUDED_PATHS: '' }), []);
  });

  test('splits a list of routes', () => {
    assert.deepEqual(excludedPaths({ EXCLUDED_PATHS: '/internal, /api/billing' }), ['/internal', '/api/billing']);
  });

  test('rejects a route without a leading slash', () => {
    assert.throws(() => excludedPaths({ EXCLUDED_PATHS: 'admin' }), /must start with "\/"/);
  });
});

describe('runLimits', () => {
  test('uses the command defaults', () => {
    assert.deepEqual(runLimits('generate', {}, {}), { minutes: 60, turns: 500 });
    assert.deepEqual(runLimits('check-login', {}, {}), { minutes: 5, turns: 40 });
  });

  test('a flag beats the setting, and turns are whole numbers', () => {
    const env = { MAX_MINUTES: '90', MAX_TURNS: '800' };
    assert.deepEqual(runLimits('heal', { 'max-turns': '250.7' }, env), { minutes: 90, turns: 250 });
  });

  test('rejects zero, negative and non-numeric limits', () => {
    for (const value of ['0', '-5', 'abc']) {
      assert.throws(() => runLimits('generate', {}, { MAX_MINUTES: value }), /MAX_MINUTES must be a number above 0/);
    }
  });
});

describe('stabilityRuns', () => {
  test('defaults to 3 runs', () => {
    assert.equal(stabilityRuns({}, {}), 3);
  });

  test('1 switches the check off and a flag beats the setting', () => {
    assert.equal(stabilityRuns({}, { STABILITY_RUNS: '1' }), 1);
    assert.equal(stabilityRuns({ 'stability-runs': '5' }, { STABILITY_RUNS: '1' }), 5);
  });

  test('rejects fractions and values below 1', () => {
    for (const value of ['0', '2.5', 'many']) {
      assert.throws(() => stabilityRuns({}, { STABILITY_RUNS: value }), /whole number/);
    }
  });
});

describe('makeRedactor', () => {
  test('replaces secret values with their names', () => {
    const redact = makeRedactor({ TEST_USERNAME: 'qa@shop.test', TEST_PASSWORD: 's3cret!' });
    assert.equal(redact('typed qa@shop.test and s3cret! twice: s3cret!'), 'typed [TEST_USERNAME] and [TEST_PASSWORD] twice: [TEST_PASSWORD]');
  });

  test('also catches a value as it appears inside JSON', () => {
    const redact = makeRedactor({ TEST_PASSWORD: 'pa"ss\\word' });
    const line = JSON.stringify({ text: 'pa"ss\\word' });
    assert.equal(redact(line), '{"text":"[TEST_PASSWORD]"}');
  });

  test('replaces the longer secret first when one contains the other', () => {
    const redact = makeRedactor({ TEST_USERNAME: 'admin', TEST_PASSWORD: 'admin123' });
    assert.equal(redact('admin123 / admin'), '[TEST_PASSWORD] / [TEST_USERNAME]');
  });

  test('leaves text alone when no test account is set', () => {
    assert.equal(makeRedactor({})('nothing to hide'), 'nothing to hide');
  });
});
