// Per-site settings. Each tested site has its own file, `.env.<site>`, next to
// the shared `.env`. The site is chosen by, in order:
//   1. the --site flag (passed in here as `flag`);
//   2. the AUTOQA_SITE environment variable (the runner sets it for the
//      processes it starts);
//   3. the git branch: on `site/myshop` the site is `myshop`.
// Used by both the runner and playwright.config.ts so they always agree.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const SITE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** The checked-out branch, or null (detached HEAD, not a git checkout). */
export function currentBranch(root) {
  try {
    const head = readFileSync(path.join(root, '.git', 'HEAD'), 'utf8').trim();
    const match = head.match(/^ref: refs\/heads\/(.+)$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/** Which site this run is for, and how that was decided. */
export function resolveSite({ root, flag } = {}) {
  const fromBranch = currentBranch(root)?.match(/^site\/(.+)$/)?.[1].replaceAll('/', '-');
  const [name, source] =
    typeof flag === 'string' && flag ? [flag, 'flag']
    : process.env.AUTOQA_SITE ? [process.env.AUTOQA_SITE, 'env']
    : fromBranch ? [fromBranch, 'branch']
    : [null, null];
  if (name && !SITE_NAME.test(name)) throw new Error(`Invalid site name: ${name}`);
  return { name, source };
}

function parse(file) {
  const values = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    const [, key, raw] = match;
    const quoted = raw.match(/^(["'`])(.*)\1$/);
    values[key] = quoted ? quoted[2] : raw;
  }
  return values;
}

/**
 * Load `.env.<site>` and then the shared `.env` into process.env. The site
 * file wins over the shared one, and anything already in the environment
 * (set on the command line, or by the runner) wins over both.
 */
export function loadSiteEnv({ root, flag } = {}) {
  const site = resolveSite({ root, flag });
  const siteFile = site.name ? path.join(root, `.env.${site.name}`) : null;
  const hasSiteFile = Boolean(siteFile && existsSync(siteFile));

  // An explicit choice must exist; a branch name is only a hint.
  if (site.name && !hasSiteFile && site.source !== 'branch') {
    throw new Error(`No settings file for site "${site.name}". Create .env.${site.name} (copy .env.example).`);
  }

  const sharedFile = path.join(root, '.env');
  for (const file of [hasSiteFile ? siteFile : null, existsSync(sharedFile) ? sharedFile : null]) {
    if (!file) continue;
    for (const [key, value] of Object.entries(parse(file))) {
      // A blank line such as `LOGIN_URL=` means "not set".
      if (value !== '' && process.env[key] === undefined) process.env[key] = value;
    }
  }
  if (hasSiteFile) process.env.AUTOQA_SITE = site.name;

  return {
    site: hasSiteFile ? site.name : null,
    file: hasSiteFile ? `.env.${site.name}` : null,
    source: site.source,
    // On a site branch with no settings file yet: worth a warning.
    missing: site.name && !hasSiteFile ? `.env.${site.name}` : null,
  };
}
