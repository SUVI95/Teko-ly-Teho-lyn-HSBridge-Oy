#!/usr/bin/env python3
from pathlib import Path

path = Path(__file__).resolve().parents[1] / "moduuli7-ai-tyonhaussa.html"
text = path.read_text(encoding="utf-8")

old_contact = """      <div class="form-group"><label class="form-label">Tavoiterooli / haettava tehtävä</label><input class="form-input" id="cvTarget" placeholder="Esim. Asiakaspalvelupäällikkö, markkinointi-assistentti, kokki..." onchange="saveCvField('targetRole',this.value)"></motion>
      <div class="form-group"><label class="form-label">Koulutus"""
old_contact = """      <div class="form-group"><label class="form-label">Tavoiterooli / haettava tehtävä</label><input class="form-input" id="cvTarget" placeholder="Esim. Asiakaspalvelupäällikkö, markkinointi-assistentti, kokki..." onchange="saveCvField('targetRole',this.value)"></div>
      <div class="form-group"><label class="form-label">Koulutus"""

new_contact = """      <div class="form-group"><label class="form-label">Tavoiterooli / haettava tehtävä</label><input class="form-input" id="cvTarget" placeholder="Esim. Asiakaspalvelupäällikkö, markkinointi-assistentti, kokki..." onchange="saveCvField('targetRole',this.value)"></div>
      <div class="form-row">
        <motion class="form-group"><label class="form-label">Sähköposti</label><input class="form-input" id="cvEmail" type="email" placeholder="nimi@email.com" onchange="saveCvField('email',this.value)"></div>
        <div class="form-group"><label class="form-label">Puhelin (vapaaehtoinen)</label><input class="form-input" id="cvPhone" placeholder="+358..." onchange="saveCvField('phone',this.value)"></div>
      </div>
      <div class="form-group"><label class="form-label">LinkedIn URL (vapaaehtoinen)</label><input class="form-input" id="cvLinkedin" placeholder="https://linkedin.com/in/..." onchange="saveCvField('linkedin',this.value)"></div>
      <div class="form-group"><label class="form-label">Koulutus"""
new_contact = new_contact.replace("<motion class", "<div class")

if old_contact not in text:
    raise SystemExit("contact anchor not found")
text = text.replace(old_contact, new_contact, 1)

portfolio_section = """
<!-- ═══ 7 · PORTFOLIO / LOVABLE ═════════════════ -->
<section class="section section-alt section-auto" id="portfolio-lovable" data-index="7">
  <div class="section-inner fade-up">
    <div class="section-label">Askel 6</div>
    <h2 class="section-h2">Oma <em>portfolio-sivu</em></h2>
    <motion class="divider"></div>
    <span class="time-badge">~15 min</span>
    <p class="lead">Rekrytoija googlailee sinut ennen haastattelua. AI kokoaa <strong>kaiken mitä olet täyttänyt moduulissa</strong> — haastattelu, taidot, perustiedot — ja kirjoittaa Lovable-promptin premium-tyyliselle sivulle animaatioilla ja chatbotilla.</p>

    <div class="info-card">
      <h3>Lovable — AI rakentaa sivusi</h3>
      <p>Kirjoitat promptin, AI rakentaa toimivan verkkosivun. Ei koodaustaitoja. Saat URL:n jota voit liittää CV:hen ja LinkedIniin.</p>
      <a href="https://lovable.dev" target="_blank" rel="noopener" class="tool-link" style="margin-top:.75rem;">Avaa Lovable ↗</a>
    </div>

    <div class="info-card">
      <h3>Haluatko ladata vanhan CV:si? (vapaaehtoinen)</h3>
      <p>AI poimii sieltä vahvuudet ja taidot — yhdistää haastatteluun.</p>
      <input type="file" id="cvUploadFile" accept=".txt,.md" style="margin-bottom:.75rem;font-size:.85rem;">
      <textarea class="form-textarea" id="cvUploadText" placeholder="Liitä CV:n teksti tähän TAI lataa .txt/.md tiedosto..." style="min-height:100px;" onchange="saveCvField('cvUploadRaw',this.value)"></textarea>
      <button class="btn-secondary" style="margin-top:.75rem;" onclick="extractCvUpload()">🔍 AI poimii tiedot CV:stä (Claude)</button>
      <motion class="ai-result" id="cvExtractResult">
        <motion class="ai-result-label">CV:stä poimitut tiedot</div>
        <div class="ai-result-text" id="cvExtractText"></motion>
      </div>
    </div>

    <div class="info-card">
      <h3>Tarkista tiedot ennen generointia</h3>
      <div id="dataReadinessList" style="font-size:.88rem;line-height:1.9;"></div>
      <button class="btn-secondary" style="margin-top:.75rem;" onclick="refreshDataReadiness()">🔍 Päivitä tarkistus</button>
    </div>

    <div class="info-card">
      <h3>Generoi täydellinen Lovable-prompt</h3>
      <p>Claude käyttää kaikkia moduulin tietoja: nimi, haastattelu, taidot, työpaikat, CV-lataus.</p>
      <div class="form-group"><label class="form-label">Tagline (vapaaehtoinen)</label><input class="form-input" id="portfolioTagline" placeholder="Yksi lause joka kuvaa sinua" onchange="saveCvField('portfolioTagline',this.value)"></div>
      <div class="form-group">
        <label class="form-label">Värimaailma</label>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.5rem;" id="themePicker">
          <button type="button" class="btn-secondary theme-btn" data-theme="dark-gold" onclick="selectPortfolioTheme('dark-gold')">Tumma kultainen</button>
          <button type="button" class="btn-secondary theme-btn" data-theme="blue-light" onclick="selectPortfolioTheme('blue-light')">Sininen vaalea</button>
          <button type="button" class="btn-secondary theme-btn" data-theme="dark-violet" onclick="selectPortfolioTheme('dark-violet')">Tumma violetti</button>
          <button type="button" class="btn-secondary theme-btn" data-theme="minimal" onclick="selectPortfolioTheme('minimal')">Minimalistinen</button>
        </div>
      </div>
      <button class="btn-primary" style="margin-top:1rem;" onclick="generateLovablePrompt()">✦ Generoi Lovable-prompt (Claude)</button>
      <div class="master-card" id="lovablePromptCard" style="display:none;margin-top:1.5rem;">
        <h3>Valmis Lovable-prompt</h3>
        <div class="prompt-text" id="lovablePromptText"></div>
        <div class="btn-row">
          <button class="btn-gold" onclick="copyLovablePrompt()">📋 Kopioi prompt</button>
          <a href="https://lovable.dev" target="_blank" rel="noopener" class="btn-ghost">Avaa Lovable ↗</a>
        </div>
      </div>
    </div>
  </div>
</section>

"""
portfolio_section = portfolio_section.replace("<motion ", "<div ").replace("</motion>", "</div>")

anchor = "<!-- ═══ 7 · CV-RAKENTAJA ══════════════════════ -->"
text = text.replace(anchor, portfolio_section + anchor, 1)
text = text.replace(
    '    <div class="section-label">Askel 6</div>\n    <h2 class="section-h2">CV-<em>rakentaja</em></h2>',
    '    <div class="section-label">Askel 7</div>\n    <h2 class="section-h2">CV-<em>rakentaja</em></h2>',
    1,
)

js_bundle = open(Path(__file__).parent / "_moduuli7-bundle.js").read() if False else ""
js_bundle = r'''
/* ── STUDENT PROFILE BUNDLE ─────────────────── */
function buildStudentProfileBundle() {
  var lines = [];
  function add(title, body) {
    if (!body || !String(body).trim()) return;
    lines.push('=== ' + title + ' ===\n' + String(body).trim());
  }
  add('HENKILÖTIEDOT',
    'Nimi: ' + (cvData.name || '[TÄYDENNÄ]') + '\nPaikkakunta: ' + (cvData.city || '') +
    '\nSähköposti: ' + (cvData.email || '') + '\nPuhelin: ' + (cvData.phone || '') +
    '\nLinkedIn: ' + (cvData.linkedin || '') + '\nTavoiterooli: ' + (cvData.targetRole || '[TÄYDENNÄ]'));
  add('KOULUTUS JA KIELET', (cvData.education || '') + '\nKurssit: ' + (cvData.courses || '') + '\nKielet: ' + (cvData.languages || ''));
  if (cvData.careerSummary) add('URAHISTORIA (tiivistelmä)', cvData.careerSummary);
  if (chatHistory.length > 1) {
    var userOnly = chatHistory.filter(function(m) { return m.role === 'user'; }).map(function(m, i) { return 'Vastaus ' + (i+1) + ': ' + m.content; }).join('\n');
    add('HAASTATTELUN VASTAUKSET', userOnly);
    if (!cvData.careerSummary) {
      add('HAASTATTELU (koko)', chatHistory.map(function(m) { return (m.role === 'user' ? 'Käyttäjä' : 'Valmentaja') + ': ' + m.content; }).join('\n'));
    }
  }
  add('TAIDOT', cvData.skills);
  add('LISÄTAIDOT', cvData.extraSkills);
  add('PIILOTETUT VAHVUUDET', cvData.hiddenStrengths);
  if (cvData.hiddenQ1 || cvData.hiddenQ2 || cvData.hiddenQ3) {
    add('PIILOTETUT VASTAUKSET', 'Apua: ' + (cvData.hiddenQ1||'') + '\nHelppoa: ' + (cvData.hiddenQ2||'') + '\nHarrastukset: ' + (cvData.hiddenQ3||''));
  }
  add('KEHITYSKOHTEET', cvData.gapAnalysis);
  add('CV-POIMINNAT', cvData.cvExtract);
  if (cvData.jobs) {
    var jp = [];
    for (var n = 1; n <= 5; n++) {
      var j = cvData.jobs[n];
      if (j && (j.posting || j.analysis)) jp.push('TYÖ ' + n + ': ' + (j.company||'') + ' — ' + (j.title||'') + '\n' + (j.analysis || j.posting));
    }
    if (jp.length) add('TYÖPAIKKA-ANALYYSIT', jp.join('\n\n'));
  }
  add('DEEP SEARCH', cvData.deepSearchResults);
  return lines.join('\n\n');
}
function refreshDataReadiness() {
  var el = document.getElementById('dataReadinessList');
  if (!el) return;
  var items = [
    { ok: !!cvData.name, label: 'Nimi' },
    { ok: !!cvData.targetRole, label: 'Tavoiterooli' },
    { ok: !!cvData.careerSummary || chatHistory.filter(function(m){return m.role==='user';}).length >= 3, label: 'Urahistoria' },
    { ok: !!cvData.skills, label: 'Taidot' },
    { ok: !!(cvData.jobs && cvData.jobs[1] && cvData.jobs[1].posting), label: 'Työ 1 ilmoitus' },
    { ok: !!cvData.cvExtract, label: 'CV analysoitu (vapaaeht.)' }
  ];
  el.innerHTML = items.map(function(it) { return '<motion style="padding:.2rem 0;">' + (it.ok ? '✅' : '○') + ' ' + it.label + '</div>'; }).join('');
  el.innerHTML = el.innerHTML.replace(/<motion /g, '<div ');
}
function selectPortfolioTheme(theme) {
  saveCvField('portfolioTheme', theme);
  document.querySelectorAll('.theme-btn').forEach(function(b) {
    var on = b.getAttribute('data-theme') === theme;
    b.style.borderColor = on ? 'var(--accent)' : '';
    b.style.color = on ? 'var(--accent)' : '';
  });
}
async function extractCvUpload() {
  var raw = ((document.getElementById('cvUploadText')||{}).value||'').trim();
  if (!raw) { alert('Liitä CV:n teksti.'); return; }
  saveCvField('cvUploadRaw', raw);
  var result = document.getElementById('cvExtractResult'), txt = document.getElementById('cvExtractText');
  txt.innerHTML = '<span class="loading-dots"><span></span><span></span><span></span></span>';
  result.style.display = 'block';
  try {
    var extracted = await window.aiClaude(
      'Poimi CV-tekstistä profiili SUOMEKSI. Älä keksi. Palauta: YHTEENVETO, TYÖKOKEMUS, TAIDOT, KOULUTUS, VAHVUUDET, ATS-AVAINSANAT.',
      raw.slice(0, 12000), 2500);
    txt.textContent = extracted;
    saveCvField('cvExtract', extracted);
    refreshDataReadiness();
  } catch (e) { txt.textContent = (e && e.message) || 'Yhteysvirhe.'; }
}
async function generateLovablePrompt() {
  var btn = document.querySelector('[onclick="generateLovablePrompt()"]');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Generoidaan...'; }
  refreshDataReadiness();
  var bundle = buildStudentProfileBundle();
  if (!bundle.trim()) { alert('Täytä perustiedot ja tee haastattelu.'); if (btn){btn.disabled=false;btn.textContent='✦ Generoi Lovable-prompt (Claude)';} return; }
  var theme = cvData.portfolioTheme || 'dark-gold';
  var tagline = (document.getElementById('portfolioTagline')||{}).value || cvData.portfolioTagline || '';
  try {
    var prompt = await window.aiClaude(
      'Write ONE paste-ready English Lovable.dev prompt for a premium executive personal portfolio. Include: hero, animated skill bars, experience timeline, scroll animations, floating AI chatbot (4 Finnish starter questions, answers only from page content), contact, theme ' + theme + '. Use ONLY candidate facts.',
      'DATA:\n' + bundle + (tagline ? '\nTagline: ' + tagline : ''),
      4000);
    saveCvField('lovablePrompt', prompt);
    document.getElementById('lovablePromptText').textContent = prompt;
    document.getElementById('lovablePromptCard').style.display = 'block';
  } catch (e) { alert((e && e.message) || 'Virhe.'); }
  if (btn) { btn.disabled = false; btn.textContent = '✦ Generoi Lovable-prompt (Claude)'; }
}
function copyLovablePrompt() {
  var t = cvData.lovablePrompt || (document.getElementById('lovablePromptText')||{}).textContent;
  if (t) navigator.clipboard.writeText(t).then(function(){ alert('Kopioitu!'); });
}
(function(){
  var fi = document.getElementById('cvUploadFile');
  if (fi) fi.addEventListener('change', function(e) {
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    var r = new FileReader();
    r.onload = function(ev) { var ta = document.getElementById('cvUploadText'); if (ta) { ta.value = ev.target.result; saveCvField('cvUploadRaw', ta.value); } };
    r.readAsText(f);
  });
})();

'''
js_bundle = js_bundle.replace('<motion ', '<motion ').replace("return '<motion style", "return '<motion style")
js_bundle = js_bundle.replace("return '<motion style", "return '<div style").replace("el.innerHTML.replace(/<motion /g, '<motion ');", "};")

text = text.replace('/* ── CAREER INTERVIEW ────────────────────────── */', js_bundle + '/* ── CAREER INTERVIEW ────────────────────────── */', 1)

text = text.replace(
    "var fields = {cvName:'name',cvCity:'city',cvTarget:'targetRole',cvEducation:'education'",
    "var fields = {cvName:'name',cvCity:'city',cvEmail:'email',cvPhone:'phone',cvLinkedin:'linkedin',cvTarget:'targetRole',cvEducation:'education',cvUploadText:'cvUploadRaw',portfolioTagline:'portfolioTagline'",
    1,
)

text = text.replace(
    "    prompt += 'Sähköposti: [TÄYDENNÄ — käyttäjä lisää itse]\\n';\n    prompt += 'Puhelin: [TÄYDENNÄ — käyttäjä lisää itse]\\n';",
    "    prompt += 'Sähköposti: ' + (cvData.email || '[TÄYDENNÄ]') + '\\n';\n    prompt += 'Puhelin: ' + (cvData.phone || '[TÄYDENNÄ]') + '\\n';\n    prompt += 'LinkedIn: ' + (cvData.linkedin || '') + '\\n';",
    1,
)

text = text.replace(
    "    if (cvData.hiddenStrengths) prompt += '\\n=== PIILOTETUT VAHVUUDET ===\\n' + cvData.hiddenStrengths + '\\n';",
    "    if (cvData.hiddenStrengths) prompt += '\\n=== PIILOTETUT VAHVUUDET ===\\n' + cvData.hiddenStrengths + '\\n';\n    if (cvData.cvExtract) prompt += '\\n=== CV:STÄ POIMITUT ===\\n' + cvData.cvExtract + '\\n';",
    1,
)

text = text.replace(
    "    var cv = await window.aiChat('Olet ammattimainen CV-kirjoittaja. Noudata kaikkia annettuja ohjeita tarkasti.', cvData.masterPrompt, 2000);",
    """    var bundle = buildStudentProfileBundle();
    var cv = await window.aiClaude(
      'Kirjoita valmis ATS-yhteensopiva CV suomeksi. Toimintaverbit, numerot, standardi otsikot, max 2 sivua, ei taulukoita. Käytä vain dataa. Noudata myös: ' + cvData.masterPrompt.slice(0, 500),
      'PROFIILI:\\n' + bundle,
      3500);""",
    1,
)

text = text.replace(
    "  restoreChatUI();\n  _loadFromServer();",
    """  restoreChatUI();
  refreshDataReadiness();
  if (cvData.portfolioTheme) selectPortfolioTheme(cvData.portfolioTheme);
  if (cvData.lovablePrompt) {
    var lp = document.getElementById('lovablePromptText'), lc = document.getElementById('lovablePromptCard');
    if (lp && lc) { lp.textContent = cvData.lovablePrompt; lc.style.display = 'block'; }
  }
  _loadFromServer();""",
    1,
)

text = text.replace('◆ 12 askelta', '◆ 13 askelta')
text = text.replace('◆ CV + saatekirje + 5 hakemusta', '◆ CV + portfolio + 5 hakemusta')

path.write_text(text, encoding="utf-8")
print("OK")
