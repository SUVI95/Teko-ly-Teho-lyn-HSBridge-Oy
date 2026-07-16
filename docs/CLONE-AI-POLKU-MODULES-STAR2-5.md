# Clone guide: ★2–★5 AI modules → AI Polku project

Handoff for **another Cursor agent** working in the **AI Polku** repo.  
**Do not paste HTML into chat** — clone files from git.

> **AI Polku target note (Express):** this repo is Express (`server.js`), not Next.js App Router.
> Catalog = `public/index.html`. Auth gate = `GET /module/:moduleId` in `server.js`.
> Bonus save API = `routes/bonus-module.js` (`/api/bonus-module/responses`).
> ★5 = `routes/cs-call.js` mounted at `/api/cs-call` + Express `public/js/cs-mock-realtime.js`
> (paths `/realtime/config` + `/realtime/session`). Do **not** overwrite that client with the
> Monikanava Next.js workbench JS unless you also port `app/api/cs-call/*`.

## Source repo

```bash
git clone https://github.com/SUVI95/Monikanavaisen-asiakaspalvelun-osaajaksi.git
cd Monikanavaisen-asiakaspalvelun-osaajaksi
git checkout main
```

Production reference (login required):

| Label | Live URL | Slug |
|-------|----------|------|
| ★2 Tekoälylaki | https://portfolio.duunijobs.fi/moduuli-eu-ai-act-moduuli5.html | `eu-ai-act-moduuli5` |
| ★3 Prompt-hiomo | https://portfolio.duunijobs.fi/moduuli-prompt-hiomo.html | `prompt-hiomo` |
| ★4 HITL | https://portfolio.duunijobs.fi/moduuli-hitl-architect.html | `hitl-architect` |
| ★5 Live-puhelu | https://portfolio.duunijobs.fi/moduuli-asiakaspalvelu-live-puhelu.html | `asiakaspalvelu-live-puhelu` |

**Pedagogical order in AI Polku:** ★2 → ★3 → ★4 → ★5 (after Perplexity/NotebookLM if you also clone ★ AI).

---

## Two architectures (important)

### A) ★2, ★3, ★4 — “bonus module runtime” pattern

Same stack as bottityypit / moduuli A / moduuli B:

```
Static HTML (public/moduuli-*.html)
  ├─ window.BONUS_MODULE_SLUG = 'eu-ai-act-moduuli5' | 'prompt-hiomo' | 'hitl-architect'
  ├─ /js/bonus-module-runtime.js     → save/load + AI helper
  ├─ /js/*-persistence.js            → autosave _state snapshots
  └─ /js/*-runtime.js (+ hitl extras) → exercises + UI

APIs
  ├─ GET/POST /api/bonus-module/responses?slug=…   → Postgres module_responses
  └─ POST       /api/module-ai                     → Claude/OpenAI feedback

Next.js
  ├─ app/module/moduuli-*/page.tsx   → login + access → redirect .html
  └─ middleware.ts                   → auth on .html + APIs
```

**Persistence:** rows in `module_responses` with `section_id` like `bonus-ai/{slug}/_state`, `bonus-ai/{slug}/ai-feedback`, etc.

### B) ★5 Live-puhelu — WebRTC “cs-call” pattern (separate package)

```
Static HTML + CSS + JS workbench
  ├─ /css/cs-workbench.css
  ├─ /js/cs-rig-ui.js, cs-mock-realtime.js, cs-pressure-engine.js, …
  └─ inline orchestrator (see bundle doc if HTML missing locally)

APIs (/api/cs-call/*)
  ├─ GET  /api/cs-call/config
  ├─ GET  /api/cs-call/crm?scenario=
  ├─ POST /api/cs-call/session          → OpenAI Realtime WebRTC
  ├─ POST /api/cs-call/classify-state
  └─ POST /api/cs-call/feedback

Lib
  └─ lib/cs-call/* + lib/cs-call-api-auth.ts
```

See also: `packages/customer-service-live-call/README.md`

---

## What each module teaches (for AI Polku positioning)

| Module | Finnish name | Content (reuse as-is or rebrand copy later) |
|--------|--------------|---------------------------------------------|
| ★2 | Tekoälylaki asiakaspalvelussa | 6 EU AI Act cases: bot audit, risk stop, video label, escalation, vendor review, approval gate |
| ★3 | Kirjoita botin ohje (Prompt-hiomo) | Write/test/fix bot system prompts live (Kaiku Audio scenarios) |
| ★4 | Kun botti ei riitä (HITL) | When to escalate to human: hallucinations, GDPR, money, social crisis |
| ★5 | Haastava asiakas — live-puhelu | WebRTC: AI = angry customer, student = agent, 4-turn call + written feedback |

For **job seekers learning AI**, these still work if you frame them as **“AI in professional communication / compliance / escalation”** — rebrand nav titles later; clone mechanics first.

---

## Files to copy

### Shared by ★2, ★3, ★4 (copy once)

```
public/js/bonus-module-runtime.js
public/js/bonus-module-nav.js          # hitl only; safe to copy for all

app/api/bonus-module/responses/route.ts
app/api/module-ai/route.ts

lib/bonus-access.ts                    # merge slug paths + participantCanAccessBonusModule
lib/bonus-modules.ts                   # merge 3 registry entries (or all 4)
lib/bonus-api-auth.ts
lib/duunijobs-ai.ts
lib/openai-server.ts
lib/auth.ts                            # or adapt to target auth
lib/db.ts
```

Optional dev previews (localhost without login):

```
lib/dev-module-preview.ts              # merge path helpers
```

### ★2 Tekoälylaki

```
public/moduuli-eu-ai-act-moduuli5.html
public/js/eu-ai-act-moduuli5-persistence.js
public/js/eu-ai-act-moduuli5-runtime.js
public/js/eu-ai-act-moduuli5-a11y-local.js
public/js/eu-ai-act-moduuli5-live-demo.js
public/js/eu-ai-act-moduuli5-ux-local.js     # if linked from HTML
public/css/eu-ai-act-a11y-local.css          # if linked from HTML

app/module/moduuli-eu-ai-act-moduuli5/page.tsx
lib/eu-ai-act-moduuli5-html.ts               # admin HTML preview route (optional)
app/api/eu-ai-act-moduuli5-html-preview/route.ts   # optional
```

### ★3 Prompt-hiomo

```
public/moduuli-prompt-hiomo.html
public/js/prompt-hiomo-persistence.js
public/js/prompt-hiomo-runtime.js
public/css/prompt-hiomo-a11y-preview.css     # if linked

app/module/moduuli-prompt-hiomo/page.tsx
lib/prompt-hiomo-html.ts                     # optional admin preview
app/api/prompt-hiomo-html-preview/route.ts   # optional
scripts/smoke-prompt-hiomo.mjs               # optional smoke test
```

### ★4 HITL

```
public/moduuli-hitl-architect.html
public/js/hitl-architect-persistence.js
public/js/hitl-architect-exercises.js
public/js/hitl-progressive-preview.js
public/js/hitl-ex3-data-preview.js           # if referenced
public/css/hitl-a11y-preview.css             # if linked

app/module/moduuli-hitl-architect/page.tsx
lib/hitl-architect-html.ts                   # optional
app/api/hitl-architect-html-preview/route.ts # optional
```

### ★5 Live-puhelu (full stack)

```
# HTML — NOT in git on main; use one of:
#   1) curl from deployed app while logged in as admin
#   2) copy public/preview-cs-live-call.html → moduuli-asiakaspalvelu-live-puhelu.html and fix nav/auth
#   3) reconstruct from public/moduuli-asiakaspalvelu-live-puhelu-css-js-bundle.md

public/css/cs-workbench.css
public/js/cs-rig-ui.js
public/js/cs-mock-realtime.js
public/js/cs-pressure-engine.js
public/js/cs-crm-ui.js
public/js/cs-live-autosave.js

app/module/moduuli-asiakaspalvelu-live-puhelu/page.tsx
app/api/cs-call/config/route.ts
app/api/cs-call/crm/route.ts
app/api/cs-call/session/route.ts
app/api/cs-call/feedback/route.ts
app/api/cs-call/classify-state/route.ts
app/api/cs-call/transcribe/route.ts
app/api/cs-call/email-feedback/route.ts

lib/cs-call/scenarios.ts
lib/cs-call/crm-data.ts
lib/cs-call/pressure-engine.ts
lib/cs-call/call-state-classifier.ts
lib/cs-call/realtime-session.ts
lib/cs-call/email-feedback.ts
lib/cs-call/feedback-rubric.ts
lib/cs-call-api-auth.ts
lib/cs-live-html.ts                          # optional preview helper

packages/customer-service-live-call/README.md
scripts/smoke-cs-call.mjs
public/preview-cs-live-call.html             # dev fallback UI
```

---

## Registry entries (`lib/bonus-modules.ts`)

Add to `BONUS_MODULES` (descriptions can say **“Ei vaikuta todistukseen”** or drop certificate wording in AI Polku):

```typescript
// Slugs (constants already in source lib/bonus-modules.ts)
// EU_AI_ACT_MODUULI5_BONUS_SLUG = "eu-ai-act-moduuli5"
// PROMPT_HIOMO_BONUS_SLUG = "prompt-hiomo"
// HITL_ARCHITECT_BONUS_SLUG = "hitl-architect"
// ASIAKASPALVELU_LIVE_PUHELU_BONUS_SLUG = "asiakaspalvelu-live-puhelu"
```

In Monikanava these four are in **`PARTICIPANT_OPEN_BONUS_SLUGS`** (all logged-in users).  
For AI Polku: either keep them open to all participants **or** gate with an email allowlist like Monikanava’s preview lists.

Suggested **AI Polku learning path order** (new constant in target project):

```typescript
export const AI_POLKU_MODULE_PATH = [
  "eu-ai-act-moduuli5",      // ★2
  "prompt-hiomo",           // ★3
  "hitl-architect",         // ★4
  "asiakaspalvelu-live-puhelu", // ★5
] as const;
```

---

## Middleware (patch target `middleware.ts`)

Require login for:

```
/moduuli-eu-ai-act-moduuli5.html
/module/moduuli-eu-ai-act-moduuli5
/moduuli-prompt-hiomo.html
/module/moduuli-prompt-hiomo
/moduuli-hitl-architect.html
/module/moduuli-hitl-architect
/moduuli-asiakaspalvelu-live-puhelu.html
/module/moduuli-asiakaspalvelu-live-puhelu

/api/bonus-module/*
/api/module-ai
/api/cs-call/*
```

Copy slug → path rules from source `lib/bonus-access.ts` → `bonusSlugFromPathname()`.

---

## Database

Bonus modules (★2–★4) need **`module_responses`** (already in Monikanava schema):

```sql
-- minimum columns used by /api/bonus-module/responses
-- user_id UUID, module_number INT, section_id TEXT, prompt_text TEXT,
-- user_text TEXT, ai_response TEXT, created_at TIMESTAMPTZ
```

Live puhelu saves feedback via `/api/cs-call/feedback` → also `module_responses`.

Target project must have **`users`** + working session auth.

---

## Environment variables

```env
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=

OPENAI_API_KEY=              # required (module-ai + live Realtime)
ANTHROPIC_API_KEY=           # recommended for Claude grading in ★2–★4
ANTHROPIC_MODEL=             # optional

OPENAI_REALTIME_MODEL=gpt-realtime-2   # ★5 only
OPENAI_REALTIME_VOICE=marin            # ★5 only
```

---

## One-shot copy script

Run from **AI Polku project root** (adjust `SOURCE`):

```bash
SOURCE="../Monikanavaisen-asiakaspalvelun-osaajaksi"

# ── Shared bonus runtime ──
mkdir -p public/js app/api/bonus-module/responses app/api/module-ai
cp "$SOURCE/public/js/bonus-module-runtime.js" public/js/
cp "$SOURCE/public/js/bonus-module-nav.js" public/js/
cp "$SOURCE/app/api/bonus-module/responses/route.ts" app/api/bonus-module/responses/
cp "$SOURCE/app/api/module-ai/route.ts" app/api/module-ai/

# ── ★2 EU AI Act ──
cp "$SOURCE/public/moduuli-eu-ai-act-moduuli5.html" public/
cp "$SOURCE/public/js/eu-ai-act-moduuli5-"*.js public/js/
mkdir -p app/module/moduuli-eu-ai-act-moduuli5
cp "$SOURCE/app/module/moduuli-eu-ai-act-moduuli5/page.tsx" app/module/moduuli-eu-ai-act-moduuli5/

# ── ★3 Prompt-hiomo ──
cp "$SOURCE/public/moduuli-prompt-hiomo.html" public/
cp "$SOURCE/public/js/prompt-hiomo-"*.js public/js/
mkdir -p app/module/moduuli-prompt-hiomo
cp "$SOURCE/app/module/moduuli-prompt-hiomo/page.tsx" app/module/moduuli-prompt-hiomo/

# ── ★4 HITL ──
cp "$SOURCE/public/moduuli-hitl-architect.html" public/
cp "$SOURCE/public/js/hitl-"*.js public/js/
mkdir -p app/module/moduuli-hitl-architect
cp "$SOURCE/app/module/moduuli-hitl-architect/page.tsx" app/module/moduuli-hitl-architect/

# ── ★5 Live puhelu ──
cp "$SOURCE/public/css/cs-workbench.css" public/css/
cp "$SOURCE/public/js/cs-"*.js public/js/
mkdir -p app/module/moduuli-asiakaspalvelu-live-puhelu
cp "$SOURCE/app/module/moduuli-asiakaspalvelu-live-puhelu/page.tsx" app/module/moduuli-asiakaspalvelu-live-puhelu/
mkdir -p app/api/cs-call/{config,crm,session,feedback,classify-state,transcribe,email-feedback}
cp -R "$SOURCE/app/api/cs-call/"* app/api/cs-call/
mkdir -p lib/cs-call
cp -R "$SOURCE/lib/cs-call/"* lib/cs-call/
cp "$SOURCE/lib/cs-call-api-auth.ts" lib/
# HTML: copy preview and rename until production HTML is exported
cp "$SOURCE/public/preview-cs-live-call.html" public/moduuli-asiakaspalvelu-live-puhelu.html

# ── Lib (merge manually if target already has these) ──
cp "$SOURCE/lib/duunijobs-ai.ts" lib/
cp "$SOURCE/lib/openai-server.ts" lib/
cp "$SOURCE/lib/bonus-api-auth.ts" lib/
```

Then **merge** (do not blind overwrite):

- `lib/bonus-modules.ts` — add 4 catalog entries + slugs
- `lib/bonus-access.ts` — add path regexes + access rules
- `middleware.ts` — auth matcher paths

---

## Integration checklist (AI Polku target)

- [ ] Copy files above; fetch ★5 production HTML if preview is not enough
- [ ] Merge `bonus-modules.ts` + dashboard listing (`bonusModulesForDashboard`)
- [ ] Merge middleware auth paths
- [ ] Confirm `module_responses` table exists
- [ ] Set `OPENAI_API_KEY` (+ `ANTHROPIC_API_KEY` for best ★2–★4 grading)
- [ ] Log in → open `/module/moduuli-eu-ai-act-moduuli5` → complete one exercise → refresh → state restores
- [ ] ★5: `node scripts/smoke-cs-call.mjs http://localhost:3000` (copy script from source)
- [ ] Update HTML `/dashboard` links if dashboard path differs
- [ ] **Tomi skip list:** he already did Perplexity + AI työnhaku + haastattelu in Monikanava — start him at ★2

---

## Verify locally

```bash
npm run dev
# ★2
open http://localhost:3000/module/moduuli-eu-ai-act-moduuli5
# ★3
open http://localhost:3000/module/moduuli-prompt-hiomo
# ★4
open http://localhost:3000/module/moduuli-hitl-architect
# ★5 (needs mic + OPENAI_API_KEY)
open http://localhost:3000/module/moduuli-asiakaspalvelu-live-puhelu
```

---

## Prompt to paste into AI Polku Cursor chat

```
Clone Monikanava bonus modules ★2–★5 into this AI Polku Next.js project.

Source repo: https://github.com/SUVI95/Monikanavaisen-asiakaspalvelun-osaajaksi
Read and follow: docs/CLONE-AI-POLKU-MODULES-STAR2-5.md

Modules to add (in order):
1. eu-ai-act-moduuli5 — Tekoälylaki asiakaspalvelussa
2. prompt-hiomo — Kirjoita botin ohje
3. hitl-architect — Kun botti ei riitä
4. asiakaspalvelu-live-puhelu — Live WebRTC customer call

Use the bonus-module-runtime pattern for 1–3 and cs-call API stack for 4.
Merge lib/bonus-modules.ts and middleware.ts; do not overwrite unrelated project code.
Register modules on the participant dashboard in pedagogical order.
Open access to all logged-in AI Polku participants (not admin-only).

After clone: smoke-test save/restore on ★2 and cs-call config endpoint on ★5.
Note: moduuli-asiakaspalvelu-live-puhelu.html may need to be copied from
public/preview-cs-live-call.html or downloaded from production — see clone doc.
```

---

## Related docs in source repo

- `docs/CLONE-BONUS-MODULES-7-8-9.md` — different pattern (`module-work.js` + `reflections` table) for työnhaku modules already in AI Polku
- `packages/customer-service-live-call/README.md` — ★5 deep dive
- `public/moduuli-asiakaspalvelu-live-puhelu-css-js-bundle.md` — ★5 HTML/JS reconstruction reference
