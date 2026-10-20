import { buildSystemPrompt } from './system-prompt.js';

const MESSAGE_MAX_LENGTH = 500;
const PER_VISITOR_LIMIT = 4;
const PER_VISITOR_WINDOW_HOURS = 24;
const PER_IP_LIMIT = 12;
const PER_IP_WINDOW_HOURS = 24;
const GEMINI_MODEL = 'gemini-3.8-flash';

// env.ALLOWED_ORIGIN_DEV is only ever set locally (in .dev.vars, gitignored)
// so a local frontend (e.g. http://localhost:4173) can call a locally-running
// Worker. It's never set in production, so this changes nothing deployed.
function resolveOrigin(origin, env) {
  if (origin && origin === env.ALLOWED_ORIGIN) return env.ALLOWED_ORIGIN;
  const devOrigins = (env.ALLOWED_ORIGIN_DEV || '').split(',').map(s => s.trim()).filter(Boolean);
  if (origin && devOrigins.includes(origin)) return origin;
  return null;
}

function corsHeaders(allowedOrigin) {
  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (allowedOrigin) headers['Access-Control-Allow-Origin'] = allowedOrigin;
  return headers;
}

function json(data, status, extraHeaders) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

async function hashIp(ip, salt) {
  const bytes = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// Strips control characters and caps length before anything touches the
// prompt or the database — the main defense against prompt-injection noise
// and runaway token spend from a single oversized message.
function sanitizeMessage(raw) {
  if (typeof raw !== 'string') return '';
  let out = '';
  for (const ch of raw) {
    const code = ch.codePointAt(0);
    const isControl = code < 0x20 && code !== 0x09 && code !== 0x0A && code !== 0x0D;
    if (isControl || code === 0x7F) continue;
    out += ch;
  }
  return out.trim().slice(0, MESSAGE_MAX_LENGTH);
}

// Theme switching is handled without ever calling Gemini: it's an instant,
// zero-token action, so (a) it shouldn't burn into the 4-question cap meant
// to bound Gemini spend, and (b) there's no reasonable way for a text reply
// from the model alone to also flip a CSS class on the page — the frontend
// needs an explicit action signal, not prose to parse.
const DARK_TRIGGERS = ['dark mode', 'dark theme', 'night mode'];
const LIGHT_TRIGGERS = ['light mode', 'light theme', 'day mode'];
function detectThemeAction(message) {
  const text = ` ${message.toLowerCase()} `;
  if (DARK_TRIGGERS.some(t => text.includes(t))) {
    return { action: 'theme-dark', reply: 'Done \u2014 switched to dark mode. Say "light mode" to switch back.' };
  }
  if (LIGHT_TRIGGERS.some(t => text.includes(t))) {
    return { action: 'theme-light', reply: 'Done \u2014 switched to light mode.' };
  }
  return null;
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// Google's own 503 message for this model says demand spikes are "usually
// temporary" — confirmed live in production (gemini-3.8-flash returned
// 503 UNAVAILABLE under load, succeeding moments later on retry), so a
// couple of short-backoff retries meaningfully improve real reliability
// instead of surfacing a transient overload as a hard failure to the user.
async function callGemini(env, message) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: buildSystemPrompt() }] },
    contents: [{ role: 'user', parts: [{ text: message }] }],
    // thinkingBudget: 0 disables gemini-3.8-flash's default reasoning pass —
    // confirmed via a direct API test that it cuts token usage by ~10x
    // (101 → 10 tokens for a trivial prompt) with no quality loss for
    // grounded, scripted-style Q&A like this. Worth revisiting if replies
    // start feeling shallow on harder questions.
    generationConfig: { maxOutputTokens: 400, temperature: 0.4, thinkingConfig: { thinkingBudget: 0 } },
  });

  // Each attempt gets its own bound (15s) via AbortController — without this,
  // a slow-but-eventually-successful Gemini call (observed, not just a fast
  // 503) could hang per attempt with no cap, and retrying that 3x compounds
  // into a worse wait than not retrying at all. A fast 503 still gets
  // retried quickly; a stuck connection gets cut and retried instead of
  // hanging indefinitely.
  const attempts = 2;
  const perAttemptTimeoutMs = 15000;
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), perAttemptTimeoutMs);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
        body,
        signal: controller.signal,
      });
      if (res.ok) {
        const data = await res.json();
        const reply = (data.candidates?.[0]?.content?.parts ?? []).map(p => p.text || '').join('').trim();
        const tokens = data.usageMetadata?.totalTokenCount ?? null;
        return { reply, tokens };
      }
      const detail = await res.text().catch(() => '');
      console.error(`Gemini API ${res.status} (attempt ${attempt}/${attempts}): ${detail.slice(0, 500)}`);
      lastError = new Error(`Gemini API ${res.status}: ${detail.slice(0, 300)}`);
      const retryable = res.status === 429 || res.status === 503;
      if (!retryable || attempt === attempts) break;
    } catch (err) {
      console.error(`Gemini fetch failed (attempt ${attempt}/${attempts}): ${err.message || err}`);
      lastError = err;
      if (attempt === attempts) break;
    } finally {
      clearTimeout(timer);
    }
    await sleep(attempt * 500);
  }
  throw lastError;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowedOrigin = resolveOrigin(origin, env);
    const headers = corsHeaders(allowedOrigin);
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (url.pathname !== '/api/chat') return json({ error: 'not_found' }, 404, headers);
    if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, headers);
    if (!allowedOrigin) return json({ error: 'forbidden_origin' }, 403, headers);

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'invalid_json' }, 400, headers);
    }

    const visitorId = typeof body.visitorId === 'string' && /^[a-zA-Z0-9-]{8,64}$/.test(body.visitorId)
      ? body.visitorId
      : null;
    const message = sanitizeMessage(body.message);
    if (!visitorId || !message) return json({ error: 'invalid_request' }, 400, headers);

    const themeAction = detectThemeAction(message);
    if (themeAction) {
      return json({ reply: themeAction.reply, action: themeAction.action, remaining: null }, 200, headers);
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const visitorWindowStart = new Date(now.getTime() - PER_VISITOR_WINDOW_HOURS * 3600_000).toISOString();

    // Hard, server-side enforcement of the 4-question cap — the client's own
    // count (shown in the UI) is a convenience, not the source of truth.
    const visitorCountRow = await env.DB.prepare(
      'SELECT COUNT(*) AS n FROM messages WHERE visitor_id = ? AND created_at >= ?'
    ).bind(visitorId, visitorWindowStart).first();
    const visitorCount = visitorCountRow?.n ?? 0;
    if (visitorCount >= PER_VISITOR_LIMIT) {
      return json({ error: 'rate_limited', remaining: 0 }, 429, headers);
    }

    // Secondary per-IP cap, keyed by a salted hash (never the raw IP) — a
    // backstop against clearing localStorage to reset the visitor id, not a
    // way to identify anyone.
    const ip = request.headers.get('CF-Connecting-IP') || '';
    if (ip) {
      const ipHash = await hashIp(ip, env.IP_HASH_SALT || 'dev-salt');
      const ipWindowStart = new Date(now.getTime() - PER_IP_WINDOW_HOURS * 3600_000).toISOString();
      const ipRow = await env.DB.prepare('SELECT count, window_start FROM ip_limits WHERE ip_hash = ?').bind(ipHash).first();
      const inWindow = ipRow && ipRow.window_start >= ipWindowStart;
      if (inWindow && ipRow.count >= PER_IP_LIMIT) {
        return json({ error: 'rate_limited', remaining: 0 }, 429, headers);
      }
      if (inWindow) {
        await env.DB.prepare('UPDATE ip_limits SET count = count + 1 WHERE ip_hash = ?').bind(ipHash).run();
      } else {
        await env.DB.prepare('INSERT OR REPLACE INTO ip_limits (ip_hash, window_start, count) VALUES (?, ?, 1)').bind(ipHash, nowIso).run();
      }
    }

    let reply, tokens;
    try {
      ({ reply, tokens } = await callGemini(env, message));
    } catch (err) {
      return json({ error: 'upstream_error' }, 502, headers);
    }
    if (!reply) return json({ error: 'upstream_error' }, 502, headers);

    await env.DB.batch([
      env.DB.prepare(
        'INSERT INTO visitors (id, first_seen, last_seen) VALUES (?, ?, ?) ' +
        'ON CONFLICT(id) DO UPDATE SET last_seen = excluded.last_seen'
      ).bind(visitorId, nowIso, nowIso),
      env.DB.prepare(
        'INSERT INTO messages (visitor_id, question, answer, created_at, tokens_used) VALUES (?, ?, ?, ?, ?)'
      ).bind(visitorId, message, reply, nowIso, tokens),
    ]);

    const remaining = Math.max(0, PER_VISITOR_LIMIT - visitorCount - 1);
    return json({ reply, remaining }, 200, headers);
  },
};
