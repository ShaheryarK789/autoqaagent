#!/usr/bin/env node
// Scores a run against an app's answer key: the list of bugs its maintainers
// planted on purpose. The run folder holds matches.json, which says which
// planted bugs each of the agent's bug reports describes (matched by hand
// after the run). This writes score.md next to it. No AI involved.
//
//   node bin/score.mjs <run-folder>        e.g. examples/toolshop-2026-10-24

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FITS = ['exact', 'partial'];

const percent = (n, d) => (d ? `${Math.round((n / d) * 100)}%` : 'n/a');

/**
 * Count what the run found. `reportIds` are the bug reports the run wrote
 * (BUG-01, ...); every one must appear in the matches, so none is left out of
 * the count by accident. A planted bug matched by several reports counts once,
 * as "exact" if any report fits it exactly.
 */
export function scoreRun(key, matches, reportIds) {
  const planted = new Map(key.bugs.map((bug) => [bug.id, bug]));
  if (planted.size !== key.bugs.length) throw new Error('The answer key lists the same bug ID twice.');
  for (const bug of key.bugs) {
    if (!key.categories[bug.category]) throw new Error(`Bug ${bug.id} has an unknown category: ${bug.category}`);
  }

  const fitOf = new Map(); // planted id -> best fit
  const listed = new Set();
  for (const match of matches.matches) {
    if (listed.has(match.report)) throw new Error(`${match.report} is listed twice in matches.json.`);
    listed.add(match.report);
    for (const { id, fit } of match.planted) {
      if (!planted.has(id)) throw new Error(`${match.report} matches bug ${id}, which is not in the answer key.`);
      if (!FITS.includes(fit)) throw new Error(`${match.report} gives bug ${id} the fit "${fit}"; use exact or partial.`);
      if (fitOf.get(id) !== 'exact') fitOf.set(id, fit);
    }
  }
  const unlisted = reportIds.filter((id) => !listed.has(id));
  if (unlisted.length) throw new Error(`Bug reports missing from matches.json: ${unlisted.join(', ')}`);
  const unknown = [...listed].filter((id) => !reportIds.includes(id));
  if (unknown.length) throw new Error(`matches.json names reports the run does not have: ${unknown.join(', ')}`);

  const byCategory = Object.entries(key.categories).map(([category, description]) => {
    const bugs = key.bugs.filter((bug) => bug.category === category);
    return {
      category,
      description,
      total: bugs.length,
      found: bugs.filter((bug) => fitOf.has(bug.id)).length,
      partial: bugs.filter((bug) => fitOf.get(bug.id) === 'partial').length,
    };
  });

  return {
    total: key.bugs.length,
    found: fitOf.size,
    partial: [...fitOf.values()].filter((fit) => fit === 'partial').length,
    byCategory,
    foundIds: [...fitOf.keys()].sort((a, b) => a - b),
    missed: key.bugs.filter((bug) => !fitOf.has(bug.id)),
    reports: reportIds.length,
    reportsMatched: matches.matches.filter((match) => match.planted.length).length,
    notOnList: matches.not_on_list ?? [],
  };
}

/** The score as Markdown. */
export function renderScore(score, { key, matches }) {
  const rows = score.byCategory
    .filter((row) => row.total)
    .map((row) => `| ${row.description} | ${row.total} | ${row.found}${row.partial ? ` (${row.partial} partial)` : ''} | ${percent(row.found, row.total)} |`);
  const missed = score.missed
    .filter((bug) => bug.category === 'functional' || bug.category === 'api')
    .map((bug) => `- ${bug.id}: ${bug.label} (${bug.page})`);
  const extra = score.notOnList.map((item) => `- ${item.report}: ${item.finding}`);

  return `# Score against the planted bugs: ${key.app}

The maintainers of [${key.app}](${key.url}) list ${score.total} bugs they planted on purpose ([their list](${key.source})). This compares the run's bug reports with that list.

**${score.found} of ${score.total} planted bugs found (${percent(score.found, score.total)})**, ${score.partial} of them partial matches. **${score.reportsMatched} of ${score.reports} bug reports** describe at least one planted bug.

| Kind of bug | Planted | Found | Found share |
| --- | --- | --- | --- |
${rows.join('\n')}

How this was scored: ${matches.method}

What the run covered: ${matches.coverage}

## Missed: user-facing and API bugs

These were in reach of the run and were not reported.

${missed.join('\n') || '- none'}

## Found but not on the list

The run also reported these. They are not on the maintainers' list, so they are not counted, and they have not been checked against the bug-free version of the app.

${extra.join('\n') || '- none'}
`;
}

function reportIdsIn(runDir) {
  const dir = path.join(runDir, 'bugs');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .map((file) => file.match(/^(BUG-\d+)\b.*\.md$/)?.[1])
    .filter(Boolean)
    .sort();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const runDir = process.argv[2] && path.resolve(process.argv[2]);
  const matchesFile = runDir && path.join(runDir, 'matches.json');
  if (!matchesFile || !existsSync(matchesFile)) {
    console.error('Usage: node bin/score.mjs <run-folder>   (the folder needs a matches.json)');
    process.exit(1);
  }
  const matches = JSON.parse(readFileSync(matchesFile, 'utf8'));
  const key = JSON.parse(readFileSync(path.join(ROOT, matches.answer_key), 'utf8'));
  const score = scoreRun(key, matches, reportIdsIn(runDir));
  writeFileSync(path.join(runDir, 'score.md'), renderScore(score, { key, matches }));
  console.log(`${score.found} of ${score.total} planted bugs found (${score.partial} partial); ${score.reportsMatched} of ${score.reports} reports match a planted bug.`);
  for (const row of score.byCategory) console.log(`  ${row.category.padEnd(14)} ${row.found} / ${row.total}`);
  console.log(`Score: ${path.relative(ROOT, path.join(runDir, 'score.md')).split(path.sep).join('/')}`);
}
