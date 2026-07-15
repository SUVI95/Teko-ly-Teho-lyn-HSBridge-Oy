# Copy this entire block → paste to Cursor AI in Moniakava project

---

**Task:** Clone the **Elävä CV design system** from the AiPolku repo into this Moniakava project.

**Source package path (AiPolku repo):** `packages/elava-cv-designs/`  
If you have the folder copied locally, use that. Otherwise clone from AiPolku repo branch `main`.

## What we built

Six new **portfolio/CV design templates** with a split-screen editor (left = form, right = live iframe preview):

| Template ID | Module file | Style |
|-------------|-------------|-------|
| `reeni` | `moduuli-elava-cv-reeni.html` | White modern + pink gradient accent |
| `callum` | `moduuli-elava-cv-callum.html` | Bold yellow accent, dark hero |
| `shane` | `moduuli-elava-cv-shane.html` | Dark editorial, serif headlines |
| `femia` | `moduuli-elava-cv-femia.html` | Soft feminine palette, rounded cards |
| `veyssette` | `moduuli-elava-cv-veyssette.html` | Cream/gold editorial, image slots per experience |
| `editorial` | `moduuli-elava-cv-editorial.html` | Magazine layout, large typography |

Plus **klassinen** original: `moduuli-elava-cv.html` (chatbot-style builder — keep as reference).

## Architecture (must preserve)

```
Student opens /module/moduuli-elava-cv-reeni?demo=1
    │
    ├─ Editor HTML (inline CSS + form fields)
    ├─ portfolio-design-mock-data.js  → clonePortfolioDemo('reeni')
    ├─ portfolio-design-editor-boot.js  → localStorage draft, ?demo=1 reset
    ├─ portfolio-editor-shared.js     → save/publish via /api/portfolio/*
    ├─ portfolio-experience-editor.js → add/edit job rows
    └─ portfolio-reeni-preview.js     → renderReeniPreview(P) → HTML string
            │
            └─ iframe preview + public page via portfolio-tpl-reeni.html
```

**Data model `P` (portfolio object):**
- `full_name`, `city`, `target_role`, `bio`, `career_summary`, `hidden_strengths`
- `email_public`, `linkedin_url`, `slug`, `template`
- `skills[]` — `{ name, context }` (context = where used, NOT percentages)
- `languages[]`, `achievements[]`, `experience[]`, `education[]`
- `visual_style` — colors + `sections: { about, skills, experience, education, achievements }`
- `images` — (Veyssette) `{ hero, about_1, about_2, exp_0..exp_3 }` each `{ enabled, src, dataUrl }`

## File copy map

| From package | Copy to Moniakava repo |
|--------------|------------------------|
| `modules/moduuli-elava-cv-*.html` | repo root (same filenames) |
| `public/js/portfolio-*.js` | `public/js/` |
| `public/portfolio-*-preview.js` | `public/` |
| `public/portfolio-tpl-*.html` | `public/` |
| `public/portfolio-veyssette-mock*.html` | `public/` |
| `routes/portfolio.js` | `routes/portfolio.js` (merge if exists) |
| `lib/portfolio-*.js`, `lib/cv-portfolio-parse.js`, `lib/send-email.js` | `lib/` |

## Server wiring (Express)

```javascript
const { router: portfolioRoutes } = require('./routes/portfolio');
app.use('/api/portfolio', portfolioRoutes);

// Inject public URL config into HTML (see server.js injectPortfolioPublicConfig)
// Serve /portfolio/:slug → pick template from student_portfolios.template column
// Serve /module/:moduleId → moduuli-elava-cv-*.html from repo root
```

**Template routing in `/portfolio/:slug`:**
- `template === 'reeni'` → `portfolio-tpl-reeni.html`
- `template === 'callum'` → `portfolio-tpl-callum.html`
- `template === 'shane'` → `portfolio-tpl-shane.html`
- `template === 'femia'` → `portfolio-tpl-femia.html`
- `template === 'veyssette'` → `portfolio-tpl-veyssette.html`
- `template === 'editorial'` → `portfolio-tpl-editorial.html`
- default → `portfolio-tpl-premium.html`

## Database

Uses existing `student_portfolios` table. Key columns:
- `user_id`, `slug`, `template`, `published`, `full_name`, `bio`, …
- JSON fields: `skills`, `experience`, `education`, `languages`, `achievements`
- `workspace_draft` JSON — stores `visual_style`, `images`, editor state

Run portfolio route once — it auto-creates/alters columns via `ensurePortfolioSchema()`.

## Environment

```env
DATABASE_URL=postgresql://...
RESEND_API_KEY=...          # optional — contact/visit email notifications
EMAIL_FROM=...
PORTFOLIO_PUBLIC_HOST=portfolio.example.fi
PORTFOLIO_APP_ORIGIN=https://app.example.fi
```

## Local preview (no Node)

```bash
python3 scripts/local-preview.py
# → http://127.0.0.1:3000/module/moduuli-elava-cv-veyssette?demo=1
```

## Admin-only (optional)

Hide from students until ready — add module IDs to `adminOnlyModuleIds` in dashboard + `ADMIN_ONLY_MODULE_IDS` in server.js:
- `moduuli-elava-cv-reeni`, `moduuli-elava-cv-callum`, `moduuli-elava-cv-shane`
- `moduuli-elava-cv-femia`, `moduuli-elava-cv-veyssette`, `moduuli-elava-cv-editorial`

## Acceptance checklist

- [ ] All 6 modules open at `/module/moduuli-elava-cv-{name}?demo=1`
- [ ] Demo data loads (Maria Korhonen, 4 jobs)
- [ ] Live iframe preview updates on input
- [ ] Save + Publish writes to DB via `/api/portfolio/save`
- [ ] Public URL `/portfolio/{slug}` renders correct template
- [ ] Cross-links in test-banner switch between designs
- [ ] Veyssette: image slots + `portfolio-veyssette-mock.html` works

## Do NOT

- Do not use skill percentage bars — skills are **name + context sentence**
- Do not merge all templates into one file — each design is its own module + preview JS
- Do not break klassinen `moduuli-elava-cv.html` if it already exists

---

**End of clone prompt.**
