#!/usr/bin/env node
// Builds runs/<id>/report.html from the Markdown the agent wrote for that run:
// the report, every bug report (with its screenshot), the test plan and the
// journey map. One self-contained file: no network requests, images embedded,
// prints cleanly to PDF. No AI involved, so it also works on past runs.
//
//   node bin/report-html.mjs               newest run that has a report
//   node bin/report-html.mjs <run-id>      one run
//   node bin/report-html.mjs --all         every run
//   add --open to open the result in the browser

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Marked } from 'marked';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RUNS = path.join(ROOT, 'runs');
const REPORT_FILES = ['report.md', 'heal-report.md'];

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const slug = (file) => path.basename(file, '.md').replace(/[^A-Za-z0-9_-]+/g, '-');

// The reports quote text from the app under test, so raw HTML in the Markdown
// is shown as text, never run. Links to a bug's .md file become in-page links.
function renderer(bugSlugs) {
  return new Marked({
    gfm: true,
    breaks: true, // the reports put one field per line (Severity, Area, Environment)
    renderer: {
      html(token) {
        return escapeHtml(token.raw ?? token.text ?? '');
      },
    },
    walkTokens(token) {
      if (token.type !== 'link') return;
      const match = token.href.match(/(?:^|\/)bugs\/([^/]+)\.md$/);
      if (match && bugSlugs.has(slug(match[1]))) token.href = `#bug-${slug(match[1])}`;
      else if (!/^(https?:|mailto:|#)/i.test(token.href)) token.href = '#'; // other local files are not in this page
    },
  });
}

const read = (file) => (existsSync(file) ? readFileSync(file, 'utf8') : null);

/**
 * Test counts for the header tiles. Runs from this version on have an exact
 * `summary.json` written by the agent. Older runs do not, so the counts are
 * read from the report's wording: a repair run's final "N passed, M failed"
 * statement, or the rows of a summary table.
 */
function summaryCounts(runDir, markdown, isHeal) {
  try {
    const s = JSON.parse(readFileSync(path.join(runDir, 'summary.json'), 'utf8'));
    if (Number.isInteger(s.passed) && Number.isInteger(s.failed)) {
      return {
        tests: Number.isInteger(s.tests) ? s.tests : s.passed + s.failed,
        passed: s.passed,
        failed: s.failed,
        flaky: Number.isInteger(s.flaky) ? s.flaky : null,
        stabilityRuns: Number.isInteger(s.stability_runs) && s.stability_runs > 1 ? s.stability_runs : null,
      };
    }
  } catch {
    // no summary.json, or not valid JSON: fall back to the report's text
  }

  const phrases = [...markdown.matchAll(/(\d+)\s+passed\b[^.\n|]{0,24}?(\d+)\s+failed/gi)];
  const last = phrases.at(-1);
  const fromPhrase = last
    ? { tests: Number(last[1]) + Number(last[2]), passed: Number(last[1]), failed: Number(last[2]), flaky: null }
    : null;

  const cell = (label) => {
    const m = markdown.match(new RegExp(`^\\|\\s*${label}[^|]*\\|\\s*(\\d+)`, 'im'));
    return m ? Number(m[1]) : null;
  };
  const [passed, failed] = [cell('Passed'), cell('Failed')];
  const fromTable =
    passed === null || failed === null
      ? null
      : { tests: cell('Tests') ?? cell('Executed') ?? passed + failed, passed, failed, flaky: cell('Flaky') };

  // A repair report's table is often "before / after": its closing statement is the result.
  return isHeal ? (fromPhrase ?? fromTable) : (fromTable ?? fromPhrase);
}

function bugMeta(markdown) {
  const title = markdown.match(/^#\s+(.+)$/m)?.[1].trim() ?? 'Bug';
  const severity = markdown.match(/^\**Severity\**\s*:\s*\**\s*([A-Za-z]+)/im)?.[1].toLowerCase() ?? null;
  return { title, severity };
}

const STYLE = `
:root{--bg:#f6f8fa;--card:#fff;--fg:#1c2530;--muted:#57636f;--line:#dfe5ea;--accent:#0b7a53;--accent-soft:#e6f4ee;
--pass:#0b7a53;--fail:#b3261e;--warn:#8a5a00;--code:#f0f3f6;--critical:#b3261e;--major:#8a5a00;--minor:#57636f}
@media (prefers-color-scheme:dark){:root{--bg:#0f141a;--card:#161d25;--fg:#e6edf3;--muted:#9aa7b4;--line:#2a333d;
--accent:#3fcf8e;--accent-soft:#12291f;--pass:#3fcf8e;--fail:#ff8a80;--warn:#f0b849;--code:#1e2731;--critical:#ff8a80;--major:#f0b849;--minor:#9aa7b4}}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.6 "Segoe UI",system-ui,-apple-system,sans-serif}
header.top{background:var(--card);border-bottom:1px solid var(--line)}
.wrap{max-width:960px;margin:0 auto;padding:0 24px}
.brand{display:flex;align-items:center;gap:10px;padding:22px 0 6px;font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--accent)}
.mark{width:26px;height:26px;border-radius:7px;display:grid;place-items:center;background:var(--accent);color:var(--card);font-size:12px;font-weight:800;letter-spacing:0}
h1.title{margin:0;font-size:32px;line-height:1.2;letter-spacing:-.01em}
.meta{display:flex;flex-wrap:wrap;gap:6px 22px;margin:10px 0 0;padding:0 0 22px;color:var(--muted);font-size:14px}
.meta b{color:var(--fg);font-weight:600}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;padding:0 0 24px}
.tile{background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:14px 16px}
.tile .n{font-size:30px;font-weight:700;line-height:1.1;font-variant-numeric:tabular-nums}
.tile .l{font-size:13px;color:var(--muted)}
.n.pass{color:var(--pass)}.n.fail{color:var(--fail)}
nav.tabs{position:sticky;top:0;z-index:5;background:var(--card);border-bottom:1px solid var(--line)}
nav.tabs .wrap{display:flex;gap:10px;overflow-x:auto;padding-top:12px;padding-bottom:12px}
nav.tabs a{padding:8px 18px;border-radius:999px;font-size:14.5px;font-weight:700;text-decoration:none;white-space:nowrap;background:var(--accent-soft);color:var(--accent);border:1.5px solid var(--accent);transition:background .15s,color .15s}
nav.tabs a:hover,nav.tabs a.active{background:var(--accent);color:var(--card)}
nav.tabs .count{margin-left:8px;padding:1px 8px;border-radius:999px;background:var(--accent);color:var(--card);font-size:12px}
nav.tabs a:hover .count,nav.tabs a.active .count{background:var(--card);color:var(--accent)}
main{padding:28px 0 60px}
section.doc{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:8px 32px 28px;margin:0 0 24px;scroll-margin-top:76px}
.kicker{margin:24px 0 0;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--accent)}
.md h1{font-size:24px;margin:6px 0 14px;line-height:1.3}
.md h2{font-size:19px;margin:30px 0 10px;padding-top:18px;border-top:1px solid var(--line)}
.md h3{font-size:16px;margin:22px 0 8px}.md h4{font-size:15px;margin:18px 0 6px}
.md p{margin:10px 0}.md ul,.md ol{margin:10px 0;padding-left:24px}.md li{margin:4px 0}
.md a{color:var(--accent)}
.md code{font:13.5px/1.5 ui-monospace,"Cascadia Code",Consolas,monospace;background:var(--code);padding:1px 5px;border-radius:4px;overflow-wrap:anywhere}
.md pre{background:var(--code);border-radius:8px;padding:14px 16px;overflow-x:auto}.md pre code{background:none;padding:0;overflow-wrap:normal}
.md blockquote{margin:14px 0;padding:6px 16px;border-left:3px solid var(--accent);background:var(--accent-soft);border-radius:0 8px 8px 0}
.table{overflow-x:auto;margin:14px 0;border:1px solid var(--line);border-radius:8px}
.md table{border-collapse:collapse;width:100%;font-size:14.5px}
.md th,.md td{padding:9px 12px;text-align:left;vertical-align:top;border-bottom:1px solid var(--line)}
.md th{background:var(--bg);font-weight:600;white-space:nowrap}.md tr:last-child td{border-bottom:0}
.bug{border-top:1px solid var(--line);padding-top:6px;margin-top:26px;scroll-margin-top:76px}.bug:first-of-type{border-top:0;margin-top:0}
.badge{display:inline-block;margin:14px 0 0;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;border:1px solid currentColor}
.badge.critical{color:var(--critical)}.badge.major{color:var(--major)}.badge.minor{color:var(--minor)}
figure{margin:16px 0 0}figure img{max-width:100%;border:1px solid var(--line);border-radius:8px;display:block}
figcaption{font-size:13px;color:var(--muted);margin-top:6px}
footer{color:var(--muted);font-size:13px;text-align:center;padding:0 0 40px}
@media print{body{background:#fff}nav.tabs{display:none}section.doc{border:0;padding:0;break-inside:auto}.bug{break-inside:avoid}main{padding-top:10px}}
`;

/** Build report.html for one run folder. Returns its path, or null if the run has no report. */
export function buildHtmlReport(runDir) {
  const id = path.basename(runDir);
  const reportFile = REPORT_FILES.map((f) => path.join(runDir, f)).find(existsSync);
  if (!reportFile) return null;

  const bugsDir = path.join(runDir, 'bugs');
  const bugFiles = existsSync(bugsDir) ? readdirSync(bugsDir).filter((f) => f.endsWith('.md')).sort() : [];
  const md = renderer(new Set(bugFiles.map(slug)));
  const bugSlugs = new Set(bugFiles.map(slug));
  const render = (text) =>
    md
      .parse(text)
      // Tables scroll sideways inside their own box instead of widening the page.
      .replaceAll('<table>', '<div class="table"><table>')
      .replaceAll('</table>', '</table></div>')
      // A bug file named in passing (`bugs/BUG-01-x.md`) links to that bug's section.
      .replace(/<code>(?:[^<]*\/)?bugs\/([^<\/]+)\.md<\/code>/g, (whole, name) =>
        bugSlugs.has(slug(name)) ? `<a href="#bug-${slug(name)}">${whole}</a>` : whole,
      );

  const report = readFileSync(reportFile, 'utf8');
  const title = report.match(/^#\s+(.+)$/m)?.[1].trim() ?? `AutoQA report ${id}`;
  const body = report.replace(/^#\s+.+\r?\n/m, ''); // the title is shown in the header
  const isHeal = /-heal$/.test(id);
  const counts = summaryCounts(runDir, report, isHeal);
  const kind = isHeal ? 'Self-healing run' : /-generate$/.test(id) ? 'Explore and generate run' : 'Run';
  const stamp = id.match(/^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})/);
  const when = stamp ? `${stamp[1]}-${stamp[2]}-${stamp[3]} ${stamp[4]}:${stamp[5]} UTC` : '';

  const bugs = bugFiles.map((file) => {
    const text = readFileSync(path.join(bugsDir, file), 'utf8');
    const png = path.join(bugsDir, file.replace(/\.md$/, '.png'));
    const image = existsSync(png) ? `data:image/png;base64,${readFileSync(png).toString('base64')}` : null;
    return { id: slug(file), ...bugMeta(text), html: render(text), image };
  });

  const extras = [
    ['test-plan', 'Test plan', read(path.join(runDir, 'test-plan.md'))],
    ['journeys', 'Journey map', read(path.join(runDir, 'journeys.md'))],
  ].filter(([, , text]) => text);

  const tiles = counts
    ? `<div class="tiles">
      <div class="tile"><div class="n">${counts.tests}</div><div class="l">Tests</div></div>
      <div class="tile"><div class="n pass">${counts.passed}</div><div class="l">${isHeal ? 'Passed after repair' : 'Passed'}</div></div>
      <div class="tile"><div class="n${counts.failed ? ' fail' : ''}">${counts.failed}</div><div class="l">${isHeal ? 'Still failing' : 'Failed'}</div></div>
      ${counts.flaky === null ? '' : `<div class="tile"><div class="n">${counts.flaky}</div><div class="l">${counts.stabilityRuns ? `Flaky in ${counts.stabilityRuns} runs` : 'Flaky'}</div></div>`}
      <div class="tile"><div class="n${bugs.length ? ' fail' : ''}">${bugs.length}</div><div class="l">Bug reports</div></div>
    </div>`
    : '';

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${STYLE}</style>
</head>
<body>
<header class="top"><div class="wrap">
  <div class="brand"><span class="mark">QA</span>AutoQA report</div>
  <h1 class="title">${escapeHtml(title.replace(/^(AutoQA|Run) report:\s*/i, ''))}</h1>
  <p class="meta"><span>${escapeHtml(kind)}</span>${when ? `<span>Started <b>${when}</b></span>` : ''}<span>Run <b>${escapeHtml(id)}</b></span></p>
  ${tiles}
</div></header>
<nav class="tabs" aria-label="Sections"><div class="wrap">
  <a href="#report">Report</a>
  ${bugs.length ? `<a href="#bugs">Bug reports<span class="count">${bugs.length}</span></a>` : ''}
  ${extras.map(([anchor, label]) => `<a href="#${anchor}">${label}</a>`).join('\n  ')}
</div></nav>
<main><div class="wrap">
<section class="doc md" id="report"><p class="kicker">Report</p>${render(body)}</section>
${bugs.length ? `<section class="doc" id="bugs"><p class="kicker">Bug reports</p>
${bugs.map((bug) => `<article class="bug md" id="bug-${bug.id}">
${bug.severity ? `<span class="badge ${escapeHtml(bug.severity)}">${escapeHtml(bug.severity)}</span>` : ''}
${bug.html}
${bug.image ? `<figure><img src="${bug.image}" alt="Screenshot for ${escapeHtml(bug.title)}"><figcaption>Screenshot captured by the agent</figcaption></figure>` : ''}
</article>`).join('\n')}
</section>` : ''}
${extras.map(([anchor, label, text]) => `<section class="doc md" id="${anchor}"><p class="kicker">${label}</p>${render(text)}</section>`).join('\n')}
</div></main>
<footer>Generated by the AutoQA Agent from the run's Markdown reports.</footer>
<script>
// Mark the tab for the section currently on screen: the last section whose top
// has passed the tab bar, or the final section once the page is at its end.
(() => {
  const links = [...document.querySelectorAll('nav.tabs a')];
  const sections = links.map((a) => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
  const mark = (el) => links.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + el.id));
  const update = () => {
    const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
    const passed = sections.filter((el) => el.getBoundingClientRect().top <= 120);
    mark(atEnd ? sections.at(-1) : (passed.at(-1) ?? sections[0]));
  };
  let queued = false;
  window.addEventListener('scroll', () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; update(); });
  }, { passive: true });
  update();
})();
</script>
</body>
</html>
`;

  const out = path.join(runDir, 'report.html');
  writeFileSync(out, html);
  return out;
}

function runsWithReports() {
  if (!existsSync(RUNS)) return [];
  return readdirSync(RUNS)
    .filter((d) => REPORT_FILES.some((f) => existsSync(path.join(RUNS, d, f))))
    .sort();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const named = args.filter((a) => !a.startsWith('--'));
  const available = runsWithReports();
  const targets = args.includes('--all') ? available : named.length ? named : available.slice(-1);

  if (!targets.length) {
    console.error('No run with a report found in runs/. Run the agent first.');
    process.exit(1);
  }
  let last;
  for (const id of targets) {
    const out = buildHtmlReport(path.join(RUNS, id));
    if (!out) {
      console.error(`runs/${id} has no report.md or heal-report.md`);
      process.exitCode = 1;
      continue;
    }
    last = out;
    console.log(`HTML report: ${path.relative(ROOT, out).split(path.sep).join('/')}`);
  }
  if (last && args.includes('--open')) {
    const { openInBrowser } = await import('./panel.mjs');
    openInBrowser(last);
  }
}
