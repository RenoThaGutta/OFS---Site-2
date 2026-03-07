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
    { href: 'OFS_TavernHall.html',  label: 'Tavern Hall'  },
    { href: 'OFS_Admin.html',       label: 'Admin'        },
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
    '@media(max-width:860px){' +
      '#main-nav{padding:0 20px;}' +
      '.nav-logo span{display:none;}' +
      '.nav-links a{padding:6px 9px;font-size:10.5px;}' +
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

    LINKS.forEach(function (link) {
      var li = document.createElement('li');
      var a  = document.createElement('a');
      a.href = link.href;
      a.textContent = link.label;
      if (filename === link.href.toLowerCase()) {
        a.className = 'active';
      }
      li.appendChild(a);
      ul.appendChild(li);
    });

    /* Replace nav contents */
    nav.innerHTML = '';
    nav.appendChild(logo);
    nav.appendChild(ul);
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

}());
