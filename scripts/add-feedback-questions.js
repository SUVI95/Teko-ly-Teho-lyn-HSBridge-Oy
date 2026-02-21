const fs = require('fs');
const path = require('path');

const modules = [
  { file: 'moduuli1-tietosuoja.html', id: 'm1_reflection' },
  { file: 'moduuli2-tekoaly-uhka-vai-mahdollisuus.html', id: 'm2_reflection' },
  { file: 'moduuli3-master-prompt.html', id: 'm3_reflection' },
  { file: 'moduuli4-prompt-tyonhakijalle.html', id: 'm4_reflection' },
  { file: 'moduuli5-ai-myynnissa-ja-markkinoinnissa.html', id: 'm5_reflection' },
  { file: 'moduuli6-ai-taloushallinnossa.html', id: 'm6_reflection' },
  { file: 'moduuli7-ai-tyonhaussa.html', id: 'm7_reflection' },
  { file: 'moduuli8-ai-haastattelussa.html', id: 'm8_reflection' },
  { file: 'moduuli9-ai-oppimisessa.html', id: 'm9_reflection' },
  { file: 'moduuli10-ai-tyonhakutyokalut.html', id: 'm10_reflection' },
  { file: 'moduuli11-ai-etikka.html', id: 'm11_reflection' },
  { file: 'moduuli12-capstone.html', id: 'm12_reflection' },
  { file: 'moduuli-hoitoala.html', id: 'm_hoitoala_reflection' },
  { file: 'moduuli-rakennusala.html', id: 'm_rakennus_reflection' },
  { file: 'moduuli-markkinointi.html', id: 'm_markkinointi_reflection' },
  { file: 'moduuli-ravintola.html', id: 'm_ravintola_reflection' },
  { file: 'moduuli-logistiikka.html', id: 'm_logistiikka_reflection' },
  { file: 'moduuli-it.html', id: 'm_it_reflection' }
];

const rootDir = path.join(__dirname, '..');

const feedbackHTML = `
    <div class="reflection-box" style="margin-top:3rem;background:rgba(37,99,168,0.05);border-left:3px solid var(--accent2);padding:2rem;border-radius:12px;">
      <h3 style="font-size:1.2rem;margin-bottom:1rem;color:var(--ink);">Mitä opit tässä moduulissa?</h3>
      <p style="color:var(--muted);margin-bottom:1.5rem;font-size:0.95rem;">Kerro lyhyesti mitä opit tämän moduulin aikana.</p>
      <textarea class="reflection-textarea" id="whatLearned_{{MODULE_ID}}" placeholder="Esim: Opetin AI:lle Master Promptin ja käytän sitä nyt kaikissa hakemuksissani..."></textarea>
      <div class="reflection-actions">
        <button class="reflection-save" onclick="window.saveWhatLearned('{{MODULE_ID}}')">Tallenna</button>
      </div>
      <div class="reflection-confirm" id="whatLearnedConfirm_{{MODULE_ID}}" style="display:none;">✓ Tallennettu.</div>
    </div>
    
    <div class="reflection-box" style="margin-top:2rem;background:rgba(42,122,75,0.05);border-left:3px solid var(--accent3);padding:2rem;border-radius:12px;">
      <h3 style="font-size:1.2rem;margin-bottom:1rem;color:var(--ink);">Opitko jotain uutta?</h3>
      <p style="color:var(--muted);margin-bottom:1.5rem;font-size:0.95rem;">Kerro oliko tässä moduulissa jotain uutta sinulle vai oliko kaikki jo tuttu.</p>
      <textarea class="reflection-textarea" id="learnedNew_{{MODULE_ID}}" placeholder="Esim: En tiennyt että AI:ta voi käyttää näin monipuolisesti työnhaussa..."></textarea>
      <div class="reflection-actions">
        <button class="reflection-save" onclick="window.saveLearnedNew('{{MODULE_ID}}')">Tallenna</button>
      </div>
      <div class="reflection-confirm" id="learnedNewConfirm_{{MODULE_ID}}" style="display:none;">✓ Tallennettu.</div>
    </div>
`;

modules.forEach(({ file, id }) => {
  const modulePath = path.join(rootDir, file);
  
  if (!fs.existsSync(modulePath)) {
    console.log(`⚠️  File not found: ${file}`);
    return;
  }
  
  let content = fs.readFileSync(modulePath, 'utf8');
  
  // Check if feedback questions already exist
  if (content.includes('whatLearned_')) {
    console.log(`⏭️  Skipped: ${file} (already has feedback)`);
    return;
  }
  
  // Find reflection section end (look for reflection-confirm or reflection section closing)
  const reflectionPattern = /(<div class="reflection-confirm"[^>]*>.*?<\/div>\s*<\/div>\s*<\/div>\s*<\/section>)/s;
  const match = content.match(reflectionPattern);
  
  if (match) {
    // Insert feedback before closing tags
    const feedbackSection = feedbackHTML.replace(/\{\{MODULE_ID\}\}/g, id);
    content = content.replace(reflectionPattern, feedbackSection + '\n' + match[1]);
    
    // Add feedback.js script if not present
    if (!content.includes('/js/feedback.js')) {
      content = content.replace(/<script src="\/js\/reflections\.js"><\/script>/g, 
        '<script src="/js/reflections.js"></script>\n<script src="/js/feedback.js"></script>');
    }
    
    fs.writeFileSync(modulePath, content, 'utf8');
    console.log(`✅ Updated: ${file}`);
  } else {
    console.log(`⚠️  Could not find reflection section in: ${file}`);
  }
});

console.log('\n✨ Feedback questions added!');
