'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const $ripple = $('chat-ripple'), $face = $('chat-face'), $status = $('chat-status-label');
  const $messages = $('chat-messages'), $chips = $('chat-chips');
  const $form = $('chat-form'), $input = $('chat-input'), $send = $('chat-send');
  if (!$ripple || !$messages || !window.AssistantData) return;

  const A = window.AssistantData;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  // Picks the local dev Worker (localhost:8787) when the site itself is
  // running locally, and the deployed Worker everywhere else (including the
  // real geddie212.github.io) — so this file doesn't need hand-editing when
  // moving between local testing and production. Fill in PRODUCTION_CHAT_ENDPOINT
  // once you have your Worker's real URL (see worker/README.md's "Deploying" section).
  const PRODUCTION_CHAT_ENDPOINT = 'https://REPLACE-WITH-YOUR-WORKER-SUBDOMAIN.workers.dev/api/chat';
  const LOCAL_CHAT_ENDPOINT = 'http://localhost:8787/api/chat';
  const isLocalHost = ['localhost', '127.0.0.1'].includes(location.hostname);
  const CHAT_ENDPOINT = isLocalHost ? LOCAL_CHAT_ENDPOINT : PRODUCTION_CHAT_ENDPOINT;
  const RATE_LIMIT_MESSAGE = "That's the limit for this conversation — a small cap keeps the demo from burning through API quota. Thanks for chatting!";
  const NETWORK_ERROR_MESSAGE = "Couldn't reach the live assistant just now. Here's a scripted answer instead:";

  function getVisitorId() {
    try {
      let id = localStorage.getItem('chat-visitor-id');
      if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem('chat-visitor-id', id);
      }
      return id;
    } catch {
      // localStorage can throw in private/locked-down browsing — fall back
      // to a per-page-load id rather than breaking the widget.
      return `session-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    }
  }
  const visitorId = getVisitorId();

  const state = {
    phase: 0,
    faceFrame: 0,
    status: 'idle',
    limited: false,
    messages: [
      { role: 'a', text: "Hi, I'm an assistant grounded on Paul's résumé, GitHub, and LinkedIn. Ask a question or tap a suggestion." },
    ],
  };
  let idleTimer = null;

  function renderRipple() { $ripple.textContent = A.buildRipple(state.phase); }
  function renderFace() { $face.textContent = A.FACES[state.faceFrame % A.FACES.length]; }

  const STATUS_MAP = {
    idle: ['IDLE', '#8a8f8a'],
    thinking: ['THINKING', '#FF8A00'],
    responding: ['RESPONDING', '#C6ECAE'],
  };
  function renderStatus() {
    const [label, color] = STATUS_MAP[state.status];
    $status.textContent = `● ${label}`;
    $status.style.color = color;
  }

  // Position the face from the ripple's own actually-rendered metrics
  // (measured via a probe span in the ripple's real font) instead of a
  // guessed pixel offset, so it stays correct across any container width
  // or font-size change.
  function positionFace() {
    const cs = getComputedStyle($ripple);
    const probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre';
    probe.style.font = cs.font;
    probe.style.letterSpacing = cs.letterSpacing;
    probe.textContent = 'M'.repeat(50);
    document.body.appendChild(probe);
    const charW = probe.getBoundingClientRect().width / 50;
    document.body.removeChild(probe);
    let lineH = parseFloat(cs.lineHeight);
    if (!lineH || Number.isNaN(lineH)) lineH = parseFloat(cs.fontSize) * 1.05;
    const padLeft = parseFloat(cs.paddingLeft) || 0;
    const padTop = parseFloat(cs.paddingTop) || 0;
    const { cx, cy } = A.rippleCenter();
    $face.style.left = `${padLeft + cx * charW}px`;
    $face.style.top = `${$ripple.offsetTop + padTop + cy * lineH}px`;
  }

  // Figures out how many monospace columns a message box should use so it
  // fills ~90% of the chat log's width, by measuring an offscreen probe
  // styled exactly like a real message (so font-size changes at narrower
  // breakpoints are picked up automatically instead of being hardcoded).
  function computeBoxWidth() {
    const probeRow = document.createElement('div');
    probeRow.className = 'chat-msg-row';
    probeRow.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;left:-9999px;top:-9999px';
    const probePre = document.createElement('pre');
    probePre.style.whiteSpace = 'pre';
    probePre.textContent = 'M'.repeat(50);
    probeRow.appendChild(probePre);
    document.body.appendChild(probeRow);
    const charW = probePre.getBoundingClientRect().width / 50;
    document.body.removeChild(probeRow);
    if (!charW) return 36;
    const cs = getComputedStyle($messages);
    const availPx = $messages.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
    const totalChars = Math.floor((availPx * 0.9) / charW);
    return Math.max(10, totalChars - 5);
  }

  // Progressively reveals assistant replies character by character with a
  // blinking cursor, instead of dumping the whole ASCII box in at once —
  // reads as "generating", not instant. User messages still appear instantly
  // (they were already typed by the person sending them).
  function typeOut(pre, cursor, full) {
    if (reduceMotion.matches) { pre.textContent = full; cursor.remove(); return; }
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      pre.textContent = full.slice(0, i);
      $messages.scrollTop = $messages.scrollHeight;
      if (i >= full.length) { clearInterval(timer); cursor.remove(); }
    }, 10);
  }

  function appendMessage(m, autoscroll) {
    const row = document.createElement('div');
    row.className = `chat-msg-row ${m.role === 'u' ? 'is-user' : 'is-assistant'}`;
    const pre = document.createElement('pre');
    const boxWidth = computeBoxWidth();
    const full = A.asciiBox(m.text, boxWidth, m.role === 'u' ? 'right' : 'left', m.role !== 'u');
    row.appendChild(pre);
    $messages.appendChild(row);
    if (m.role === 'u') {
      pre.textContent = full;
    } else {
      const cursor = document.createElement('span');
      cursor.className = 'chat-type-cursor';
      row.appendChild(cursor);
      typeOut(pre, cursor, full);
    }
    if (autoscroll) $messages.scrollTop = $messages.scrollHeight;
  }
  function renderMessages() {
    $messages.innerHTML = '';
    state.messages.forEach(m => appendMessage(m, false));
    $messages.scrollTop = 0;
  }

  function runAction(action) {
    if (!window.PortfolioTheme) return;
    if (action === 'theme-dark') window.PortfolioTheme.setDark(true);
    else if (action === 'theme-light') window.PortfolioTheme.setDark(false);
  }

  function lockComposer(placeholder) {
    state.limited = true;
    $input.value = '';
    $input.disabled = true;
    $input.placeholder = placeholder;
    $send.disabled = true;
  }

  // Calls the real backend (Worker + Gemini) for a grounded reply. Falls
  // back to the old scripted responder on any network/server failure, so
  // the widget still answers something rather than hanging forever.
  async function fetchReply(text) {
    // Gemini's latency is real and occasionally much higher than typical
    // (observed up to ~25s on a large system prompt) — a generous abort
    // timeout is a safety net against a truly stuck connection, not a
    // normal-case budget, so it's set well above what's actually been seen.
    const controller = new AbortController();
    const abortTimer = setTimeout(() => controller.abort(), 40000);
    let res;
    try {
      res = await fetch(CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId, message: text }),
        signal: controller.signal,
      });
    } catch {
      const fallback = A.respond(text);
      return { text: `${NETWORK_ERROR_MESSAGE}\n\n${fallback.text}`, action: fallback.action, remaining: null };
    } finally {
      clearTimeout(abortTimer);
    }

    if (res.status === 429) {
      return { text: RATE_LIMIT_MESSAGE, action: null, remaining: 0 };
    }
    if (!res.ok) {
      const fallback = A.respond(text);
      return { text: `${NETWORK_ERROR_MESSAGE}\n\n${fallback.text}`, action: fallback.action, remaining: null };
    }
    const data = await res.json().catch(() => ({}));
    if (!data.reply) {
      const fallback = A.respond(text);
      return { text: `${NETWORK_ERROR_MESSAGE}\n\n${fallback.text}`, action: fallback.action, remaining: null };
    }
    return { text: data.reply, action: data.action || null, remaining: typeof data.remaining === 'number' ? data.remaining : null };
  }

  async function send(raw) {
    const text = (raw || '').trim();
    if (!text || state.limited) return;
    if (idleTimer) clearTimeout(idleTimer);

    state.messages.push({ role: 'u', text });
    appendMessage(state.messages[state.messages.length - 1], true);
    $input.value = '';
    $input.disabled = true;
    $send.disabled = true;
    state.status = 'thinking';
    renderStatus();

    const reply = await fetchReply(text);
    if (reply.action) runAction(reply.action);

    state.messages.push({ role: 'a', text: reply.text });
    appendMessage(state.messages[state.messages.length - 1], true);
    state.status = 'responding';
    renderStatus();

    if (reply.remaining === 0) {
      lockComposer('Question limit reached for this conversation');
    } else {
      $input.disabled = false;
      $send.disabled = false;
      idleTimer = setTimeout(() => { state.status = 'idle'; renderStatus(); }, 15000);
    }
  }

  A.QUICK_QUESTIONS.forEach((label, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    const idx = document.createElement('span'); idx.className = 'chat-chip-idx'; idx.textContent = String(i + 1).padStart(2, '0');
    const lbl = document.createElement('span'); lbl.className = 'chat-chip-lbl'; lbl.textContent = label;
    const chev = document.createElement('span'); chev.className = 'chat-chip-chev'; chev.textContent = '›';
    btn.append(idx, lbl, chev);
    btn.addEventListener('click', () => send(label));
    $chips.appendChild(btn);
  });

  $form.addEventListener('submit', e => { e.preventDefault(); send($input.value); });

  renderMessages();
  renderStatus();
  renderRipple();
  renderFace();
  positionFace();
  window.addEventListener('resize', positionFace);
  if (!reduceMotion.matches) {
    setInterval(() => { state.phase += 0.12; renderRipple(); }, 90);
    setInterval(() => { state.faceFrame += 1; renderFace(); }, 2000);
  }
})();
