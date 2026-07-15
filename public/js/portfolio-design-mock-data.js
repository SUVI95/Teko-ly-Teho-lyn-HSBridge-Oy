/** Shared demo portfolio data for all design editors (4 jobs + stock images). */
(function (global) {
  'use strict';

  var STOCK = {
    hero: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800',
    about_1: 'https://images.unsplash.com/photo-1556767542-5948888a9908?w=500',
    about_2: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=500',
    exp_0: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600',
    exp_1: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600',
    exp_2: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=600',
    exp_3: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=600'
  };

  function imgSlot(src) {
    return { enabled: true, src: src, dataUrl: '' };
  }

  var BASE = {
    full_name: 'Maria Korhonen',
    city: 'Helsinki',
    target_role: 'Projektipäällikkö · digitaaliset palvelut',
    bio: 'Rakennan tiimejä ja prosesseja, joilla digitaaliset palvelut toimivat oikeasti — ei vain slidessa. Uskon, että hyvä johtaminen yhdistää struktuurin ja empatian.',
    career_summary: 'Yli 8 vuotta projektinhallintaa ja asiakastyötä. Yhdistän strukturoidun ajattelun ja empatian — valmis tuomaan tuloksia seuraavaan tiimiisi.',
    hidden_strengths: 'Rauhallinen paineen alla\nNopea oppimaan uusia työkaluja\nRakentaa luottamusta tiimin sisällä',
    email_public: 'maria.korhonen@email.fi',
    linkedin_url: 'https://linkedin.com/in/mariakorhonen',
    skills: [
      { name: 'Projektinhallinta', context: 'Johdin 4 rinnakkaista projektia Nordic Digital Oy:ssa budjeteilla 200k–1M€.' },
      { name: 'Agile/Scrum', context: 'Certified Scrum Master — otin sprintit käyttöön ensimmäisenä omassa yksikössäni.' },
      { name: 'Stakeholder-viestintä', context: 'Sovitin asiakas- ja tuotevelvoitteet kuukausittaisissa status-kokouksissa.' },
      { name: 'Excel & Power BI', context: 'Rakensin budjetin seurannan raportit, joilla johto seurasi projektien etenemistä.' },
      { name: 'Asiakaspalvelu', context: 'Johdin 15 hengen tiimiä ServiceHub Finlandilla — NPS nousi 42 → 71.' },
      { name: 'Prosessikehitys', context: 'Uudistin asiakaspalveluprosessin kahdessa kvartaalissa mitattavilla tuloksilla.' }
    ],
    languages: [
      { name: 'Suomi', level: 'äidinkieli' },
      { name: 'Englanti', level: 'erinomainen' },
      { name: 'Ruotsi', level: 'hyvä' }
    ],
    achievements: [
      'Johdin 12 hengen tiimiä — toimitus aikataulussa ja 15% alle budjetin.',
      'Uudistin asiakaspalveluprosessin: NPS nousi 42 → 71 kahdessa kvartaalissa.',
      'Certified Scrum Master 2024 — sovellin metodit ensimmäisenä omassa yksikössä.'
    ],
    experience: [
      { role: 'Projektipäällikkö', company: 'Nordic Digital Oy', period: '2021–', years: '2021–', desc: 'Digitaalisten palveluiden kehitysprojektit, budjetit 200k–1M€. Johdin 4 rinnakkaista projektia.', bullets: ['Johdin 4 rinnakkaista projektia', 'Vastuu sidosryhmäviestinnästä', 'Agile-coach tiimille'], show: true },
      { role: 'Asiakaspalveluvastaava', company: 'ServiceHub Finland', period: '2018–2021', years: '2018–2021', desc: '15 hengen tiimin esimiestyö ja prosessien kehitys.', show: true },
      { role: 'Asiakaspalvelija', company: 'Retail Plus', period: '2016–2018', years: '2016–2018', desc: 'B2B-asiakaspalvelu ja myyntituki.', show: true },
      { role: 'Projektiharjoittelija', company: 'Cap Digital', period: '2015–2016', years: '2015–2016', desc: 'Tuki markkinointi- ja asiakastutkimusprojekteihin — ensimmäinen kosketus agile-tiimeihin.', show: true }
    ],
    education: [
      { degree: 'Tradenomi, liiketalous', school: 'Metropolia AMK', year: '2016' },
      { degree: 'Projektinhallinnan sertifiointi', school: 'PMI Finland', year: '2022' }
    ],
    has_photo: false,
    has_cv: false
  };

  var TEMPLATE_VISUAL = {
    veyssette: {
      brand_color: '#2C2419',
      brand_accent: '#A67C52',
      brand_bg: '#F8F4EE',
      visual_style: {
        cream: '#F8F4EE',
        cream2: '#F0EBE3',
        ink: '#2C2419',
        gold: '#A67C52',
        gold_light: '#C4A574',
        sections: { about: true, skills: true, experience: true, education: true, achievements: true }
      },
      images: {
        hero: imgSlot(STOCK.hero),
        about_1: imgSlot(STOCK.about_1),
        about_2: imgSlot(STOCK.about_2),
        exp_0: imgSlot(STOCK.exp_0),
        exp_1: imgSlot(STOCK.exp_1),
        exp_2: imgSlot(STOCK.exp_2),
        exp_3: imgSlot(STOCK.exp_3)
      }
    },
    reeni: {
      brand_color: '#141414',
      brand_accent: '#ff014f',
      brand_bg: '#ffffff',
      visual_style: {
        bg: '#ffffff',
        bg2: '#f6f6f9',
        ink: '#141414',
        accent: '#ff014f',
        accent2: '#ff6b35',
        dark: '#141414',
        sections: { about: true, skills: true, experience: true, education: true, achievements: true }
      }
    },
    callum: {
      brand_color: '#212529',
      brand_accent: '#f0df4f',
      brand_bg: '#ffffff',
      visual_style: {
        bg: '#ffffff',
        bg2: '#f8f9fa',
        ink: '#212529',
        accent: '#f0df4f',
        accent_text: '#212529',
        secondary: '#343a40',
        sections: { about: true, skills: true, experience: true, education: true, achievements: true }
      }
    },
    shane: {
      brand_color: '#111111',
      brand_accent: '#a67c52',
      brand_bg: '#ffffff',
      visual_style: {
        bg: '#ffffff',
        bg2: '#f7f5f2',
        ink: '#111111',
        accent: '#a67c52',
        dark: '#0c0c0c',
        sections: { about: true, skills: true, experience: true, education: true, achievements: true }
      }
    },
    femia: {
      brand_color: '#2D2428',
      brand_accent: '#C17B8B',
      brand_bg: '#FFF5F2',
      visual_style: {
        blush: '#FFF5F2',
        blush2: '#FDF0EB',
        ink: '#2D2428',
        rose: '#C17B8B',
        sections: { about: true, skills: true, experience: true, education: true, achievements: true }
      }
    },
    editorial: {
      brand_color: '#1A1A2E',
      brand_accent: '#C0392B',
      brand_bg: '#F5F0E8',
      visual_style: {
        font_display: 'libre',
        density: 'normal',
        hero_style: 'dark',
        card_style: 'bento',
        parchment: '#F5F0E8',
        manuscript: '#1A1A2E',
        accent: '#C0392B',
        show_float_photos: true,
        show_stats: true,
        show_marquee: true,
        sections: { about: true, skills: true, experience: true, education: true, achievements: true }
      }
    }
  };

  function clonePortfolioDemo(template) {
    var p = JSON.parse(JSON.stringify(BASE));
    var tv = TEMPLATE_VISUAL[template] || TEMPLATE_VISUAL.veyssette;
    p.template = template;
    p.slug = 'demo-' + template;
    p.brand_color = tv.brand_color;
    p.brand_accent = tv.brand_accent;
    p.brand_bg = tv.brand_bg;
    p.visual_style = JSON.parse(JSON.stringify(tv.visual_style));
    if (tv.images) p.images = JSON.parse(JSON.stringify(tv.images));
    if (template === 'editorial') {
      p.skills = p.skills.map(function (s) { return s.name; });
    }
    return p;
  }

  global.clonePortfolioDemo = clonePortfolioDemo;
  global.VEYSSETTE_MOCK_P = clonePortfolioDemo('veyssette');
})(typeof window !== 'undefined' ? window : global);
