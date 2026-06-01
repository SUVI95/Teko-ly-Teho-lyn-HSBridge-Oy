# Clone guide: bonus modules 7, 8, 9 (työnhaku + haastattelu)

Handoff for another Cursor agent / project. **Do not copy-paste HTML into chat** — clone files from git.

## Tekoäly (aipolku) — imported 2026-05-27

- HTML at repo root: `moduuli7-ai-tyonhaussa.html`, `moduuli8-ai-polku.html`, `moduuli9-haastattelu.html`
- Routes: `GET /module/:moduleId` in `server.js` (Express, not Next.js)
- Catalog: `public/index.html` (★ bonus cards, descriptions include *Ei vaikuta todistukseen*)
- Mod 7: **admin-only** here (students use **moduuli8-ai-polku**)
- Shared JS already present: `public/js/module-work.js`, `public/js/ai-helper.js`
- API: `routes/ai.js` (`/api/ai/claude`, `/api/ai/chat`), `routes/reflections.js`

## Source repo

```bash
git clone https://github.com/SUVI95/Monikanavaisen-asiakaspalvelun-osaajaksi.git
cd Monikanavaisen-asiakaspalvelun-osaajaksi
```

Production URLs (reference only):

| Live URL | Static file | Dashboard slug |
|----------|-------------|----------------|
| https://portfolio.duunijobs.fi/moduuli7-ai-tyonhaussa.html | `public/moduuli7-ai-tyonhaussa.html` | `ai-tyonhaussa` |
| https://portfolio.duunijobs.fi/moduuli8-ai-polku.html | `public/moduuli8-ai-polku.html` | `ai-polku` |
| https://portfolio.duunijobs.fi/moduuli9-haastattelu.html | `public/moduuli9-haastattelu.html` | `haastattelu` |

Canonical entry routes (auth gate → redirect to `.html`):

- `/module/moduuli7-ai-tyonhaussa`
- `/module/moduuli8-ai-polku`
- `/module/moduuli9-haastattelu`

---

## What each module is

### Moduuli 7 — AI työnhaussa (`moduuli7-ai-tyonhaussa`)

- **Content:** Työnhakupolku — taitokarttoitus, ATS-peli, hakemusteksti, AI-urahaastattelu, Hakukompassi.
- **Note:** Marked **admin-only** in this repo (`ADMIN_ONLY_BONUS_SLUGS`). Participants are blocked in middleware + page guard. Clone it if you need the same HTML, but decide access rules in the target project.
- **Size:** ~95 KB single HTML file (all CSS/JS inline except shared scripts).

### Moduuli 8 — AI Polku (`moduuli8-ai-polku`)

- **Content:** Same family as mod 7 but participant-facing version — 4 missions, sliders, ATS, application writing, AI interview sim, exportable “Hakukompassi”.
- **Size:** ~96 KB HTML.

### Moduuli 9 — Haastattelu (`moduuli9-haastattelu`)

- **Content:** Interview prep — 11 sections: employer mindset, STAR method, decoder, writing exercises, objection handling, spot-the-flaw, elevator pitch, company research, scenario game, hard questions, finale “Ansaitse”.
- **AI:** Multiple exercises call Claude/OpenAI for feedback on student answers.
- **Size:** ~138 KB HTML.

These are **bonus modules** — they do **not** count toward the main course certificate (modules 1–10).

---

## Catalog / index — “Ei vaikuta todistukseen”

**Important for cloning:** the certificate exclusion is **not** in the static HTML files (`moduuli7-ai-tyonhaussa.html`, etc.). There is no `index.html` in this repo. The catalog lives in:

| Layer | File | What it does |
|-------|------|--------------|
| **Registry (source of truth)** | `lib/bonus-modules.ts` | `BONUS_MODULES[]` entries with `affectsCertificate: false` and description suffix “Ei vaikuta todistukseen.” |
| **Constant** | `lib/bonus-modules.ts` | `BONUS_CERTIFICATE_NOTE_FI = "Ei vaikuta todistukseen."` |
| **Access flags** | `lib/bonus-modules.ts` | `ADMIN_ONLY_BONUS_SLUGS` (mod 7 hidden from participants) |
| **Dashboard API** | `app/dashboard/page.tsx` | Maps registry → `bonusModules` prop |
| **Dashboard UI** | `components/dashboard/DashboardClient.tsx` | “AI-työpajat” section renders `description` (includes certificate note) |

Certificate logic for the **main course** (modules 1–10) is separate: `lib/course-constants.ts` (`CERTIFICATE_MODULE_COUNT = 10`). Bonus modules are never checked there.

### Catalog entries for the 3 modules to clone

Copy these registry rows into the target project’s catalog (or entire `lib/bonus-modules.ts`):

```typescript
// lib/bonus-modules.ts — excerpt for modules 7, 8, 9
{
  slug: "ai-tyonhaussa",
  tag: "AI-työkalut",
  name: "AI-työkalut — työnhaussa",
  description: "ATS-peli, hakemusteksti, AI-urahaastattelu ja valmis Hakukompassi. Ei vaikuta todistukseen.",
  htmlPath: "/moduuli7-ai-tyonhaussa.html",
  href: "/module/moduuli7-ai-tyonhaussa",
  affectsCertificate: false,
},
{
  slug: "ai-polku",
  tag: "AI-työkalut",
  name: "AI Polku — työnhaku",
  description: "Taitokarttoitus, ATS-analyysi, hakemusteksti, AI-haastattelu ja valmis Hakukompassi. Ei vaikuta todistukseen.",
  htmlPath: "/moduuli8-ai-polku.html",
  href: "/module/moduuli8-ai-polku",
  affectsCertificate: false,
},
{
  slug: "haastattelu",
  tag: "AI-työkalut",
  name: "AI-työkalut — Haastattelu",
  description: "STAR-metodi, hissipuhe, spot the flaw ja tilannepeli — valmistaudu haastatteluun. Ei vaikuta todistukseen.",
  htmlPath: "/moduuli9-haastattelu.html",
  href: "/module/moduuli9-haastattelu",
  affectsCertificate: false,
},
```

If the target project uses a static `index.html` catalog instead of a Next.js dashboard, add equivalent fields there:

```html
<!-- Example pattern for target index.html -->
<article data-slug="ai-polku" data-affects-certificate="false">
  <h2>AI Polku — työnhaku</h2>
  <p>…description… <em>Ei vaikuta todistukseen.</em></p>
</article>
```

Do **not** search the cloned HTML for this text — you will not find it (except unrelated pedagogy, e.g. “todistus” = proof/example in mod 8).

---

## Architecture (how it works end-to-end)

```
Browser (static HTML in public/)
  │
  ├─ window.__MODULE_ID__  e.g. "moduuli8-ai-polku"
  ├─ /js/module-work.js    → autosave form state
  ├─ /js/ai-helper.js      → window.aiClaude / window.aiChat
  │
  ├─ GET  /api/auth/me                    (user id for localStorage scoping)
  ├─ POST /api/reflections/save           (persist work blob)
  ├─ GET  /api/reflections/module/:id     (load work blob)
  ├─ POST /api/ai/claude                  (Anthropic, primary)
  └─ POST /api/ai/chat                    (OpenAI fallback)

Next.js
  ├─ app/module/moduuli*-*/page.tsx       login + access check → redirect .html
  ├─ middleware.ts                        session required on .html routes
  └─ lib/bonus-access.ts                  slug + role permissions

Postgres (Neon)
  └─ reflections (user_id, module_id, reflection_text)  UNIQUE(user_id, module_id)
```

**Persistence model:** Each module calls `window.moduleWork.initModuleWork(MODULE_ID, { collect, apply, ... })`. Saves JSON to:

- Server: `reflections.module_id = "{moduleId}__work"` (e.g. `moduuli8-ai-polku__work`)
- Client: `localStorage` key `mw_{userId}_{moduleId}`

These three modules **do not** use `/api/bonus-module/responses` (that is for older bonus-ai-asiakaspalvelu style modules).

---

## Files to copy (minimum set)

### 1. Frontend (required)

```
public/moduuli7-ai-tyonhaussa.html
public/moduuli8-ai-polku.html
public/moduuli9-haastattelu.html
public/js/module-work.js
public/js/ai-helper.js
public/js/module-autosave.js          # only referenced by mod7; safe to copy, optional to wire
```

No other static assets (images/fonts are Google Fonts CDN + inline CSS).

### 2. Next.js route shells (required)

```
app/module/moduuli7-ai-tyonhaussa/page.tsx
app/module/moduuli8-ai-polku/page.tsx
app/module/moduuli9-haastattelu/page.tsx
```

Each file: session check → `participantCanAccessBonusModule(role, slug)` → `redirect("/moduuli….html")`.

### 3. API routes (required for AI + save)

```
app/api/ai/duunijobs/route.ts       # Anthropic implementation
app/api/ai/claude/route.ts          # re-exports duunijobs POST
app/api/ai/chat/route.ts            # OpenAI chat
app/api/auth/me/route.ts            # module-work.js needs user id
app/api/reflections/save/route.ts
app/api/reflections/module/[moduleId]/route.ts
```

### 4. Shared libraries (required)

```
lib/duunijobs-ai.ts                 # Anthropic + OpenAI clients
lib/bonus-api-auth.ts               # requireBonusApiSession for /api/ai/*
lib/bonus-access.ts                 # slugs, participantCanAccessBonusModule, bonusPathFromReferer
lib/bonus-modules.ts                # BONUS_MODULES registry (at least the 3 entries)
lib/auth.ts                         # NextAuth (or adapt to target project's auth)
lib/db.ts                           # Neon serverless sql helper
```

### 5. Middleware (patch target project's middleware)

From `middleware.ts`, ensure these paths require login:

- `/moduuli7-ai-tyonhaussa.html`, `/module/moduuli7-ai-tyonhaussa`
- `/moduuli8-ai-polku.html`, `/module/moduuli8-ai-polku`
- `/moduuli9-haastattelu.html`, `/module/moduuli9-haastattelu`
- `/api/auth/me`, `/api/reflections/*`, `/api/ai/*`

**Mod 7 extra rule (this repo):** non-admin users hitting mod7 URLs are redirected to `/dashboard`. Copy only if you want the same restriction.

### 6. Dashboard listing (optional but typical)

In `app/dashboard/page.tsx`, pass `bonusModules={bonusModulesForDashboard(role)}` to the dashboard client. Registry lives in `lib/bonus-modules.ts`.

### 7. Database (required)

Apply migration:

```
db/migrations/023_reflections.sql
```

Minimum schema:

```sql
CREATE TABLE IF NOT EXISTS reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_id VARCHAR(100) NOT NULL,
  reflection_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, module_id)
);
```

Target project must already have a `users` table + working login (NextAuth credentials or equivalent).

---

## Environment variables

From `.env.example`:

```env
DATABASE_URL=              # Neon Postgres
NEXTAUTH_SECRET=
NEXTAUTH_URL=              # e.g. https://your-app.example.com

OPENAI_API_KEY=            # required (fallback + /api/ai/chat)
ANTHROPIC_API_KEY=         # optional but recommended (primary for /api/ai/claude)
ANTHROPIC_MODEL=           # optional, default claude-sonnet-4-20250514
```

AI flow in browser (`ai-helper.js`):

1. `window.aiClaude()` → POST `/api/ai/claude`
2. On failure → falls back to `window.aiChat()` → POST `/api/ai/chat`

Modules also embed their own `aiChat()` wrappers with timeouts; they hit the same endpoints.

---

## Slug ↔ ID mapping (important)

| slug (access control) | `__MODULE_ID__` / persistence id | HTML filename |
|----------------------|-----------------------------------|---------------|
| `ai-tyonhaussa` | `moduuli7-ai-tyonhaussa` | `moduuli7-ai-tyonhaussa.html` |
| `ai-polku` | `moduuli8-ai-polku` | `moduuli8-ai-polku.html` |
| `haastattelu` | `moduuli9-haastattelu` | `moduuli9-haastattelu.html` |

Do not rename these IDs without updating `initModuleWork()` calls inside each HTML file.

---

## One-shot copy script (from cloned source repo)

Run from **target project root** (adjust `SOURCE` path):

```bash
SOURCE="../Monikanavaisen-asiakaspalvelun-osaajaksi"

# HTML + JS
cp "$SOURCE/public/moduuli7-ai-tyonhaussa.html" public/
cp "$SOURCE/public/moduuli8-ai-polku.html" public/
cp "$SOURCE/public/moduuli9-haastattelu.html" public/
mkdir -p public/js
cp "$SOURCE/public/js/module-work.js" public/js/
cp "$SOURCE/public/js/ai-helper.js" public/js/
cp "$SOURCE/public/js/module-autosave.js" public/js/

# Next routes
mkdir -p app/module/moduuli7-ai-tyonhaussa app/module/moduuli8-ai-polku app/module/moduuli9-haastattelu
cp "$SOURCE/app/module/moduuli7-ai-tyonhaussa/page.tsx" app/module/moduuli7-ai-tyonhaussa/
cp "$SOURCE/app/module/moduuli8-ai-polku/page.tsx" app/module/moduuli8-ai-polku/
cp "$SOURCE/app/module/moduuli9-haastattelu/page.tsx" app/module/moduuli9-haastattelu/

# API
mkdir -p app/api/ai/duunijobs app/api/ai/claude app/api/ai/chat
mkdir -p app/api/auth/me
mkdir -p app/api/reflections/save "app/api/reflections/module/[moduleId]"
cp "$SOURCE/app/api/ai/duunijobs/route.ts" app/api/ai/duunijobs/
cp "$SOURCE/app/api/ai/claude/route.ts" app/api/ai/claude/
cp "$SOURCE/app/api/ai/chat/route.ts" app/api/ai/chat/
cp "$SOURCE/app/api/auth/me/route.ts" app/api/auth/me/
cp "$SOURCE/app/api/reflections/save/route.ts" app/api/reflections/save/
cp "$SOURCE/app/api/reflections/module/[moduleId]/route.ts" "app/api/reflections/module/[moduleId]/"

# Lib (merge carefully if target already has auth/db)
cp "$SOURCE/lib/duunijobs-ai.ts" lib/
cp "$SOURCE/lib/bonus-api-auth.ts" lib/
cp "$SOURCE/lib/bonus-access.ts" lib/
cp "$SOURCE/lib/bonus-modules.ts" lib/
```

Then manually merge `middleware.ts` matcher entries and dashboard bonus list.

---

## Integration checklist (target project)

- [ ] `pnpm install` / ensure `@neondatabase/serverless`, `next-auth`, `bcryptjs` present
- [ ] Run `023_reflections.sql` on target DB
- [ ] Set env vars (at least `OPENAI_API_KEY`)
- [ ] Merge middleware auth paths (see section 5)
- [ ] Register 3 modules in `lib/bonus-modules.ts` + dashboard (include `affectsCertificate: false` and “Ei vaikuta todistukseen” in catalog description)
- [ ] Fix `/dashboard` links in HTML if dashboard path differs
- [ ] Log in as participant → open `/module/moduuli8-ai-polku` → verify save survives refresh
- [ ] Trigger an AI exercise → verify `/api/ai/claude` or fallback `/api/ai/chat` returns text

---

## Verify locally

```bash
pnpm dev
# Login as test user
open http://localhost:3000/module/moduuli8-ai-polku
open http://localhost:3000/moduuli9-haastattelu.html
```

Check browser Network tab:

- `GET /api/auth/me` → 200 with `user.id`
- `POST /api/reflections/save` → 200 after editing fields
- `POST /api/ai/claude` or `/api/ai/chat` → 200 with `{ text: "..." }`

---

## Mod 7 vs Mod 8

Both cover työnhaku; **mod 8 is the participant-facing version** in production. Mod 7 is kept as admin preview / legacy. For a new project you likely only need **mod 8 + mod 9**, unless you explicitly want mod 7 content.

---

## What NOT to clone (unless building full course platform)

- Other `public/module-*.html` course modules
- Certificate / portfolio / cohort / drip logic (`lib/module-access.ts`)
- `/api/bonus-module/responses` (not used by these three)
- Full `middleware.ts` portfolio host rewrite logic

---

## Support files for debugging

```
scripts/seed-test-student.mjs     # creates test.opiskelija@hsbridge.local
scripts/check-student-data.mjs    # DB sanity check
.env.example                      # env template
```

---

*Generated for cross-project handoff — source of truth is git `main` on SUVI95/Monikanavaisen-asiakaspalvelun-osaajaksi.*
