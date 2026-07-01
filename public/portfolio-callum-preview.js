/* Callum-style CV preview — Poppins, yellow primary, bootstrap-inspired sections */
function escC(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function hrefC(raw){var u=String(raw||'').trim();if(!u)return'';if(/^https?:\/\//i.test(u))return u;return'https://'+u.replace(/^\/+/,'');}
function iniC(n){return(n||'').split(/\s+/).map(function(w){return w[0]||'';}).join('').substring(0,2).toUpperCase();}
function secC(p,k){var s=(p.visual_style&&p.visual_style.sections)||{};return s[k]!==false;}
function normSkillC(s){if(!s)return{name:'',context:''};if(typeof s==='string')return{name:s,context:''};return{name:s.name||s.skill||'',context:s.context||s.example||s.where||''};}
function yrsC(ex){if(!ex||!ex.length)return'8+';var n=0;ex.forEach(function(e){var y=String(e.period||e.years||'');var m=y.match(/(\d{4})/g);if(m&&m.length)n=Math.max(n,new Date().getFullYear()-parseInt(m[0],10));});return n?String(Math.min(n,30)):'8+';}

var CAL_CSS=':root{--bg:#fff;--bg2:#f8f9fa;--bg3:#212529;--ink:#212529;--muted:#6c757d;--accent:#f0df4f;--accent-text:#212529;--secondary:#343a40;--font:"Poppins",system-ui,sans-serif}*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}html{scroll-behavior:smooth}body{font-family:var(--font);font-size:16px;line-height:1.7;color:var(--ink);background:var(--bg)}a{color:inherit;text-decoration:none}.container{max-width:1140px;margin:0 auto;padding:0 24px}.header{position:sticky;top:0;z-index:100;background:rgba(255,255,255,.97);backdrop-filter:blur(6px);border-bottom:1px solid rgba(0,0,0,.06)}.header-inner{display:flex;align-items:center;justify-content:space-between;padding:1rem 24px;max-width:1140px;margin:0 auto}.logo{font-weight:700;font-size:1.15rem;text-transform:uppercase;letter-spacing:.04em}.nav{display:none;gap:1.75rem;list-style:none;font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.08em}@media(min-width:992px){.nav{display:flex}}.nav a{color:var(--muted);position:relative;padding-bottom:.35rem}.nav a:hover,.nav a.active{color:var(--ink)}.nav a.active::after{content:"";position:absolute;left:0;right:0;bottom:0;height:2px;background:var(--accent)}.header-social{display:none;gap:.65rem;list-style:none;font-size:.95rem}@media(min-width:992px){.header-social{display:flex}}.header-social a{width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:var(--bg2);color:var(--ink);font-size:.75rem;font-weight:700}.hero-wrap{position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;color:#fff;overflow:hidden}.hero-mask{position:absolute;inset:0;background:rgba(33,37,41,.82);z-index:1}.hero-bg{position:absolute;inset:0;background:url("https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600") center/cover}.hero-content{position:relative;z-index:2;padding:7rem 24px 5rem;width:100%}.hero-content h1{font-size:clamp(1.5rem,3vw,2rem);font-weight:400;text-transform:uppercase;letter-spacing:.06em;margin-bottom:.5rem;opacity:.95}.hero-role{font-size:clamp(2rem,6vw,3.5rem);font-weight:600;text-transform:uppercase;letter-spacing:.02em;margin-bottom:.75rem;line-height:1.1}.hero-loc{font-size:1.1rem;opacity:.85;margin-bottom:1.75rem}.btn-primary{display:inline-block;padding:.85rem 2rem;background:var(--accent);color:var(--accent-text);font-weight:600;font-size:.9rem;text-transform:uppercase;letter-spacing:.04em;border:none;cursor:pointer;transition:transform .2s,box-shadow .2s}.btn-primary:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.15)}.btn-dark{display:inline-block;padding:.85rem 2rem;background:var(--bg3);color:#fff;font-weight:600;font-size:.9rem;text-transform:uppercase;letter-spacing:.04em;border:none}.scroll-down{display:block;margin-top:3rem;color:rgba(255,255,255,.7);font-size:1.25rem;animation:bounce 2s infinite}@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(8px)}}.section{padding:5rem 0}.section-light{background:var(--bg2)}.section-dark{background:var(--secondary);color:#fff}.badge-label{display:inline-block;background:var(--accent);color:var(--accent-text);padding:.25rem .65rem;font-size:.78rem;font-weight:600;text-transform:uppercase;letter-spacing:.04em;margin-bottom:.75rem}.section-title{text-align:center;font-size:clamp(1.75rem,3.5vw,2.5rem);font-weight:600;margin-bottom:3rem;line-height:1.2}.about-row{display:grid;grid-template-columns:1fr;gap:2.5rem;align-items:start}@media(min-width:992px){.about-row{grid-template-columns:2fr 1fr}}.about-intro h2{font-size:clamp(1.5rem,3vw,2rem);font-weight:400;margin-bottom:1rem;line-height:1.3}.about-intro h2 strong{font-weight:700;border-bottom:3px solid var(--accent);padding-bottom:.15rem}.about-intro p{font-size:1.05rem;color:var(--muted);line-height:1.8}.exp-badge{text-align:center;padding:2rem 1.5rem;background:var(--bg);border:1px solid rgba(0,0,0,.08)}.exp-badge-num{width:72px;height:72px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-size:1.75rem;font-weight:500;margin:0 auto 1rem;color:var(--accent-text)}.exp-badge h3{font-size:1.35rem;font-weight:400}.exp-badge h3 strong{font-weight:700}.info-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:1.25rem;margin-top:2rem}@media(min-width:768px){.info-grid{grid-template-columns:repeat(4,1fr)}}.info-grid label{display:block;font-size:.82rem;color:var(--muted);font-weight:500;margin-bottom:.2rem}.info-grid p{font-size:1rem;font-weight:600;margin:0}.services-grid{display:grid;grid-template-columns:1fr;gap:2rem;margin-top:2rem}@media(min-width:768px){.services-grid{grid-template-columns:repeat(3,1fr)}}.service-box{text-align:center;padding:0 1rem}.service-icon{font-size:2.5rem;color:var(--accent);margin-bottom:1rem;line-height:1}.service-box h3{font-size:1.1rem;font-weight:600;margin-bottom:.65rem}.service-box p{font-size:.88rem;color:var(--muted);line-height:1.65}.resume-cols{display:grid;grid-template-columns:1fr;gap:3rem;margin-top:2rem}@media(min-width:992px){.resume-cols{grid-template-columns:1fr 1fr}}.resume-col h3{font-size:1.35rem;font-weight:600;margin-bottom:1.25rem;padding-bottom:.5rem}.timeline{border-left:2px solid var(--accent);padding-left:1.25rem}.timeline-item{margin-bottom:1.75rem;padding-bottom:1.75rem;border-bottom:1px solid rgba(0,0,0,.06)}.timeline-item:last-child{border-bottom:none;margin-bottom:0;padding-bottom:0}.timeline-item h4{font-size:1.05rem;font-weight:600;margin-bottom:.35rem}.timeline-item .meta{font-size:.88rem;margin-bottom:.5rem;color:var(--ink)}.timeline-item p{font-size:.88rem;color:var(--muted);line-height:1.65}.skills-block{margin-top:3.5rem}.skills-block h3{font-size:1.35rem;font-weight:600;margin-bottom:1.5rem}.skills-list{display:grid;grid-template-columns:1fr;gap:0}@media(min-width:768px){.skills-list{grid-template-columns:1fr 1fr;column-gap:2rem}}.skill-row{padding:1rem 0;border-bottom:1px solid rgba(0,0,0,.08)}.skill-row:last-child{border-bottom:none}.skill-name{font-weight:600;font-size:.92rem;display:block;margin-bottom:.25rem}.skill-ctx{font-size:.85rem;color:var(--muted);line-height:1.55}.portfolio-grid{display:grid;grid-template-columns:1fr;gap:1.5rem;margin-top:2rem}@media(min-width:576px){.portfolio-grid{grid-template-columns:repeat(2,1fr)}}@media(min-width:992px){.portfolio-grid{grid-template-columns:repeat(3,1fr)}}.port-box{position:relative;overflow:hidden;background:#ddd}.port-box img{width:100%;display:block;aspect-ratio:4/3;object-fit:cover;transition:transform .45s}.port-box:hover img{transform:scale(1.06)}.port-overlay{position:absolute;inset:0;background:rgba(33,37,41,.75);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:1rem;opacity:0;transition:opacity .3s;color:#fff}.port-box:hover .port-overlay{opacity:1}.port-overlay i{font-size:2rem;color:var(--accent);margin-bottom:.5rem;font-style:normal}.port-overlay h5{font-size:1rem;font-weight:600;margin-bottom:.25rem}.port-overlay span{font-size:.82rem;opacity:.85}.cta-wrap{position:relative;padding:5rem 24px;text-align:center;color:#fff;overflow:hidden}.cta-bg{position:absolute;inset:0;background:url("https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1600") center/cover}.cta-mask{position:absolute;inset:0;background:rgba(33,37,41,.82)}.cta-inner{position:relative;z-index:1;max-width:640px;margin:0 auto}.cta-inner h2{font-size:clamp(1.75rem,3.5vw,2.5rem);font-weight:600;margin-bottom:1.75rem}.faq-row{display:grid;grid-template-columns:1fr;gap:2.5rem;align-items:center}@media(min-width:992px){.faq-row{grid-template-columns:1fr 1fr}}.faq-left .section-title,.faq-left .badge-label{text-align:left}.accordion{border:1px solid rgba(0,0,0,.08)}.acc-item{border-bottom:1px solid rgba(0,0,0,.08)}.acc-item:last-child{border-bottom:none}.acc-head{width:100%;text-align:left;padding:1rem 1.15rem;background:var(--bg);border:none;font-family:var(--font);font-size:.92rem;font-weight:600;cursor:pointer;display:flex;justify-content:space-between;align-items:center}.acc-head::after{content:"+";font-size:1.25rem;color:var(--muted);font-weight:400}.acc-item.open .acc-head::after{content:"−"}.acc-body{display:none;padding:0 1.15rem 1rem;font-size:.88rem;color:var(--muted);line-height:1.7}.acc-item.open .acc-body{display:block}.faq-img{text-align:center}.faq-img img{max-width:280px;width:100%;opacity:.9;border-radius:8px}.testi-wrap{text-align:center}.testi-wrap .section-title{color:#fff}.testi-wrap .badge-label{background:var(--accent);color:var(--accent-text)}.testi-cards{display:grid;grid-template-columns:1fr;gap:1.5rem;margin-top:1rem}@media(min-width:768px){.testi-cards{grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}}.testi-item{padding:2rem 1.5rem}.testi-quote{font-size:2rem;color:var(--accent);margin-bottom:1rem;line-height:1}.testi-item p{font-size:.95rem;line-height:1.75;margin-bottom:1.25rem;opacity:.92}.testi-av{width:56px;height:56px;border-radius:50%;background:var(--accent);color:var(--accent-text);display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:.85rem;margin-bottom:.5rem}.testi-name{font-weight:600;font-size:.95rem;display:block}.testi-role{font-size:.82rem;opacity:.7}.contact-section{background:var(--accent);color:var(--accent-text)}.contact-grid{display:grid;grid-template-columns:1fr;gap:2.5rem}@media(min-width:992px){.contact-grid{grid-template-columns:5fr 6fr}}.contact-left h2{font-size:clamp(1.75rem,3vw,2.25rem);font-weight:600;margin-bottom:1rem}.contact-left p{font-size:1.05rem;margin-bottom:1.5rem;line-height:1.75;opacity:.9}.contact-left h3{font-size:1.05rem;font-weight:600;margin:1.25rem 0 .35rem}.contact-left p.detail{font-size:1rem;margin:0;font-weight:500}.contact-chips{display:flex;flex-wrap:wrap;gap:.65rem;margin-top:1.5rem}.contact-chip{padding:.55rem 1rem;background:rgba(0,0,0,.08);font-size:.85rem;font-weight:500;transition:background .2s}.contact-chip:hover{background:rgba(0,0,0,.14)}.contact-right h2{font-size:clamp(1.5rem,3vw,2rem);font-weight:600;margin-bottom:1.25rem}.contact-card{background:rgba(255,255,255,.35);padding:2rem;border:1px solid rgba(0,0,0,.08)}.contact-card p{font-size:.92rem;line-height:1.7;margin-bottom:.75rem}.footer{background:var(--bg3);color:rgba(255,255,255,.75);padding:1.75rem 0;font-size:.85rem;text-align:center}.footer a{color:#fff;font-weight:600}';

function themeC(p){
  var vs=p.visual_style||{};
  return '--bg:'+(vs.bg||p.brand_bg||'#ffffff')+';--bg2:'+(vs.bg2||'#f8f9fa')+';--ink:'+(vs.ink||p.brand_color||'#212529')+';--accent:'+(vs.accent||p.brand_accent||'#f0df4f')+';--accent-text:'+(vs.accent_text||'#212529')+';--secondary:'+(vs.secondary||'#343a40')+';';
}

var SVC_ICONS=['◆','▣','◉','▲','●','◎'];
var PORT_IMGS=[
  'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600',
  'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=600',
  'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=600',
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600',
  'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=600',
  'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600'
];

function buildCallumBody(p){
  var nm=escC(p.full_name||''),parts=(p.full_name||'').trim().split(/\s+/);
  var first=escC(parts[0]||''),last=escC(parts.slice(1).join(' ')||'');
  var rl=escC(p.target_role||''),ct=escC(p.city||''),em=escC(p.email_public||''),li=p.linkedin_url?hrefC(p.linkedin_url):'';
  var sk=p.skills||[],ex=(p.experience||[]).filter(function(e){return e&&e.show!==false}),ed=p.education||[],achiev=p.achievements||[];
  var bio=escC(p.bio||''),cs=escC(p.career_summary||p.bio||'');
  var yrs=yrsC(ex),h='';

  h+='<header class="header"><div class="header-inner">';
  h+='<a href="#home" class="logo">'+first+(last?'.':'')+'</a>';
  h+='<ul class="nav">';
  h+='<li><a href="#home" class="active">Koti</a></li>';
  if(secC(p,'about')) h+='<li><a href="#about">Tietoa</a></li>';
  if(secC(p,'skills')&&sk.length) h+='<li><a href="#services">Osaaminen</a></li>';
  if((secC(p,'experience')&&ex.length)||(secC(p,'education')&&ed.length)) h+='<li><a href="#resume">Ura</a></li>';
  if(secC(p,'achievements')&&achiev.length) h+='<li><a href="#portfolio">Saavutukset</a></li>';
  h+='<li><a href="#contact">Yhteystiedot</a></li></ul>';
  h+='<ul class="header-social">';
  if(li) h+='<li><a href="'+escC(li)+'" target="_blank" rel="noopener" title="LinkedIn">in</a></li>';
  if(em) h+='<li><a href="mailto:'+em+'" title="Email">@</a></li>';
  h+='</ul></div></header>';

  h+='<section id="home"><div class="hero-wrap"><div class="hero-bg"></div><div class="hero-mask"></div><div class="hero-content container">';
  h+='<h1>Hei, olen</h1><div class="hero-role">'+rl+'</div>';
  h+='<p class="hero-loc">'+nm+' · '+ct+'</p>';
  if(cs) h+='<p style="max-width:560px;margin:0 auto 1.5rem;opacity:.88;line-height:1.75;font-size:.95rem">'+cs+'</p>';
  h+='<a href="#contact" class="btn-primary">Ota yhteyttä</a>';
  h+='<a href="#about" class="scroll-down">↓</a></div></div></section>';

  if(secC(p,'about')){
    h+='<section class="section" id="about"><div class="container">';
    h+='<p class="text-center" style="text-align:center"><span class="badge-label">Tietoa minusta</span></p>';
    h+='<h2 class="section-title">Tutustu minuun</h2>';
    h+='<div class="about-row"><div class="about-intro">';
    h+='<h2>Hei, olen <strong>'+nm+'</strong></h2><p>'+bio+'</p></div>';
    h+='<div class="exp-badge"><div class="exp-badge-num">'+escC(yrs)+'</div>';
    h+='<h3>Vuotta <strong>kokemusta</strong></h3></div></div>';
    h+='<div class="info-grid">';
    h+='<div><label>Nimi</label><p>'+nm+'</p></div>';
    if(em) h+='<div><label>Sähköposti</label><p><a href="mailto:'+em+'">'+em+'</a></p></div>';
    h+='<div><label>Paikkakunta</label><p>'+ct+'</p></div>';
    h+='<div><label>Tavoiterooli</label><p>'+rl+'</p></div>';
    h+='</div></div></section>';
  }

  if(secC(p,'skills')&&sk.length){
    h+='<section class="section section-light" id="services"><div class="container">';
    h+='<p style="text-align:center"><span class="badge-label">Osaaminen</span></p>';
    h+='<h2 class="section-title">Mitä tuon seuraavaan tiimiin</h2>';
    h+='<div class="services-grid">';
    sk.slice(0,6).forEach(function(s,i){
      var n=normSkillC(s);
      h+='<div class="service-box"><div class="service-icon">'+SVC_ICONS[i%SVC_ICONS.length]+'</div>';
      h+='<h3>'+escC(n.name)+'</h3><p>'+escC(n.context||'')+'</p></div>';
    });
    h+='</div></div></section>';
  }

  if((secC(p,'education')&&ed.length)||(secC(p,'experience')&&ex.length)||(secC(p,'skills')&&sk.length)){
    h+='<section class="section" id="resume"><div class="container">';
    h+='<p style="text-align:center"><span class="badge-label">Ura</span></p>';
    h+='<h2 class="section-title">Koulutus ja kokemus</h2>';
    h+='<div class="resume-cols">';
    if(secC(p,'education')&&ed.length){
      h+='<div class="resume-col"><h3>Koulutus</h3><div class="timeline">';
      ed.forEach(function(e){
        var deg=typeof e==='string'?e:(e.degree||e.name||'');var sch=typeof e==='string'?'':(e.school||'');var yr=typeof e==='string'?'':(e.year||'');
        h+='<div class="timeline-item"><h4>'+escC(deg)+'</h4><p class="meta">'+escC(sch)+(yr?' / '+escC(yr):'')+'</p></div>';
      });
      h+='</div></div>';
    }
    if(secC(p,'experience')&&ex.length){
      h+='<div class="resume-col"><h3>Kokemus</h3><div class="timeline">';
      ex.forEach(function(e){
        h+='<div class="timeline-item"><h4>'+escC(e.role||e.title||'')+'</h4>';
        h+='<p class="meta">'+escC(e.company||'')+(e.period||e.years?' / '+escC(e.period||e.years):'')+'</p>';
        h+='<p>'+escC(e.desc||e.description||'')+'</p></div>';
      });
      h+='</div></div>';
    }
    h+='</div>';
    if(secC(p,'skills')&&sk.length){
      h+='<div class="skills-block"><h3>Taidot — missä olen käyttänyt niitä</h3><div class="skills-list">';
      sk.slice(0,8).forEach(function(s){
        var n=normSkillC(s);
        h+='<div class="skill-row"><span class="skill-name">'+escC(n.name)+'</span>';
        if(n.context) h+='<span class="skill-ctx">'+escC(n.context)+'</span>';
        h+='</div>';
      });
      h+='</div></div>';
    }
    h+='</div></section>';
  }

  if(secC(p,'achievements')&&achiev.length){
    h+='<section class="section section-light" id="portfolio"><div class="container">';
    h+='<p style="text-align:center"><span class="badge-label">Saavutukset</span></p>';
    h+='<h2 class="section-title">Tuloksia työssäni</h2><div class="portfolio-grid">';
    achiev.slice(0,6).forEach(function(a,i){
      var t=typeof a==='string'?a:(a.text||'');var title=t.length>48?t.substring(0,45)+'…':t;
      h+='<div class="port-box"><img src="'+PORT_IMGS[i%PORT_IMGS.length]+'" alt="">';
      h+='<div class="port-overlay"><i>★</i><h5>'+escC(title)+'</h5><span>Saavutus</span></div></div>';
    });
    h+='</div></div></section>';
  }

  h+='<section><div class="cta-wrap"><div class="cta-bg"></div><div class="cta-mask"></div>';
  h+='<div class="cta-inner"><h2>Kiinnostuitko profiilistani?</h2>';
  h+='<a href="#contact" class="btn-primary">Ota yhteyttä</a></div></div></section>';

  var strengths=(p.hidden_strengths||'').split('\n').map(function(l){return l.trim().replace(/^[-•]\s*/,'');}).filter(Boolean);
  if(secC(p,'about')&&strengths.length){
    h+='<section class="section section-light" id="faq"><div class="container"><div class="faq-row"><div class="faq-left">';
    h+='<p><span class="badge-label">Usein kysyttyä</span></p>';
    h+='<h2 class="section-title" style="text-align:left;margin-bottom:1.5rem">Mitä minusta kannattaa tietää?</h2>';
    h+='<div class="accordion" id="faqAcc">';
    strengths.slice(0,5).forEach(function(s,i){
      h+='<div class="acc-item'+(i===0?' open':'')+'"><button type="button" class="acc-head" onclick="this.parentElement.classList.toggle(\'open\')">'+escC(s.split(/[.!?]/)[0]||s)+'</button>';
      h+='<div class="acc-body">'+escC(s)+'</div></div>';
    });
    h+='</div></div><div class="faq-img"><img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500" alt=""></div></div></div></section>';
  }

  if(secC(p,'achievements')&&achiev.length){
    h+='<section class="section section-dark testi-wrap" id="testimonial"><div class="container">';
    h+='<p style="text-align:center"><span class="badge-label">Referenssit</span></p>';
    h+='<h2 class="section-title">Saavutuksia numeroina ja faktoina</h2><div class="testi-cards">';
    achiev.slice(0,3).forEach(function(a,i){
      var t=typeof a==='string'?a:(a.text||'');var roles=['Esimies','Kollega','Asiakas'];
      h+='<div class="testi-item"><div class="testi-quote">“</div><p>'+escC(t)+'</p>';
      h+='<div class="testi-av">'+iniC(roles[i]||'R')+'</div>';
      h+='<span class="testi-name">'+escC(roles[i]||'Referenssi')+'</span>';
      h+='<span class="testi-role">'+rl+'</span></div>';
    });
    h+='</div></div></section>';
  }

  h+='<section class="section contact-section" id="contact"><div class="container"><div class="contact-grid">';
  h+='<div class="contact-left"><h2>Ota yhteyttä</h2>';
  h+='<p>Kiinnostuitko profiilistani? Ota rohkeasti yhteyttä — vastaan mielelläni.</p>';
  h+='<h3>Sijainti</h3><p class="detail">'+ct+'</p>';
  if(em){h+='<h3>Sähköposti</h3><p class="detail"><a href="mailto:'+em+'">'+em+'</a></p>';}
  h+='<div class="contact-chips">';
  if(em) h+='<a class="contact-chip" href="mailto:'+em+'">Lähetä viesti</a>';
  if(li) h+='<a class="contact-chip" href="'+escC(li)+'" target="_blank" rel="noopener">LinkedIn</a>';
  h+='</div></div>';
  h+='<div class="contact-right"><h2>Haastattelupyyntö?</h2><div class="contact-card">';
  h+='<p><strong>'+nm+'</strong> — '+rl+'</p>';
  h+='<p>'+bio+'</p>';
  if(em) h+='<p style="margin-top:1rem"><a href="mailto:'+em+'" class="btn-dark">Kutsu haastatteluun</a></p>';
  h+='</div></div></div></div></section>';

  h+='<footer class="footer"><div class="container">© '+new Date().getFullYear()+' '+nm+' · Elävä CV · Callum-tyyli</div></footer>';
  return h;
}

function renderCallumPreview(p){
  p=p||{};
  var title=escC(p.full_name||'Portfolio')+' — Elävä CV';
  var head='<title>'+title+'</title><link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"><style>'+CAL_CSS+'</style>';
  var body=buildCallumBody(p);
  if(typeof PortfolioPublicFeatures!=='undefined') return PortfolioPublicFeatures.finishHtml(body,p,head);
  return '<!DOCTYPE html><html lang="fi" style="'+themeC(p)+'"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+head+'</head><body>'+body+'</body></html>';
}
