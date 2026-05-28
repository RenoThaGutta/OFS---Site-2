/**
 * ofs-nav.js — Discord identity zone for #main-nav
 * Adds a .nav-user-zone to the right side of the nav on every public page.
 * Requires ofs-data.js to be loaded before this script for full player card display.
 */
(function () {
  'use strict';

  // Don't render the user zone when embedded in an iframe (e.g. admin page manager preview)
  if (window.self !== window.top) return;

  var DISCORD_OAUTH_URL = 'https://discord.com/oauth2/authorize?client_id=1429228667564851383&response_type=code&redirect_uri=https%3A%2F%2Forderofthefallenstar.com%2Fauth%2Fcallback&scope=identify';
  var SESSION_KEY = 'ofs_discord_session';

  function currentReturnPath() {
    return window.location.pathname.replace(/^\//, '') + window.location.search + window.location.hash;
  }

  function buildOAuthUrl() {
    var url = new URL(DISCORD_OAUTH_URL);
    url.searchParams.set('state', currentReturnPath());
    return url.toString();
  }

  /* ── CSS ─────────────────────────────────────────────── */
  var CSS = [
    '.nav-user-zone{position:absolute;left:50%;top:0;bottom:0;transform:translateX(-50%);display:flex;align-items:center;}',

    /* Login button */
    '.nav-login-btn{',
    '  display:inline-flex;align-items:center;gap:8px;',
    '  font-family:"Cinzel",serif;font-size:.68rem;letter-spacing:.12em;text-transform:uppercase;',
    '  color:var(--gold);text-decoration:none;',
    '  padding:7px 14px;border:1px solid var(--b-gold);border-radius:3px;',
    '  background:transparent;',
    '  transition:background .2s,box-shadow .2s;',
    '  white-space:nowrap;',
    '}',
    '.nav-login-btn:hover{background:rgba(201,168,76,.08);box-shadow:0 0 14px rgba(201,168,76,.15);}',
    '.nav-login-btn svg{flex-shrink:0;}',

    /* Player card wrapper */
    '.nav-user-card{',
    '  display:flex;align-items:center;gap:10px;',
    '  padding:5px 12px 5px 6px;',
    '  border:1px solid var(--b-gold);border-radius:4px;',
    '  background:rgba(201,168,76,.04);',
    '  text-decoration:none;cursor:pointer;',
    '  transition:background .2s;',
    '}',
    '.nav-user-card:hover{background:rgba(201,168,76,.08);}',

    /* Avatar */
    '.nav-user-avatar{',
    '  width:32px;height:32px;border-radius:50%;',
    '  border:1px solid var(--b-gold);',
    '  object-fit:cover;flex-shrink:0;',
    '  background:var(--bg-card2);',
    '}',

    /* Text block */
    '.nav-user-info{display:flex;flex-direction:column;gap:3px;}',
    '.nav-user-name{',
    '  font-family:"Cinzel",serif;font-size:.72rem;letter-spacing:.1em;',
    '  color:var(--gold);line-height:1;white-space:nowrap;',
    '}',

    /* Chips row */
    '.nav-user-chips{display:flex;gap:5px;flex-wrap:nowrap;}',
    '.nuc-chip{',
    '  font-family:"Cinzel",serif;font-size:.55rem;letter-spacing:.08em;text-transform:uppercase;',
    '  padding:2px 7px;border-radius:2px;white-space:nowrap;line-height:1.4;',
    '}',
    '.nuc-rank{color:var(--gold-lt);border:1px solid var(--b-gold);}',
    '.nuc-role,.nuc-banner{color:var(--silver);border:1px solid var(--b-dim);}',
    '.nuc-path{color:var(--gold);border:1px solid var(--b-gold);background:rgba(201,168,76,.06);}',
    '.nav-user-name-row{display:flex;align-items:baseline;gap:16px;}',
    '.nuc-lvl-inline{font-family:"Cinzel",serif;font-size:.55rem;letter-spacing:.1em;text-transform:uppercase;color:var(--silver);white-space:nowrap;margin-left:auto;}',

    /* Sign-out button */
    '.nav-user-signout{',
    '  display:flex;align-items:center;justify-content:center;',
    '  margin-left:4px;width:18px;height:18px;',
    '  font-size:.65rem;color:var(--silver-dim);',
    '  background:none;border:none;cursor:pointer;border-radius:2px;',
    '  transition:color .2s;flex-shrink:0;',
    '}',
    '.nav-user-signout:hover{color:var(--gold);}',
    '@media(max-width:720px){',
    '  .nav-user-zone{position:static;left:auto;top:auto;bottom:auto;transform:none;flex:1 1 auto;min-width:0;margin-left:12px;margin-right:10px;}',
    '  .nav-login-btn{width:100%;box-sizing:border-box;justify-content:center;padding:8px 10px;font-size:.58rem;letter-spacing:.1em;}',
    '  .nav-user-card{width:100%;max-width:none;min-width:0;min-height:50px;box-sizing:border-box;padding:5px 8px 5px 6px;gap:8px;}',
    '  .nav-user-avatar{width:36px;height:36px;}',
    '  .nav-user-info{min-width:0;flex:1 1 auto;gap:4px;}',
    '  .nav-user-name-row{gap:6px;min-width:0;align-items:center;}',
    '  .nav-user-name{max-width:none;min-width:0;overflow:hidden;text-overflow:ellipsis;font-size:.68rem;}',
    '  .nuc-lvl-inline{display:inline-block;font-size:.44rem;letter-spacing:.07em;max-width:64px;overflow:hidden;text-overflow:ellipsis;color:var(--gold-lt);}',
    '  .nav-user-chips{display:flex;gap:3px;flex-wrap:nowrap;min-width:0;overflow:visible;}',
    '  .nuc-chip{flex:0 0 auto;font-size:.40rem;letter-spacing:.035em;padding:1px 4px;line-height:1.25;max-width:none;overflow:visible;text-overflow:clip;}',
    '  .nav-user-signout{width:20px;height:20px;margin-left:0;font-size:.7rem;}',
    '}',
  ].join('');

  function injectStyles() {
    if (document.getElementById('ofs-nav-styles')) return;
    var s = document.createElement('style');
    s.id = 'ofs-nav-styles';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ── Session helpers ─────────────────────────────────── */
  function getSession() {
    var raw = null;
    try { raw = localStorage.getItem(SESSION_KEY); } catch (e) { raw = null; }
    if (!raw) {
      try {
        raw = sessionStorage.getItem(SESSION_KEY);
        if (raw) localStorage.setItem(SESSION_KEY, raw); // migrate old tab-only sessions
      } catch (e) { raw = null; }
    }
    try { return raw ? JSON.parse(raw) : null; }
    catch (e) { return null; }
  }

  function clearSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
  }

  /* ── Rep level helper ────────────────────────────────── */
  function calcNavLvl(xp) {
    var thresholds;
    try {
      var v = JSON.parse(localStorage.getItem('ofs_level_xp') || 'null');
      thresholds = (Array.isArray(v) && v.length) ? v : null;
    } catch (e) { thresholds = null; }
    if (!thresholds) return null; // don't show if thresholds not yet loaded
    var lvl = 1;
    for (var i = 0; i < thresholds.length; i++) {
      if (xp >= thresholds[i]) lvl = i + 1; else break;
    }
    return Math.min(lvl, thresholds.length);
  }

  /* ── Discord icon SVG (small, inline) ─────────────────── */
  var DISCORD_ICON = '<svg width="16" height="12" viewBox="0 0 16 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13.553 1.02A13.25 13.25 0 0 0 10.26 0c-.146.263-.316.617-.433.899a12.3 12.3 0 0 0-3.654 0A9.8 9.8 0 0 0 5.74 0 13.28 13.28 0 0 0 2.443 1.022C.352 4.09-.215 7.08.068 10.028a13.35 13.35 0 0 0 4.066 2.059c.328-.446.62-.92.871-1.42a8.67 8.67 0 0 1-1.372-.662c.115-.084.228-.171.337-.26 2.645 1.22 5.514 1.22 8.128 0 .11.089.222.176.337.26a8.68 8.68 0 0 1-1.374.663c.251.499.542.974.871 1.42a13.32 13.32 0 0 0 4.069-2.06c.332-3.485-.567-6.445-2.448-9.008ZM5.347 8.21c-.788 0-1.437-.724-1.437-1.61 0-.887.634-1.613 1.437-1.613.803 0 1.452.725 1.437 1.612 0 .887-.634 1.612-1.437 1.612Zm5.306 0c-.788 0-1.437-.724-1.437-1.61 0-.887.634-1.613 1.437-1.613.803 0 1.452.725 1.437 1.612 0 .887-.634 1.612-1.437 1.612Z" fill="currentColor"/></svg>';

  /* ── Build login button ──────────────────────────────── */
  function buildLoginBtn() {
    var a = document.createElement('a');
    a.className = 'nav-login-btn';
    a.href = buildOAuthUrl();
    a.innerHTML = DISCORD_ICON + 'Login';
    return a;
  }

  /* ── Build player card ───────────────────────────────── */
  function buildPlayerCard(session) {
    var player = null;
    if (window.OFSData && typeof OFSData.getPlayerById === 'function') {
      player = OFSData.getPlayerById(session.id);
    }

    var card = document.createElement('a');
    card.className = 'nav-user-card';
    card.href = 'OFS_PlayerSheet.html?player=' + encodeURIComponent(session.id);

    // Avatar
    var img = document.createElement('img');
    img.className = 'nav-user-avatar';
    img.alt = session.username || 'Player';
    img.src = (player && player.avatarUrl) || session.avatarUrl || 'ofs_logo.png';
    img.onerror = function () { this.src = 'ofs_logo.png'; };
    card.appendChild(img);

    // Info block
    var info = document.createElement('div');
    info.className = 'nav-user-info';

    // Name row: username + rep level inline
    var nameRow = document.createElement('div');
    nameRow.className = 'nav-user-name-row';

    var name = document.createElement('div');
    name.className = 'nav-user-name';
    name.textContent = (player && player.username) || session.username || 'Unknown';
    nameRow.appendChild(name);

    if (player) {
      var lvl = calcNavLvl(player.reputationXP || 0);
      if (lvl !== null) {
        var lvlLabel = document.createElement('span');
        lvlLabel.className = 'nuc-lvl-inline';
        lvlLabel.title = 'Reputation Level';
        lvlLabel.textContent = 'Rep Lvl ' + lvl;
        nameRow.appendChild(lvlLabel);
      }
    }
    info.appendChild(nameRow);

    // Chips — only if player data is available
    if (player) {
      var chips = document.createElement('div');
      chips.className = 'nav-user-chips';

      // Rank chip
      var rankChip = document.createElement('span');
      rankChip.className = 'nuc-chip nuc-rank';
      rankChip.title = 'Org Rank';
      rankChip.textContent = player.rank || 'Commoner';
      chips.appendChild(rankChip);

      // Banner chip
      var banner = player.activeBanner;
      if (banner) {
        var bannerChip = document.createElement('span');
        bannerChip.className = 'nuc-chip nuc-banner';
        bannerChip.title = 'Banner';
        bannerChip.textContent = banner;
        chips.appendChild(bannerChip);
      }

      // Banner rank chip
      var bannerData = player.banners && player.banners[banner];
      var pts = (bannerData && bannerData.p) || 0;
      var medal = (bannerData && bannerData.m) || false;
      var bannerTitle = '';
      if (window.OFSData && typeof OFSData.bannerRankTitle === 'function') {
        bannerTitle = OFSData.bannerRankTitle(banner, pts, medal) || '';
      }
      if (bannerTitle) {
        var pathChip = document.createElement('span');
        pathChip.className = 'nuc-chip nuc-path';
        pathChip.title = 'Banner Rank';
        pathChip.textContent = bannerTitle;
        chips.appendChild(pathChip);
      }

      info.appendChild(chips);
    }

    card.appendChild(info);

    // Sign-out button
    var signout = document.createElement('button');
    signout.className = 'nav-user-signout';
    signout.title = 'Sign out';
    signout.innerHTML = '&#x2715;'; // ×
    signout.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      clearSession();
      renderZone();
    });
    card.appendChild(signout);

    return card;
  }

  /* ── Admin link visibility ───────────────────────────── */
  function toggleAdminLink(session) {
    var nav = document.getElementById('main-nav');
    if (!nav) return;
    var links = nav.querySelectorAll('a[href*="OFS_Admin"]');
    var show = !!(session && session.isAdmin);
    for (var i = 0; i < links.length; i++) {
      links[i].style.display = show ? '' : 'none';
    }
  }

  /* ── Render the zone ─────────────────────────────────── */
  var zone = null;

  function renderZone() {
    if (!zone) return;
    // Clear
    while (zone.firstChild) zone.removeChild(zone.firstChild);

    var session = getSession();
    if (session && session.id) {
      zone.appendChild(buildPlayerCard(session));
    } else {
      zone.appendChild(buildLoginBtn());
    }

    toggleAdminLink(session);
  }

  /* ── Init ────────────────────────────────────────────── */
  function init() {
    // Skip admin page — it has its own auth overlay
    if (document.getElementById('login-overlay')) return;

    var nav = document.getElementById('main-nav');
    if (!nav) return;

    injectStyles();

    zone = document.createElement('div');
    zone.className = 'nav-user-zone';
    var navLinks = nav.querySelector('.nav-links');
    var mobileToggle = nav.querySelector('.nav-mobile-toggle');
    if (mobileToggle) {
      nav.insertBefore(zone, mobileToggle);
    } else if (navLinks) {
      nav.insertBefore(zone, navLinks);
    } else {
      nav.appendChild(zone);
    }

    renderZone();
    window.addEventListener('ofs:sheets-loaded', renderZone);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for external use (e.g. OFS_Auth_Callback.html can call this after setting session)
  window.OFSNav = {
    refresh: function() { renderZone(); if (window.OFSHeaderBar) OFSHeaderBar.refreshBanners(); },
    clearSession: clearSession,
    SESSION_KEY: SESSION_KEY
  };
}());
