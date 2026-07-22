/**
 * AI chat helper - works with any deployment path.
 * Detects base path from current URL (e.g. /teko-ly) for subpath deployments.
 * Claude-first via /api/ai/claude (optional smart:true → Opus / Fable cascade).
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
  // Keep a stable reference for Claude -> OpenAI fallback.
  // Some modules intentionally remap window.aiChat after this file loads.
  // Without this, fallback may recurse back into Claude instead of OpenAI.
  var openAiFallbackChat = window.aiChat;

  function getClaudeUrl() {
    var origin = window.location.origin || '';
    var pathname = window.location.pathname || '';
    var base = '';
    var idx = pathname.indexOf('/module/');
    if (idx > 0) base = pathname.substring(0, idx);
    return origin + base + '/api/ai/claude';
  }

  /**
   * @param {string} systemPrompt
   * @param {string} userMessage
   * @param {number} [maxTokens]
   * @param {{ smart?: boolean, model?: string }|boolean} [opts] — pass true or {smart:true} for smartest Claude
   */
  window.aiClaude = async function(systemPrompt, userMessage, maxTokens, opts) {
    var options = opts;
    if (options === true) options = { smart: true };
    if (!options || typeof options !== 'object') options = {};
    try {
      var url = getClaudeUrl();
      var body = {
        max_tokens: maxTokens || 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }]
      };
      if (options.smart) body.smart = true;
      if (options.model) body.model = options.model;
      var res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      });

      var data = {};
      try { data = await res.json(); } catch (e) {}

      if (!res.ok) {
        throw new Error(data.error || data.message || 'Virhe ' + res.status);
      }

      return data.text || data.reply || '';
    } catch (err) {
      console.warn('DuuniJobs AI failed, falling back to OpenAI:', err.message);
      return openAiFallbackChat(systemPrompt, userMessage, maxTokens || 2000);
    }
  };
  window.duunijobsAI = window.aiClaude;
  /** Convenience: always prefer the smartest Claude available on the server. */
  window.aiClaudeSmart = function(systemPrompt, userMessage, maxTokens) {
    return window.aiClaude(systemPrompt, userMessage, maxTokens, { smart: true });
  };
})();
