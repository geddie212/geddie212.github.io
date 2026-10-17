/* Scripted, résumé-grounded answers plus the ASCII ripple/face generator. No network calls, no live model. */
(function (root) {
  'use strict';

  const LINKS = { resume: 'resume.html', github: 'https://github.com/geddie212', linkedin: 'https://linkedin.com/in/paul-ged', email: 'mailto:pauliusgedrimas@gmail.com' };

  const QUICK_QUESTIONS = ["What are his major projects?", "Where does he study?", "What's his experience?", "What's his tech stack?", "How do I contact him?"];

  const FALLBACK = `Not recognized. Try asking about his projects, stack, or experience, or say "dark mode". You can also read the full résumé.`;

  const INTENTS = [
    { id: 'ai', triggers: ['ai', 'artificial intelligence', 'machine learning', 'llm', 'model', 'neural'], text: `Yes — AI runs through most of his work: an LLM course-catalog agent, BehaviorTrace's random forest, and Forklane, a multi-provider coding agent.` },
    { id: 'role', triggers: ['full stack', 'fullstack', 'full-stack', 'back end', 'backend', 'front end', 'frontend'], text: `Full-stack, with a pull toward backend and data: Flask/SQLite APIs, a FastAPI service, and a SQL pipeline, plus this site's frontend and a SwiftUI app.` },
    { id: 'projects', triggers: ['project', 'projects', 'built', 'portfolio'], text: `A few highlights: BehaviorTrace (wearable biosignal research tooling), Apple BehaviorTrace (a SwiftUI companion app), Health Agent (conversational meal/workout logging), and Forklane (a multi-provider coding agent). See the Work and Lab sections above for the full writeups.` },
    { id: 'education', triggers: ['study', 'studying', 'school', 'university', 'where does he study', 'degree'], text: `He's studying Computer Science at the University of San Francisco, expected to graduate in 2028, with a 3.91/4.00 GPA.` },
    { id: 'experience', triggers: ['experience'], text: `Research infrastructure (BehaviorTrace), native app development (SwiftUI), applied AI (Forklane, Health Agent), and a 20-participant study on an LLM course-planning agent — mostly hands-on project work alongside his CS degree at USF.` },
    { id: 'stack', triggers: ['stack', 'tech stack', 'technologies', 'languages'], text: `Python, Java, C, JavaScript, HTML/CSS, SQL — plus Flask, FastAPI, SwiftUI, scikit-learn and LLM APIs via Forklane.` },
    { id: 'dark', triggers: ['dark mode', 'dark theme', 'night mode'], action: 'theme-dark', text: `Done — switched to dark mode. Say "light mode" to switch back.` },
    { id: 'light', triggers: ['light mode', 'light theme', 'day mode'], action: 'theme-light', text: `Done — switched to light mode.` },
    { id: 'contact', triggers: ['contact', 'email', 'linkedin'], text: `Best ways to reach him: <a href="${LINKS.email}">email</a> or <a href="${LINKS.linkedin}">LinkedIn</a> — both linked at the bottom of the site. Code's on <a href="${LINKS.github}">GitHub</a>.` },
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
    return lines;
  }

  function asciiBox(text, maxWidth, align) {
    maxWidth = maxWidth || 36;
    const lines = wrapText(text, maxWidth);
    let width = 0;
    for (const line of lines) width = Math.max(width, line.length);
    const border = '+' + '-'.repeat(width + 2) + '+';
    const body = lines.map(line => {
      const pad = ' '.repeat(width - line.length);
      return align === 'right' ? `| ${pad}${line} |` : `| ${line}${pad} |`;
    }).join('\n');
    return `${border}\n${body}\n${border}`;
  }

  // Ripple field + integrated face. cx/cy/shift are in ripple-grid columns/rows,
  // not pixels — the view layer measures the ripple's actual rendered font to
  // convert this into real screen coordinates, so it stays correct regardless
  // of container width or font-size changes.
  const RAMP = [' ', '.', "'", '`', ':', ';', '+', 'x', 'X', '#'];
  const ROWS = 13, COLS = 240, VISIBLE_COLS = 143, INNER_RADIUS = 13, FACE_SHIFT_COLS = 21;
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

  const api = { respond, QUICK_QUESTIONS, LINKS, wrapText, asciiBox, buildRipple, rippleCenter, FACES, ROWS, COLS, VISIBLE_COLS, FACE_SHIFT_COLS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AssistantData = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
