#!/usr/bin/env node
'use strict';
/*
 * Builds the chatbot's knowledge base from a few sources:
 *   - resume.html (parsed into knowledge/resume.md)
 *   - GitHub's public API (fetched into knowledge/github.md)
 *   - knowledge/linkedin.md (hand-written, not touched by this script)
 * Then concatenates all three into worker/src/knowledge-base.generated.js,
 * which the Worker imports as a plain string at build time (Workers have
 * no filesystem access at runtime, so this has to happen before deploy).
 *
 * Run: node scripts/build-knowledge.cjs
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const KNOWLEDGE_DIR = path.join(ROOT, 'knowledge');
const WORKER_SRC = path.join(ROOT, 'worker', 'src');

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

// A small, purpose-built HTML->Markdown pass for resume.html's own shape
// (h1/h2/h3/p/ul/li/a/strong/br) — not a general parser, and not meant to be one.
function resumeHtmlToMarkdown(html) {
  const main = html.match(/<main class="resume">([\s\S]*)<\/main>/);
  let body = main ? main[1] : html;
  body = body.replace(/<div class="resume-actions">[\s\S]*?<\/div>/, '');

  const lines = [];
  const blockRe = /<(h1|h2|h3|p|li)(?: class="[^"]*")?>([\s\S]*?)<\/\1>|<ul>|<\/ul>|<article>|<\/article>/g;
  let m;
  let inList = false;
  while ((m = blockRe.exec(body))) {
    const [whole, tag, inner] = m;
    if (whole === '<ul>') { inList = true; continue; }
    if (whole === '</ul>') { inList = false; continue; }
    if (whole === '<article>' || whole === '</article>') continue;
    let text = inner
      .replace(/<a href="([^"]+)">([^<]*)<\/a>/g, '[$2]($1)')
      .replace(/<strong>([\s\S]*?)<\/strong>/g, '**$1**')
      .replace(/<br>/g, '\n')
      .replace(/<[^>]+>/g, '');
    text = decodeEntities(text).trim();
    if (!text) continue;
    if (tag === 'h1') lines.push(`# ${text}`);
    else if (tag === 'h2') lines.push(`## ${text}`);
    else if (tag === 'h3') lines.push(`### ${text}`);
    else if (tag === 'li') lines.push(`- ${text}`);
    else lines.push(text);
    lines.push('');
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

// Only the repos actually linked from index.html/resume.html — not every
// repo on the account. The GitHub user-repos endpoint lists everything
// (abandoned forks, throwaway test repos, duplicate uploads), which would
// bloat the prompt with noise the assistant might otherwise repeat back
// as if it were one of Paul's real projects.
async function fetchGithubMarkdown(repos) {
  const lines = ['# GitHub projects', ''];
  for (const full of repos) {
    try {
      const res = await fetch(`https://api.github.com/repos/${full}`, {
        headers: { 'User-Agent': 'geddie212-portfolio-knowledge-build', Accept: 'application/vnd.github+json' },
      });
      if (!res.ok) { lines.push(`## ${full}`, `_fetch failed: HTTP ${res.status}_`, ''); continue; }
      const r = await res.json();
      lines.push(`## ${r.name}`);
      if (r.description) lines.push(r.description);
      if (r.language) lines.push(`Primary language: ${r.language}`);
      lines.push(`[Repository](${r.html_url})`);
      lines.push('');
    } catch (err) {
      lines.push(`## ${full}`, `_fetch failed: ${err.message} — rerun \`node scripts/build-knowledge.cjs\` with network access to refresh this section._`, '');
    }
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

async function main() {
  fs.mkdirSync(KNOWLEDGE_DIR, { recursive: true });
  fs.mkdirSync(WORKER_SRC, { recursive: true });

  const resumeHtml = fs.readFileSync(path.join(ROOT, 'resume.html'), 'utf8');
  const resumeMd = resumeHtmlToMarkdown(resumeHtml);
  fs.writeFileSync(path.join(KNOWLEDGE_DIR, 'resume.md'), resumeMd);
  console.log('wrote knowledge/resume.md');

  // Keep this list in sync with the repos actually linked from index.html/resume.html.
  const FEATURED_REPOS = [
    'geddie212/BehaviorTrace',
    'geddie212/AppleBehaviorTrace',
    'geddie212/BehaviorTrace_Docs',
    'geddie212/health-agent',
    'forklaneai/forklane',
    'geddie212/neetcode-submissions',
    'geddie212/sort_algorithms',
    'geddie212/cafe_api',
    'geddie212/coffee-and-wifi',
    'geddie212/color_extract',
    'geddie212/my_queue',
    'geddie212/pauls_blog',
  ];
  const githubMd = await fetchGithubMarkdown(FEATURED_REPOS);
  fs.writeFileSync(path.join(KNOWLEDGE_DIR, 'github.md'), githubMd);
  console.log('wrote knowledge/github.md');

  const parts = [];
  for (const file of ['resume.md', 'linkedin.md', 'github.md']) {
    const p = path.join(KNOWLEDGE_DIR, file);
    if (fs.existsSync(p)) parts.push(fs.readFileSync(p, 'utf8').trim());
    else console.warn(`skipping missing ${file}`);
  }
  const combined = parts.join('\n\n---\n\n') + '\n';

  const generated = `// AUTO-GENERATED by scripts/build-knowledge.cjs — do not edit by hand.\n// Rerun that script after changing anything in knowledge/ or resume.html.\nexport const KNOWLEDGE_BASE = ${JSON.stringify(combined)};\n`;
  fs.writeFileSync(path.join(WORKER_SRC, 'knowledge-base.generated.js'), generated);
  console.log(`wrote worker/src/knowledge-base.generated.js (${combined.length} chars)`);
}

main().catch(err => { console.error(err); process.exit(1); });
