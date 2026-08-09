window.PILLARS = window.PILLARS || [];

window.PILLARS.push({
  id: 'p4',
  num: 4,
  name: 'Claude Design',
  subtitle: 'Visuaalinen suunnittelu',

  theory: {
    tagline: 'Oma näkymä visuaalista työtä varten — kommentoi suoraan luonnokseen.',
    whatItDoes: 'Claude Design on erillinen näkymä (claude.ai/design) laskeutumissivujen, esitteiden ja prototyyppien tekoon. Se ei ole chat-ikkuna joka sattuu tuottamaan HTML:ää — se on oma pintansa muokkaamista varten.',
    howItWorks: 'Kuvailet mitä tarvitset, tai lataat bränditiedoston. Claude piirtää ensimmäisen version. Sen jälkeen klikkaat suoraan elementtiä kankaalla ja kirjoitat kommentin — muutos näkyy heti, ilman että kirjoitat koko pyyntöä uudelleen.',
    benefits: 'Iterointi on nopeaa: yhden värin tai lauseen muuttaminen ei vaadi uutta promptia alusta asti, vain kommentin siihen kohtaan mikä pitää muuttua.',
    whereToUse: 'Kun tarvitset nopean, brändin näköisen visuaalisen luonnoksen — laskeutumissivun, esitteen, mainoksen — ilman että odotat graafikon aikataulua.',
  },

  example: async (container) => {
    const { canvas, comments } = Engine.renderDesignShell(container, { title: 'Duunijobs — laskeutumissivu' });
    canvas.innerHTML = `
      <div class="mock-landing">
        <div class="hero" style="background:#6a9bcc;color:#fff;">
          <h2>Löydä työ osaamisesi perusteella</h2>
          <p>Anonyymi, taitopohjainen haku — ei CV:tä ensimmäisessä vaiheessa.</p>
          <button style="background:#141413;color:#fff;">Aloita haku</button>
        </div>
      </div>`;
    await Engine.wait(700);
    comments.innerHTML = `<div class="design-comment"><b>Opettaja:</b> "tästä väri lämpimämmäksi"</div>`;
    await Engine.wait(900);
    canvas.querySelector('.hero').style.background = 'var(--orange)';
    await Engine.wait(600);
    comments.insertAdjacentHTML('beforeend', `<div class="design-comment">Muutettu. Ei uutta promptia — vain kommentti oikeaan kohtaan.</div>`);
  },

  exercises: [
    {
      label: 'Harjoitus 1 · Yhden klikkauksen muutos',
      run: async (container) => {
        const { canvas, comments } = Engine.renderDesignShell(container, { title: 'Duunijobs — laskeutumissivu' });
        canvas.innerHTML = `
          <p style="font-size:12.5px;color:#7a7768;margin-bottom:14px;">Klikkaa otsikkoa, väripintaa tai nappia kankaalla — jokainen avaa kommenttikentän.</p>
          <div class="mock-landing">
            <div class="hero pin-target" data-part="bg" style="background:#6a9bcc;color:#fff;">
              <h2 class="pin-target" data-part="headline">Löydä työ osaamisesi perusteella</h2>
              <p>Anonyymi, taitopohjainen haku — ei CV:tä ensimmäisessä vaiheessa.</p>
              <button class="pin-target" data-part="button" style="background:#141413;color:#fff;">Aloita haku</button>
            </div>
          </div>`;
        comments.innerHTML = `<div class="design-comment" style="color:#948f7c;">Kommentit ilmestyvät tähän kun klikkaat kankaalla.</div>`;

        let remaining = 2;
        return new Promise(resolve => {
          canvas.querySelectorAll('.pin-target').forEach(node => {
            node.style.cursor = 'pointer';
            node.addEventListener('click', function onClick(){
              if(node.dataset.used) return;
              const row = Engine.el(`
                <div class="comment-input-row">
                  <input type="text" placeholder="Kirjoita kommentti tähän kohtaan…">
                  <button class="btn primary">Lähetä</button>
                </div>`);
              node.after(row);
              const input = row.querySelector('input');
              const btn = row.querySelector('button');
              input.focus();
              btn.addEventListener('click', async () => {
                const text = input.value.trim();
                if(!text) return;
                row.remove();
                node.dataset.used = '1';
                comments.querySelectorAll('.design-comment').forEach(c => { if(c.textContent.includes('ilmestyvät')) c.remove(); });
                comments.insertAdjacentHTML('beforeend', `<div class="design-comment"><b>Sinä:</b> "${Engine.esc(text)}"</div>`);
                await Engine.wait(500);
                const part = node.dataset.part;
                const lower = text.toLowerCase();
                if(part === 'bg'){
                  node.style.background = /lämpi|orans|puna/.test(lower) ? 'var(--orange)' : /vihre/.test(lower) ? 'var(--green)' : '#3a5a80';
                } else if(part === 'button'){
                  node.style.background = /lämpi|orans|puna/.test(lower) ? 'var(--orange)' : node.style.background;
                } else if(part === 'headline'){
                  if(text.length > 3) node.textContent = text;
                }
                comments.insertAdjacentHTML('beforeend', `<div class="design-comment">Muutettu suoraan kankaalla — ei uutta promptia.</div>`);
                remaining--;
                if(remaining <= 0){
                  await Engine.wait(400);
                  comments.insertAdjacentHTML('beforeend', `<div class="design-comment" style="border-color:var(--green);">✓ Harjoitus 1 suoritettu. Huomasitko, ettet kirjoittanut kertaakaan koko pyyntöä uudelleen?</div>`);
                  resolve();
                }
              });
            });
          });
        });
      },
    },
    {
      label: 'Harjoitus 2 · Bränditiedosto ohjaa tulosta',
      run: async (container) => {
        container.innerHTML = `
          <div class="design-wrap" style="height:auto;">
            <div class="design-topbar"><span class="design-title">Sama pyyntö, kaksi tulosta</span><span class="badge">claude.ai/design — simulaatio</span></div>
            <div style="padding:20px;">
              <p style="font-size:13px;color:#5a5850;margin-bottom:16px;">Pyyntö on molemmissa sama: "Tee mainosbanneri kevätkampanjalle." Ero on siinä, oliko Claudella käytössä yrityksen bränditiedosto.</p>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;">
                <div>
                  <div style="font-size:11px;color:#948f7c;margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em;">Ilman bränditiedostoa</div>
                  <div class="mock-landing"><div class="hero" style="background:#8a5fd6;color:#fff;"><h2 style="font-size:17px;">Kevätkampanja</h2><p>Uudet tuotteet nyt saatavilla</p><button style="background:#222;color:#fff;">Osta nyt</button></div></div>
                </div>
                <div>
                  <div style="font-size:11px;color:#948f7c;margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em;">Bränditiedoston kanssa</div>
                  <div class="mock-landing"><div class="hero" style="background:var(--orange);color:#fff;"><h2 style="font-size:17px;">Kevätkampanja</h2><p>Uudet tuotteet nyt saatavilla</p><button style="background:var(--dark);color:#fff;">Osta nyt</button></div></div>
                </div>
              </div>
            </div>
          </div>`;
        const thread = Engine.el(`<div class="thread" style="padding:0 20px 20px;"></div>`);
        container.querySelector('.design-wrap').appendChild(thread);
        await Engine.wait(600);
        await Engine.addQuiz(thread, {
          question: 'Molemmat kuvat ovat teknisesti oikein — teksti on paikallaan, banneri toimisi. Mikä ero niiden välillä oikeasti ratkaisee, kumman käyttäisit?',
          options: [
            {text:'Kumpi näyttää siltä, että se on juuri tämän yrityksen tekemä, ei minkä tahansa yrityksen', correct:true,
             feedback:'Juuri tätä bränditiedosto tuottaa: värit, fontit ja sävy, jotka toistuvat kaikessa mitä yritys julkaisee. Ilman sitä Claude arvaa hyvän näköisen ratkaisun, mutta se ei ole erityisesti sinun.'},
            {text:'Ei mitään merkittävää eroa, kumpi tahansa käy', correct:false,
             feedback:'Tekninen laatu voi olla sama, mutta bränditunnistettavuus ei — asiakas oppii tunnistamaan yrityksen juuri toistuvien visuaalisten valintojen kautta.'},
            {text:'Bränditiedoston kanssa tehty versio on aina teknisesti parempi', correct:false,
             feedback:'Ei kyse ole teknisestä laadusta vaan siitä, vastaako lopputulos yrityksen omaa ilmettä.'},
          ],
        });
        Engine.addComplete(thread, 'Harjoitus 2 suoritettu.');
      },
    },
    {
      label: 'Harjoitus 3 · Ristiriitainen palaute',
      run: async (container) => {
        const { canvas, comments } = Engine.renderDesignShell(container, { title: 'Duunijobs — kevätkampanja' });
        canvas.innerHTML = `
          <div class="mock-landing"><div class="hero" style="background:#6a9bcc;color:#fff;">
            <h2>Löydä seuraava tekijäsi</h2><p>Rekrytointi ilman CV-suodatinta.</p>
            <button style="background:#141413;color:#fff;">Katso miten se toimii</button>
          </div></div>`;
        comments.innerHTML = `
          <div class="design-comment"><b>Myynti:</b> "Otsikko liian pehmeä, pitäisi näkyä nopeat tulokset — myynti myy hyödyillä."</div>
          <div class="design-comment"><b>Brändi:</b> "Emme koskaan puhu myynti-termein, pidetään ihmisläheinen sävy."</div>`;
        const thread = Engine.el('<div class="thread" style="padding:16px 20px 0;"></div>');
        container.querySelector('.design-wrap').appendChild(thread);
        await Engine.wait(500);
        await Engine.addReflection(thread, {
          prompt: 'Kaksi sidosryhmää haluavat vastakkaisia asioita samaan otsikkoon. Kirjoita, minkä kommentin ottaisit ensisijaiseksi ohjeeksi Claudelle ja miksi — tai miten yhdistäisit molemmat yhdeksi selkeäksi pyynnöksi.',
          placeholder: 'Ohjeistaisin Claudea…',
        });
        Engine.addComplete(thread, 'Harjoitus 3 suoritettu.');
      },
    },
    {
      label: 'Harjoitus 4 · Saavutettavuus',
      run: async (container) => {
        const { canvas, comments } = Engine.renderDesignShell(container, { title: 'Duunijobs — CTA-testi' });
        canvas.innerHTML = `
          <div class="mock-landing"><div class="hero pin-target" data-part="bg" style="background:#e8d9a8;color:#c9b673;">
            <h2 style="color:#d8cba0;">Aloita hakusi tänään</h2>
            <p style="color:#cdbf98;">Anonyymi, taitopohjainen haku.</p>
            <button class="pin-target" data-part="button" style="background:#e0d4a6;color:#f0e8cc;">Aloita</button>
          </div></div>`;
        comments.innerHTML = `<div class="design-comment" style="color:#948f7c;">Klikkaa kankaalla kohtaa jossa on ongelma.</div>`;

        return new Promise(resolve => {
          canvas.querySelectorAll('.pin-target').forEach(node => {
            node.style.cursor = 'pointer';
            node.addEventListener('click', function onClick(){
              if(node.dataset.used) return;
              const row = Engine.el(`<div class="comment-input-row"><input type="text" placeholder="Miksi tämä on ongelma, ja mitä muuttaisit?"><button class="btn primary">Lähetä</button></div>`);
              node.after(row);
              const input = row.querySelector('input');
              input.focus();
              row.querySelector('button').addEventListener('click', async () => {
                const text = input.value.trim();
                if(!text) return;
                row.remove();
                node.dataset.used = '1';
                comments.querySelectorAll('.design-comment').forEach(c => { if(c.textContent.includes('Klikkaa')) c.remove(); });
                comments.insertAdjacentHTML('beforeend', `<div class="design-comment"><b>Sinä:</b> "${Engine.esc(text)}"</div>`);
                await Engine.wait(500);
                node.style.background = '#3a5a80';
                node.style.color = '#fff';
                canvas.querySelectorAll('h2, p').forEach(el2 => el2.style.color = '#fff');
                if(node.dataset.part === 'button'){ node.style.background = 'var(--dark)'; }
                comments.insertAdjacentHTML('beforeend', `<div class="design-comment">Kontrasti korjattu. Vaalea teksti vaalealla pohjalla ei erotu riittävästi — tämä ei ole vain makuasia, vaan osa sitä luetaanko sivua ylipäätään kunnolla.</div>`);
                comments.insertAdjacentHTML('beforeend', `<div class="design-comment" style="border-color:var(--green);">✓ Harjoitus 4 suoritettu.</div>`);
                resolve();
              });
            });
          });
        });
      },
    },
    {
      label: 'Harjoitus 5 · Rakenna kampanja alusta asti',
      run: async (container) => {
        const { canvas, comments } = Engine.renderDesignShell(container, { title: 'Uusi kampanja — tyhjästä' });
        canvas.innerHTML = `<p style="font-size:12.5px;color:#7a7768;">Tässä ei ole valmista pohjaa. Kirjoita alla olevaan kenttään koko ensimmäinen pyyntösi — minkälaisen sivun tarvitset ja kenelle.</p>
          <div style="margin-top:12px;"><textarea id="briefInput" rows="3" placeholder="Tarvitsen laskeutumissivun…" style="width:100%;border:1px solid var(--mid-gray);border-radius:8px;padding:9px 11px;font-family:'Poppins',sans-serif;font-size:13px;"></textarea>
          <button class="btn primary" id="briefSend" style="margin-top:8px;">Lähetä briiffi</button></div>
          <div id="canvasResult" style="margin-top:18px;"></div>`;
        comments.innerHTML = `<div class="design-comment" style="color:#948f7c;">Kommentit ilmestyvät tähän kun luonnos on valmis.</div>`;

        await new Promise(resolve => {
          canvas.querySelector('#briefSend').addEventListener('click', async function once(){
            const brief = canvas.querySelector('#briefInput').value.trim();
            if(!brief) return;
            canvas.querySelector('#briefSend').removeEventListener('click', once);
            canvas.querySelector('#briefSend').disabled = true;
            canvas.querySelector('#briefInput').disabled = true;
            await Engine.wait(700);
            canvas.querySelector('#canvasResult').innerHTML = `
              <div class="mock-landing"><div class="hero" style="background:var(--blue);color:#fff;">
                <h2 style="font-size:19px;">Ensimmäinen luonnos</h2>
                <p>Briiffisi pohjalta rakennettu lähtökohta.</p>
                <button style="background:var(--dark);color:#fff;">Toiminto</button>
              </div></div>`;
            comments.innerHTML = `<div class="design-comment">Luonnos valmis briiffisi pohjalta. Nyt sama työtapa kuin harjoituksessa 1: klikkaa elementtiä ja kommentoi, kunnes sivu vastaa mielikuvaasi.</div>`;
            resolve();
          });
        });

        const hero = canvas.querySelector('.hero');
        hero.classList.add('pin-target');
        hero.style.cursor = 'pointer';
        let edits = 0;
        await new Promise(resolve => {
          hero.addEventListener('click', function onClick(){
            if(canvas.querySelector('.comment-input-row')) return;
            const row = Engine.el(`<div class="comment-input-row"><input type="text" placeholder="Mitä muuttaisit?"><button class="btn primary">Lähetä</button></div>`);
            hero.after(row);
            row.querySelector('input').focus();
            row.querySelector('button').addEventListener('click', async () => {
              const text = row.querySelector('input').value.trim();
              if(!text) return;
              row.remove();
              comments.insertAdjacentHTML('beforeend', `<div class="design-comment"><b>Sinä:</b> "${Engine.esc(text)}"</div>`);
              await Engine.wait(400);
              const lower = text.toLowerCase();
              if(/lämpi|orans|puna/.test(lower)) hero.style.background = 'var(--orange)';
              else if(/vihre/.test(lower)) hero.style.background = 'var(--green)';
              else if(/tumma|musta/.test(lower)) hero.style.background = 'var(--dark)';
              edits++;
              if(edits >= 2){
                comments.insertAdjacentHTML('beforeend', `<div class="design-comment" style="border-color:var(--green);">✓ Harjoitus 5 suoritettu. Kaksi kommenttia, nolla uutta promptia alusta asti — koko sivu rakentui yhden keskustelun sisällä.</div>`);
                resolve();
              } else {
                comments.insertAdjacentHTML('beforeend', `<div class="design-comment">Muutettu. Klikkaa vielä kerran, jos haluat hioa lisää.</div>`);
              }
            });
          });
        });
      },
    },
  ],
});
