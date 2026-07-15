/**
 * Structured Kokemus editor — shared by classic Elävä CV and design modules.
 */
(function (global) {
  var STYLE_ID = 'portfolio-exp-editor-styles';

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent =
      '.exp-item{border:1px solid rgba(0,0,0,.1);border-radius:12px;padding:1rem 1.1rem;margin-bottom:.75rem;background:rgba(255,255,255,.6);}' +
      '.exp-item-head{display:flex;align-items:center;justify-content:space-between;gap:.75rem;margin-bottom:.75rem;}' +
      '.exp-item-head label{font-size:.78rem;display:flex;align-items:center;gap:.4rem;cursor:pointer;}' +
      '.exp-remove{background:none;border:none;color:#b91c1c;font-size:.75rem;font-weight:600;cursor:pointer;padding:.25rem .5rem;border-radius:6px;}' +
      '.exp-remove:hover{background:rgba(185,28,28,.08);}' +
      '.exp-grid{display:grid;grid-template-columns:1fr 1fr;gap:.65rem;}' +
      '@media(max-width:580px){.exp-grid{grid-template-columns:1fr;}}' +
      '.exp-grid .exp-field,.exp-grid .exp-desc{width:100%;background:#fff;border:1px solid rgba(0,0,0,.12);border-radius:8px;padding:.65rem .85rem;font-size:.84rem;font-family:inherit;color:inherit;}' +
      '.exp-grid .exp-desc{resize:vertical;line-height:1.45;min-height:3rem;}' +
      '.exp-grid .full{grid-column:1/-1;}' +
      '.exp-add-btn{margin-top:.35rem;}';
    document.head.appendChild(s);
  }

  function escAttr(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
  }

  function normalizeExperience(e, periodField) {
    periodField = periodField || 'years';
    var yearsVal = (e && e.years) || (e && e.period) || '';
    var out = {
      role: (e && e.role) || (e && e.title) || '',
      company: (e && e.company) || '',
      desc: (e && e.desc) || (e && e.description) || '',
      show: e && e.show === false ? false : true
    };
    out[periodField] = yearsVal;
    return out;
  }

  var PortfolioExperienceEditor = {
    _opts: null,

    init: function (opts) {
      injectStyles();
      this._opts = Object.assign(
        {
          containerId: 'expEditorList',
          showCheckbox: true,
          periodField: 'years',
          addButtonLabel: '+ Lisää työtehtävä',
          onChange: null,
          getExperience: function () {
            return [];
          },
          setExperience: function () {}
        },
        opts || {}
      );
      this.render();
      var box = document.getElementById(this._opts.containerId);
      var self = this;
      if (!box) return;
      box.addEventListener('input', function () {
        self.sync();
        if (self._opts.onChange) self._opts.onChange();
      });
      box.addEventListener('change', function (ev) {
        if (ev.target && ev.target.classList.contains('exp-show')) {
          self.sync();
          if (self._opts.onChange) self._opts.onChange();
        }
      });
    },

    render: function () {
      var opts = this._opts;
      var box = document.getElementById(opts.containerId);
      if (!box) return;
      var list = opts.getExperience() || [];
      if (!list.length) {
        list = [normalizeExperience({}, opts.periodField)];
        opts.setExperience(list);
      }
      box.innerHTML = list
        .map(function (e, i) {
          e = normalizeExperience(e, opts.periodField);
          list[i] = e;
          var head =
            '<div class="exp-item-head">' +
            (opts.showCheckbox
              ? '<label><input type="checkbox" class="exp-show"' +
                (e.show ? ' checked' : '') +
                '> Näytä portfoliossa</label>'
              : '<span style="font-size:.78rem;font-weight:600;">Työtehtävä ' +
                (i + 1) +
                '</span>') +
            '<button type="button" class="exp-remove" data-exp-remove="' +
            i +
            '">Poista</button></div>';
          return (
            '<div class="exp-item" data-i="' +
            i +
            '">' +
            head +
            '<div class="exp-grid">' +
            '<input class="exp-field exp-role" placeholder="Rooli / tehtävä" value="' +
            escAttr(e.role) +
            '">' +
            '<input class="exp-field exp-co" placeholder="Työnantaja" value="' +
            escAttr(e.company) +
            '">' +
            '<input class="exp-field exp-yrs" placeholder="Vuodet (esim. 2020–2023)" value="' +
            escAttr(e[opts.periodField]) +
            '">' +
            '<textarea class="exp-desc full" rows="2" placeholder="Lyhyt kuvaus">' +
            escAttr(e.desc) +
            '</textarea></div></div>'
          );
        })
        .join('');
      opts.setExperience(list);
      box.querySelectorAll('[data-exp-remove]').forEach(function (btn) {
        btn.onclick = function () {
          PortfolioExperienceEditor.removeRow(parseInt(btn.getAttribute('data-exp-remove'), 10));
        };
      });
    },

    sync: function () {
      var opts = this._opts;
      var box = document.getElementById(opts.containerId);
      if (!box) return;
      var items = [];
      box.querySelectorAll('.exp-item').forEach(function (row) {
        var entry = normalizeExperience(
          {
            role: (row.querySelector('.exp-role') || {}).value || '',
            company: (row.querySelector('.exp-co') || {}).value || '',
            desc: (row.querySelector('.exp-desc') || {}).value || '',
            show: opts.showCheckbox
              ? (row.querySelector('.exp-show') || {}).checked !== false
              : true
          },
          opts.periodField
        );
        entry[opts.periodField] = (row.querySelector('.exp-yrs') || {}).value || '';
        items.push(entry);
      });
      opts.setExperience(
        items.filter(function (e) {
          return e.role || e.company || e[opts.periodField] || e.desc;
        })
      );
    },

    addRow: function () {
      var opts = this._opts;
      if (!opts) return;
      this.sync();
      var list = opts.getExperience() || [];
      list.push(normalizeExperience({}, opts.periodField));
      opts.setExperience(list);
      this.render();
      if (opts.onChange) opts.onChange();
    },

    removeRow: function (i) {
      var opts = this._opts;
      if (!opts) return;
      this.sync();
      var list = opts.getExperience() || [];
      list.splice(i, 1);
      if (!list.length) list = [normalizeExperience({}, opts.periodField)];
      opts.setExperience(list);
      this.render();
      if (opts.onChange) opts.onChange();
    }
  };

  global.PortfolioExperienceEditor = PortfolioExperienceEditor;
  global.addExperienceRow = function () {
    PortfolioExperienceEditor.addRow();
  };
  global.removeExperienceRow = function (i) {
    PortfolioExperienceEditor.removeRow(i);
  };
})(window);
