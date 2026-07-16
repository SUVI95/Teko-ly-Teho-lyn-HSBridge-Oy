/**
 * Shared resilience layer for the OpenAI Realtime voice-call modules.
 *
 * Two jobs, wired identically into every live call so students are never stuck:
 *
 *  1. TEXT FALLBACK — if the mic does not work (or the student prefers typing),
 *     they can write a message. It is sent to the model as a real user turn
 *     (conversation.item.create + response.create), the AI reads it and replies
 *     BY VOICE, and the typed line is shown in the transcript just like speech.
 *
 *  2. RESILIENT TRANSCRIPT — if the AI response breaks mid-turn, any half-written
 *     ("partial") transcript line would normally be dropped when the transcript
 *     is collected for review/saving. commitPartials() keeps that text so the
 *     transcript always comes through, even when the model errors out.
 *
 * Injected via <script src="/js/live-call-support.js">. Pure vanilla JS, no deps.
 */
(function (global) {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  var STYLE_ID = 'lcs-style';
  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var css =
      '.lcs-composer{display:none;gap:8px;align-items:flex-end;padding:10px 12px;border-top:1px solid var(--line,#e5e3de);background:var(--white,#fff);flex-wrap:wrap}' +
      '.lcs-composer.on{display:flex}' +
      '.lcs-composer .lcs-hint{flex:1 1 100%;font-size:12px;line-height:1.35;color:var(--ink3,#6b6b6b);margin:0 0 2px}' +
      '.lcs-composer textarea{flex:1 1 auto;min-width:0;resize:none;font:inherit;font-size:14px;line-height:1.4;padding:9px 11px;border:1px solid var(--line,#cfcdc8);border-radius:12px;background:#fff;color:var(--ink,#1c1b19);min-height:40px;max-height:120px}' +
      '.lcs-composer textarea:focus{outline:none;border-color:var(--purple,#6d4bd8);box-shadow:0 0 0 3px rgba(109,75,216,.15)}' +
      '.lcs-composer button.lcs-send{flex:0 0 auto;font:inherit;font-weight:700;font-size:14px;cursor:pointer;padding:10px 16px;border:0;border-radius:12px;background:var(--purple,#6d4bd8);color:#fff}' +
      '.lcs-composer button.lcs-send:disabled{opacity:.45;cursor:not-allowed}';
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = css;
    document.head.appendChild(st);
  }

  /**
   * Send a typed message as a user turn so the model reads it and replies by voice.
   * Returns true if it was sent over an open data channel.
   */
  function sendUserText(dc, text) {
    var t = String(text == null ? '' : text).trim();
    if (!t) return false;
    if (!dc || dc.readyState !== 'open') return false;
    try {
      dc.send(JSON.stringify({
        type: 'conversation.item.create',
        item: { type: 'message', role: 'user', content: [{ type: 'input_text', text: t }] }
      }));
      dc.send(JSON.stringify({ type: 'response.create' }));
      return true;
    } catch (_) {
      return false;
    }
  }

  /**
   * Create a "type instead of talk" composer and mount it inside a call panel.
   *
   * opts:
   *   panelEl   – element to append the composer to (usually the .call-tx-panel).
   *   name      – bot's display name, used in the hint text.
   *   onSend(t) – called with the trimmed text when the student submits.
   *
   * Returns { el, enable, disable, focus }.
   */
  function createComposer(opts) {
    opts = opts || {};
    ensureStyle();
    var name = opts.name || 'hän';

    var wrap = document.createElement('div');
    wrap.className = 'lcs-composer';

    var hint = document.createElement('p');
    hint.className = 'lcs-hint';
    hint.innerHTML = 'Mikrofoni ei toimi? <b>Kirjoita viestisi tähän</b> — ' + esc(name) +
      ' lukee sen ja vastaa ääneen. Viestisi näkyy myös puhelun tekstissä.';

    var ta = document.createElement('textarea');
    ta.rows = 1;
    ta.placeholder = 'Kirjoita ' + name + 'lle…';
    ta.setAttribute('aria-label', 'Kirjoita viesti ' + name + 'lle');

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lcs-send';
    btn.textContent = 'Lähetä';

    wrap.appendChild(hint);
    wrap.appendChild(ta);
    wrap.appendChild(btn);
    if (opts.panelEl) opts.panelEl.appendChild(wrap);

    function autosize() {
      ta.style.height = 'auto';
      ta.style.height = Math.min(120, ta.scrollHeight) + 'px';
    }

    function submit() {
      var text = String(ta.value || '').trim();
      if (!text) return;
      ta.value = '';
      autosize();
      try {
        if (typeof opts.onSend === 'function') opts.onSend(text);
      } catch (e) {
        if (global.console) console.error('LiveCallSupport composer onSend failed', e);
      }
    }

    ta.addEventListener('input', autosize);
    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
    });
    btn.addEventListener('click', submit);

    return {
      el: wrap,
      enable: function () { wrap.classList.add('on'); },
      disable: function () { wrap.classList.remove('on'); },
      focus: function () { try { ta.focus(); } catch (_) {} }
    };
  }

  /**
   * POST the WebRTC SDP offer to OpenAI's Realtime calls endpoint, retrying on
   * transient failures (429 rate limit / 5xx) with exponential backoff + jitter.
   * A whole class connecting at once can briefly exceed the account's Realtime
   * concurrency; a couple of retries lets most students through automatically.
   *
   * opts:
   *   url       – calls endpoint (defaults to the GA endpoint).
   *   token     – ephemeral client secret (Bearer).
   *   sdp       – local offer SDP (raw text).
   *   attempts  – total tries incl. the first (default 3).
   *   onRetry(n, status) – called before each retry with attempt no. + status.
   *
   * Returns the answer SDP text, or throws an Error (with .status) on failure.
   * NOTE: never sends a ?model= query param — the model is fixed when the
   * ephemeral token is minted, and ?model= makes the GA endpoint return 400.
   */
  function postRealtimeSdp(opts) {
    opts = opts || {};
    var url = opts.url || 'https://api.openai.com/v1/realtime/calls';
    var attempts = opts.attempts > 0 ? opts.attempts : 3;

    return (async function () {
      var lastStatus = 0;
      var lastBody = '';
      for (var i = 0; i < attempts; i++) {
        var res;
        try {
          res = await fetch(url, {
            method: 'POST',
            body: opts.sdp,
            headers: { 'Authorization': 'Bearer ' + opts.token, 'Content-Type': 'application/sdp' }
          });
        } catch (netErr) {
          lastStatus = 0;
          lastBody = (netErr && netErr.message) || 'verkkovirhe';
          if (i < attempts - 1) {
            if (typeof opts.onRetry === 'function') opts.onRetry(i + 1, 0);
            await new Promise(function (r) { setTimeout(r, 1000 * Math.pow(2, i) + Math.random() * 400); });
            continue;
          }
          break;
        }
        if (res.ok) return await res.text();
        lastStatus = res.status;
        try { lastBody = await res.text(); } catch (_) { lastBody = ''; }
        if ((res.status === 429 || res.status >= 500) && i < attempts - 1) {
          if (typeof opts.onRetry === 'function') opts.onRetry(i + 1, res.status);
          await new Promise(function (r) { setTimeout(r, 1200 * Math.pow(2, i) + Math.random() * 500); });
          continue;
        }
        break;
      }
      var msg = lastStatus === 429
        ? 'Juuri nyt on ruuhkaa (429). Odota hetki ja soita uudelleen.'
        : (lastStatus
            ? ('Ääniyhteys epäonnistui (' + lastStatus + '). ' + String(lastBody).slice(0, 160))
            : ('Ääniyhteys epäonnistui — ' + String(lastBody).slice(0, 160)));
      var err = new Error(msg);
      err.status = lastStatus;
      throw err;
    })();
  }

  /**
   * Keep any half-written transcript lines. Removes the "partial" marker so the
   * text is included when a transcript is collected — used on hang-up and when
   * the AI errors mid-turn, so the transcript always comes through.
   * `target` is a DOM element or a CSS selector for the transcript container.
   */
  function commitPartials(target) {
    var host = typeof target === 'string' ? document.querySelector(target) : target;
    if (!host) return;
    host.querySelectorAll('.partial').forEach(function (el) {
      el.classList.remove('partial');
    });
  }

  global.LiveCallSupport = {
    sendUserText: sendUserText,
    createComposer: createComposer,
    commitPartials: commitPartials,
    postRealtimeSdp: postRealtimeSdp,
    esc: esc
  };
})(typeof window !== 'undefined' ? window : this);
