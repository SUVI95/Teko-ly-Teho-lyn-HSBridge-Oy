/**
 * Personal gift modules (Sonja, Satu, …).
 * Email allowlist + first-name fallback when registration email differs.
 * Override via SONJA_GIFT_EMAIL / SATU_GIFT_EMAIL / SOILE_GIFT_EMAIL / VILLE_GIFT_EMAIL (comma-separated).
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
  ville: {
    moduleId: 'ville-ai-opas-2025',
    firstName: 'ville',
    emails: parseEmailList(process.env.VILLE_GIFT_EMAIL, ['ville.koponen134@gmail.com'])
  }
};

const MODULE_TO_GIFT_KEY = Object.fromEntries(
  Object.entries(GIFTS).map(([key, g]) => [g.moduleId, key])
);

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
