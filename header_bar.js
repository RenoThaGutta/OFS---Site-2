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
      'display:none;position:absolute;top:calc(100% + 6px);left:50%;transform:translateX(-50%);' +
      'background:rgba(14,14,28,.96);border:1px solid rgba(201,168,76,.28);' +
      'border-radius:4px;padding:10px;z-index:210;' +
      'backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);' +
      'box-shadow:0 12px 36px rgba(0,0,0,.6);' +
      'display:none;grid-template-columns:1fr 1fr;gap:6px;width:280px;' +
    '}' +
    '.nav-dd-panel.open{display:grid;}' +
    '.nav-dd-card{' +
      'display:block;text-decoration:none;padding:8px 12px;' +
      'border:1px solid rgba(201,168,76,.12);border-radius:3px;' +
      'font-family:"Cinzel",serif;font-size:10px;line-height:1.3;' +
      'letter-spacing:.08em;text-transform:uppercase;color:#b0b8c8;' +
      'transition:border-color .2s,background .2s,color .2s;' +
    '}' +
    '.nav-dd-card:hover{' +
      'border-color:rgba(201,168,76,.4);background:rgba(201,168,76,.08);color:#c9a84c;' +
    '}' +
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

  function populateBannerDropdown(panel) {
    var banners = FALLBACK_BANNERS;
    /* Use Sheets data if available */
    if (window.OFSSheets && OFSSheets.getBannerDefs) {
      var defs = OFSSheets.getBannerDefs();
      if (defs && defs.length) {
        banners = defs.map(function (d) { return d.name; });
      }
    }
    panel.innerHTML = '';
    banners.forEach(function (name) {
      var card = document.createElement('a');
      card.className = 'nav-dd-card';
      card.href = 'OFS_Banner.html?banner=' + encodeURIComponent(name);
      card.textContent = name;
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
