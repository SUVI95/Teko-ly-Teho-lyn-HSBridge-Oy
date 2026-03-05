/**
 * AI chat helper - works with any deployment path.
 * Detects base path from current URL (e.g. /teko-ly) for subpath deployments.
 */
(function() {
  function getApiUrl() {
    var origin = window.location.origin || '';
    var pathname = window.location.pathname || '';
    var base = '';
    var idx = pathname.indexOf('/module/');
    if (idx > 0) base = pathname.substring(0, idx);
    return origin + base + '/api/ai/chat';
  }

  window.aiChat = async function(systemPrompt, userMessage, maxTokens) {
    var url = getApiUrl();
    var res = await fetch(url, {
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

    var data = {};
    try { data = await res.json(); } catch (e) {}

    if (!res.ok) {
      var msg = data.error || data.message || 'Virhe ' + res.status;
      throw new Error(msg);
    }

    return data.text || data.reply || '';
  };
})();
