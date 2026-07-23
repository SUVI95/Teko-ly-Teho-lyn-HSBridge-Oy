#!/usr/bin/env node
/**
 * Lightweight Finnish copy check for HTML modules.
 *
 * Usage:
 *   node scripts/check-finnish-voikko.mjs moduuli-ai-laatulaboratorio.html
 *
 * Voikko deliberately reports product names and new compounds it does not know.
 * This script prints those findings for human review; --strict makes findings fail CI.
 */
import fs from 'node:fs';
import path from 'node:path';
import { Voikko } from '@yongsk0066/voikko';

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const files = args.filter((arg) => arg !== '--strict');

if (!files.length) {
  console.error('Anna tarkistettava HTML-tiedosto.');
  process.exit(2);
}

const allow = new Set([
  'ai', 'api', 'claude', 'c2pa', 'duunijobs', 'html', 'json', 'openai', 'presence',
  'tomi', 'voikko', 'wcag', 'zoom', 'chatgpt', 'video', 'moduuli', 'laatutestaus',
  'laatutestaaja', 'laaturaportti', 'reunatapaus', 'reunatapaukset', 'regressio',
  'regressiotesti', 'regressiotestit', 'julkaisupäätös', 'julkaisupäätöksen',
  'laatumittari', 'laatumittarit', 'tekoäly', 'tekoälyn', 'tekoälyä', 'tekoälylle',
  'tekoälytuote', 'tekoälytuotteen', 'tekoälyjärjestelmä', 'tekoälyjärjestelmän',
  'selkokieli', 'selkokielinen', 'selkokielisyys', 'ruudunlukija', 'ruudunlukijalla',
  'min', 'ai-laatulaboratorio', 'julkaisubriiffi', 'arviointirubriikki',
  'sokkoutettu', 'sokkoutus', 'claudea', 'clauden', 'realtime', 'realtimea', 'realtimen',
  'haastokysymyksen', 'haastoon',
  'offline-haastetta', 'provenienssin', 'welo', 'content', 'credentials',
  'digital', 'evaluator', 'quality', 'safety', 'specialist', 'trust',
  'ai-keskustelustudio', 'keskustelustudio', 'botin', 'botilla', 'chatbot',
  'chatbotin', 'heygen', 'heygenin', 'heygen-video', 'heygen-videostudio', 'elevenlabs',
  'elevenlabs-agentti', 'elevenlabs-agenttien', 'agents', 'poe-botti',
  'typebot', 'typebotin', 'typeboteja', 'typebot-solmukartta', 'typebot-kartta',
  'adobe', 'firefly', 'api-krediittejä', 'avatar', 'avatarin', 'b-roll',
  'avatarit', 'b-rollin', 'webhook', 'webhookeja', 'heygen-tuotantosuunnitelma',
  // Rivon-viikko module
  'rivon', 'rivonin', 'rivonilta', 'kajaani', 'kajaanissa', 'kajaaniin', 'kajaanin',
  'ovaskainen', 'kemppainen', 'freelancer', 'freelance', 'isännöitsijä',
  'hankintapäällikkö', 'hankintapäällikön', 'kaupunkipyöräpalvelu', 'kaupunkipyörä',
  'kaupunkipyörät', 'kulkuri', 'kulkuria', 'kulkurit', 'pilotti', 'pilottiin', 'pilotin',
  'tinkijä', 'tinkiminen', 'tinkimistaktiikka', 'tinkimistaktiikkaa', 'toimintakehotus',
  'kertojaääni', 'aistudio', 'veo', 'capcut', 'kling', 'hailuo', 'mp3', 'tori',
  'lanseerausmainos', 'koeajo', 'toimeksianto', 'realtimea', 'foneettisesti',
  'realtime-konfiguraatio', 'lukot', 'anonymisoidulla', 'vertikaali',
  'video-prompti', 'videoprompti', 'videoklipit', 'vuotiaat',
  'warm', 'woman', 'calm', 'natural', 'voice', 'design', 'text', 'speech',
  // Automaatio-arc
  'n8n', 'workflow', 'liipaisin', 'liipaisin-solmu', 'solmu', 'solmua', 'solmuina',
  'automaatiokonsultti', 'huoltopyyntö', 'huoltopyynnöt', 'huoltopyyntöjen',
  'reklamaatio', 'reklamaatioita', 'sheets', 'sheetiin', 'kuittaa', 'kuittauksen',
  'suvi', 'duunijobs', 'mailto', 'execute', 'rutiinia', 'arvostelukyky',
  'trigger', 'manual', 'form', 'edit', 'fields', 'set',
  'canva', 'poe', 'chatbase', 'asiakasbotti', 'asiakasbotin', 'asiakasbotille',
  'koontilistaan', 'asiakaspalvelubotti', 'text', 'video',
  'prompti', 'promptin', 'promptia', 'promptissa', 'promptisi', 'promptiisi',
  'promptaa', 'promptaat', 'promptaan', 'promptaus', 'promptausharjoitus',
  'promptivalmennus', 'videomainoksen', 'videomainos',
  'chatgpt', 'kuvaprompti', 'kuvapromptin', 'kuvapromptia', 'kuvapromptisi',
  'liikeprompti', 'liikepromptin', 'liikepromptia', 'liikepromptisi',
  'kuva-video', 'kuva-videoksi', 'kuva-videon', 'kuvageneraatio',
  'still-kuva', 'still-kuvan',
]);

function visibleText(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ')
    .replace(/https?:\/\/[^\s"'<>]+/gi, ' ')
    .replace(/<\/(?:p|h[1-6]|li|div|section|article|header|footer|span|button|a|label|option)>/gi, '\n')
    .replace(/<(?:span|button|a|label|option)\b[^>]*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function words(text) {
  return text.match(/[A-Za-zÅÄÖåäöŠšŽž][A-Za-zÅÄÖåäöŠšŽž-]{2,}/g) || [];
}

const voikko = await Voikko.init();
voikko.setAcceptTitlesInGc(true);
voikko.setAcceptUnfinishedParagraphsInGc(true);
voikko.setAcceptBulletedListsInGc(true);
let totalFindings = 0;

try {
  for (const input of files) {
    const file = path.resolve(input);
    const html = fs.readFileSync(file, 'utf8');
    const text = visibleText(html);
    const counts = new Map();

    for (const original of words(text)) {
      const word = original.replace(/^-+|-+$/g, '');
      const lower = word.toLocaleLowerCase('fi-FI');
      if (
        word.length < 3 ||
        allow.has(lower) ||
        /^[A-ZÅÄÖ0-9-]{2,}$/.test(word) ||
        /\d/.test(word) ||
        voikko.spell(word) ||
        voikko.spell(lower)
      ) {
        continue;
      }
      counts.set(lower, (counts.get(lower) || 0) + 1);
    }

    const findings = [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fi'))
      .map(([word, count]) => ({
        word,
        count,
        suggestions: voikko.suggest(word).slice(0, 4),
      }));

    totalFindings += findings.length;
    console.log(`\n${path.relative(process.cwd(), file)}: ${findings.length} tarkistettavaa sanaa`);
    findings.forEach((finding) => {
      const suggestions = finding.suggestions.length
        ? ` -> ${finding.suggestions.join(', ')}`
        : '';
      console.log(`  ${finding.word} (${finding.count})${suggestions}`);
    });

    const allGrammar = voikko.grammarErrors(text);
    const grammar = allGrammar.slice(0, 12);
    console.log(`  Kielioppihavaintoja: ${allGrammar.length}`);
    grammar.forEach((error) => {
      const start = Math.max(0, error.startPos - 28);
      const end = Math.min(text.length, error.startPos + error.errorLen + 28);
      const context = text.slice(start, end).replace(/\s+/g, ' ').trim();
      const suggestions = error.suggestions.length
        ? ` -> ${error.suggestions.slice(0, 3).join(', ')}`
        : '';
      console.log(`    ${error.shortDescription}: “…${context}…”${suggestions}`);
    });
  }
} finally {
  voikko.terminate();
}

if (strict && totalFindings) process.exit(1);
