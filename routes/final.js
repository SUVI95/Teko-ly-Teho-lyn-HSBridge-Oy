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

async function ensureFinalTables() {
  try {
    await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
  } catch (e) {
    /* ignore if not superuser; gen_random_uuid may still exist on PG 13+ */
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS final_module_reflections (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reflection_text TEXT NOT NULL,
      answers_json JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT final_module_reflections_user_unique UNIQUE(user_id)
    )
  `);
  await pool.query(
    'CREATE INDEX IF NOT EXISTS idx_final_module_reflections_user ON final_module_reflections(user_id)'
  );
  await pool.query(`
    CREATE TABLE IF NOT EXISTS final_module_automations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      automation_name VARCHAR(200) NOT NULL,
      generated_prompt TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(
    'CREATE INDEX IF NOT EXISTS idx_final_module_automations_user ON final_module_automations(user_id)'
  );
  await pool.query(`
    CREATE TABLE IF NOT EXISTS final_module_gallery (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      image_path VARCHAR(500) NOT NULL,
      caption TEXT NOT NULL,
      image_prompt_used TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS idx_final_module_gallery_user ON final_module_gallery(user_id)');
  await pool.query(
    'CREATE INDEX IF NOT EXISTS idx_final_module_gallery_created ON final_module_gallery(created_at DESC)'
  );
  // Vercel-yhteensopivuus: kuvat BYTEA:na tietokantaan (public/uploads on read-only)
  await pool.query('ALTER TABLE final_module_gallery ADD COLUMN IF NOT EXISTS image_bytes BYTEA');
  await pool.query('ALTER TABLE final_module_gallery ADD COLUMN IF NOT EXISTS image_mime VARCHAR(50)');
  await pool.query('ALTER TABLE final_module_gallery ALTER COLUMN image_path DROP NOT NULL');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS mythology_submissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      myth_selected TEXT NOT NULL,
      perplexity_finding TEXT,
      claude_argument TEXT,
      own_voice TEXT,
      final_argument TEXT NOT NULL,
      ai_evaluation TEXT,
      strength_score INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS idx_mythology_submissions_user ON mythology_submissions(user_id)');
  await pool.query(
    'CREATE INDEX IF NOT EXISTS idx_mythology_submissions_score ON mythology_submissions(strength_score DESC)'
  );
  // Uusi PDF-pohjainen virta: pdf_path + kysymysvastaukset JSONB + positiivinen insight
  await pool.query('ALTER TABLE mythology_submissions ADD COLUMN IF NOT EXISTS pdf_path VARCHAR(500)');
  await pool.query('ALTER TABLE mythology_submissions ADD COLUMN IF NOT EXISTS pdf_original_name VARCHAR(300)');
  await pool.query("ALTER TABLE mythology_submissions ADD COLUMN IF NOT EXISTS questions_json JSONB DEFAULT '{}'::jsonb");
  await pool.query('ALTER TABLE mythology_submissions ADD COLUMN IF NOT EXISTS ai_insight TEXT');
  await pool.query('ALTER TABLE mythology_submissions ADD COLUMN IF NOT EXISTS pdf_bytes BYTEA');
  // Vanha final_argument-sarake ei enää pakollinen uudessa virrassa
  await pool.query('ALTER TABLE mythology_submissions ALTER COLUMN final_argument DROP NOT NULL');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS broken_prompt_submissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      round INTEGER NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS idx_broken_prompt_user ON broken_prompt_submissions(user_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_broken_prompt_round ON broken_prompt_submissions(round)');

  // Kurssipalaute — 5 tähtikysymystä + vapaa palaute
  await pool.query(`
    CREATE TABLE IF NOT EXISTS course_feedback (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      q1_rating INTEGER,
      q2_rating INTEGER,
      q3_rating INTEGER,
      q4_rating INTEGER,
      q5_rating INTEGER,
      comment TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT course_feedback_user_unique UNIQUE(user_id)
    )
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS idx_course_feedback_user ON course_feedback(user_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_course_feedback_created ON course_feedback(created_at DESC)');

  // Loppumoduuli Osio 02 — Kolme karttaa Napkin.ai:lla + NotebookLM podcast
  await pool.query(`
    CREATE TABLE IF NOT EXISTS final_module_capstone (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      map1_bytes BYTEA,
      map1_name VARCHAR(300),
      map2_bytes BYTEA,
      map2_name VARCHAR(300),
      map3_bytes BYTEA,
      map3_name VARCHAR(300),
      podcast_right TEXT,
      podcast_missed TEXT,
      podcast_insight TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT final_module_capstone_user_unique UNIQUE(user_id)
    )
  `);
  await pool.query(
    'CREATE INDEX IF NOT EXISTS idx_final_module_capstone_user ON final_module_capstone(user_id)'
  );
  await pool.query(
    'CREATE INDEX IF NOT EXISTS idx_final_module_capstone_created ON final_module_capstone(created_at DESC)'
  );
}

// Gallery-kuvat muistin kautta (Vercel-yhteensopivuus; bytes talteen tietokantaan)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.mimetype);
    if (ok) cb(null, true);
    else cb(new Error('Vain JPG, PNG tai WebP'));
  }
});

// Myytinmurtaja PDF: muisti (multer.memoryStorage) — Vercel/serverless ei salli kirjoitusta public/uploads:iin
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = file.mimetype === 'application/pdf' || (file.originalname || '').toLowerCase().endsWith('.pdf');
    if (ok) cb(null, true);
    else cb(new Error('Vain PDF-tiedosto'));
  }
});

async function openaiChat(system, userMessage, model = 'gpt-4o', maxTokens = 2500) {
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
      temperature: 0.7
    })
  });
  if (!res.ok) {
    const t = await res.text();
    console.error('OpenAI final module error:', t);
    const err = new Error('openai_error');
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

/** Kuulustelun reflektio: 10 vastausta → teksti */
router.post('/kuulustelu-analyze', authenticateToken, async (req, res) => {
  try {
    await ensureFinalTables();
    const { questions, answers } = req.body;
    if (!Array.isArray(answers) || answers.length !== 10) {
      return res.status(400).json({ error: 'Kymmenen vastausta vaaditaan' });
    }
    const system = `Olet empaattinen ja tarkkanäköinen AI-valmentaja. Saat 10 vastausta henkilöltä joka on juuri suorittanut 5-päiväisen tekoälykurssin. Analysoi vastaukset ja kirjoita heille henkilökohtainen 3-kappaleen reflektio suomeksi. 

Kappale 1: Millainen tekoälyajattelija tämä henkilö vaikuttaa olevan — käytä heidän omia sanojaan todisteena.
Kappale 2: Mikä heidän vastauksistaan kertoo jotain erityistä tai yllättävää heidän tavastaan ajatella.
Kappale 3: Yksi konkreettinen asia jonka he voisivat tehdä seuraavaksi — perustuu siihen mitä he itse sanoivat.

Älä anna pisteitä. Älä arvioi oikein/väärin. Puhu suoraan henkilölle (sinä-muoto). Sävy: lämmin, rehellinen, ei ylistävä.`;
    const lines = (questions && questions.length === 10
      ? questions
      : [
          'Selitä omin sanoin: mikä on prompti ja miksi sillä on väliä?',
          'Mitä työkalua käytit tällä kurssilla eniten — ja miksi juuri sitä?',
          'Mikä tekoälyssä yllätti sinut eniten tällä viikolla?',
          'Mitä et antaisi tekoälyn koskaan päättää puolestasi — ja miksi?',
          "Kollega sanoo: 'tekoäly on vain hypeä.' Sinulla on 60 sekuntia. Mitä sanot?",
          'Nimeä yksi konkreettinen asia jonka teet ensi maanantaina eri tavalla tämän kurssin jälkeen.',
          'Mikä on suurin väärinkäsitys tekoälystä jonka olet kuullut ihmisten uskovan?',
          'Jos voisit poistaa yhden käyttämistäsi tekoälytyökaluista — minkä ja miksi?',
          'Miten tekoäly muuttaa sinun alaasi tai työtäsi seuraavan kolmen vuoden aikana?',
          'Mitä haluaisit sanoa itsellesi viisi päivää sitten ennen kuin tämä kurssi alkoi?'
        ]
    ).map((q, i) => `Kysymys ${i + 1}: ${q}\nVastaus: ${(answers[i] || '').trim()}`);

    const userMessage = lines.join('\n\n');
    const text = await openaiChat(system, userMessage, 'gpt-4o', 2000);
    res.json({ text });
  } catch (e) {
    console.error('kuulustelu-analyze:', e);
    if (e.status === 503) {
      return res.status(503).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
    }
    res.status(500).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
  }
});

router.post('/reflection-save', authenticateToken, async (req, res) => {
  try {
    await ensureFinalTables();
    const { reflection_text, answers_json } = req.body;
    if (!reflection_text || typeof reflection_text !== 'string') {
      return res.status(400).json({ error: 'Reflektio vaaditaan' });
    }
    const userId = req.user.id;
    const aj = answers_json != null ? answers_json : [];
    await pool.query(
      `INSERT INTO final_module_reflections (user_id, reflection_text, answers_json)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (user_id) DO UPDATE SET
         reflection_text = EXCLUDED.reflection_text,
         answers_json = EXCLUDED.answers_json,
         created_at = CURRENT_TIMESTAMP`,
      [userId, reflection_text, JSON.stringify(aj)]
    );
    res.json({ success: true });
  } catch (e) {
    console.error('reflection-save:', e);
    res.status(500).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
  }
});

const DEMO_SYSTEM = {
  memo: `Olet ammattimainen kokoussihteeri. Saat raakoja kokousmuistiinpanoja. Palauta aina sama rakenne:

**Tehdyt päätökset:**
[lista]

**Toimenpiteet ja vastuuhenkilöt:**
[lista muodossa: Tehtävä — Vastuuhenkilö — Deadline jos mainittu]

**Seurantaa vaativat asiat:**
[lista]

Ole tarkka, älä keksi asioita joita ei mainita.`,
  research: `Olet kriittinen analyytikko. Saat tekstin. Palauta aina:

**3 tärkeintä pointsia:**
[lista]

**Yksi asia jota kyseenalaistaa:**
[yksi lause]

**Yksi konkreettinen toimenpide:**
[yksi lause]

Pysy lyhyenä ja terävänä.`,
  email: `Olet tehokas viestintäavustaja. Saat sähköpostin. Palauta:

**Mistä on kyse:**
[yksi lause]

**Mitä vaaditaan sinulta:**
[lista]

**Kiireellisyys:** Korkea / Normaali / Ei kiireinen

**Ehdotettu vastaus:**
[valmis vastausluonnos suomeksi]`
};

router.post('/automation-demo', authenticateToken, async (req, res) => {
  try {
    const { type, text } = req.body;
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Teksti vaaditaan' });
    }
    const system = DEMO_SYSTEM[type];
    if (!system) {
      return res.status(400).json({ error: 'Tuntematon demo' });
    }
    const out = await openaiChat(system, text.trim(), 'gpt-4o', 2000);
    res.json({ text: out });
  } catch (e) {
    console.error('automation-demo:', e);
    res.status(500).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
  }
});

router.post('/automation-build', authenticateToken, async (req, res) => {
  try {
    const { field1, field2, field3 } = req.body;
    if (!field1 || !field2 || !field3) {
      return res.status(400).json({ error: 'Täytä kaikki kentät' });
    }
    const system = `Olet promptisuunnittelun asiantuntija. Saat kuvauksen toistuvasta työtehtävästä. Rakenna täydellinen, heti käytettävä system prompt suomeksi jota henkilö voi käyttää Claude:ssa tai ChatGPT:ssä.

Promptin tulee:
- Määritellä tekoälylle selkeä rooli
- Kuvata täsmälleen mitä syöte on
- Määritellä tarkka output-rakenne
- Olla ammattiminen ja toistuva

Palauta vain valmis prompti — ei selityksiä, ei johdantoa. Aloita suoraan 'Olet...' tai 'Sinulle annetaan...'`;
    const userMessage = `Toistuva tehtävä tai tilanne: ${field1}

Tyypillinen syöte: ${field2}

Täydellinen tulos: ${field3}`;
    const out = await openaiChat(system, userMessage, 'gpt-4o', 3000);
    res.json({ text: out });
  } catch (e) {
    console.error('automation-build:', e);
    res.status(500).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
  }
});

router.post('/automation-save', authenticateToken, async (req, res) => {
  try {
    await ensureFinalTables();
    const { automation_name, generated_prompt } = req.body;
    if (!automation_name || !generated_prompt) {
      return res.status(400).json({ error: 'Nimi ja promptti vaaditaan' });
    }
    if (String(automation_name).length > 200) {
      return res.status(400).json({ error: 'Nimi on liian pitkä' });
    }
    await pool.query(
      `INSERT INTO final_module_automations (user_id, automation_name, generated_prompt) VALUES ($1, $2, $3)`,
      [req.user.id, automation_name.trim().slice(0, 200), generated_prompt]
    );
    res.json({ success: true });
  } catch (e) {
    console.error('automation-save:', e);
    res.status(500).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
  }
});

router.post(
  '/gallery-upload',
  authenticateToken,
  (req, res, next) => {
    upload.single('image')(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'Tiedosto on liian suuri (max 5MB)' });
        }
        return res.status(400).json({ error: err.message || 'Virheellinen tiedosto' });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      await ensureFinalTables();
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ error: 'Kuva vaaditaan' });
      }
      const caption = (req.body.caption || '').trim();
      if (!caption) {
        return res.status(400).json({ error: 'Kuvateksti vaaditaan' });
      }
      if (caption.length > 200) {
        return res.status(400).json({ error: 'Kuvateksti on liian pitkä (max 200 merkkiä)' });
      }
      const imagePrompt = (req.body.image_prompt_used || '').trim() || null;
      const imageId = uuidv4();
      const apiPath = `/api/final/gallery-image/${imageId}`;
      await pool.query(
        `INSERT INTO final_module_gallery (id, user_id, image_path, caption, image_prompt_used, image_bytes, image_mime)
         VALUES ($1::uuid, $2, $3, $4, $5, $6, $7)`,
        [imageId, req.user.id, apiPath, caption, imagePrompt, req.file.buffer, req.file.mimetype || 'application/octet-stream']
      );
      res.json({ success: true, image_path: apiPath, id: imageId });
    } catch (e) {
      console.error('gallery-upload:', e);
      res.status(500).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
    }
  }
);

// Lataa kuva tietokannasta — omistaja tai admin. Fallback: levyllä oleva vanha kuva.
router.get('/gallery-image/:id', authenticateToken, async (req, res) => {
  const id = (req.params.id || '').trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return res.status(400).send('Virheellinen tunniste');
  }
  try {
    await ensureFinalTables();
    const r = await pool.query(
      `SELECT user_id, image_bytes, image_mime, image_path
       FROM final_module_gallery WHERE id = $1::uuid`,
      [id]
    );
    if (!r.rows.length) return res.status(404).send('Ei löydy');
    const row = r.rows[0];
    if (row.user_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).send('Pääsy kielletty');
    }
    if (row.image_bytes) {
      const buf = Buffer.from(row.image_bytes);
      res.setHeader('Content-Type', row.image_mime || 'image/jpeg');
      res.setHeader('Cache-Control', 'private, max-age=300');
      return res.send(buf);
    }
    // Vanha tallennus levyllä
    if (row.image_path && String(row.image_path).startsWith('/uploads/')) {
      const abs = path.join(__dirname, '..', 'public', String(row.image_path).replace(/^\//, ''));
      if (fs.existsSync(abs)) return res.sendFile(abs);
    }
    return res.status(404).send('Kuva ei ole saatavilla');
  } catch (e) {
    console.error('gallery-image GET:', e);
    return res.status(500).send('Virhe');
  }
});

// VAIN kirjautuneen käyttäjän omat kuvat
router.get('/gallery', authenticateToken, async (req, res) => {
  try {
    await ensureFinalTables();
    const r = await pool.query(
      `SELECT g.id, g.image_path, g.caption, g.image_prompt_used, g.created_at,
        CASE
          WHEN u.name IS NULL OR trim(u.name) = '' THEN split_part(u.email, '@', 1)
          ELSE split_part(trim(u.name), ' ', 1)
        END AS first_name
       FROM final_module_gallery g
       JOIN users u ON u.id = g.user_id
       WHERE g.user_id = $1
       ORDER BY g.created_at DESC`,
      [req.user.id]
    );
    // Varmista että vanhat rivit ohjataan uuteen API-pathiin (näin kuvat näkyvät Vercelissä)
    const items = r.rows.map(row => ({
      ...row,
      image_path: row.image_path && row.image_path.startsWith('/uploads/')
        ? `/api/final/gallery-image/${row.id}`
        : row.image_path
    }));
    res.json({ items });
  } catch (e) {
    console.error('gallery list:', e);
    res.status(500).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
  }
});

const MYTHS = [
  {
    id: 1,
    text: 'Tekoäly vie kaikki työpaikat — vain koodarit ja insinöörit selviävät',
    warning: 'Tämä pelottaa ihmisiä siksi, että se sisältää tilastoja jotka näyttävät oikeilta.'
  },
  {
    id: 2,
    text: 'Tekoäly on puolueeton — se ei syrji koska se ei ole ihminen',
    warning: 'Tämä on erityisen vaarallinen koska se kuulostaa loogiselta.'
  },
  {
    id: 3,
    text: 'Jos tekoäly sanoo sen, se on totta — se on laskenut miljardeista lähteistä',
    warning: 'Useimmat ihmiset uskovat tähän ääneti vaikka tietäisivät ettei se pidä paikkaansa.'
  },
  {
    id: 4,
    text: 'Tekoäly ymmärtää sinut — se oppii sinusta ja välittää vastauksistaan',
    warning: 'Tämä on emotionaalisesti houkuttelevin myytti — ja siksi vaarallisin.'
  },
  {
    id: 5,
    text: 'Tekoäly on niin monimutkainen ettei tavallinen ihminen voi ymmärtää miten se toimii — asiantuntijat päättävät',
    warning: 'Tämä vie vallan kansalaisilta juuri silloin kun sitä eniten tarvitaan.'
  }
];

router.get('/myths', (req, res) => {
  res.json({ myths: MYTHS });
});

function parseStrengthScore(evaluationText) {
  if (!evaluationText) return null;
  var m = evaluationText.match(/VAHVUUS[^0-9]{0,12}(\d{1,2})/i);
  if (m) {
    var n = parseInt(m[1], 10);
    if (!isNaN(n) && n >= 1 && n <= 10) return n;
  }
  m = evaluationText.match(/\b([1-9]|10)\s*\/\s*10\b/);
  if (m) {
    var n2 = parseInt(m[1], 10);
    if (!isNaN(n2)) return n2;
  }
  return null;
}

/**
 * UUSI VIRTA — Myytinmurtaja PDF-pohjainen:
 *  1) Käyttäjä tutkii aiheen Perplexityllä
 *  2) Rakentaa refutaatio-PDF:n Claudella
 *  3) Lataa PDF:n alustalle + vastaa ohjattuihin kysymyksiin
 *  4) Tekoäly lukee PDF:n ja antaa positiivisen, rakentavan insight-vastauksen
 *
 * PDF tallennetaan BYTEA:na (Vercel/serverless: vain /tmp on kirjoitettavissa).
 */
/**
 * PDF-tekstinpoiminta: yritetään ensin pdf-parse (nopea), ja jos se epäonnistuu
 * tai palauttaa liian vähän tekstiä (tyypillisesti tyylitellyissä/värjätyissä
 * PDF:ssä tai subset-fonteilla), kaadutaan pdfjs-dist:iin (Mozillan pdf.js)
 * joka osaa lukea laajemman kirjon PDF-rakenteita.
 */
async function extractWithPdfParse(buf) {
  let mod;
  try {
    mod = require('pdf-parse');
  } catch (loadErr) {
    console.error('pdf-parse module load failed:', loadErr);
    return '';
  }
  try {
    if (mod && typeof mod.PDFParse === 'function') {
      const parser = new mod.PDFParse({ data: buf });
      try {
        const r = await parser.getText();
        return (r && r.text ? String(r.text) : '').trim();
      } finally {
        try { await parser.destroy(); } catch (_) {}
      }
    }
    if (typeof mod === 'function') {
      const data = await mod(buf);
      return (data && data.text ? String(data.text) : '').trim();
    }
    console.error('pdf-parse: unknown module shape', typeof mod);
    return '';
  } catch (e) {
    console.error('pdf-parse error:', e && e.message ? e.message : e);
    return '';
  }
}

async function extractWithPdfjs(buf) {
  // Käytetään pdf-parse:n mukana tulevaa pdfjs-dist-buildiä (ESM, dynamic import).
  // Näin vältämme duplikaattikirjastojen version-yhteentörmäykset.
  let pdfjs;
  try {
    const { pathToFileURL } = require('url');
    const path = require('path');
    // pdf-parse main tiedosto sijaitsee sen asennushakemistossa — kiipeillään takaisin ylös
    const pdfParseMain = require.resolve('pdf-parse');
    const pdfParseDir = path.resolve(path.dirname(pdfParseMain), '..', '..', '..');
    const pdfjsMjs = path.join(pdfParseDir, 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.mjs');
    pdfjs = await import(pathToFileURL(pdfjsMjs).href);
  } catch (loadErr) {
    console.error('pdfjs-dist load failed:', loadErr && loadErr.message ? loadErr.message : loadErr);
    return '';
  }
  try {
    const uint8 = new Uint8Array(buf);
    const loadingTask = pdfjs.getDocument({
      data: uint8,
      disableWorker: true,
      isEvalSupported: false,
      useSystemFonts: false,
      verbosity: 0
    });
    const doc = await loadingTask.promise;
    const pages = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const txt = (content.items || [])
        .map(it => (typeof it.str === 'string' ? it.str : ''))
        .join(' ');
      pages.push(txt);
      try { page.cleanup(); } catch (_) {}
    }
    try { await doc.destroy(); } catch (_) {}
    return pages.join('\n').replace(/\s+\n/g, '\n').trim();
  } catch (e) {
    console.error('pdfjs-dist error:', e && e.message ? e.message : e);
    return '';
  }
}

async function extractPdfTextFromBuffer(buf) {
  if (!buf || !buf.length) return '';
  const primary = await extractWithPdfParse(buf);
  if (primary && primary.length >= 50) return primary;
  const fallback = await extractWithPdfjs(buf);
  if (fallback && fallback.length >= 50) return fallback;
  // Palauta parempi näistä kahdesta — voi olla tyhjä
  return (fallback && fallback.length > primary.length) ? fallback : primary;
}

/** Lataa tallennettu PDF (omistaja tai admin). */
router.get('/mythology-pdf/:id', authenticateToken, async (req, res) => {
  const id = (req.params.id || '').trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return res.status(400).send('Virheellinen tunniste');
  }
  try {
    await ensureFinalTables();
    const r = await pool.query(
      `SELECT user_id, pdf_bytes, pdf_original_name, pdf_path FROM mythology_submissions WHERE id = $1::uuid`,
      [id]
    );
    if (!r.rows.length) return res.status(404).send('Ei löydy');
    const row = r.rows[0];
    if (row.user_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).send('Pääsy kielletty');
    }
    const buf = row.pdf_bytes ? Buffer.from(row.pdf_bytes) : null;
    if (buf && buf.length) {
      const name = (row.pdf_original_name || 'dokumentti.pdf').replace(/[^\w.\-\u00C0-\u024F ]+/g, '_');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(name)}`);
      return res.send(buf);
    }
    if (row.pdf_path && String(row.pdf_path).startsWith('/uploads/')) {
      const abs = path.join(__dirname, '..', 'public', String(row.pdf_path).replace(/^\//, ''));
      if (fs.existsSync(abs)) return res.sendFile(abs);
    }
    return res.status(404).send('PDF ei ole saatavilla');
  } catch (e) {
    console.error('mythology-pdf GET:', e);
    return res.status(500).send('Virhe');
  }
});

router.post('/mythology-pdf-submit', authenticateToken, (req, res) => {
  pdfUpload.single('pdf')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'PDF-lataus epäonnistui' });
    }
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'PDF-tiedosto vaaditaan' });
    }
    try {
      await ensureFinalTables();
      const {
        myth_selected,
        perplexity_finding,
        strongest_point,
        own_addition
      } = req.body || {};
      if (!myth_selected || !strongest_point || !own_addition) {
        return res.status(400).json({ error: 'Myytti ja kysymysten vastaukset vaaditaan' });
      }

      const pdfBuf = req.file.buffer;
      const pdfText = await extractPdfTextFromBuffer(pdfBuf);
      // Jos PDF:stä ei saatu luettua tekstiä luotettavasti, älä hukkaa käyttäjän
      // kirjoittamia vastauksia — jatketaan lipulla ja ohjeistetaan tekoälyä
      // nojaamaan käyttäjän omiin vastauksiin.
      const pdfTextOk = !!(pdfText && pdfText.length >= 50);
      const trimmed = pdfTextOk
        ? (pdfText.length > 14000 ? pdfText.slice(0, 14000) + '\n…(leikattu)…' : pdfText)
        : '(PDF:n tekstiä ei saatu poimittua automaattisesti — nojaudu käyttäjän omiin vastauksiin alla.)';

      const system = `Olet lämmin, rohkaiseva ja tarkkanäköinen AI-valmentaja. Saat käyttäjän rakentaman refutaatio-PDF:n (tekoälymyytin kumoaminen) sekä heidän omat vastauksensa kolmeen kysymykseen.

Jos PDF:n teksti on tyhjä tai merkinnällä "(PDF:n tekstiä ei saatu poimittua…)", älä mainitse tätä käyttäjälle. Nojaudu kokonaan hänen kolmeen vastaukseensa ja rakenna palaute niiden pohjalta yhtä arvokkaana.

Tehtäväsi on antaa POSITIIVINEN JA RAKENTAVA insight suomeksi. Tätä ei arvostella numeroilla. Tätä ei revitä auki. Tämä on rohkaisu joka vahvistaa käyttäjän ajattelua.

Palauta AINA seuraava rakenne:

**Mitä teit todella hyvin**
(2–3 lausetta — nimeä konkreettisesti mitä PDF:ssä tai vastauksissa toimii. Sitoo todisteisiin.)

**Mikä tässä on ajattelullisesti terävää**
(1 kappale — mikä heidän lähestymistavassaan, näkökulmassaan tai "omassa lisäyksessään" on arvokasta ja alkuperäistä.)

**Yksi rohkaisu eteenpäin**
(1 lause — mitä tämä argumentti voisi avata heille jatkossa, miten he voivat viedä tätä ajattelua kauemmas työssään tai arjessaan.)

Ole rehellinen — älä keksi ylistyksiä. Mutta sävy on rohkaiseva, ei arvosteleva. Älä anna pisteitä. Älä käytä sanoja kuten "heikkous" tai "virhe". Puhu suoraan sinä-muodossa.`;

      const userMessage = `MYYTTI JONKA KÄYTTÄJÄ VALITSI:
${myth_selected}

KÄYTTÄJÄN VASTAUKSET OHJATTUIHIN KYSYMYKSIIN:

1) Mikä oli Perplexityn tärkein löytö jonka otit mukaan PDF:ään?
${(perplexity_finding || '(ei vastausta)').toString().slice(0, 1500)}

2) Mikä PDF:n argumentti on mielestäsi vahvin ja miksi?
${strongest_point.toString().slice(0, 1500)}

3) Mitä sinä itse lisäät PDF:n argumenttiin omasta kokemuksestasi tai näkökulmastasi?
${own_addition.toString().slice(0, 1500)}

KÄYTTÄJÄN CLAUDELLA RAKENTAMA PDF-REFUTAATIO (tekstimuoto):
"""
${trimmed}
"""`;

      let insight = '';
      try {
        insight = await openaiChat(system, userMessage, 'gpt-4o', 1400);
      } catch (aiErr) {
        console.error('mythology pdf insight AI error:', aiErr);
        return res.status(503).json({ error: 'AI ei juuri nyt vastaa — yritä hetken päästä uudelleen' });
      }

      const submissionId = uuidv4();
      const apiPdfPath = `/api/final/mythology-pdf/${submissionId}`;
      const questions = {
        perplexity_finding: perplexity_finding || '',
        strongest_point,
        own_addition
      };

      await pool.query(
        `INSERT INTO mythology_submissions
          (id, user_id, myth_selected, perplexity_finding, own_voice, pdf_path, pdf_original_name, questions_json, ai_insight, ai_evaluation, pdf_bytes)
         VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $9, $10)`,
        [
          submissionId,
          req.user.id,
          String(myth_selected).slice(0, 2000),
          (perplexity_finding || '').toString().slice(0, 4000) || null,
          (own_addition || '').toString().slice(0, 4000) || null,
          apiPdfPath,
          (req.file.originalname || '').slice(0, 300) || null,
          JSON.stringify(questions),
          insight,
          pdfBuf
        ]
      );

      res.json({
        success: true,
        insight,
        pdf_path: apiPdfPath,
        submission_id: submissionId,
        pdf_text_extracted: pdfTextOk
      });
    } catch (e) {
      console.error('mythology-pdf-submit:', e);
      res.status(500).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
    }
  });
});

router.get('/admin-mythology', authenticateToken, async (req, res) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Admin-oikeus vaaditaan' });
  }
  try {
    await ensureFinalTables();
    const r = await pool.query(
      `SELECT m.id, m.myth_selected, m.pdf_path, m.pdf_original_name, m.questions_json,
              m.ai_insight, m.ai_evaluation, m.strength_score, m.final_argument, m.created_at,
              u.id AS user_id,
              COALESCE(u.name, u.email) AS user_label,
              u.email AS user_email
       FROM mythology_submissions m
       JOIN users u ON u.id = m.user_id
       ORDER BY m.created_at DESC`
    );
    res.json({ items: r.rows });
  } catch (e) {
    console.error('admin-mythology:', e);
    res.status(500).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
  }
});

/* ===== Rikkinäinen Prompti ===== */

const RIKKI_ROUND1 = [
  {
    id: 1,
    topic: 'Sähköposti kollegalle projektimuutoksesta',
    output:
      'Hei Mika,\n\nLyhyt info: eilisen tiimipalaverin perusteella aikataulua siirretään viikolla. Uusi deadline on pe 24.5. Käytännössä tämä tarkoittaa että A-osuus (sinun vastuulla) valmistuu maanantaina 20.5. ja B-osuus (minulla) keskiviikkona 22.5. Testit ajetaan torstaina yhdessä.\n\nJos maanantai näyttää tiukalta, soita minulle perjantaina 14 jälkeen niin mietitään vaihtoehtoja.\n\nt. Sanna',
    prompts: [
      { id: 'a', text: 'Kirjoita kollegalle sähköposti josta käy ilmi uusi deadline ja kenen vastuulla mikäkin osuus on. Mainitse testit ja jätä ovi auki neuvottelulle jos aikataulu ei onnistu. Sävy: ammattimainen mutta rento.', correct: true },
      { id: 'b', text: 'Kerro tiimille muodollisesti että projekti on myöhässä. Ole tarkka syistä. Käytä virallista sävyä ja mainitse vastuuvelvollisuus.', correct: false },
      { id: 'c', text: 'Kirjoita asiakkaalle pahoitteluviesti myöhästymisestä ja lupaa uusi aikataulu viikon sisään.', correct: false }
    ]
  },
  {
    id: 2,
    topic: 'Tuotekuvaus verkkokauppaan',
    output:
      'Kuparikynttilänjalka Aalto — käsin valettua kuparia, harjattu pinta. Paino 680 g, korkeus 14 cm. Istuu pöydällä kuin veistos, toimii niin arkena kuin juhlassa. Patina syvenee käytössä — tämä ei mene pois muodista.\n\nSuunnittelijan kommentti: "Halusin esineen joka vanhenee kauniimmin kuin uutena."',
    prompts: [
      { id: 'a', text: 'Kirjoita kuparikynttilänjalan tuotekuvaus verkkokauppaan. Korosta että se on käsintehty, kuparia, 14 cm korkea, 680 g. Lisää lyhyt suunnittelijan kommentti. Sävy: premium, hieman runollinen, ei myyntipuheinen.', correct: true },
      { id: 'b', text: 'Kirjoita myyvä tuotekuvaus kuparisesta kynttilänjalasta. Käytä tehokeinoja, pakkausta, kiireellisyyttä. Pyri konversioon.', correct: false },
      { id: 'c', text: 'Tee lista kuparikynttilänjalan teknisistä ominaisuuksista: materiaali, mitat, paino, hoito-ohjeet.', correct: false }
    ]
  },
  {
    id: 3,
    topic: 'Vastaus negatiiviseen asiakaspalautteeseen',
    output:
      'Hei Petra,\n\nPahoittelen tilannetta ja kiitän siitä että kerroit. Varaus numerollasi oli kirjautunut meille keskiviikolle klo 18 — nyt näen järjestelmästä että sinä odotit paikkaa jo kello 17. Syy oli meidän puolellamme: uudessa varausohjelmassa aikakentät näkyvät UTC-ajassa ja osa varauksista on siirtynyt tunnilla. Korjaus on tehty tänään aamulla.\n\nHyvitämme sinulle koko aterian hinnan (48 €) tilillesi tämän viikon aikana. Jos haluat tulla meille uudestaan, olen varannut sinulle pöydän kenen tahansa iltana tällä viikolla — vastaa vain tähän viestiin ja kerro milloin sopii.\n\nt. Tuomas, ravintolapäällikkö',
    prompts: [
      { id: 'a', text: 'Kirjoita ravintolapäällikön vastaus tyytymättömälle asiakkaalle. Myönnä virhe konkreettisesti, selitä mitä tapahtui (aikavyöhykevirhe järjestelmässä), tarjoa rahallinen hyvitys ja uusi vierailu. Allekirjoita etunimellä ja roolilla. Älä puolustele.', correct: true },
      { id: 'b', text: 'Vastaa kohteliaasti asiakkaan valitukseen ja pyydä lisätietoja tilanteesta, jotta voitte selvittää asian.', correct: false },
      { id: 'c', text: 'Kirjoita ammattimainen pahoitteluviesti tyytymättömälle asiakkaalle. Mainitse että teidän asiakaspalvelunne on tärkeää ja tarjoa alennuskoodi.', correct: false }
    ]
  },
  {
    id: 4,
    topic: 'Tiivistelmä pitkästä raportista',
    output:
      '**3 keskeistä pointtia**\n1. Etätyö ei heikennä tuottavuutta aggregaattitasolla, mutta vaihtelu tiimien välillä on suurempaa kuin toimistolla.\n2. Yhden päivän toimistopäivä viikossa näyttää riittävän sosiaalisen pääoman ylläpitoon — 2-3 päivää ei tuota lisäarvoa.\n3. Keskitason esimiehet kokevat etätyön raskaimpana; heihin kohdistuva tuki on vähentynyt.\n\n**Yksi yllättävä löydös**\nTiimit joissa oli selkeät kirjoitetut työohjeet pärjäsivät etätyössä paremmin kuin tiimit joilla oli vahva läsnäolokulttuuri.',
    prompts: [
      { id: 'a', text: 'Lue raportti etätyön vaikutuksista tuottavuuteen ja palauta tasan 3 keskeistä pointtia + 1 yllättävä löydös. Käytä bold-otsikot ja numeroidut listat. Älä lisää mitään mitä raportissa ei sanottu.', correct: true },
      { id: 'b', text: 'Tee tiivistelmä pitkästä etätyöraportista. Pidä lyhyenä ja selkeänä.', correct: false },
      { id: 'c', text: 'Analysoi etätyön vaikutukset organisaatioon ja kerro omat suosituksesi siitä miten hybridimalli tulisi rakentaa.', correct: false }
    ]
  },
  {
    id: 5,
    topic: 'LinkedIn-postaus uudesta roolista',
    output:
      'Uusi luku alkaa — aloitan ensi maanantaina Visman tuotepäällikkönä (B2B-talouspalvelut).\n\nKiitos Nordean upealle tiimille viidestä vuodesta. Opin teiltä enemmän kuin osasin odottaa, erityisesti Mari L. ja Joonas P.\n\nTulevassa roolissa pääsen vihdoin tekemään sitä mitä olen halunnut vuosia: rakentamaan tuotteita joita pienet ja keskisuuret yritykset tosiaan käyttävät arjessaan.\n\nJos olet PK-yrittäjä ja haluat kertoa minkä taloushallinnon kohdan haluaisit nähdä helpompana — lähetä viesti. Kuuntelen.',
    prompts: [
      { id: 'a', text: 'Kirjoita LinkedIn-postaus jossa kerron aloittavani uudessa roolissa (tuotepäällikkö, Visma, B2B-talouspalvelut, aloitus ensi maanantaina). Kiitä edellistä tiimiä (Nordea, 5v) ja mainitse nimeltä kaksi kollegaa. Perustele miksi tämä rooli on minulle oikea. Lopeta pyynnöllä että PK-yrittäjät kertovat minulle kipupisteistään. Sävy: aito, ei liian kiillotettu.', correct: true },
      { id: 'b', text: 'Kerro LinkedInissä että vaihdat työpaikkaa. Kiitä entistä työnantajaa ja kerro olevasi innoissasi uudesta roolista. Ole kannustava.', correct: false },
      { id: 'c', text: 'Kirjoita ammattimainen ilmoitus työpaikan vaihdosta. Korosta saavutuksia edellisessä roolissa ja listaa mitä tuot mukanasi uuteen tehtävään.', correct: false }
    ]
  }
];

const RIKKI_ROUND2 = [
  {
    id: 1,
    prompt:
      'Toimi talousvalmentajana suomalaiselle 32-vuotiaalle freelancerille jonka tulot vaihtelevat 2500–6500 €/kk. Rakenna kuukausibudjetti kun tulot ovat 4200 €. Budjetti: 1) kiinteät menot (vuokra 950, laskut 180, vakuutukset 90), 2) muuttuvat menot (ruoka, liikenne), 3) verot (YEL + ennakot) 4) säästöt ja puskuri. Näytä taulukkona. Käytä eurot-merkkiä ja prosentteja.'
  },
  {
    id: 2,
    prompt:
      'Kirjoita hylätty saksalaisen ylioppilaskirjoituksen aine teemasta "Miksi nuoret eivät luota mediaan enää". Rajoitukset: 180 sanaa, 3 kappaletta, yksi tilastoviite (keksitty mutta uskottava), yksi sitaatti (keksitty, lähteenä fiktiivinen saksalainen sosiologi). Sävy: hieman kärsivä, akateeminen. Kieli: suomi. Ei kliseitä "sosiaalinen media pilaa nuoret".'
  },
  {
    id: 3,
    prompt:
      'Olet lastenkirjailija. Kirjoita 4-vuotiaalle iltasatu kissasta nimeltä Kauno, jolla on vaikeus nukahtaa. Rajoitukset: max 200 sanaa, 4 kappaletta, toistuva rytmi ("Kauno kuunteli. Kauno nuuski. Kauno..."), lempeä loppu ilman opetusta tai moraalia. Ei henkilöidy vanhempiin.'
  },
  {
    id: 4,
    prompt:
      'Kirjoita teknisen tuotteen lanseeraustiedote. Tuote: uusi suomalainen sähkötyöpyöräpolttimo (fiktio) nimeltä Valohovi V1. Pitää sisältää: 1 johdantolause, 3 konkreettista teknistä numeroa (W, Lux, elinkaari tunneissa), 1 sitaatti toimitusjohtajalta (keksi), 1 maininta saatavuudesta (kesäkuu 2026). 150 sanaa. Sävy: hillitty pohjoismainen, ei hypeä.'
  },
  {
    id: 5,
    prompt:
      'Tee lyhyt analyysi yritykselle: pitäisikö pienen suomalaisen graafisen suunnittelutoimiston (5 hlöä, 1,1 M€ liikevaihto, Helsinki) palkata myyntihenkilö vai panostaa asiakashankintaan sisältömarkkinoinnilla. Rakenne: puolesta/vastaan molemmille, yksi selkeä suositus, yksi riski jota suositus ei ratkaise. 200 sanaa. Ei bullet-listoja, jatkuva teksti.'
  }
];

router.get('/rikki-round1', (req, res) => {
  const sanitized = RIKKI_ROUND1.map(function(it) {
    return {
      id: it.id,
      topic: it.topic,
      output: it.output,
      prompts: it.prompts.map(function(p) { return { id: p.id, text: p.text }; })
    };
  });
  res.json({ items: sanitized });
});

router.get('/rikki-round2', (req, res) => {
  const items = RIKKI_ROUND2.map(function(it) { return { id: it.id, prompt: it.prompt }; });
  res.json({ items });
});

router.post('/rikki-round1-evaluate', authenticateToken, async (req, res) => {
  try {
    const { answers } = req.body;
    if (!Array.isArray(answers) || answers.length !== RIKKI_ROUND1.length) {
      return res.status(400).json({ error: 'Jokaiseen kohtaan tulee antaa vastaus' });
    }
    const graded = RIKKI_ROUND1.map(function(item, i) {
      const a = answers[i] || {};
      const chosen = a.choice;
      const correctChoice = item.prompts.find(function(p) { return p.correct; });
      return {
        id: item.id,
        topic: item.topic,
        chosen: chosen,
        correct_choice: correctChoice.id,
        is_correct: chosen === correctChoice.id,
        justification: String(a.justification || ''),
        output: item.output,
        correct_prompt: correctChoice.text
      };
    });

    const blocks = graded.map(function(g, i) {
      return `KOHTA ${i + 1} — ${g.topic}
AI:n TULOS:
${g.output}

OIKEA PROMPTI:
${g.correct_prompt}

OPPILAAN VALINTA: ${g.chosen || '(ei valintaa)'} ${g.is_correct ? '(OIKEIN)' : '(VÄÄRIN, oikea: ' + g.correct_choice + ')'}
OPPILAAN PERUSTELU: ${g.justification || '(ei perustelua)'}`;
    }).join('\n\n');

    const system = `Olet promptisuunnittelun opettaja. Saat 5 tapausta jossa oppilas on nähnyt AI:n tuloksen ja kolme promptia. Hän valitsi yhden ja perusteli valintansa.

Arvioi kunkin oppilaan perustelu — EI vain sitä saiko hän oikein. Pelkkä oikea valinta ilman kelvollista perustelua ei ansaitse täysiä pisteitä. Hyvä perustelu tunnistaa mitä promptissa on spesifistä joka näkyy tuloksessa (rakenne, sävy, rajoitteet, numerot, yms).

Palauta kuhunkin kohtaan: 
**KOHTA [n] — [aihe]**
Valinta: oikein / väärin
Perustelun taso: vahva / kohtalainen / heikko
Palaute: 2–3 lauseen palaute ajattelun laadusta. Ole suora.

Lopuksi yksi kappale **KOKONAISARVIO** (enintään 4 lausetta): mitä oppilaan promptilukutaidosta voi sanoa?`;

    const text = await openaiChat(system, blocks, 'gpt-4o', 1800);
    const correctCount = graded.filter(function(g) { return g.is_correct; }).length;
    res.json({ text: text, graded: graded, correct_count: correctCount, total: graded.length });
  } catch (e) {
    console.error('rikki-round1-evaluate:', e);
    res.status(500).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
  }
});

router.post('/rikki-round2-run', authenticateToken, async (req, res) => {
  try {
    const { id } = req.body;
    const item = RIKKI_ROUND2.find(function(x) { return x.id === id; });
    if (!item) return res.status(400).json({ error: 'Tuntematon kohde' });
    const text = await openaiChat(
      'Olet tarkka ja ammattimainen tekoälymalli. Noudata promptia täsmälleen.',
      item.prompt,
      'gpt-4o',
      1800
    );
    res.json({ text });
  } catch (e) {
    console.error('rikki-round2-run:', e);
    res.status(500).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
  }
});

router.post('/rikki-round2-compare', authenticateToken, async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Ei vertailtavia kohteita' });
    }
    const block = items.map(function(it, i) {
      return `KOHTA ${i + 1}
PROMPTI:
${it.prompt}

OPPILAAN ENNUSTE:
${it.prediction || '(tyhjä)'}

TEKOÄLYN TODELLINEN TULOS:
${it.actual || '(tyhjä)'}`;
    }).join('\n\n');

    const system = `Olet vertaileva arvioija. Saat sarjan tapauksia. Kussakin tapauksessa oppilas on nähnyt promptin ja ennustanut mitä tekoäly tuottaisi. Tämän jälkeen tekoäly tuotti oikean tuloksen.

Vertaa ennustetta ja todellista tulosta kohta kerrallaan:
**KOHTA [n]** 
Mikä osui: [lause]
Mikä meni yllättävämmin kuin oppilas odotti: [lause]
Mitä tämä paljastaa oppilaan mielikuvasta tekoälystä: [lause]

Lopeta yhdellä yhteenvedolla (enintään 4 lausetta) siitä mistä oppilaan mielikuva tekoälyn toiminnasta eniten eroaa todellisuudesta.`;

    const text = await openaiChat(system, block, 'gpt-4o', 2000);
    res.json({ text });
  } catch (e) {
    console.error('rikki-round2-compare:', e);
    res.status(500).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
  }
});

router.post('/rikki-save', authenticateToken, async (req, res) => {
  try {
    await ensureFinalTables();
    const { round, payload } = req.body;
    if (round !== 1 && round !== 2) {
      return res.status(400).json({ error: 'Tuntematon kierros' });
    }
    await pool.query(
      `INSERT INTO broken_prompt_submissions (user_id, round, payload) VALUES ($1, $2, $3::jsonb)`,
      [req.user.id, round, JSON.stringify(payload || {})]
    );
    res.json({ success: true });
  } catch (e) {
    console.error('rikki-save:', e);
    res.status(500).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
  }
});

/* ===== Loppumoduuli Osio 02 — Kolme karttaa Napkin.ai:lla + NotebookLM podcast ===== */

// 3 PDF:ää kentissä map1/map2/map3 + 3 tekstikenttää
const capstoneUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 3 },
  fileFilter: (req, file, cb) => {
    const ok = file.mimetype === 'application/pdf' || (file.originalname || '').toLowerCase().endsWith('.pdf');
    if (ok) cb(null, true);
    else cb(new Error('Vain PDF-tiedostoja'));
  }
});

const capstoneFields = capstoneUpload.fields([
  { name: 'map1', maxCount: 1 },
  { name: 'map2', maxCount: 1 },
  { name: 'map3', maxCount: 1 }
]);

router.get('/my-capstone', authenticateToken, async (req, res) => {
  try {
    await ensureFinalTables();
    const r = await pool.query(
      `SELECT id,
              (map1_bytes IS NOT NULL) AS has_map1, map1_name,
              (map2_bytes IS NOT NULL) AS has_map2, map2_name,
              (map3_bytes IS NOT NULL) AS has_map3, map3_name,
              podcast_right, podcast_missed, podcast_insight,
              created_at, updated_at
       FROM final_module_capstone
       WHERE user_id = $1`,
      [req.user.id]
    );
    res.json({ submission: r.rows[0] || null });
  } catch (e) {
    console.error('my-capstone:', e);
    res.status(500).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
  }
});

router.post('/capstone-submit', authenticateToken, (req, res) => {
  capstoneFields(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'PDF-lataus epäonnistui' });
    }
    try {
      await ensureFinalTables();
      const files = req.files || {};
      const m1 = files.map1 && files.map1[0];
      const m2 = files.map2 && files.map2[0];
      const m3 = files.map3 && files.map3[0];
      if (!m1 || !m2 || !m3) {
        return res.status(400).json({ error: 'Kaikki kolme karttaa (PDF) vaaditaan.' });
      }
      const { podcast_right, podcast_missed, podcast_insight } = req.body || {};
      if (!podcast_right || !podcast_missed || !podcast_insight) {
        return res.status(400).json({ error: 'Vastaa kaikkiin kolmeen podcast-kysymykseen.' });
      }

      const trimName = (s) => (s || '').toString().slice(0, 300) || null;

      // Upsert — jos käyttäjä lähettää uudelleen, korvaa aiemmat
      await pool.query(
        `INSERT INTO final_module_capstone
           (user_id, map1_bytes, map1_name, map2_bytes, map2_name, map3_bytes, map3_name,
            podcast_right, podcast_missed, podcast_insight, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id) DO UPDATE SET
           map1_bytes = EXCLUDED.map1_bytes, map1_name = EXCLUDED.map1_name,
           map2_bytes = EXCLUDED.map2_bytes, map2_name = EXCLUDED.map2_name,
           map3_bytes = EXCLUDED.map3_bytes, map3_name = EXCLUDED.map3_name,
           podcast_right = EXCLUDED.podcast_right,
           podcast_missed = EXCLUDED.podcast_missed,
           podcast_insight = EXCLUDED.podcast_insight,
           updated_at = CURRENT_TIMESTAMP`,
        [
          req.user.id,
          m1.buffer, trimName(m1.originalname),
          m2.buffer, trimName(m2.originalname),
          m3.buffer, trimName(m3.originalname),
          String(podcast_right).slice(0, 5000),
          String(podcast_missed).slice(0, 5000),
          String(podcast_insight).slice(0, 5000)
        ]
      );
      res.json({ success: true });
    } catch (e) {
      console.error('capstone-submit:', e);
      res.status(500).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
    }
  });
});

router.get('/capstone-pdf/:id/:slot', authenticateToken, async (req, res) => {
  const id = (req.params.id || '').trim();
  const slot = parseInt(req.params.slot, 10);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return res.status(400).send('Virheellinen tunniste');
  }
  if (![1, 2, 3].includes(slot)) {
    return res.status(400).send('Virheellinen kartta');
  }
  try {
    await ensureFinalTables();
    const col = `map${slot}_bytes`;
    const nameCol = `map${slot}_name`;
    const r = await pool.query(
      `SELECT user_id, ${col} AS bytes, ${nameCol} AS name FROM final_module_capstone WHERE id = $1::uuid`,
      [id]
    );
    if (!r.rows.length) return res.status(404).send('Ei löydy');
    const row = r.rows[0];
    if (row.user_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).send('Pääsy kielletty');
    }
    if (!row.bytes) return res.status(404).send('PDF puuttuu');
    const buf = Buffer.from(row.bytes);
    const name = (row.name || `kartta-${slot}.pdf`).replace(/[^\w.\-\u00C0-\u024F ]+/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(name)}`);
    return res.send(buf);
  } catch (e) {
    console.error('capstone-pdf GET:', e);
    return res.status(500).send('Virhe');
  }
});

// Koontinäkymä admin-paneeliin: jokaisesta käyttäjästä reflektio + kapstonen kartat +
// podcast-vastaukset + galleria — kaikki paikoin joissa käyttäjä on tuottanut jotain.
router.get('/admin-loppumoduuli', authenticateToken, async (req, res) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Admin-oikeus vaaditaan' });
  }
  try {
    await ensureFinalTables();
    const [usersR, reflR, capR, galR] = await Promise.all([
      pool.query(
        `SELECT DISTINCT u.id, COALESCE(u.name, u.email) AS user_label, u.email AS user_email
         FROM users u
         WHERE u.id IN (
           SELECT user_id FROM final_module_reflections
           UNION SELECT user_id FROM final_module_capstone
           UNION SELECT user_id FROM final_module_gallery
         )
         ORDER BY u.id`
      ),
      pool.query(
        `SELECT user_id, reflection_text, answers_json, created_at
         FROM final_module_reflections`
      ),
      pool.query(
        `SELECT id, user_id,
                map1_name, (map1_bytes IS NOT NULL) AS has_map1,
                map2_name, (map2_bytes IS NOT NULL) AS has_map2,
                map3_name, (map3_bytes IS NOT NULL) AS has_map3,
                podcast_right, podcast_missed, podcast_insight,
                created_at, updated_at
         FROM final_module_capstone`
      ),
      pool.query(
        `SELECT id, user_id, image_path, caption, image_prompt_used,
                (image_bytes IS NOT NULL) AS has_bytes, image_mime, created_at
         FROM final_module_gallery
         ORDER BY created_at DESC`
      )
    ]);

    const reflByUser = new Map();
    reflR.rows.forEach(r => reflByUser.set(r.user_id, r));
    const capByUser = new Map();
    capR.rows.forEach(r => capByUser.set(r.user_id, r));
    const galByUser = new Map();
    galR.rows.forEach(r => {
      if (!galByUser.has(r.user_id)) galByUser.set(r.user_id, []);
      galByUser.get(r.user_id).push({
        id: r.id,
        caption: r.caption,
        image_prompt_used: r.image_prompt_used,
        created_at: r.created_at,
        image_url: r.has_bytes ? `/api/final/gallery-image/${r.id}`
                   : (r.image_path && r.image_path.startsWith('/api/') ? r.image_path : (r.image_path || null))
      });
    });

    const items = usersR.rows.map(u => ({
      user_id: u.id,
      user_label: u.user_label,
      user_email: u.user_email,
      reflection: reflByUser.get(u.id) || null,
      capstone: capByUser.get(u.id) || null,
      gallery: galByUser.get(u.id) || []
    }));
    res.json({ items });
  } catch (e) {
    console.error('admin-loppumoduuli:', e);
    res.status(500).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
  }
});

// Admin — Rikkinäinen Prompti: kaikki lähetykset ryhmiteltynä käyttäjäkohtaisesti
router.get('/admin-rikki', authenticateToken, async (req, res) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Admin-oikeus vaaditaan' });
  }
  try {
    await ensureFinalTables();
    const r = await pool.query(
      `SELECT b.id, b.round, b.payload, b.created_at,
              u.id AS user_id,
              COALESCE(u.name, u.email) AS user_label,
              u.email AS user_email
       FROM broken_prompt_submissions b
       JOIN users u ON u.id = b.user_id
       ORDER BY b.created_at DESC`
    );
    // Ryhmittele käyttäjäkohtaisesti
    const byUser = new Map();
    r.rows.forEach(row => {
      if (!byUser.has(row.user_id)) {
        byUser.set(row.user_id, {
          user_id: row.user_id,
          user_label: row.user_label,
          user_email: row.user_email,
          submissions: []
        });
      }
      byUser.get(row.user_id).submissions.push({
        id: row.id, round: row.round, payload: row.payload, created_at: row.created_at
      });
    });
    res.json({ items: Array.from(byUser.values()) });
  } catch (e) {
    console.error('admin-rikki:', e);
    res.status(500).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
  }
});

/* ===== Kurssipalaute — 5 tähtikysymystä ===== */

function clampRating(v) {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return null;
  if (n < 1) return 1;
  if (n > 5) return 5;
  return n;
}

router.get('/my-feedback', authenticateToken, async (req, res) => {
  try {
    await ensureFinalTables();
    const r = await pool.query(
      `SELECT q1_rating, q2_rating, q3_rating, q4_rating, q5_rating, comment, updated_at, created_at
       FROM course_feedback WHERE user_id = $1`,
      [req.user.id]
    );
    res.json({ feedback: r.rows[0] || null });
  } catch (e) {
    console.error('my-feedback:', e);
    res.status(500).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
  }
});

router.post('/feedback-save', authenticateToken, async (req, res) => {
  try {
    await ensureFinalTables();
    const ratings = [
      clampRating(req.body.q1_rating),
      clampRating(req.body.q2_rating),
      clampRating(req.body.q3_rating),
      clampRating(req.body.q4_rating),
      clampRating(req.body.q5_rating)
    ];
    if (ratings.some(r => r == null)) {
      return res.status(400).json({ error: 'Vastaa kaikkiin 5 kysymykseen tähdillä ennen lähetystä.' });
    }
    const comment = (req.body.comment || '').toString().trim().slice(0, 2000) || null;
    await pool.query(
      `INSERT INTO course_feedback (user_id, q1_rating, q2_rating, q3_rating, q4_rating, q5_rating, comment, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO UPDATE SET
         q1_rating = EXCLUDED.q1_rating,
         q2_rating = EXCLUDED.q2_rating,
         q3_rating = EXCLUDED.q3_rating,
         q4_rating = EXCLUDED.q4_rating,
         q5_rating = EXCLUDED.q5_rating,
         comment = EXCLUDED.comment,
         updated_at = CURRENT_TIMESTAMP`,
      [req.user.id, ratings[0], ratings[1], ratings[2], ratings[3], ratings[4], comment]
    );
    res.json({ success: true });
  } catch (e) {
    console.error('feedback-save:', e);
    res.status(500).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
  }
});

router.get('/admin-feedback', authenticateToken, async (req, res) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Admin-oikeus vaaditaan' });
  }
  try {
    await ensureFinalTables();
    const items = await pool.query(
      `SELECT f.id, f.q1_rating, f.q2_rating, f.q3_rating, f.q4_rating, f.q5_rating,
              f.comment, f.created_at, f.updated_at,
              u.id AS user_id, COALESCE(u.name, u.email) AS user_label, u.email AS user_email
       FROM course_feedback f
       JOIN users u ON u.id = f.user_id
       ORDER BY f.updated_at DESC`
    );
    const agg = await pool.query(
      `SELECT
         COUNT(*)::int AS n,
         ROUND(AVG(q1_rating)::numeric, 2) AS avg_q1,
         ROUND(AVG(q2_rating)::numeric, 2) AS avg_q2,
         ROUND(AVG(q3_rating)::numeric, 2) AS avg_q3,
         ROUND(AVG(q4_rating)::numeric, 2) AS avg_q4,
         ROUND(AVG(q5_rating)::numeric, 2) AS avg_q5
       FROM course_feedback`
    );
    res.json({ items: items.rows, stats: agg.rows[0] || { n: 0 } });
  } catch (e) {
    console.error('admin-feedback:', e);
    res.status(500).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
  }
});

module.exports = { router, ensureFinalTables };
