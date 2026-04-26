const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { fetch } = require('undici');
const pool = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

function envTrim(name) {
  const v = process.env[name];
  if (v == null) return '';
  return String(v).trim();
}

async function ensureCourtTables() {
  try {
    await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
  } catch (e) {
    /* ignore — gen_random_uuid still works on PG 13+ */
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS court_submissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      scenario_selected VARCHAR(100),
      perplexity_findings TEXT,
      gamma_url VARCHAR(500),
      canva_image_path VARCHAR(500),
      canva_image_bytes BYTEA,
      canva_image_mime VARCHAR(50),
      followup_q1 TEXT,
      followup_q2 TEXT,
      followup_q3 TEXT,
      followup_a1 TEXT,
      followup_a2 TEXT,
      followup_a3 TEXT,
      ai_observation TEXT,
      completed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS idx_court_submissions_user ON court_submissions(user_id)');
  await pool.query(
    'CREATE INDEX IF NOT EXISTS idx_court_submissions_completed ON court_submissions(completed_at DESC)'
  );
}

const SCENARIOS = {
  '01': {
    name: 'Rekrytointi',
    description: 'Yritys käyttää tekoälyä CV:iden seulontaan'
  },
  '02': {
    name: 'Luottopäätökset',
    description: 'Pankki myöntää tai hylkää lainan tekoälyalgoritmin perusteella'
  },
  '03': {
    name: 'Lääketieteellinen diagnoosi',
    description: 'Sairaala käyttää tekoälyä syöpäseulonnassa'
  },
  '04': {
    name: 'Kouluarviointi',
    description: 'Opettaja käyttää tekoälyä esseiden arviointiin'
  },
  '05': {
    name: 'Sisällön moderointi',
    description: 'Some-alusta poistaa tekoälyn merkitsemät postaukset automaattisesti'
  }
};

const canvaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/jpg', 'image/png'].includes(file.mimetype);
    if (ok) cb(null, true);
    else cb(new Error('Vain PNG tai JPG'));
  }
});

async function openaiChat(system, userMessage, model = 'gpt-4o', maxTokens = 1800, temperature = 0.7) {
  const key = envTrim('OPENAI_API_KEY');
  if (!key) {
    const err = new Error('AI ei ole konfiguroitu');
    err.status = 503;
    throw err;
  }
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userMessage }
      ],
      max_tokens: maxTokens,
      temperature
    })
  });
  if (!res.ok) {
    const t = await res.text();
    console.error('OpenAI tuomioistuin error:', t);
    const err = new Error('openai_error');
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

function isUuid(v) {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

async function loadOwned(submissionId, userId) {
  if (!isUuid(submissionId)) return null;
  const r = await pool.query(
    `SELECT * FROM court_submissions WHERE id = $1::uuid AND user_id = $2`,
    [submissionId, userId]
  );
  return r.rows[0] || null;
}

router.post('/submit-step2', authenticateToken, async (req, res) => {
  try {
    await ensureCourtTables();
    const { scenario, perplexity_findings, submission_id } = req.body || {};
    if (!scenario || !SCENARIOS[scenario]) {
      return res.status(400).json({ error: 'Valitse tapaus' });
    }
    const text = (perplexity_findings || '').toString().trim();
    if (text.length < 200) {
      return res.status(400).json({ error: 'Liitä Perplexityn löydöt — vähintään 200 merkkiä.' });
    }
    if (text.length > 12000) {
      return res.status(400).json({ error: 'Liian pitkä — leikkaa enintään 12 000 merkkiin.' });
    }
    let id = isUuid(submission_id) ? submission_id : null;
    if (id) {
      const owned = await loadOwned(id, req.user.id);
      if (!owned) id = null;
    }
    if (!id) {
      id = uuidv4();
      await pool.query(
        `INSERT INTO court_submissions (id, user_id, scenario_selected, perplexity_findings)
         VALUES ($1::uuid, $2, $3, $4)`,
        [id, req.user.id, scenario, text]
      );
    } else {
      await pool.query(
        `UPDATE court_submissions
         SET scenario_selected = $1, perplexity_findings = $2
         WHERE id = $3::uuid AND user_id = $4`,
        [scenario, text, id, req.user.id]
      );
    }
    res.json({ success: true, submission_id: id });
  } catch (e) {
    console.error('court submit-step2:', e);
    res.status(500).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
  }
});

router.post('/submit-step3', authenticateToken, (req, res) => {
  canvaUpload.single('canva_image')(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Tiedosto on liian suuri (max 5MB)' });
      }
      return res.status(400).json({ error: err.message || 'Virheellinen tiedosto' });
    }
    try {
      await ensureCourtTables();
      const { submission_id, gamma_url } = req.body || {};
      if (!isUuid(submission_id)) {
        return res.status(400).json({ error: 'Virheellinen tunniste' });
      }
      const owned = await loadOwned(submission_id, req.user.id);
      if (!owned) return res.status(404).json({ error: 'Tallennusta ei löytynyt' });
      const url = (gamma_url || '').toString().trim();
      if (!/^https?:\/\/[^\s]+$/i.test(url)) {
        return res.status(400).json({ error: 'Anna kelvollinen URL (https://gamma.app/...)' });
      }
      if (url.length > 500) {
        return res.status(400).json({ error: 'URL on liian pitkä' });
      }
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ error: 'Lataa Canva-kortti (PNG tai JPG)' });
      }
      const apiPath = `/api/tuomioistuin/canva-image/${submission_id}`;
      await pool.query(
        `UPDATE court_submissions
         SET gamma_url = $1, canva_image_path = $2, canva_image_bytes = $3, canva_image_mime = $4
         WHERE id = $5::uuid AND user_id = $6`,
        [url, apiPath, req.file.buffer, req.file.mimetype || 'image/png', submission_id, req.user.id]
      );
      res.json({ success: true, canva_image_path: apiPath });
    } catch (e) {
      console.error('court submit-step3:', e);
      res.status(500).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
    }
  });
});

router.get('/canva-image/:id', authenticateToken, async (req, res) => {
  const id = (req.params.id || '').trim();
  if (!isUuid(id)) return res.status(400).send('Virheellinen tunniste');
  try {
    await ensureCourtTables();
    const r = await pool.query(
      `SELECT user_id, canva_image_bytes, canva_image_mime
       FROM court_submissions WHERE id = $1::uuid`,
      [id]
    );
    if (!r.rows.length) return res.status(404).send('Ei löydy');
    const row = r.rows[0];
    if (row.user_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).send('Pääsy kielletty');
    }
    if (!row.canva_image_bytes) return res.status(404).send('Kuva puuttuu');
    res.setHeader('Content-Type', row.canva_image_mime || 'image/png');
    res.setHeader('Cache-Control', 'private, max-age=300');
    return res.send(Buffer.from(row.canva_image_bytes));
  } catch (e) {
    console.error('court canva-image:', e);
    return res.status(500).send('Virhe');
  }
});

router.post('/generate-questions', authenticateToken, async (req, res) => {
  try {
    await ensureCourtTables();
    const { submission_id } = req.body || {};
    if (!isUuid(submission_id)) {
      return res.status(400).json({ error: 'Virheellinen tunniste' });
    }
    const sub = await loadOwned(submission_id, req.user.id);
    if (!sub) return res.status(404).json({ error: 'Tallennusta ei löytynyt' });
    if (!sub.scenario_selected || !sub.perplexity_findings || !sub.gamma_url || !sub.canva_image_bytes) {
      return res.status(400).json({ error: 'Täytä ensin vaiheet 1–3' });
    }
    const scen = SCENARIOS[sub.scenario_selected] || { name: sub.scenario_selected, description: '' };

    const system = `Olet Sokrates. Saat henkilön argumenttianalyysin tekoälyn käytöstä päätöksenteossa.

Sinulla on:
- Heidän valitsemansa tapaus
- Heidän Perplexity-löytönsä
- URL heidän Gamma-dokumenttiinsa
- Heidän Canva-tuomiokorttinsa kuva

Tehtäväsi: Esitä TASAN KOLME kysymystä.

Säännöt jotka et riko koskaan:
- Jokainen kysymys iskee eri kohtaan heidän ajatteluaan
- Ensimmäinen kysymys on vaikea
- Toinen kysymys on vaikeampi
- Kolmas kysymys on se johon he eivät ole ajatelleet vastausta — se joka pitää heitä hereillä yöllä
- Älä koskaan kerro mikä on oikea vastaus
- Älä kehaise heidän työtään
- Älä lisää johdantoa tai lopetusta
- Vain kolme kysymystä. Numeroituina (1., 2., 3.). Ei mitään muuta.`;

    const userMessage = `Tapaus: ${scen.name} — ${scen.description}
Perplexity-löydöt:
${(sub.perplexity_findings || '').slice(0, 4000)}

Gamma URL: ${sub.gamma_url}
Heidän kantansa on nähtävissä Gamma-dokumentissa.

Esitä kolme kysymystä.`;

    let raw = '';
    try {
      raw = await openaiChat(system, userMessage, 'gpt-4o', 800, 0.85);
    } catch (aiErr) {
      console.error('court generate-questions AI:', aiErr);
      return res.status(503).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
    }

    const questions = parseThreeQuestions(raw);
    if (questions.length < 3) {
      return res.status(502).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
    }

    await pool.query(
      `UPDATE court_submissions
       SET followup_q1 = $1, followup_q2 = $2, followup_q3 = $3
       WHERE id = $4::uuid AND user_id = $5`,
      [questions[0], questions[1], questions[2], submission_id, req.user.id]
    );

    res.json({ success: true, questions });
  } catch (e) {
    console.error('court generate-questions:', e);
    res.status(500).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
  }
});

function parseThreeQuestions(text) {
  if (!text) return [];
  const cleaned = String(text).replace(/\r/g, '').trim();
  const blocks = cleaned
    .split(/\n\s*\n+/)
    .map(s => s.trim())
    .filter(Boolean);
  const out = [];
  const numRe = /^\s*(?:\*\*)?\s*(\d{1,2})[\).\.\:\-]/;
  blocks.forEach(b => {
    const m = b.match(numRe);
    if (m) {
      const idx = parseInt(m[1], 10);
      if (idx >= 1 && idx <= 3) {
        out[idx - 1] = b.replace(numRe, '').replace(/^\*\*\s*/, '').replace(/\s*\*\*$/, '').trim();
      }
    }
  });
  if (out.filter(Boolean).length === 3) return out;
  // Fallback: split by lines starting with a number
  const lines = cleaned.split('\n').map(s => s.trim()).filter(Boolean);
  const acc = [];
  let cur = null;
  lines.forEach(line => {
    const m = line.match(numRe);
    if (m) {
      if (cur) acc.push(cur.trim());
      cur = line.replace(numRe, '').trim();
    } else if (cur != null) {
      cur += ' ' + line.trim();
    }
  });
  if (cur) acc.push(cur.trim());
  return acc.slice(0, 3);
}

router.post('/submit-answer', authenticateToken, async (req, res) => {
  try {
    await ensureCourtTables();
    const { submission_id, index, answer } = req.body || {};
    if (!isUuid(submission_id)) {
      return res.status(400).json({ error: 'Virheellinen tunniste' });
    }
    const i = parseInt(index, 10);
    if (![0, 1, 2].includes(i)) {
      return res.status(400).json({ error: 'Virheellinen kysymys' });
    }
    const text = (answer || '').toString().trim();
    if (text.length < 150) {
      return res.status(400).json({ error: 'Vastaa vähintään 150 merkillä.' });
    }
    if (text.length > 8000) {
      return res.status(400).json({ error: 'Liian pitkä vastaus (max 8000 merkkiä).' });
    }
    const owned = await loadOwned(submission_id, req.user.id);
    if (!owned) return res.status(404).json({ error: 'Tallennusta ei löytynyt' });
    const col = ['followup_a1', 'followup_a2', 'followup_a3'][i];
    await pool.query(
      `UPDATE court_submissions SET ${col} = $1 WHERE id = $2::uuid AND user_id = $3`,
      [text, submission_id, req.user.id]
    );
    res.json({ success: true });
  } catch (e) {
    console.error('court submit-answer:', e);
    res.status(500).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
  }
});

router.post('/complete', authenticateToken, async (req, res) => {
  try {
    await ensureCourtTables();
    const { submission_id } = req.body || {};
    if (!isUuid(submission_id)) {
      return res.status(400).json({ error: 'Virheellinen tunniste' });
    }
    const sub = await loadOwned(submission_id, req.user.id);
    if (!sub) return res.status(404).json({ error: 'Tallennusta ei löytynyt' });
    if (!sub.followup_q1 || !sub.followup_q2 || !sub.followup_q3) {
      return res.status(400).json({ error: 'Kysymyksiä ei ole vielä luotu' });
    }
    if (!sub.followup_a1 || !sub.followup_a2 || !sub.followup_a3) {
      return res.status(400).json({ error: 'Vastaa kaikkiin kolmeen kysymykseen ennen päättämistä' });
    }

    const system = `Saat henkilön kolme vastausta kolmeen haastavaan kysymykseen tekoälyn etiikasta.

Kirjoita heille YKSI kappale — 60–80 sanaa.

Se kertoo: mitä heidän vastauksensa paljastavat heidän tavastaan ajatella. Ei arvostelua. Ei neuvoja. Ei kehuja. Vain tarkka havainto siitä kuka tämä henkilö on ajattelijana — perustuen siihen mitä he juuri kirjoittivat.

Aloita: "Vastaustesi perusteella..."`;

    const userMessage = `Kysymys 1: ${sub.followup_q1}
Vastaus 1: ${sub.followup_a1}

Kysymys 2: ${sub.followup_q2}
Vastaus 2: ${sub.followup_a2}

Kysymys 3: ${sub.followup_q3}
Vastaus 3: ${sub.followup_a3}`;

    let observation = '';
    try {
      observation = await openaiChat(system, userMessage, 'gpt-4o', 400, 0.6);
    } catch (aiErr) {
      console.error('court complete AI:', aiErr);
      return res.status(503).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
    }

    await pool.query(
      `UPDATE court_submissions
       SET ai_observation = $1, completed_at = CURRENT_TIMESTAMP
       WHERE id = $2::uuid AND user_id = $3`,
      [observation, submission_id, req.user.id]
    );

    res.json({ success: true, ai_observation: observation });
  } catch (e) {
    console.error('court complete:', e);
    res.status(500).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
  }
});

router.get('/my-submission', authenticateToken, async (req, res) => {
  try {
    await ensureCourtTables();
    const r = await pool.query(
      `SELECT id, scenario_selected, perplexity_findings, gamma_url, canva_image_path,
              followup_q1, followup_q2, followup_q3,
              followup_a1, followup_a2, followup_a3,
              ai_observation, completed_at, created_at
       FROM court_submissions WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [req.user.id]
    );
    res.json({ submission: r.rows[0] || null });
  } catch (e) {
    console.error('court my-submission:', e);
    res.status(500).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
  }
});

module.exports = { router, ensureCourtTables };
