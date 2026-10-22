#!/usr/bin/env node
// Live reasoning panel: a local web page that shows, step by step, what the
// agent is doing. It tails runs/<id>/events.jsonl, so it works live during a
// run and as a replay of any finished run.
//
//   node bin/panel.mjs                 follow the newest run (and any new one)
//   node bin/panel.mjs --run <id>      replay one run
//   node bin/panel.mjs --port 4400

import { createServer } from 'node:http';
import { existsSync, readdirSync, readFileSync, statSync, openSync, readSync, closeSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RUNS = path.join(ROOT, 'runs');
const PAGE = path.join(ROOT, 'bin', 'panel.html');

// ---------- privacy: never show local paths or the machine's user name ----------

const hidePaths = (() => {
  const variants = new Set();
  for (const p of [ROOT, os.homedir()]) {
    variants.add(p);
    variants.add(p.split(path.sep).join('/'));
    variants.add(p.split(path.sep).join('\\\\'));
  }
  const user = path.basename(os.homedir());
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rootLike = [...variants].sort((a, b) => b.length - a.length).map(escape).join('|');
  const rootRe = new RegExp(`(${rootLike})[\\\\/]?`, 'gi');
  const userRe = new RegExp(escape(user), 'gi');
  return (text) => String(text ?? '').replace(rootRe, '').replace(userRe, 'user');
})();

const slashes = (s) => s.replaceAll('\\', '/');

// ---------- turn raw Claude Code events into panel events ----------

const pathOf = (url) => {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url;
  }
};

const clip = (s, n = 140) => {
  s = hidePaths(s).replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
};

function describe(name, input = {}) {
  const b = name.replace(/^mcp__playwright__browser_/, '');
  if (name.startsWith('mcp__playwright__')) {
    const el = input.element ? ` ${input.element}` : '';
    switch (b) {
      case 'navigate': return { cat: 'browser', label: `Open ${pathOf(input.url)}` };
      case 'click': return { cat: 'browser', label: `Click${el || ' element'}` };
      case 'type': return { cat: 'browser', label: `Type "${clip(input.text, 40)}" into${el || ' field'}` };
      case 'fill_form':
        return { cat: 'browser', label: `Fill form: ${(input.fields ?? []).map((f) => f.name).join(', ')}` };
      case 'select_option': return { cat: 'browser', label: `Choose ${(input.values ?? []).join(', ')} in${el}` };
      case 'snapshot': return { cat: 'browser', label: 'Read the page structure' };
      case 'find': return { cat: 'browser', label: `Look for ${clip(input.regex ?? input.text ?? input.query ?? 'element', 50)}` };
      case 'take_screenshot': return { cat: 'browser', label: `Screenshot${input.filename ? ` → ${clip(input.filename, 70)}` : ''}` };
      case 'resize': return { cat: 'browser', label: `Resize to ${input.width}×${input.height}` };
      case 'press_key': return { cat: 'browser', label: `Press ${input.key}` };
      case 'navigate_back': return { cat: 'browser', label: 'Go back' };
      case 'wait_for': return { cat: 'browser', label: `Wait for ${clip(input.text ?? `${input.time}s`, 40)}` };
      default: return { cat: 'browser', label: b.replace(/_/g, ' ') };
    }
  }
  const file = input.file_path ? slashes(clip(input.file_path, 90)) : '';
  switch (name) {
    case 'Read': return { cat: 'read', label: `Read ${file}` };
    case 'Write': return { cat: 'write', label: `Write ${file}`, file };
    case 'Edit': return {
      cat: 'write', label: `Edit ${file}`, file,
      diff: { before: clip(input.old_string, 160), after: clip(input.new_string, 160) },
    };
    case 'Glob': return { cat: 'read', label: `Find files ${clip(input.pattern, 60)}` };
    case 'Grep': return { cat: 'read', label: `Search for ${clip(input.pattern, 60)}` };
    case 'Skill': return { cat: 'skill', label: `Load skill: ${input.skill}` };
    case 'TodoWrite': return { cat: 'plan', label: 'Update the task list' };
    case 'Bash':
    case 'PowerShell': {
      const cmd = String(input.command ?? '');
      if (/playwright test/.test(cmd)) return { cat: 'test', label: 'Run the Playwright suite' };
      return { cat: 'shell', label: clip(input.description ?? cmd, 90) };
    }
    default: return null; // ToolSearch and other plumbing: not interesting to watch
  }
}

function resultText(block) {
  const c = block.content;
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) return c.filter((x) => x.type === 'text').map((x) => x.text).join('\n');
  return '';
}

function makeTranslator({ live }) {
  const steps = new Map(); // tool_use_id -> step
  return function translate(raw) {
    const out = [];
    if (raw.type === 'system' && raw.subtype === 'init') out.push({ kind: 'init', model: raw.model });
    if (raw.type === 'assistant') {
      for (const block of raw.message?.content ?? []) {
        if (block.type === 'text' && block.text.trim()) out.push({ kind: 'say', text: hidePaths(block.text.trim()) });
        if (block.type === 'thinking') out.push({ kind: 'think' });
        if (block.type === 'tool_use') {
          const d = describe(block.name, block.input);
          if (!d) continue;
          const step = { kind: 'step', id: block.id, ...d, label: hidePaths(d.label), at: Date.now() };
          steps.set(block.id, step);
          out.push(step);
        }
      }
    }
    if (raw.type === 'user') {
      for (const block of raw.message?.content ?? []) {
        if (block.type !== 'tool_result' || !steps.has(block.tool_use_id)) continue;
        const step = steps.get(block.tool_use_id);
        const text = resultText(block);
        const done = { kind: 'done', id: block.tool_use_id, ok: !block.is_error };
        if (step.cat === 'test') {
          const n = (re) => Number(text.match(re)?.[1] ?? 0);
          done.tests = { passed: n(/(\d+) passed/), failed: n(/(\d+) failed/), flaky: n(/(\d+) flaky/) };
          if (!done.tests.passed && !done.tests.failed) done.tests = live ? reportCounts(step.at) : undefined;
          if (done.tests) done.ok = true; // failing tests exit 1, but the run itself worked
          else if (block.is_error) done.note = 'Some tests failed';
        }
        if (block.is_error && !done.note && !done.tests) done.note = clip(text.split('\n')[0], 120);
        out.push(done);
      }
    }
    if (raw.type === 'result') {
      out.push({
        kind: 'result',
        ok: raw.subtype === 'success',
        turns: raw.num_turns,
        secs: Math.round((raw.duration_ms ?? 0) / 1000),
      });
    }
    return out;
  };
}

// ---------- runs on disk ----------

function listRuns() {
  if (!existsSync(RUNS)) return [];
  return readdirSync(RUNS)
    .filter((d) => existsSync(path.join(RUNS, d, 'events.jsonl')))
    .sort();
}

// Runs that existed before the panel started are skipped when waitForNew is set.
let ignoreBefore = '';
const latestRun = () => listRuns().filter((r) => r > ignoreBefore).at(-1);

// Pass/fail counts from Playwright's JSON report, if it was written after `since`.
function reportCounts(since) {
  const file = path.join(ROOT, 'playwright-report', 'results.json');
  try {
    if (statSync(file).mtimeMs < since) return undefined;
    const s = JSON.parse(readFileSync(file, 'utf8')).stats ?? {};
    return { passed: s.expected ?? 0, failed: s.unexpected ?? 0, flaky: s.flaky ?? 0 };
  } catch {
    return undefined;
  }
}

// Stream a run's events over SSE: everything already on disk, then new lines
// as the agent appends them. With follow=true, jump to a newer run when one starts.
function streamRun(res, { run, follow, delay }) {
  let closed = false;
  res.on('close', () => (closed = true));
  const send = (obj) => !closed && res.write(`data: ${JSON.stringify(obj)}\n\n`);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  (async () => {
    let current = run;
    while (!closed) {
      if (!current) {
        send({ kind: 'waiting' });
        while (!closed && !(current = latestRun())) await wait(500);
        if (closed) return;
      }
      const [stamp, command] = [current.slice(0, 15), current.slice(16)];
      send({ kind: 'run', id: current, command, stamp });
      const translate = makeTranslator({ live: !run });
      const file = path.join(RUNS, current, 'events.jsonl');
      let offset = 0;
      let rest = '';
      let finished = false;
      while (!closed) {
        const size = statSync(file).size;
        if (size > offset) {
          const fd = openSync(file, 'r');
          const buf = Buffer.alloc(size - offset);
          readSync(fd, buf, 0, buf.length, offset);
          closeSync(fd);
          offset = size;
          const lines = (rest + buf.toString('utf8')).split('\n');
          rest = lines.pop();
          for (const line of lines) {
            if (!line.trim()) continue;
            let raw;
            try { raw = JSON.parse(line); } catch { continue; }
            for (const ev of translate(raw)) {
              send(ev);
              if (ev.kind === 'result') finished = true;
              if (delay && ev.kind !== 'done' && ev.kind !== 'think') await wait(delay);
              if (closed) return;
            }
          }
        }
        if (follow) {
          const newest = latestRun();
          if (newest && newest !== current) { current = newest; break; }
        } else if (finished) {
          return;
        }
        await wait(300);
      }
    }
  })().catch((e) => send({ kind: 'error', text: e.message }));
}

// ---------- server ----------

export function startPanel({ port = 4400, run, waitForNew = false } = {}) {
  if (waitForNew) ignoreBefore = listRuns().at(-1) ?? '';
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      return res.end(readFileSync(PAGE));
    }
    if (url.pathname === '/runs') {
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify(listRuns()));
    }
    if (url.pathname === '/stream') {
      res.writeHead(200, {
        'content-type': 'text/event-stream',
        'cache-control': 'no-store',
        connection: 'keep-alive',
      });
      const pick = url.searchParams.get('run') ?? run;
      const valid = pick && listRuns().includes(pick);
      return streamRun(res, {
        run: valid ? pick : undefined,
        follow: !valid,
        delay: valid ? Number(url.searchParams.get('delay') ?? 250) : 0,
      });
    }
    res.writeHead(404).end();
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

export function openInBrowser(url) {
  import('node:child_process').then(({ spawn }) => {
    const [cmd, args] =
      process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]]
      : process.platform === 'darwin' ? ['open', [url]]
      : ['xdg-open', [url]];
    spawn(cmd, args, { stdio: 'ignore', detached: true }).unref();
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (k) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : undefined; };
  const port = Number(opt('port') ?? 4400);
  const run = opt('run');
  await startPanel({ port, run });
  const url = `http://localhost:${port}/${run ? `?run=${run}` : ''}`;
  console.log(`AutoQA panel: ${url}  (${run ? `replaying ${run}` : 'following the newest run'}; Ctrl+C to stop)`);
  if (!args.includes('--no-open')) openInBrowser(url);
}
