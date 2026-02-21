const fs = require('fs');
const path = require('path');

// List of all module files
const modules = [
  'moduuli1-tietosuoja.html',
  'moduuli2-tekoaly-uhka-vai-mahdollisuus.html',
  'moduuli3-master-prompt.html',
  'moduuli4-prompt-tyonhakijalle.html',
  'moduuli5-ai-myynnissa-ja-markkinoinnissa.html',
  'moduuli6-ai-taloushallinnossa.html',
  'moduuli8-ai-haastattelussa.html',
  'moduuli9-ai-oppimisessa.html',
  'moduuli11-ai-etikka.html',
  'moduuli12-capstone.html',
  'moduuli-hoitoala.html',
  'moduuli-rakennusala.html',
  'moduuli-markkinointi.html',
  'moduuli-ravintola.html',
  'moduuli-logistiikka.html',
  'moduuli-it.html'
];

// Module ID mapping (for reflection storage)
const moduleIds = {
  'moduuli1-tietosuoja.html': 'm1_reflection',
  'moduuli2-tekoaly-uhka-vai-mahdollisuus.html': 'm2_reflection',
  'moduuli3-master-prompt.html': 'm3_reflection',
  'moduuli4-prompt-tyonhakijalle.html': 'm4_reflection',
  'moduuli5-ai-myynnissa-ja-markkinoinnissa.html': 'm5_reflection',
  'moduuli6-ai-taloushallinnossa.html': 'm6_reflection',
  'moduuli8-ai-haastattelussa.html': 'm8_reflection',
  'moduuli9-ai-oppimisessa.html': 'm9_reflection',
  'moduuli11-ai-etikka.html': 'm11_reflection',
  'moduuli12-capstone.html': 'm12_reflection',
  'moduuli-hoitoala.html': 'm_hoitoala_reflection',
  'moduuli-rakennusala.html': 'm_rakennus_reflection',
  'moduuli-markkinointi.html': 'm_markkinointi_reflection',
  'moduuli-ravintola.html': 'm_ravintola_reflection',
  'moduuli-logistiikka.html': 'm_logistiikka_reflection',
  'moduuli-it.html': 'm_it_reflection'
};

const publicDir = path.join(__dirname, '..', 'public');
const rootDir = path.join(__dirname, '..');

modules.forEach(moduleFile => {
  const modulePath = path.join(rootDir, moduleFile);
  const moduleId = moduleIds[moduleFile];
  
  if (!fs.existsSync(modulePath)) {
    console.log(`⚠️  File not found: ${moduleFile}`);
    return;
  }
  
  let content = fs.readFileSync(modulePath, 'utf8');
  let updated = false;
  
  // 1. Add script tag if not present
  if (!content.includes('/js/reflections.js')) {
    content = content.replace(/<script>/g, '<script src="/js/reflections.js"></script>\n<script>');
    updated = true;
  }
  
  // 2. Update saveReflection function
  const saveReflectionPattern = /function\s+saveReflection\s*\(\)\s*\{[^}]*localStorage\.setItem\([^}]*\}/g;
  if (saveReflectionPattern.test(content) && moduleId) {
    content = content.replace(
      /function\s+saveReflection\s*\(\)\s*\{[^}]*localStorage\.setItem\([^}]*\}/g,
      `function saveReflection() {\n  window.saveReflectionToAPI('${moduleId}');\n}`
    );
    updated = true;
  }
  
  // 3. Update load reflection (localStorage.getItem pattern)
  const loadPattern = new RegExp(`try\\{[^}]*localStorage\\.getItem\\('${moduleId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'\\\)[^}]*\\}catch\\(e\\)\\{[^}]*\\}`, 'g');
  if (loadPattern.test(content) && moduleId) {
    content = content.replace(
      loadPattern,
      `// Load reflection on page load\ndocument.addEventListener('DOMContentLoaded', () => {\n  if (window.loadReflection) {\n    window.loadReflection('${moduleId}');\n  } else {\n    // Fallback to localStorage\n    try{const s=localStorage.getItem('${moduleId}');if(s)document.getElementById('reflectionText').value=s;}catch(e){}\n  }\n});`
    );
    updated = true;
  }
  
  if (updated) {
    fs.writeFileSync(modulePath, content, 'utf8');
    console.log(`✅ Updated: ${moduleFile}`);
  } else {
    console.log(`⏭️  Skipped: ${moduleFile} (already updated or no reflection found)`);
  }
});

console.log('\n✨ Update complete!');
