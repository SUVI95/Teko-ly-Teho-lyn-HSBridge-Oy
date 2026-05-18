#!/usr/bin/env python3
from pathlib import Path

path = Path(__file__).resolve().parents[1] / "moduuli-ai-tyokalut-tutuksi.html"
text = path.read_text(encoding="utf-8")

start = text.find('<section class="section section-alt" id="copilot"')
end = text.find('<section class="section" id="gemini"', start)
if start == -1 or end == -1:
    raise SystemExit(f"markers not found: {start}, {end}")

new_section = r'''<section class="section section-alt" id="copilot" data-index="6">
  <div class="section-inner fade-up">
    <div class="section-label" style="color:var(--copilot);">Osa 6: Copilot</div>
    <h2 class="section-h2">Copilot on<br><em>Microsoft-maailman avain</em></h2>
    <div class="divider" style="background:var(--copilot);"></div>
    <div class="prose" style="margin-bottom:2rem;"><p>Copilotin <strong>suurin vahvuus</strong> ei ole pelkkä chat — vaan se toimii <strong>suoraan Wordissa, Excelissä ja PowerPointissa</strong>. Se luo taulukoita, dokumentteja ja dioja paikallaan. ChatGPT ja Claude eivät tee tätä Microsoft-tiedostoihisi.</p></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.25rem;margin-bottom:2rem;">
      <div style="background:#fff;border-radius:10px;padding:1.25rem;border:1px solid var(--border);"><strong style="color:var(--copilot);display:block;margin-bottom:.5rem;">Vahvuudet</strong><ul style="list-style:none;font-size:.88rem;color:var(--muted);display:flex;flex-direction:column;gap:.4rem;"><li>✅ Excel — taulukot, kaavat, budjetit</li><li>✅ Word — raportit, hakemukset, kirjaukset</li><li>✅ PowerPoint — diat ja esitykset</li><li>✅ Copilot myös selaimessa (nettihaku)</li></ul></div>
      <div style="background:#fff;border-radius:10px;padding:1.25rem;border:1px solid var(--border);"><strong style="color:var(--accent2);display:block;margin-bottom:.5rem;">Huomio</strong><ul style="list-style:none;font-size:.88rem;color:var(--muted);display:flex;flex-direction:column;gap:.4rem;"><li>⚠️ Word/Excel/PPT-Copilot vaatii usein Microsoft 365 -tilin</li><li>⚠️ Jos ei näy Copilot-painiketta: käytä <a href="https://www.office.com" target="_blank" style="color:var(--copilot);">office.com</a> kirjautuneena</li><li>⚠️ Vaihtoehto: Copilot-chat luo sisällön → liitä Officeen</li></ul></div>
    </div>
    <div style="background:rgba(0,120,212,.08);border:1px solid rgba(0,120,212,.2);border-radius:10px;padding:1rem 1.25rem;margin-bottom:1.5rem;">
      <strong style="display:block;color:var(--ink);font-size:.88rem;margin-bottom:.35rem;">💡 Kouluttajalle</strong>
      <p style="font-size:.85rem;color:var(--muted);line-height:1.65;margin:0;">Voit näyttää yhden Office-esimerkin livessä (esim. Excel-budjetti). Opiskelijat valitsevat oman ohjelman — tai seuraavat demoa ja tekevät kotona.</p>
    </div>
    <div class="practice-wrap">
      <div class="practice-header" style="background:var(--copilot);"><motion class="practice-header-icon" style="background:rgba(255,255,255,.2);border-color:rgba(255,255,255,.3);">📊</div><div class="practice-header-text"><h3>Harjoitus: Luo oikea tiedosto Copilotilla</h3><p>Valitse Excel, Word tai PowerPoint — ja rakenna jotain konkreettista.</p></div></div>
      <div class="practice-body">
        <p style="font-size:.9rem;color:var(--ink);margin-bottom:1rem;line-height:1.7;"><strong>Tehtävä:</strong> Avaa <a href="https://www.office.com" target="_blank" style="color:var(--copilot);font-weight:600;">office.com</a> → kirjaudu Microsoft-tilillä → valitse ohjelma. Klikkaa <strong>Copilot</strong>-kuvaketta nauhassa. Kopioi alla oleva prompti valitsemaasi ohjelmaan.</p>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:.75rem;margin-bottom:1.5rem;">
          <div style="background:var(--paper);border:2px solid var(--copilot);border-radius:10px;padding:1rem;text-align:center;">
            <div style="font-size:1.5rem;margin-bottom:.35rem;">📗</div>
            <strong style="font-size:.9rem;color:var(--copilot);">Excel</strong>
            <p style="font-size:.78rem;color:var(--muted);margin-top:.35rem;">Kuukausibudjetti tai tehtävälista</p>
          </div>
          <div style="background:var(--paper);border:1px solid var(--border);border-radius:10px;padding:1rem;text-align:center;">
            <div style="font-size:1.5rem;margin-bottom:.35rem;">📄</div>
            <strong style="font-size:.9rem;color:var(--copilot);">Word</strong>
            <p style="font-size:.78rem;color:var(--muted);margin-top:.35rem;">Hakemus tai lyhyt raportti</p>
          </div>
          <div style="background:var(--paper);border:1px solid var(--border);border-radius:10px;padding:1rem;text-align:center;">
            <div style="font-size:1.5rem;margin-bottom:.35rem;">📽️</div>
            <strong style="font-size:.9rem;color:var(--copilot);">PowerPoint</strong>
            <p style="font-size:.78rem;color:var(--muted);margin-top:.35rem;">5 diaa: AI arjessa</p>
          </div>
        </div>

        <p style="font-size:.88rem;font-weight:600;color:var(--ink);margin-bottom:.75rem;">Vaiheet (sama kaikissa):</p>
        <div style="display:flex;flex-direction:column;gap:.6rem;margin-bottom:1.5rem;">
          <div style="display:flex;gap:12px;font-size:.88rem;color:var(--ink);padding:.7rem;background:var(--paper);border-radius:8px;"><span style="font-weight:700;color:var(--copilot);min-width:22px;">1.</span><span>Avaa tyhjä tiedosto (Excel / Word / PowerPoint)</span></div>
          <div style="display:flex;gap:12px;font-size:.88rem;color:var(--ink);padding:.7rem;background:var(--paper);border-radius:8px;"><span style="font-weight:700;color:var(--copilot);min-width:22px;">2.</span><span>Etsi <strong>Copilot</strong> -painike yläreunan nauhasta</span></div>
          <div style="display:flex;gap:12px;font-size:.88rem;color:var(--ink);padding:.7rem;background:var(--paper);border-radius:8px;"><span style="font-weight:700;color:var(--copilot);min-width:22px;">3.</span><span>Liitä prompti → hyväksy ehdotus → muokkaa tarvittaessa</span></div>
          <div style="display:flex;gap:12px;font-size:.88rem;color:var(--ink);padding:.7rem;background:var(--paper);border-radius:8px;"><span style="font-weight:700;color:var(--copilot);min-width:22px;">4.</span><span>Tallenna tiedosto (Tiedosto → Tallenna nimellä)</span></div>
        </div>

        <div class="prompt-block" style="border-left-color:var(--copilot);margin-bottom:1rem;">
          <div class="prompt-label" style="color:var(--copilot);">Prompti — Excel (kuukausibudjetti)</div>
          <div class="prompt-text" id="copilotPromptExcel">Luo kuukausibudjetin taulukko opiskelijalle tai työnhakijalle. Sarakkeet: Kategoria, Suunniteltu (€), Todellinen (€), Ero. Rivit vähintään: Asuminen, Ruoka, Liikenne, Puhelin/internet, Vapaa-aika, Säästöt. Lisää yhteissummat kaavoilla. Käytä selkeitä otsikoita ja värikoodattuja otsikkorivejä. Vastaa suomeksi.</div>
          <button class="copy-resp-btn" onclick="copyText(this,document.getElementById('copilotPromptExcel').textContent)">📋 Kopioi Excel-prompti</button>
        </div>

        <div class="prompt-block" style="border-left-color:var(--copilot);margin-bottom:1rem;">
          <div class="prompt-label" style="color:var(--copilot);">Prompti — Word (lyhyt raportti)</div>
          <div class="prompt-text" id="copilotPromptWord">Luo ammattimainen Word-dokumentti aiheesta: "Miten tekoäly voi auttaa työnhakijaa — 3 konkreettista vinkkiä". Rakenne: otsikko, lyhyt johdanto, 3 numeroitua osiota (hakemus, haastattelu, arjen automaatio), lyhyt yhteenveto. Noin 1 sivu, selkeät alaotsikot, ammattimainen suomi. Ei päällekkäistä tekstiä.</div>
          <button class="copy-resp-btn" onclick="copyText(this,document.getElementById('copilotPromptWord').textContent)">📋 Kopioi Word-prompti</button>
        </div>

        <div class="prompt-block" style="border-left-color:var(--copilot);margin-bottom:1rem;">
          <div class="prompt-label" style="color:var(--copilot);">Prompti — PowerPoint (5 diaa)</div>
          <div class="prompt-text" id="copilotPromptPpt">Luo 5-dian PowerPoint-esitys aiheesta "Tekoäly arjessa — miten tavallinen ihminen hyötyy". Dia 1: otsikko. Dia 2–4: yksi käytännön esimerkki per dia (viestit, budjetti, työnhaku). Dia 5: yhteenveto. Moderni ulkoasu, lyhyet bulletit, sininen värimaailma. Suomeksi.</motion>
          <button class="copy-resp-btn" onclick="copyText(this,document.getElementById('copilotPromptPpt').textContent)">📋 Kopioi PowerPoint-prompti</button>
        </div>

        <div style="background:rgba(0,120,212,.06);border:1px solid rgba(0,120,212,.15);border-radius:10px;padding:1.25rem;margin-bottom:1rem;">
          <strong style="display:block;color:var(--ink);margin-bottom:.5rem;">Ei Copilot-painiketta Officessa?</strong>
          <p style="font-size:.88rem;color:var(--muted);line-height:1.6;margin:0;">Avaa <a href="https://copilot.microsoft.com" target="_blank" style="color:var(--copilot);font-weight:600;">copilot.microsoft.com</a>, kopioi sama prompti, pyydä: <em>"Muotoile tämä [Excel-taulukoksi / Word-asiakirjaksi / PowerPoint-esitykseksi]"</em> — liitä tulos Office-ohjelmaan.</p>
        </div>

        <div style="background:var(--paper);border-radius:10px;padding:1.25rem;border:1px solid var(--border);margin-bottom:1rem;">
          <strong style="display:block;color:var(--ink);margin-bottom:.5rem;">Mitä opit tästä:</strong>
          <ul style="list-style:none;font-size:.88rem;color:var(--muted);display:flex;flex-direction:column;gap:.4rem;">
            <li>→ Copilot luo <strong>oikean tiedoston</strong> — ei vain chat-vastauksen</li>
            <li>→ Excel, Word ja PowerPoint ovat Copilotin kotikenttä</li>
            <li>→ Tämä on taito jota toimistoissa käytetään päivittäin</li>
          </ul>
        </div>
        <div class="teams-box"><strong style="display:block;color:var(--ink);margin-bottom:.5rem;">Teams-tehtävä:</strong><p style="font-size:.88rem;color:var(--muted);">Jaa luomasi tiedosto (tai kuvakaappaus). Kerro: 1) Kumpaa ohjelmaa käytit? 2) Mitä Copilot loi? 3) Muokkasitko jotain itse?</p></div>
      </div>
    </div>
  </div>
</section>

'''

new_section = new_section.replace('<motion ', '<motion ').replace('</motion>', '</motion>')
# fix motion typos
new_section = new_section.replace('<motion ', '<div ').replace('</motion>', '</div>')

text = text[:start] + new_section + text[end:]

# summary checklist
text = text.replace(
    '<li style="display:flex;gap:10px;font-size:.95rem;color:var(--text);"><span style="color:var(--accent3);font-weight:700;">✓</span> Hait tuoretta tietoa Copilotilla ja Geminillä</li>',
    '<li style="display:flex;gap:10px;font-size:.95rem;color:var(--text);"><span style="color:var(--accent3);font-weight:700;">✓</span> Loit tiedoston Copilotilla (Excel, Word tai PowerPoint)</li>'
)

# gemini jatkotehtävä
text = text.replace(
    'Kopioi sama prompti Copilotiin. Kumpi antoi paremmat esimerkit?',
    'Vertaa: löysikö Gemini parempia esimerkkejä kuin ChatGPT samalla promptilla?'
)

path.write_text(text, encoding='utf-8')
print('Copilot section patched OK')
