#!/usr/bin/env node
// autoqa: runs Claude Code headless as a QA agent against a target web app.
//
//   autoqa generate --url <target> [--headed] [--panel] [--model <id>]
//   autoqa heal     --url <target> [--headed] [--panel] [--model <id>]
//   autoqa check-login --url <target> [--headed]
//   autoqa test     [--url <target>]
//
// Settings come from `.env.<site>` plus the shared `.env`. The site is the
// --site flag, or the branch name on a `site/<name>` branch (see site-env.mjs).
//
// Sites that need a login: set TEST_USERNAME and TEST_PASSWORD in .env (and
// LOGIN_URL or --login-url if the sign-in page is not obvious). The values go
// to the browser as secrets and to the test process as environment variables;
// the agent only ever sees their names.
//
// The browser is locked to the target's origin. If the app calls an API or
// loads assets from another host, list those in ALLOWED_ORIGINS in .env (or
// --allow), separated by commas.
//
// Every run has a time limit and a turn limit, so one that gets stuck or loops
// stops by itself. Raise them with MAX_MINUTES and MAX_TURNS in .env (or
// --max-minutes and --max-turns).
//
// Every run ends with a stability check: the finished suite is run several
// times in a row (STABILITY_RUNS in .env or --stability-runs, 3 by default) so
// the report can state how many tests are flaky.
//
// Each run gets runs/<run-id>/ with the raw event stream (events.jsonl) that
// the live reasoning panel reads, plus whatever the agent writes there.

import { spawn } from 'node:child_process';
import { createWriteStream, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openInBrowser, startPanel } from './panel.mjs';
import { buildHtmlReport } from './report-html.mjs';
import { loadSiteEnv } from './site-env.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---------- args and env ----------

function parseArgs(argv) {
  const [command = 'help', ...rest] = argv;
  const opts = {};
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = rest[i + 1];
    if (next === undefined || next.startsWith('--')) opts[key] = true;
    else opts[key] = next, i++;
  }
  return { command, opts };
}

function runId(command) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-');
  return `${stamp}-${command}`;
}

// ---------- extra origins (optional) ----------

// Hosts besides the target that the browser may reach, such as the app's API.
function extraOrigins() {
  return (process.env.ALLOWED_ORIGINS ?? '')
    .split(/[,;\s]+/)
    .filter(Boolean)
    .map((value) => {
      try {
        return new URL(value.includes('://') ? value : `https://${value}`).origin;
      } catch {
        throw new Error(`ALLOWED_ORIGINS has an invalid entry: ${value}`);
      }
    });
}

// ---------- excluded routes (optional) ----------

// Routes the agent must leave alone, from EXCLUDED_PATHS in the site's settings.
// Nothing is excluded unless it is listed: an app's own admin area is in scope.
function excludedPaths() {
  const raw = process.env.EXCLUDED_PATHS;
  if (raw === undefined) return [];
  return raw
    .split(/[,;\s]+/)
    .filter(Boolean)
    .map((value) => {
      if (!value.startsWith('/')) throw new Error(`EXCLUDED_PATHS entries must start with "/": ${value}`);
      return value;
    });
}

function scopeBrief(target) {
  const paths = excludedPaths();
  if (!paths.length) {
    return `

Scope: every page and feature of this app is in scope, including admin, settings and management areas the test account can reach.`;
  }
  return `

Scope: do not open, call or test these routes or anything under them: ${paths.join(', ')}. The operator has ruled them out. Everything else is in scope, including admin, settings and management areas the test account can reach. List the excluded routes under what you did not test in the report.`;
}

// ---------- run limits ----------

// About three times the largest normal run of each command.
const DEFAULT_LIMITS = {
  generate: { minutes: 60, turns: 500 },
  heal: { minutes: 30, turns: 300 },
  'check-login': { minutes: 5, turns: 40 },
};

// The limits for this run: the command's defaults, unless MAX_MINUTES or
// MAX_TURNS (or their flags) say otherwise.
function runLimits(command, opts) {
  const pick = (flag, envName, fallback) => {
    const raw = typeof opts[flag] === 'string' ? opts[flag] : process.env[envName];
    if (raw === undefined) return fallback;
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) throw new Error(`${envName} must be a number above 0, got: ${raw}`);
    return value;
  };
  const defaults = DEFAULT_LIMITS[command];
  return {
    minutes: pick('max-minutes', 'MAX_MINUTES', defaults.minutes),
    turns: Math.floor(pick('max-turns', 'MAX_TURNS', defaults.turns)),
  };
}

// Stop the agent and everything it started (its browser included). On Windows
// the child is a shell, so killing it alone would leave the agent running.
function stopProcessTree(child) {
  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    child.kill('SIGTERM');
  }
}

// ---------- stability check ----------

// How many times in a row the finished suite is run to find flaky tests.
// 1 switches the check off.
function stabilityRuns(opts) {
  const raw = typeof opts['stability-runs'] === 'string' ? opts['stability-runs'] : process.env.STABILITY_RUNS;
  if (raw === undefined) return 3;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) throw new Error(`STABILITY_RUNS must be a whole number, 1 or more, got: ${raw}`);
  return value;
}

// The stability step of a task, and what the summary must say about it.
function stabilityStep(runs) {
  if (runs === 1) return 'Run the full suite one last time so the counts are final. The stability check is switched off for this run.';
  return `Stability check, a fixed step: do it even when the suite already looks stable. Load the failure-triage skill and follow its "Stability check" section. Run \`npx playwright test\` ${runs} times in a row, changing no file in between, and compare each test's result across the ${runs} runs. A test with mixed results is flaky: find the cause, fix the test, then start the ${runs} runs again.`;
}

function summaryStep(id, runs, when) {
  const flaky =
    runs === 1
      ? 'Use null for "flaky": the stability check was off.'
      : `"flaky" is how many tests still gave mixed results in the last ${runs} stability runs. It is always a number: 0 when every test behaved the same in all of them.`;
  return `Write runs/${id}/summary.json with the final counts ${when}, as exact integers: {"tests": N, "passed": N, "failed": N, "flaky": N, "bugs": N, "stability_runs": ${runs}}. ${flaky}`;
}

// ---------- test account (optional) ----------

const SECRET_NAMES = ['TEST_USERNAME', 'TEST_PASSWORD'];

// The test account from .env, or null when the target needs no login.
function loginConfig(opts) {
  const username = process.env.TEST_USERNAME;
  const password = process.env.TEST_PASSWORD;
  if (!username && !password) return null;
  if (!username || !password) throw new Error('Set both TEST_USERNAME and TEST_PASSWORD in .env, or neither.');
  const loginUrl = typeof opts['login-url'] === 'string' ? opts['login-url'] : process.env.LOGIN_URL;
  return { loginUrl };
}

// Secrets file for the browser, in dotenv format. It lives outside the repo so
// the agent's file tools cannot reach it, and is deleted when the run ends.
function writeSecretsFile() {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'autoqa-'));
  const file = path.join(dir, 'secrets.env');
  // dotenv has no escapes inside quotes, so wrap the value in a quote character it does not contain.
  const quote = (v) => {
    const q = ["'", '`', '"'].find((c) => !v.includes(c));
    if (!q || /[\r\n]/.test(v)) throw new Error('TEST_USERNAME / TEST_PASSWORD cannot contain line breaks or all three quote characters.');
    return q + v + q;
  };
  writeFileSync(file, SECRET_NAMES.map((n) => `${n}=${quote(process.env[n])}`).join('\n') + '\n', { mode: 0o600 });
  const remove = () => rmSync(dir, { recursive: true, force: true });
  process.on('exit', remove);
  return { file, remove };
}

// Replace secret values with their names in anything that is logged or shown.
function makeRedactor() {
  const pairs = [];
  for (const name of SECRET_NAMES) {
    const value = process.env[name];
    if (!value) continue;
    pairs.push([value, `[${name}]`]);
    const json = JSON.stringify(value).slice(1, -1);
    if (json !== value) pairs.push([json, `[${name}]`]);
  }
  pairs.sort((a, b) => b[0].length - a[0].length);
  return (text) => pairs.reduce((t, [value, label]) => t.replaceAll(value, label), text);
}

function loginBrief(login) {
  if (!login) return '';
  return `

Test account: this app has features behind a login, and a test account is provided.
- Its credentials are browser secrets named TEST_USERNAME and TEST_PASSWORD. To sign in, type the secret's name as the text (for example type TEST_PASSWORD into the password field) and the browser fills in the real value. Values are masked in everything you read back.
- ${login.loginUrl ? `Sign-in page: ${login.loginUrl}` : 'Find the sign-in page from the app navigation.'}
- You never need the real values. Do not try to read, print, guess or write them anywhere, and do not open .env. Tests read them from process.env.TEST_USERNAME and process.env.TEST_PASSWORD; follow the Authentication section of the playwright-conventions skill.
- If sign-in needs a CAPTCHA, a one-time code or an email link, stop trying, say so in the report and test only what is reachable.`;
}

// ---------- prompts ----------

function generatePrompt({ target, id, login, stability }) {
  return `You are the AutoQA Agent. Target app: ${target}
Run id: ${id}. Write all run output to runs/${id}/.${loginBrief(login)}${scopeBrief(target)}

Task: explore this app you have never seen, then write and run an automated Playwright test suite for it, and report real bugs.

1. Load the app-exploration skill. Explore ${target} with the Playwright browser tools and write runs/${id}/journeys.md.
2. Load the test-design skill. Write runs/${id}/test-plan.md.
3. Load the playwright-conventions skill. Write page objects, fixtures, data and specs under generated-tests/. Tests use relative URLs; the base URL comes from playwright.config.ts. Tag viewport-specific tests with @mobile in the title.
4. Run \`npx playwright test\`. For every failure, load the failure-triage skill and classify it. Fix test mistakes. Do not change tests to hide real bugs; write a bug report in runs/${id}/bugs/ instead.
5. ${stabilityStep(stability)}
6. Write runs/${id}/report.md: suite summary (tests, passed, failed, flaky), a Stability section, what each failure means, the bug list with severity, and anything you chose not to test.
7. ${summaryStep(id, stability, 'from the last full run of the suite')}

Keep narrating in one short sentence before each meaningful step.`;
}

function healPrompt({ target, id, login, stability }) {
  return `You are the AutoQA Agent. Target app: ${target}
Run id: ${id}. Write all run output to runs/${id}/.${loginBrief(login)}${scopeBrief(target)}

Task: the existing Playwright suite in generated-tests/ was green on an earlier version of this app. The app has changed since. Run the suite, work out why each test fails, repair what is broken in the tests, and report what is broken in the app.

1. Run \`npx playwright test\`. List every failing test.
2. Load the failure-triage skill. For each failure, open the app with the Playwright browser tools and reproduce it. Classify it with evidence.
3. Broken locator, timing or test data: repair it. Fix the page object, not the spec, when the locator lives there. Load the playwright-conventions skill first and keep its house style. Change only what the evidence shows has changed.
4. Real bug: do not touch the test's assertions. Write a bug report in runs/${id}/bugs/.
5. Run the full suite again. Every remaining failure must be a real bug you reported.
6. ${stabilityStep(stability)}
7. Write runs/${id}/heal-report.md: each failure, its classification and evidence, the exact locator changes (before and after), the bug list with severity, a Stability section, and the final pass/fail count.
8. ${summaryStep(id, stability, 'after your repairs')}

Keep narrating in one short sentence before each meaningful step.`;
}

function checkLoginPrompt({ target, login }) {
  return `You are the AutoQA Agent. Target app: ${target}${loginBrief(login)}

Task: check that the test account can sign in. Do nothing else.

1. Open the sign-in page and sign in with the secrets.
2. Confirm you are signed in from what the page shows (an account page, a greeting, a sign-out control).
3. Reply with exactly one final line: "LOGIN_OK: <what proves it>" or "LOGIN_FAILED: <what the page said or what blocked you>".

Do not write any files. Keep narrating in one short sentence before each step.`;
}

// ---------- event stream ----------

const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const cyan = (s) => `\x1b[36m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;

function describeTool(name, input = {}) {
  const short = name.replace(/^mcp__playwright__browser_/, 'browser.');
  if (input.url) return `${short} ${input.url}`;
  if (input.element) return `${short} "${input.element}"`;
  if (input.command) return `${short} ${String(input.command).slice(0, 80)}`;
  if (input.file_path) return `${short} ${path.relative(ROOT, input.file_path) || input.file_path}`;
  if (input.skill) return `${short} ${input.skill}`;
  return short;
}

function printEvent(event) {
  if (event.type === 'assistant') {
    for (const block of event.message?.content ?? []) {
      if (block.type === 'text' && block.text.trim()) console.log(cyan('● ') + block.text.trim());
      if (block.type === 'tool_use') console.log(dim(`  → ${describeTool(block.name, block.input)}`));
    }
  } else if (event.type === 'result') {
    const cost = event.total_cost_usd != null ? `, ~$${event.total_cost_usd.toFixed(2)} API-equivalent` : '';
    console.log(green(`\n✓ ${event.subtype} in ${Math.round((event.duration_ms ?? 0) / 1000)}s, ${event.num_turns ?? '?'} turns${cost}`));
  }
}

function runAgent({ prompt, target, id, headed, model, login, limits, onResult }) {
  const runDir = path.join(ROOT, 'runs', id);
  mkdirSync(path.join(runDir, 'bugs'), { recursive: true });

  const origin = new URL(target).origin;
  const origins = [origin, ...extraOrigins()].filter((o, i, all) => all.indexOf(o) === i);
  const mcpArgs = [
    path.join(ROOT, 'node_modules', '@playwright', 'mcp', 'cli.js'),
    '--isolated',
    `--allowed-origins=${origins.join(';')}`,
    `--output-dir=${path.join(runDir, 'browser')}`,
    '--viewport-size=1440,900',
  ];
  if (!headed) mcpArgs.push('--headless');
  const secrets = login ? writeSecretsFile() : null;
  if (secrets) mcpArgs.push(`--secrets=${secrets.file}`);
  const redact = makeRedactor();
  const mcpConfig = path.join(runDir, 'mcp.json');
  writeFileSync(
    mcpConfig,
    JSON.stringify({ mcpServers: { playwright: { command: process.execPath, args: mcpArgs } } }, null, 2),
  );

  // Permissions go in a settings file: tool patterns with spaces and parentheses
  // do not survive the Windows shell as CLI arguments.
  const settingsFile = path.join(runDir, 'settings.json');
  writeFileSync(
    settingsFile,
    JSON.stringify(
      {
        permissions: {
          allow: [
            'mcp__playwright',
            'Read', 'Write', 'Edit', 'Glob', 'Grep', 'Skill', 'TodoWrite',
            'Bash(npx playwright test:*)',
            'Bash(npx playwright show-report:*)',
          ],
          // One shell only, so the agent's test commands match the rules in CLAUDE.md.
          // Credentials and saved sessions are off limits to the agent's file tools.
          deny: [
            'WebFetch', 'WebSearch', 'PowerShell',
            'Read(./.env)', 'Read(./.env.*)', 'Read(./.auth/**)',
            'Edit(./.env)', 'Edit(./.env.*)', 'Edit(./.auth/**)',
          ],
        },
      },
      null,
      2,
    ),
  );

  // Relative paths only: the repo lives under a folder name with a space.
  const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
  const args = [
    '-p',
    '--output-format', 'stream-json',
    '--verbose',
    '--mcp-config', rel(mcpConfig),
    '--strict-mcp-config',
    '--settings', rel(settingsFile),
    '--permission-mode', 'acceptEdits',
  ];
  if (model) args.push('--model', model);

  const events = createWriteStream(path.join(runDir, 'events.jsonl'));
  const child = spawn('claude', args, {
    cwd: ROOT,
    env: { ...process.env, TARGET_URL: target },
    shell: process.platform === 'win32',
    stdio: ['pipe', 'pipe', 'inherit'],
  });
  child.stdin.end(prompt); // prompt via stdin avoids shell quoting of a multi-line string

  // Limits: stop a run that is stuck (time) or looping (turns).
  const startedAt = Date.now();
  let turns = 1;
  let stopped = null;
  const stop = (reason) => {
    if (stopped) return;
    stopped = reason;
    stopProcessTree(child);
  };
  const timer = setTimeout(() => stop(`the time limit of ${limits.minutes} minutes`), limits.minutes * 60_000);

  let buffer = '';
  child.stdout.on('data', (chunk) => {
    buffer += chunk;
    let nl;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = redact(buffer.slice(0, nl).trim());
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      events.write(line + '\n');
      try {
        const event = JSON.parse(line);
        printEvent(event);
        if (event.type === 'result') onResult?.(event);
        // Each tool result the agent gets back starts its next turn.
        if (event.type === 'user' && !event.parent_tool_use_id && ++turns > limits.turns) {
          stop(`the turn limit of ${limits.turns} turns`);
        }
      } catch {
        console.log(line);
      }
    }
  });

  return new Promise((resolve) => {
    child.on('close', (code) => {
      clearTimeout(timer);
      secrets?.remove();
      events.end();
      if (stopped) {
        const minutes = Math.round((Date.now() - startedAt) / 60_000);
        writeFileSync(
          path.join(runDir, 'stopped.json'),
          JSON.stringify({ reason: stopped, turns: Math.min(turns, limits.turns), minutes, limits }, null, 2),
        );
        console.log(red(`\nRun stopped: it reached ${stopped}. What it wrote so far is kept.`));
        console.log(dim('If this app needs longer, raise MAX_MINUTES or MAX_TURNS in its settings file.'));
      }
      // The agent writes Markdown; turn it into one shareable HTML file.
      try {
        if (buildHtmlReport(runDir)) console.log(green(`\nHTML report: runs/${id}/report.html`));
      } catch (error) {
        console.log(dim(`\n(could not build report.html: ${error.message})`));
      }
      console.log(dim(`\nRun output: runs/${id}/`));
      resolve(stopped ? 2 : code ?? 1);
    });
  });
}

// ---------- commands ----------

// With --panel, open the live reasoning panel before the agent starts and keep
// it up after the run so the final state stays on screen.
async function withPanel(opts, run) {
  if (!opts.panel) return run();
  const port = Number(process.env.PANEL_PORT ?? 4400);
  await startPanel({ port, waitForNew: true });
  const url = `http://localhost:${port}/`;
  console.log(`  live panel: ${url}`);
  openInBrowser(url);
  const code = await run();
  console.log(dim('Panel still open. Press Ctrl+C to exit.'));
  void code;
  return new Promise(() => {});
}

async function main() {
  const { command, opts } = parseArgs(process.argv.slice(2));
  const settings = loadSiteEnv({ root: ROOT, flag: opts.site });
  if (settings.site) {
    console.log(`  site: ${settings.site} (${settings.file}, from the ${settings.source === 'flag' ? '--site flag' : settings.source})`);
  } else if (settings.missing) {
    console.log(`  note: on a site branch but ${settings.missing} does not exist, using .env only`);
  }
  const target = typeof opts.url === 'string' ? opts.url : process.env.TARGET_URL;
  if (!target && ['generate', 'heal', 'check-login', 'test'].includes(command)) {
    throw new Error('No target app: set TARGET_URL in .env, or pass --url <address>.');
  }
  if (typeof opts.allow === 'string') process.env.ALLOWED_ORIGINS = opts.allow;
  if (extraOrigins().length) console.log(`  also allowed: ${extraOrigins().join(', ')}`);
  if (typeof opts.exclude === 'string') process.env.EXCLUDED_PATHS = opts.exclude;
  if (excludedPaths().length) console.log(`  excluded routes: ${excludedPaths().join(', ')}`);

  const limits = DEFAULT_LIMITS[command] ? runLimits(command, opts) : null;
  if (limits) console.log(`  limits: ${limits.minutes} minutes, ${limits.turns} turns`);
  const stability = command === 'generate' || command === 'heal' ? stabilityRuns(opts) : null;
  if (stability) console.log(`  stability check: ${stability === 1 ? 'off' : `${stability} runs of the finished suite`}`);

  if (command === 'generate') {
    const id = runId(command);
    console.log(`AutoQA generate → ${target}  (run ${id})`);
    const login = loginConfig(opts);
    if (login) console.log('  test account: TEST_USERNAME / TEST_PASSWORD from .env');
    process.exit(
      await withPanel(opts, () =>
        runAgent({ prompt: generatePrompt({ target, id, login, stability }), target, id, headed: !!opts.headed, model: opts.model, login, limits }),
      ),
    );
  }

  if (command === 'heal') {
    const id = runId(command);
    console.log(`AutoQA heal → ${target}  (run ${id})`);
    const login = loginConfig(opts);
    if (login) console.log('  test account: TEST_USERNAME / TEST_PASSWORD from .env');
    process.exit(
      await withPanel(opts, () =>
        runAgent({ prompt: healPrompt({ target, id, login, stability }), target, id, headed: !!opts.headed, model: opts.model, login, limits }),
      ),
    );
  }

  if (command === 'check-login') {
    const login = loginConfig(opts);
    if (!login) throw new Error('No test account: set TEST_USERNAME and TEST_PASSWORD in .env first.');
    const id = runId(command);
    console.log(`AutoQA check-login → ${target}  (run ${id})`);
    let verdict = '';
    await runAgent({
      prompt: checkLoginPrompt({ target, login }), target, id, headed: !!opts.headed, model: opts.model, login, limits,
      onResult: (event) => (verdict = String(event.result ?? '')),
    });
    const ok = /LOGIN_OK/.test(verdict) && !/LOGIN_FAILED/.test(verdict);
    console.log(ok ? green('Login works.') : red('Login did not work. See the last line above.'));
    process.exit(ok ? 0 : 1);
  }

  if (command === 'test') {
    const child = spawn('npx', ['playwright', 'test'], {
      cwd: ROOT,
      env: { ...process.env, TARGET_URL: target },
      shell: process.platform === 'win32',
      stdio: 'inherit',
    });
    child.on('close', (code) => process.exit(code ?? 1));
    return;
  }

  console.log(`Usage:
  autoqa generate --url <target> [--headed] [--panel] [--model <id>]
  autoqa heal --url <target> [--headed] [--panel] [--model <id>]
  autoqa check-login --url <target> [--headed]
  autoqa test [--url <target>]

Every command takes --site <name> to read .env.<name>; on a site/<name> branch that is the default.
Sites with a login: set TEST_USERNAME and TEST_PASSWORD in .env (optional LOGIN_URL or --login-url).
Apps that call another host (an API subdomain): set ALLOWED_ORIGINS in .env or pass --allow <host,host>.
Routes the agent must leave alone: set EXCLUDED_PATHS in .env or pass --exclude </path,/path>.
Run limits: generate 60 minutes and 500 turns, heal 30 and 300, check-login 5 and 40.
Change them with MAX_MINUTES and MAX_TURNS in .env, or --max-minutes and --max-turns.
Stability check: the finished suite is run 3 times to find flaky tests. Change it with STABILITY_RUNS in .env or --stability-runs.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
