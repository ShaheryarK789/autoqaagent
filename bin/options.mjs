// Command-line flags and settings for the runner: parsed and checked here, with
// no side effects, so the rules can be unit tested without starting an agent.

export function parseArgs(argv) {
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

// ---------- extra origins (optional) ----------

// Hosts besides the target that the browser may reach, such as the app's API.
export function extraOrigins(env = process.env) {
  return (env.ALLOWED_ORIGINS ?? '')
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
export function excludedPaths(env = process.env) {
  const raw = env.EXCLUDED_PATHS;
  if (raw === undefined) return [];
  return raw
    .split(/[,;\s]+/)
    .filter(Boolean)
    .map((value) => {
      if (!value.startsWith('/')) throw new Error(`EXCLUDED_PATHS entries must start with "/": ${value}`);
      return value;
    });
}

// ---------- run limits ----------

// About three times the largest normal run of each command.
export const DEFAULT_LIMITS = {
  generate: { minutes: 60, turns: 500 },
  heal: { minutes: 30, turns: 300 },
  'check-login': { minutes: 5, turns: 40 },
};

// The limits for this run: the command's defaults, unless MAX_MINUTES or
// MAX_TURNS (or their flags) say otherwise.
export function runLimits(command, opts, env = process.env) {
  const pick = (flag, envName, fallback) => {
    const raw = typeof opts[flag] === 'string' ? opts[flag] : env[envName];
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

// ---------- stability check ----------

// How many times in a row the finished suite is run to find flaky tests.
// 1 switches the check off.
export function stabilityRuns(opts, env = process.env) {
  const raw = typeof opts['stability-runs'] === 'string' ? opts['stability-runs'] : env.STABILITY_RUNS;
  if (raw === undefined) return 3;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) throw new Error(`STABILITY_RUNS must be a whole number, 1 or more, got: ${raw}`);
  return value;
}

// ---------- test account (optional) ----------

export const SECRET_NAMES = ['TEST_USERNAME', 'TEST_PASSWORD'];

// Replace secret values with their names in anything that is logged or shown.
export function makeRedactor(env = process.env) {
  const pairs = [];
  for (const name of SECRET_NAMES) {
    const value = env[name];
    if (!value) continue;
    pairs.push([value, `[${name}]`]);
    const json = JSON.stringify(value).slice(1, -1);
    if (json !== value) pairs.push([json, `[${name}]`]);
  }
  pairs.sort((a, b) => b[0].length - a[0].length);
  return (text) => pairs.reduce((t, [value, label]) => t.replaceAll(value, label), text);
}
