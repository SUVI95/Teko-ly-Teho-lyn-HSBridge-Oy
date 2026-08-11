window.PILLARS = window.PILLARS || [];

const DESIGN_ASSETS = '/claude-moduuli/assets/design';

async function waitDesignPrompt(canvas, {
  placeholder = 'Kirjoita Design-pyyntösi…',
  minChars = 35,
  requireGroups = [],
  banSnippets = [],
} = {}){
  const box = Engine.el(`
    <div class="cd-prompt-bar">
      <label>Oma Design-pyyntö</label>
      <textarea rows="3" placeholder="${placeholder}"></textarea>
      <div class="cd-prompt-actions">
        <button type="button" class="btn primary" data-role="gen" disabled>Generate</button>
        <span class="cd-prompt-hint" data-role="hint"></span>
      </div>
    </div>`);
  canvas.appendChild(box);
  const ta = box.querySelector('textarea');
  const btn = box.querySelector('[data-role="gen"]');
  const hint = box.querySelector('[data-role="hint"]');
  ta.addEventListener('input', () => { btn.disabled = ta.value.trim().length < minChars; });
  ta.focus();

  return new Promise(resolve => {
    btn.addEventListener('click', () => {
      const text = ta.value.trim();
      const check = Engine.scorePrompt(text, { minChars, requireGroups, banSnippets, requireSafety: [] });
      if(!check.ok){
        const map = {
          short: 'Kirjoita hieman pidempi pyyntö.',
          missing: 'Kerro mitä luodaan ja millä tyylillä / mistä kuvasta.',
          copy: 'Älä kopioi briiffiä — kirjoita omin sanoin.',
        };
        hint.textContent = (check.reasons || []).map(r => map[r]).filter(Boolean)[0] || 'Täsmennä pyyntöä.';
        return;
      }
      ta.disabled = true;
      btn.disabled = true;
      resolve(text);
    });
  });
}

function finishEx(container, msg){
  const thread = Engine.el('<div class="thread cd-ex-thread"></div>');
  container.appendChild(thread);
  Engine.addComplete(thread, msg);
}

window.PILLARS.push({
  id: 'p4',
  num: 4,
  name: 'Claude Design',
  subtitle: 'Visuaalinen suunnittelu',
  briefingLabel: 'Malli',

  theory: {
    tagline: 'Claude Design = kuva autosta. Claude Code = moottori konepellin alla.',
    whatItDoes: 'Claude Design (claude.ai/design) on työtila <b>ideointiin, visualisointiin ja prototyyppeihin</b>. Näet miltä asia näyttää — ja muokkaat kuvaa kommentilla tai editillä. Se ei ole vielä toimiva sovellus.',
    howItWorks: 'Valitse / lataa inspiraatiokuva → pyydä luonnos → klikkaa kohtaa kuvassa ja kommentoi / editoi. Muutos päivittyy kuvaan. Napin “sytytys” ei käynnistä moottoria.',
    benefits: 'Hiottu kuva ennen kehitystä — et sekoita “näyttää valmiilta” ja “toimii oikeasti”.',
    whereToUse: 'Menut, bannerit, flyerit, kannet, pitch-diat — visuaalinen luonnos ennen toteutusta.',
    capabilities: [
      {title: 'Kuva (Design)', body: 'Fotorealistinen mockup — muokkaat kerroksia. Sytytys ei käynnistä moottoria.'},
      {title: 'Moottori (Code)', body: 'Oikea toiminnallisuus, prosessit, data.'},
      {title: 'Miksi erottaa', body: 'Design = ideoi & prototyyppaa. Code = toteuta.'},
    ],
  },

  briefing: async (container, { goToExample }) => {
    container.innerHTML = `
      <div class="cd-briefing">
        <section class="cd-hero">
          <p class="cd-kicker">Ennen Designia</p>
          <h2>Kuva vs moottori</h2>
          <p class="cd-lead">Designissa työskentelet <b>oikean näköisten kuvien</b> kanssa — ei leikkikentän CSS-laatikoiden. Muutat kuvaa kommenteilla. Moottori (Code) on erikseen.</p>
        </section>
        <section class="cd-compare">
          <article class="cd-card picture">
            <header>Claude Design = kuva</header>
            <p style="margin:0;font-size:13.5px;line-height:1.5;color:#3a3830;">Näet menun, bannerin, flyerin kuten valokuvan. Kommentoit kohtaa → layout päivittyy. Nappi ei lähetä lomaketta.</p>
            <button type="button" class="btn" id="cdIgnition">Klikkaa sytytystä</button>
            <p class="cd-ignition-msg" id="cdIgnitionMsg" hidden>Moottori ei käynnisty. Tämä on kuva.</p>
          </article>
          <article class="cd-card engine">
            <header>Claude Code = moottori</header>
            <p style="margin:0;font-size:13.5px;line-height:1.5;color:#3a3830;">Kun kuva on valmis, toteutus (napit, data, prosessit) on Code / kehittäjä — ei Design.</p>
            <p class="cd-engine-note">Harjoituksissa: valitse oikea kuva vasemmalta → pyydä muutos → editoi pinillä.</p>
          </article>
        </section>
        <div class="cd-footer">
          <button type="button" class="btn primary" id="cdGoExample">Katso esimerkki →</button>
        </div>
      </div>`;
    container.querySelector('#cdIgnition').addEventListener('click', ev => {
      container.querySelector('#cdIgnitionMsg').hidden = false;
      ev.currentTarget.disabled = true;
    });
    container.querySelector('#cdGoExample').addEventListener('click', () => goToExample && goToExample());
  },

  example: async (container) => {
    const { canvas, comments } = Engine.renderDesignShell(container, { title: 'Design — kuva, ei moottori' });
    canvas.innerHTML = `
      <p class="cd-example-note">Esimerkki: oikea valokuva menusta. Seuraavissa harjoituksissa teet saman — valitset kuvan ja editoit sitä.</p>
      <div class="cd-photo-stage">
        <div class="cd-photo-frame">
          <img src="${DESIGN_ASSETS}/menu-reference.jpg" alt="Upscale menu reference">
        </div>
      </div>`;
    await Engine.wait(600);
    comments.innerHTML = `<div class="design-comment"><b>Kommentti:</b> “align prices cleanly to the right”</div>`;
    await Engine.wait(900);
    comments.insertAdjacentHTML('beforeend', `<div class="design-comment">Design päivittää kuvaa — ei rakenna verkkokauppaa.</div>`);
  },

  exercises: [
    /* H1 Menu */
    {
      label: 'H1 · Bistro menu',
      outcome: 'Pick photo → redesign → comment prices',
      run: async (container) => {
        const lab = Engine.renderDesignLab(container, {
          title: 'The Green Olive Bistro — menu redesign',
          assetsLabel: 'Your uploads',
          assets: [
            {id:'clutter', label: 'Current menu (messy)', meta: 'Before — hard to read', thumb: `${DESIGN_ASSETS}/menu-cluttered.jpg`, selected: true},
            {id:'ref', label: 'Inspiration menu', meta: 'Upscale aesthetic you love', thumb: `${DESIGN_ASSETS}/menu-reference.jpg`},
          ],
          tools: [{id:'comments', label: 'Comments', active: true}],
          sideLabel: 'Tehtävä',
        });

        lab.side.innerHTML = `
          <div class="cd-brief-side">
            <h4>Tilanne</h4>
            <p>Ravintola haluaa vaihtaa sekavan menun moderniin bistro-ilmeeseen.</p>
            <h4>Tehtäväsi</h4>
            <p>1) Valitse inspiraatiokuva vasemmalta.<br>
            2) Pyydä uusi high-fidelity menu <b>The Green Olive Bistro</b>lle samalla estetiikalla.<br>
            3) Comments → klikkaa hintapistettä kuvassa ja pyydä tasausta.</p>
          </div>`;

        const showSelected = () => {
          const id = lab.getSelected()[0] || 'clutter';
          const src = id === 'ref' ? `${DESIGN_ASSETS}/menu-reference.jpg` : `${DESIGN_ASSETS}/menu-cluttered.jpg`;
          lab.showPhoto({
            src,
            alt: 'Menu photo',
            caption: id === 'ref' ? 'Inspiraatio valittu' : 'Nykyinen sekava menu',
          });
        };
        showSelected();
        lab.onAsset(showSelected);

        // prompt area under photo
        const promptHost = Engine.el('<div></div>');
        lab.canvas.appendChild(promptHost);
        await waitDesignPrompt(promptHost, {
          placeholder: 'Redesign for The Green Olive Bistro matching the inspiration photo…',
          minChars: 40,
          requireGroups: [
            ['olive', 'bistro', 'menu', 'green'],
            ['design', 'redesign', 'aesthetic', 'inspira', 'reference', 'match', 'style', 'tyyli', 'modern'],
          ],
          banSnippets: ['Ravintola haluaa vaihtaa'],
        });

        await Engine.wait(700);
        lab.showPhoto({
          src: `${DESIGN_ASSETS}/menu-green-olive.jpg`,
          alt: 'Green Olive Bistro menu',
          caption: 'Uusi luonnos — klikkaa punaista pinniä hinnoissa (Comments)',
          hotspots: [{id:'prices', x: 78, y: 42, label: 'Prices'}],
        });
        lab.setSideLabel('Kommentit');
        lab.side.innerHTML = `<div class="design-comment">Luonnos valmis. Comments → pinni hintoihin.</div>`;

        await new Promise(resolve => {
          lab.canvas.querySelector('.cd-hotspot').addEventListener('click', () => {
            const row = Engine.el(`
              <div class="comment-input-row">
                <input type="text" placeholder="align these cleanly to the right and make the font lighter">
                <button class="btn primary">Send</button>
              </div>`);
            lab.canvas.querySelector('.cd-photo-stage').appendChild(row);
            row.querySelector('input').focus();
            row.querySelector('button').addEventListener('click', async () => {
              const t = row.querySelector('input').value.trim();
              if(t.length < 8) return;
              row.remove();
              lab.side.insertAdjacentHTML('beforeend', `<div class="design-comment"><b>Prices:</b> “${Engine.esc(t)}”</div>`);
              await Engine.wait(400);
              lab.canvas.querySelector('.cd-photo-frame').classList.add('cd-edited');
              lab.side.insertAdjacentHTML('beforeend', `<div class="design-comment">Layout adjusted on the mockup — still a picture, not a live POS.</div>`);
              finishEx(container, 'H1 valmis — oikea menu-kuva + Comments.');
              resolve();
            });
          }, { once: true });
        });
      },
    },

    /* H2 Newsletter */
    {
      label: 'H2 · Newsletter header',
      outcome: 'Vibe photos → banner → edit title',
      run: async (container) => {
        const lab = Engine.renderDesignLab(container, {
          title: 'Newsletter header',
          assetsLabel: 'Vibe photos',
          multiSelect: true,
          assets: [
            {id:'office', label: 'Minimalist office', meta: 'Clean light', thumb: `${DESIGN_ASSETS}/vibe-office.jpg`, selected: true},
            {id:'autumn', label: 'Warm autumn', meta: 'Terracotta tones', thumb: `${DESIGN_ASSETS}/vibe-autumn.jpg`, selected: true},
          ],
          tools: [{id:'edit', label: 'Edit', active: true}],
          sideLabel: 'Tehtävä',
        });

        lab.side.innerHTML = `
          <div class="cd-brief-side">
            <h4>Tilanne</h4>
            <p>Konsultti tarvitsee LinkedIn-uutiskirjeen bannerin — ei logoa vielä.</p>
            <h4>Tehtäväsi</h4>
            <p>1) Valitse vibe-kuvat.<br>2) Pyydä banner-mockupia (Claude poimii värit kuvista).<br>3) Edit → klikkaa otsikkoa ja vaihda teksti.</p>
          </div>`;

        lab.canvas.innerHTML = `
          <div class="cd-vibe-row">
            <img src="${DESIGN_ASSETS}/vibe-office.jpg" alt="">
            <img src="${DESIGN_ASSETS}/vibe-autumn.jpg" alt="">
          </div>`;
        const promptHost = Engine.el('<div></div>');
        lab.canvas.appendChild(promptHost);

        await waitDesignPrompt(promptHost, {
          placeholder: 'Create a newsletter banner from these vibe photos…',
          minChars: 35,
          requireGroups: [
            ['newsletter', 'banner', 'header', 'uutiskirje'],
            ['vibe', 'photo', 'image', 'kuva', 'color', 'brand', 'extract', 'tyyli', 'office', 'autumn'],
          ],
          banSnippets: ['Konsultti tarvitsee LinkedIn'],
        });

        await Engine.wait(700);
        lab.canvas.innerHTML = `
          <div class="cd-photo-stage">
            <p class="cd-photo-cap">Banner mockup — Edit: klikkaa otsikkoaluetta</p>
            <div class="cd-photo-frame">
              <img src="${DESIGN_ASSETS}/newsletter-banner.jpg" alt="Newsletter banner">
              <button type="button" class="cd-hotspot edit" data-hot="title" style="left:28%;top:48%;" title="Edit title"><span>T</span></button>
            </div>
            <div class="cd-inline-edit" hidden>
              <label>Title text</label>
              <input type="text" value="Leadership in Motion" maxlength="48">
              <button type="button" class="btn primary">Apply on mockup</button>
            </div>
          </div>`;
        lab.setSideLabel('Edit');
        lab.side.innerHTML = `<div class="design-comment">Banneri valmis vibe-kuvista. Muuta otsikkoa Editillä.</div>`;

        await new Promise(resolve => {
          const pin = lab.canvas.querySelector('.cd-hotspot');
          const panel = lab.canvas.querySelector('.cd-inline-edit');
          pin.addEventListener('click', () => { panel.hidden = false; panel.querySelector('input').focus(); });
          panel.querySelector('button').addEventListener('click', () => {
            const v = panel.querySelector('input').value.trim();
            if(v.length < 3) return;
            panel.hidden = true;
            lab.canvas.querySelector('.cd-photo-frame').classList.add('cd-edited');
            lab.side.insertAdjacentHTML('beforeend', `<div class="design-comment">Title set to “${Engine.esc(v)}” on the mockup.</div>`);
            finishEx(container, 'H2 valmis — vibe-kuvat → banner → Edit.');
            resolve();
          });
        });
      },
    },

    /* H3 Flyer wire / hifi */
    {
      label: 'H3 · Charity flyer',
      outcome: 'Wireframe photo ↔ print photo',
      run: async (container) => {
        const lab = Engine.renderDesignLab(container, {
          title: 'Park cleanup flyer',
          assetsLabel: 'Project files',
          assets: [
            {id:'wire', label: 'Wireframe scan', meta: 'Structure only', thumb: `${DESIGN_ASSETS}/flyer-wireframe.jpg`, selected: true},
            {id:'hifi', label: 'Print flyer', meta: 'High-fidelity', thumb: `${DESIGN_ASSETS}/charity-flyer.jpg`},
          ],
          tools: [
            {id:'wire', label: 'Wireframe', active: true},
            {id:'hifi', label: 'High-fidelity'},
          ],
          sideLabel: 'Tehtävä',
        });

        lab.side.innerHTML = `
          <div class="cd-brief-side">
            <h4>Tilanne</h4>
            <p>Puiston siivoustapahtuma tarvitsee tulostettavan flyerin.</p>
            <h4>Tehtäväsi</h4>
            <p>1) Katso wireframe-kuvaa (rakenne).<br>
            2) Pyydä high-fidelity flyer samaan rakenteeseen.<br>
            3) Vaihda Wireframe ↔ High-fidelity nähdäksesi eron.</p>
          </div>`;

        const paint = (mode) => {
          const src = mode === 'hifi' ? `${DESIGN_ASSETS}/charity-flyer.jpg` : `${DESIGN_ASSETS}/flyer-wireframe.jpg`;
          lab.showPhoto({
            src,
            caption: mode === 'hifi' ? 'High-fidelity print' : 'Wireframe — structure first',
          });
        };
        paint('wire');

        const promptHost = Engine.el('<div></div>');
        lab.canvas.appendChild(promptHost);
        await waitDesignPrompt(promptHost, {
          placeholder: 'Turn this wireframe into a striking park cleanup flyer…',
          minChars: 35,
          requireGroups: [
            ['flyer', 'wireframe', 'wire', 'poster', 'high'],
            ['cleanup', 'park', 'charity', 'puisto', 'siivous', 'event'],
          ],
          banSnippets: ['Puiston siivoustapahtuma'],
        });

        paint('hifi');
        lab.setTool('hifi');
        lab.setSideLabel('Modes');
        lab.side.innerHTML = `<div class="design-comment">High-fidelity valmis. Vaihda Wireframe / High-fidelity ylhäällä.</div>`;

        await new Promise(resolve => {
          let seenWire = false, seenHifi = true;
          lab.onTool(tool => {
            if(tool === 'wire'){ paint('wire'); seenWire = true; }
            if(tool === 'hifi'){ paint('hifi'); seenHifi = true; }
            if(seenWire && seenHifi){
              lab.side.insertAdjacentHTML('beforeend', `<div class="design-comment">Sama rakenne, eri fidelity — näin pro-design etenee.</div>`);
              finishEx(container, 'H3 valmis — wireframe-kuva ↔ print-kuva.');
              resolve();
            }
          });
        });
      },
    },

    /* H4 Ebook cover */
    {
      label: 'H4 · E-book cover',
      outcome: 'Cover photo → markup subtitle',
      run: async (container) => {
        const lab = Engine.renderDesignLab(container, {
          title: 'E-book cover pitch',
          assetsLabel: 'Style refs',
          assets: [
            {id:'navy', label: 'Navy trust cover', meta: 'Clean professional', thumb: `${DESIGN_ASSETS}/ebook-cover.jpg`, selected: true},
          ],
          tools: [{id:'markup', label: 'Markup', active: true}],
          sideLabel: 'Tehtävä',
        });

        lab.side.innerHTML = `
          <div class="cd-brief-side">
            <h4>Tilanne</h4>
            <p>Pitchaat kustantajalle opasta “Effective Remote Leadership”.</p>
            <h4>Tehtäväsi</h4>
            <p>1) Pyydä high-fidelity kansikonseptia (navy / trustworthy).<br>
            2) Markup → klikkaa alaotsikkoaluetta ja pyydä ~20% pienempää kokoa.</p>
          </div>`;

        lab.showPhoto({ src: `${DESIGN_ASSETS}/ebook-cover.jpg`, caption: 'Style reference on desk' });
        const promptHost = Engine.el('<div></div>');
        lab.canvas.appendChild(promptHost);

        await waitDesignPrompt(promptHost, {
          placeholder: 'Book cover for Effective Remote Leadership, navy, trustworthy…',
          minChars: 35,
          requireGroups: [
            ['cover', 'book', 'ebook', 'kansi', 'leadership', 'remote'],
            ['navy', 'professional', 'trust', 'clean', 'style', 'design'],
          ],
          banSnippets: ['Pitchaat kustantajalle'],
        });

        await Engine.wait(600);
        lab.showPhoto({
          src: `${DESIGN_ASSETS}/ebook-cover.jpg`,
          caption: 'Cover concept — Markup pin on subtitle',
          hotspots: [{id:'sub', x: 50, y: 58, label: 'Subtitle'}],
        });
        lab.setSideLabel('Markup');
        lab.side.innerHTML = `<div class="design-comment">Kansi valmis. Merkitse alaotsikko.</div>`;

        await new Promise(resolve => {
          lab.canvas.querySelector('.cd-hotspot').addEventListener('click', () => {
            const row = Engine.el(`
              <div class="comment-input-row">
                <input type="text" placeholder="Make this subtitle 20% smaller…">
                <button class="btn primary">Send markup</button>
              </div>`);
            lab.canvas.querySelector('.cd-photo-stage').appendChild(row);
            row.querySelector('input').focus();
            row.querySelector('button').addEventListener('click', async () => {
              const t = row.querySelector('input').value.trim();
              if(t.length < 6) return;
              row.remove();
              lab.side.insertAdjacentHTML('beforeend', `<div class="design-comment"><b>Markup:</b> “${Engine.esc(t)}”</div>`);
              lab.canvas.querySelector('.cd-photo-frame').classList.add('cd-edited');
              await Engine.wait(300);
              finishEx(container, 'H4 valmis — kansikuva + Markup.');
              resolve();
            });
          }, { once: true });
        });
      },
    },

    /* H5 Pricing */
    {
      label: 'H5 · Pricing slide',
      outcome: 'Slide screenshot → layers handoff',
      run: async (container) => {
        const lab = Engine.renderDesignLab(container, {
          title: 'Pitch — Services & Pricing',
          assetsLabel: 'Deck refs',
          assets: [
            {id:'slide', label: 'Pricing slide shot', meta: '3 columns on laptop', thumb: `${DESIGN_ASSETS}/pricing-slide.jpg`, selected: true},
          ],
          tools: [
            {id:'comments', label: 'Comments', active: true},
            {id:'layers', label: 'Layers'},
          ],
          sideLabel: 'Tehtävä',
        });

        lab.side.innerHTML = `
          <div class="cd-brief-side">
            <h4>Tilanne</h4>
            <p>Tarvitset kauniin Services & Pricing -dian (Basic / Pro / Enterprise).</p>
            <h4>Tehtäväsi</h4>
            <p>1) Pyydä 3-sarakkeinen pricing-dia.<br>
            2) Avaa <b>Layers</b> — näet miten tiedosto organisoituu luovutusta varten.</p>
          </div>`;

        lab.showPhoto({ src: `${DESIGN_ASSETS}/pricing-slide.jpg`, caption: 'Reference slide on screen' });
        const promptHost = Engine.el('<div></div>');
        lab.canvas.appendChild(promptHost);

        await waitDesignPrompt(promptHost, {
          placeholder: 'Create a 3-column Basic / Professional / Enterprise pricing slide…',
          minChars: 35,
          requireGroups: [
            ['pricing', 'basic', 'professional', 'enterprise', 'package', 'hinno'],
            ['column', 'slide', 'deck', 'checkmark', 'layout', 'design', 'sarake'],
          ],
          banSnippets: ['Tarvitset kauniin Services'],
        });

        await Engine.wait(600);
        lab.showPhoto({
          src: `${DESIGN_ASSETS}/pricing-slide.jpg`,
          caption: 'Generated pricing mockup — open Layers',
        });
        lab.side.innerHTML = `<div class="design-comment">Dia valmis. Avaa Layers nähdäksesi tiedostorakenteen.</div>`;

        await new Promise(resolve => {
          lab.onTool(tool => {
            if(tool !== 'layers') return;
            lab.setSideLabel('Design files');
            lab.side.innerHTML = `
              <div class="cd-layers">
                <div class="cd-layer folder">Pricing_slide/</div>
                <div class="cd-layer">↳ Frame · Services & Pricing</div>
                <div class="cd-layer">↳ Col / Basic</div>
                <div class="cd-layer">↳ Col / Professional</div>
                <div class="cd-layer">↳ Col / Enterprise</div>
                <div class="cd-layer">↳ Icons / checks</div>
              </div>
              <div class="design-comment">Näin kuvan voi luovuttaa eteenpäin — Design = kuva, Code rakentaa sivun.</div>`;
            finishEx(container, 'H5 valmis — pricing-kuva + layers.');
            resolve();
          });
        });
      },
    },
  ],
});
