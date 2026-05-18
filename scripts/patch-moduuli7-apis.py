#!/usr/bin/env python3
from pathlib import Path

path = Path(__file__).resolve().parents[1] / "moduuli7-ai-tyonhaussa.html"
t = path.read_text(encoding="utf-8")

bundle_fn = r'''
function buildStudentProfileBundle() {
  var lines = [];
  function add(title, body) {
    if (!body || !String(body).trim()) return;
    lines.push('=== ' + title + ' ===\n' + String(body).trim());
  }
  add('HENKILÖTIEDOT',
    'Nimi: ' + (cvData.name || '') + '\nPaikkakunta: ' + (cvData.city || '') +
    '\nSähköposti: ' + (cvData.emailPublic || '') + '\nPuhelin: ' + (cvData.phonePublic || '') +
    '\nLinkedIn: ' + (cvData.linkedinUrl || '') + '\nTavoiterooli: ' + (cvData.targetRole || ''));
  add('KOULUTUS JA KIELET', (cvData.education || '') + '\nKurssit: ' + (cvData.courses || '') + '\nKielet: ' + (cvData.languages || ''));
  if (cvData.careerSummary || cvData.aiSummary) add('URAHISTORIA (tiivistelmä)', cvData.careerSummary || cvData.aiSummary);
  if (typeof chatHistory !== 'undefined' && chatHistory.length > 1) {
    var userOnly = chatHistory.filter(function(m) { return m.role === 'user'; }).map(function(m, i) {
      return 'Vastaus ' + (i + 1) + ': ' + m.content;
    }).join('\n');
    add('HAASTATTELUN VASTAUKSET', userOnly);
    if (!cvData.careerSummary && !cvData.aiSummary) {
      add('HAASTATTELU (koko)', chatHistory.map(function(m) {
        return (m.role === 'user' ? 'Käyttäjä' : 'Valmentaja') + ': ' + m.content;
      }).join('\n'));
    }
  }
  add('TAIDOT', cvData.skills || cvData.aiSkills);
  add('LISÄTAIDOT', cvData.extraSkills);
  add('PIILOTETUT VAHVUUDET', cvData.hiddenStrengths);
  if (cvData.hiddenQ1 || cvData.hiddenQ2 || cvData.hiddenQ3) {
    add('PIILOTETUT VASTAUKSET', 'Apua: ' + (cvData.hiddenQ1 || '') + '\nHelppoa: ' + (cvData.hiddenQ2 || '') + '\nHarrastukset: ' + (cvData.hiddenQ3 || ''));
  }
  add('KEHITYSKOHTEET', cvData.gapAnalysis);
  add('CV-POIMINNAT', cvData.cvExtract);
  if (cvData.oldCv) add('VANHA CV (käyttäjän liittämä)', cvData.oldCv);
  if (cvData.jobs) {
    var jp = [];
    for (var n = 1; n <= 5; n++) {
      var j = cvData.jobs[n];
      if (j && (j.posting || j.analysis)) {
        jp.push('TYÖ ' + n + ': ' + (j.company || '') + ' — ' + (j.title || '') + '\n' + (j.analysis || (j.posting || '').slice(0, 500)));
      }
    }
    if (jp.length) add('TYÖPAIKKA-ANALYYSIT', jp.join('\n\n'));
  }
  add('DEEP SEARCH', cvData.deepSearchResults);
  return lines.join('\n\n');
}

async function extractCvUpload() {
  var raw = ((document.getElementById('cvUploadText') || {}).value || cvData.cvUploadRaw || '').trim();
  if (!raw) { alert('Liitä CV:n teksti ensin.'); return; }
  saveCvField('cvUploadRaw', raw);
  var result = document.getElementById('cvExtractResult');
  var txt = document.getElementById('cvExtractText');
  if (!result || !txt) return;
  txt.innerHTML = '<span class="loading-dots"><span></span><span></span><span></span></span>';
  result.style.display = 'block';
  try {
    var extracted = await window.aiClaude(
      'Poimi CV-tekstistä strukturoitu profiili SUOMEKSI. Älä keksi. Palauta: YHTEENVETO, TYÖKOKEMUS, TAIDOT, KOULUTUS, VAHVUUDET, ATS-AVAINSANAT.',
      raw.slice(0, 14000),
      2800
    );
    txt.textContent = extracted;
    saveCvField('cvExtract', extracted);
    checkPortfolioData();
  } catch (e) { txt.textContent = (e && e.message) || 'Yhteysvirhe. Tarkista ANTHROPIC_API_KEY.'; }
}

'''

anchor = '/* ── PORTFOLIO COLOR SELECTION ── */'
if 'function buildStudentProfileBundle' not in t:
    t = t.replace(anchor, bundle_fn + anchor, 1)

upload_block = '''
    <div class="info-card">
      <h3>Haluatko ladata CV:si? (vapaaehtoinen)</h3>
      <p>AI poimii vahvuudet ja taidot — yhdistää haastatteluun ja Lovable-promptiin.</p>
      <textarea class="form-textarea" id="cvUploadText" placeholder="Liitä CV:n teksti tähän..." style="min-height:90px;" oninput="saveCvField('cvUploadRaw',this.value)"></textarea>
      <input type="file" id="cvUploadFile" accept=".txt,.md,text/plain" style="margin:.5rem 0;font-size:.85rem;">
      <button class="btn-secondary" onclick="extractCvUpload()">🔍 AI poimii tiedot CV:stä (Claude)</button>
      <motion class="ai-result" id="cvExtractResult" style="display:none;">
        <div class="ai-result-label">CV:stä poimitut tiedot</div>
        <div class="ai-result-text" id="cvExtractText"></div>
      </div>
    </div>

'''.replace('<motion class="ai-result"', '<motion class="ai-result"'.replace('<motion ', '<div ').replace('</motion>', '</div>', 1) if False else '''
    <div class="info-card">
      <h3>Haluatko ladata CV:si? (vapaaehtoinen)</h3>
      <p>AI poimii vahvuudet ja taidot — yhdistää haastatteluun ja Lovable-promptiin.</p>
      <textarea class="form-textarea" id="cvUploadText" placeholder="Liitä CV:n teksti tähän..." style="min-height:90px;" oninput="saveCvField('cvUploadRaw',this.value)"></textarea>
      <input type="file" id="cvUploadFile" accept=".txt,.md,text/plain" style="margin:.5rem 0;font-size:.85rem;">
      <button class="btn-secondary" onclick="extractCvUpload()">🔍 AI poimii tiedot CV:stä (Claude)</button>
      <div class="ai-result" id="cvExtractResult" style="display:none;">
        <div class="ai-result-label">CV:stä poimitut tiedot</div>
        <motion class="ai-result-text" id="cvExtractText"></div>
      </div>
    </div>

''')

# fix accidental motion tag in upload_block - use clean version
upload_block = '''
    <div class="info-card">
      <h3>Haluatko ladata CV:si? (vapaaehtoinen)</h3>
      <p>AI poimii vahvuudet ja taidot — yhdistää haastatteluun ja Lovable-promptiin.</p>
      <textarea class="form-textarea" id="cvUploadText" placeholder="Liitä CV:n teksti tähän..." style="min-height:90px;" oninput="saveCvField('cvUploadRaw',this.value)"></textarea>
      <input type="file" id="cvUploadFile" accept=".txt,.md,text/plain" style="margin:.5rem 0;font-size:.85rem;">
      <button class="btn-secondary" onclick="extractCvUpload()">🔍 AI poimii tiedot CV:stä (Claude)</button>
      <div class="ai-result" id="cvExtractResult" style="display:none;">
        <div class="ai-result-label">CV:stä poimitut tiedot</div>
        <div class="ai-result-text" id="cvExtractText"></div>
      </div>
    </motion>

'''

upload_block = upload_block.replace('    </motion>\n\n', '    </motion>\n\n').replace('</motion>', '</div>')

marker = '    <!-- THE MAIN AI PROMPT GENERATOR -->'
if 'cvUploadText' not in t:
    t = t.replace(marker, upload_block + marker, 1)

# chatbot in feature list
t = t.replace(
    '<div style="display:flex;align-items:center;gap:.6rem;font-size:.85rem;"><span style="color:var(--accent3);">✦</span> Scroll-animaatiot</div>',
    '<div style="display:flex;align-items:center;gap:.6rem;font-size:.85rem;"><span style="color:var(--accent3);">✦</span> AI-chatbot (kelluva, suomeksi)</div>\n        <motion style="display:flex;align-items:center;gap:.6rem;font-size:.85rem;"><span style="color:var(--accent3);">✦</span> Scroll-animaatiot</div>',
    1
)
t = t.replace('<motion style="display:flex', '<div style="display:flex', 1)

start = t.index('/* ── LOVABLE PROMPT GENERATOR ── */')
end = t.index('function copyLovablePrompt()', start)
new_gen = '''/* ── LOVABLE PROMPT GENERATOR ── */
async function generateLovablePrompt() {
  var btn = document.getElementById('generatePortfolioPromptBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Claude kirjoittaa promptin...'; }

  var bundle = buildStudentProfileBundle();
  if (!bundle.trim()) {
    alert('Täytä ensin perustiedot (Askel 1) ja tee urahaastattelu (Askel 2).');
    if (btn) { btn.disabled = false; btn.textContent = '✦ Generoi Lovable-prompt'; }
    return;
  }

  var tagline = cvData.portfolioTagline || document.getElementById('pfTagline')?.value || '';
  var colorMap = {
    dark: 'dark executive (#1a1a2e), gold accent (#b8860b), premium editorial',
    blue: 'light professional (#f0f4ff), blue accent (#2563a8)',
    purple: 'dark modern (#1e1040), purple accent (#a855f7)',
    minimal: 'white minimal, black typography, ultra-clean'
  };
  var colorDesc = colorMap[selectedColor] || colorMap.dark;

  document.getElementById('lovablePromptText').textContent = 'Generoidaan Claude API:lla...';
  document.getElementById('lovablePromptResult').style.display = 'block';

  try {
    var prompt = await window.aiClaude(
      'You are a senior product designer. Write ONE paste-ready English prompt for Lovable.dev to build a premium EXECUTIVE personal portfolio website.\\n\\n' +
      'MANDATORY:\\n' +
      '- Hero: name, target role, tagline, fade-in animation\\n' +
      '- Animated skill bars (6-8 skills from data), scroll-triggered\\n' +
      '- Experience timeline with scroll animations\\n' +
      '- Floating AI CHATBOT: bottom-right FAB, slide-out panel, 4 Finnish starter questions; answers ONLY from page content; mobile-friendly\\n' +
      '- Contact: email, phone, LinkedIn\\n' +
      '- Design: ' + colorDesc + ', refined typography, subtle gradients, executive feel\\n' +
      '- Use ONLY candidate facts. No invented employers or metrics.\\n' +
      'Output: English Lovable prompt only, no markdown fences.',
      'CANDIDATE DATA:\\n' + bundle + (tagline ? '\\n\\nPreferred tagline: ' + tagline : ''),
      4500
    );
    document.getElementById('lovablePromptText').textContent = prompt;
    saveCvField('lovablePrompt', prompt);
    checkPortfolioData();
  } catch (e) {
    document.getElementById('lovablePromptText').textContent = (e && e.message) || 'Virhe. Varmista että Claude API (ANTHROPIC_API_KEY) on käytössä.';
  }

  if (btn) { btn.disabled = false; btn.textContent = '✦ Generoi uudelleen'; }
}

'''
t = t[:start] + new_gen + t[end:]

t = t.replace(
    "    { id:'Summary', val: cvData.careerSummary || cvData.aiSummary },",
    "    { id:'Summary', val: cvData.careerSummary || cvData.aiSummary || (typeof chatHistory !== 'undefined' && chatHistory.filter(function(m){return m.role==='user';}).length >= 3) },",
    1
)

if "function getPortfolioContext()" in t and "buildStudentProfileBundle" not in t.split("function getPortfolioContext()")[1].split("}")[0]:
    t = t.replace(
        "function getPortfolioContext(){\n  return 'Nimi: '+(cvData.name||'')+'\\nPaikkakunta: '+(cvData.city||'')+'\\nTavoiterooli: '+(cvData.targetRole||'')+'\\nUrahistoria:\\n'+(cvData.careerSummary||'')+'\\nTaidot:\\n'+(cvData.skills||'')+'\\nKoulutus: '+(cvData.education||'')+'\\nKielet: '+(cvData.languages||'');\n}",
        "function getPortfolioContext(){ return buildStudentProfileBundle(); }",
        1
    )

old_cv = """    var prompt='Kirjoita ATS-optimoitu CV.\\nSÄÄNNÖT:\\n- Jokainen työkuvaus alkaa TOIMINTAVERBILLÄ\\n- Numerot mukaan jos mainittu, muuten [TÄYDENNÄ]\\n- Rakenne: Yhteystiedot → Profiili (2-3 lausetta) → Kokemus → Koulutus → Taidot → Kielet\\n- Ei taulukoita, max 2 sivua\\n- ÄLÄ keksi mitään\\n- Profiiliteksti: iskevä, konkreettinen\\n- Jos tehtäväilmoitus mukana: sisällytä sen avainsanat luonnollisesti\\n\\nHENKILÖ:\\nNimi: '+(cvData.name||'[TÄYDENNÄ]')+'\\nPaikkakunta: '+(cvData.city||'')+'\\nTavoiterooli: '+(cvData.targetRole||'')+'\\n\\nURAHISTORIA:\\n'+(cvData.careerSummary||'[TÄYDENNÄ]')+'\\n\\nKOULUTUS:\\n'+(cvData.education||'')+'\\n\\nTAIDOT:\\n'+(cvData.skills||'')+'\\n'+(cvData.extraSkills?'Lisätaidot: '+cvData.extraSkills:'')+'\\n\\nKIELET:\\n'+(cvData.languages||'')+(j1.posting?'\\n\\nHAETTAVA TEHTÄVÄ:\\n'+j1.posting:'');
    var cv=await window.aiChat('Olet CV-kirjoittaja. Noudata annettuja ohjeita tarkasti.',prompt,1800);"""

new_cv = """    var bundle = buildStudentProfileBundle();
    var cv = await window.aiClaude(
      'Kirjoita valmis ATS-yhteensopiva CV suomeksi. Toimintaverbit, numerot, standardi otsikot (Profiili, Työkokemus, Koulutus, Taidot, Kielet), max 2 sivua, ei taulukoita. Käytä VAIN dataa. Älä keksi.',
      bundle + (j1.posting ? '\\n\\n=== HAETTAVA TEHTÄVÄ (ilmoitus) ===\\n' + j1.posting : ''),
      4000);"""

if old_cv in t:
    t = t.replace(old_cv, new_cv, 1)

# Visual CV Lovable prompt button after build CV button
cv_btn_marker = '<button class="btn-primary" id="buildCVBtn" onclick="buildCVDraft()">⚙️ Generoi CV-luonnos</button>'
cv_extra = '''
      <button class="btn-secondary" id="buildVisualCvPromptBtn" onclick="generateVisualCvLovablePrompt()" style="margin-left:.5rem;">✦ Visuaalinen CV-prompt (Lovable)</button>
'''
if 'generateVisualCvLovablePrompt' not in t and cv_btn_marker in t:
    t = t.replace(cv_btn_marker, cv_btn_marker + cv_extra, 1)

visual_fn = r'''
async function generateVisualCvLovablePrompt() {
  var bundle = buildStudentProfileBundle();
  if (!bundle.trim()) { alert('Täytä moduulin tiedot ensin.'); return; }
  var btn = document.getElementById('buildVisualCvPromptBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Claude...'; }
  try {
    var prompt = await window.aiClaude(
      'Write ONE English Lovable.dev prompt for a premium EXECUTIVE one-page CV/resume site. ATS-friendly plain-text sections PLUS stunning print-ready layout: serif headings, gold accents, skill tags, timeline, PDF-export friendly. Use ONLY facts from data. No invention.',
      bundle,
      4000
    );
    var ta = document.getElementById('visualCvPromptOut');
    if (!ta) {
      ta = document.createElement('textarea');
      ta.id = 'visualCvPromptOut';
      ta.className = 'form-textarea';
      ta.style.minHeight = '120px';
      ta.style.marginTop = '1rem';
      document.getElementById('buildCVBtn').parentElement.appendChild(ta);
    }
    ta.value = prompt;
    ta.style.display = 'block';
    saveCvField('visualCvLovablePrompt', prompt);
    alert('Visuaalinen CV-prompt valmis — kopioi ja liitä Lovableen.');
  } catch (e) { alert((e && e.message) || 'Claude API -virhe'); }
  if (btn) { btn.disabled = false; btn.textContent = '✦ Visuaalinen CV-prompt (Lovable)'; }
}

'''
if 'generateVisualCvLovablePrompt' not in t:
    t = t.replace('async function buildCVDraft(){', visual_fn + 'async function buildCVDraft(){', 1)

t = t.replace(
    "oldCvInput:'oldCv',deepSearchResults:'deepSearchResults'",
    "oldCvInput:'oldCv',cvUploadText:'cvUploadRaw',deepSearchResults:'deepSearchResults'",
    1
)

if "cvUploadFile').addEventListener" not in t:
    t = t.replace(
        "  pickTemplate(cvData.portfolioTemplate||'modern');\n});",
        "  pickTemplate(cvData.portfolioTemplate||'modern');\n  var cvFile = document.getElementById('cvUploadFile');\n  if (cvFile) cvFile.addEventListener('change', function(e) {\n    var f = e.target.files && e.target.files[0];\n    if (!f) return;\n    var r = new FileReader();\n    r.onload = function(ev) {\n      var ta = document.getElementById('cvUploadText');\n      if (ta) { ta.value = ev.target.result; saveCvField('cvUploadRaw', ta.value); }\n    };\n    r.readAsText(f);\n  });\n  if (cvData.cvExtract) {\n    var cer = document.getElementById('cvExtractResult');\n    var cet = document.getElementById('cvExtractText');\n    if (cer && cet) { cet.textContent = cvData.cvExtract; cer.style.display = 'block'; }\n  }\n  if (cvData.lovablePrompt) {\n    var lpt = document.getElementById('lovablePromptText');\n    var lpr = document.getElementById('lovablePromptResult');\n    if (lpt && lpr) { lpt.textContent = cvData.lovablePrompt; lpr.style.display = 'block'; }\n  }\n});",
        1
    )

path.write_text(t, encoding="utf-8")
print("Patched OK, len", len(t))
