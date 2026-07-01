/* Reeni-style CV preview — white modern, gradient accent, split hero */
function escR(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function hrefR(raw){var u=String(raw||'').trim();if(!u)return'';if(/^https?:\/\//i.test(u))return u;return'https://'+u.replace(/^\/+/,'');}
function iniR(n){return(n||'').split(/\s+/).map(function(w){return w[0]||'';}).join('').substring(0,2).toUpperCase();}
function secR(p,k){var s=(p.visual_style&&p.visual_style.sections)||{};return s[k]!==false;}
function normSkillR(s){if(!s)return{name:'',context:''};if(typeof s==='string')return{name:s,context:''};return{name:s.name||s.skill||'',context:s.context||s.example||s.where||''};}
function yrsR(ex){if(!ex||!ex.length)return 8;var n=0;ex.forEach(function(e){var y=String(e.period||e.years||'');var m=y.match(/(\d{4})/g);if(m&&m.length)n=Math.max(n,new Date().getFullYear()-parseInt(m[0],10));});return n?Math.min(n,30):8;}

var REE_CSS=':root{--bg:#fff;--bg2:#f6f6f9;--ink:#141414;--muted:#717178;--accent:#ff014f;--accent2:#ff6b35;--dark:#141414;--font:"DM Sans",system-ui,sans-serif;--grad:linear-gradient(90deg,var(--accent),var(--accent2))}*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}html{scroll-behavior:smooth}body{font-family:var(--font);font-size:16px;line-height:1.7;color:var(--ink);background:var(--bg)}a{color:inherit;text-decoration:none}.container{max-width:1200px;margin:0 auto;padding:0 24px}.grad-text{background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}.header{position:sticky;top:0;z-index:100;background:rgba(255,255,255,.92);backdrop-filter:blur(10px);border-bottom:1px solid rgba(0,0,0,.05)}.header-inner{display:flex;align-items:center;justify-content:space-between;padding:1rem 0;gap:1rem}.brand{font-weight:700;font-size:1.1rem;letter-spacing:-.02em}.nav{display:none;gap:2rem;list-style:none;font-size:.88rem;font-weight:500}@media(min-width:1100px){.nav{display:flex}}.nav a{color:var(--muted);transition:color .2s}.nav a:hover,.nav a.active{color:var(--ink)}.header-right{display:flex;align-items:center;gap:1rem}.social{display:none;gap:.5rem}@media(min-width:768px){.social{display:flex}}.social a{width:36px;height:36px;border-radius:50%;border:1px solid rgba(0,0,0,.08);display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:700;color:var(--muted)}.social a:hover{border-color:var(--accent);color:var(--accent)}.hero{padding:4rem 0 5rem;overflow:hidden}.hero-grid{display:grid;grid-template-columns:1fr;gap:3rem;align-items:center}@media(min-width:992px){.hero-grid{grid-template-columns:1fr 1fr}}.hero-left .hello{display:block;font-size:.9rem;font-weight:600;text-transform:uppercase;letter-spacing:.12em;color:var(--muted);margin-bottom:.75rem}.hero-left h1{font-size:clamp(2rem,4.5vw,3.25rem);font-weight:700;line-height:1.15;margin-bottom:1rem;letter-spacing:-.03em}.hero-left h1 .role{display:block;margin-top:.35rem;font-size:clamp(1.5rem,3.5vw,2.5rem)}.hero-left p{color:var(--muted);max-width:480px;margin-bottom:1.75rem;line-height:1.75}.btn-ree{display:inline-flex;align-items:center;gap:.65rem;padding:.9rem 1.75rem;background:var(--ink);color:#fff;font-weight:600;font-size:.88rem;border-radius:999px;transition:transform .2s,box-shadow .2s}.btn-ree:hover{transform:translateY(-2px);box-shadow:0 12px 32px rgba(0,0,0,.12)}.btn-ree .arr{font-size:.85rem}.hero-right{position:relative;text-align:center}.hero-photo-wrap{position:relative;display:inline-block;max-width:420px;width:100%}.hero-photo-wrap img{width:100%;border-radius:12px;object-fit:cover;aspect-ratio:4/5;box-shadow:0 24px 60px rgba(0,0,0,.12)}.hero-watermark{position:absolute;font-size:clamp(2.5rem,6vw,4.5rem);font-weight:800;text-transform:uppercase;opacity:.06;letter-spacing:.05em;white-space:nowrap;pointer-events:none;z-index:0}.hero-watermark.w1{top:10%;right:-5%;animation:float1 6s ease-in-out infinite}.hero-watermark.w2{bottom:15%;left:-8%;animation:float2 7s ease-in-out infinite}@keyframes float1{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}@keyframes float2{0%,100%{transform:translateY(0)}50%{transform:translateY(10px)}}.section{padding:5rem 0}.section-head{text-align:center;margin-bottom:3rem}.sub-label{display:inline-block;font-size:.78rem;font-weight:600;text-transform:uppercase;letter-spacing:.14em;color:var(--accent);margin-bottom:.75rem}.section-head h2{font-size:clamp(1.75rem,3.5vw,2.75rem);font-weight:700;line-height:1.2;letter-spacing:-.03em;margin-bottom:.75rem}.section-head p{color:var(--muted);max-width:560px;margin:0 auto;line-height:1.75}.svc-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1.25rem}.svc-card{padding:2rem 1.5rem;border:1px solid rgba(0,0,0,.06);border-radius:12px;text-align:center;transition:border-color .2s,box-shadow .2s;background:var(--bg)}.svc-card:hover{border-color:rgba(255,1,79,.25);box-shadow:0 12px 40px rgba(255,1,79,.08)}.svc-icon{width:52px;height:52px;margin:0 auto 1.25rem;border-radius:50%;background:var(--bg2);display:flex;align-items:center;justify-content:center;font-size:1.35rem;color:var(--accent)}.svc-card h4{font-size:1rem;font-weight:600;margin-bottom:.35rem}.svc-card p{font-size:.82rem;color:var(--muted);line-height:1.55}.counter-grid{display:grid;grid-template-columns:1fr;gap:1.5rem;margin-top:0}@media(min-width:992px){.counter-grid{grid-template-columns:1fr 1fr}}.exp-blur{padding:2.5rem;border-radius:16px;background:linear-gradient(135deg,rgba(255,1,79,.08),rgba(255,107,53,.06));border:1px solid rgba(255,1,79,.12)}.exp-blur .num{font-size:clamp(3rem,8vw,5rem);font-weight:700;line-height:1;background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}.exp-blur h3{font-size:1.35rem;font-weight:600;margin:.5rem 0 1rem;line-height:1.3}.exp-blur>p{color:var(--muted);font-size:.92rem;line-height:1.7}.counter-mini{display:grid;grid-template-columns:1fr 1fr;gap:1rem}.mini-card{padding:1.5rem;border-radius:12px;border:1px solid rgba(0,0,0,.06);transition:transform .2s}.mini-card:hover{transform:translateY(-4px)}.mini-card h3{font-size:1.75rem;font-weight:700;margin-bottom:.25rem;background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}.mini-card p{font-size:.82rem;color:var(--muted)}.skills-2col{display:grid;grid-template-columns:1fr;gap:2.5rem}@media(min-width:992px){.skills-2col{grid-template-columns:1fr 1fr}}.skill-block h3{font-size:1.25rem;font-weight:700;margin-bottom:1.25rem;display:flex;align-items:center;gap:.5rem}.skill-block h3::after{content:"";flex:1;height:2px;background:var(--grad);max-width:60px;opacity:.5}.skill-item{padding:1rem 0;border-bottom:1px solid rgba(0,0,0,.06)}.skill-item:last-child{border-bottom:none}.skill-item .name{font-weight:600;font-size:.92rem;margin-bottom:.25rem}.skill-item .ctx{font-size:.85rem;color:var(--muted);line-height:1.6}.num-cards{display:grid;grid-template-columns:1fr;gap:1rem}@media(min-width:992px){.num-cards{grid-template-columns:1fr 1fr}}.num-card{padding:1.75rem;border-radius:12px;border:1px solid rgba(0,0,0,.06);transition:background .2s}.num-card:hover{background:var(--bg2)}.num-card h2{font-size:1.1rem;font-weight:700;margin-bottom:.65rem;line-height:1.35}.num-card h2 span{color:var(--accent)}.num-card p{font-size:.88rem;color:var(--muted);line-height:1.65}.edu-exp-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1.25rem;margin-bottom:3rem}.edu-card{padding:1.75rem;border-radius:12px;border:1px solid rgba(0,0,0,.06);transition:transform .2s,box-shadow .2s}.edu-card:hover{transform:translateY(-4px);box-shadow:0 16px 40px rgba(0,0,0,.06)}.edu-card .sub{font-size:.82rem;font-weight:600;color:var(--accent);margin-bottom:.35rem}.edu-card h4{font-size:1.05rem;font-weight:700;margin-bottom:.25rem}.edu-card .yr{font-size:.88rem;color:var(--muted);margin-bottom:.65rem}.edu-card p{font-size:.85rem;color:var(--muted);line-height:1.6}.exp-split{display:grid;grid-template-columns:1fr;gap:2rem;align-items:center}@media(min-width:992px){.exp-split{grid-template-columns:1fr 1fr}}.exp-list-item{margin-bottom:2rem;padding-bottom:2rem;border-bottom:1px solid rgba(0,0,0,.06)}.exp-list-item:last-child{border-bottom:none;margin-bottom:0;padding-bottom:0}.exp-list-item .tag{font-size:.72rem;text-transform:uppercase;letter-spacing:.1em;color:var(--accent);font-weight:600;margin-bottom:.35rem}.exp-list-item h3{font-size:1.15rem;font-weight:700;margin-bottom:.15rem}.exp-list-item h4{font-size:.92rem;font-weight:500;color:var(--muted);margin-bottom:.65rem}.exp-list-item p{font-size:.88rem;color:var(--muted);line-height:1.65}.exp-photo img{width:100%;border-radius:16px;object-fit:cover;aspect-ratio:4/5;box-shadow:0 20px 50px rgba(0,0,0,.1)}.port-grid{display:grid;grid-template-columns:1fr;gap:1.5rem}@media(min-width:768px){.port-grid{grid-template-columns:1fr 1fr}}.port-card{border-radius:12px;overflow:hidden;border:1px solid rgba(0,0,0,.06);transition:box-shadow .25s}.port-card:hover{box-shadow:0 20px 50px rgba(0,0,0,.08)}.port-img{overflow:hidden}.port-img img{width:100%;display:block;aspect-ratio:16/11;object-fit:cover;transition:transform .45s}.port-card:hover .port-img img{transform:scale(1.05)}.port-meta{display:flex;align-items:center;justify-content:space-between;padding:1.25rem 1.5rem;gap:1rem}.port-meta h3{font-size:1rem;font-weight:600;line-height:1.35;flex:1}.port-meta .cat{font-size:.82rem;color:var(--muted);margin-top:.25rem}.port-arrow{width:44px;height:44px;border-radius:50%;background:var(--ink);color:#fff;display:flex;align-items:center;justify-content:center;font-size:.9rem;flex-shrink:0}.skill-widget{display:flex;flex-direction:column;gap:1rem}.skill-w-card{padding:1.75rem;border-radius:12px;border:1px solid rgba(0,0,0,.06);display:grid;grid-template-columns:auto 1fr;gap:1.25rem;align-items:start;transition:border-color .2s,background .2s}.skill-w-card:hover{border-color:rgba(255,1,79,.2);background:rgba(255,1,79,.02)}.skill-w-card .icon{width:48px;height:48px;border-radius:10px;background:var(--bg2);display:flex;align-items:center;justify-content:center;font-size:1.2rem;color:var(--accent)}.skill-w-card h3{font-size:1rem;font-weight:700;margin-bottom:.15rem}.skill-w-card .sub{font-size:.78rem;color:var(--accent);font-weight:600;margin-bottom:.5rem}.skill-w-card p{font-size:.86rem;color:var(--muted);line-height:1.6}.testi-section{background:var(--dark);color:#fff;border-radius:24px;margin:0 24px;padding:4rem 2rem}@media(min-width:768px){.testi-section{margin:0 auto;max-width:1152px;padding:4rem 3rem}}.testi-section .sub-label{color:var(--accent2)}.testi-section h2{color:#fff}.testi-card{max-width:720px;margin:2rem auto 0;text-align:center}.testi-card .quote{font-size:3rem;line-height:1;color:var(--accent);margin-bottom:1rem}.testi-card p{font-size:1.05rem;line-height:1.75;opacity:.9;margin-bottom:1.5rem}.testi-card .author{font-weight:600;font-size:.95rem}.testi-card .role{font-size:.82rem;opacity:.65;margin-top:.25rem}.contact-wrap{padding:3rem;border-radius:20px;background:var(--bg2);border:1px solid rgba(0,0,0,.06)}.contact-grid{display:grid;grid-template-columns:1fr;gap:2.5rem}@media(min-width:992px){.contact-grid{grid-template-columns:1fr 1fr;align-items:center}}.contact-grid h2{font-size:clamp(1.75rem,3vw,2.25rem);font-weight:700;margin-bottom:1rem;letter-spacing:-.03em}.contact-grid p{color:var(--muted);line-height:1.75;margin-bottom:1.5rem}.contact-info p{margin-bottom:.65rem;font-size:.92rem}.contact-info strong{display:block;font-size:.72rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:.15rem}.contact-chips{display:flex;flex-wrap:wrap;gap:.65rem;margin-top:1rem}.chip{padding:.6rem 1.25rem;border-radius:999px;border:1px solid rgba(0,0,0,.1);font-size:.85rem;font-weight:500;transition:all .2s}.chip:hover{border-color:var(--accent);color:var(--accent)}.chip-primary{background:var(--ink);color:#fff;border-color:var(--ink)}.chip-primary:hover{background:var(--accent);border-color:var(--accent);color:#fff}.footer{padding:2rem 0;text-align:center;font-size:.82rem;color:var(--muted);border-top:1px solid rgba(0,0,0,.06)}';

function themeR(p){
  var vs=p.visual_style||{};
  var a=vs.accent||p.brand_accent||'#ff014f';
  var a2=vs.accent2||'#ff6b35';
  return '--bg:'+(vs.bg||p.brand_bg||'#ffffff')+';--bg2:'+(vs.bg2||'#f6f6f9')+';--ink:'+(vs.ink||p.brand_color||'#141414')+';--accent:'+a+';--accent2:'+a2+';--dark:'+(vs.dark||'#141414')+';--grad:linear-gradient(90deg,'+a+','+a2+');';
}

var SVC_SYM=['✦','◈','◎','◆','▣','●'];
var PORT_IMGS=[
  'https://images.unsplash.com/photo-1552664730-d307ca884978?w=700',
  'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=700',
  'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=700',
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=700'
];
var HERO_IMG='https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=700';
var EXP_IMG='https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=700';

function buildReeniBody(p){
  var nm=escR(p.full_name||''),parts=(p.full_name||'').trim().split(/\s+/);
  var first=escR(parts[0]||''),last=escR(parts.slice(1).join(' ')||'');
  var rl=escR(p.target_role||''),ct=escR(p.city||''),em=escR(p.email_public||''),li=p.linkedin_url?hrefR(p.linkedin_url):'';
  var sk=p.skills||[],ex=(p.experience||[]).filter(function(e){return e&&e.show!==false}),ed=p.education||[],achiev=p.achievements||[];
  var bio=escR(p.bio||''),cs=escR(p.career_summary||p.bio||'');
  var yrs=yrsR(ex),photo=p.has_photo&&p.slug?'/api/portfolio/photo/'+encodeURIComponent(p.slug):HERO_IMG;
  var roleShort=rl.split('·')[0].trim()||rl;
  var h='';

  h+='<header class="header"><div class="container header-inner">';
  h+='<a href="#home" class="brand">'+first+(last?'.':'')+'</a>';
  h+='<ul class="nav">';
  h+='<li><a href="#home" class="active">Koti</a></li>';
  if(secR(p,'about')) h+='<li><a href="#about">Tietoa</a></li>';
  if(secR(p,'skills')&&sk.length) h+='<li><a href="#skills">Taidot</a></li>';
  if((secR(p,'experience')&&ex.length)||(secR(p,'education')&&ed.length)) h+='<li><a href="#resume">Ura</a></li>';
  if(secR(p,'achievements')&&achiev.length) h+='<li><a href="#portfolio">Saavutukset</a></li>';
  h+='<li><a href="#contact">Yhteystiedot</a></li></ul>';
  h+='<div class="header-right"><div class="social">';
  if(li) h+='<a href="'+escR(li)+'" target="_blank" rel="noopener">in</a>';
  if(em) h+='<a href="mailto:'+em+'">@</a>';
  h+='</div></div></div></header>';

  h+='<section class="hero" id="home"><div class="container hero-grid">';
  h+='<div class="hero-left"><span class="hello">Hei</span>';
  h+='<h1>Olen '+nm+',<span class="role grad-text">'+rl+'</span></h1>';
  h+='<p>'+cs+'</p>';
  h+='<a href="#contact" class="btn-ree"><span>Ota yhteyttä</span><span class="arr">→</span></a></div>';
  h+='<div class="hero-right"><div class="hero-photo-wrap">';
  h+='<span class="hero-watermark w1">'+escR(roleShort.toUpperCase())+'</span>';
  h+='<span class="hero-watermark w2">'+escR(roleShort.toUpperCase())+'</span>';
  h+='<img src="'+photo+'" alt="'+nm+'"></div></div></div></section>';

  if(secR(p,'skills')&&sk.length){
    h+='<section class="section" id="skills" style="padding-top:3rem"><div class="container">';
    h+='<div class="svc-row">';
    sk.slice(0,4).forEach(function(s,i){
      var n=normSkillR(s);
      h+='<div class="svc-card"><div class="svc-icon">'+SVC_SYM[i%SVC_SYM.length]+'</div>';
      h+='<h4>'+escR(n.name)+'</h4><p>'+escR((n.context||'').substring(0,80)+(n.context&&n.context.length>80?'…':''))+'</p></div>';
    });
    h+='</div></div></section>';
  }

  if(secR(p,'about')){
    h+='<section class="section" id="about"><div class="container counter-grid">';
    h+='<div class="exp-blur"><div class="num">'+yrs+'</div><h3>Vuotta kokemusta</h3><p>'+bio+'</p></div>';
    h+='<div class="counter-mini">';
    h+='<div class="mini-card"><h3>'+ex.length+'+</h3><p>Työkokemusta</p></div>';
    h+='<div class="mini-card"><h3>'+sk.length+'</h3><p>Keskeistä taitoa</p></div>';
    h+='<div class="mini-card"><h3>'+achiev.length+'</h3><p>Mitattavaa saavutusta</p></div>';
    h+='<div class="mini-card"><h3>'+ct+'</h3><p>Sijainti</p></div>';
    h+='</div></div></section>';
  }

  if(secR(p,'skills')&&sk.length){
    h+='<section class="section" style="background:var(--bg2);padding-top:3rem;padding-bottom:3rem"><div class="container">';
    h+='<div class="section-head"><span class="sub-label">Osaaminen</span><h2>Taidot — missä olen käyttänyt niitä</h2>';
    h+='<p>Ei prosentteja — konkreettiset esimerkit työstäni.</p></div>';
    h+='<div class="skills-2col">';
    var half=Math.ceil(sk.length/2);
    [sk.slice(0,half),sk.slice(half,8)].forEach(function(col){
      h+='<div class="skill-block">';
      col.forEach(function(s){
        var n=normSkillR(s);
        h+='<div class="skill-item"><div class="name">'+escR(n.name)+'</div>';
        if(n.context) h+='<div class="ctx">'+escR(n.context)+'</div>';
        h+='</div>';
      });
      h+='</div>';
    });
    h+='</div></div></section>';
  }

  if(secR(p,'achievements')&&achiev.length){
    h+='<section class="section"><div class="container">';
    h+='<div class="section-head"><span class="sub-label">Saavutukset</span><h2>Tuloksia työssäni</h2></div>';
    h+='<div class="num-cards">';
    achiev.slice(0,3).forEach(function(a,i){
      var t=typeof a==='string'?a:(a.text||'');
      h+='<div class="num-card"><h2><span>0'+(i+1)+'.</span> '+escR(t.split(/[.!?—–-]/)[0]||t)+'</h2>';
      h+='<p>'+escR(t)+'</p></div>';
    });
    h+='</div></div></section>';
  }

  if((secR(p,'education')&&ed.length)||(secR(p,'experience')&&ex.length)){
    h+='<section class="section" id="resume" style="background:var(--bg2)"><div class="container">';
    h+='<div class="section-head"><span class="sub-label">Koulutus & kokemus</span><h2>Urapolku rekrytoijalle</h2></div>';
    if(secR(p,'education')&&ed.length){
      h+='<h3 style="font-size:1.15rem;font-weight:700;margin-bottom:1.25rem">Koulutus</h3><div class="edu-exp-grid">';
      ed.forEach(function(e){
        var deg=typeof e==='string'?e:(e.degree||e.name||'');var sch=typeof e==='string'?'':(e.school||'');var yr=typeof e==='string'?'':(e.year||'');
        h+='<div class="edu-card"><div class="sub">'+escR(sch)+'</div><h4>'+escR(deg)+'</h4><div class="yr">'+escR(yr)+'</div></div>';
      });
      h+='</div>';
    }
    if(secR(p,'experience')&&ex.length){
      h+='<div class="exp-split"><div>';
      ex.forEach(function(e){
        h+='<div class="exp-list-item"><div class="tag">Kokemus</div>';
        h+='<h3>'+escR(e.company||'')+' ('+escR(e.period||e.years||'')+')</h3>';
        h+='<h4>'+escR(e.role||e.title||'')+'</h4>';
        h+='<p>'+escR(e.desc||e.description||'')+'</p></div>';
      });
      h+='</div><div class="exp-photo"><img src="'+EXP_IMG+'" alt=""></div></div>';
    }
    h+='</div></section>';
  }

  if(secR(p,'achievements')&&achiev.length){
    h+='<section class="section" id="portfolio"><div class="container">';
    h+='<div class="section-head"><span class="sub-label">Portfolio</span><h2>Projekteja ja saavutuksia</h2></div>';
    h+='<div class="port-grid">';
    achiev.slice(0,4).forEach(function(a,i){
      var t=typeof a==='string'?a:(a.text||'');
      var title=t.length>55?t.substring(0,52)+'…':t;
      h+='<article class="port-card"><div class="port-img"><img src="'+PORT_IMGS[i%PORT_IMGS.length]+'" alt=""></div>';
      h+='<div class="port-meta"><div><h3>'+escR(title)+'</h3><div class="cat">Saavutus · '+rl.split('·')[0].trim()+'</div></div>';
      h+='<span class="port-arrow">↗</span></div></article>';
    });
    h+='</div></div></section>';
  }

  if(secR(p,'skills')&&sk.length){
    h+='<section class="section"><div class="container">';
    h+='<div class="section-head" style="text-align:left;margin-bottom:2rem"><span class="sub-label">Taidot</span>';
    h+='<h2 style="text-align:left">Osaaminen tiivistettynä</h2></div><div class="skill-widget">';
    sk.slice(0,4).forEach(function(s,i){
      var n=normSkillR(s);
      h+='<div class="skill-w-card"><div class="icon">'+SVC_SYM[i%SVC_SYM.length]+'</div><div>';
      h+='<h3>'+escR(n.name)+'</h3><div class="sub">Työelämässä</div>';
      h+='<p>'+escR(n.context||'')+'</p></div></div>';
    });
    h+='</div></div></section>';
  }

  if(secR(p,'achievements')&&achiev.length){
    var t0=typeof achiev[0]==='string'?achiev[0]:(achiev[0].text||'');
    h+='<section class="section" style="padding-top:2rem;padding-bottom:4rem"><div class="testi-section">';
    h+='<div class="section-head"><span class="sub-label">Referenssit</span><h2>Mitä olen saavuttanut</h2></div>';
    h+='<div class="testi-card"><div class="quote">“</div><p>'+escR(t0)+'</p>';
    h+='<div class="author">'+nm+'</div><div class="role">'+rl+' · '+ct+'</div></div></div></section>';
  }

  h+='<section class="section" id="contact"><div class="container contact-wrap"><div class="contact-grid">';
  h+='<div><span class="sub-label">Yhteystiedot</span><h2>Ota yhteyttä</h2>';
  h+='<p>Kiinnostuitko profiilistani? Ota rohkeasti yhteyttä haastattelua varten.</p>';
  h+='<div class="contact-info">';
  h+='<p><strong>Sijainti</strong>'+ct+'</p>';
  if(em) h+='<p><strong>Sähköposti</strong><a href="mailto:'+em+'">'+em+'</a></p>';
  h+='</div>';
  h+='<div class="contact-chips">';
  if(em) h+='<a class="chip chip-primary" href="mailto:'+em+'">Lähetä viesti</a>';
  if(li) h+='<a class="chip" href="'+escR(li)+'" target="_blank" rel="noopener">LinkedIn</a>';
  h+='</div></div>';
  h+='<div><p style="font-size:1.05rem;line-height:1.8;color:var(--muted);margin-bottom:1.25rem">'+bio+'</p>';
  if(p.hidden_strengths){
    String(p.hidden_strengths).split('\n').filter(Boolean).slice(0,3).forEach(function(l){
      h+='<p style="font-size:.88rem;color:var(--muted);margin-bottom:.5rem;padding-left:1rem;border-left:2px solid var(--accent)">'+escR(l.replace(/^[-•]\s*/,''))+'</p>';
    });
  }
  h+='</div></div></div></section>';

  h+='<footer class="footer"><div class="container">© '+new Date().getFullYear()+' '+nm+' · Elävä CV · Reeni-tyyli</div></footer>';
  return h;
}

function renderReeniPreview(p){
  p=p||{};
  var title=escR(p.full_name||'Portfolio')+' — Elävä CV';
  var head='<title>'+title+'</title><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"><style>'+REE_CSS+'</style>';
  var body=buildReeniBody(p);
  if(typeof PortfolioPublicFeatures!=='undefined') return PortfolioPublicFeatures.finishHtml(body,p,head);
  return '<!DOCTYPE html><html lang="fi" style="'+themeR(p)+'"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+head+'</head><body>'+body+'</body></html>';
}
