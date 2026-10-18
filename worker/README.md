# Chatbot backend (Cloudflare Worker + D1)

Implements the backend from [the proposal doc](https://claude.ai/artifact/8JQa9aV2PcYgAgVSJrNvPn): a `POST /api/chat`
endpoint that enforces the 4-questions-per-visitor cap, calls Gemini Flash with a system prompt built from
`../knowledge/`, and logs every question/answer to D1.

Not yet wired up to the live site — `assistant.js` on the main site still uses the old scripted responder
until this is deployed and tested end to end (see "Not done yet" below).

## One-time setup

1. **Install Wrangler** (Cloudflare's CLI) and log in:
   ```
   cd worker
   npm install
   npx wrangler login
   ```
   This opens a browser to authorize the CLI against your Cloudflare account (free tier is fine — no card
   required for Workers/D1 at this scale).

2. **Create the D1 database**:
   ```
   npx wrangler d1 create paul-chatbot-db
   ```
   This prints a `database_id`. Paste it into `wrangler.toml` in place of `REPLACE_WITH_YOUR_D1_DATABASE_ID`.

3. **Get a Gemini API key**: [Google AI Studio → Get API key](https://aistudio.google.com/apikey). Free, no
   billing needed to start. This key is what lets the backend call the `gemini-2.0-flash` model — "using the
   Flash model" just means the Worker's code names that model in its API request (see `src/index.js`'s
   `GEMINI_MODEL` constant); there's no separate signup for Flash specifically, it's one of several models
   your one API key can call.

4. **Set the key as a secret, not a variable** — this is the part that keeps it out of the browser and out of
   git. Two places it needs to go:
   - **Local dev**: copy `.dev.vars.example` to `.dev.vars` (already gitignored) and fill in your real key.
   - **Production**: `npx wrangler secret put GEMINI_API_KEY` (pastes it straight into Cloudflare's encrypted
     secret store, never written to any file in this repo). Also run `npx wrangler secret put IP_HASH_SALT` with
     any random string — it salts the hashed IP addresses used for the secondary rate limit.

5. **Create the database tables**:
   ```
   npm run db:init:local   # for local dev
   npm run db:init         # for the real, deployed database
   ```

## Testing locally

```
npm run dev
```

This runs `wrangler dev --local`, which serves the Worker on `http://localhost:8787` using a local SQLite copy
of D1 (via Miniflare) — no deploy needed, and nothing touches your real database. Point a request at it:

```
curl -X POST http://localhost:8787/api/chat \
  -H 'Content-Type: application/json' \
  -H 'Origin: https://geddie212.github.io' \
  -d '{"visitorId":"test-visitor-123456","message":"What are his major projects?"}'
```

(The `Origin` header is required — the Worker rejects requests from anywhere but the real site's origin. For
local frontend testing against this local Worker, you'd temporarily add `http://localhost:4173` to
`ALLOWED_ORIGIN` in `wrangler.toml`, or override it via a `.dev.vars` entry — not committed as a permanent
change.)

Inspect what landed in the local database:
```
npx wrangler d1 execute paul-chatbot-db --local --command "SELECT * FROM messages ORDER BY id DESC LIMIT 5"
```

## The prompt template

`src/system-prompt.js` builds one system instruction per request:

- Fixed instructions (scope: only answer questions about Paul; formatting: `## heading` / `- bullet` only, to
  match what `assistant-data.js`'s `asciiBox()` already renders; a few sentences on tone/length).
- The entire contents of `src/knowledge-base.generated.js` appended underneath — this is `../knowledge/resume.md`
  + `../knowledge/linkedin.md` + `../knowledge/github.md`, concatenated by `../scripts/build-knowledge.cjs`.

The visitor's message is sent as the one user turn (Gemini's `contents: [{ role: 'user', parts: [{ text: message }] }]`).
There's no conversation history across turns yet — each question is answered independently; see Open Questions
in the proposal doc if you want that changed.

**Rerun the build script whenever `resume.html`, `knowledge/linkedin.md`, or the featured-repo list changes**,
so the generated file stays current:
```
node ../scripts/build-knowledge.cjs
```

## Deploying

```
npm run deploy
```

Deploys to `*.workers.dev` by default. Pointing the real `/api/chat` path at it from the static site (and,
later, a custom route) is part of the next step — updating `assistant.js` — not done yet.

## Not done yet

Per the proposal's rollout plan, still to do after this backend is confirmed working locally:

- Update `../assistant.js` / `../assistant-data.js` to call this endpoint instead of the scripted responder.
- Wire up GitHub Actions to deploy the Worker on push (currently a manual `npm run deploy`).
- Decide the open questions flagged in the proposal doc (rate-limit window, transcript inclusion, etc.) if not
  already settled.
