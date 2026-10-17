'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const $ripple = $('chat-ripple'), $face = $('chat-face'), $status = $('chat-status-label');
  const $messages = $('chat-messages'), $chips = $('chat-chips');
  const $form = $('chat-form'), $input = $('chat-input');
  if (!$ripple || !$messages || !window.AssistantData) return;

  const A = window.AssistantData;

  const state = {
    phase: 0,
    faceFrame: 0,
    status: 'idle',
    messages: [
      { role: 'a', text: "Hi, I'm a scripted assistant trained on Paul's résumé. Ask a question or tap a suggestion." },
    ],
  };
  let idleTimer = null, thinkTimer = null;

  function renderRipple() { $ripple.textContent = A.buildRipple(state.phase); }
  function renderFace() { $face.textContent = A.FACES[state.faceFrame % A.FACES.length]; }

  const STATUS_MAP = {
    idle: ['IDLE', '#8a8f8a'],
    thinking: ['THINKING', '#FF8A00'],
    responding: ['RESPONDING', '#33ff66'],
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

  function appendMessage(m, autoscroll) {
    const row = document.createElement('div');
    row.className = `chat-msg-row ${m.role === 'u' ? 'is-user' : 'is-assistant'}`;
    const pre = document.createElement('pre');
    pre.textContent = A.asciiBox(m.text, 17, m.role === 'u' ? 'right' : 'left');
    row.appendChild(pre);
    $messages.appendChild(row);
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

  function send(raw) {
    const text = (raw || '').trim();
    if (!text) return;
    if (idleTimer) clearTimeout(idleTimer);
    if (thinkTimer) clearTimeout(thinkTimer);
    state.messages.push({ role: 'u', text });
    appendMessage(state.messages[state.messages.length - 1], true);
    $input.value = '';
    state.status = 'thinking';
    renderStatus();
    const reply = A.respond(text);
    if (reply.action) runAction(reply.action);
    thinkTimer = setTimeout(() => {
      state.messages.push({ role: 'a', text: reply.text });
      appendMessage(state.messages[state.messages.length - 1], true);
      state.status = 'responding';
      renderStatus();
      idleTimer = setTimeout(() => { state.status = 'idle'; renderStatus(); }, 15000);
    }, 550);
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
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  if (!reduceMotion.matches) {
    setInterval(() => { state.phase += 0.12; renderRipple(); }, 90);
    setInterval(() => { state.faceFrame += 1; renderFace(); }, 2000);
  }
})();
