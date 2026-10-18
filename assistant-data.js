/* Scripted, résumé-grounded answers plus the ASCII ripple/face generator. No network calls, no live model. */
(function (root) {
  'use strict';

  const LINKS = { resume: 'resume.html', github: 'https://github.com/geddie212', linkedin: 'https://linkedin.com/in/paul-ged', email: 'mailto:pauliusgedrimas@gmail.com' };

  const QUICK_QUESTIONS = ["What are his major projects?", "Where does he study?", "What's his experience?", "What's his tech stack?"];

  const FALLBACK = `Not recognized. Try asking about his projects, stack, or experience, or say "dark mode". You can also read the full résumé.`;

  const INTENTS = [
    { id: 'ai', triggers: ['ai', 'artificial intelligence', 'machine learning', 'llm', 'model', 'neural'], text: `## Does he use AI?\n\nYes — AI runs through most of his work:\n- An LLM course-catalog agent\n- BehaviorTrace's random forest\n- Forklane, a multi-provider coding agent` },
    { id: 'role', triggers: ['full stack', 'fullstack', 'full-stack', 'back end', 'backend', 'front end', 'frontend'], text: `## Full-stack, backend-leaning\n\nHe works across the whole stack, with a pull toward backend and data:\n- Flask and SQLite APIs\n- A FastAPI service\n- A SQL data pipeline\n- This site's frontend and a SwiftUI app` },
    { id: 'projects', triggers: ['project', 'projects', 'built', 'portfolio'], text: `## Major projects\n\n- BehaviorTrace — wearable biosignal research tooling\n- Apple BehaviorTrace — SwiftUI companion app\n- Health Agent — conversational meal/workout logging\n- Forklane — multi-provider coding agent\n\nSee the Work and Lab sections above for the full writeups.` },
    { id: 'education', triggers: ['study', 'studying', 'school', 'university', 'where does he study', 'degree'], text: `## Education\n\n- University of San Francisco\n- B.S. Computer Science\n- Expected graduation 2028\n- GPA 3.91 / 4.00` },
    { id: 'experience', triggers: ['experience'], text: `## Experience\n\n- Research infrastructure — BehaviorTrace\n- Native app development — SwiftUI\n- Applied AI — Forklane, Health Agent\n- A 20-participant study on an LLM course-planning agent\n\nMostly hands-on project work alongside his CS degree at USF.` },
    { id: 'stack', triggers: ['stack', 'tech stack', 'technologies', 'languages'], text: `## Tech stack\n\n- Languages: Python, Java, C, JavaScript, HTML/CSS, SQL\n- Frameworks: Flask, FastAPI, SwiftUI\n- Other: scikit-learn, LLM APIs via Forklane` },
    { id: 'dark', triggers: ['dark mode', 'dark theme', 'night mode'], action: 'theme-dark', text: `Done — switched to dark mode. Say "light mode" to switch back.` },
    { id: 'light', triggers: ['light mode', 'light theme', 'day mode'], action: 'theme-light', text: `Done — switched to light mode.` },
    { id: 'contact', triggers: ['contact', 'email', 'linkedin'], text: `## Get in touch\n\n- Email: ${LINKS.email}\n- LinkedIn: ${LINKS.linkedin}\n- GitHub: ${LINKS.github}` },
  ];

  function respond(raw) {
    const text = ` ${String(raw).toLowerCase()} `;
    for (const intent of INTENTS) {
      for (const trigger of intent.triggers) {
        if (text.indexOf(trigger) !== -1) return intent;
      }
    }
    return { text: FALLBACK, action: null };
  }

  function wrapText(text, width) {
    const words = text.split(' ');
    const lines = [];
    let cur = '';
    for (const word of words) {
      const test = cur ? `${cur} ${word}` : word;
      if (test.length > width) { if (cur) lines.push(cur); cur = word; }
      else cur = test;
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [''];
  }

  // Wraps one bullet item with a "• " marker on the first line and a
  // matching two-space hanging indent on any wrapped continuation lines.
  function wrapBullet(text, width) {
    const marker = '• ';
    const indent = '  ';
    const words = text.split(' ');
    const lines = [];
    let cur = '';
    let first = true;
    const limit = () => (first ? width - marker.length : width - indent.length);
    for (const word of words) {
      const test = cur ? `${cur} ${word}` : word;
      if (test.length > limit()) {
        lines.push((first ? marker : indent) + cur);
        first = false;
        cur = word;
      } else {
        cur = test;
      }
    }
    lines.push((first ? marker : indent) + cur);
    return lines;
  }

  // Minimal markup: blank lines separate blocks, "## " starts a heading
  // (rendered upper-case), "- " starts a bullet (wrapped with a hanging
  // indent). Everything else wraps as a plain paragraph line.
  function formatLines(text, width) {
    const out = [];
    for (const raw of text.split('\n')) {
      if (raw === '') { out.push(''); continue; }
      if (raw.startsWith('## ')) out.push(...wrapText(raw.slice(3).toUpperCase(), width));
      else if (raw.startsWith('- ')) out.push(...wrapBullet(raw.slice(2), width));
      else out.push(...wrapText(raw, width));
    }
    return out;
  }

  // Draws an ASCII box sized to its own content — word-wrapped at
  // maxWidth, which acts as a cap, not a fixed size, so a short reply
  // stays small and a long one grows up to ~90% of the screen. `format`
  // enables the heading/bullet markup above — left off for raw user
  // input, so a typed "- " or blank line can't be misread as markup.
  function asciiBox(text, maxWidth, align, format) {
    maxWidth = maxWidth || 36;
    const lines = format ? formatLines(text, maxWidth) : text.split('\n').flatMap(line => wrapText(line, maxWidth));
    let width = 0;
    for (const line of lines) width = Math.max(width, line.length);
    const border = '+' + '-'.repeat(width + 2) + '+';
    const body = lines.map(line => {
      const pad = ' '.repeat(Math.max(0, width - line.length));
      return align === 'right' ? `| ${pad}${line} |` : `| ${line}${pad} |`;
    }).join('\n');
    return `${border}\n${body}\n${border}`;
  }

  // Ripple field + integrated face. cx/cy/shift are in ripple-grid columns/rows,
  // not pixels — the view layer measures the ripple's actual rendered font to
  // convert this into real screen coordinates, so it stays correct regardless
  // of container width or font-size changes.
  const RAMP = [' ', '.', "'", '`', ':', ';', '+', 'x', 'X', '#'];
  const ROWS = 13, COLS = 240, VISIBLE_COLS = 143, INNER_RADIUS = 13, FACE_SHIFT_COLS = -15;
  const FACES = ['d[oᴥo]b', 'd[*˔*]b', 'd[^ᴗ^]b', 'd[o_0]b'];

  function rippleCenter() {
    return { cx: VISIBLE_COLS / 2 + FACE_SHIFT_COLS, cy: ROWS / 2 };
  }

  function buildRipple(phase) {
    const { cx, cy } = rippleCenter();
    const rows = [];
    for (let y = 0; y < ROWS; y++) {
      let row = '';
      for (let x = 0; x < COLS; x++) {
        const dx = x - cx, dy = (y - cy) * 2.15;
        const r = Math.sqrt(dx * dx + dy * dy);
        if (r < INNER_RADIUS) { row += ' '; continue; }
        const ang = Math.atan2(dy, dx);
        const v = Math.sin(r * 0.85 - phase) * 0.72 + Math.sin(ang * 3 + phase * 0.35) * 0.28;
        const t = Math.max(0, Math.min(1, (v + 1) / 2));
        row += RAMP[Math.min(RAMP.length - 1, Math.floor(t * RAMP.length))];
      }
      rows.push(row);
    }
    return rows.join('\n');
  }

  const api = { respond, QUICK_QUESTIONS, LINKS, wrapText, wrapBullet, formatLines, asciiBox, buildRipple, rippleCenter, FACES, ROWS, COLS, VISIBLE_COLS, FACE_SHIFT_COLS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AssistantData = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
