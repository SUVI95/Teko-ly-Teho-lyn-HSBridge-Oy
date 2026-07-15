/* Veyssette-style CV preview — warm luxury layout */
function escV(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function hrefV(raw){var u=String(raw||'').trim();if(!u)return'';if(/^https?:\/\//i.test(u))return u;return'https://'+u.replace(/^\/+/,'');}
function iniV(n){return(n||'').split(/\s+/).map(function(w){return w[0]||'';}).join('').substring(0,2).toUpperCase();}
function secV(p,k){var s=(p.visual_style&&p.visual_style.sections)||{};return s[k]!==false;}
function normSkill(s){if(!s)return{name:'',context:''};if(typeof s==='string')return{name:s,context:''};return{name:s.name||s.skill||'',context:s.context||s.example||s.where||''};}

var VEY_CSS=':root{--cream:#F8F4EE;--cream2:#F0EBE3;--ink:#2C2419;--ink-soft:#6B6358;--gold:#A67C52;--gold-light:#C4A574;--white:#fff;--card:#fff;--radius:12px;--font-display:"Cormorant Garamond",Georgia,serif;--font-body:"Inter",system-ui,sans-serif}*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}html{scroll-behavior:smooth}body{font-family:var(--font-body);font-size:16px;line-height:1.65;color:var(--ink);background:var(--cream)}a{color:inherit;text-decoration:none}.wrap{max-width:1140px;margin:0 auto;padding:0 24px}.eyebrow{font-size:.72rem;letter-spacing:.18em;text-transform:uppercase;color:var(--gold);font-weight:600;margin-bottom:.75rem;display:block}h1,h2,h3{font-family:var(--font-display);font-weight:600;line-height:1.15}.btn{display:inline-flex;align-items:center;justify-content:center;padding:.85rem 1.75rem;border-radius:999px;font-size:.88rem;font-weight:600;font-family:var(--font-body);transition:transform .2s,box-shadow .2s;border:none;cursor:pointer}.btn-primary{background:var(--gold);color:var(--white)}.btn-primary:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(166,124,82,.35)}.btn-outline{background:transparent;border:1.5px solid rgba(44,36,25,.15);color:var(--ink)}.btn-outline:hover{border-color:var(--gold);color:var(--gold)}.site-header{position:sticky;top:0;z-index:100;background:rgba(248,244,238,.92);backdrop-filter:blur(12px);border-bottom:1px solid rgba(44,36,25,.06);padding:1rem 0}.header-inner{display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap}.brand{font-family:var(--font-display);font-size:1.35rem;font-weight:700;color:var(--ink);letter-spacing:-.02em}.nav{display:none;gap:2rem;list-style:none}.nav a{font-size:.85rem;color:var(--ink-soft);font-weight:500;transition:color .2s}.nav a:hover{color:var(--gold)}@media(min-width:900px){.nav{display:flex}}.header-cta{display:flex;gap:.65rem;align-items:center}.header-phone{font-size:.82rem;color:var(--ink-soft);display:none}@media(min-width:768px){.header-phone{display:inline}}.hero{padding:4rem 0 3rem;overflow:hidden}.hero-grid{display:grid;grid-template-columns:1fr;gap:2.5rem;align-items:center}@media(min-width:900px){.hero-grid{grid-template-columns:1fr 1fr}}.hero h1{font-size:clamp(2.5rem,5vw,3.75rem);margin-bottom:1.25rem;letter-spacing:-.02em}.hero-lead{font-size:1.05rem;color:var(--ink-soft);max-width:480px;margin-bottom:1.75rem;line-height:1.75}.hero-btns{display:flex;flex-wrap:wrap;gap:.75rem;margin-bottom:2rem}.hero-trust{display:flex;flex-wrap:wrap;align-items:center;gap:1.25rem}.trust-label{font-size:.78rem;color:var(--ink-soft)}.trust-avatars{display:flex}.trust-avatars span{width:36px;height:36px;border-radius:50%;background:var(--gold-light);border:2px solid var(--cream);margin-left:-8px;display:flex;align-items:center;justify-content:center;font-size:.65rem;font-weight:700;color:var(--white)}.trust-avatars span:first-child{margin-left:0}.trust-stat{text-align:left}.trust-stat-n{font-family:var(--font-display);font-size:1.75rem;font-weight:700;color:var(--ink);line-height:1}.trust-stat-l{font-size:.72rem;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.08em}.hero-photo{border-radius:var(--radius);overflow:hidden;min-height:380px;background:linear-gradient(135deg,var(--cream2),var(--gold-light));position:relative}.hero-photo img{width:100%;height:100%;object-fit:cover;min-height:380px;display:block}.features-curve{position:relative;background:var(--cream2);padding:4rem 0;margin:0}.features-curve::before,.features-curve::after{content:"";position:absolute;left:0;right:0;height:60px;background:var(--cream);clip-path:ellipse(55% 100% at 50% 100%)}.features-curve::before{top:0;transform:rotate(180deg)}.features-curve::after{bottom:0}.features-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1.5rem;position:relative;z-index:1}.feat-card{text-align:center;padding:1.5rem}.feat-icon{width:64px;height:64px;margin:0 auto 1rem;border-radius:50%;background:var(--white);display:flex;align-items:center;justify-content:center;font-size:1.5rem;box-shadow:0 4px 20px rgba(44,36,25,.06)}.feat-card h3{font-size:1.25rem;margin-bottom:.5rem}.feat-card p{font-size:.88rem;color:var(--ink-soft);line-height:1.6}.section{padding:5rem 0}.section-alt{background:var(--white)}.section-h{font-size:clamp(2rem,4vw,2.75rem);margin-bottom:1rem;max-width:16ch}.about-grid{display:grid;grid-template-columns:1fr;gap:3rem;align-items:center}@media(min-width:900px){.about-grid{grid-template-columns:1fr 1fr}}.about-text p{color:var(--ink-soft);margin-bottom:1.5rem;line-height:1.75}.counters{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin:2rem 0}.counter{text-align:center;padding:1rem;background:var(--cream);border-radius:var(--radius)}.counter-n{font-family:var(--font-display);font-size:2rem;font-weight:700;color:var(--gold);line-height:1}.counter-l{font-size:.72rem;color:var(--ink-soft);margin-top:.35rem;text-transform:uppercase;letter-spacing:.06em}.about-imgs{display:grid;grid-template-columns:1fr 1fr;gap:1rem}.about-imgs img{width:100%;height:200px;object-fit:cover;border-radius:var(--radius)}.about-imgs .tall{grid-row:span 2;height:100%;min-height:280px}.img-ph{display:flex;align-items:center;justify-content:center;text-align:center;padding:1rem;background:linear-gradient(135deg,var(--cream2),rgba(166,124,82,.12));border-radius:var(--radius);color:var(--ink-soft);font-size:.72rem;letter-spacing:.06em;text-transform:uppercase;min-height:200px}.about-imgs .tall.img-ph{min-height:280px}.hero-photo.img-ph,.hero-photo .img-ph{min-height:380px}.exp-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1.5rem;margin-top:2.5rem}.exp-card{background:var(--white);border-radius:var(--radius);overflow:hidden;box-shadow:0 4px 24px rgba(44,36,25,.06);transition:transform .3s}.exp-card:hover{transform:translateY(-4px)}.exp-card img{width:100%;height:180px;object-fit:cover}.exp-card-body{padding:1.25rem 1.5rem 1.5rem}.exp-card h3{font-size:1.15rem;margin-bottom:.35rem}.exp-card .co{font-size:.82rem;color:var(--gold);font-weight:600;margin-bottom:.5rem}.exp-card p{font-size:.88rem;color:var(--ink-soft);line-height:1.6}.steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:2rem;margin-top:2.5rem;text-align:center}.step-num{font-family:var(--font-display);font-size:3rem;color:rgba(166,124,82,.25);line-height:1;margin-bottom:.5rem}.step h3{font-size:1.1rem;margin-bottom:.5rem}.step p{font-size:.85rem;color:var(--ink-soft)}.skills-list{max-width:720px;margin-top:2rem}.skill-row{padding:1.25rem 0 1.25rem 1.15rem;border-bottom:1px solid rgba(44,36,25,.08);border-left:3px solid var(--gold)}.skill-row:last-child{border-bottom:none}.skill-name{display:block;font-weight:600;font-size:1.02rem;margin-bottom:.35rem;color:var(--ink)}.skill-context{display:block;font-size:.88rem;color:var(--ink-soft);line-height:1.6}.testi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1.5rem;margin-top:2.5rem}.testi-card{background:var(--white);border-radius:var(--radius);padding:2rem;box-shadow:0 4px 20px rgba(44,36,25,.05)}.testi-quote{font-family:var(--font-display);font-style:italic;font-size:1.05rem;line-height:1.7;color:var(--ink);margin-bottom:1.5rem}.testi-quote::before{content:"\\201C";color:var(--gold);font-size:2rem;line-height:0;display:block;margin-bottom:.5rem}.testi-author{display:flex;align-items:center;gap:.75rem}.testi-av{width:44px;height:44px;border-radius:50%;background:var(--gold);color:var(--white);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.8rem}.testi-name{font-weight:600;font-size:.9rem}.testi-role{font-size:.78rem;color:var(--ink-soft)}.cta-band{background:linear-gradient(135deg,var(--ink) 0%,#3d3428 100%);padding:4rem 0;text-align:center;color:var(--white);border-radius:var(--radius);margin:0 24px 4rem;max-width:calc(1140px - 48px);margin-left:auto;margin-right:auto}.cta-band h2{font-size:clamp(1.5rem,3vw,2.25rem);color:var(--white);margin-bottom:1.5rem;max-width:none}.contact-section{padding:4rem 0;background:var(--cream2)}.contact-chips{display:flex;flex-wrap:wrap;gap:.75rem;margin-top:1.5rem}.contact-chip{padding:.65rem 1.25rem;background:var(--white);border-radius:999px;font-size:.85rem;border:1px solid rgba(44,36,25,.08)}.site-footer{background:var(--ink);color:rgba(255,255,255,.7);padding:3rem 0 2rem;font-size:.85rem}.footer-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:2rem;margin-bottom:2rem}.footer-brand{font-family:var(--font-display);font-size:1.25rem;color:var(--white);margin-bottom:.75rem}.footer-col h4{color:var(--white);font-size:.78rem;letter-spacing:.1em;text-transform:uppercase;margin-bottom:1rem;font-family:var(--font-body);font-weight:600}.footer-col ul{list-style:none}.footer-col li{margin-bottom:.45rem}.footer-col a{color:rgba(255,255,255,.6);transition:color .2s}.footer-col a:hover{color:var(--gold-light)}.footer-bottom{border-top:1px solid rgba(255,255,255,.1);padding-top:1.5rem;text-align:center;font-size:.78rem}';

function themeV(p){
  var vs=p.visual_style||{};
  return '--cream:'+(vs.cream||p.brand_bg||'#F8F4EE')+';--cream2:'+(vs.cream2||'#F0EBE3')+';--ink:'+(vs.ink||p.brand_color||'#2C2419')+';--gold:'+(vs.gold||p.brand_accent||'#A67C52')+';--gold-light:'+(vs.gold_light||'#C4A574')+';';
}

var EXP_IMGS=[
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600',
  'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600',
  'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=600',
  'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=600'
];
var HERO_IMG='https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800';
var ABOUT_IMGS=[
  'https://images.unsplash.com/photo-1556767542-5948888a9908?w=500',
  'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=500'
];

/** Image slots the editor can configure (experience slots exp_0 … added dynamically). */
var VEY_IMAGE_SLOTS=[
  {id:'hero',label:'Hero — pääkuva',hint:'Iso kuva hero-osiossa oikealla'},
  {id:'about_1',label:'Tietoa minusta — iso kuva',hint:'Korkea kuva, vasen sarake'},
  {id:'about_2',label:'Tietoa minusta — pieni kuva',hint:'Pienempi kuva vieressä'}
];

function veySlot(p,id){
  var im=(p.images&&p.images[id])||{};
  return {enabled:im.enabled===true,dataUrl:im.dataUrl||'',src:im.src||''};
}

function veyImgSrc(p,id){
  if(id==='hero'&&p.has_photo&&p.slug) return '/api/portfolio/photo/'+encodeURIComponent(p.slug);
  var s=veySlot(p,id);
  if(!s.enabled) return null;
  if(s.dataUrl) return s.dataUrl;
  if(s.src) return s.src;
  return null;
}

function veyImgHtml(imgClass,p,id,alt,phText){
  var src=veyImgSrc(p,id);
  var cls=imgClass?(' '+imgClass):'';
  if(!src) return '<div class="img-ph'+cls+'"><span>'+escV(phText||'Kuva pois')+'</span></div>';
  return '<img class="'+escV(imgClass||'')+'" src="'+escV(src)+'" alt="'+alt+'">';
}

function buildVeyssetteBody(p){
  var vs=p.visual_style||{};
  var nm=escV(p.full_name||''),rl=escV(p.target_role||''),ct=escV(p.city||''),em=escV(p.email_public||''),li=p.linkedin_url?hrefV(p.linkedin_url):'';
  var sk=p.skills||[],ex=(p.experience||[]).filter(function(e){return e&&e.show!==false}),ed=p.education||[],achiev=p.achievements||[];
  var bio=escV(p.bio||''),cs=escV(p.career_summary||p.bio||'');
  var h='';

  h+='<header class="site-header"><div class="wrap header-inner">';
  h+='<a href="#top" class="brand">'+nm.split(' ')[0]+'.</a>';
  h+='<ul class="nav"><li><a href="#about">Tietoa</a></li>';
  if(secV(p,'skills')&&sk.length) h+='<li><a href="#skills">Taidot</a></li>';
  if(secV(p,'experience')&&ex.length) h+='<li><a href="#experience">Kokemus</a></li>';
  h+='<li><a href="#contact">Yhteystiedot</a></li></ul>';
  h+='<div class="header-cta">';
  if(em) h+='<span class="header-phone">'+em+'</span>';
  h+='<a href="#contact" class="btn btn-primary" style="padding:.6rem 1.25rem;font-size:.82rem;">Ota yhteyttä</a></div></div></header>';

  h+='<section class="hero" id="top"><div class="wrap hero-grid"><div>';
  h+='<span class="eyebrow">'+rl+' · '+ct+'</span>';
  h+='<h1>'+nm+'<br><span style="color:var(--gold);font-style:italic;font-weight:500;">Valmis seuraavaan haasteeseen.</span></h1>';
  h+='<p class="hero-lead">'+cs+'</p>';
  h+='<div class="hero-btns"><a href="#contact" class="btn btn-primary">Kutsu haastatteluun</a>';
  if(li) h+='<a href="'+escV(li)+'" target="_blank" rel="noopener" class="btn btn-outline">LinkedIn</a>';
  h+='</div><div class="hero-trust"><span class="trust-label">Avoin rooleille</span><div class="trust-avatars">';
  for(var ai=0;ai<Math.min(4,sk.length||3);ai++){var sn=normSkill(sk[ai]);h+='<span>'+(sn.name?sn.name.charAt(0):'?')+'</span>';}
  h+='</div><div class="trust-stat"><div class="trust-stat-n">'+(ex.length||'8')+'+</div><div class="trust-stat-l">vuotta kokemusta</div></div></div></div>';
  h+='<div class="hero-photo">'+veyImgHtml('',p,'hero',nm,'Lisää kuva · Kuvat-välilehti')+'</div></div></section>';

  if(secV(p,'skills')&&sk.length){
    h+='<section class="features-curve"><div class="wrap"><div class="features-grid">';
    var icons=['◆','◇','○','★'];
    sk.slice(0,4).forEach(function(s,i){
      var n=normSkill(s);
      h+='<div class="feat-card"><div class="feat-icon">'+(icons[i]||'•')+'</div><h3>'+escV(n.name||'Osaaminen')+'</h3><p>'+escV(n.context||'Konkreettinen osaaminen, jota olen käyttänyt työssäni.')+'</p></div>';
    });
    h+='</div></div></section>';
  }

  if(secV(p,'about')){
    h+='<section class="section" id="about"><div class="wrap about-grid"><div class="about-text">';
    h+='<span class="eyebrow">Tietoa minusta</span><h2 class="section-h">Into intoa kohtaan. Sitoutuminen sinua kohtaan.</h2>';
    h+='<p>'+bio+'</p>';
    if(p.hidden_strengths){String(p.hidden_strengths).split('\n').filter(Boolean).slice(0,2).forEach(function(l){h+='<p>'+escV(l.replace(/^[-•]\s*/,''))+'</p>';});}
    h+='<div class="counters">';
    h+='<div class="counter"><div class="counter-n">'+(ex.length||0)+'+</div><div class="counter-l">Työtehtävää</div></div>';
    h+='<div class="counter"><div class="counter-n">'+(sk.length||0)+'+</div><div class="counter-l">Ydintaitoa</div></div>';
    h+='<div class="counter"><div class="counter-n">'+(achiev.length||0)+'</div><div class="counter-l">Saavutusta</div></div></div>';
    h+='<a href="#contact" class="btn btn-primary">Lue lisää & ota yhteyttä</a></div>';
    h+='<div class="about-imgs">'+veyImgHtml('tall',p,'about_1',nm,'Iso kuva')+veyImgHtml('',p,'about_2',nm,'Pieni kuva')+'</div></div></section>';
  }

  if(secV(p,'experience')&&ex.length){
    h+='<section class="section section-alt" id="experience"><div class="wrap">';
    h+='<span class="eyebrow">Urapolku</span><h2 class="section-h">Kokemusta joka tuottaa arvoa rekrytoijalle</h2>';
    h+='<p style="color:var(--ink-soft);max-width:560px;margin-bottom:0">Konkreettisia rooleja, mitattavia tuloksia ja kasvua eri organisaatioissa.</p>';
    h+='<div class="exp-grid">';
    ex.forEach(function(e,i){
      var expSlot='exp_'+i;
      var expImg=veyImgSrc(p,expSlot);
      h+='<article class="exp-card">';
      if(expImg) h+='<img src="'+escV(expImg)+'" alt="">';
      h+='<div class="exp-card-body">';
      h+='<h3>'+escV(e.role||e.title||'')+'</h3><div class="co">'+escV(e.company||'')+' · '+escV(e.period||e.years||'')+'</div>';
      h+='<p>'+escV(e.desc||e.description||'')+'</p></div></article>';
    });
    h+='</div></div></section>';
  }

  h+='<section class="section"><div class="wrap"><span class="eyebrow">Urapolku</span><h2 class="section-h">Yksinkertainen, selkeä & tuloksellinen</h2>';
  h+='<div class="steps">';
  var steps=[
    {n:'01',t:'Kartoitus',d:'Ymmärrän tarpeet, tiimin ja tavoitteet ennen kuin aloitan.'},
    {n:'02',t:'Suunnittelu',d:'Rakennan selkeän suunnitelman ja priorisoin tärkeimmät asiat.'},
    {n:'03',t:'Toteutus',d:'Johdan projekteja läpi — aikataulussa ja budjetissa.'},
    {n:'04',t:'Tulokset',d:'Toimitan mitattavia parannuksia ja jaan opit eteenpäin.'}
  ];
  steps.forEach(function(s){h+='<div class="step"><div class="step-num">'+s.n+'</div><h3>'+s.t+'</h3><p>'+s.d+'</p></div>';});
  h+='</div></div></section>';

  if(secV(p,'skills')&&sk.length){
    h+='<section class="section section-alt" id="skills"><div class="wrap"><span class="eyebrow">Osaaminen</span>';
    h+='<h2 class="section-h">Taidot joilla erotun</h2>';
    h+='<p style="color:var(--ink-soft);max-width:560px;margin-bottom:0">Konkreettiset taidot — lyhyesti, missä olen käyttänyt niitä työssä.</p>';
    h+='<div class="skills-list">';
    sk.slice(0,8).forEach(function(s){
      var n=normSkill(s);
      h+='<div class="skill-row"><span class="skill-name">'+escV(n.name)+'</span>';
      if(n.context) h+='<span class="skill-context">'+escV(n.context)+'</span>';
      h+='</div>';
    });
    h+='</div></div></section>';
  }

  if(secV(p,'education')&&ed.length){
    h+='<section class="section"><div class="wrap"><span class="eyebrow">Koulutus</span><h2 class="section-h">Akateeminen pohja</h2><div class="exp-grid">';
    ed.forEach(function(e,i){
      var deg=typeof e==='string'?e:(e.degree||e.name||'');var sch=typeof e==='string'?'':(e.school||'');var yr=typeof e==='string'?'':(e.year||'');
      h+='<article class="exp-card"><div class="exp-card-body" style="padding-top:1.5rem"><h3>'+escV(deg)+'</h3><div class="co">'+escV(sch)+'</div><p>'+escV(yr)+'</p></div></article>';
    });
    h+='</div></div></section>';
  }

  if(secV(p,'achievements')&&achiev.length){
    h+='<section class="section section-alt"><div class="wrap"><span class="eyebrow">Suositukset & saavutukset</span>';
    h+='<h2 class="section-h">Kokemukset jotka puhuvat puolestaan</h2><div class="testi-grid">';
    achiev.slice(0,3).forEach(function(a,i){
      var t=typeof a==='string'?a:(a.text||'');var roles=['Esimies','Kollega','Asiakas'];
      h+='<div class="testi-card"><p class="testi-quote">'+escV(t)+'</p><div class="testi-author"><div class="testi-av">'+iniV(roles[i]||'R')+'</div><div><div class="testi-name">'+escV(roles[i]||'Referenssi')+'</div><div class="testi-role">'+rl+'</div></div></div></div>';
    });
    h+='</div></div></section>';
  }

  h+='<div class="cta-band"><h2>Valmis keskustelemaan seuraavasta roolista?</h2><a href="#contact" class="btn btn-primary">Ota yhteyttä</a></div>';

  h+='<section class="contact-section" id="contact"><div class="wrap"><span class="eyebrow">Yhteystiedot</span>';
  h+='<h2 class="section-h">Ota yhteyttä — keskustellaan.</h2><p style="color:var(--ink-soft)">Kiinnostuitko profiilistani? Lähetä viesti tai ota suoraan yhteyttä.</p>';
  h+='<div class="contact-chips">';
  if(em) h+='<a class="contact-chip" href="mailto:'+em+'">'+em+'</a>';
  if(ct) h+='<span class="contact-chip">'+ct+'</span>';
  if(li) h+='<a class="contact-chip" href="'+escV(li)+'" target="_blank" rel="noopener">LinkedIn</a>';
  h+='</div></div></section>';

  h+='<footer class="site-footer"><div class="wrap"><div class="footer-grid">';
  h+='<div><div class="footer-brand">'+nm+'</div><p style="max-width:260px;line-height:1.6">Ammattitaitoinen osaaja — portfolio Elävä CV · Veyssette-tyyli</p></div>';
  h+='<div class="footer-col"><h4>Navigointi</h4><ul><li><a href="#about">Tietoa</a></li><li><a href="#skills">Taidot</a></li><li><a href="#experience">Kokemus</a></li><li><a href="#contact">Yhteystiedot</a></li></ul></div>';
  h+='<div class="footer-col"><h4>Yhteystiedot</h4><ul><li>'+em+'</li><li>'+ct+'</li></ul></div></div>';
  h+='<div class="footer-bottom">'+nm+' © '+new Date().getFullYear()+' · Elävä CV</div></div></footer>';
  return h;
}

function renderVeyssettePreview(p){
  p=p||{};
  var title=escV(p.full_name||'Portfolio')+' — Elävä CV';
  var head='<title>'+title+'</title><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet"><style>'+VEY_CSS+'</style>';
  var body=buildVeyssetteBody(p);
  if(typeof PortfolioPublicFeatures!=='undefined') return PortfolioPublicFeatures.finishHtml(body,p,head);
  return '<!DOCTYPE html><html lang="fi" style="'+themeV(p)+'"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+head+'</head><body>'+body+'</body></html>';
}
