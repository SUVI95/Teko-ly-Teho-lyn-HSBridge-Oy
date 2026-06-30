/* Shane-style CV preview — dark hero, brown accent, Mulish/Poppins */
function escS(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function hrefS(raw){var u=String(raw||'').trim();if(!u)return'';if(/^https?:\/\//i.test(u))return u;return'https://'+u.replace(/^\/+/,'');}
function iniS(n){return(n||'').split(/\s+/).map(function(w){return w[0]||'';}).join('').substring(0,2).toUpperCase();}
function secS(p,k){var s=(p.visual_style&&p.visual_style.sections)||{};return s[k]!==false;}
function normSkillS(s){if(!s)return{name:'',context:''};if(typeof s==='string')return{name:s,context:''};return{name:s.name||s.skill||'',context:s.context||s.example||s.where||''};}

var SHA_CSS=':root{--bg:#fff;--bg2:#f7f5f2;--ink:#111;--muted:#666;--accent:#a67c52;--dark:#0c0c0c;--font:"Mulish",system-ui,sans-serif;--font2:"Poppins",system-ui,sans-serif}*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}html{scroll-behavior:smooth}body{font-family:var(--font);font-size:16px;line-height:1.7;color:var(--ink);background:var(--bg)}a{color:inherit;text-decoration:none}.container{max-width:1140px;margin:0 auto;padding:0 24px}.topbar{position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(255,255,255,.95);backdrop-filter:blur(8px);border-bottom:1px solid rgba(0,0,0,.06);padding:1rem 0}.topbar-inner{display:flex;align-items:center;justify-content:space-between;max-width:1140px;margin:0 auto;padding:0 24px}.brand{font-family:var(--font2);font-weight:700;font-size:1.1rem;letter-spacing:.02em}.nav{display:none;gap:2rem;list-style:none;font-size:.88rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em}@media(min-width:900px){.nav{display:flex}}.nav a{color:var(--muted);transition:color .2s}.nav a:hover,.nav a.active{color:var(--accent)}.hero{position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;color:#fff;overflow:hidden}.hero-bg{position:absolute;inset:0;background:linear-gradient(rgba(12,12,12,.55),rgba(12,12,12,.7)),url("https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600") center/cover}.hero-content{position:relative;z-index:1;padding:6rem 24px 4rem}.hero h1{font-family:var(--font2);font-size:clamp(3rem,8vw,5.5rem);font-weight:800;line-height:1;margin-bottom:1rem;text-transform:uppercase;letter-spacing:.02em}.hero h1 span{color:var(--accent)}.hero-role{display:inline-block;font-size:clamp(.95rem,2vw,1.15rem);font-weight:500;letter-spacing:.25em;text-transform:uppercase;opacity:.9}.hero-scroll{margin-top:3rem}.hero-scroll span{display:block;width:1px;height:60px;background:rgba(255,255,255,.4);margin:0 auto}.section{padding:5rem 0}.section-title{margin-bottom:2.5rem}.section-title span{display:block;font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.15em;color:var(--accent);margin-bottom:.5rem}.section-title h2{font-family:var(--font2);font-size:clamp(1.75rem,3vw,2.5rem);font-weight:700;line-height:1.2;max-width:20ch}.about-grid{display:grid;grid-template-columns:1fr;gap:3rem;align-items:center}@media(min-width:900px){.about-grid{grid-template-columns:1fr 1fr}}.about-photo{position:relative;border-radius:4px;overflow:hidden;padding-top:100%;background:var(--bg2)}.about-photo img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.about-text p{color:var(--muted);margin-bottom:1.25rem;line-height:1.8}.btn{display:inline-block;padding:.9rem 2rem;background:var(--accent);color:#fff;font-weight:700;font-size:.85rem;text-transform:uppercase;letter-spacing:.08em;border-radius:0;transition:opacity .2s}.btn:hover{opacity:.88}.btn-outline{background:transparent;border:2px solid var(--accent);color:var(--accent)}.exp-section{background:var(--bg2)}.exp-head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:1rem;margin-bottom:2.5rem}.exp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.5rem}.exp-item{position:relative;overflow:hidden;background:var(--bg);group:exp}.exp-thumb{position:relative;padding-top:75%;overflow:hidden;background:#ddd}.exp-thumb img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:transform .5s}.exp-item:hover .exp-thumb img{transform:scale(1.05)}.exp-meta{padding:1.25rem 1rem 1.5rem}.exp-meta h3{font-family:var(--font2);font-size:1.05rem;margin-bottom:.25rem}.exp-meta .co{font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--accent)}.exp-meta p{font-size:.86rem;color:var(--muted);margin-top:.5rem;line-height:1.6}.skills-wrap{display:grid;grid-template-columns:1fr;gap:3rem;align-items:start}@media(min-width:900px){.skills-wrap{grid-template-columns:1fr 1fr}}.skills-list{display:flex;flex-direction:column;gap:0}.skill-item{padding:1.15rem 0;border-bottom:1px solid rgba(0,0,0,.08)}.skill-item:last-child{border-bottom:none}.skill-name{font-family:var(--font2);font-weight:700;font-size:.95rem;margin-bottom:.3rem;display:block}.skill-context{font-size:.88rem;color:var(--muted);line-height:1.55}.quote-band{position:relative;padding:5rem 24px;text-align:center;color:#fff;overflow:hidden}.quote-bg{position:absolute;inset:0;background:linear-gradient(rgba(12,12,12,.7),rgba(12,12,12,.75)),url("https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1600") center/cover}.quote-inner{position:relative;z-index:1;max-width:720px;margin:0 auto}.quote-inner h3{font-family:var(--font2);font-size:clamp(1.5rem,3vw,2rem);font-weight:600;line-height:1.4;margin-bottom:1.5rem}.testi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1.5rem;margin-top:2rem}.testi-card{background:var(--bg2);padding:2rem;border-left:3px solid var(--accent)}.testi-card p{font-size:.92rem;line-height:1.7;color:var(--muted);margin-bottom:1.25rem;font-style:italic}.testi-author{display:flex;align-items:center;gap:.75rem}.testi-av{width:48px;height:48px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.8rem}.testi-name{font-family:var(--font2);font-weight:700;font-size:.9rem}.testi-role{font-size:.78rem;color:var(--muted)}.cta-band{background:var(--dark);color:#fff;text-align:center;padding:5rem 24px}.cta-band h3{font-family:var(--font2);font-size:clamp(1.75rem,4vw,2.75rem);font-weight:700;margin-bottom:1.5rem}.contact-chips{display:flex;flex-wrap:wrap;justify-content:center;gap:.65rem;margin-top:1.5rem}.chip{padding:.55rem 1.15rem;border:1px solid rgba(255,255,255,.2);font-size:.85rem;color:rgba(255,255,255,.85)}.chip:hover{border-color:var(--accent);color:var(--accent)}.edu-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1.25rem;margin-top:2rem}.edu-card{background:var(--bg);border:1px solid rgba(0,0,0,.08);padding:1.5rem}.edu-card h3{font-family:var(--font2);font-size:1rem;margin-bottom:.35rem}.edu-card p{font-size:.85rem;color:var(--muted)}.footer{padding:2rem 0;text-align:center;font-size:.82rem;color:var(--muted);border-top:1px solid rgba(0,0,0,.06)}';

function themeS(p){
  var vs=p.visual_style||{};
  return '--bg:'+(vs.bg||p.brand_bg||'#ffffff')+';--bg2:'+(vs.bg2||'#f7f5f2')+';--ink:'+(vs.ink||p.brand_color||'#111111')+';--accent:'+(vs.accent||p.brand_accent||'#a67c52')+';--dark:'+(vs.dark||'#0c0c0c')+';';
}

var EXP_IMGS=[
  'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600',
  'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=600',
  'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=600',
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600'
];
var ABOUT_IMG='https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600';

function buildShaneBody(p){
  var nm=escS(p.full_name||''),parts=(p.full_name||'').trim().split(/\s+/);
  var first=escS(parts[0]||''),last=escS(parts.slice(1).join(' ')||'');
  var rl=escS(p.target_role||''),ct=escS(p.city||''),em=escS(p.email_public||''),li=p.linkedin_url?hrefS(p.linkedin_url):'';
  var sk=p.skills||[],ex=(p.experience||[]).filter(function(e){return e&&e.show!==false}),ed=p.education||[],achiev=p.achievements||[];
  var bio=escS(p.bio||''),cs=escS(p.career_summary||p.bio||'');
  var photo=p.has_photo&&p.slug?'/api/portfolio/photo/'+encodeURIComponent(p.slug):ABOUT_IMG;
  var h='';

  h+='<header class="topbar"><div class="topbar-inner">';
  h+='<a href="#home" class="brand">'+first+'.</a>';
  h+='<ul class="nav"><li><a href="#home" class="active">Koti</a></li>';
  h+='<li><a href="#about">Tietoa</a></li>';
  if(secS(p,'experience')&&ex.length) h+='<li><a href="#portfolio">Kokemus</a></li>';
  if(secS(p,'skills')&&sk.length) h+='<li><a href="#skills">Taidot</a></li>';
  h+='<li><a href="#contact">Yhteystiedot</a></li></ul></div></header>';

  h+='<section class="hero" id="home"><div class="hero-bg"></div><div class="hero-content">';
  h+='<h1>'+first+(last?' <span>'+last+'</span>':'')+'</h1>';
  h+='<span class="hero-role">'+rl+' · '+ct+'</span>';
  h+='<p style="max-width:520px;margin:1.5rem auto 0;opacity:.85;line-height:1.7;font-size:.95rem">'+cs+'</p>';
  h+='<div style="margin-top:2rem"><a href="#contact" class="btn">Ota yhteyttä</a></div>';
  h+='<div class="hero-scroll"><span></span></div></div></section>';

  if(secS(p,'about')){
    h+='<section class="section" id="about"><div class="container"><div class="about-grid">';
    h+='<div class="about-photo"><img src="'+photo+'" alt="'+nm+'"></div>';
    h+='<div><div class="section-title"><span>Tietoa minusta</span><h2>Ammattitaitoinen osaaja — '+ct+'</h2></div>';
    h+='<div class="about-text"><p>'+bio+'</p>';
    if(p.hidden_strengths){String(p.hidden_strengths).split('\n').filter(Boolean).slice(0,2).forEach(function(l){h+='<p>'+escS(l.replace(/^[-•]\s*/,''))+'</p>';});}
    h+='</div><a href="#contact" class="btn">Kutsu haastatteluun</a></div></div></div></section>';
  }

  if(secS(p,'experience')&&ex.length){
    h+='<section class="section exp-section" id="portfolio"><div class="container">';
    h+='<div class="exp-head"><div class="section-title" style="margin:0"><span>Urapolku</span><h2>Kokemusta rekrytoijalle</h2></div></div>';
    h+='<div class="exp-grid">';
    ex.forEach(function(e,i){
      h+='<article class="exp-item"><div class="exp-thumb"><img src="'+EXP_IMGS[i%EXP_IMGS.length]+'" alt=""></div>';
      h+='<div class="exp-meta"><h3>'+escS(e.role||e.title||'')+'</h3><div class="co">'+escS(e.company||'')+' · '+escS(e.period||e.years||'')+'</div>';
      h+='<p>'+escS(e.desc||e.description||'')+'</p></div></article>';
    });
    h+='</div></div></section>';
  }

  if(secS(p,'skills')&&sk.length){
    h+='<section class="section" id="skills"><div class="container"><div class="skills-wrap">';
    h+='<div><div class="section-title"><span>Osaaminen</span><h2>Taidot joilla erotun</h2></div>';
    h+='<p style="color:var(--muted);line-height:1.75">Konkreettiset taidot — lyhyesti, missä olen käyttänyt niitä työssä. Ei prosentteja, vaan todistettava kokemus.</p></div>';
    h+='<div class="skills-list">';
    sk.slice(0,8).forEach(function(s){
      var n=normSkillS(s);
      h+='<div class="skill-item"><span class="skill-name">'+escS(n.name)+'</span>';
      if(n.context) h+='<span class="skill-context">'+escS(n.context)+'</span>';
      h+='</div>';
    });
    h+='</div></div></div></section>';
  }

  if(secS(p,'achievements')&&achiev.length){
    var q=typeof achiev[0]==='string'?achiev[0]:(achiev[0].text||'');
    h+='<section class="quote-band"><div class="quote-bg"></div><div class="quote-inner">';
    h+='<h3>“'+escS(q)+'”</h3><a href="#contact" class="btn">Keskustellaan roolista</a></div></section>';
  }

  if(secS(p,'education')&&ed.length){
    h+='<section class="section" style="background:var(--bg2)"><div class="container">';
    h+='<div class="section-title"><span>Koulutus</span><h2>Akateeminen pohja</h2></div><div class="edu-grid">';
    ed.forEach(function(e){
      var deg=typeof e==='string'?e:(e.degree||e.name||'');var sch=typeof e==='string'?'':(e.school||'');var yr=typeof e==='string'?'':(e.year||'');
      h+='<div class="edu-card"><h3>'+escS(deg)+'</h3><p>'+escS(sch)+(yr?' · '+escS(yr):'')+'</p></div>';
    });
    h+='</div></div></section>';
  }

  if(secS(p,'achievements')&&achiev.length>1){
    h+='<section class="section"><div class="container"><div class="section-title"><span>Saavutukset</span><h2>Tuloksia työssäni</h2></div><div class="testi-grid">';
    achiev.slice(0,3).forEach(function(a,i){
      var t=typeof a==='string'?a:(a.text||'');var roles=['Esimies','Kollega','Asiakas'];
      h+='<div class="testi-card"><p>“'+escS(t)+'”</p><div class="testi-author"><div class="testi-av">'+iniS(roles[i]||'R')+'</div>';
      h+='<div><div class="testi-name">'+escS(roles[i]||'Referenssi')+'</div><div class="testi-role">'+rl+'</div></div></div></div>';
    });
    h+='</div></div></section>';
  }

  h+='<section class="cta-band" id="contact"><h3>Tehdään yhteistyötä!</h3>';
  h+='<p style="opacity:.7;margin-bottom:1rem">Kiinnostuitko profiilistani? Ota yhteyttä.</p>';
  h+='<a href="mailto:'+em+'" class="btn">Lähetä viesti</a>';
  h+='<div class="contact-chips">';
  if(em) h+='<a class="chip" href="mailto:'+em+'">'+em+'</a>';
  if(ct) h+='<span class="chip">'+ct+'</span>';
  if(li) h+='<a class="chip" href="'+escS(li)+'" target="_blank" rel="noopener">LinkedIn</a>';
  h+='</div></section>';

  h+='<footer class="footer"><div class="container">'+nm+' © '+new Date().getFullYear()+' · Elävä CV · Shane-tyyli</div></footer>';
  return h;
}

function renderShanePreview(p){
  p=p||{};
  var title=escS(p.full_name||'Portfolio')+' — Elävä CV';
  return '<!DOCTYPE html><html lang="fi" style="'+themeS(p)+'"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+'</title><link href="https://fonts.googleapis.com/css2?family=Mulish:wght@400;500;600;700;800&family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet"><style>'+SHA_CSS+'</style></head><body>'+buildShaneBody(p)+'</body></html>';
}
