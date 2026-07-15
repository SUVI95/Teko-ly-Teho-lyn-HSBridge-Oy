# Elävä CV — design system clone package

Portable copy of the **6 new portfolio/CV designs** built in AiPolku (DuuniJobs learning platform).  
Use this folder to clone into **Moniakava** or any other Cursor project.

## Quick start for another AI

1. Copy this entire `packages/elava-cv-designs/` folder into the target repo (or give the AI this path in AiPolku).
2. Paste the contents of **`CLONE-PROMPT-FOR-MONIAKAVA.md`** into the target project's Cursor chat.
3. Run local preview: `python3 scripts/local-preview.py`

## Local preview URLs (after `python3 scripts/local-preview.py`)

| Page | URL |
|------|-----|
| **Reeni** | http://127.0.0.1:3000/module/moduuli-elava-cv-reeni?demo=1 |
| **Callum** | http://127.0.0.1:3000/module/moduuli-elava-cv-callum?demo=1 |
| **Shane** | http://127.0.0.1:3000/module/moduuli-elava-cv-shane?demo=1 |
| **Femia** | http://127.0.0.1:3000/module/moduuli-elava-cv-femia?demo=1 |
| **Veyssette** | http://127.0.0.1:3000/module/moduuli-elava-cv-veyssette?demo=1 |
| **Editorial** | http://127.0.0.1:3000/module/moduuli-elava-cv-editorial?demo=1 |
| **Klassinen** | http://127.0.0.1:3000/module/moduuli-elava-cv |
| Veyssette mock | http://127.0.0.1:3000/portfolio-veyssette-mock.html |

## Package contents (41 files)

```
modules/                          → copy to repo root
  moduuli-elava-cv.html           # original (klassinen)
  moduuli-elava-cv-reeni.html
  moduuli-elava-cv-callum.html
  moduuli-elava-cv-shane.html
  moduuli-elava-cv-femia.html
  moduuli-elava-cv-veyssette.html
  moduuli-elava-cv-editorial.html

public/js/
  portfolio-design-editor-boot.js   # shared ?demo=1 + localStorage draft
  portfolio-design-mock-data.js     # Maria Korhonen demo + clonePortfolioDemo()
  portfolio-editor-shared.js        # save/publish/slug/CV upload API client
  portfolio-experience-editor.js    # job row UI
  portfolio-public-features.js      # chat widget, contact form helpers
  portfolio-module.js               # klassinen module logic
  portfolio-public-runtime.js       # public page interactivity
  portfolio-veyssette-mock-data.js

public/
  portfolio-{reeni,callum,shane,femia,veyssette,editorial}-preview.js
  portfolio-tpl-{reeni,callum,shane,femia,veyssette,editorial,premium,modern}.html
  portfolio-veyssette-mock.html
  portfolio-veyssette-mock-seed.html
  portfolio-veyssette-local.html

routes/portfolio.js               # REST API + DB schema
lib/portfolio-*.js, cv-portfolio-parse.js, send-email.js
scripts/local-preview.py          # static preview server (no Node)
```

## Install into target project

### 1. Copy files

```bash
# From AiPolku repo root:
PKG=packages/elava-cv-designs
cp $PKG/modules/*.html ./
cp $PKG/public/js/*.js public/js/
cp $PKG/public/* public/
cp $PKG/routes/portfolio.js routes/
cp $PKG/lib/*.js lib/
cp $PKG/scripts/local-preview.py scripts/
```

### 2. Wire Express (`server.js`)

```javascript
const { router: portfolioRoutes } = require('./routes/portfolio');
app.use('/api/portfolio', portfolioRoutes);

// Module route (if not already):
app.get('/module/:moduleId', ...);  // serves moduuli-elava-cv-*.html from root

// Public portfolio pages:
app.get('/portfolio/:slug', async (req, res) => {
  // Load template from DB: reeni|callum|shane|femia|veyssette|editorial|premium
  // See AiPolku server.js ~line 415
});
```

### 3. Inject config in HTML responses

Portfolio editor needs `window.__PORTFOLIO_PUBLIC_CONFIG__`:

```javascript
{
  useSubdomain: false,
  appOrigin: 'https://your-app.example.com',
  publicHost: 'portfolio.example.com'
}
```

### 4. Database

Requires PostgreSQL + `DATABASE_URL`. The portfolio route auto-migrates `student_portfolios` table on first request.

### 5. Auth

Portfolio save/publish endpoints require logged-in user (`authenticateToken` middleware). Copy auth middleware from AiPolku if missing.

## Design pattern (each template)

Each `moduuli-elava-cv-{name}.html` follows the same pattern:

1. **Inline CSS** — template-specific colors/layout
2. **Editor panels** — Sisältö | Visuaali | Osiot | Linkki (+ Kuvat for Veyssette)
3. **Scripts** (in order):
   - `portfolio-public-features.js`
   - `portfolio-{name}-preview.js` — exports `render{Name}Preview(P)`
   - `portfolio-design-mock-data.js`
   - `portfolio-design-editor-boot.js`
   - `portfolio-editor-shared.js`
   - `portfolio-experience-editor.js`
4. **Inline init** — `P = clonePortfolioDemo('{name}')`, wire tabs, iframe preview
5. **Test banner** — links to other designs

## API endpoints (`/api/portfolio/`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/me` | Load current user's portfolio |
| POST | `/save` | Save draft |
| POST | `/publish` | Publish + set slug |
| POST | `/upload-cv` | PDF/DOC CV for recruiters |
| POST | `/upload-photo` | Profile photo |
| GET | `/public-config` | URL config for editors |
| POST | `/parse-cv` | Parse uploaded CV into fields |

## Customizing for Moniakava

| Change | File |
|--------|------|
| Demo person data | `public/js/portfolio-design-mock-data.js` |
| Template colors/layout | Each `moduuli-elava-cv-*.html` CSS + `portfolio-*-preview.js` |
| Public page shell | `public/portfolio-tpl-*.html` |
| Brand URLs | `lib/portfolio-public-url.js` + env vars |
| Dashboard visibility | target project's `index.html` modules array |

## Source repo

Built in: **Teko-ly-Teho-lyn-HSBridge-Oy** (AiPolku / DuuniJobs)  
Production: https://aipolku.duunijobs.fi/module/moduuli-elava-cv-veyssette?demo=1 (admin-only until published)

## Related docs

- **`CLONE-PROMPT-FOR-MONIAKAVA.md`** — paste-ready prompt for Cursor AI
- **`MANIFEST.txt`** — flat file list with byte sizes
