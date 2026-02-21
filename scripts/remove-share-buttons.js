const fs = require('fs');
const path = require('path');

const modules = [
  'moduuli1-tietosuoja.html',
  'moduuli2-tekoaly-uhka-vai-mahdollisuus.html',
  'moduuli3-master-prompt.html',
  'moduuli4-prompt-tyonhakijalle.html',
  'moduuli5-ai-myynnissa-ja-markkinoinnissa.html',
  'moduuli6-ai-taloushallinnossa.html',
  'moduuli7-ai-tyonhaussa.html',
  'moduuli8-ai-haastattelussa.html',
  'moduuli9-ai-oppimisessa.html',
  'moduuli10-ai-tyonhakutyokalut.html',
  'moduuli11-ai-etikka.html',
  'moduuli12-capstone.html',
  'moduuli-hoitoala.html',
  'moduuli-rakennusala.html',
  'moduuli-markkinointi.html',
  'moduuli-ravintola.html',
  'moduuli-logistiikka.html',
  'moduuli-it.html'
];

const rootDir = path.join(__dirname, '..');

modules.forEach(moduleFile => {
  const modulePath = path.join(rootDir, moduleFile);
  
  if (!fs.existsSync(modulePath)) {
    console.log(`⚠️  File not found: ${moduleFile}`);
    return;
  }
  
  let content = fs.readFileSync(modulePath, 'utf8');
  let updated = false;
  
  // Remove share button HTML
  const shareButtonPattern = /<button[^>]*class="[^"]*reflection-share[^"]*"[^>]*>.*?Jaa Teams-chattiin.*?<\/button>/g;
  if (shareButtonPattern.test(content)) {
    content = content.replace(shareButtonPattern, '');
    updated = true;
  }
  
  // Remove shareReflection function
  const shareReflectionPattern = /function\s+shareReflection\s*\(\)\s*\{[^}]*navigator\.clipboard[^}]*\}/gs;
  if (shareReflectionPattern.test(content)) {
    content = content.replace(shareReflectionPattern, '');
    updated = true;
  }
  
  // Remove shareClosingAction function
  const shareClosingPattern = /function\s+shareClosingAction\s*\(\)\s*\{[^}]*navigator\.clipboard[^}]*\}/gs;
  if (shareClosingPattern.test(content)) {
    content = content.replace(shareClosingPattern, '');
    updated = true;
  }
  
  // Remove any remaining onclick="shareReflection()" or onclick="shareClosingAction()"
  content = content.replace(/onclick="shareReflection\(\)"/g, '');
  content = content.replace(/onclick="shareClosingAction\(\)"/g, '');
  
  if (updated || content.includes('shareReflection') || content.includes('shareClosingAction')) {
    fs.writeFileSync(modulePath, content, 'utf8');
    console.log(`✅ Updated: ${moduleFile}`);
  } else {
    console.log(`⏭️  Skipped: ${moduleFile}`);
  }
});

console.log('\n✨ Removal complete!');
