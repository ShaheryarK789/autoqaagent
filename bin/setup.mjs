#!/usr/bin/env node
// One-time setup for a checkout of this repo:
//   npm run setup                          install the push safety check
//   npm run setup -- --sites <git-url>     also connect the private repo for site work
//
// The safety check is a git pre-push hook that refuses to push site test work
// (site/* branches, generated tests, run reports) to the agent repo.

import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();

if (!existsSync(path.join(ROOT, '.git'))) {
  console.error('This folder is not a git checkout. Clone the repo with git first.');
  process.exit(1);
}

const hooksDir = path.join(ROOT, '.git', 'hooks');
mkdirSync(hooksDir, { recursive: true });
const target = path.join(hooksDir, 'pre-push');
// Unix line endings, whatever git did on checkout: sh rejects CRLF.
writeFileSync(target, readFileSync(path.join(ROOT, 'hooks', 'pre-push'), 'utf8').replaceAll('\r\n', '\n'));
chmodSync(target, 0o755);
console.log('Safety check installed: site test work cannot be pushed to the agent repo.');

const flag = process.argv.indexOf('--sites');
const url = flag >= 0 ? process.argv[flag + 1] : undefined;
const remotes = git('remote').split(/\r?\n/).filter(Boolean);
if (url) {
  if (remotes.includes('sites')) git('remote', 'set-url', 'sites', url);
  else git('remote', 'add', 'sites', url);
  console.log(`Private repo for site work connected as "sites": ${url}`);
} else if (remotes.includes('sites')) {
  console.log(`Private repo for site work: ${git('remote', 'get-url', 'sites')}`);
} else {
  console.log('No private repo for site work yet. Add one with: npm run setup -- --sites <git-url>');
}
