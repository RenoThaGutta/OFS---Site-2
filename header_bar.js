/**
 * header_bar.js — Canonical site navigation
 * Single source of truth for #main-nav CSS and HTML across all public pages.
 * Uses absolute px font sizes so rendering is identical regardless of page
 * font-size or browser default font settings.
 *
 * Usage: <script src="header_bar.js"></script> before </body>
 */
(function () {
  'use strict';

  var LINKS = [
    { href: 'OFS_TavernHall.html',  label: 'Tavern'       },
    { href: 'OFS_Codex.html',       label: 'Codex'        },
    { href: 'OFS_Timeline.html',    label: 'Chronicles'   },
    { label: 'Banners',             dropdown: 'banners'    },
    { label: 'Fleet',               dropdown: 'fleet'      },
    { href: 'OFS_Roster.html',      label: 'Roster'       },
    { href: 'OFS_Admin.html',       label: 'Admin'        },
  ];

  /* Fallback banner names if Sheets data hasn't loaded yet */
  var FALLBACK_BANNERS = [
    'The Artificer','The Astraeus','The Engineer','The Explorer',
    'The Fang','The Forager','The Guardian','The Healer',
    'The Merchant','The Privateer','The Talon'
  ];
  var FALLBACK_FLEETS = ['1st Fleet'];

  /* ── Canonical nav CSS (hardcoded px — immune to font-size inheritance) ── */
  var CSS =
    '#main-nav{' +
      'position:fixed;top:0;left:0;right:0;z-index:200;' +
      'height:62px;box-sizing:border-box;' +
      'background:rgba(7,7,15,.82);' +
      'backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);' +
      'border-bottom:1px solid rgba(201,168,76,.28);' +
      'padding:0 40px;' +
      'display:grid;grid-template-columns:auto minmax(150px,1fr) auto;align-items:center;gap:18px;' +
      'transition:background .3s;' +
    '}' +
    '.nav-logo{' +
      'display:flex;align-items:center;gap:12px;' +
      'text-decoration:none;min-width:0;' +
    '}' +
    '.nav-logo img{' +
      'height:36px;width:auto;display:block;' +
      'filter:drop-shadow(0 0 8px rgba(201,168,76,.4));' +
    '}' +
    '.nav-logo span{' +
      'font-family:"Cinzel",serif;font-size:14px;line-height:1;' +
      'letter-spacing:.15em;text-transform:uppercase;' +
      'color:#c9a84c;white-space:nowrap;' +
    '}' +
    '.nav-links{' +
      'display:flex;gap:2px;list-style:none;margin:0;padding:0;justify-self:end;min-width:0;' +
    '}' +
    '.nav-links li{margin:0;padding:0;}' +
    '.nav-links a{' +
      'display:block;font-family:"Cinzel",serif;font-size:11.5px;line-height:1;' +
      'letter-spacing:.12em;text-transform:uppercase;' +
      'color:#5a6272;text-decoration:none;white-space:nowrap;' +
      'padding:8px 14px;border:1px solid transparent;border-radius:2px;' +
      'transition:color .2s,border-color .2s,background .2s;' +
    '}' +
    '.nav-links a:hover,.nav-links a.active{' +
      'color:#c9a84c;border-color:rgba(201,168,76,.28);background:rgba(201,168,76,.12);' +
    '}' +
    '.nav-dd-wrap{position:relative;}' +
    '.nav-dd-trigger{cursor:pointer;user-select:none;}' +
    '.nav-dd-trigger::after{content:" ▾";font-size:8px;opacity:.6;}' +
    '.nav-dd-panel{' +
      'display:none;position:absolute;top:calc(100% + 6px);right:0;' +
      'background:rgba(10,10,22,.97);border:1px solid rgba(201,168,76,.28);' +
      'border-radius:6px;padding:8px;z-index:210;' +
      'backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);' +
      'box-shadow:0 16px 48px rgba(0,0,0,.7);' +
      'display:none;grid-template-columns:1fr 1fr;gap:6px;width:380px;' +
    '}' +
    '.nav-dd-panel.open{display:grid;}' +
    '.nav-dd-card{' +
      'display:flex;align-items:center;gap:10px;text-decoration:none;' +
      'padding:10px 12px;position:relative;overflow:hidden;' +
      'border:1px solid rgba(201,168,76,.12);border-radius:4px;' +
      'background:#07070f;' +
      'transition:border-color .25s;' +
    '}' +
    '.nav-dd-card-bg{' +
      'position:absolute;inset:0;z-index:0;' +
      'background-size:cover;background-position:center;' +
      'pointer-events:none;' +
    '}' +
    '.nav-dd-card-bg::after{' +
      'content:"";position:absolute;inset:0;' +
      'background:linear-gradient(90deg,rgba(7,7,15,.92) 40%,rgba(7,7,15,.5));' +
      'transition:opacity .3s;' +
    '}' +
    '.nav-dd-card:hover .nav-dd-card-bg::after{opacity:.7;}' +
    '.nav-dd-card:hover{' +
      'border-color:rgba(201,168,76,.45);' +
    '}' +
    '.nav-dd-medal{' +
      'width:28px;height:28px;object-fit:contain;flex-shrink:0;' +
      'position:relative;z-index:1;filter:drop-shadow(0 0 4px rgba(201,168,76,.3));' +
    '}' +
    '.nav-dd-name{' +
      'font-family:"Cinzel",serif;font-size:10px;line-height:1.2;' +
      'letter-spacing:.08em;text-transform:uppercase;color:#b0b8c8;' +
      'position:relative;z-index:1;transition:color .2s;' +
    '}' +
    '.nav-dd-card:hover .nav-dd-name{color:#c9a84c;}' +
    '.nav-mobile-toggle{' +
      'display:none;align-items:center;justify-content:center;gap:5px;' +
      'width:42px;height:38px;border:1px solid rgba(201,168,76,.28);border-radius:3px;' +
      'background:rgba(201,168,76,.06);color:#c9a84c;cursor:pointer;' +
      'transition:border-color .2s,background .2s;' +
    '}' +
    '.nav-mobile-toggle:hover{border-color:rgba(201,168,76,.55);background:rgba(201,168,76,.12);}' +
    '.nav-mobile-toggle span{' +
      'display:block;width:18px;height:2px;border-radius:2px;background:#c9a84c;' +
      'box-shadow:0 6px 0 #c9a84c,0 -6px 0 #c9a84c;' +
    '}' +
    '@media(max-width:1320px){' +
      '#main-nav{padding:0 30px;gap:14px;}' +
      '.nav-logo span{display:none;}' +
      '.nav-links a{padding:7px 11px;font-size:11px;letter-spacing:.11em;}' +
    '}' +
    '@media(max-width:980px){' +
      '#main-nav{height:60px;padding:0 16px;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;}' +
      '.nav-logo img{height:34px;}' +
      '.nav-mobile-toggle{display:flex;justify-self:end;}' +
      '.nav-links{' +
        'display:none;position:absolute;top:60px;left:0;right:0;max-height:calc(100vh - 60px);overflow:auto;' +
        'padding:10px 14px 18px;margin:0;flex-direction:column;gap:6px;' +
        'background:rgba(7,7,15,.98);border-bottom:1px solid rgba(201,168,76,.28);' +
        'box-shadow:0 18px 48px rgba(0,0,0,.72);' +
      '}' +
      '#main-nav.nav-open .nav-links{display:flex;}' +
      '.nav-links li{width:100%;}' +
      '.nav-links a{' +
        'width:100%;box-sizing:border-box;padding:13px 14px;font-size:11px;letter-spacing:.16em;' +
        'border-color:rgba(201,168,76,.12);background:rgba(255,255,255,.015);' +
      '}' +
      '.nav-dd-wrap{position:static;}' +
      '.nav-dd-panel{' +
        'position:static;width:100%;grid-template-columns:1fr;gap:6px;margin-top:6px;padding:6px;' +
        'box-shadow:none;background:rgba(10,10,22,.82);transform:none;' +
      '}' +
      '.nav-dd-card{min-height:46px;padding:10px 12px;}' +
      '.nav-dd-medal{width:24px;height:24px;}' +
      '.nav-dd-name{font-size:10px;}' +
    '}';

  function injectCSS() {
    if (document.getElementById('ofs-header-bar-styles')) return;
    var s = document.createElement('style');
    s.id = 'ofs-header-bar-styles';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function buildNav() {
    var nav = document.getElementById('main-nav');
    if (!nav) return;

    /* Detect current page filename for active link */
    var filename = (window.location.pathname.split('/').pop() || '').toLowerCase();

    /* Logo */
    var logo = document.createElement('a');
    logo.href = 'OFS_Home.html';
    logo.className = 'nav-logo';

    var logoImg = document.createElement('img');
    logoImg.src = 'ofs_logo.png';
    logoImg.alt = 'OFS';
    logo.appendChild(logoImg);

    var logoText = document.createElement('span');
    logoText.textContent = 'Order of the Fallen Star';
    logo.appendChild(logoText);

    /* Link list */
    var ul = document.createElement('ul');
    ul.className = 'nav-links';

    var bannerPanel = null;
    var fleetPanel = null;

    LINKS.forEach(function (link) {
      var li = document.createElement('li');

      if (link.dropdown) {
        /* Data dropdown */
        li.className = 'nav-dd-wrap';
        var trigger = document.createElement('a');
        trigger.className = 'nav-dd-trigger';
        trigger.textContent = link.label;
        trigger.href = '#';
        if ((link.dropdown === 'banners' && filename === 'ofs_banner.html') || (link.dropdown === 'fleet' && filename === 'ofs_fleet.html')) trigger.classList.add('active');

        var ddPanel = document.createElement('div');
        ddPanel.className = 'nav-dd-panel';
        if (link.dropdown === 'fleet') ddPanel.className += ' nav-dd-panel-fleet';

        trigger.addEventListener('click', function (e) {
          e.preventDefault();
          var isOpen = ddPanel.classList.contains('open');
          document.querySelectorAll('#main-nav .nav-dd-panel.open').forEach(function (panel) {
            if (panel !== ddPanel) panel.classList.remove('open');
          });
          ddPanel.classList.toggle('open', !isOpen);
        });

        li.appendChild(trigger);
        li.appendChild(ddPanel);
        if (link.dropdown === 'banners') bannerPanel = ddPanel;
        if (link.dropdown === 'fleet') fleetPanel = ddPanel;
      } else {
        var a = document.createElement('a');
        a.href = link.href;
        a.textContent = link.label;
        if (filename === link.href.toLowerCase()) {
          a.className = 'active';
        }
        li.appendChild(a);
      }
      ul.appendChild(li);
    });

    /* Mobile menu toggle — hidden on desktop by CSS */
    var mobileToggle = document.createElement('button');
    mobileToggle.type = 'button';
    mobileToggle.className = 'nav-mobile-toggle';
    mobileToggle.setAttribute('aria-label', 'Open navigation menu');
    mobileToggle.setAttribute('aria-expanded', 'false');
    mobileToggle.innerHTML = '<span aria-hidden="true"></span>';
    mobileToggle.addEventListener('click', function () {
      var open = nav.classList.toggle('nav-open');
      mobileToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      mobileToggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
      if (!open) {
        document.querySelectorAll('#main-nav .nav-dd-panel.open').forEach(function (panel) {
          panel.classList.remove('open');
        });
      }
    });

    /* Replace nav contents */
    nav.innerHTML = '';
    nav.appendChild(logo);
    nav.appendChild(mobileToggle);
    nav.appendChild(ul);

    /* Populate data dropdowns */
    if (bannerPanel) {
      _ddPanel = bannerPanel;
      populateBannerDropdown(bannerPanel);
    }
    if (fleetPanel) {
      _fleetPanel = fleetPanel;
      populateFleetDropdown(fleetPanel);
    }

    /* Close dropdown when clicking outside */
    document.addEventListener('click', function (e) {
      if (!e.target.closest('#main-nav')) {
        nav.classList.remove('nav-open');
        mobileToggle.setAttribute('aria-expanded', 'false');
        mobileToggle.setAttribute('aria-label', 'Open navigation menu');
        if (bannerPanel) bannerPanel.classList.remove('open');
        if (fleetPanel) fleetPanel.classList.remove('open');
      } else if (!e.target.closest('.nav-dd-wrap')) {
        if (bannerPanel) bannerPanel.classList.remove('open');
        if (fleetPanel) fleetPanel.classList.remove('open');
      }
    });
  }

  var _ddPanel = null;
  var _fleetPanel = null;

  function driveDirect(url) {
    if (!url) return '';
    var m = url.match(/\/file\/d\/([^/?#]+)/);
    if (m) return 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w400';
    return url;
  }

  function driveHero(url) {
    if (!url) return '';
    var m = url.match(/\/file\/d\/([^/?#]+)/);
    if (m) return 'https://lh3.googleusercontent.com/d/' + m[1];
    return url;
  }

  function populateBannerDropdown(panel) {
    var defs = null;
    if (window.OFSSheets && OFSSheets.getBannerDefs) {
      defs = OFSSheets.getBannerDefs();
      if (defs && !defs.length) defs = null;
    }
    var banners = defs
      ? defs.map(function (d) { return { name: d.name, medal: d.medalUrl || '', hero: d.bannerImageUrl || '' }; })
      : FALLBACK_BANNERS.map(function (n) { return { name: n, medal: '', hero: '' }; });

    panel.innerHTML = '';
    banners.forEach(function (b) {
      var card = document.createElement('a');
      card.className = 'nav-dd-card';
      card.href = 'OFS_Banner.html?banner=' + encodeURIComponent(b.name);

      /* Background hero image — separate layer so border repaint doesn't flash it */
      var heroSrc = driveHero(b.hero);
      if (heroSrc) {
        var bg = document.createElement('div');
        bg.className = 'nav-dd-card-bg';
        bg.style.backgroundImage = 'url(' + heroSrc + ')';
        card.appendChild(bg);
      }

      /* Medal icon */
      var medalSrc = driveDirect(b.medal);
      if (medalSrc) {
        var img = document.createElement('img');
        img.className = 'nav-dd-medal';
        img.src = medalSrc;
        img.alt = '';
        img.onerror = function () { this.style.display = 'none'; };
        card.appendChild(img);
      }

      /* Name */
      var nameEl = document.createElement('span');
      nameEl.className = 'nav-dd-name';
      nameEl.textContent = b.name;
      card.appendChild(nameEl);

      panel.appendChild(card);
    });
  }



  function populateFleetDropdown(panel) {
    var fleets = null;
    if (window.OFSSheets) {
      var names = {};
      if (OFSSheets.getFleets) {
        (OFSSheets.getFleets() || []).forEach(function (f) {
          if (f && f.active !== false && f.fleetName) names[f.fleetName] = true;
        });
      }
      if (OFSSheets.getFleetStructure) {
        (OFSSheets.getFleetStructure() || []).forEach(function (f) {
          if (f && f.active !== false && f.fleetName) names[f.fleetName] = true;
        });
      }
      fleets = Object.keys(names).sort();
      if (!fleets.length) fleets = null;
    }
    fleets = fleets || FALLBACK_FLEETS;
    panel.innerHTML = '';
    fleets.forEach(function (name) {
      var card = document.createElement('a');
      card.className = 'nav-dd-card';
      card.href = 'OFS_Fleet.html?fleet=' + encodeURIComponent(name);
      var nameEl = document.createElement('span');
      nameEl.className = 'nav-dd-name';
      nameEl.textContent = name;
      card.appendChild(nameEl);
      panel.appendChild(card);
    });
  }

  function init() {
    // Hide nav entirely when embedded in an iframe (e.g. admin page manager preview)
    if (window.self !== window.top) {
      var nav = document.getElementById('main-nav');
      if (nav) nav.style.display = 'none';
      return;
    }
    injectCSS();
    buildNav();
    window.addEventListener('ofs:sheets-loaded', function () {
      if (_ddPanel) populateBannerDropdown(_ddPanel);
      if (_fleetPanel) populateFleetDropdown(_fleetPanel);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* Expose refresh so Sheets load can update the banner list */
  window.OFSHeaderBar = {
    refreshBanners: function () {
      if (_ddPanel) populateBannerDropdown(_ddPanel);
      if (_fleetPanel) populateFleetDropdown(_fleetPanel);
    },
    refreshFleets: function () {
      if (_fleetPanel) populateFleetDropdown(_fleetPanel);
    }
  };

}());
