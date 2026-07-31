# Copy this entire block → paste into Cursor AI in **duunijobs-platform**

---

**Task:** Replace DuuniJobs’ current Elävä CV builder with a **clone** of the AiPolku Elävä CV design system (style hub + 4 premium step editors).

**Do NOT** modify, delete, or edit the AiPolku / HSBridge repo (`Teko-ly-Teho-lyn-HSBridge-Oy`). That project stays the source of truth. Work only inside **this** repo: `duunijobs-platform`.

**Clone package (already copied into this repo):**  
`packages/elava-cv-designs/`

## Goal (what “swap” means)

1. Keep the old DuuniJobs builder as a **backup** (do not delete yet):
   - `public/elava-cv/moduuli-elava-cv-embedded.html` → rename to e.g. `moduuli-elava-cv-embedded.legacy.html`
   - Keep `public/elava-cv/moduuli-elava-cv.html` as legacy if present
2. Install the **new** AiPolku clone under `public/elava-cv/` (self-contained paths).
3. Point the dashboard iframe at the **new style hub** instead of the old embedded funnel.
4. Reuse DuuniJobs’ existing `/api/portfolio/*` APIs (save / mine / publish / cv / photo / config). Adapt the shared JS client if response shapes differ slightly — do **not** copy AiPolku’s Express `routes/portfolio.js` as the live API (this app is Next.js).

## What the clone is

| Piece | File | Role |
|-------|------|------|
| Style hub (entry) | `moduuli-elava-cv.html` | “Valitse tyyli” — Veyssette, Reeni, Callum, Femia |
| Editors | `moduuli-elava-cv-{veyssette,reeni,callum,femia}.html` | Step wizard: Sisältö → Visuaali → Kuvat → Osiot → Esikatselu → Julkaise |
| Optional / admin | `moduuli-elava-cv-{shane,editorial,classic}.html` | Extra designs + classic funnel |
| Shared JS | `public/js/portfolio-*.js` | mock data, boot, editor API client, image slots, experience editor |
| Previews | `public/portfolio-*-preview.js` | iframe HTML renderers |
| Templates | `public/portfolio-tpl-*.html` | public portfolio page shells |

**Student-facing styles (hub):** Veyssette, Reeni, Callum, Femia only.

## Architecture to preserve

```
Dashboard iframe → /elava-cv/moduuli-elava-cv.html  (style hub)
                         │
                         ├─ /elava-cv/moduuli-elava-cv-veyssette.html
                         ├─ /elava-cv/moduuli-elava-cv-reeni.html
                         ├─ /elava-cv/moduuli-elava-cv-callum.html
                         └─ /elava-cv/moduuli-elava-cv-femia.html
                                    │
                                    ├─ portfolio-*-preview.js → live preview HTML
                                    ├─ PortfolioEditor → /api/portfolio/save|publish|mine|…
                                    └─ public page by template id → portfolio-tpl-*.html
```

Data model `P`: `full_name`, `city`, `target_role`, `bio`, `career_summary`, `hidden_strengths`, `email_public`, `linkedin_url`, `slug`, `template`, `skills[]`, `languages[]`, `achievements[]`, `experience[]`, `education[]`, `visual_style`, `images` (slots).

## Install steps (this repo)

### 1. Copy assets into `public/elava-cv/`

```bash
PKG=packages/elava-cv-designs
DEST=public/elava-cv

# Backup legacy builder first
mv $DEST/moduuli-elava-cv-embedded.html $DEST/moduuli-elava-cv-embedded.legacy.html

mkdir -p $DEST/js
cp $PKG/modules/moduuli-elava-cv*.html $DEST/
cp $PKG/public/js/portfolio*.js $DEST/js/
cp $PKG/public/portfolio-*-preview.js $DEST/
cp $PKG/public/portfolio-tpl-*.html $DEST/
cp $PKG/public/portfolio-veyssette-mock*.html $DEST/ 2>/dev/null || true
```

### 2. Rewrite asset + navigation paths (critical)

AiPolku modules expect:

- scripts: `/js/...` and `/portfolio-*-preview.js`
- back link: `/module/moduuli-elava-cv`
- design open: `/module/moduuli-elava-cv-{name}`

In DuuniJobs they must become **relative to `/elava-cv/`**:

| AiPolku path | DuuniJobs path |
|--------------|----------------|
| `/js/foo.js` | `/elava-cv/js/foo.js` |
| `/portfolio-reeni-preview.js` | `/elava-cv/portfolio-reeni-preview.js` |
| `/module/moduuli-elava-cv` | `/elava-cv/moduuli-elava-cv.html` |
| `/module/moduuli-elava-cv-reeni` | `/elava-cv/moduuli-elava-cv-reeni.html` |
| `/portfolio/:slug` (public) | keep DuuniJobs public portfolio route (already exists) |

Rewrite **all** HTML + JS under `public/elava-cv/` accordingly (including hub card links and “← Vaihda tyyliä”).

Hub mini-previews / design editors may load `?demo=1` — keep that for demos.

### 3. Swap the dashboard iframe entry

File: `src/components/preview/ElavaCvBuilderEmbed.tsx`

Today:

```ts
"/elava-cv/moduuli-elava-cv-embedded.html"
```

Change to the new hub:

```ts
"/elava-cv/moduuli-elava-cv.html"
```

(`?start=build` from intro can become `?demo=0` or be dropped — hub does not use the old step query.)

Keep `ElavaCvPortfolioFlow` / intro cards unless product asks to remove them.

### 4. Wire public portfolio templates (Next.js)

Find where published portfolios pick HTML template (search `portfolio-tpl-premium`, `template`, public portfolio page). Extend so:

- `reeni` → `portfolio-tpl-reeni.html` (from `/elava-cv/` or copy into a path the public renderer already uses)
- `callum` → `portfolio-tpl-callum.html`
- `femia` → `portfolio-tpl-femia.html`
- `veyssette` → `portfolio-tpl-veyssette.html`
- `shane` / `editorial` optional
- default → existing premium/modern

Ensure `template` is persisted on save (AiPolku client sends `template: 'reeni'|…`). Check `upsertPortfolioFromPayload` / DB column accepts these string values.

### 5. API client adaptation

Shared client: `public/elava-cv/js/portfolio-editor-shared.js`

It calls (same as legacy embed, mostly):

- `GET /api/portfolio/mine`
- `GET /api/portfolio/config`
- `POST /api/portfolio/save`
- `POST /api/portfolio/publish`
- `POST /api/portfolio/cv`, `POST /api/portfolio/photo`

**Use DuuniJobs’ existing Next routes** — do not replace them with AiPolku Express `routes/portfolio.js`.

Adjust only if:

- field names differ (`workspace_draft` / `visual_style` / `images`)
- auth cookie / credentials differ
- public URL host should be DuuniJobs (`duunijobs.fi` / env), not `aipolku.duunijobs.fi`

Inject or set `window.__PORTFOLIO_PUBLIC_CONFIG__` if the host page currently does that for the legacy embed.

### 6. Optional: keep legacy rollback

Leave `moduuli-elava-cv-embedded.legacy.html` in place.  
If needed, flip `ElavaCvBuilderEmbed` src back in one line.

## Out of scope / do not do

- Do not edit AiPolku repo files
- Do not delete the clone package after install
- Do not remove DuuniJobs portfolio API routes
- Do not force-open Shane/Editorial/classic to all users unless product asks (hub shows 4 styles)

## Acceptance checklist

- [ ] Dashboard **Elävä CV** opens style hub (4 cards with previews)
- [ ] Choosing a style opens that design’s step editor in the iframe
- [ ] “← Vaihda tyyliä” returns to hub
- [ ] Scripts load (no 404 on `/elava-cv/js/...` or preview JS)
- [ ] Demo data works with `?demo=1` on a design module
- [ ] Save / Publish still hit DuuniJobs `/api/portfolio/*` and succeed when logged in as candidate
- [ ] Public portfolio URL renders the chosen template
- [ ] Legacy embedded HTML still exists as `.legacy` backup
- [ ] AiPolku repo untouched

## Local smoke test

```bash
# from duunijobs-platform
npm run dev
# open candidate dashboard → Elävä CV
# or open directly:
# http://localhost:3000/elava-cv/moduuli-elava-cv.html
# http://localhost:3000/elava-cv/moduuli-elava-cv-veyssette.html?demo=1
```

## Source reference (read-only)

AiPolku path on this machine (do not modify):  
`/Users/suvisoppinen/Teko-ly-Teho-lyn-HSBridge-Oy/packages/elava-cv-designs/`

If the package in this repo is stale, refresh by copying that folder again — still without changing AiPolku behavior.

---

**Start now:** inspect `packages/elava-cv-designs/`, backup the legacy embed, install under `public/elava-cv/`, rewrite paths, swap `ElavaCvBuilderEmbed`, then wire public template routing + API field compatibility.
