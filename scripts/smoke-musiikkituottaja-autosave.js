#!/usr/bin/env node
/**
 * Smoke: moduuli-ai-musiikkituottaja autosave round-trip via reflections __work API.
 *
 * Usage: node scripts/smoke-musiikkituottaja-autosave.js [baseUrl]
 * Env: SMOKE_EMAIL, SMOKE_PASSWORD, BASE_URL
 */
const base = (process.argv[2] || process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const email = process.env.SMOKE_EMAIL || 'testi.opiskelija@example.com';
const password = process.env.SMOKE_PASSWORD || 'testi123';
const MODULE_ID = 'moduuli-ai-musiikkituottaja';
const WORK_ID = MODULE_ID + '__work';

function pass(msg) {
  console.log('  ✓', msg);
}
function fail(msg) {
  console.error('  ✗', msg);
  process.exitCode = 1;
}

async function req(method, path, body, cookie) {
  const headers = { Accept: 'application/json, text/html, */*' };
  if (cookie) headers.Cookie = cookie;
  if (body != null) headers['Content-Type'] = 'application/json';
  const r = await fetch(base + path, {
    method,
    headers,
    body: body == null ? undefined : JSON.stringify(body)
  });
  const text = await r.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (e) {
    json = null;
  }
  return { status: r.status, json, text, headers: r.headers };
}

function parseCookie(setCookie) {
  const raw = Array.isArray(setCookie) ? setCookie.join('\n') : String(setCookie || '');
  const m = raw.match(/session_token=([^;]+)/);
  return m ? 'session_token=' + m[1] : '';
}

const FIELD_IDS = [
  't1', 't2core', 't2w1', 't2w2', 't2w3', 't2pick', 't2dir',
  't3gpt', 't3claude', 't3score', 't3hybrid', 't3verdict',
  't4raw', 't4cut', 't4killed', 't4surgery', 't4final',
  't5lyrics', 't5a', 't5b', 't5c', 't5win',
  't6style', 't6v1', 't6fix', 't6v2', 't6url', 't6honest',
  't7dna', 't7new', 't7test', 't7tool1', 't7tool2', 't7tool3',
  't8form', 't8name', 't8crew', 't8album', 't8mood', 't8scene', 't8look', 't8event', 't8handle',
  't8coverprompt', 't8cover', 't8flyerprompt', 't8flyer', 't8match',
  't9pitch', 'reflectionText', 't9ready'
];

const WIRING_NEEDLES = [
  '__DISABLE_GLOBAL_MODULE_AUTOSAVE__',
  'initModuleWork',
  'collectWorkState',
  'applyWorkState',
  'moduuli-ai-musiikkituottaja__work',
  'mobile-dock',
  'step-bar',
  'jumpToCurrent',
  'schedulePersist',
  'pagehide',
  'font-size:16px'
];

function buildPayload(marker) {
  const fields = {};
  FIELD_IDS.forEach(function (id) {
    fields[id] = marker + '-' + id;
  });
  fields.t6url = 'https://suno.com/song/' + marker;
  fields.t9ready = 'VALMIS'; // exact gate word — marker checked separately
  return {
    v: 1,
    data: {
      v: 1,
      ts: Date.now(),
      curScreen: 4,
      done: [1, 2, 3],
      coverPromptDirty: true,
      flyerPromptDirty: false,
      fields: fields,
      shown: { finished: false }
    },
    summary: 'smoke musiikki ' + marker,
    savedAt: new Date().toISOString()
  };
}

async function main() {
  console.log('Musiikkituottaja autosave smoke:', base);

  const html = await req('GET', '/module/' + MODULE_ID + '?preview=1');
  if (html.status !== 200) fail('module HTML status ' + html.status);
  else pass('module HTML 200');

  WIRING_NEEDLES.forEach(function (needle) {
    if (html.text.indexOf(needle) === -1) fail('missing wiring: ' + needle);
    else pass('wiring: ' + needle);
  });

  FIELD_IDS.forEach(function (id) {
    if (html.text.indexOf('id="' + id + '"') === -1 && html.text.indexOf("id='" + id + "'") === -1) {
      fail('missing field id=' + id);
    }
  });
  if (!process.exitCode) pass('all ' + FIELD_IDS.length + ' field ids present in HTML');

  const login = await req('POST', '/api/auth/login', { email: email, password: password });
  const setCookie = login.headers.get('set-cookie');
  const cookie = parseCookie(setCookie);
  if (login.status !== 200 || !cookie) {
    fail('login as ' + email + ' (' + (login.json && login.json.error) + ')');
    console.log('Hint: npm run create-test-accounts');
    process.exit(process.exitCode || 1);
  }
  pass('login as ' + email);

  const me = await req('GET', '/api/auth/me', null, cookie);
  const gift = me.json && me.json.user && me.json.user.musiikki_gift;
  if (gift === true || gift === 'true') pass('musiikki_gift true for test student');
  else fail('musiikki_gift not set on user (got ' + gift + ')');

  const gated = await req('GET', '/module/' + MODULE_ID, null, cookie);
  if (gated.status === 200 && gated.text.indexOf('AI-musiikkituottaja') !== -1) {
    pass('gift recipient can open /module without preview');
  } else {
    fail('gift recipient cannot open module (status ' + gated.status + ')');
  }

  const marker = 'smoke-musiikki-' + Date.now();
  const payload = buildPayload(marker);
  const save = await req(
    'POST',
    '/api/reflections/save',
    { moduleId: WORK_ID, reflectionText: JSON.stringify(payload) },
    cookie
  );
  if (save.status !== 200 || !(save.json && save.json.success)) {
    fail('save ' + WORK_ID + ' (' + save.status + ')');
  } else {
    pass('save ' + WORK_ID);
  }

  const load = await req('GET', '/api/reflections/module/' + encodeURIComponent(WORK_ID), null, cookie);
  if (load.status !== 200 || !(load.json && load.json.reflection && load.json.reflection.reflection_text)) {
    fail('load ' + WORK_ID);
  } else {
    pass('load ' + WORK_ID);
    let parsed;
    try {
      parsed = JSON.parse(load.json.reflection.reflection_text);
    } catch (e) {
      fail('parse saved JSON');
      parsed = null;
    }
    if (parsed && parsed.data && parsed.data.fields) {
      const f = parsed.data.fields;
      let ok = true;
      FIELD_IDS.forEach(function (id) {
        if (id === 't9ready') {
          if (String(f[id] || '') !== 'VALMIS') {
            fail('round-trip t9ready expected VALMIS');
            ok = false;
          }
          return;
        }
        if (String(f[id] || '').indexOf(marker) === -1) {
          fail('round-trip missing marker in ' + id);
          ok = false;
        }
      });
      if (ok) pass('round-trip: all fields restored');
      if (Array.isArray(parsed.data.done) && parsed.data.done.join(',') === '1,2,3') {
        pass('round-trip: done steps restored');
      } else {
        fail('done steps not restored');
      }
      if (Number(parsed.data.curScreen) === 4) pass('round-trip: curScreen=4');
      else fail('curScreen expected 4 got ' + parsed.data.curScreen);
    } else {
      fail('saved payload missing data.fields');
    }
  }

  const summary = await req('GET', '/api/progress/summary', null, cookie);
  if (summary.status !== 200) fail('progress summary status');
  else {
    const list = (summary.json && summary.json.module_work) || [];
    const hit = list.find(function (w) { return w.base_module_id === MODULE_ID; });
    if (hit) pass('progress summary includes musiikkituottaja work');
    else fail('progress summary missing musiikkituottaja work');
  }

  if (!process.exitCode) console.log('\nAll musiikkituottaja autosave checks passed.');
  else console.log('\nSmoke finished with failures.');
  process.exit(process.exitCode || 0);
}

main().catch(function (e) {
  console.error(e);
  process.exit(1);
});
