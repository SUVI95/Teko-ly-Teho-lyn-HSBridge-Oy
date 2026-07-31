/** Shared portfolio image slots — editor UI + src resolution for design previews. */
(function (global) {
  'use strict';

  function ensureImages(P) {
    if (!P.images) P.images = {};
    return P.images;
  }

  /** Resolve image: enabled+data → custom; enabled empty → null; unset → fallback (demo). */
  function imgSrc(p, id, fallback) {
    p = p || {};
    var im = (p.images && p.images[id]) || {};
    if (im.enabled === true) {
      if (im.dataUrl) return im.dataUrl;
      if (im.src) return im.src;
      if (id === 'hero' && p.has_photo && p.slug) {
        return '/api/portfolio/photo/' + encodeURIComponent(p.slug);
      }
      return null;
    }
    if (im.enabled === false) return null;
    if (id === 'hero' && p.has_photo && p.slug) {
      return '/api/portfolio/photo/' + encodeURIComponent(p.slug);
    }
    return fallback || null;
  }

  function imgTag(src, alt, cls) {
    if (!src) return '';
    var a = String(alt || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    var c = cls ? (' class="' + String(cls).replace(/"/g, '') + '"') : '';
    return '<img' + c + ' src="' + String(src).replace(/"/g, '&quot;') + '" alt="' + a + '">';
  }

  /**
   * Mount image slot editor into #imageSlots.
   * opts: { getP, setStatus, saveQuiet, onChange, slots:[{id,label,hint}] }
   */
  function mountEditor(opts) {
    opts = opts || {};
    var container = document.getElementById(opts.containerId || 'imageSlots');
    if (!container) return;

    function P() { return opts.getP ? opts.getP() : global.P; }

    function render() {
      var data = P();
      ensureImages(data);
      var slots = typeof opts.slots === 'function' ? opts.slots(data) : (opts.slots || []);
      container.innerHTML = '';
      slots.forEach(function (def) {
        var im = data.images[def.id] || { enabled: false, dataUrl: '', src: '' };
        data.images[def.id] = im;
        var slot = document.createElement('div');
        slot.className = 'img-slot';
        var prev = '';
        if (im.enabled && (im.dataUrl || im.src)) {
          prev = '<img class="img-thumb" src="' + (im.dataUrl || im.src) + '" alt="">';
        } else if (im.enabled) {
          prev = '<div class="img-ph-mini">Kuva päällä — lataa tai jätä tyhjäksi</div>';
        } else {
          prev = '<div class="img-ph-mini">Kuva pois päältä</div>';
        }
        slot.innerHTML =
          '<div class="img-slot-head"><strong>' + def.label + '</strong>' +
          '<label style="font-size:.72rem;display:flex;align-items:center;gap:.35rem;">' +
          '<input type="checkbox" ' + (im.enabled ? 'checked' : '') + '> Näytä</label></div>' +
          '<p class="img-slot-hint">' + (def.hint || '') + '</p>' + prev +
          '<div class="img-slot-actions">' +
          '<label class="btn btn-secondary" style="cursor:pointer;margin:0;">' +
          '<input type="file" accept="image/*" style="display:none"> Lataa kuva</label>' +
          '<button type="button" class="btn btn-secondary btn-rm">Poista kuva</button></div>';

        var cb = slot.querySelector('input[type=checkbox]');
        cb.onchange = function () {
          im.enabled = cb.checked;
          if (!im.enabled) { im.dataUrl = ''; im.src = ''; }
          render();
          if (opts.saveQuiet) opts.saveQuiet();
          if (opts.onChange) opts.onChange();
        };
        var fileIn = slot.querySelector('input[type=file]');
        fileIn.onchange = function () {
          var file = fileIn.files && fileIn.files[0];
          if (!file) return;
          if (!file.type.match(/^image\//)) { alert('Valitse kuvatiedosto (JPG, PNG…)'); return; }
          if (file.size > 2.5 * 1024 * 1024) {
            alert('Kuva on liian suuri paikalliseen luonnokseen (max ~2,5 MB).');
            return;
          }
          var r = new FileReader();
          r.onload = function () {
            ensureImages(data);
            data.images[def.id] = { enabled: true, dataUrl: r.result, src: '' };
            render();
            if (opts.saveQuiet) opts.saveQuiet();
            if (opts.setStatus) opts.setStatus('✓ Kuva tallennettu luonnokseen');
            if (opts.onChange) opts.onChange();
          };
          r.readAsDataURL(file);
        };
        slot.querySelector('.btn-rm').onclick = function () {
          im.dataUrl = '';
          im.src = '';
          render();
          if (opts.saveQuiet) opts.saveQuiet();
          if (opts.onChange) opts.onChange();
        };
        container.appendChild(slot);
      });
    }

    render();
    return { render: render };
  }

  global.PortfolioImageSlots = {
    ensureImages: ensureImages,
    imgSrc: imgSrc,
    imgTag: imgTag,
    mountEditor: mountEditor
  };
})(typeof window !== 'undefined' ? window : this);
