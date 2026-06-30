/* Femia-style CV preview — soft blush, Plus Jakarta Sans */
function escF(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function hrefF(raw){var u=String(raw||'').trim();if(!u)return'';if(/^https?:\/\//i.test(u))return u;return'https://'+u.replace(/^\/+/,'');}
function iniF(n){return(n||'').split(/\s+/).map(function(w){return w[0]||'';}).join('').substring(0,2).toUpperCase();}
function secF(p,k){var s=(p.visual_style&&p.visual_style.sections)||{};return s[k]!==false;}
function normSkillF(s){if(!s)return{name:'',context:''};if(typeof s==='string')return{name:s,context:''};return{name:s.name||s.skill||'',context:s.context||s.example||s.where||''};}

var FEM_CSS=':root{--blush:#FFF5F2;--blush2:#FDF0EB;--ink:#2D2428;--ink-soft:#6B5F63;--rose:#C17B8B;--rose-dark:#9E5A6A;--white:#fff;--card:#FFFBFA;--radius:16px;--font:"Plus Jakarta Sans",system-ui,sans-serif}*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}html{scroll-behavior:smooth}body{font-family:var(--font);font-size:16px;line-height:1.65;color:var(--ink);background:var(--blush)}a{color:inherit;text-decoration:none}.wrap{max-width:1140px;margin:0 auto;padding:0 24px}.dot-label{display:inline-flex;align-items:center;gap:.5rem;font-size:.78rem;font-weight:600;color:var(--ink-soft);margin-bottom:1rem}.dot-label::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--rose);flex-shrink:0}h1,h2,h3{font-weight:700;line-height:1.2;letter-spacing:-.02em}.accent{color:var(--rose)}.btn{display:inline-flex;align-items:center;gap:.5rem;padding:.85rem 1.6rem;border-radius:999px;font-size:.88rem;font-weight:600;border:none;cursor:pointer;transition:transform .2s,box-shadow .2s;font-family:var(--font)}.btn-primary{background:var(--rose);color:var(--white)}.btn-primary:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(193,123,139,.35)}.btn-ghost{background:var(--white);color:var(--ink);border:1.5px solid rgba(45,36,40,.1)}.site-header{padding:1.25rem 0;background:rgba(255,245,242,.9);backdrop-filter:blur(10px);position:sticky;top:0;z-index:100;border-bottom:1px solid rgba(45,36,40,.05)}.header-inner{display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap}.brand{font-size:1.15rem;font-weight:800;color:var(--ink)}.nav{display:none;gap:1.75rem;list-style:none;font-size:.88rem;font-weight:500;color:var(--ink-soft)}.nav a:hover{color:var(--rose)}@media(min-width:900px){.nav{display:flex}}.hero{padding:3rem 0 4rem;background:linear-gradient(180deg,var(--blush) 0%,var(--blush2) 100%)}.hero-grid{display:grid;grid-template-columns:1fr;gap:2.5rem;align-items:center}@media(min-width:900px){.hero-grid{grid-template-columns:1fr 1fr}}.hero h1{font-size:clamp(2.2rem,4.5vw,3.4rem);margin-bottom:1.25rem}.hero-lead{color:var(--ink-soft);max-width:480px;margin-bottom:1.5rem;line-height:1.75}.hero-btns{display:flex;flex-wrap:wrap;gap:.75rem;margin-bottom:2rem}.hero-stats{display:flex;flex-wrap:wrap;gap:2rem}.stat-n{font-size:2rem;font-weight:800;color:var(--ink);line-height:1}.stat-l{font-size:.72rem;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.06em;margin-top:.25rem}.hero-photo-wrap{position:relative}.hero-photo{border-radius:var(--radius);overflow:hidden;min-height:420px;background:linear-gradient(135deg,var(--blush2),#E8B4BC)}.hero-photo img{width:100%;height:100%;object-fit:cover;min-height:420px;display:block}.photo-badge{position:absolute;background:var(--white);border-radius:12px;padding:.85rem 1rem;box-shadow:0 8px 32px rgba(45,36,40,.08);font-size:.82rem}.photo-badge.tl{top:1rem;left:-.5rem}.photo-badge.br{bottom:2rem;right:-.5rem;text-align:center}.photo-badge strong{display:block;font-size:1.1rem;color:var(--rose)}.section{padding:4.5rem 0}.section-soft{background:var(--blush2)}.section-white{background:var(--white)}.section-h{font-size:clamp(1.85rem,3.5vw,2.65rem);margin-bottom:1rem;max-width:18ch}.section-lead{color:var(--ink-soft);max-width:520px;margin-bottom:2rem;line-height:1.7}.about-grid{display:grid;grid-template-columns:1fr;gap:3rem;align-items:center}@media(min-width:900px){.about-grid{grid-template-columns:1fr 1fr}}.about-img{border-radius:var(--radius);overflow:hidden;min-height:360px}.about-img img{width:100%;height:100%;object-fit:cover;min-height:360px}.icon-rows{display:flex;flex-direction:column;gap:1.25rem;margin-top:2rem}.icon-row{display:flex;gap:1rem;align-items:flex-start;padding:1.25rem;background:var(--card);border-radius:var(--radius);border:1px solid rgba(45,36,40,.05)}.icon-dot{width:10px;height:10px;border-radius:50%;background:var(--rose);margin-top:.45rem;flex-shrink:0}.icon-row h3{font-size:1rem;margin-bottom:.35rem}.icon-row p{font-size:.88rem;color:var(--ink-soft);line-height:1.6}.offer-head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:1.5rem;margin-bottom:2.5rem}.offer-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1.25rem}.offer-card{background:var(--card);border-radius:var(--radius);padding:1.75rem 1.5rem;border:1px solid rgba(45,36,40,.06);position:relative;transition:transform .25s}.offer-card:hover{transform:translateY(-3px)}.offer-num{position:absolute;top:1rem;right:1.25rem;font-size:2.5rem;font-weight:800;color:rgba(193,123,139,.15);line-height:1}.offer-card h3{font-size:1.05rem;margin-bottom:.5rem;padding-right:2rem}.offer-card p{font-size:.86rem;color:var(--ink-soft);line-height:1.6}.quote-band{background:var(--rose);color:var(--white);border-radius:var(--radius);padding:2.5rem;margin:0 24px 3rem;max-width:calc(1140px - 48px);margin-left:auto;margin-right:auto;text-align:center}.quote-band em{font-family:Georgia,serif;font-size:1.15rem;line-height:1.7;display:block;margin-bottom:.75rem}.quote-band span{font-size:.85rem;opacity:.9}.approach-list{display:flex;flex-direction:column;gap:1.5rem;margin-top:2rem}.approach-item{display:flex;gap:1.25rem;align-items:flex-start}.approach-icon{width:48px;height:48px;border-radius:12px;background:var(--blush2);display:flex;align-items:center;justify-content:center;font-size:1.25rem;flex-shrink:0}.approach-item h3{font-size:1rem;margin-bottom:.35rem}.approach-item p{font-size:.88rem;color:var(--ink-soft);line-height:1.6}.skills-list{max-width:720px;margin-top:2rem}.skill-row{padding:1.15rem 0 1.15rem 1rem;border-left:3px solid var(--rose);border-bottom:1px solid rgba(45,36,40,.06)}.skill-row:last-child{border-bottom:none}.skill-name{display:block;font-weight:700;font-size:.98rem;margin-bottom:.3rem}.skill-context{display:block;font-size:.88rem;color:var(--ink-soft);line-height:1.55}.testi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1.25rem;margin-top:2rem}.testi-card{background:var(--card);border-radius:var(--radius);padding:1.75rem;border:1px solid rgba(45,36,40,.06)}.stars{color:var(--rose);font-size:.9rem;letter-spacing:.1em;margin-bottom:.75rem}.testi-text{font-size:.92rem;line-height:1.65;color:var(--ink);margin-bottom:1.25rem;font-style:italic}.testi-author{display:flex;align-items:center;gap:.75rem}.testi-av{width:44px;height:44px;border-radius:50%;background:var(--rose);color:var(--white);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.75rem}.testi-meta{font-size:.82rem}.testi-meta strong{display:block;color:var(--ink)}.testi-meta span{color:var(--ink-soft)}.cta-section{padding:4rem 0;background:linear-gradient(135deg,var(--blush2),var(--white))}.cta-box{max-width:640px;margin:0 auto;text-align:center}.cta-box h2{margin-bottom:1rem}.cta-box p{color:var(--ink-soft);margin-bottom:1.5rem}.contact-chips{display:flex;flex-wrap:wrap;justify-content:center;gap:.65rem;margin-top:1.25rem}.chip{padding:.6rem 1.2rem;background:var(--white);border-radius:999px;font-size:.85rem;border:1px solid rgba(45,36,40,.08)}.site-footer{background:var(--ink);color:rgba(255,255,255,.65);padding:3rem 0 1.5rem;font-size:.85rem}.footer-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:2rem;margin-bottom:2rem}.footer-brand{font-weight:800;color:var(--white);font-size:1.1rem;margin-bottom:.5rem}.footer-col h4{color:var(--white);font-size:.75rem;text-transform:uppercase;letter-spacing:.08em;margin-bottom:.75rem}.footer-col ul{list-style:none}.footer-col li{margin-bottom:.4rem}.footer-col a{color:rgba(255,255,255,.55)}.footer-col a:hover{color:var(--rose)}.footer-bottom{text-align:center;padding-top:1.5rem;border-top:1px solid rgba(255,255,255,.1);font-size:.78rem}';

function themeF(p){
  var vs=p.visual_style||{};
  return '--blush:'+(vs.blush||p.brand_bg||'#FFF5F2')+';--blush2:'+(vs.blush2||'#FDF0EB')+';--ink:'+(vs.ink||p.brand_color||'#2D2428')+';--rose:'+(vs.rose||p.brand_accent||'#C17B8B')+';';
}

var HERO_IMG='https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800';
var ABOUT_IMG='https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=600';

function buildFemiaBody(p){
  var nm=escF(p.full_name||''),rl=escF(p.target_role||''),ct=escF(p.city||''),em=escF(p.email_public||''),li=p.linkedin_url?hrefF(p.linkedin_url):'';
  var sk=p.skills||[],ex=(p.experience||[]).filter(function(e){return e&&e.show!==false}),ed=p.education||[],achiev=p.achievements||[];
  var bio=escF(p.bio||''),cs=escF(p.career_summary||p.bio||'');
  var photo=p.has_photo&&p.slug?'/api/portfolio/photo/'+encodeURIComponent(p.slug):HERO_IMG;
  var first=escF((p.full_name||'').split(' ')[0]||'');
  var h='';

  h+='<header class="site-header"><div class="wrap header-inner">';
  h+='<a href="#top" class="brand">'+first+'.</a>';
  h+='<ul class="nav"><li><a href="#about">Tietoa</a></li>';
  if(secF(p,'skills')&&sk.length) h+='<li><a href="#skills">Taidot</a></li>';
  if(secF(p,'experience')&&ex.length) h+='<li><a href="#experience">Kokemus</a></li>';
  h+='<li><a href="#contact">Yhteystiedot</a></li></ul>';
  h+='<a href="#contact" class="btn btn-primary" style="padding:.55rem 1.2rem;font-size:.82rem;">Ota yhteyttä →</a></div></header>';

  h+='<section class="hero" id="top"><div class="wrap hero-grid"><div>';
  h+='<div class="dot-label">'+rl+' · '+ct+'</div>';
  h+='<h1>Valmis tuomaan arvoa —<br><span class="accent">'+nm+'</span> seuraavaan tiimiisi.</h1>';
  h+='<p class="hero-lead">'+cs+'</p>';
  h+='<div class="hero-btns"><a href="#contact" class="btn btn-primary">Kutsu haastatteluun →</a>';
  if(li) h+='<a href="'+escF(li)+'" target="_blank" rel="noopener" class="btn btn-ghost">LinkedIn</a>';
  h+='</div><div class="hero-stats">';
  h+='<div><div class="stat-n">'+(ex.length||0)+'+</div><div class="stat-l">Työkokemusta</div></div>';
  h+='<div><div class="stat-n">'+(sk.length||0)+'+</div><div class="stat-l">Ydintaitoa</div></div>';
  h+='<div><div class="stat-n">'+(achiev.length||0)+'</div><div class="stat-l">Saavutusta</div></div></div></div>';
  h+='<div class="hero-photo-wrap"><div class="hero-photo"><img src="'+photo+'" alt="'+nm+'"></div>';
  h+='<div class="photo-badge tl"><strong>'+first+'</strong>'+rl+'</div>';
  if(sk.length) h+='<div class="photo-badge br"><strong>'+escF(normSkillF(sk[0]).name||'Osaaja')+'</strong>Ydinosaaminen</div>';
  h+='</div></div></section>';

  if(secF(p,'about')){
    h+='<section class="section section-white" id="about"><div class="wrap about-grid">';
    h+='<div><div class="dot-label">Tietoa minusta</div>';
    h+='<h2 class="section-h">Into työhön. <span class="accent">Sitoutuminen</span> tuloksiin.</h2>';
    h+='<p class="section-lead" style="margin-bottom:1rem">'+bio+'</p>';
    if(p.hidden_strengths){String(p.hidden_strengths).split('\n').filter(Boolean).slice(0,2).forEach(function(l){h+='<p style="color:var(--ink-soft);margin-bottom:.75rem;line-height:1.7">'+escF(l.replace(/^[-•]\s*/,''))+'</p>';});}
    h+='<a href="#contact" class="btn btn-primary">Lue lisää →</a></div>';
    h+='<div class="about-img"><img src="'+ABOUT_IMG+'" alt=""></div></div></section>';

    if(sk.length>=3){
      h+='<section class="section section-soft"><div class="wrap"><div class="icon-rows">';
      sk.slice(0,3).forEach(function(s){
        var n=normSkillF(s);
        h+='<div class="icon-row"><span class="icon-dot"></span><div><h3>'+escF(n.name)+'</h3><p>'+escF(n.context||'Konkreettista osaamista työelämästä.')+'</p></div></div>';
      });
      h+='</div></div></section>';
    }
  }

  if(secF(p,'experience')&&ex.length){
    h+='<section class="section section-white" id="experience"><div class="wrap">';
    h+='<div class="offer-head"><div><div class="dot-label">Urapolku</div>';
    h+='<h2 class="section-h">Kokemusta joka <span class="accent">tuottaa arvoa</span></h2></div>';
    h+='<p class="section-lead" style="margin:0;max-width:340px">Konkreettisia rooleja ja mitattavia tuloksia eri organisaatioissa.</p></div>';
    h+='<div class="offer-grid">';
    ex.forEach(function(e,i){
      var num=String(i+1).padStart(2,'0');
      h+='<article class="offer-card"><span class="offer-num">'+num+'</span>';
      h+='<h3>'+escF(e.role||e.title||'')+'</h3>';
      h+='<p><strong style="color:var(--rose)">'+escF(e.company||'')+' · '+escF(e.period||e.years||'')+'</strong><br>'+escF(e.desc||e.description||'')+'</p></article>';
    });
    h+='</div></div></section>';
  }

  if(achiev.length&&secF(p,'achievements')){
    var q=typeof achiev[0]==='string'?achiev[0]:(achiev[0].text||'');
    h+='<div class="quote-band"><em>“'+escF(q)+'”</em><span>— '+nm+'</span></div>';
  }

  h+='<section class="section section-soft"><div class="wrap"><div class="dot-label">Työskentelytapa</div>';
  h+='<h2 class="section-h">Näin <span class="accent">toimin</span> tiimissä</h2>';
  h+='<div class="approach-list">';
  var steps=[
    {icon:'◎',t:'Kuuntelen & kartoitan',d:'Ymmärrän tarpeet, tiimin ja tavoitteet ennen kuin aloitan.'},
    {icon:'◈',t:'Suunnittelen selkeästi',d:'Priorisoin tärkeimmät asiat ja teen suunnitelman, jota kaikki seuraavat.'},
    {icon:'◇',t:'Toteutan & johdan',d:'Vien projektit maaliin aikataulussa — läpinäkyvästi ja yhteistyössä.'},
    {icon:'★',t:'Toimitan tuloksia',d:'Mitattavia parannuksia ja opit jaettuna eteenpäin.'}
  ];
  steps.forEach(function(s){h+='<div class="approach-item"><div class="approach-icon">'+s.icon+'</div><div><h3>'+s.t+'</h3><p>'+s.d+'</p></div></div>';});
  h+='</div></div></section>';

  if(secF(p,'skills')&&sk.length){
    h+='<section class="section section-white" id="skills"><div class="wrap"><div class="dot-label">Osaaminen</div>';
    h+='<h2 class="section-h">Taidot joilla <span class="accent">erotun</span></h2>';
    h+='<p class="section-lead">Konkreettiset taidot — lyhyesti, missä olen käyttänyt niitä työssä.</p>';
    h+='<div class="skills-list">';
    sk.slice(0,8).forEach(function(s){
      var n=normSkillF(s);
      h+='<div class="skill-row"><span class="skill-name">'+escF(n.name)+'</span>';
      if(n.context) h+='<span class="skill-context">'+escF(n.context)+'</span>';
      h+='</div>';
    });
    h+='</div></div></section>';
  }

  if(secF(p,'education')&&ed.length){
    h+='<section class="section section-soft"><div class="wrap"><div class="dot-label">Koulutus</div>';
    h+='<h2 class="section-h">Akateeminen <span class="accent">pohja</span></h2><div class="offer-grid">';
    ed.forEach(function(e,i){
      var deg=typeof e==='string'?e:(e.degree||e.name||'');var sch=typeof e==='string'?'':(e.school||'');var yr=typeof e==='string'?'':(e.year||'');
      h+='<article class="offer-card"><span class="offer-num">'+String(i+1).padStart(2,'0')+'</span><h3>'+escF(deg)+'</h3><p>'+escF(sch)+(yr?' · '+escF(yr):'')+'</p></article>';
    });
    h+='</div></div></section>';
  }

  if(secF(p,'achievements')&&achiev.length>1){
    h+='<section class="section section-white"><div class="wrap"><div class="dot-label">Saavutukset</div>';
    h+='<h2 class="section-h">Tuloksia jotka <span class="accent">puhuvat puolestaan</span></h2><div class="testi-grid">';
    achiev.slice(0,3).forEach(function(a,i){
      var t=typeof a==='string'?a:(a.text||'');var roles=['Esimies','Kollega','Asiakas'];
      h+='<div class="testi-card"><div class="stars">★★★★★</div><p class="testi-text">“'+escF(t)+'”</p>';
      h+='<div class="testi-author"><div class="testi-av">'+iniF(roles[i]||'R')+'</div><div class="testi-meta"><strong>'+escF(roles[i]||'Referenssi')+'</strong><span>'+rl+'</span></div></div></div>';
    });
    h+='</div></div></section>';
  }

  h+='<section class="cta-section" id="contact"><div class="wrap cta-box">';
  h+='<div class="dot-label" style="justify-content:center">Ota yhteyttä</div>';
  h+='<h2>Valmis keskustelemaan seuraavasta roolista?</h2>';
  h+='<p>Kiinnostuitko profiilistani? Lähetä viesti tai ota suoraan yhteyttä.</p>';
  h+='<a href="#contact" class="btn btn-primary">Ota yhteyttä →</a>';
  h+='<div class="contact-chips">';
  if(em) h+='<a class="chip" href="mailto:'+em+'">'+em+'</a>';
  if(ct) h+='<span class="chip">'+ct+'</span>';
  if(li) h+='<a class="chip" href="'+escF(li)+'" target="_blank" rel="noopener">LinkedIn</a>';
  h+='</div></div></section>';

  h+='<footer class="site-footer"><div class="wrap"><div class="footer-grid">';
  h+='<div><div class="footer-brand">'+nm+'</div><p style="max-width:240px;line-height:1.6">Elävä CV · Femia-tyyli</p></div>';
  h+='<div class="footer-col"><h4>Navigointi</h4><ul><li><a href="#about">Tietoa</a></li><li><a href="#skills">Taidot</a></li><li><a href="#experience">Kokemus</a></li></ul></div>';
  h+='<div class="footer-col"><h4>Yhteystiedot</h4><ul><li>'+em+'</li><li>'+ct+'</li></ul></div></div>';
  h+='<div class="footer-bottom">'+nm+' © '+new Date().getFullYear()+' · Elävä CV</div></div></footer>';
  return h;
}

function renderFemiaPreview(p){
  p=p||{};
  var title=escF(p.full_name||'Portfolio')+' — Elävä CV';
  return '<!DOCTYPE html><html lang="fi" style="'+themeF(p)+'"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+'</title><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"><style>'+FEM_CSS+'</style></head><body>'+buildFemiaBody(p)+'</body></html>';
}
