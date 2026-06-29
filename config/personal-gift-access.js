/**
 * Personal gift modules (Sonja, Satu, …).
 * Email allowlist + first-name fallback when registration email differs.
 * Override via SONJA_GIFT_EMAIL / SATU_GIFT_EMAIL / SOILE_GIFT_EMAIL / VILLE_GIFT_EMAIL / MINNA_GIFT_EMAIL / SANTERI_GIFT_EMAIL (comma-separated).
 */
function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeName(name) {
  return String(name || '').trim().toLowerCase();
}

function parseEmailList(envRaw, defaults) {
  const fromEnv = String(envRaw || '')
    .split(',')
    .map(normalizeEmail)
    .filter(Boolean);
  const merged = [...fromEnv, ...defaults.map(normalizeEmail)];
  return [...new Set(merged)];
}

function nameMatchesFirstName(name, firstName) {
  const n = normalizeName(name);
  const first = normalizeName(firstName);
  if (!n || !first) return false;
  if (n === first) return true;
  if (n.startsWith(first + ' ')) return true;
  const parts = n.split(/\s+/).filter(Boolean);
  return parts[0] === first;
}

const GIFTS = {
  sonja: {
    moduleId: 'sonja-ai-opas-2025',
    firstName: 'sonja',
    emails: parseEmailList(process.env.SONJA_GIFT_EMAIL, ['sonja.karkkainen@outlook.com'])
  },
  satu: {
    moduleId: 'satu-ai-opas-2025',
    firstName: 'satu',
    emails: parseEmailList(process.env.SATU_GIFT_EMAIL, ['satukvoutilainen@gmail.com'])
  },
  soile: {
    moduleId: 'soile-ai-opas-2025',
    firstName: 'soile',
    emails: parseEmailList(process.env.SOILE_GIFT_EMAIL, ['soile.k.niskanen@gmail.com'])
  },
  minna_a: {
    moduleId: 'moduuli-minna-a',
    firstName: 'minna',
    emails: parseEmailList(process.env.MINNA_GIFT_EMAIL, ['minna1.tilles@gmail.com'])
  },
  minna_b: {
    moduleId: 'moduuli-minna-b',
    firstName: 'minna',
    emails: parseEmailList(process.env.MINNA_GIFT_EMAIL, ['minna1.tilles@gmail.com'])
  },
  santeri_m1: {
    moduleId: 'santeri-m1-rakenna',
    firstName: 'santeri',
    emails: parseEmailList(process.env.SANTERI_GIFT_EMAIL, ['santeri.kekarainen@gmail.com'])
  },
  santeri_m2: {
    moduleId: 'santeri-m2-tutki',
    firstName: 'santeri',
    emails: parseEmailList(process.env.SANTERI_GIFT_EMAIL, ['santeri.kekarainen@gmail.com'])
  },
  santeri_m3: {
    moduleId: 'santeri-m3-video',
    firstName: 'santeri',
    emails: parseEmailList(process.env.SANTERI_GIFT_EMAIL, ['santeri.kekarainen@gmail.com'])
  },
  santeri_interview: {
    moduleId: 'santeri-ai-haastattelu',
    firstName: 'santeri',
    emails: parseEmailList(process.env.SANTERI_GIFT_EMAIL, ['santeri.kekarainen@gmail.com'])
  },
  ville: {
    moduleId: 'ville-ai-opas-2025',
    firstName: 'ville',
    emails: parseEmailList(process.env.VILLE_GIFT_EMAIL, ['ville.koponen134@gmail.com'])
  },
  anne: {
    moduleId: 'moduuli-anne-tyonhaku-2026',
    firstName: 'anne',
    emails: parseEmailList(process.env.ANNE_GIFT_EMAIL, ['anne.must2@gmail.com'])
  },
  karpo: {
    moduleId: 'moduuli-karpo-tutkimus-2026',
    firstName: 'karpo',
    emails: parseEmailList(process.env.KARPO_GIFT_EMAIL, ['karpo.arenmaa3@gmail.com'])
  },
  jani: {
    moduleId: 'moduuli-jani-tutkimus-kirjoitus-2026',
    firstName: 'jani',
    emails: parseEmailList(process.env.JANI_GIFT_EMAIL, ['j.h.ruotsalainen@gmail.com'])
  }
};

function giftModuleIds(gift) {
  if (!gift) return [];
  if (Array.isArray(gift.moduleIds) && gift.moduleIds.length) return gift.moduleIds;
  if (gift.moduleId) return [gift.moduleId];
  return [];
}

const MODULE_TO_GIFT_KEY = {};
Object.entries(GIFTS).forEach(([key, gift]) => {
  giftModuleIds(gift).forEach((moduleId) => {
    MODULE_TO_GIFT_KEY[moduleId] = key;
  });
});

function getGiftKeyForModuleId(moduleId) {
  return MODULE_TO_GIFT_KEY[moduleId] || null;
}

function isPersonalGiftModuleId(moduleId) {
  return !!getGiftKeyForModuleId(moduleId);
}

function isGiftRecipient(giftKey, user) {
  const gift = GIFTS[giftKey];
  if (!gift || !user) return false;
  const email = normalizeEmail(user.email);
  if (email && gift.emails.includes(email)) return true;
  if (nameMatchesFirstName(user.name, gift.firstName)) return true;
  return false;
}

function isSonjaGiftRecipient(user) {
  return isGiftRecipient('sonja', user);
}

function isSatuGiftRecipient(user) {
  return isGiftRecipient('satu', user);
}

function isSoileGiftRecipient(user) {
  return isGiftRecipient('soile', user);
}

function isVilleGiftRecipient(user) {
  return isGiftRecipient('ville', user);
}

const SONJA_GIFT_MODULE_ID = GIFTS.sonja.moduleId;
const SATU_GIFT_MODULE_ID = GIFTS.satu.moduleId;
const SOILE_GIFT_MODULE_ID = GIFTS.soile.moduleId;
const VILLE_GIFT_MODULE_ID = GIFTS.ville.moduleId;

/** @deprecated use isSonjaGiftRecipient({ email, name }) */
function isSonjaGiftEmail(email) {
  return isGiftRecipient('sonja', { email, name: null });
}

module.exports = {
  GIFTS,
  normalizeEmail,
  normalizeName,
  nameMatchesFirstName,
  getGiftKeyForModuleId,
  isPersonalGiftModuleId,
  isGiftRecipient,
  isSonjaGiftRecipient,
  isSatuGiftRecipient,
  isSoileGiftRecipient,
  isVilleGiftRecipient,
  isSonjaGiftEmail,
  SONJA_GIFT_MODULE_ID,
  SATU_GIFT_MODULE_ID,
  SOILE_GIFT_MODULE_ID,
  VILLE_GIFT_MODULE_ID
};
