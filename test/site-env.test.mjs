import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, test } from 'node:test';
import { currentBranch, loadSiteEnv, resolveSite } from '../bin/site-env.mjs';

const KEYS = ['AUTOQA_SITE', 'TARGET_URL', 'LOGIN_URL', 'MAX_TURNS', 'TEST_USERNAME'];
let root;
let saved;

// A throwaway checkout: .git/HEAD on the given branch plus the given files.
function checkout(branch, files = {}) {
  mkdirSync(path.join(root, '.git'), { recursive: true });
  writeFileSync(path.join(root, '.git', 'HEAD'), branch ? `ref: refs/heads/${branch}\n` : 'a1b2c3d4\n');
  for (const [name, text] of Object.entries(files)) writeFileSync(path.join(root, name), text);
}

beforeEach(() => {
  root = mkdtempSync(path.join(os.tmpdir(), 'autoqa-site-env-'));
  saved = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));
  for (const key of KEYS) delete process.env[key];
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe('currentBranch', () => {
  test('reads the branch, and null for a detached HEAD or no checkout', () => {
    checkout('site/shop');
    assert.equal(currentBranch(root), 'site/shop');
    checkout(null);
    assert.equal(currentBranch(root), null);
    assert.equal(currentBranch(path.join(root, 'missing')), null);
  });
});

describe('resolveSite', () => {
  test('the flag beats AUTOQA_SITE, which beats the branch', () => {
    checkout('site/from-branch');
    assert.deepEqual(resolveSite({ root }), { name: 'from-branch', source: 'branch' });
    process.env.AUTOQA_SITE = 'from-env';
    assert.deepEqual(resolveSite({ root }), { name: 'from-env', source: 'env' });
    assert.deepEqual(resolveSite({ root, flag: 'from-flag' }), { name: 'from-flag', source: 'flag' });
  });

  test('a nested site branch becomes one name', () => {
    checkout('site/team/shop');
    assert.equal(resolveSite({ root }).name, 'team-shop');
  });

  test('rejects a site name that could escape the folder', () => {
    checkout('main');
    assert.throws(() => resolveSite({ root, flag: '../secrets' }), /Invalid site name/);
  });
});

describe('loadSiteEnv', () => {
  test('the site file beats .env, and the environment beats both', () => {
    checkout('main', {
      '.env': 'TARGET_URL=https://shared.test\nMAX_TURNS=100\nLOGIN_URL=https://shared.test/login\n',
      '.env.shop': '# a comment\nTARGET_URL="https://shop.test"\nMAX_TURNS = 200 \n',
    });
    process.env.MAX_TURNS = '300';
    const result = loadSiteEnv({ root, flag: 'shop' });
    assert.deepEqual(result, { site: 'shop', file: '.env.shop', source: 'flag', missing: null });
    assert.equal(process.env.TARGET_URL, 'https://shop.test');
    assert.equal(process.env.LOGIN_URL, 'https://shared.test/login');
    assert.equal(process.env.MAX_TURNS, '300');
    assert.equal(process.env.AUTOQA_SITE, 'shop');
  });

  test('a blank value means not set', () => {
    checkout('main', { '.env': 'LOGIN_URL=\nTEST_USERNAME=   \n' });
    loadSiteEnv({ root });
    assert.equal(process.env.LOGIN_URL, undefined);
    assert.equal(process.env.TEST_USERNAME, undefined);
  });

  test('an explicit site with no settings file is an error', () => {
    checkout('main');
    assert.throws(() => loadSiteEnv({ root, flag: 'nowhere' }), /No settings file for site "nowhere"/);
  });

  test('a site branch with no settings file only warns', () => {
    checkout('site/new-shop', { '.env': 'TARGET_URL=https://shared.test\n' });
    const result = loadSiteEnv({ root });
    assert.equal(result.missing, '.env.new-shop');
    assert.equal(result.site, null);
    assert.equal(process.env.TARGET_URL, 'https://shared.test');
  });
});
