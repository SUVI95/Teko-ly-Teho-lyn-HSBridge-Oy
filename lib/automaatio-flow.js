/** Server-side flow rules for moduuli1-ai-automaatio challenges. */
const CHALLENGE_FLOWS = {
  email: { required: ['trigger', 'ai', 'email'], terminal: 'email' },
  report: { required: ['trigger', 'action', 'ai', 'output'], terminal: 'output' },
  triage: { required: ['trigger', 'action', 'filter', 'ai', 'output'], terminal: 'output' },
  research: { required: ['trigger', 'action', 'ai', 'email'], terminal: 'email' },
  reverse: { required: ['trigger', 'action', 'filter', 'ai', 'output'], terminal: 'output' },
  interpret: { required: ['trigger', 'action', 'filter', 'ai', 'output'], terminal: 'output' },
  longchain: { required: ['trigger', 'action', 'filter', 'ai', 'output', 'email'], terminal: 'email' },
  gap: { required: ['trigger', 'action', 'filter', 'ai', 'output'], terminal: 'output' },
  humanloop: { required: ['trigger', 'action', 'ai', 'approval', 'output'], terminal: 'output' },
  improve: { required: ['trigger', 'action', 'filter', 'ai', 'approval', 'email', 'imagegen', 'reminder'], terminal: 'reminder' },
  'm1b-alert': { required: ['trigger', 'email'], terminal: 'email' }
};

function normalizeFlow(flow) {
  if (!Array.isArray(flow)) return [];
  return flow
    .map((n) => ({
      type: String(n && n.type || '').trim(),
      connected: !!(n && n.connected)
    }))
    .filter((n) => n.type);
}

function validateAutomaatioFlow(challengeId, flowInput) {
  const rule = CHALLENGE_FLOWS[challengeId];
  if (!rule) return { ok: false, reason: 'unknown-challenge' };

  const flow = normalizeFlow(flowInput);
  const types = flow.map((n) => n.type);

  for (const req of rule.required) {
    if (!types.includes(req)) return { ok: false, reason: 'invalid-flow', detail: 'missing-' + req };
  }

  const extras = types.filter((t) => !rule.required.includes(t));
  if (extras.length > 0) {
    return { ok: false, reason: 'invalid-flow', detail: 'extra-node' };
  }

  const disconnected = flow.filter((n) => rule.required.includes(n.type) && !n.connected);
  if (disconnected.length > 0) {
    return { ok: false, reason: 'invalid-flow', detail: 'unconnected' };
  }

  const terminal = flow.find((n) => n.type === rule.terminal);
  if (!terminal || !terminal.connected) {
    return { ok: false, reason: 'invalid-flow', detail: 'bad-terminal' };
  }

  return { ok: true };
}

module.exports = { CHALLENGE_FLOWS, validateAutomaatioFlow };
