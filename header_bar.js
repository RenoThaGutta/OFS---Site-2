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
    { href: 'OFS_Home.html',        label: 'Home'         },
    { href: 'OFS_Codex.html',       label: 'Codex'        },
    { href: 'OFS_Timeline.html',    label: 'Chronicles'   },
    { href: 'OFS_Roster.html',      label: 'Roster'       },
    { label: 'Banners',             dropdown: true         },
    { href: 'OFS_TavernHall.html',  label: 'Tavern Hall'  },
    { href: 'OFS_Admin.html',       label: 'Admin'        },
  ];

  /* Fallback banner names if Sheets data hasn't loaded yet */
  var FALLBACK_BANNERS = [
    'The Artificer','The Astraeus','The Engineer','The Explorer',
    'The Fang','The Forager','The Guardian','The Healer',
    'The Merchant','The Privateer','The Talon'
  ];

  /* ── Canonical nav CSS (hardcoded px — immune to font-size inheritance) ── */
  var CSS =
    '#main-nav{' +
      'position:fixed;top:0;left:0;right:0;z-index:200;' +
      'height:62px;box-sizing:border-box;' +
      'background:rgba(7,7,15,.82);' +
      'backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);' +
      'border-bottom:1px solid rgba(201,168,76,.28);' +
      'padding:0 40px;' +
      'display:flex;align-items:center;justify-content:space-between;' +
      'transition:background .3s;' +
    '}' +
    '.nav-logo{' +
      'display:flex;align-items:center;gap:12px;' +
      'text-decoration:none;flex-shrink:0;' +
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
      'display:flex;gap:2px;list-style:none;margin:0;padding:0;flex-shrink:0;' +
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
    '@media(max-width:860px){' +
      '#main-nav{padding:0 20px;}' +
      '.nav-logo span{display:none;}' +
      '.nav-links a{padding:6px 9px;font-size:10.5px;}' +
      '.nav-dd-panel{width:240px;left:auto;right:0;transform:none;}' +
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

    var ddPanel = null;

    LINKS.forEach(function (link) {
      var li = document.createElement('li');

      if (link.dropdown) {
        /* Banners dropdown */
        li.className = 'nav-dd-wrap';
        var trigger = document.createElement('a');
        trigger.className = 'nav-dd-trigger';
        trigger.textContent = link.label;
        trigger.href = '#';
        if (filename === 'ofs_banner.html') trigger.classList.add('active');

        ddPanel = document.createElement('div');
        ddPanel.className = 'nav-dd-panel';

        trigger.addEventListener('click', function (e) {
          e.preventDefault();
          var isOpen = ddPanel.classList.contains('open');
          ddPanel.classList.toggle('open', !isOpen);
        });

        li.appendChild(trigger);
        li.appendChild(ddPanel);
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

    /* Replace nav contents */
    nav.innerHTML = '';
    nav.appendChild(logo);
    nav.appendChild(ul);

    /* Populate banner dropdown */
    if (ddPanel) {
      _ddPanel = ddPanel;
      populateBannerDropdown(ddPanel);
    }

    /* Close dropdown when clicking outside */
    document.addEventListener('click', function (e) {
      if (ddPanel && !e.target.closest('.nav-dd-wrap')) {
        ddPanel.classList.remove('open');
      }
    });
  }

  var _ddPanel = null;

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

  function init() {
    // Hide nav entirely when embedded in an iframe (e.g. admin page manager preview)
    if (window.self !== window.top) {
      var nav = document.getElementById('main-nav');
      if (nav) nav.style.display = 'none';
      return;
    }
    injectCSS();
    buildNav();
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
    }
  };

}());
