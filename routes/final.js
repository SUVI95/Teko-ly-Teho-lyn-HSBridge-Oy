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
}

const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'final-gallery');
function ensureUploadDir() {
  try {
    fs.mkdirSync(uploadDir, { recursive: true });
  } catch (e) {
    console.error('final-gallery upload dir:', e);
  }
}
ensureUploadDir();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureUploadDir();
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const extMap = { 'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
    const ext = extMap[file.mimetype] || path.extname(file.originalname || '') || '.jpg';
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.mimetype);
    if (ok) cb(null, true);
    else cb(new Error('Vain JPG, PNG tai WebP'));
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
      if (!req.file) {
        return res.status(400).json({ error: 'Kuva vaaditaan' });
      }
      const caption = (req.body.caption || '').trim();
      if (!caption) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {}
        return res.status(400).json({ error: 'Kuvateksti vaaditaan' });
      }
      if (caption.length > 200) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {}
        return res.status(400).json({ error: 'Kuvateksti on liian pitkä (max 200 merkkiä)' });
      }
      const relPath = '/uploads/final-gallery/' + path.basename(req.file.path);
      const imagePrompt = (req.body.image_prompt_used || '').trim() || null;
      await pool.query(
        `INSERT INTO final_module_gallery (user_id, image_path, caption, image_prompt_used) VALUES ($1, $2, $3, $4)`,
        [req.user.id, relPath, caption, imagePrompt]
      );
      res.json({ success: true, image_path: relPath });
    } catch (e) {
      console.error('gallery-upload:', e);
      if (req.file && req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e2) {}
      }
      res.status(500).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
    }
  }
);

router.get('/gallery', async (req, res) => {
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
       ORDER BY g.created_at DESC`
    );
    res.json({ items: r.rows });
  } catch (e) {
    console.error('gallery list:', e);
    res.status(500).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
  }
});

module.exports = { router, ensureFinalTables };
