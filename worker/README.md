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

## Deploying to production

This is the one-time setup — do these in order. Everything after step 5 is automated by
`.github/workflows/deploy-worker.yml` from then on (it redeploys on every push that touches `worker/`,
`knowledge/`, or `resume.html`).

1. **Create the real D1 database** (the local one from "One-time setup" above is a separate, local-only copy):
   ```
   npx wrangler d1 create paul-chatbot-db
   ```
   Paste the `database_id` it prints into `wrangler.toml`, replacing `REPLACE_WITH_YOUR_D1_DATABASE_ID`.

2. **Apply the schema to it**:
   ```
   npm run db:init
   ```

3. **Set the production secrets** (separate from `.dev.vars` — these live on Cloudflare, not in this repo,
   and persist across deploys without needing to be re-set):
   ```
   npx wrangler secret put GEMINI_API_KEY
   npx wrangler secret put IP_HASH_SALT
   ```

4. **Deploy once by hand** to get the Worker's real URL:
   ```
   npm run deploy
   ```
   This prints something like `https://paul-chatbot.<your-subdomain>.workers.dev` — that's the live
   endpoint. Open `../assistant.js` and replace `PRODUCTION_CHAT_ENDPOINT`'s placeholder value with
   `https://<that-url>/api/chat`, then redeploy the static site as usual (just push — GitHub Pages serves
   `assistant.js` directly, no build step).

5. **Enable automatic deploys from GitHub** so future pushes redeploy the Worker without a manual step:
   - Create a Cloudflare API token: Cloudflare dashboard → **My Profile → API Tokens → Create Token** →
     use the **"Edit Cloudflare Workers"** template (grants Workers Scripts + D1 edit access).
   - Find your Account ID: Cloudflare dashboard → **Workers & Pages** → it's in the right-hand sidebar.
   - In this GitHub repo: **Settings → Secrets and variables → Actions → New repository secret**, add two:
     - `CLOUDFLARE_API_TOKEN` — the token from above.
     - `CLOUDFLARE_ACCOUNT_ID` — the account ID from above.
   - That's it — `.github/workflows/deploy-worker.yml` picks these up automatically on the next push.

Steps 1-4 need your Cloudflare login (`npx wrangler login` the first time you run any `wrangler` command
against your real account, if you haven't already) and can't be done without it. Step 5's two values are
the only things that need to reach me/this repo — paste them into GitHub's secret fields directly; they're
never visible in plain text again once saved, including to repo admins.

## Not done yet

- Decide the open questions flagged in the proposal doc (rate-limit window, transcript inclusion, etc.) if not
  already settled.
- Consider a custom domain/route instead of the `*.workers.dev` URL, if desired (not required — CORS already
  lets `geddie212.github.io` call it cross-origin as-is).
