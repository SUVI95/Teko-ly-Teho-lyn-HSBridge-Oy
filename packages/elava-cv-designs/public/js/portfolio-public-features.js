/** Shared HTML/CSS for public portfolio pages — contact form, CV download, FAQ bot */
(function (global) {
  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function hrefUrl(raw) {
    var u = String(raw || '').trim();
    if (!u) return '';
    if (/^https?:\/\//i.test(u)) return u;
    return 'https://' + u.replace(/^\/+/, '');
  }
  function fnFirst(name) {
    return String(name || '').trim().split(/\s+/)[0] || 'Hakija';
  }

  var PUBLIC_CSS =
    '.pf-contact-form{margin-top:1.75rem;padding:1.5rem;border-radius:12px;background:rgba(255,255,255,.92);border:1px solid rgba(0,0,0,.08);max-width:520px}'
    + '.pf-contact-form label{display:block;font-size:.72rem;font-weight:600;margin:.75rem 0 .35rem;opacity:.85}'
    + '.pf-contact-form input,.pf-contact-form textarea{width:100%;padding:.65rem .75rem;border:1px solid rgba(0,0,0,.12);border-radius:8px;font:inherit;font-size:.88rem}'
    + '.pf-contact-form textarea{min-height:96px;resize:vertical}'
    + '.pf-contact-form button{margin-top:1rem;padding:.7rem 1.25rem;border:none;border-radius:999px;font-weight:600;cursor:pointer;font:inherit;background:var(--pf-accent,#2563a8);color:#fff}'
    + '.pf-contact-form .pf-ok{display:none;color:#2a7a4b;}.pf-contact-form .pf-err{display:none;color:#c0392b;}'
    + '.pf-actions{display:flex;flex-wrap:wrap;gap:.5rem;margin:.75rem 0}'
    + '.pf-btn{display:inline-flex;align-items:center;gap:.35rem;padding:.55rem 1rem;border-radius:999px;font-size:.82rem;font-weight:600;text-decoration:none;border:1.5px solid rgba(0,0,0,.12);color:inherit;background:#fff}'
    + '.pf-btn-primary{background:var(--pf-accent,#2563a8);color:#fff;border-color:transparent}'
    + '#pfChatBtn{position:fixed;bottom:1.25rem;right:1.25rem;z-index:9999;padding:.75rem 1.1rem;border-radius:999px;border:none;font-weight:600;cursor:pointer;background:var(--pf-accent,#2563a8);color:#fff;box-shadow:0 8px 28px rgba(0,0,0,.18);font:inherit}'
    + '#pfChatPanel{position:fixed;bottom:5rem;right:1.25rem;width:min(360px,calc(100vw - 2rem));max-height:min(420px,70vh);background:#fff;border-radius:14px;box-shadow:0 16px 48px rgba(0,0,0,.2);z-index:9999;display:none;flex-direction:column;overflow:hidden;border:1px solid rgba(0,0,0,.08)}'
    + '#pfChatPanel.open{display:flex}'
    + '.pf-cp-head{display:flex;align-items:center;justify-content:space-between;padding:.75rem 1rem;border-bottom:1px solid rgba(0,0,0,.06);font-weight:600;font-size:.88rem}'
    + '.pf-cp-msgs{flex:1;overflow-y:auto;padding:.75rem 1rem;font-size:.82rem;line-height:1.55}'
    + '.pf-msg{margin-bottom:.65rem;padding:.55rem .75rem;border-radius:10px;max-width:92%}'
    + '.pf-msg.ai{background:rgba(0,0,0,.05)}.pf-msg.user{margin-left:auto;background:var(--pf-accent,#2563a8);color:#fff}'
    + '.pf-sugs{display:flex;flex-wrap:wrap;gap:.35rem;padding:0 1rem .5rem}'
    + '.pf-sug{font-size:.68rem;padding:.35rem .55rem;border-radius:999px;border:1px solid rgba(0,0,0,.1);background:#fff;cursor:pointer}'
    + '.pf-cp-form{display:flex;gap:.35rem;padding:.65rem 1rem;border-top:1px solid rgba(0,0,0,.06)}'
    + '.pf-cp-form input{flex:1;padding:.5rem .65rem;border:1px solid rgba(0,0,0,.12);border-radius:8px;font:inherit;font-size:.82rem}'
    + '.pf-cp-form button{padding:.5rem .75rem;border:none;border-radius:8px;background:var(--pf-accent,#2563a8);color:#fff;cursor:pointer}';

  function actionButtons(p) {
    var h = '<div class="pf-actions">';
    if (p.has_cv && p.slug) {
      h += '<a class="pf-btn pf-btn-primary" href="/api/portfolio/cv/' + encodeURIComponent(p.slug) + '" download>Lataa CV</a>';
    }
    if (p.linkedin_url) {
      h += '<a class="pf-btn" href="' + esc(hrefUrl(p.linkedin_url)) + '" target="_blank" rel="noopener noreferrer">LinkedIn</a>';
    }
    if (p.email_public) {
      h += '<a class="pf-btn" href="mailto:' + esc(p.email_public) + '">Sähköposti</a>';
    }
    h += '</div>';
    return h;
  }

  function contactSection(p) {
    var fn = esc(fnFirst(p.full_name));
    var h = '<div class="pf-contact-form" id="pfContactForm">';
    h += '<p style="font-size:.88rem;line-height:1.6;opacity:.85;margin-bottom:.25rem">Jätä viesti — <strong>' + fn + '</strong> saa sen sähköpostiinsa.</p>';
    h += actionButtons(p);
    h += '<label for="pfContactName">Nimesi *</label><input id="pfContactName" autocomplete="name">';
    h += '<label for="pfContactEmail">Sähköpostisi *</label><input id="pfContactEmail" type="email" autocomplete="email">';
    h += '<label for="pfContactMsg">Viesti *</label><textarea id="pfContactMsg" placeholder="Hei! Haluaisin keskustella roolista..."></textarea>';
    h += '<button type="button" id="pfContactSubmit">Lähetä viesti</button>';
    h += '<div class="pf-ok" id="pfContactOk"></div><div class="pf-err" id="pfContactErr"></div></div>';
    return h;
  }

  function chatWidget(p) {
    var nm = esc(p.full_name || 'Portfolio');
    var h = '<button type="button" id="pfChatBtn">💬 Kysy & ota yhteyttä</button>';
    h += '<div id="pfChatPanel"><div class="pf-cp-head"><span>' + nm + '</span><button type="button" id="pfChatClose" style="background:none;border:none;font-size:1.1rem;cursor:pointer">×</button></div>';
    h += '<div class="pf-cp-msgs" id="pfCpMsgs"><div class="pf-msg ai">Hei! Voin vastata yleisiin kysymyksiin. Henkilökohtiseen yhteydenottoon käytä lomaketta.</div></div>';
    h += '<div class="pf-sugs" id="pfSugs"><button type="button" class="pf-sug">Mitkä ovat vahvuudet?</button><button type="button" class="pf-sug">Miksi palkata?</button><button type="button" class="pf-sug">Miten otan yhteyttä?</button></div>';
    h += '<div class="pf-cp-form"><input id="pfChatInput" placeholder="Kirjoita kysymys..."><button type="button" id="pfChatSend">→</button></div></div>';
    return h;
  }

  function enhanceBody(body, p) {
    body = String(body || '');
    if (p.has_cv && p.slug && body.indexOf('/api/portfolio/cv/') < 0) {
      body = body.replace(/(<div class="hero-btns">)/i, '$1' + (p.has_cv ? '<a class="btn btn-outline pf-cv-hero" href="/api/portfolio/cv/' + encodeURIComponent(p.slug) + '" download>Lataa CV</a>' : ''));
      body = body.replace(/(<div class="btn-row">)/i, function (m, i, offset) {
        if (offset > 0 && body.substring(0, offset).indexOf('hero-btns') >= 0) return m;
        return m;
      });
    }
    if (p.linkedin_url && body.indexOf('linkedin.com') < 0 && body.indexOf('LinkedIn') < 0) {
      body = body.replace(/(<div class="hero-btns">)/i, '$1<a class="btn btn-outline" href="' + esc(hrefUrl(p.linkedin_url)) + '" target="_blank" rel="noopener">LinkedIn</a>');
    }
    var contactInject = contactSection(p);
    if (body.indexOf('id="contact"') >= 0) {
      body = body.replace(/<section[^>]*id="contact"[^>]*>[\s\S]*?<\/section>/i, function (block) {
        var open = block.match(/^<section[^>]*>/i);
        return (open ? open[0] : '<section id="contact">') + contactInject + '</section>';
      });
    } else {
      body = body.replace(/<footer/i, contactInject + '<footer');
    }
    if (body.indexOf('id="pfChatBtn"') < 0) {
      body = body.replace(/<\/body>/i, chatWidget(p) + '</body>');
    }
    return body;
  }

  function finishHtml(bodyInner, p, headExtra) {
    p = p || {};
    bodyInner = enhanceBody(bodyInner, p);
    var accent = (p.visual_style && p.visual_style.gold) || p.brand_accent || '#2563a8';
    var styleExtra = '<style>:root{--pf-accent:' + accent + ';}' + PUBLIC_CSS + '</style>';
    return '<!DOCTYPE html><html lang="fi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
      + (headExtra || '')
      + styleExtra
      + '</head><body>'
      + bodyInner
      + '<script src="/js/portfolio-public-runtime.js"><\/script>'
      + '<script>PortfolioPublic.init(' + initJson(p) + ');<\/script>'
      + '</body></html>';
  }

  function initJson(p) {
    return JSON.stringify({
      slug: p.slug || '',
      full_name: p.full_name || '',
      has_cv: !!p.has_cv,
      target_role: p.target_role || '',
      city: p.city || '',
      email_public: p.email_public || '',
      career_summary: p.career_summary || '',
      bio: p.bio || '',
      hidden_strengths: p.hidden_strengths || '',
      skills: p.skills || [],
      experience: p.experience || [],
      education: p.education || [],
      languages: p.languages || []
    });
  }

  global.PortfolioPublicFeatures = {
    css: function () { return PUBLIC_CSS; },
    actionButtons: actionButtons,
    contactSection: contactSection,
    chatWidget: chatWidget,
    enhanceBody: enhanceBody,
    finishHtml: finishHtml,
    initJson: initJson
  };
})(typeof window !== 'undefined' ? window : this);
