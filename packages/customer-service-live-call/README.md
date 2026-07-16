# Customer Service Live Call — clone package

Standalone clone of **moduuli9 mock interview**, adapted so **AI plays the customer** and the **student plays the service agent** on a live phone-style call (OpenAI Realtime / WebRTC).

## What's included

| File | Copy to |
|------|---------|
| `lib/cs-call-scenarios.js` | `lib/cs-call-scenarios.js` |
| `lib/multipart-form.js` | `lib/multipart-form.js` (or use existing) |
| `public/js/cs-mock-realtime.js` | `public/js/cs-mock-realtime.js` |
| `routes/cs-call.js` | `routes/cs-call.js` |
| `moduuli-asiakaspalvelu-live-puhelu.html` | repo root (or `public/module/`) |
| `scripts/smoke-cs-call.js` | `scripts/smoke-cs-call.js` |

## Server wiring

```javascript
const csCallRoutes = require('./routes/cs-call');
app.use('/api/cs-call', csCallRoutes);
```

Module URL: `/module/moduuli-asiakaspalvelu-live-puhelu`

## Environment

```env
OPENAI_API_KEY=sk-...
OPENAI_REALTIME_MODEL=gpt-realtime-2
OPENAI_REALTIME_VOICE=marin
# Optional: different voice for customer calls
OPENAI_CS_REALTIME_VOICE=marin
```

Requires **HTTPS** in production (microphone + WebRTC).

## API endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/cs-call/realtime/config?scenario=wrong_bill` | Phases, scenarios, model |
| POST | `/api/cs-call/realtime/session?scenario=...&custom=...` | SDP offer → SDP answer (proxies OpenAI) |
| POST | `/api/cs-call/feedback` | Written coach feedback after call |

## Call flow (4 turns)

1. **opening** — Customer states problem (AI speaks first)
2. **problem** — Customer adds detail (student = agent responds)
3. **escalation** — Customer gets impatient
4. **resolution** — Customer asks for concrete next step

Student speaks after each AI turn (semantic VAD). Same architecture as `public/js/mock-realtime.js` but role-reversed.

## Scenarios

- `wrong_bill` — Väärä lasku
- `late_delivery` — Myöhässä toimitus
- `broken_product` — Rikkinäinen tuote
- `custom` — Free text (`Nimi — kuvaus` or paragraph)

## Customize for your course

1. **`lib/cs-call-scenarios.js`** — Edit `CS_SCENARIOS`, `buildCsRealtimeInstructions()`, phases
2. **`public/js/cs-mock-realtime.js`** — Edit `buildResponseInstructions()` per turn
3. **`routes/cs-call.js`** — Edit feedback system prompt in `POST /feedback`
4. **HTML** — Branding, scenario cards, copy

## Test

```bash
node scripts/smoke-cs-call.js http://localhost:3000
```

## Source reference (this repo)

Cloned from:
- `moduuli9-haastattelu.html` screen `s8b` (mock interview UI)
- `public/js/mock-realtime.js` (WebRTC client)
- `routes/ai.js` `/realtime/session` (server proxy)
- `lib/mock-interview-questions.js` (phases + instructions)

Difference: recruiter → **customer**, candidate → **service agent**, API prefix `/api/cs-call/` instead of `/api/ai/`.
