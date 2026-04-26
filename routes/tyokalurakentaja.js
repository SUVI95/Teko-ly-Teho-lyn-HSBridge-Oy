const express = require('express');
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

async function ensureToolBuilderTables() {
  try {
    await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
  } catch (e) {
    /* ignore */
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tool_builder_submissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      problem_description TEXT,
      field_role TEXT,
      field_input TEXT,
      field_structure TEXT,
      field_constraints TEXT,
      field_edge_cases TEXT,
      system_prompt_v1 TEXT,
      system_prompt_v2 TEXT,
      test_inputs JSONB DEFAULT '[]'::jsonb,
      test_outputs JSONB DEFAULT '[]'::jsonb,
      reflection_text TEXT,
      tool_name VARCHAR(100),
      one_sentence_description VARCHAR(300),
      gamma_url VARCHAR(500),
      canva_card_path VARCHAR(500),
      canva_card_bytes BYTEA,
      canva_card_mime VARCHAR(50),
      final_insight TEXT,
      completed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS idx_tool_builder_user ON tool_builder_submissions(user_id)');
  await pool.query(
    'CREATE INDEX IF NOT EXISTS idx_tool_builder_completed ON tool_builder_submissions(completed_at DESC)'
  );
}

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
    console.error('OpenAI tyokalurakentaja error:', t);
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
    `SELECT * FROM tool_builder_submissions WHERE id = $1::uuid AND user_id = $2`,
    [submissionId, userId]
  );
  return r.rows[0] || null;
}

router.post('/generate-prompt', authenticateToken, async (req, res) => {
  try {
    await ensureToolBuilderTables();
    const {
      submission_id,
      problem_description,
      field_role,
      field_input,
      field_structure,
      field_constraints,
      field_edge_cases
    } = req.body || {};

    const fields = {
      problem: (problem_description || '').toString().trim(),
      role: (field_role || '').toString().trim(),
      input: (field_input || '').toString().trim(),
      structure: (field_structure || '').toString().trim(),
      constraints: (field_constraints || '').toString().trim(),
      edges: (field_edge_cases || '').toString().trim()
    };

    if (fields.problem.length < 60) {
      return res.status(400).json({ error: 'Tarkenna ongelma — vähintään 60 merkkiä.' });
    }
    if (fields.role.length < 80) return res.status(400).json({ error: 'Rooli vaatii vähintään 80 merkkiä.' });
    if (fields.input.length < 80) return res.status(400).json({ error: 'Syöte vaatii vähintään 80 merkkiä.' });
    if (fields.structure.length < 100) {
      return res.status(400).json({ error: 'Rakenne vaatii vähintään 100 merkkiä.' });
    }
    if (fields.constraints.length < 80) {
      return res.status(400).json({ error: 'Rajoitteet vaativat vähintään 80 merkkiä.' });
    }
    if (fields.edges.length < 60) {
      return res.status(400).json({ error: 'Reunatapaukset vaativat vähintään 60 merkkiä.' });
    }

    const system = `Olet promptisuunnittelun asiantuntija. Saat 5 kenttää jotka kuvaavat AI-työkalun. Rakenna niistä täydellinen, heti käytettävä system prompt suomeksi.

Rakenne jota noudatat:
1. Roolimäärittely (1–2 lausetta)
2. Syötteen kuvaus (1 lause)
3. Output-rakenne (tarkka, kopioitu käyttäjän kenttä 3:sta mutta siistittynä)
4. Rajoitteet (lista, täsmälleen mitä käyttäjä kirjoitti)
5. Reunatapausten käsittely

Palauta VAIN valmis system prompt. Ei otsikkoa "System Prompt:". Ei selityksiä ennen tai jälkeen. Aloita suoraan roolimäärittelyllä.`;

    const userMessage = `1. ROOLI:
${fields.role}

2. SYÖTE:
${fields.input}

3. RAKENNE:
${fields.structure}

4. RAJOITTEET:
${fields.constraints}

5. REUNATAPAUKSET:
${fields.edges}`;

    let prompt = '';
    try {
      prompt = await openaiChat(system, userMessage, 'gpt-4o', 1500, 0.4);
    } catch (aiErr) {
      console.error('toolbuilder generate-prompt AI:', aiErr);
      return res.status(503).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
    }
    prompt = String(prompt || '').trim();
    if (!prompt) {
      return res.status(502).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
    }

    let id = isUuid(submission_id) ? submission_id : null;
    if (id) {
      const owned = await loadOwned(id, req.user.id);
      if (!owned) id = null;
    }
    if (!id) {
      id = uuidv4();
      await pool.query(
        `INSERT INTO tool_builder_submissions
          (id, user_id, problem_description, field_role, field_input, field_structure,
           field_constraints, field_edge_cases, system_prompt_v1)
         VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          id,
          req.user.id,
          fields.problem,
          fields.role,
          fields.input,
          fields.structure,
          fields.constraints,
          fields.edges,
          prompt
        ]
      );
    } else {
      await pool.query(
        `UPDATE tool_builder_submissions
         SET problem_description = $1, field_role = $2, field_input = $3,
             field_structure = $4, field_constraints = $5, field_edge_cases = $6,
             system_prompt_v1 = $7
         WHERE id = $8::uuid AND user_id = $9`,
        [
          fields.problem,
          fields.role,
          fields.input,
          fields.structure,
          fields.constraints,
          fields.edges,
          prompt,
          id,
          req.user.id
        ]
      );
    }

    res.json({ success: true, submission_id: id, system_prompt: prompt });
  } catch (e) {
    console.error('toolbuilder generate-prompt:', e);
    res.status(500).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
  }
});

router.post('/test', authenticateToken, async (req, res) => {
  try {
    await ensureToolBuilderTables();
    const { submission_id, slot, system_prompt, test_input } = req.body || {};
    if (!isUuid(submission_id)) {
      return res.status(400).json({ error: 'Virheellinen tunniste' });
    }
    const sub = await loadOwned(submission_id, req.user.id);
    if (!sub) return res.status(404).json({ error: 'Tallennusta ei löytynyt' });
    const slotIdx = parseInt(slot, 10);
    if (![0, 1, 2, 3, 4].includes(slotIdx)) {
      return res.status(400).json({ error: 'Virheellinen testislotti (0–4)' });
    }
    const sys = (system_prompt || sub.system_prompt_v1 || '').toString().trim();
    if (!sys || sys.length < 30) {
      return res.status(400).json({ error: 'System prompt puuttuu' });
    }
    const input = (test_input || '').toString().trim();
    if (!input) {
      return res.status(400).json({ error: 'Testisyöte puuttuu' });
    }
    if (input.length > 4000) {
      return res.status(400).json({ error: 'Liian pitkä testisyöte (max 4000 merkkiä)' });
    }

    let output = '';
    try {
      output = await openaiChat(sys, input, 'gpt-4o', 800, 0.7);
    } catch (aiErr) {
      console.error('toolbuilder test AI:', aiErr);
      return res.status(503).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
    }

    const inputs = Array.isArray(sub.test_inputs) ? sub.test_inputs.slice(0, 5) : [];
    const outputs = Array.isArray(sub.test_outputs) ? sub.test_outputs.slice(0, 5) : [];
    while (inputs.length < 5) inputs.push(null);
    while (outputs.length < 5) outputs.push(null);
    inputs[slotIdx] = { slot: slotIdx, input };
    outputs[slotIdx] = { slot: slotIdx, output, model: 'gpt-4o' };

    await pool.query(
      `UPDATE tool_builder_submissions
       SET test_inputs = $1::jsonb, test_outputs = $2::jsonb
       WHERE id = $3::uuid AND user_id = $4`,
      [JSON.stringify(inputs), JSON.stringify(outputs), submission_id, req.user.id]
    );

    res.json({ success: true, output });
  } catch (e) {
    console.error('toolbuilder test:', e);
    res.status(500).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
  }
});

router.post('/submit-step4', authenticateToken, (req, res) => {
  canvaUpload.single('canva_card')(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Tiedosto on liian suuri (max 5MB)' });
      }
      return res.status(400).json({ error: err.message || 'Virheellinen tiedosto' });
    }
    try {
      await ensureToolBuilderTables();
      const { submission_id, gamma_url, reflection_text, system_prompt_v2 } = req.body || {};
      if (!isUuid(submission_id)) {
        return res.status(400).json({ error: 'Virheellinen tunniste' });
      }
      const sub = await loadOwned(submission_id, req.user.id);
      if (!sub) return res.status(404).json({ error: 'Tallennusta ei löytynyt' });

      const url = (gamma_url || '').toString().trim();
      if (!/^https?:\/\/[^\s]+$/i.test(url)) {
        return res.status(400).json({ error: 'Anna kelvollinen URL (https://gamma.app/...)' });
      }
      if (url.length > 500) {
        return res.status(400).json({ error: 'URL on liian pitkä' });
      }
      const reflection = (reflection_text || '').toString().trim();
      if (reflection.length < 100) {
        return res.status(400).json({ error: 'Reflektio vaatii vähintään 100 merkkiä.' });
      }
      if (reflection.length > 8000) {
        return res.status(400).json({ error: 'Reflektio liian pitkä.' });
      }

      const v2 = (system_prompt_v2 || '').toString().trim() || null;

      let canvaPath = sub.canva_card_path;
      let canvaBytes = sub.canva_card_bytes;
      let canvaMime = sub.canva_card_mime;
      if (req.file && req.file.buffer) {
        canvaPath = `/api/tyokalurakentaja/canva-card/${submission_id}`;
        canvaBytes = req.file.buffer;
        canvaMime = req.file.mimetype || 'image/png';
      } else if (!canvaBytes) {
        return res.status(400).json({ error: 'Lataa Canva-kortti (PNG tai JPG)' });
      }

      await pool.query(
        `UPDATE tool_builder_submissions
         SET gamma_url = $1, reflection_text = $2, system_prompt_v2 = $3,
             canva_card_path = $4, canva_card_bytes = $5, canva_card_mime = $6
         WHERE id = $7::uuid AND user_id = $8`,
        [url, reflection, v2, canvaPath, canvaBytes, canvaMime, submission_id, req.user.id]
      );

      res.json({ success: true, canva_card_path: canvaPath });
    } catch (e) {
      console.error('toolbuilder submit-step4:', e);
      res.status(500).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
    }
  });
});

router.get('/canva-card/:id', authenticateToken, async (req, res) => {
  const id = (req.params.id || '').trim();
  if (!isUuid(id)) return res.status(400).send('Virheellinen tunniste');
  try {
    await ensureToolBuilderTables();
    const r = await pool.query(
      `SELECT user_id, canva_card_bytes, canva_card_mime
       FROM tool_builder_submissions WHERE id = $1::uuid`,
      [id]
    );
    if (!r.rows.length) return res.status(404).send('Ei löydy');
    const row = r.rows[0];
    if (row.user_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).send('Pääsy kielletty');
    }
    if (!row.canva_card_bytes) return res.status(404).send('Kuva puuttuu');
    res.setHeader('Content-Type', row.canva_card_mime || 'image/png');
    res.setHeader('Content-Disposition', 'inline; filename="tyokalukortti.png"');
    res.setHeader('Cache-Control', 'private, max-age=300');
    return res.send(Buffer.from(row.canva_card_bytes));
  } catch (e) {
    console.error('toolbuilder canva-card:', e);
    return res.status(500).send('Virhe');
  }
});

function countWords(s) {
  return (String(s || '').trim().match(/\S+/g) || []).length;
}

router.post('/complete', authenticateToken, async (req, res) => {
  try {
    await ensureToolBuilderTables();
    const { submission_id, tool_name, one_sentence_description, final_insight } = req.body || {};
    if (!isUuid(submission_id)) {
      return res.status(400).json({ error: 'Virheellinen tunniste' });
    }
    const sub = await loadOwned(submission_id, req.user.id);
    if (!sub) return res.status(404).json({ error: 'Tallennusta ei löytynyt' });
    if (!sub.gamma_url || !sub.canva_card_bytes || !sub.reflection_text) {
      return res.status(400).json({ error: 'Suorita ensin vaihe 4' });
    }

    const name = (tool_name || '').toString().trim();
    const desc = (one_sentence_description || '').toString().trim();
    const insight = (final_insight || '').toString().trim();

    if (!name || name.length > 40) {
      return res.status(400).json({ error: 'Anna työkalulle nimi (1–40 merkkiä).' });
    }
    if (!desc || desc.length > 200) {
      return res.status(400).json({ error: 'Yhden lauseen kuvaus (1–200 merkkiä).' });
    }
    if (countWords(insight) < 50) {
      return res.status(400).json({ error: 'Kirjoita oivalluksesi vähintään 50 sanalla.' });
    }
    if (insight.length > 6000) {
      return res.status(400).json({ error: 'Liian pitkä — leikkaa enintään 6000 merkkiin.' });
    }

    await pool.query(
      `UPDATE tool_builder_submissions
       SET tool_name = $1, one_sentence_description = $2, final_insight = $3,
           completed_at = CURRENT_TIMESTAMP
       WHERE id = $4::uuid AND user_id = $5`,
      [name.slice(0, 40), desc.slice(0, 300), insight, submission_id, req.user.id]
    );

    res.json({
      success: true,
      tool_name: name,
      one_sentence_description: desc,
      gamma_url: sub.gamma_url,
      canva_card_path: sub.canva_card_path
    });
  } catch (e) {
    console.error('toolbuilder complete:', e);
    res.status(500).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
  }
});

router.get('/my-submission', authenticateToken, async (req, res) => {
  try {
    await ensureToolBuilderTables();
    const r = await pool.query(
      `SELECT id, problem_description, field_role, field_input, field_structure,
              field_constraints, field_edge_cases, system_prompt_v1, system_prompt_v2,
              test_inputs, test_outputs, reflection_text,
              tool_name, one_sentence_description, gamma_url, canva_card_path,
              final_insight, completed_at, created_at
       FROM tool_builder_submissions WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [req.user.id]
    );
    res.json({ submission: r.rows[0] || null });
  } catch (e) {
    console.error('toolbuilder my-submission:', e);
    res.status(500).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
  }
});

module.exports = { router, ensureToolBuilderTables };
