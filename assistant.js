'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const log = $('chat-log'), form = $('chat-form'), input = $('chat-input'), status = $('chat-status'), quick = $('chat-quick');
  if (!log || !form || !input || !AssistantData) return;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  function addMessage(role, html) {
    const row = document.createElement('div');
    row.className = `chat-msg chat-msg--${role}`;
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble-text';
    if (role === 'user') bubble.textContent = html;
    else bubble.innerHTML = html;
    row.appendChild(bubble);
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
    return row;
  }

  function runAction(action) {
    if (!window.PortfolioTheme) return;
    if (action === 'theme-dark') window.PortfolioTheme.setDark(true);
    else if (action === 'theme-light') window.PortfolioTheme.setDark(false);
    else if (action === 'theme-toggle') window.PortfolioTheme.toggle();
  }

  function send(raw) {
    const text = raw.trim();
    if (!text) return;
    addMessage('user', text);
    const { text: replyHtml, action } = AssistantData.respond(text);
    if (action) runAction(action);
    if (reduceMotion.matches) {
      addMessage('assistant', replyHtml);
      return;
    }
    const typing = addMessage('assistant', '<span class="chat-typing"><i></i><i></i><i></i></span>');
    status.textContent = 'Thinking…';
    setTimeout(() => {
      typing.querySelector('.chat-bubble-text').innerHTML = replyHtml;
      status.textContent = 'Ready';
      log.scrollTop = log.scrollHeight;
    }, 420);
  }

  (AssistantData.QUICK_QUESTIONS || []).forEach(question => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = question;
    button.addEventListener('click', () => send(question));
    quick.appendChild(button);
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    send(input.value);
    input.value = '';
    input.focus();
  });

  addMessage('assistant', "Hi, I'm a scripted assistant trained on Paul's résumé — not a live model, so nothing you type leaves your browser. Ask a question or tap one below.");
  status.textContent = 'Ready';
})();
