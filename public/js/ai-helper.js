/**
 * Shared AI chat helper with proper error handling.
 * Use window.aiChat(systemPrompt, userMessage, maxTokens) in modules.
 */
(function() {
  const API_BASE = window.location.origin;

  window.aiChat = async function(systemPrompt, userMessage, maxTokens) {
    const url = API_BASE + '/api/ai/chat';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: maxTokens || 600,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }]
      })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = data.error || data.message || `Virhe ${res.status}`;
      if (res.status === 500 && (msg.includes('not configured') || msg.includes('API key'))) {
        throw new Error('AI-palvelu ei ole käytettävissä. Ota yhteyttä opettajaan.');
      }
      throw new Error(msg);
    }

    return data.text || data.reply || '';
  };
})();
