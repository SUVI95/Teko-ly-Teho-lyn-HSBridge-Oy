#!/usr/bin/env python3
from pathlib import Path

path = Path(__file__).resolve().parents[1] / "moduuli-ai-tyokalut-tutuksi.html"
text = path.read_text(encoding="utf-8")

start = text.index('    <div class="practice-wrap">\n      <div class="practice-header" style="background:var(--gemini);">')
end = text.index('  </div>\n</section>\n\n<section class="section section-alt" id="vertailu"', start)

new_block = """    <div style="background:rgba(66,133,244,.08);border:1px solid rgba(66,133,244,.2);border-radius:10px;padding:1rem 1.25rem;margin-bottom:1.5rem;">
      <strong style="display:block;color:var(--ink);font-size:.88rem;margin-bottom:.35rem;">💡 Kouluttajalle</strong>
      <p style="font-size:.85rem;color:var(--muted);line-height:1.65;margin:0;">Voit näyttää vaiheet livessä. Jos videogenerointi ei ole käytössä, riittää Reels-käsikirjoitus + storyboard — opiskelija voi kuvata puhelimella.</p>
    </div>
    <div class="practice-wrap">
      <div class="practice-header" style="background:var(--gemini);"><div class="practice-header-icon" style="background:rgba(255,255,255,.2);border-color:rgba(255,255,255,.3);">📱</div><div class="practice-header-text"><h3>Harjoitus: Juliste + Instagram Reels</h3><p>Kolme askelta — sama aihe, somevalmis lopputulos.</p></div></div>
      <div class="practice-body">
        <p style="font-size:.9rem;color:var(--ink);margin-bottom:1rem;line-height:1.7;"><strong>Tehtävä:</strong> Avaa <a href="https://gemini.google.com" target="_blank" style="color:var(--gemini);font-weight:600;">gemini.google.com</a> (kirjaudu Gmail-tilillä). Tee kolme promptia peräkkäin — sama kampanja-aihe koko putkessa.</p>
        <p style="font-size:.88rem;font-weight:600;color:var(--gemini);margin-bottom:.75rem;">Kampanja-aihe: <em>Tekoäly arjessa ja työnhaussa — 3 tapaa aloittaa tänään</em></p>

        <div style="display:flex;flex-direction:column;gap:.6rem;margin-bottom:1.25rem;">
          <div style="display:flex;gap:12px;font-size:.88rem;color:var(--ink);padding:.7rem;background:var(--paper);border-radius:8px;border-left:3px solid var(--gemini);"><span style="font-weight:700;color:var(--gemini);min-width:22px;">1</span><span><strong>Tausta</strong> — kerää 3 faktapohjaista pointtia julistetta ja videota varten</span></div>
          <div style="display:flex;gap:12px;font-size:.88rem;color:var(--ink);padding:.7rem;background:var(--paper);border-radius:8px;border-left:3px solid var(--gemini);"><span style="font-weight:700;color:var(--gemini);min-width:22px;">2</span><span><strong>Juliste</strong> — luo kuva (1080×1350, Instagram-some)</span></div>
          <div style="display:flex;gap:12px;font-size:.88rem;color:var(--ink);padding:.7rem;background:var(--paper);border-radius:8px;border-left:3px solid var(--gemini);"><span style="font-weight:700;color:var(--gemini);min-width:22px;">3</span><span><strong>Reels</strong> — lyhyt video tai käsikirjoitus + kuvasarja</span></div>
        </div>

        <div class="prompt-block" style="border-left-color:var(--gemini);margin-bottom:1rem;">
          <div class="prompt-label" style="color:var(--gemini);">Prompti 1 — Taustatutkimus (teksti)</div>
          <div class="prompt-text" id="geminiPromptResearch">Olen tekemässä somekampanjaa aiheesta "Tekoäly arjessa ja työnhaussa — 3 tapaa aloittaa tänään". Etsi netistä tuoretta tietoa ja anna: 1) kolme lyhyttä faktaa tai trendiä Suomesta, 2) kolme konkreettista vinkkiä tavalliselle ihmiselle, 3) yksi lause iskulauseeksi julisteeseen. Vastaa suomeksi, selkeästi ja lyhyesti.</div>
          <button class="copy-resp-btn" onclick="copyText(this,document.getElementById('geminiPromptResearch').textContent)">📋 Kopioi prompti 1</button>
        </div>

        <div class="prompt-block" style="border-left-color:var(--gemini);margin-bottom:1rem;">
          <div class="prompt-label" style="color:var(--gemini);">Prompti 2 — Juliste (kuva)</div>
          <div class="prompt-text" id="geminiPromptPoster">Luo somejuliste kuvana aiheesta "Tekoäly arjessa ja työnhaussa — 3 tapaa aloittaa tänään". Mitat: 1080×1350 px (Instagram). Tyyli: moderni, nuorekas, luotettava. Värit: sininen ja vihreä. Sisällytä iskulause suomeksi (esim. "AI ei korvaa sinua — se nopeuttaa sinua"). Selkeä typografia, ei sekavaa tekstiä, ei päällekkäisiä elementtejä. Sopii työnhakijoille ja nuorille aikuisille.</div>
          <button class="copy-resp-btn" onclick="copyText(this,document.getElementById('geminiPromptPoster').textContent)">📋 Kopioi prompti 2</button>
        </div>

        <div class="prompt-block" style="border-left-color:var(--gemini);margin-bottom:1rem;">
          <div class="prompt-label" style="color:var(--gemini);">Prompti 3 — Instagram Reels (video)</div>
          <div class="prompt-text" id="geminiPromptReels">Luo 20–30 sekunnin Instagram Reels -video aiheesta "Tekoäly arjessa ja työnhaussa — 3 tapaa aloittaa tänään". Pystyvideo 9:16. Tyyli: innostava, selkeä, nuorekas. Rakenne: hook ensimmäiset 3 sekuntia, sitten 3 lyhyttä vinkkiä (yksi per kohta), lopuksi kehotus "Kokeile tänään". Tekstitykset suomeksi. Jos et voi luoda videota, anna sen sijaan: täydellinen käsikirjoitus + kohtauskohtainen storyboard (mitä näkyy ruudulla joka kohtauksessa) + ehdotetut on-screen-tekstit.</div>
          <button class="copy-resp-btn" onclick="copyText(this,document.getElementById('geminiPromptReels').textContent)">📋 Kopioi prompti 3</button>
        </div>

        <div style="background:rgba(66,133,244,.06);border:1px solid rgba(66,133,244,.15);border-radius:10px;padding:1.25rem;margin-bottom:1rem;">
          <strong style="display:block;color:var(--ink);margin-bottom:.5rem;">Vinkit Geminiin kuvaan ja videoon:</strong>
          <ul style="list-style:none;font-size:.88rem;color:var(--muted);display:flex;flex-direction:column;gap:.4rem;">
            <li>→ <strong>Kuva:</strong> valitse "Luo kuva" / Image generation jos näkyy — tai liitä prompti 2 suoraan chattiin</li>
            <li>→ <strong>Video:</strong> kokeile "Video" / Veo -toimintoa jos tililläsi on — muuten käytä käsikirjoitusta + kuvaa puhelimella (CapCut, Instagram)</li>
            <li>→ Tallenna juliste ja video (tai storyboard) — tarkista ettei teksti mene ruudun ulkopuolelle</li>
          </ul>
        </div>

        <div class="teams-box"><strong style="display:block;color:var(--ink);margin-bottom:.5rem;">Teams-tehtävä:</strong><p style="font-size:.88rem;color:var(--muted);">Jaa: 1) Juliste (kuva) 2) Reels-video TAI käsikirjoitus + storyboard 3) Mikä yllätti — onnistuiko video vai pitikö improvisoida?</p></div>
      </div>
    </div>"""

path.write_text(text[:start] + new_block + text[end:], encoding="utf-8")
print("Patched OK")
