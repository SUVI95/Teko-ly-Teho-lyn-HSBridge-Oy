window.PILLARS = window.PILLARS || [];

/** Filenames only — student does not see contents until Claude opens a file. */
const COWORK_DOCS = [
  {id:'d01', label:'scan_0412.pdf', sublabel:'12.4. · 240 kt', icon: null, correct:false},
  {id:'d02', label:'IMG_8841.jpg', sublabel:'puhelin', icon: null, correct:false},
  {id:'d03', label:'lasku_2026-03_nordlog.pdf', sublabel:'maalis', icon: null, correct:true},
  {id:'d04', label:'muistio_tmp.docx', sublabel:'luonnos', icon: null, correct:false},
  {id:'d05', label:'sopimus_toimitus_v3_FINAL.docx', sublabel:'v3', icon: null, correct:true},
  {id:'d06', label:'kuitti_rautakauppa.jpg', sublabel:'kuva', icon: null, correct:true},
  {id:'d07', label:'esitys_q1_vanha.pptx', sublabel:'2025', icon: null, correct:false},
  {id:'d08', label:'lasku_2026-04_nordlog.pdf', sublabel:'huhti', icon: null, correct:true},
  {id:'d09', label:'readme_asennus.txt', sublabel:'txt', icon: null, correct:false},
  {id:'d10', label:'vuokrasopimus_varasto_2026.pdf', sublabel:'PDF', icon: null, correct:true},
  {id:'d11', label:'tiimi_kevat.jpg', sublabel:'kuva', icon: null, correct:false},
  {id:'d12', label:'palaveri_muistiinpanot_04.txt', sublabel:'txt', icon: null, correct:false},
  {id:'d13', label:'lasku_2026-02_nordlog.pdf', sublabel:'helmi', icon: null, correct:true},
  {id:'d14', label:'palkkalaskelmat_HR.xlsx', sublabel:'HR', icon: null, correct:false},
  {id:'d15', label:'toimitussopimus_allekirjoitettu.pdf', sublabel:'PDF', icon: null, correct:true},
  {id:'d16', label:'kuitti_hotelli_tampere.jpg', sublabel:'kuva', icon: null, correct:true},
  {id:'d17', label:'budget_draft_IGNORE.xlsx', sublabel:'xlsx', icon: null, correct:false},
  {id:'d18', label:'lasku_2026-01_nordlog.pdf', sublabel:'tammi', icon: null, correct:true},
  {id:'d19', label:'terveystarkastukset_henkilosto.pdf', sublabel:'HR', icon: null, correct:false},
  {id:'d20', label:'sopimus_luonnos_v2.docx', sublabel:'v2 · vanha', icon: null, correct:false},
];

function pickerItems(docs){
  return docs.map(d => ({
    id: d.id,
    label: d.label,
    sublabel: d.sublabel,
    icon: Engine.ICONS.file,
  }));
}
function correctIds(docs){
  return docs.filter(d => d.correct).map(d => d.id);
}
function labelsFor(docs, ids){
  const set = new Set(ids);
  return docs.filter(d => set.has(d.id)).map(d => d.label);
}

/* ---------- messy source documents (openable in panel) ---------- */

const COMPETITOR_BRIEF = `INTERNAL — do not forward
Product: Northline Ops (B2B field-service scheduling)
Date: 2026-08-03 / author: Mira K. (product)
Status: rough notes for research handoff — NOT a finished brief

We need a competitor snapshot before the board pack.
Three names kept coming up in sales calls (spelling may be wrong):

1) FieldSync Pro
   - heard "mid-market", maybe usage-based pricing?
   - someone said they launched AI dispatch last quarter — verify
2) RouteHive
   - Nordic? Or US with EU entity? unclear
   - supposedly strong mobile app, weak reporting
3) ServiceGrid Cloud
   - enterprise-y, long sales cycle
   - rumoured per-seat + platform fee; also "connectors marketplace"

TODO for whoever runs this:
- pull LATEST pricing models (public pages / pricing / blog — not last year's PDF)
- feature sets that matter to us: scheduling, offline mobile, integrations, reporting
- who they sell to (SMB / mid / enterprise) + any vertical focus
- put a clean comparative deliverable back INTO THIS SAME FOLDER
  (excel or markdown — board-readable)

Noise / ignore for now:
- old "comp_matrix_2023.xlsx" in Marketing/ is stale
- do NOT touch HR_private/
- Slack dump in Inbox_dumps/ is unrelated

— end of notes —`;

const SLA_DRAFT = `SERVICE LEVEL AGREEMENT — DRAFT v0.7 (INTERNAL)
Parties: Client ("Customer") and Vendor ("Provider")
Effective: upon signature | Governing law: Finland | Language: English

1. Scope of Services
Provider shall supply the SaaS platform and standard support during Business Hours
(Mon–Fri 09:00–17:00 EET), excluding public holidays in Finland.

2. Uptime Commitment
Provider targets 99.5% monthly uptime excluding Scheduled Maintenance and Force Majeure.
Credits: if uptime falls below 99.5%, Customer may request a service credit of 2% of
the monthly fee for that month, capped at 10% of the monthly fee in any calendar year.
Credits are Customer's sole remedy for downtime.

3. Liability Cap  *** REVIEW ***
EXCEPT FOR GROSS NEGLIGENCE OR WILLFUL MISCONDUCT, PROVIDER'S TOTAL AGGREGATE
LIABILITY ARISING OUT OF OR RELATED TO THIS AGREEMENT SHALL NOT EXCEED THE FEES
PAID BY CUSTOMER IN THE ONE (1) MONTH IMMEDIATELY PRECEDING THE CLAIM. THIS CAP
APPLIES TO ALL CLAIMS IN THE AGGREGATE. CUSTOMER ACKNOWLEDGES THIS CAP IS A
MATERIAL TERM OF THE PRICING.

4. Data Processing
Provider processes personal data as processor per DPA (Annex B). Customer remains
controller. Sub-processors listed at provider.example/legal/subprocessors (as updated).

5. Auto-Renewal & Early Termination  *** REVIEW ***
This Agreement renews automatically for successive twelve (12) month terms unless
Customer gives written notice of non-renewal at least one hundred twenty (120) days
before the then-current term ends. If Customer terminates for convenience during a
renewal term, Customer shall pay an early-termination fee equal to one hundred
percent (100%) of the fees remaining for the unexpired portion of that term, plus
a reconnection fee of EUR 15,000 if services are restarted within 18 months.

6. Indemnity (Customer)  *** REVIEW ***
Customer shall indemnify, defend and hold harmless Provider from and against any
and all claims, damages, losses and expenses (including reasonable attorneys' fees)
arising from: (a) Customer Data; (b) Customer's use of the Services; (c) any third-
party claim alleging that Customer Data infringes IP; and (d) any regulatory fine
imposed on Provider to the extent caused by Customer's instructions — WITHOUT
REGARD TO PROVIDER'S CONCURRENT NEGLIGENCE.

7. Support Response
P1: 4 business hours | P2: 1 business day | P3: 3 business days (best effort).

8. Miscellaneous
Entire agreement; amendments in writing; assignment with consent (not unreasonably
withheld). Notices by email to legal@… are sufficient.

[END DRAFT — track changes not applied — do not send to customer]`;

const KPI_CSV = `month,marketing_spend_eur,leads,sqls,win_rate_pct,mrr_eur,notes
2026-01,18400,312,41,18.2,42600,jan campaign cold
2026-02,17200,298,39,19.0,43150,slight dip spend
2026-03,22100,401,58,21.4,45800,webinar series
2026-04,19850,356,47,17.9,46220,pricing test A/B
2026-05,24500,448,66,22.1,48990,partner co-marketing
2026-06,21000,390,52,20.5,50110,q2 close push
# trailing comments / messy export from HubSpot × Sheets merge
# owner: growth@…  exported 2026-07-02 23:11
# DO NOT delete header row`;

const KPI_CSV_AUG = `month,marketing_spend_eur,leads,sqls,win_rate_pct,mrr_eur,notes
2026-01,18400,312,41,18.2,42600,jan campaign cold
2026-02,17200,298,39,19.0,43150,slight dip spend
2026-03,22100,401,58,21.4,45800,webinar series
2026-04,19850,356,47,17.9,46220,pricing test A/B
2026-05,24500,448,66,22.1,48990,partner co-marketing
2026-06,21000,390,52,20.5,50110,q2 close push
2026-07,26800,512,74,23.8,53440,july launch + paid
# trailing comments / messy export from HubSpot × Sheets merge
# owner: growth@…  exported 2026-08-08 08:02
# DO NOT delete header row`;

const PRODUCT_BRIEF = `PRODUCT BRIEF — Northline Ops  (WORKING DRAFT — paste dump from Notion)
Last touched: 2026-08-01  ·  owners: product + GTM  ·  CONFIDENTIAL

================================================================
0. Why this exists
================================================================
We are raising a seed extension / preparing a Series A narrative. Investors keep
asking for a crisp story: problem → solution → wedge → GTM → traction → ask.
Design needs a slide-by-slide copy pack AND a folder layout for assets so the
deck production doesn't live in one messy Google Doc.

This brief is intentionally messy. It is not a pitch. Extract what matters.

================================================================
1. Problem (customer language, lightly cleaned)
================================================================
Field-service SMBs (HVAC, elevators, industrial maintenance) still schedule jobs
in WhatsApp groups, Excel, and "the guy who knows the routes". Dispatchers spend
2–3 hours/day re-planning when a tech calls in sick. Customers get vague ETAs.
No-shows and wrong-part visits destroy margin. Existing enterprise FSAs are too
heavy; consumer job apps don't understand B2B contracts, SLAs, or parts inventory.

Quote from pilot (anonymised): "We don't need another CRM. We need Tuesday's
truck to leave with the right person and the right compressor."

================================================================
2. Product / solution
================================================================
Northline Ops = ops OS for field teams: AI-assisted dispatch, offline-first mobile
for techs, parts checklist tied to job type, customer ETA SMS, and a thin office
dashboard. Wedge: mid-market Nordic installers (20–120 techs) who already pay for
accounting software but not for full ServiceNow-class suites.

Differentiators we claim (validate in deck carefully):
- "Constraint-aware" dispatch (skills + parts + travel + SLA risk)
- Offline mobile that syncs without drama
- Implementation in weeks, not quarters
- Pricing that a ops manager can approve without a 6-month RFP

================================================================
3. Market / ICP
================================================================
ICP: Nordic + DACH field-service companies, 20–120 field employees, recurring
maintenance contracts, mix of reactive + planned work. Buyer: Head of Ops /
Owner-operator. Champion: lead dispatcher. Blocker: IT if they insist on SSO +
on-prem (we are cloud-only for now — say this carefully).

TAM handwave from old deck: "€4.2B addressable in EU field service software" —
do NOT put that number on a slide without a footnote; replace with a tighter wedge
narrative if needed.

================================================================
4. Traction (as of end of July — approximate, finance to confirm)
================================================================
- 14 paying logos (12 Nordic, 2 DACH)
- NRR ~112% (small base — don't overclaim)
- Pilot → paid conversion ~40% last two cohorts
- Median time-to-first-value: 11 days
- Logo churn: 1 account in 12 months (support gap, not product)
Open risk: two enterprise trials stalled on security questionnaire.

================================================================
5. Business model
================================================================
Seat + usage hybrid: platform fee + per-active-tech/month. Annual contracts
preferred. Professional services light (onboarding pack). Future: marketplace
connectors take rate (not live yet — don't promise).

================================================================
6. Competition (one-liners only — deeper research is a separate workstream)
================================================================
FieldSync Pro = broader mid-market, louder brand. RouteHive = mobile-strong.
ServiceGrid = enterprise. We win on speed of rollout + constraint dispatch for
our ICP. Avoid feature bingo slides.

================================================================
7. Team / ask / use of funds (placeholder)
================================================================
Team: 11 FTE (eng heavy). Ask: €XXm seed extension — USE OF FUNDS: 50% product
(dispatch ML + offline), 30% GTM (Nordic AE + CS), 20% runway buffer.
Replace €XXm with the number from the latest finance note before design starts.

================================================================
8. Design / production notes for the deck
================================================================
Need a 10-slide VC outline with HIGH-IMPACT copy per slide (not filler bullets).
Also need the WORKSPACE laid out physically for design:
  /Slide_01_…/ through /Slide_10_…/ each with placeholder notes for graphic assets
  (hero visual, chart, logo lockup, etc.) so design can drop files without renaming
chaos. Keep naming boring and sequential.

Random leftover from Notion that design should ignore:
- "purple gradient hero???" — no
- meme folder from offsite — no
- old PDF export pitch_v3_FINAL_really_final.pdf in Archive/ — ignore

================================================================
9. Tone
================================================================
Confident, concrete, slightly Nordic understated. No "revolutionary". No fake
precision. Prefer one sharp sentence over five soft ones.

— end of dump (~1k words of noise + signal) —`;

function folderPickerItems(folders){
  return folders.map(f => ({
    id: f.id,
    label: f.name,
    sublabel: f.sublabel,
    icon: Engine.ICONS.folder,
  }));
}

window.PILLARS.push({
  id: 'p1',
  num: 1,
  name: 'Cowork',
  subtitle: 'Files & folders',

  theory: {
    tagline: 'Cowork yhdistää paikallisen kansion, verkkohaun ja Live Artifactit samaan työtilaan — ei pelkkää chattia.',
    whatItDoes: 'Claude Cowork antaa tekoälyn <b>lukea, muokata ja luoda uusia tiedostoja</b> linkitettyyn paikalliseen kansioon. Samassa istunnossa se voi tehdä <b>live-verkkotutkimusta</b> (hakea ajantasaista tietoa netistä) ja rakentaa <b>Live Artifacteja</b> — pysyviä, päivittyviä työkaluja (kojelaudat, seurantataulukot), jotka jäävät sivupalkkiin keskustelun jälkeenkin.',
    howItWorks: 'Chat ja Cowork ovat sama sovellus: vaihdat tilaa viestikentän valitsimella. Annat Coworkille pääsyn kansioon. Claude työskentelee tiedostoilla suoraan — ei kopiointia chattiin. Peruuttamattomat toimet (siirto, poisto) vaativat vahvistuksen. Verkkohaku ja Artifactit kuuluvat samaan Cowork-työtilaan; Artifactit näkyvät <b>Live artifacts</b> -välilehdellä ja voivat päivittyä kun avaat ne uudelleen.',
    benefits: 'Yksi työtila: paikalliset tiedostot + tuore tieto verkosta + työkalu joka jää käyttöön. Sinä päätät kansion rajauksen ja vahvistat riskialttiit askeleet.',
    whereToUse: 'Kun aineisto on jo koneella (laskut, sopimukset, muistiot), kun tarvitset sekä tiedostoja että ajantasaista taustatietoa, tai kun haluat kojelaudan joka ei katoa chatin mukana.',
    capabilities: [
      {title: 'Paikallinen kansio', body: 'Lue, muokkaa ja luo tiedostoja linkitetyssä kansiossa — suoraan työasemallasi, ei vain tekstinä chatissa.'},
      {title: 'Live-verkkotutkimus', body: 'Hae ajantasaista tietoa netistä samassa Cowork-istunnossa, kun tehtävä sitä vaatii.'},
      {title: 'Live Artifacts', body: 'Rakenna dynaamisia työkaluja (kojelaudat, seurannat), jotka pysyvät sivupalkissa ja voivat päivittyä myöhemmin.'},
    ],
  },

  example: async (container) => {
    const { thread, panel, userInput } = Engine.renderChatShell(container, {
      sidebarHighlight: 'files',
      topbarTitle: 'Files & folders — Downloads',
      composerHint: 'Cowork · Downloads',
    });
    const demoFiles = [
      {name:'lasku_maaliskuu.pdf', type:'invoice'},
      {name:'sopimus_luonnos_v3.docx', type:'doc'},
      {name:'kuitti_0912.jpg', type:'image'},
      {name:'muistio_kokous.txt', type:'doc'},
      {name:'lasku_huhtikuu.pdf', type:'invoice'},
      {name:'tiimikuva_kevat.jpg', type:'image'},
      {name:'toimitussopimus_final.pdf', type:'doc'},
      {name:'lasku_helmikuu.pdf', type:'invoice'},
      {name:'vuokrasopimus_2026.pdf', type:'doc'},
      {name:'kuitti_1103.jpg', type:'image'},
      {name:'palaverimuistio_04.txt', type:'doc'},
      {name:'lasku_tammikuu.pdf', type:'invoice'},
    ];
    Engine.renderFileExplorerPanel(panel, demoFiles, {folderLabel:'Downloads'});

    Engine.addNarrator(thread, 'Katso, miten tämä etenee kokonaan — sinun ei tarvitse tehdä mitään. Harjoituksissa teet valinnat itse.');
    await Engine.wait(700);
    await Engine.simulateUserType(thread, userInput, 'Järjestä nämä tiedostot laskuihin, sopimuksiin ja kuviin');
    await Engine.addThinking(thread, 1300);
    await Engine.addAssistantMsg(thread, [
      'Kävin läpi Downloads-kansion 12 tiedostoa. Ne jakautuvat kolmeen ryhmään: laskut (4), sopimukset (4) ja kuvat (4).',
    ]);
    await Engine.addCard(thread, {
      title: 'Vahvistus tarvitaan',
      body: 'Luon kolme kansiota ja siirrän tiedostot niihin. Vahvistatko?',
      actions: [{id:'confirm', label:'Vahvista ja siirrä', primary:true}],
      auto: {ms: 1000, actionId: 'confirm'},
    });
    await Engine.runLiveWork(thread, {
      title: 'Claude järjestää kansion',
      steps: [
        {label:'Luetaan tiedostonimet', ms:500},
        {label:'Luodaan kansiot Laskut · Sopimukset · Kuvat', ms:600},
        {label:'Siirretään 12 tiedostoa', ms:700},
      ],
    });
    await Engine.animateSortIntoFolders(panel, [
      {name:'Laskut', type:'invoice'},
      {name:'Sopimukset', type:'doc'},
      {name:'Kuvat', type:'image'},
    ]);
    await Engine.addAssistantMsg(thread, ['Valmis. Kolme kansiota syntyi ja tiedostot ovat paikoillaan.']);
    Engine.addComplete(thread, 'Esimerkki päättyi. Avaa harjoitus 1 — siellä etsit oikeat tiedostot itse.');
  },

  exercises: [
    {
      label: 'H1 · Etsi ja järjestä',
      outcome: '9 oikeaa / 20 + kansiot',
      run: async (container) => {
        const { thread, panel, userInput, sendBtn } = Engine.renderChatShell(container, {
          sidebarHighlight: 'files',
          topbarTitle: 'Files & folders — Downloads (20 tiedostoa)',
          composerHint: 'Cowork · Downloads',
        });
        Engine.renderFileExplorerPanel(panel, COWORK_DOCS.map(d => ({
          name: d.label,
          type: d.label.includes('kuitti') || d.label.endsWith('.jpg') ? 'image' : d.label.includes('lasku') ? 'invoice' : 'doc',
        })), {folderLabel:'Downloads · 20'});

        Engine.addTaskBrief(thread, {
          title: 'H1 · Etsi oikeat tiedostot',
          situation: 'Downloadsissa on <b>20 tiedostoa</b>. Näet <b>vain nimet</b> — et sisältöä.',
          task: 'Valitse asiakasprojektin <b>laskut, sopimukset ja kuitit</b>. Vieritä ruudukkoa. Älä ota HR-tiedostoja, scanneja tai vanhoja esityksiä.',
          folderNote: 'Harhaanjohtavia: palkkalaskelmat_HR, terveystarkastukset, scan_0412, sopimus_luonnos_v2, budget_draft_IGNORE…',
          mustInclude: ['Tasan 9 oikeaa tiedostoa', 'Väärät pois'],
          example: 'Nimivihjeitä: nordlog+lasku · sopimus/toimitus/vuokra · kuitti_…',
        });

        const selected = await Engine.addPickerTask(thread, {
          items: pickerItems(COWORK_DOCS),
          correctIds: correctIds(COWORK_DOCS),
        });
        const names = labelsFor(COWORK_DOCS, selected);
        Engine.renderFileExplorerPanel(panel, names.map(n => ({
          name: n,
          type: n.includes('kuitti') || n.endsWith('.jpg') ? 'image' : n.includes('lasku') ? 'invoice' : 'doc',
        })), {folderLabel:`Valitut (${names.length})`});

        await Engine.runPromptStep(thread, userInput, sendBtn, {
          brief: {
            title: 'Toimeksianto valittuihin',
            situation: 'Valitsit 9 tiedostoa. Claude ei ole vielä avannut niitä.',
            task: 'Pyydä järjestämään ne kansioihin Laskut / Sopimukset / Kuitit.',
            mustInclude: ['Vain valitut', 'Kolme kansiota'],
            example: 'Järjestä valitut 9 tiedostoa: Laskut, Sopimukset, Kuitit. Ehdota ennen siirtoa.',
          },
          accept: ['järjest','lajitt','kansio','lasku','sopim','kuitti','valit','siirr'],
          clarifyText: 'Mainitse valitut ja kolme kansiota.',
        });

        await Engine.addThinking(thread, 800);
        await Engine.addAssistantMsg(thread, ['Ehdotus: Laskut 4 · Sopimukset 3 · Kuitit 2. Vahvistatko siirron?']);
        const action = await Engine.addCard(thread, {
          title: 'Vahvistus',
          body: 'Siirrän vain valitsemasi 9. Muut 11 Downloadsissa jäävät.',
          actions: [{id:'cancel', label:'Peruuta'}, {id:'confirm', label:'Vahvista siirto', primary:true}],
        });
        if(action === 'confirm'){
          await Engine.runLiveWork(thread, {
            title: 'Claude käsittelee valitut',
            steps: [
              {label:'Avataan tiedostot', detail:'sisältö aukeaa vasta nyt', ms:700},
              {label:'Luokitellaan', ms:500},
              {label:'Luodaan 3 kansiota + siirto', ms:700},
            ],
          });
          await Engine.animateSortIntoFolders(panel, [
            {name:'Laskut', type:'invoice'},
            {name:'Sopimukset', type:'doc'},
            {name:'Kuitit', type:'image'},
          ]);
          Engine.showOutcome(thread, {
            title: 'Tulos',
            lines: [
              {label:'Valitut / haettu', value: names.join('\n')},
              {label:'Rakenne', value:'Laskut 4 · Sopimukset 3 · Kuitit 2'},
            ],
          });
        }
        Engine.addComplete(thread, 'H1 valmis — etsit 9/20 nimestä, Claude teki työn.');
      },
    },

    /* ------------------------------------------------------------------ */
    {
      label: 'H2 · Kilpailijagrid',
      outcome: 'Verkkotutkimus → raportti + täydennys',
      run: async (container) => {
        const { thread, panel, userInput, sendBtn } = Engine.renderChatShell(container, {
          sidebarHighlight: 'files',
          topbarTitle: 'Files & folders — Company Drive',
          composerHint: 'Cowork · Company Drive',
        });

        const folders = [
          {id:'mkt', name:'Marketing/', sublabel:'kampanjat'},
          {id:'fin', name:'Finance_archive/', sublabel:'2024–25'},
          {id:'hr', name:'HR_private/', sublabel:'restricted'},
          {id:'compOld', name:'Competitive_scan_OLD/', sublabel:'2023–24'},
          {id:'comp', name:'Competitive_scan/', sublabel:'2026'},
          {id:'compNotes', name:'comp_notes_mira/', sublabel:'henkilökohtainen'},
          {id:'inbox', name:'Inbox_dumps/', sublabel:'slack · mail'},
          {id:'proj', name:'Projects_active/', sublabel:'käynnissä'},
        ];

        const ws = Engine.renderWorkspacePanel(panel, {
          rootLabel: 'Company Drive',
          pathHint: '/ Users/you/Company Drive',
          entries: [
            {id:'mkt', kind:'folder', name:'Marketing', meta:'4', children:[
              {id:'m1', kind:'file', name:'comp_matrix_2023.xlsx', type:'doc', meta:'2023', content:'STALE MATRIX 2023\nFieldSync | guess pricing\nRouteHive | ???\nServiceGrid | enterprise?\n\nDo NOT use for board — numbers are fiction from a workshop.'},
              {id:'m2', kind:'file', name:'brand_guidelines.pdf', type:'doc', meta:'PDF', content:'[PDF stub] Brand colors / logo clearspace. Not competitor research.'},
              {id:'m3', kind:'file', name:'competitor_rumors_slack.md', type:'doc', meta:'md', content:'# rumors\n"someone said FieldSync is free now" — unverified, ignore.'},
            ]},
            {id:'fin', kind:'folder', name:'Finance_archive', meta:'2', children:[
              {id:'f1', kind:'file', name:'budget_fy25.xlsx', type:'doc', meta:'xlsx', content:'FY25 budget lines — not for competitive work.'},
              {id:'f2', kind:'file', name:'invoice_batch_q1.pdf', type:'doc', meta:'PDF', content:'[PDF stub] Internal invoices.'},
            ]},
            {id:'hr', kind:'folder', name:'HR_private', meta:'restricted', children:[
              {id:'h1', kind:'file', name:'salaries_tmp.xlsx', type:'doc', meta:'HR', content:'CONFIDENTIAL PAYROLL EXPORT\nDo not open in Cowork without HR approval.\nname,role,salary\n…'},
              {id:'h2', kind:'file', name:'performance_notes.docx', type:'doc', meta:'HR', content:'Private performance notes. Out of scope for market research.'},
            ]},
            {id:'compOld', kind:'folder', name:'Competitive_scan_OLD', meta:'2', children:[
              {id:'o1', kind:'file', name:'competitors_brief_2024.txt', type:'doc', meta:'vanha', content:'OLD BRIEF 2024\nCompetitors then: FieldSync, TinyRoute (dead), ServiceGrid.\nPricing links broken. Do not refresh this file — use the 2026 scan folder.'},
              {id:'o2', kind:'file', name:'grid_draft_abandoned.md', type:'doc', meta:'md', content:'# abandoned\nHalf-written table. Wrong competitor list.'},
            ]},
            {id:'comp', kind:'folder', name:'Competitive_scan', meta:'3', children:[
              {id:'cbrief', kind:'file', name:'competitors_brief_ROUGH.txt', type:'doc', meta:'1.2 kt', content: COMPETITOR_BRIEF},
              {id:'c2', kind:'file', name:'README_todo.md', type:'doc', meta:'md', content:'# Competitive scan\nDrop research outputs here.\nDo not overwrite the rough brief until research is done.'},
              {id:'c3', kind:'file', name:'meeting_scribble.txt', type:'doc', meta:'txt', content:'jory: need grid before thursday\nmira has rough names in brief\nDON\'T pull salaries from HR to "enrich" ICP'},
            ]},
            {id:'compNotes', kind:'folder', name:'comp_notes_mira', meta:'personal', children:[
              {id:'n1', kind:'file', name:'scratch_names.txt', type:'doc', meta:'txt', content:'mira private scratch\nFieldSync?\nmaybe also "LaneOps" — not confirmed, do not research yet'},
            ]},
            {id:'inbox', kind:'folder', name:'Inbox_dumps', meta:'messy', children:[
              {id:'i1', kind:'file', name:'slack_export_random.txt', type:'doc', meta:'txt', content:'#slack dump\n[12:01] lol\n[12:02] wrong channel\n[12:03] lunch?'},
            ]},
            {id:'proj', kind:'folder', name:'Projects_active', meta:'2', children:[
              {id:'p1', kind:'file', name:'northline_roadmap.md', type:'doc', meta:'md', content:'# roadmap\nQ3 dispatch ML\nNot a competitor brief.'},
            ]},
          ],
        });

        Engine.addTaskBrief(thread, {
          title: 'H2 · Kilpailijatiedustelu',
          situation: 'Board-pakkaukseen tarvitaan ajantasainen kuva kilpailijoista. Drivessa on <b>useita samannäköisiä kansioita</b> — vanhoja, henkilökohtaisia ja arkaluonteisia. Yhdessä niistä on lyhyt paikallinen muistio (nimet / vihjeet). Voit avata tiedostoja oikealta; avautuminen ei tarkoita että kansio on oikea.',
          outcome: 'Claude tekee Coworkissa kolme asiaa: (1) lukee paikallisen muistion, (2) hakee <b>uutta tietoa internetistä</b> (ei vanhaa Drive-taulukkoa), (3) <b>tallentaa uuden vertailutiedoston samaan työkansioon</b>. Työ ei saa levittäytyä HR- tai muihin arkaluonteisiin kansioihin.',
          folderNote: 'Skimmaa kansioita ja valitse työkansio. Promptin kirjoitat itse — tämä briiffi kertoo vain mitä lopputulokselta vaaditaan, ei valmista lausetta.',
          mustInclude: [
            'Promptissa: verkko / uusi tieto + tallennus kansioon',
            'Oma muotoilu (ei copy-paste tästä briiffistä)',
            'Turvarajaus: mitä Claude EI saa avata',
            'Huomaa jos toimitus on vaja',
          ],
          nextHint: '↓ Valitse kansio → kirjoita oma toimeksianto Claudelle.',
        });

        await Engine.addPickerTask(thread, {
          items: folderPickerItems(folders),
          correctIds: ['comp'],
        });

        await Engine.runOwnPrompt(thread, userInput, sendBtn, {
          brief: {
            title: 'Kirjoita oma toimeksianto',
            situation: 'Valitsit kansion. Claude odottaa ohjetta — se ei arvaa rajauksia eikä tiedä että tarvitset <b>verkkoa + uuden tiedoston</b>, ellet sano sitä.',
            outcome: 'Paikallinen muistio + tuore nettitieto → uusi tiedosto samaan kansioon.',
            mustInclude: [
              'Mainitse työkansio omin sanoin',
              'Pyydä hakemaan uutta tietoa internetistä (ei vain vanhaa Drive-dataa)',
              'Pyydä tallentamaan uusi vertailu / raportti siihen kansioon',
              'Turvarajaus (esim. mitä EI saa avata)',
            ],
            nextHint: '↓ Composer — kirjoita itse. Briiffin lauseiden liimaus hylätään.',
          },
          minChars: 100,
          requireGroups: [
            ['competitive_scan', 'competitive scan', 'kilpail'],
            ['tutki', 'verk', 'web', 'internet', 'netti', 'live', 'hae', 'search'],
            ['tallen', 'kirjoita', 'save', 'kansio', 'folder', 'tiedost', 'md', 'raport'],
          ],
          requireSafety: ['hr', 'private', 'älä', 'ei koske', 'älä avaa', 'älä ylikirjoita', 'signed', 'allekirjoit', 'old', 'vanha', 'finance'],
          banSnippets: [
            'Valitse oikea työkansio listasta',
            'hakee uutta tietoa internetistä',
            'tallentaa uuden vertailutiedoston samaan työkansioon',
            'Claude tekee Coworkissa kolme asiaa',
            'Paikallinen muistio + tuore nettitieto',
          ],
        });

        await Engine.addAssistantMsg(thread, [
          'Ennen kuin jatkan: HR_private/ sisältää palkkatietoja, jotka voisivat “rikastaa” ICP-kuvausta. Avaanko sen taustaksi, vai rajataanko työ vain Competitive_scan -kansioon?',
        ]);
        await Engine.runSafetyGate(thread, {
          title: 'Permission / safety',
          body: 'Claude ehdottaa HR_private/ -kansion avaamista “paremman ICP:n” vuoksi.',
          safeLabel: 'Ei — älä avaa HR_private',
          unsafeLabel: 'Salli HR_private',
          unsafeFeedback: 'Palkka-aineisto ei kuulu kilpailijatutkimukseen. Valitse uudelleen: pidä Claude poissa HR_privateista.',
        });

        await Engine.runLiveWork(thread, {
          title: 'Claude työskentelee (rajattuna)',
          steps: [
            {label:'Avataan Competitive_scan/competitors_brief_ROUGH.txt', ms:800},
            {label:'Verkkohaku: FieldSync Pro — pricing', detail:'live web', ms:800},
            {label:'Verkkohaku: RouteHive — pricing + mobile', ms:700},
            {label:'Verkkohaku: ServiceGrid Cloud — features only', detail:'pricing page blocked / thin', ms:700},
            {label:'Kirjoitetaan competitor_grid.md', ms:700},
          ],
        });

        const reportPartial = `# competitor_grid.md — DRAFT (VAJA)

OK     FieldSync Pro     Pricing model = Usage tiers + seat add-on
OK     RouteHive         Pricing model = Per-tech / mo
PUUTTUU  ServiceGrid Cloud  Pricing model = ???   ← THIS CELL IS EMPTY

⚠️ NOT FOUND — ServiceGrid pricing page was login-walled
GAP: only ServiceGrid → Pricing model is missing
Everything else in the grid is already filled.

Do not invent numbers. Do not rebuild the whole grid.`;

        ws.addEntries('comp', [{
          id:'creport', kind:'file', name:'competitor_grid.md', type:'doc', meta:'1 solu puuttuu',
          content: reportPartial,
        }]);
        ws.openFile('creport');

        // Visual gap card in the thread — student should not hunt blindly in the md
        thread.appendChild(Engine.el(`
          <div class="card" style="border-color:#e0a060;background:#fff8ee;">
            <div class="card-title">Mitä puuttuu (katso myös oikea paneeli)</div>
            <p style="margin:0 0 8px;">Gridissä on 3 kilpailijaa. <b>Vain ServiceGrid Cloud → Pricing model</b> on tyhjä.</p>
            <table style="width:100%;font-size:12px;border-collapse:collapse;">
              <tr style="text-align:left;color:#948f7c;"><th style="padding:4px;">Kilpailija</th><th style="padding:4px;">Pricing model</th></tr>
              <tr><td style="padding:4px;">FieldSync Pro</td><td style="padding:4px;">Usage tiers + seat add-on ✓</td></tr>
              <tr><td style="padding:4px;">RouteHive</td><td style="padding:4px;">Per-tech / mo ✓</td></tr>
              <tr style="background:#ffe08a;font-weight:700;"><td style="padding:6px 4px;">ServiceGrid Cloud</td><td style="padding:6px 4px;">??? PUUTTUU</td></tr>
            </table>
          </div>`));
        Engine.scrollDown(thread);

        await Engine.addAssistantMsg(thread, [
          'Tallensin competitor_grid.md. FieldSync ja RouteHive ovat valmiit. ServiceGridin Pricing model -solu on tyhjä (sivu oli lukittu). Täydennetäänkö vain se — ilman koko tutkimuksen uudelleenajoa?',
        ]);

        await Engine.runOwnPrompt(thread, userInput, sendBtn, {
          brief: {
            title: 'Follow-up — täytä tyhjä solu',
            situation: 'Oikealla ja yllä näet taulukon: <b>ServiceGrid Cloud → Pricing model = ???</b>. Muut rivit ovat OK.',
            outcome: 'Claude hakee ServiceGrid-hinnoittelun ja päivittää vain sen solun olemassa olevaan tiedostoon.',
            mustInclude: [
              'Mainitse ServiceGrid (tai että hinnoittelu/pricing puuttuu)',
              'Sano että täydennetään / completedään vain se',
              'Sano että koko tutkimusta ei ajeta uudelleen',
            ],
            nextHint: '↓ Kirjoita oma lyhyt viesti. Älä liimaa tätä briiffiä.',
          },
          minChars: 40,
          requireGroups: [
            ['servicegrid', 'service grid', 'hinno', 'pricing', 'puutt', 'missing', 'tyhjä', 'empty', '???'],
            ['vain', 'only', 'just', 'täyden', 'fill', 'complete', 'päivitä', 'update', 'lisää', 'add'],
            [
              'älä uudelleen', 'älä aja', 'ei koko', 'ei uudelleen',
              'don\'t redo', 'do not redo', 'don\'t rerun', 'do not rerun',
              'don\'t run', 'do not run', 'without rerun', 'without re-running',
              'not the whole', 'entire survey', 'entire study', 'whole study', 'whole survey',
              'survey again', 'study again', 'kaikkea uudelleen', 'kaikkea alusta',
            ],
          ],
          requireSafety: [],
          rejectPatterns: [
            'leave empty', 'leave the servicegrid empty', 'jätä tyhjä', 'jätä tyhjäksi',
          ],
          banSnippets: [
            'Työkansiossa on vertailukelpoinen',
            'Oikealla ja yllä näet taulukon',
            'Claude hakee ServiceGrid-hinnoittelun ja päivittää vain sen solun',
          ],
          clarifyReject: 'Ei “jätä tyhjäksi”. Pyydä täyttämään ServiceGridin Pricing model — ja vain se.',
          clarifyMissing: 'Tarvitaan kolme asiaa samassa viestissä: (1) ServiceGrid pricing puuttuu (2) täydennä vain se (3) älä aja koko tutkimusta uudelleen.',
          clarifyTooShort: 'Lisää: ServiceGrid + vain tämä solu + ei koko tutkimusta uudelleen.',
        });

        await Engine.runLiveWork(thread, {
          title: 'Claude täydentää vain aukon',
          steps: [
            {label:'Uusi haku: ServiceGrid pricing (docs + blog)', ms:800},
            {label:'Päivitetään vain ServiceGrid-sarake gridissä', ms:600},
          ],
        });

        const reportFull = `# Competitor intelligence grid — v1
Sources: local brief + live web

STATUS: valmis — ServiceGrid pricing täydennetty follow-upilla

| | FieldSync Pro | RouteHive | ServiceGrid Cloud |
|---|---|---|---|
| Pricing model | Usage tiers + seat add-on | Per-tech / mo | Platform fee + per-seat (public SKU page + partner PDF) |
| Strength | AI dispatch marketing | Offline mobile | Enterprise connectors |
| ICP | Mid-market | SMB field teams | Enterprise IT-led |

HR_private was not accessed.
Other columns unchanged — only ServiceGrid pricing cell updated.`;

        const entry = Engine.findEntry(ws.state.entries, 'creport');
        if(entry){ entry.content = reportFull; entry.meta = 'valmis'; }
        ws.openFile('creport');

        await Engine.addAssistantMsg(thread, ['ServiceGrid-hinnoittelu lisätty. Muut sarakkeet ennallaan.']);
        Engine.showOutcome(thread, {
          title: 'Toimitus',
          lines: [
            {label:'Kansio', value:'Competitive_scan'},
            {label:'Turva', value:'HR_private estetty'},
            {label:'Follow-up', value:'vain ServiceGrid pricing täydennetty'},
          ],
        });
        Engine.addComplete(thread, 'H2 valmis — oma prompti, turvarajaus, vaja toimitus korjattu.');
      },
    },

    /* ------------------------------------------------------------------ */
    {
      label: 'H3 · Sopimusluonnoksen korjaus',
      outcome: 'Turva + korjaus + vaja muutoslista',
      run: async (container) => {
        const { thread, panel, userInput, sendBtn } = Engine.renderChatShell(container, {
          sidebarHighlight: 'files',
          topbarTitle: 'Files & folders — Sopimukset',
          composerHint: 'Cowork · kysyy ennen tallennusta',
        });

        const folders = [
          {id:'templates', name:'Vanhat_mallipohjat/', sublabel:'vanhat pohjat'},
          {id:'legalOld', name:'Sopimukset_kevat/', sublabel:'kevät · vanha'},
          {id:'legal', name:'Sopimukset_kesa/', sublabel:'kesä · aktiivinen'},
          {id:'slaMisc', name:'Liitteet_sekalaiset/', sublabel:'palasia'},
          {id:'vendor', name:'Salassapito_toimittajat/', sublabel:'muut paperit'},
          {id:'archive', name:'Allekirjoitetut/', sublabel:'valmiit · älä koske'},
          {id:'scratch', name:'_temp/', sublabel:'roskakori'},
        ];

        const ws = Engine.renderWorkspacePanel(panel, {
          rootLabel: 'Sopimukset',
          pathHint: '/ Users/you/Sopimukset',
          entries: [
            {id:'templates', kind:'folder', name:'Vanhat_mallipohjat', meta:'2', children:[
              {id:'t1', kind:'file', name:'sopimuspohja_2022.docx', type:'doc', meta:'2022', content:'VANHA MALLI 2022\nEi koske Asiakas X:ää. Väärät ehdot jo valmiiksi “pehmeät”. Älä käytä tätä.'},
            ]},
            {id:'legalOld', kind:'folder', name:'Sopimukset_kevat', meta:'2', children:[
              {id:'q2a', kind:'file', name:'sopimus_AsiakasY_LUONNOS.docx', type:'doc', meta:'väärä asiakas', content:'Asiakas Y — eri diili. Älä korjaa tätä kun tehtävä koskee Asiakas X:ää.'},
              {id:'q2b', kind:'file', name:'muistio_kevat.txt', type:'doc', meta:'txt', content:'Kevään sopimusjono siivottu. Aktiivinen työ on kesä-kansiossa.'},
            ]},
            {id:'legal', kind:'folder', name:'Sopimukset_kesa', meta:'4', children:[
              {id:'sla', kind:'file', name:'sopimus_AsiakasX_LUONNOS_v07.docx', type:'doc', meta:'luonnos', content: SLA_DRAFT},
              {id:'l2', kind:'file', name:'sahkoposti_kollegalta.txt', type:'doc', meta:'txt', content:'Hei — voitko pehmentää vastuuehtoja ennen torstain asiakaspalaveria?\nÄLÄ koske allekirjoitettuihin tiedostoihin arkistossa.'},
              {id:'l3', kind:'file', name:'liite_tietosuoja.pdf', type:'doc', meta:'PDF', content:'[PDF] Tietosuojaliite — ei kuulu tähän tehtävään ellei erikseen pyydetä.'},
              {id:'l4', kind:'file', name:'muistiinpanot_lakimies.txt', type:'doc', meta:'txt', content:'Tarkista erityisesti:\n- vastuukatto (kuinka paljon firma voi joutua maksamaan)\n- automaattinen jatkuminen + sakot jos irtisanot\n- laaja “me maksamme kaiken” -vastuu\n\nClaude saa ehdottaa muutoksia, mutta SINÄ hyväksyt ennen tallennusta.\nÄlä ylikirjoita Allekirjoitetut/-kansiota.'},
            ]},
            {id:'slaMisc', kind:'folder', name:'Liitteet_sekalaiset', meta:'1', children:[
              {id:'sm1', kind:'file', name:'sopimus_emailista_puuttuu_loppu.docx', type:'doc', meta:'vajaa', content:'Sähköpostista kopioitu pätkä — lopusta puuttuu kohtia. Ei täysi sopimus.'},
            ]},
            {id:'vendor', kind:'folder', name:'Salassapito_toimittajat', meta:'1', children:[
              {id:'v1', kind:'file', name:'salassapito_acme.pdf', type:'doc', meta:'PDF', content:'[PDF] Salassapitosopimus toimittajalle — ei liity Asiakas X -luonnokseen.'},
            ]},
            {id:'archive', kind:'folder', name:'Allekirjoitetut', meta:'lukittu', children:[
              {id:'a1', kind:'file', name:'sopimus_2024_ALLEKIRJOITETTU.pdf', type:'doc', meta:'ALLEKIRJOITETTU', content:'ALLEKIRJOITETTU SOPIMUS 2024 — LUKITTU.\nTämän ylikirjoittaminen olisi vakava virhe.\nVanha diili — ei Asiakas X:n nykyinen luonnos.'},
            ]},
            {id:'scratch', kind:'folder', name:'_temp', meta:'tmp', children:[
              {id:'s1', kind:'file', name:'paste.txt', type:'doc', meta:'txt', content:'testi paste — ei tärkeää'},
            ]},
          ],
        });

        Engine.addTaskBrief(thread, {
          title: 'H3 · Sopimusluonnoksen korjaus',
          situation: 'Asiakas X:n <b>sopimusluonnos</b> (ei vielä allekirjoitettu) on jossain kansiossa. Siinä on ehtoja, jotka ovat asiakkaalle liian huonoja. Samassa työtilassa on myös <b>jo allekirjoitettuja</b> vanhoja sopimuksia — niihin ei saa koskea. Claude kysyy sinulta ennen kuin tallentaa muutoksia.',
          outcome: 'Lopputulos: luonnoksen huonoimmat ehdot on korjattu, muutokset on kirjattu erilliseen listaan samaan kansioon, allekirjoitettuihin ei ole koskettu — ja sinä olet hyväksynyt tallennuksen.',
          folderNote: 'Valitse ensin oikea kansio. Kirjoita sen jälkeen Claudelle <b>oma</b> ohje — briiffi ei ole valmis prompti.',
          mustInclude: [
            'Missä tiedostossa / kansiossa Claude työskentelee',
            'Mitä lopputulosta haluat (korjatut ehdot + muutoslista)',
            'Mitä Claude EI saa koskea',
          ],
          nextHint: '↓ Valitse kansio → kirjoita oma toimeksianto.',
        });

        await Engine.addPickerTask(thread, {
          items: folderPickerItems(folders),
          correctIds: ['legal'],
        });

        await Engine.runOwnPrompt(thread, userInput, sendBtn, {
          brief: {
            title: 'Kirjoita oma toimeksianto',
            situation: 'Valitsit kansion. Claude ei arvaa puolestasi mitä tehdä, mihin tallentaa, eikä mitä välttää — se pitää sanoa viestissä.',
            outcome: 'Claude tekee työn valitsemassasi kansiossa Asiakas X:n luonnokselle. Sinä muotoilet ohjeen.',
            mustInclude: [
              'Mainitse kansio omin sanoin',
              'Kerro mitä Clauden pitää tehdä luonnokselle',
              'Pyydä erillistä muutoslistaa kansioon',
              'Lisää turvarajaus (allekirjoitetut / odota OK)',
            ],
            nextHint: '↓ Composer — kirjoita itse. Valmista lausetta ei anneta.',
          },
          minChars: 70,
          requireGroups: [
            ['sopimukset_kesa', 'sopimukset kesä', 'sopimukset_kesä', 'kesa', 'kesä', 'asiakasx', 'asiakas x', 'luonnos', 'sopimus'],
            ['ehto', 'risk', 'huono', 'muokka', 'korjaa', 'korvaa', 'pehment', 'paremp', 'turvall'],
            ['muutoslista', 'muutos lista', 'lista', 'loki', 'changelog', 'kirjaa'],
          ],
          requireSafety: ['allekirjoit', 'älä ylikirjoita', 'älä koske', 'älä avaa', 'vahvista', 'ok', 'ennen tallenn', 'kysy ennen'],
          banSnippets: [
            'Kansiossa ___ on Asiakas X:n sopimusluonnos',
            'Etsi ehdot jotka ovat asiakkaalle liian riskialttiita',
            'Ehdota parempia ehtoja ja kirjoita samaan kansioon muutoslista',
            'Odota OK:tani ennen kuin tallennat muutokset',
            'Asiakas X:n sopimusluonnos (ei vielä allekirjoitettu) on jossain kansiossa',
            'Lopputulos: luonnoksen huonoimmat ehdot on korjattu',
          ],
        });

        await Engine.addAssistantMsg(thread, [
          'Nopein keino olisi korjata suoraan Allekirjoitetut/sopimus_2024_ALLEKIRJOITETTU.pdf — se on jo valmis allekirjoitettu paperi. Tehdäänkö niin, vai pidetäänkö työ vain kesän luonnoksessa (Asiakas X)?',
        ]);
        await Engine.runSafetyGate(thread, {
          title: 'Pysähdy — onko tämä turvallista?',
          body: 'Claude ehdottaa jo allekirjoitetun sopimuksen ylikirjoittamista.',
          safeLabel: 'Ei — vain Asiakas X -luonnos kesä-kansiossa',
          unsafeLabel: 'Ylikirjoita allekirjoitettu',
          unsafeFeedback: 'Allekirjoitettua sopimusta ei saa ylikirjoittaa. Valitse uudelleen: vain luonnos.',
        });

        await Engine.runLiveWork(thread, {
          title: 'Claude lukee luonnosta',
          steps: [
            {label:'Avataan Sopimukset_kesa/sopimus_AsiakasX_LUONNOS_v07.docx', ms:900},
            {label:'Etsitään huonoimmat ehdot', ms:600},
            {label:'Ehdotus valmiina — odottaa sinun OK:ta', ms:400},
          ],
        });
        ws.openFile('sla');

        await Engine.addAssistantMsg(thread, [
          'Löysin kolme huonoa ehtoa: (1) vastuukatto vain 1 kuukauden maksuista, (2) sopimus jatkuu automaattisesti ja irtisanominen maksaa loput kaudesta + 15 000 €, (3) asiakas joutuu korvaamaan lähes kaiken. Ehdotan turvallisempia versioita — en tallenna ilman OK:tasi.',
        ]);
        const action = await Engine.addCard(thread, {
          title: 'Claude kysyy ennen tallennusta',
          body: 'Korvataanko nämä kolme ehtoa luonnoksessa ja kirjoitetaanko erillinen muutoslista (muutoslista.md)?',
          actions: [
            {id:'cancel', label:'Älä muokkaa'},
            {id:'confirm', label:'Hyväksy muokkaus', primary:true},
          ],
        });
        if(action !== 'confirm'){
          await Engine.addAssistantMsg(thread, ['Ei tallennusta. Luonnos ennallaan.']);
          Engine.addComplete(thread, 'H3 keskeytetty ilman tallennusta.');
          return;
        }

        await Engine.runLiveWork(thread, {
          title: 'Claude muokkaa luonnosta',
          steps: [
            {label:'Korvataan kolme ehtoa luonnoksessa', ms:800},
            {label:'Kirjoitetaan muutoslista.md (vajaa)', ms:600},
          ],
        });

        const changelogPartial = `# Muutoslista — sopimus_AsiakasX_LUONNOS_v07 (VAJA)

## 1) Vastuukatto
- ENNEN: max. 1 kuukauden maksut
- JÄLKEEN: max. 12 kuukauden maksut
- MIKSI: 1 kk on asiakkaalle liian riskialtis

## 3) Laaja korvausvastuu
- ENNEN: asiakas korvaa lähes kaiken
- JÄLKEEN: rajatumpi, molemminpuolinen IP-vastuu
- MIKSI: vanha ehto siirtää liikaa riskiä

## 2) Automaattinen jatkuminen + sakko
- ⚠️ PUUTTUU — ehto vaihdettiin sopimuksessa, mutta selitys puuttuu tästä listasta
`;

        ws.addEntries('legal', [{
          id:'clog', kind:'file', name:'muutoslista.md', type:'doc', meta:'vajaa',
          content: changelogPartial,
        }]);
        ws.openFile('clog');

        thread.appendChild(Engine.el(`
          <div class="card" style="border-color:#e0a060;background:#fff8ee;">
            <div class="card-title">Mitä puuttuu muutoslistasta</div>
            <p style="margin:0 0 8px;">Sopimukseen ehdittiin vaihtaa 3 ehtoa. Listassa on selitetty vain 2.</p>
            <table style="width:100%;font-size:12px;border-collapse:collapse;">
              <tr style="text-align:left;color:#948f7c;"><th style="padding:4px;">Ehto</th><th style="padding:4px;">Muutoslistassa?</th></tr>
              <tr><td style="padding:4px;">1) Vastuukatto</td><td style="padding:4px;">✓ selitetty</td></tr>
              <tr style="background:#ffe08a;font-weight:700;"><td style="padding:6px 4px;">2) Automaattinen jatkuminen + sakko</td><td style="padding:6px 4px;">??? PUUTTUU</td></tr>
              <tr><td style="padding:4px;">3) Laaja korvausvastuu</td><td style="padding:4px;">✓ selitetty</td></tr>
            </table>
          </div>`));
        Engine.scrollDown(thread);

        await Engine.addAssistantMsg(thread, [
          'Muutokset ovat luonnoksessa. muutoslista.md on vielä vaja: kohta 2 (automaattinen jatkuminen + sakko) puuttuu listasta. Allekirjoitettuihin ei koskettu.',
        ]);

        await Engine.runOwnPrompt(thread, userInput, sendBtn, {
          brief: {
            title: 'Follow-up — täytä tyhjä kohta listassa',
            situation: 'Keltainen rivi yllä: <b>kohta 2 — Automaattinen jatkuminen + sakko</b> puuttuu muutoslistasta. Sopimuksessa muutos on jo tehty; listasta selitys puuttuu.',
            outcome: 'Claude lisää vain tuon yhden kohdan muutoslistaan. Muuta ei kirjoiteta uudelleen.',
            mustInclude: [
              'Viittaa puuttuvaan ehtoon (kohta 2 / automaattinen jatkuminen / sakko)',
              'Sano että täydennetään vain se — ei koko listaa / sopimusta uudelleen',
            ],
            nextHint: '↓ Kirjoita lyhyt oma viesti. Älä liimaa tätä briiffiä.',
          },
          minChars: 35,
          requireGroups: [
            [
              'kohta 2', 'kohta2', 'automaatt', 'jatkum', 'sakko', 'irtisan',
              'automatic continuation', 'continuation', 'auto-renew', 'autorenew',
              'fine', 'penalty', 'early',
            ],
            [
              'täyden', 'lisää', 'add', 'fill', 'complete', 'puutt', 'missing',
              'vain', 'only', 'just', 'muutoslista', 'changelog', 'lista',
            ],
            [
              'älä uudelleen', 'älä kirjoita', 'ei koko', 'don\'t rewrite', 'do not rewrite',
              'don\'t rerun', 'do not rerun', 'don\'t run', 'whole thing', 'entire',
              'uudelleen', 'rerewrite', 'rewrite the whole', 'koko list', 'koko sopim',
            ],
          ],
          requireSafety: [],
          banSnippets: [
            'Mainitse että kohta 2 / automaattinen jatkuminen puuttuu',
            'Yllä ja oikealla: kohta 2',
            'Claude lisää vain tuon yhden kohdan muutoslistaan',
          ],
          clarifyMissing: 'Tarvitaan: (1) mikä kohta puuttuu — automaattinen jatkuminen / sakko (2) täydennä vain se (3) älä kirjoita kaikkea uudelleen.',
          clarifyTooShort: 'Lisää nuo kolme asiaa samaan lyhyeen viestiin.',
          clarifyCopy: 'Älä liimaa ohjetekstiä — kirjoita lyhyt oma follow-up.',
        });

        await Engine.runLiveWork(thread, {
          title: 'Claude täydentää muutoslistan',
          steps: [{label:'Lisätään kohta 2: ennen / jälkeen / miksi', ms:700}],
        });
        const clog = Engine.findEntry(ws.state.entries, 'clog');
        if(clog){
          clog.meta = 'valmis';
          clog.content = changelogPartial.replace(
            '## 2) Automaattinen jatkuminen + sakko\n- ⚠️ PUUTTUU — ehto vaihdettiin sopimuksessa, mutta selitys puuttuu tästä listasta\n',
            '## 2) Automaattinen jatkuminen + sakko\n- ENNEN: 120 pv irtisanominen; 100 % kauden lopusta; 15 000 € uudelleenkytkentä\n- JÄLKEEN: 30 pv; maksat vain käytetyn ajan; ei sakkoa\n- MIKSI: vanha ehto lukitsi asiakkaan liian kalliisti\n'
          );
        }
        ws.openFile('clog');

        await Engine.addAssistantMsg(thread, ['Kohta 2 lisätty muutoslistaan. Muuta ei uudelleenkirjoitettu.']);
        Engine.showOutcome(thread, {
          title: 'Valmis',
          lines: [
            {label:'Turva', value:'Allekirjoitetut koskemattomia'},
            {label:'Muokattu', value:'sopimus_AsiakasX_LUONNOS_v07.docx'},
            {label:'Follow-up', value:'kohta 2 muutoslistaan'},
          ],
        });
        Engine.addComplete(thread, 'H3 valmis — turva, vahvistus, vaja lista korjattu.');
      },
    },

    /* ------------------------------------------------------------------ */
    {
      label: 'H4 · Kuukausiluvut kojelaudalle',
      outcome: 'Kojelauta CSV:stä + turva + vajaa rivi',
      run: async (container) => {
        const { thread, panel, userInput, sendBtn } = Engine.renderChatShell(container, {
          sidebarHighlight: 'artifacts',
          topbarTitle: 'Files & folders — Kasvuluvut',
          composerHint: 'Cowork · kojelauta + tiedostot',
        });

        const folders = [
          {id:'brand', name:'Brandi_kuvat/', sublabel:'logot'},
          {id:'kpiOld', name:'Kasvuluvut_VANHAT/', sublabel:'2025'},
          {id:'kpi', name:'Kasvuluvut/', sublabel:'nykyinen taulukko'},
          {id:'kpiPersonal', name:'omat_ennusteet_joonas/', sublabel:'henkilökohtainen'},
          {id:'crm', name:'CRM_raakadumps/', sublabel:'sekavaa'},
          {id:'hr', name:'HR_private/', sublabel:'palkat · älä'},
          {id:'decks', name:'Hallitus_esitykset/', sublabel:'esitykset'},
        ];

        let ws = Engine.renderWorkspacePanel(panel, {
          rootLabel: 'Kasvu',
          pathHint: '/ Users/you/Kasvu',
          entries: [
            {id:'brand', kind:'folder', name:'Brandi_kuvat', meta:'2', children:[
              {id:'b1', kind:'file', name:'logo.svg', type:'image', meta:'svg', content:'<svg stub>'},
            ]},
            {id:'kpiOld', kind:'folder', name:'Kasvuluvut_VANHAT', meta:'2025', children:[
              {id:'old1', kind:'file', name:'kuukausi_2025.csv', type:'doc', meta:'vanha', content:'month,leads\n2025-01,100\n# vanha muoto — ei MRR / win rate'},
            ]},
            {id:'kpi', kind:'folder', name:'Kasvuluvut', meta:'CSV', children:[
              {id:'csv', kind:'file', name:'kuukausiluvut.csv', type:'doc', meta:'6 kk', content: KPI_CSV},
              {id:'k2', kind:'file', name:'miten_luvut_luetaan.txt', type:'doc', meta:'txt', content:'leads = liidit\nsqls = myynnin hyväksymät\nwin_rate_pct = voitot / SQL\nmrr_eur = kuukausittainen liikevaihto'},
            ]},
            {id:'kpiPersonal', kind:'folder', name:'omat_ennusteet_joonas', meta:'personal', children:[
              {id:'jp1', kind:'file', name:'toiveuni_ennuste.csv', type:'doc', meta:'csv', content:'month,mrr\n2026-12,999999\n# ei oikeaa dataa'},
            ]},
            {id:'crm', kind:'folder', name:'CRM_raakadumps', meta:'messy', children:[
              {id:'c1', kind:'file', name:'hubspot_kesakuu.csv', type:'doc', meta:'csv', content:'raaka dump — duplikaatteja, ei hallituskelpoinen'},
            ]},
            {id:'hr', kind:'folder', name:'HR_private', meta:'restricted', children:[
              {id:'h1', kind:'file', name:'palkkakustannukset.xlsx', type:'doc', meta:'HR', content:'LUOTTAMUKSELLISTA. Ei kuulu kasvu-kojelaudalle.'},
            ]},
            {id:'decks', kind:'folder', name:'Hallitus_esitykset', meta:'1', children:[
              {id:'d1', kind:'file', name:'muistiinpanot_q2.txt', type:'doc', meta:'txt', content:'Tarvitaan kojelauta joka lukee oikeaa CSV:tä — ei kertakuvaa chatissa.'},
            ]},
          ],
        });

        Engine.addTaskBrief(thread, {
          title: 'H4 · Kuukausiluvut kojelaudalle',
          situation: 'Hallitus kaipaa näkymää kuukausiluvuista (liidit, voittoprosentti, liikevaihto). Oikea taulukko on jossain kansiossa — ympärillä on vanhoja, henkilökohtaisia ja HR-kansioita. Tarvitset <b>pysyvän kojelaudan</b>, joka lukee paikallista tiedostoa (ei kertaluonteista taulukkoa vain chattiin).',
          outcome: 'Lopputulos: kojelauta on kytketty oikeaan CSV:hen, HR-aineistoa ei ole avattu, ja kojelauta päivittyy kun tiedosto muuttuu.',
          folderNote: 'Valitse työkansio. Kirjoita oma ohje Claudelle — briiffi ei ole valmis prompti.',
          mustInclude: [
            'Missä tiedostossa / kansiossa Claude työskentelee',
            'Mitä rakennat (kojelauta / dashboard tiedostosta)',
            'Mitä Claude EI saa avata',
          ],
          nextHint: '↓ Valitse kansio → kirjoita oma toimeksianto.',
        });

        await Engine.addPickerTask(thread, {
          items: folderPickerItems(folders),
          correctIds: ['kpi'],
        });

        await Engine.runOwnPrompt(thread, userInput, sendBtn, {
          brief: {
            title: 'Kirjoita oma toimeksianto',
            situation: 'Valitsit kansion. Claude ei arvaa, että haluat <b>tiedostoon kytketyn</b> kojelaudan — eikä mitä kansioita välttää — ellet sano sitä.',
            outcome: 'Kojelauta lukee valitsemasi kansion taulukkoa ja jää käyttöön (Live Artifact), ei vain chat-vastausta.',
            mustInclude: [
              'Mainitse kansio / CSV omin sanoin',
              'Pyydä kojelaudaa / dashboardia tiedostosta',
              'Turvarajaus (HR / vanhat / henkilökohtaiset)',
            ],
            nextHint: '↓ Composer — kirjoita itse.',
          },
          minChars: 70,
          requireGroups: [
            ['kasvuluvut', 'kuukausiluvut', 'growth_metrics', 'growth metrics', 'monthly_performance', 'csv', 'tauluk'],
            ['artifact', 'kojelau', 'dashboard', 'live', 'kpi', 'näkym', 'nakym'],
          ],
          requireSafety: ['hr', 'private', 'älä', 'old', 'vanha', 'scratch', 'ennuste', 'älä koske', 'älä avaa', 'palkka'],
          banSnippets: [
            'Hallitus kaipaa näkymää kuukausiluvuista',
            'Lopputulos: kojelauta on kytketty oikeaan CSV:hen',
            'pysyvän kojelaudan',
          ],
        });

        await Engine.addAssistantMsg(thread, [
          'Voisin lisätä kojelaudalle myös HR_private/palkkakustannukset.xlsx — “kulut vs kasvu”. Avaanko HR-tiedoston?',
        ]);
        await Engine.runSafetyGate(thread, {
          title: 'Pysähdy — onko tämä turvallista?',
          body: 'Claude ehdottaa palkka-/HR-tiedoston avaamista kojelautaan.',
          safeLabel: 'Ei — vain Kasvuluvut-CSV',
          unsafeLabel: 'Salli HR-tiedosto',
          unsafeFeedback: 'Palkkatiedot eivät kuulu tähän tehtävään. Estä pääsy.',
        });

        await Engine.runLiveWork(thread, {
          title: 'Claude rakentaa kojelaudan',
          steps: [
            {label:'Luetaan Kasvuluvut/kuukausiluvut.csv', ms:800},
            {label:'Rakennetaan kojelauta (osittainen)', ms:800},
            {label:'Kytketään tiedostoon — ei HR', ms:500},
          ],
        });

        Engine.renderArtifactDashboardPanel(panel, {
          title: 'Kasvu — Live (vajaa)',
          rows: [
            {label:'Viimeisin MRR', value:'50 110 €'},
            {label:'Liidit (kesä)', value:'390'},
            {label:'Win rate', value:'⚠️ PUUTTUU'},
            {label:'Lähde', value:'kuukausiluvut.csv'},
          ],
        });

        thread.appendChild(Engine.el(`
          <div class="card" style="border-color:#e0a060;background:#fff8ee;">
            <div class="card-title">Mitä puuttuu kojelaudasta</div>
            <p style="margin:0 0 8px;">CSV:ssä on win_rate_pct-sarake. Kojelaudalla yksi rivi on tyhjä.</p>
            <table style="width:100%;font-size:12px;border-collapse:collapse;">
              <tr style="text-align:left;color:#948f7c;"><th style="padding:4px;">Rivi</th><th style="padding:4px;">Tila</th></tr>
              <tr><td style="padding:4px;">MRR</td><td style="padding:4px;">✓</td></tr>
              <tr><td style="padding:4px;">Liidit</td><td style="padding:4px;">✓</td></tr>
              <tr style="background:#ffe08a;font-weight:700;"><td style="padding:6px 4px;">Win rate (voittoprosentti)</td><td style="padding:6px 4px;">??? PUUTTUU</td></tr>
            </table>
          </div>`));
        Engine.scrollDown(thread);

        await Engine.addAssistantMsg(thread, [
          'Kojelauta on live ja lukee CSV:tä. Win rate -rivi jäi tyhjäksi. HR:ää ei avattu.',
        ]);

        await Engine.runOwnPrompt(thread, userInput, sendBtn, {
          brief: {
            title: 'Follow-up — täytä tyhjä rivi',
            situation: 'Keltainen rivi: <b>Win rate</b> puuttuu. Muut luvut ovat OK.',
            outcome: 'Claude lisää vain win rate -rivin. Kojelaudaa ei rakenneta alusta.',
            mustInclude: [
              'Mainitse win rate / voittoprosentti',
              'Sano että täydennetään vain se — ei koko kojelaudaa uudelleen',
            ],
            nextHint: '↓ Lyhyt oma viesti.',
          },
          minChars: 30,
          requireGroups: [
            ['win', 'voitt', 'win_rate', 'conversion', 'voittopros'],
            ['vain', 'only', 'just', 'lisää', 'add', 'täyden', 'fill', 'complete', 'puutt', 'missing', 'päivitä', 'update'],
            [
              'älä uudelleen', 'ei koko', 'don\'t rebuild', 'do not rebuild', 'don\'t redo',
              'don\'t rerun', 'whole dashboard', 'koko koje', 'alusta', 'uudelleen',
            ],
          ],
          requireSafety: [],
          banSnippets: [
            'Pyydä vain win rate -rivin korjausta',
            'Keltainen rivi: Win rate puuttuu',
            'Claude lisää vain win rate -rivin',
          ],
          clarifyMissing: 'Tarvitaan: (1) win rate puuttuu (2) täydennä vain se (3) älä rakenna kojelaudaa uudelleen.',
          clarifyCopy: 'Älä liimaa ohjetekstiä — kirjoita lyhyt oma follow-up.',
        });

        await Engine.runLiveWork(thread, {
          title: 'Claude korjaa yhden rivin',
          steps: [{label:'Mapataan win_rate_pct → kojelauta', ms:600}],
        });
        Engine.renderArtifactDashboardPanel(panel, {
          title: 'Kasvu — Live',
          rows: [
            {label:'Viimeisin MRR', value:'50 110 €'},
            {label:'Liidit (kesä)', value:'390'},
            {label:'Win rate', value:'20.5 %'},
            {label:'Spend → SQL', value:'404 € / SQL'},
            {label:'Lähde', value:'kuukausiluvut.csv'},
          ],
        });

        await Engine.addCard(thread, {
          title: 'Uusi kuukausi CSV:ssä',
          body: 'Heinäkuun rivi ilmestyi paikalliseen tiedostoon. Avaa kojelauta uudelleen — lukujen pitäisi päivittyä ilman uutta “tee taulukko” -ohjetta.',
          actions: [{id:'refresh', label:'Päivitä kojelauta', primary:true}],
        });

        ws = Engine.renderWorkspacePanel(panel, {
          rootLabel: 'Kasvu',
          pathHint: '/ Users/you/Kasvu',
          entries: [
            {id:'kpi', kind:'folder', name:'Kasvuluvut', meta:'päivitetty', children:[
              {id:'csv', kind:'file', name:'kuukausiluvut.csv', type:'doc', meta:'7 kk', content: KPI_CSV_AUG},
            ]},
          ],
        });
        await Engine.wait(400);
        ws.openFile('csv');
        await Engine.wait(700);
        Engine.renderArtifactDashboardPanel(panel, {
          title: 'Kasvu — Live',
          rows: [
            {label:'Viimeisin MRR', value:'53 440 €'},
            {label:'Liidit (heinä)', value:'512'},
            {label:'Win rate', value:'23.8 %'},
            {label:'Spend → SQL', value:'362 € / SQL'},
            {label:'Lähde', value:'kuukausiluvut.csv · päivitetty'},
          ],
        });
        const upd = panel.querySelector('.dash-updated');
        if(upd) upd.textContent = 'Päivitetty juuri nyt — uusi rivi CSV:stä';

        await Engine.addAssistantMsg(thread, ['Luvut päivittyivät tiedostosta. Pelkkä chat-taulukko ei olisi liikahtanut.']);
        Engine.showOutcome(thread, {
          title: 'Tulos',
          lines: [
            {label:'Turva', value:'HR_private estetty'},
            {label:'Follow-up', value:'win rate lisätty'},
            {label:'Live', value:'CSV-päivitys näkyi kojelaudassa'},
          ],
        });
        Engine.addComplete(thread, 'H4 valmis — turva, vaja rivi, live-päivitys.');
      },
    },

    /* ------------------------------------------------------------------ */
    {
      label: 'H5 · Pitch-kansiot designille',
      outcome: '10 slidea + turva + vaja slide',
      run: async (container) => {
        const { thread, panel, userInput, sendBtn } = Engine.renderChatShell(container, {
          sidebarHighlight: 'files',
          topbarTitle: 'Files & folders — Pitch-tuotanto',
          composerHint: 'Cowork · kansiorakenne',
        });

        const folders = [
          {id:'archive', name:'Vanhat_pitchit/', sublabel:'vanha FINAL'},
          {id:'briefOld', name:'Tuotebrief_VANHA/', sublabel:'2025'},
          {id:'brief', name:'Tuotebrief/', sublabel:'nykyinen'},
          {id:'briefNotes', name:'omat_muistiinpanot/', sublabel:'henkilökohtainen'},
          {id:'design', name:'Design_drop/', sublabel:'tyhjä'},
          {id:'legal', name:'Omistuspohja_LUOTTAMUS/', sublabel:'arkaluontoinen'},
          {id:'memes', name:'Offsite_memes/', sublabel:'ei tähän'},
        ];

        const ws = Engine.renderWorkspacePanel(panel, {
          rootLabel: 'Pitch-tuotanto',
          pathHint: '/ Users/you/Pitch',
          entries: [
            {id:'archive', kind:'folder', name:'Vanhat_pitchit', meta:'älä käytä', children:[
              {id:'a1', kind:'file', name:'pitch_v3_FINAL_really_final.pdf', type:'doc', meta:'PDF', content:'[vanha pitch]\nVanhentunut tarina. Älä rakenna tästä.'},
            ]},
            {id:'briefOld', kind:'folder', name:'Tuotebrief_VANHA', meta:'2025', children:[
              {id:'bo1', kind:'file', name:'tuotebrief_2025.txt', type:'doc', meta:'vanha', content:'2025 brief — eri luvut, eri ask. Väärä lähde.'},
            ]},
            {id:'brief', kind:'folder', name:'Tuotebrief', meta:'nykyinen', children:[
              {id:'pbrief', kind:'file', name:'tuotebrief_NOTION_DUMP.txt', type:'doc', meta:'~1000 sanaa', content: PRODUCT_BRIEF},
              {id:'b2', kind:'file', name:'rahoitus_summa_TBD.txt', type:'doc', meta:'txt', content:'ASK_AMOUNT=TBD\nÄlä keksi euroja slideille.'},
            ]},
            {id:'briefNotes', kind:'folder', name:'omat_muistiinpanot', meta:'personal', children:[
              {id:'bn1', kind:'file', name:'villiä_ideoita.txt', type:'doc', meta:'txt', content:'entä 20 slidea?\npurple gradient???\nignore'},
            ]},
            {id:'design', kind:'folder', name:'Design_drop', meta:'tyhjä', children:[]},
            {id:'legal', kind:'folder', name:'Omistuspohja_LUOTTAMUS', meta:'arkaluontoinen', children:[
              {id:'l1', kind:'file', name:'cap_table_luonnos.xlsx', type:'doc', meta:'xlsx', content:'LUOTTAMUKSELLISTA omistuspohjaa — ei design-droppiin.'},
            ]},
            {id:'memes', kind:'folder', name:'Offsite_memes', meta:'lol', children:[
              {id:'m1', kind:'file', name:'IMG_9999.jpg', type:'image', meta:'jpg', content:'[kuva] ei pitch-asset'},
            ]},
          ],
        });

        Engine.addTaskBrief(thread, {
          title: 'H5 · Pitch-kansiot designille',
          situation: 'Design-tiimi tarvitsee sijoittajapitchin rungon: <b>10 sliden tekstit</b> ja <b>kansiot</b>, joihin he voivat pudottaa kuvat. Lähdeaineisto (pitkä, sotkuinen brief) on jossain kansiossa. Ympärillä on vanhoja pitchejä, meemejä ja arkaluonteisia omistustietoja.',
          outcome: 'Lopputulos: 10 sliden outline + tekstit + Slide_01…Slide_10 -kansiot placeholder-tiedostoineen. Cap tablea / meemejä / vanhaa pitchiä ei käytetä.',
          folderNote: 'Valitse työkansio. Kirjoita oma ohje — briiffi ei ole valmis prompti.',
          mustInclude: [
            'Missä brief on (kansio)',
            'Mitä Clauden pitää tuottaa (10 slidea + kansiorakenne)',
            'Mitä EI saa avata',
          ],
          nextHint: '↓ Valitse kansio → kirjoita oma toimeksianto.',
        });

        await Engine.addPickerTask(thread, {
          items: folderPickerItems(folders),
          correctIds: ['brief'],
        });

        await Engine.runOwnPrompt(thread, userInput, sendBtn, {
          brief: {
            title: 'Kirjoita oma toimeksianto',
            situation: 'Valitsit kansion. Claude ei arvaa slidejen määrää, kansiorakennetta eikä turvarajauksia puolestasi.',
            outcome: 'Briefistä syntyy 10 sliden runko + tekstit + kansiot asseteille valitsemassasi työtilassa.',
            mustInclude: [
              'Mainitse kansio / brief omin sanoin',
              'Pyydä 10 slidea + tekstit / outline',
              'Pyydä kansiorakennetta (Slide_… / assetit)',
              'Turvarajaus (omistuspohja / meemit / vanhat)',
            ],
            nextHint: '↓ Composer — kirjoita itse.',
          },
          minChars: 80,
          requireGroups: [
            ['tuotebrief', 'fundraising_brief', 'fundraising brief', 'product_brief', 'brief', 'notion'],
            ['slide', 'pitch', 'deck', 'outline', 'esitys', '10'],
            ['kansio', 'folder', 'asset', 'raken', 'placeholder'],
          ],
          requireSafety: ['cap', 'omistus', 'legal', 'meme', 'archive', 'vanha', 'älä', 'ei koske', 'älä avaa', 'personal', 'luottamus'],
          banSnippets: [
            'Design-tiimi tarvitsee sijoittajapitchin rungon',
            'Lopputulos: 10 sliden outline + tekstit',
            'Cap tablea / meemejä / vanhaa pitchiä ei käytetä',
          ],
        });

        await Engine.addAssistantMsg(thread, [
          'Voisin lukea Omistuspohja_LUOTTAMUS/cap_table_luonnos.xlsx, jotta “Ask”-slideen saadaan oikeat omistusosuudet. Avaanko sen?',
        ]);
        await Engine.runSafetyGate(thread, {
          title: 'Pysähdy — onko tämä turvallista?',
          body: 'Claude ehdottaa luottamuksellisen omistuspohjan avaamista pitch-aineistoon.',
          safeLabel: 'Ei — älä avaa Omistuspohja_LUOTTAMUS',
          unsafeLabel: 'Salli omistuspohja',
          unsafeFeedback: 'Omistuspohja ei kuulu design-drop -työhön. Estä pääsy.',
        });

        await Engine.runLiveWork(thread, {
          title: 'Claude lukee brieffin ja rakentaa rakennetta',
          steps: [
            {label:'Avataan Tuotebrief/tuotebrief_NOTION_DUMP.txt', ms:900},
            {label:'Kirjoitetaan outline + 9/10 slide-kansiot', ms:900},
            {label:'Slide_07_Traction — copy TBD', detail:'vajaa', ms:500},
          ],
        });

        const slides = [
          ['Slide_01_Intro', 'Hook: ops chaos → one sentence promise.'],
          ['Slide_02_Problem', 'WhatsApp/Excel dispatch cost.'],
          ['Slide_03_Solution', 'Northline Ops in one visual system.'],
          ['Slide_04_WhyNow', 'Labor shortage + SLA pressure.'],
          ['Slide_05_Product', 'Constraint-aware dispatch + offline.'],
          ['Slide_06_Market', 'ICP 20–120 techs Nordics/DACH.'],
          ['Slide_07_Traction', '⚠️ COPY TBD — numbers not pasted from brief yet\nGAP: Slide 7 traction copy PUUTTUU'],
          ['Slide_08_BusinessModel', 'Platform + per-active-tech.'],
          ['Slide_09_Competition', 'Position vs FieldSync / RouteHive / ServiceGrid.'],
          ['Slide_10_Ask', 'Ask + use of funds (amount from finance note — TBD).'],
        ];
        const slideEntries = slides.map(([name, note], i) => ({
          id: 'sl'+i,
          kind: 'folder',
          name,
          meta: i === 6 ? 'VAJA' : '1 file',
          children: [{
            id: 'pl'+i,
            kind: 'file',
            name: 'asset_placeholder.txt',
            type: 'doc',
            meta: i === 6 ? 'vajaa' : 'design',
            content: `# ${name}\n\nCOPY:\n${note}\n\nDrop final graphics here.`,
          }],
        }));
        const outline = `# Pitch outline — 10 slides
1 Intro ✓
2 Problem ✓
3 Solution ✓
4 Why now ✓
5 Product ✓
6 Market ✓
7 Traction ⚠️ COPY PUUTTUU
8 Business model ✓
9 Competition ✓
10 Ask ✓

Omistuspohjaa ei käytetty. Meemit/vanhat pitchit ohitettu.`;

        ws.addEntries('brief', [
          {id:'outline', kind:'file', name:'pitch_10slide_outline.md', type:'doc', meta:'vajaa slide 7', content: outline},
          ...slideEntries,
        ]);
        ws.openFile('outline');

        thread.appendChild(Engine.el(`
          <div class="card" style="border-color:#e0a060;background:#fff8ee;">
            <div class="card-title">Mitä puuttuu</div>
            <p style="margin:0 0 8px;">10 kansiota luotu. Yhden sliden teksti on vielä tyhjä.</p>
            <table style="width:100%;font-size:12px;border-collapse:collapse;">
              <tr style="text-align:left;color:#948f7c;"><th style="padding:4px;">Slide</th><th style="padding:4px;">Tila</th></tr>
              <tr><td style="padding:4px;">1–6, 8–10</td><td style="padding:4px;">✓ copy ok</td></tr>
              <tr style="background:#ffe08a;font-weight:700;"><td style="padding:6px 4px;">Slide 7 · Traction (luvut / näyttö)</td><td style="padding:6px 4px;">??? PUUTTUU</td></tr>
            </table>
          </div>`));
        Engine.scrollDown(thread);

        await Engine.addAssistantMsg(thread, [
          'Outline + kansiot luotu. Slide 7 (Traction) on vielä vaja — teksti/luvut puuttuvat. Omistuspohjaa ei avattu.',
        ]);

        await Engine.runOwnPrompt(thread, userInput, sendBtn, {
          brief: {
            title: 'Follow-up — täytä vain Slide 7',
            situation: 'Keltainen rivi: <b>Slide 7 Traction</b> puuttuu. Muut slidet ovat OK.',
            outcome: 'Claude täyttää vain Slide 7:n tekstin. Koko pitchiä ei rakenneta uudelleen.',
            mustInclude: [
              'Mainitse Slide 7 / Traction',
              'Sano että täydennetään vain se — ei koko deciä uudelleen',
            ],
            nextHint: '↓ Lyhyt oma viesti.',
          },
          minChars: 30,
          requireGroups: [
            ['slide_07', 'slide 7', 'slide7', 'traction', 'sliden 7', 'dia 7', 'näyttö', 'naytto', 'luvut'],
            ['vain', 'only', 'just', 'täyden', 'lisää', 'add', 'fill', 'complete', 'puutt', 'missing', 'päivitä'],
            [
              'älä uudelleen', 'ei koko', 'don\'t rebuild', 'do not rebuild', 'don\'t redo',
              'whole deck', 'whole pitch', 'koko pitch', 'koko esitys', 'uudelleen', 'alusta',
            ],
          ],
          requireSafety: [],
          banSnippets: [
            'Pyydä vain Slide 7 / traction -copyn täydennystä',
            'Keltainen rivi: Slide 7 Traction puuttuu',
            'Claude täyttää vain Slide 7:n tekstin',
          ],
          clarifyMissing: 'Tarvitaan: (1) Slide 7 / Traction puuttuu (2) täydennä vain se (3) älä rakenna koko pitchiä uudelleen.',
          clarifyCopy: 'Älä liimaa ohjetekstiä — kirjoita lyhyt oma follow-up.',
        });

        await Engine.runLiveWork(thread, {
          title: 'Claude täydentää Slide 7',
          steps: [
            {label:'Poimitaan traction-luvut briefistä', ms:600},
            {label:'Päivitetään Slide_07_Traction/asset_placeholder.txt', ms:600},
          ],
        });
        const s7 = Engine.findEntry(ws.state.entries, 'pl6');
        if(s7){
          s7.meta = 'design';
          s7.content = `# Slide_07_Traction\n\nCOPY:\n14 paying logos · NRR ~112% · TTFV 11 days · 1 logo churn / 12 mo.\nAsset: logo strip + 3 KPI callouts.\n\n(Filled in follow-up — other slides untouched.)`;
        }
        const ol = Engine.findEntry(ws.state.entries, 'outline');
        if(ol){ ol.meta = 'valmis'; ol.content = ol.content.replace('7 Traction ⚠️ COPY PUUTTUU', '7 Traction ✓'); }
        ws.openFile('pl6');

        await Engine.addAssistantMsg(thread, ['Slide 7 täydennetty. Muut kansiot ennallaan.']);
        Engine.showOutcome(thread, {
          title: 'Tuotantopaketti',
          lines: [
            {label:'Turva', value:'Omistuspohja estetty'},
            {label:'Rakenne', value:'10 × Slide_XX_…/'},
            {label:'Follow-up', value:'vain Slide 7 täydennetty'},
          ],
        });
        Engine.addComplete(thread, 'H5 valmis — turva, vaja slide korjattu follow-upilla.');
      },
    },
  ],
});
