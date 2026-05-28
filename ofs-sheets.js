/**
 * ofs-sheets.js — OFS live data layer
 * Fetches all sheet data from the Cloudflare Worker, merges into player
 * objects, and persists through OFSData (localStorage).
 *
 * Usage:
 *   OFSSheets.load()                        → Promise<player[]>
 *   OFSSheets.appendStatAdjustment(...)     → Promise<{ok}>
 *   OFSSheets.updateWallet(userId, wallet)  → Promise<{ok}>
 *   OFSSheets.appendBankLog(...)            → Promise<{ok}>
 */
(function (global) {
  'use strict';

  const WORKER_URL        = 'https://ofs-api.orderofthefallenstar.workers.dev';
  const CACHE_KEY          = 'ofs_sheets_cache';
  const BANNER_CACHE_KEY   = 'ofs_banner_defs_cache';
  const BANNER_ALIAS_KEY   = 'ofs_banner_rename_aliases';
  const TAVERN_CACHE_KEY   = 'ofs_tavern_sheets_cache';
  const REFERENCE_CACHE_KEY = 'ofs_reference_sheets_cache';
  const CACHE_TTL_MS       = 5 * 60 * 1000; // 5 minutes

  /* ── Column indices ───────────────────────────────── */
  const ML = {
    USER_ID:        0,   // A — "User ID"
    USERNAME:       1,   // B — "Username"
    RANK:           2,   // C — "Rank"
    // D (3):  "Role"            — display role, not imported
    CHAPTER:        4,   // E — "Current Chapter" (faction)
    JOIN_DATE:      5,   // F — "Join Date"
    TIME_IN_SERVICE:6,   // G — "Time in service"
    // H (7):  "Squire_1"       — not imported
    // I (8):  "Squire_2"       — not imported
    BACK_STORY:     9,   // J — "Back Story"
    PROFILE_PIC:   10,   // K — "Profile_Pic"
    // L (11): "Role Requested" — not imported
    // M (12): "Quest"          — not imported
    // N (13): "Crusades"       — not imported
    // O-Q (14-16): empty
    ROLE_PATH:     17,   // R — "Role Path"
    SHIP:          18,   // S — "Ship"
    SHIP_IMAGE:    19,   // T — "Ship Image"
    // U (20): "Verified"       — not imported
    // V (21): "RSI User Name"  — not imported
    ACTIVE_QUEST:       22,   // W — "Active Quest"
    ACTIVE_QUEST_DESC:  23,   // X — "Active Quest Desc"
    ACTIVE_QUEST_LEADER:24,   // Y — "Active Quest Leader"
    LAST_QUEST:         25,   // Z — "Most Recent Completed Quest"
    LAST_QUEST_LEADER:  26,   // AA — "Most Recent Quest Leader"
    LAST_QUEST_DESC:    27,   // AB — "Most Recent Completed Quest Desc"
    BANNER:        28,   // AC — "Banner"
    // AD (29): "Banner Points" — aggregate, use banner sheet instead
    // AE (30): "Banner Medals" — aggregate, use banner sheet instead
    REPUTATION_XP: 31,   // AF — "Reputation XP"
    MEDALS:        32,   // AG — "Medals" (comma-separated banner names)
  };

  const PT = {
    USER_ID: 0, DISPLAY_NAME: 1,
    PATROL_COUNT: 2, TOTAL_LENGTH: 3,
    FPS_KILLS: 4, SHIP_KILLS: 5, CRUSADES: 6,
    TURRET_KILLS: 7, QUEST_TOTAL: 8,
    LED_QUESTS: 9, LED_CRUSADES: 10
  };

  const BK  = { USER_ID: 0, GOLD: 1, SILVER: 2, COPPER: 3 };
  const REP = { LVL: 0, EXP: 1 };

  /* ── Row helpers ─────────────────────────────────── */
  function cell(row, idx) {
    return (row && row[idx] != null) ? String(row[idx]) : '';
  }

  function num(row, idx) {
    return Number(cell(row, idx)) || 0;
  }

  function patrolLengthHours(row, idx) {
    const value = cell(row, idx).trim();
    if (!value) return 0;

    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;

    const hoursMatch = value.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/i);
    const minutesMatch = value.match(/(\d+(?:\.\d+)?)\s*(?:m|min|mins|minute|minutes)\b/i);
    const hours = hoursMatch ? Number(hoursMatch[1]) : 0;
    const minutes = minutesMatch ? Number(minutesMatch[1]) : 0;
    if (hoursMatch || minutesMatch) return hours + (minutes / 60);

    return 0;
  }

  /* ── Build merged player objects ─────────────────── */
  function buildPlayers(data) {
    if (!data.memberLog || data.memberLog.length < 2) return null;

    // Index patrol totals by User ID
    const patrolMap = {};
    if (data.patrolTotals && data.patrolTotals.length > 1) {
      for (const row of data.patrolTotals.slice(1)) {
        const uid = cell(row, PT.USER_ID).trim();
        if (uid) patrolMap[uid] = row;
      }
    }

    // Index wallet by User ID
    const walletMap = {};
    if (data.bank && data.bank.length > 1) {
      for (const row of data.bank.slice(1)) {
        const uid = cell(row, BK.USER_ID).trim();
        if (uid) walletMap[uid] = row;
      }
    }

    // Index banner points by User ID — columns are dynamic
    // Store just points here; medal flags come from Member Log "Medals" column
    const bannerPtsMap = {};  // uid -> { bannerName: number }
    let bpBannerNames = [];   // ordered list of banner names from header row
    if (data.bannerPoints && data.bannerPoints.length > 1) {
      bpBannerNames = data.bannerPoints[0].slice(1); // drop col A ("Banners")
      for (const row of data.bannerPoints.slice(1)) {
        const uid = cell(row, 0).trim();
        if (!uid) continue;
        const pts = {};
        bpBannerNames.forEach(function (name, i) {
          pts[name] = Number(row[i + 1]) || 0;
        });
        bannerPtsMap[uid] = pts;
      }
    }

    // Build player list from Member Log rows (deduplicate by User ID)
    const players = [];
    const seenUids = {};
    for (const row of data.memberLog.slice(1)) {
      const uid = cell(row, ML.USER_ID).trim();
      if (!uid) continue;
      if (seenUids[uid]) continue; // skip duplicate rows for same member
      const rank = cell(row, ML.RANK).trim();
      if (!rank) continue; // skip bots and unranked users
      seenUids[uid] = true;

      const patrolRow = patrolMap[uid] || [];
      const walletRow = walletMap[uid] || [];

      // Medals: explicit comma-separated list in Member Log (e.g. "The Fang,The Guardian")
      const medalsStr = cell(row, ML.MEDALS);
      const medalSet  = new Set(
        medalsStr ? medalsStr.split(',').map(function(s) { return s.trim(); }).filter(Boolean) : []
      );

      // Build banners: points from Banners points per user, medals from Member Log
      const ptsMap  = bannerPtsMap[uid] || {};
      const banners = {};
      bpBannerNames.forEach(function (bn) {
        banners[bn] = { p: ptsMap[bn] || 0, m: medalSet.has(bn) };
      });

      players.push({
        id:            uid,
        username:      cell(row, ML.USERNAME),
        rank:          cell(row, ML.RANK),
        faction:       cell(row, ML.CHAPTER) || 'Unassigned',
        rolePath:      cell(row, ML.ROLE_PATH),
        joinDate:      cell(row, ML.JOIN_DATE),
        timeInService: cell(row, ML.TIME_IN_SERVICE),
        backStory:     cell(row, ML.BACK_STORY),
        avatarUrl:     (cell(row, ML.PROFILE_PIC).toLowerCase().indexOf('no avatar') === -1) ? cell(row, ML.PROFILE_PIC) : '',
        ship:          cell(row, ML.SHIP),
        shipImage:     cell(row, ML.SHIP_IMAGE),
        activeBanner:  cell(row, ML.BANNER),
        activeQuest:      cell(row, ML.ACTIVE_QUEST),
        activeQuestDesc:  cell(row, ML.ACTIVE_QUEST_DESC),
        activeQuestLeader:cell(row, ML.ACTIVE_QUEST_LEADER),
        lastQuest:        cell(row, ML.LAST_QUEST),
        lastQuestLeader:  cell(row, ML.LAST_QUEST_LEADER),
        lastQuestDesc:    cell(row, ML.LAST_QUEST_DESC),
        reputationXP:  num(row, ML.REPUTATION_XP),
        stats: {
          PatrolCount:            num(patrolRow, PT.PATROL_COUNT),
          TotalLength:            patrolLengthHours(patrolRow, PT.TOTAL_LENGTH),
          FPS_Kills_Total:        num(patrolRow, PT.FPS_KILLS),
          Ship_Kills_Total:       num(patrolRow, PT.SHIP_KILLS),
          Crusades_Total:         num(patrolRow, PT.CRUSADES),
          Turret_Kills_Total:     num(patrolRow, PT.TURRET_KILLS),
          Quest_Total:            num(patrolRow, PT.QUEST_TOTAL),
          Led_Completed_Quests:   num(patrolRow, PT.LED_QUESTS),
          Led_Completed_Crusades: num(patrolRow, PT.LED_CRUSADES)
        },
        banners: banners,
        wallet: {
          gold:   num(walletRow, BK.GOLD),
          silver: num(walletRow, BK.SILVER),
          copper: num(walletRow, BK.COPPER)
        }
      });
    }

    return players;
  }

  /* ── Banner definitions cache (in-memory + localStorage) ── */
  let _bannerDefs = loadBannerDefsCache() || [];
  let _bannerAliases = loadBannerAliasesCache() || {};

  /* ── Timeline block overrides cache (in-memory) ───── */
  let _timelineBlocks = {};

  let _bannerRoleIdIndex = 9;

  function _bannerHeaderIndex(rows, label) {
    const wanted = String(label || '').trim().toLowerCase();
    for (const headerRow of (rows || []).slice(0, 2)) {
      const idx = (headerRow || []).findIndex(function (cell) {
        return String(cell || '').trim().toLowerCase() === wanted;
      });
      if (idx >= 0) return idx;
    }
    return -1;
  }

  function _bannerColumnMap(rows) {
    // Legacy Banners layout has two non-data rows, then data rows:
    // A Banner Name, B Sub Rank 0, C Sub Rank 1, D Sub Rank 2,
    // E Sub Rank Master, F Medal Name, G Medal URL, H Description,
    // I Banner Image URL. Role ID is appended at J by default.
    const roleIdx = _bannerHeaderIndex(rows, 'Role ID');
    const shiftedForRoleB = roleIdx === 1;
    _bannerRoleIdIndex = roleIdx >= 0 ? roleIdx : 9;
    return {
      name: 0,
      roleId: _bannerRoleIdIndex,
      subRank0: shiftedForRoleB ? 2 : 1,
      subRank1: shiftedForRoleB ? 3 : 2,
      subRank2: shiftedForRoleB ? 4 : 3,
      subRankMaster: shiftedForRoleB ? 5 : 4,
      medalName: shiftedForRoleB ? 6 : 5,
      medalUrl: shiftedForRoleB ? 7 : 6,
      description: shiftedForRoleB ? 8 : 7,
      bannerImageUrl: shiftedForRoleB ? 9 : 8
    };
  }

  function parseBannerDefs(rows) {
    if (!rows || rows.length < 3) return [];
    const col = _bannerColumnMap(rows);
    return rows.slice(2)
      .map(function (row) { return String(row[col.name] || '').trim(); })
      .filter(Boolean)
      .map(function (_, i) {
        var row = rows[i + 2];
        return {
          name:          String(row[col.name] || '').trim(),
          roleId:        String(row[col.roleId] || '').trim(),
          subRank0:      String(row[col.subRank0] || '').trim() || 'Apprentice',
          subRank1:      String(row[col.subRank1] || '').trim() || 'Sub Rank 1',
          subRank2:      String(row[col.subRank2] || '').trim() || 'Sub Rank 2',
          subRankMaster: String(row[col.subRankMaster] || '').trim() || 'Sub Rank Master',
          medalName:       String(row[col.medalName] || '').trim(),
          medalUrl:        String(row[col.medalUrl] || '').trim(),
          description:     String(row[col.description] || '').trim(),
          bannerImageUrl:  String(row[col.bannerImageUrl] || '').trim(),
        };
      });
  }

  function getBannerDefs() { return _bannerDefs; }

  function getBannerAliases() { return Object.assign({}, _bannerAliases || {}); }

  function resolveBannerName(name) {
    const raw = String(name || '').trim();
    if (!raw) return '';
    const current = (_bannerDefs || []).find(function (d) { return String(d.name || '').toLowerCase() === raw.toLowerCase(); });
    if (current) return current.name;
    const mapped = (_bannerAliases || {})[raw.toLowerCase()];
    return mapped || raw;
  }

  /* ── Tavern data cache (in-memory, set on each load) ─ */
  let _tavernData = null;
  let _loadPromise = null;
  let _lastLoadInfo = { source: 'none', ts: 0, message: '' };

  /* ── Fleet/ship data cache (in-memory) ─ */
  let _shipRegistry = [];
  let _fleets = [];
  let _fleetStructure = [];
  let _shopItems = [];
  let _shopPayRules = []; // Backed by existing bot sheet: currency_rules
  let _ranks = [];
  let _adminWhitelist = [];

  /* ── Cache ───────────────────────────────────────── */
  function saveCache(players) {
    try {
      global.localStorage.setItem(CACHE_KEY, JSON.stringify({
        ts: Date.now(),
        players: players
      }));
    } catch (e) { /* storage full */ }
  }

  function loadCache(options) {
    options = options || {};
    try {
      const raw = global.localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || !Array.isArray(obj.players)) return null;
      if (!options.allowStale && Date.now() - obj.ts > CACHE_TTL_MS) return null;
      return { ts: obj.ts || 0, players: obj.players };
    } catch (e) {
      return null;
    }
  }

  function saveBannerDefsCache(defs) {
    try {
      global.localStorage.setItem(BANNER_CACHE_KEY, JSON.stringify({ ts: Date.now(), defs }));
    } catch (e) { /* storage full */ }
  }

  function loadBannerDefsCache() {
    try {
      const raw = global.localStorage.getItem(BANNER_CACHE_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || !Array.isArray(obj.defs)) return null;
      if (Date.now() - obj.ts > CACHE_TTL_MS) return null;
      return obj.defs;
    } catch (e) { return null; }
  }

  function saveBannerAliasesCache(aliases) {
    try {
      global.localStorage.setItem(BANNER_ALIAS_KEY, JSON.stringify({ ts: Date.now(), aliases: aliases || {} }));
    } catch (e) { /* storage full */ }
  }

  function loadBannerAliasesCache() {
    try {
      const raw = global.localStorage.getItem(BANNER_ALIAS_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || !obj.aliases || typeof obj.aliases !== 'object') return null;
      return obj.aliases;
    } catch (e) { return null; }
  }

  function normalizeTavernData(data) {
    data = data || {};
    return {
      quests:            data.quests            || [],
      patrolAdjustments: data.patrolAdjustments || [],
      tavAnnouncements:  data.tavAnnouncements  || [],
      tavEvents:         data.tavEvents         || [],
      tavMedia:          data.tavMedia          || [],
    };
  }

  function saveTavernDataCache(tavernData) {
    try {
      global.localStorage.setItem(TAVERN_CACHE_KEY, JSON.stringify({
        ts: Date.now(),
        data: tavernData
      }));
    } catch (e) { /* storage full */ }
  }

  function loadTavernDataCache() {
    try {
      const raw = global.localStorage.getItem(TAVERN_CACHE_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || !obj.data) return null;
      return { ts: obj.ts || 0, data: normalizeTavernData(obj.data) };
    } catch (e) { return null; }
  }

  function currentReferenceData() {
    return {
      shipRegistry: _shipRegistry || [],
      fleets: _fleets || [],
      fleetStructure: _fleetStructure || [],
      shopItems: _shopItems || [],
      shopPayRules: _shopPayRules || [],
      ranks: _ranks || [],
      adminWhitelist: _adminWhitelist || [],
      bannerDefs: _bannerDefs || []
    };
  }

  function applyReferenceData(ref) {
    ref = ref || {};
    if (Array.isArray(ref.shipRegistry)) _shipRegistry = ref.shipRegistry;
    if (Array.isArray(ref.fleets)) _fleets = ref.fleets;
    if (Array.isArray(ref.fleetStructure)) _fleetStructure = ref.fleetStructure;
    if (Array.isArray(ref.shopItems)) _shopItems = ref.shopItems;
    if (Array.isArray(ref.shopPayRules)) _shopPayRules = ref.shopPayRules;
    if (Array.isArray(ref.ranks)) _ranks = ref.ranks;
    if (Array.isArray(ref.adminWhitelist)) _adminWhitelist = ref.adminWhitelist;
    if (Array.isArray(ref.bannerDefs) && ref.bannerDefs.length) _bannerDefs = ref.bannerDefs;
  }

  function saveReferenceDataCache(ref) {
    try {
      global.localStorage.setItem(REFERENCE_CACHE_KEY, JSON.stringify({
        ts: Date.now(),
        data: ref || currentReferenceData()
      }));
    } catch (e) { /* storage full */ }
  }

  function loadReferenceDataCache() {
    try {
      const raw = global.localStorage.getItem(REFERENCE_CACHE_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || !obj.data) return null;
      return { ts: obj.ts || 0, data: obj.data };
    } catch (e) { return null; }
  }

  /* ── Public API ──────────────────────────────────── */

  /**
   * Fetch all sheets, merge, normalize, cache.
   * Falls back to cached data on network error.
   * @returns {Promise<object[]>} Normalized player array.
   */
  function notifySheetsLoaded(players) {
    try {
      global.dispatchEvent(new CustomEvent('ofs:sheets-loaded', {
        detail: { players: Array.isArray(players) ? players : [], loadInfo: _lastLoadInfo }
      }));
    } catch (e) { /* non-fatal: older browsers or blocked events */ }
  }

  async function load() {
    if (_loadPromise) return _loadPromise;
    _loadPromise = _loadFresh()
      .then(function (players) {
        notifySheetsLoaded(players);
        return players;
      })
      .catch(function (error) {
        notifySheetsLoaded([]);
        throw error;
      })
      .finally(function () { _loadPromise = null; });
    return _loadPromise;
  }

  async function _loadFresh() {
    let data;
    try {
      const res = await fetch(WORKER_URL + '/data');
      if (!res.ok) {
        let errBody = null;
        try { errBody = await res.json(); } catch (e) { errBody = null; }
        const detail = errBody && (errBody.error || errBody.reason || errBody.message || errBody.detail);
        throw new Error(detail || ('Worker /data ' + res.status));
      }
      data = await res.json();
    } catch (err) {
      console.warn('OFSSheets: fetch failed, using cache.', err.message);
      return _fallbackToCache(err.message);
    }

    if (!data.ok) {
      console.warn('OFSSheets: Worker error:', data);
      return _fallbackToCache(data.error || data.reason || data.message || data.detail || 'Worker returned ok:false');
    }

    const raw = buildPlayers(data);
    if (!raw) {
      console.warn('OFSSheets: Member Log is empty.');
      return _fallbackToCache('Member Log is empty');
    }

    // Parse reputation thresholds and save for pages to use
    if (data.reputation && data.reputation.length > 1) {
      try {
        const xpThresholds = data.reputation.slice(1)
          .map(function (row) { return Number(row[1]) || 0; })
          .filter(function (v) { return v > 0; });
        if (xpThresholds.length > 0) {
          global.localStorage.setItem('ofs_level_xp', JSON.stringify(xpThresholds));
        }
      } catch (e) { /* ignore */ }
    }

    // Parse banner definitions
    if (data.bannerRef) {
      _bannerDefs = parseBannerDefs(data.bannerRef);
      saveBannerDefsCache(_bannerDefs);
    }

    // Cache ship/fleet data for Fleet pages and admin. These keys require Worker /data support.
    _shipRegistry = parseShipRegistry(data.shipRegistry || data.ship_registry || data['Ship Registry'] || []);
    _fleets = parseFleets(data.fleets || data.Fleets || []);
    _fleetStructure = parseFleetStructure(data.fleetStructure || data.fleet_structure || data['Fleet Structure'] || []);
    _shopItems = parseShopItems(data.itemList || data.item_list || data['Item List'] || data.shopItems || data.shop_items || data['Shop Items'] || []);
    _shopPayRules = parseShopPayRules(data.currencyRules || data.currency_rules || data['currency_rules'] || data.shopPayRules || data.shop_pay_rules || data['Shop Pay Rules'] || []);
    _ranks = parseRanks(data.ranks || data.Ranks || data['Ranks'] || []);
    _adminWhitelist = parseAdminWhitelist(data.adminWhitelist || data.admin_whitelist || data['White list Admin'] || data.whiteListAdmin || data.white_list_admin || []);
    saveReferenceDataCache();

    // Cache tavern data for OFS_TavernHall.html and admin quest queues to consume.
    // This is intentionally cached separately from normalized players so quest boards
    // can continue to render the last known good Patrols data during Sheets 429s.
    _tavernData = normalizeTavernData(data);
    saveTavernDataCache(_tavernData);
    _lastLoadInfo = data.stale ? {
      source: 'stale-worker',
      ts: data.cachedAt || Date.now(),
      message: data.staleReason || 'Worker served cached sheet data'
    } : { source: 'live', ts: Date.now(), message: '' };

    // Fetch /content for timeline block overrides and banner rename aliases (optional — non-fatal)
    try {
      const cRes = await fetch(WORKER_URL + '/content');
      if (cRes.ok) {
        const cData = await cRes.json();
        if (cData.ok && cData.data) {
          _timelineBlocks = {};
          Object.keys(cData.data).forEach(function (key) {
            if (key.startsWith('tl-block:')) {
              const blockId = key.slice(9); // 'tl-block:'.length
              const val = cData.data[key];
              _timelineBlocks[blockId] = (val && typeof val === 'object') ? val : {};
            }
          });
          if (cData.data.banner_rename_aliases && typeof cData.data.banner_rename_aliases === 'object') {
            _bannerAliases = cData.data.banner_rename_aliases;
            saveBannerAliasesCache(_bannerAliases);
          }
        }
      }
    } catch (e) { /* content fetch is optional */ }

    // Push through OFSData normalization + localStorage
    if (global.OFSData) {
      const normalized = global.OFSData.savePlayers(raw);
      saveCache(normalized);
      return normalized;
    }

    saveCache(raw);
    return raw;
  }

  /** Return the last-fetched tavern data (quests, announcements, events, media). */
  function getTavernData() {
    if (!_tavernData) {
      const cached = loadTavernDataCache();
      if (cached) {
        _tavernData = cached.data;
        _lastLoadInfo = { source: 'cache', ts: cached.ts, message: 'Loaded from local cache' };
      }
    }
    return _tavernData;
  }

  function getLoadInfo() {
    return _lastLoadInfo;
  }

  function parseShipRegistry(rows) {
    if (!rows || rows.length < 2) return [];
    const header = (rows[0] || []).map(function (h) { return String(h || '').trim().toLowerCase(); });
    function idx(names, fallback) {
      for (let i = 0; i < names.length; i++) {
        const found = header.indexOf(names[i]);
        if (found >= 0) return found;
      }
      return fallback;
    }
    const verifiedHeader = idx(['verified', 'wiki verified', 'source verified', 'pulled from wiki'], -1);
    const wikiHeader = idx(['wiki url', 'wiki link', 'source url'], -1);
    const verifiedOffset = verifiedHeader >= 0 ? 1 : 0;
    const col = {
      model: idx(['ship model', 'model', 'name'], 0),
      make: idx(['make', 'manufacturer'], 1),
      imageUrl: idx(['image url', 'image', 'ship image url'], 2),
      verified: verifiedHeader,
      wikiUrl: wikiHeader >= 0 ? wikiHeader : 3 + verifiedOffset,
      role: idx(['role', 'focus'], 4 + verifiedOffset),
      category: idx(['category', 'type'], 5 + verifiedOffset),
      size: idx(['size'], 6 + verifiedOffset),
      crew: idx(['crew'], 7 + verifiedOffset),
      status: idx(['status', 'production status'], 8 + verifiedOffset),
      description: idx(['description', 'details', 'notes'], 9 + verifiedOffset)
    };
    return rows.slice(1).map(function (row) {
      return {
        model: String(row[col.model] || '').trim(),
        make:  String(row[col.make] || '').trim(),
        imageUrl: String(row[col.imageUrl] || '').trim(),
        verified: col.verified >= 0 ? String(row[col.verified] || '').trim() : '',
        wikiUrl: String(row[col.wikiUrl] || '').trim(),
        role: String(row[col.role] || '').trim(),
        category: String(row[col.category] || '').trim(),
        size: String(row[col.size] || '').trim(),
        crew: String(row[col.crew] || '').trim(),
        status: String(row[col.status] || '').trim(),
        description: String(row[col.description] || '').trim()
      };
    }).filter(function (s) { return s.model || s.make || s.imageUrl; });
  }

  function parseFleets(rows) {
    if (!rows || !rows.length) return [];
    const first = rows[0] || [];
    const hasHeader = String(first[0] || '').trim().toLowerCase() === 'fleet id' ||
                      String(first[1] || '').trim().toLowerCase() === 'fleet name';
    return rows.slice(hasHeader ? 1 : 0).map(function (row) {
      return {
        id: String(row[0] || '').trim(),
        fleetName: String(row[1] || '').trim(),
        userId: String(row[2] || '').trim(),
        username: String(row[3] || '').trim(),
        house: String(row[4] || '').trim(),
        banner: String(row[5] || '').trim(),
        shipModel: String(row[6] || '').trim(),
        shipMake: String(row[7] || '').trim(),
        shipImageUrl: String(row[8] || '').trim(),
        role: String(row[9] || '').trim(),
        sortOrder: Number(row[10]) || 0,
        notes: String(row[11] || '').trim(),
        active: String(row[12] == null ? 'TRUE' : row[12]).trim().toUpperCase() !== 'FALSE',
        fighterCap: Number(row[13]) || 0,
        medEvacCap: Number(row[14]) || 0,
        commandCap: Number(row[15]) || 0,
        supportCap: Number(row[16]) || 0
      };
    }).filter(function (f) { return f.id && f.fleetName && String(f.id).toLowerCase() !== 'fleet id'; });
  }

  function parseFleetStructure(rows) {
    if (!rows || !rows.length) return [];
    const first = rows[0] || [];
    const norm = function (v) { return String(v || '').trim().toLowerCase().replace(/[\s-]+/g, '_'); };
    const headers = first.map(norm);
    const hasHeader = headers.indexOf('fleet_name') !== -1 && headers.indexOf('slot_label') !== -1;
    const idx = function (name, fallback) { const i = headers.indexOf(name); return i >= 0 ? i : fallback; };
    const col = {
      fleetName: idx('fleet_name', 0),
      section: idx('section', 1),
      slotLabel: idx('slot_label', 2),
      userId: idx('user_id', 3),
      username: idx('username', 4),
      title: idx('title', 5),
      house: idx('house', 6),
      banner: idx('banner', 7),
      sortOrder: idx('sort_order', 8),
      active: idx('active', 9),
      notes: idx('notes', 10)
    };
    return rows.slice(hasHeader ? 1 : 0).map(function (row) {
      const fleetName = String(row[col.fleetName] || '').trim();
      const section = String(row[col.section] || '').trim();
      const slotLabel = String(row[col.slotLabel] || '').trim();
      const id = [fleetName, section, slotLabel].join('|').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      return {
        id: id,
        fleetName: fleetName,
        section: section,
        slotLabel: slotLabel,
        userId: String(row[col.userId] || '').trim(),
        username: String(row[col.username] || '').trim(),
        title: String(row[col.title] || '').trim(),
        house: String(row[col.house] || '').trim(),
        banner: String(row[col.banner] || '').trim(),
        sortOrder: Number(row[col.sortOrder]) || 0,
        active: String(row[col.active] == null ? 'TRUE' : row[col.active]).trim().toUpperCase() !== 'FALSE',
        notes: String(row[col.notes] || '').trim()
      };
    }).filter(function (f) { return f.fleetName && f.slotLabel && String(f.fleetName).toLowerCase() !== 'fleet name'; });
  }

  function parseBool(value, defaultValue) {
    if (value == null || value === '') return defaultValue !== false;
    return String(value).trim().toUpperCase() !== 'FALSE';
  }

  function parseShopItems(rows) {
    if (!rows || !rows.length) return [];
    const first = rows[0] || [];
    const norm = function (v) { return String(v || '').trim().toLowerCase().replace(/[\s-]+/g, '_'); };
    const headers = first.map(norm);
    const hasItemListHeader = headers.indexOf('item_name') !== -1 || headers.indexOf('item_id') !== -1;
    const hasShopItemsHeader = String(first[0] || '').trim().toLowerCase() === 'item id' ||
                               String(first[1] || '').trim().toLowerCase() === 'item name';
    const rowsOnly = rows.slice((hasItemListHeader || hasShopItemsHeader) ? 1 : 0);

    // Current OFS shop item source: Item List
    // Item_Name | Item Image | Item Roll Buy in amount | Can Auction? Y/N | Tradeable? Y/N | Market Value | Item_ID | Enabled | Notes | Description | Price Gold | Price Silver | Price Copper | Stock | Category
    if (hasItemListHeader) {
      return rowsOnly.map(function (row) {
        const itemId = String(row[6] || '').trim();
        const name = String(row[0] || '').trim();
        return {
          id: itemId || ('item-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-')),
          itemId: itemId,
          name: name,
          imageUrl: String(row[1] || '').trim(),
          rollBuyInAmount: String(row[2] || '').trim(),
          canAuction: String(row[3] || '').trim(),
          tradeable: String(row[4] || '').trim(),
          marketValue: String(row[5] || '').trim(),
          enabled: parseBool(row[7], true),
          active: parseBool(row[7], true),
          notes: String(row[8] || '').trim(),
          description: String(row[9] || '').trim(),
          priceGold: Number(row[10]) || 0,
          priceSilver: Number(row[11]) || 0,
          priceCopper: Number(row[12]) || 0,
          stock: Number(row[13]) || 0,
          category: String(row[14] || '').trim(),
          type: String(row[14] || '').trim(),
          classification: String(row[14] || '').trim(),
          extra: row.slice(15)
        };
      }).filter(function (item) { return item.name && String(item.name).toLowerCase() !== 'item_name'; });
    }

    // Backward compatibility for the first-pass Shop Items sheet, if present locally.
    return rowsOnly.map(function (row) {
      return {
        id: String(row[0] || '').trim(),
        itemId: String(row[0] || '').replace(/^shop-/, '').trim(),
        name: String(row[1] || '').trim(),
        slug: String(row[2] || '').trim(),
        source: String(row[3] || '').trim(),
        type: String(row[4] || '').trim(),
        classification: String(row[5] || '').trim(),
        manufacturer: String(row[6] || '').trim(),
        imageUrl: String(row[7] || '').trim(),
        description: String(row[8] || '').trim(),
        enabled: parseBool(row[9], true),
        active: parseBool(row[9], true),
        sortOrder: Number(row[10]) || 0,
        notes: String(row[11] || '').trim(),
        priceGold: 0,
        priceSilver: 0,
        priceCopper: 0,
        stock: 0,
        category: String(row[4] || row[5] || '').trim()
      };
    }).filter(function (item) { return item.id && item.name && String(item.id).toLowerCase() !== 'item id'; });
  }


  function truthyFlag(value) {
    return /^(x|yes|true|1|y)$/i.test(String(value || '').trim());
  }

  function normalizePermissionKey(label) {
    return String(label || '')
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function parseAdminWhitelist(rows) {
    rows = Array.isArray(rows) ? rows : [];
    if (!rows.length) return [];
    var headerRowIndex = -1;
    var header = [];
    for (var r = 0; r < Math.min(rows.length, 8); r++) {
      var candidate = rows[r] || [];
      var normalized = candidate.map(normalizePermissionKey);
      if (normalized.indexOf('discord id') >= 0 && normalized.indexOf('full') >= 0) {
        headerRowIndex = r;
        header = candidate;
        break;
      }
    }
    if (headerRowIndex < 0) {
      headerRowIndex = 0;
      header = rows[0] || [];
    }
    var index = {};
    header.forEach(function (label, i) {
      var key = normalizePermissionKey(label);
      if (key) index[key] = i;
    });
    var defaults = {
      name: 0,
      discordId: index['discord id'] != null ? index['discord id'] : 1,
      full: index.full != null ? index.full : 2,
      roster: index.roster != null ? index.roster : 4,
      banners: index.banners != null ? index.banners : 5,
      fleet: index.fleet != null ? index.fleet : 6,
      shop: index.shop != null ? index.shop : 7,
      questReview: index['quest review'] != null ? index['quest review'] : 8,
      auditLog: index['audit log'] != null ? index['audit log'] : 9,
      pages: index.pages != null ? index.pages : 10,
      tavern: index.tavern != null ? index.tavern : 11
    };
    return rows.slice(headerRowIndex + 1).map(function (row) {
      row = Array.isArray(row) ? row : [];
      var item = {
        name: String(row[defaults.name] || '').trim(),
        discordId: String(row[defaults.discordId] || '').trim(),
        full: truthyFlag(row[defaults.full]),
        roster: truthyFlag(row[defaults.roster]),
        banners: truthyFlag(row[defaults.banners]),
        fleet: truthyFlag(row[defaults.fleet]),
        shop: truthyFlag(row[defaults.shop]),
        questReview: truthyFlag(row[defaults.questReview]),
        auditLog: truthyFlag(row[defaults.auditLog]),
        pages: truthyFlag(row[defaults.pages]),
        tavern: truthyFlag(row[defaults.tavern]),
        _row: row.slice(),
        _columns: defaults
      };
      return item;
    }).filter(function (item) { return item.discordId; });
  }

  function adminPermissionRow(item) {
    var existing = (_adminWhitelist || []).find(function (row) {
      return String(row.discordId) === String(item.discordId);
    });
    var cols = (existing && existing._columns) || {
      name: 0, discordId: 1, full: 2, roster: 4, banners: 5, fleet: 6, shop: 7,
      questReview: 8, auditLog: 9, pages: 10, tavern: 11
    };
    var source = existing && existing._row ? existing._row.slice() : [];
    var needed = Math.max(cols.name, cols.discordId, cols.full, cols.roster, cols.banners, cols.fleet, cols.shop, cols.questReview, cols.auditLog, cols.pages, cols.tavern);
    while (source.length <= needed) source.push('');
    source[cols.name] = existing ? existing.name : (item.name || '');
    source[cols.discordId] = existing ? existing.discordId : (item.discordId || '');
    // Full is intentionally preserved from the sheet/current row. The website must not edit it.
    source[cols.full] = existing && existing.full ? 'X' : (source[cols.full] || '');
    source[cols.roster] = item.roster ? 'X' : '';
    source[cols.banners] = item.banners ? 'X' : '';
    source[cols.fleet] = item.fleet ? 'X' : '';
    source[cols.shop] = item.shop ? 'X' : '';
    source[cols.questReview] = item.questReview ? 'X' : '';
    source[cols.auditLog] = item.auditLog ? 'X' : '';
    source[cols.pages] = item.pages ? 'X' : '';
    source[cols.tavern] = item.tavern ? 'X' : '';
    return source;
  }

  function getAdminWhitelist() { return _adminWhitelist.slice(); }

  async function loadAdminPermissions() {
    const data = await _apiGet('/admin/permissions');
    _adminWhitelist = (data.permissions || []).map(function (row) {
      return Object.assign({
        name: '', discordId: '', full: false, roster: false, banners: false, fleet: false,
        shop: false, questReview: false, auditLog: false, pages: false, tavern: false
      }, row || {});
    }).filter(function (row) { return row.discordId; });
    return _adminWhitelist.slice();
  }

  async function loadCurrentAdminSession() {
    return _apiGet('/admin/me');
  }

  function parseRanks(rows) {
    if (!rows || !rows.length) return [];
    // Current OFS Ranks sheet: use only A2:A13 for the Shop Min Role dropdown.
    return rows.slice(1, 13).map(function (row) {
      return String((row && row[0]) || '').trim();
    }).filter(function (rank) {
      return rank && rank.toLowerCase() !== 'rank';
    });
  }

  function parseShopPayRules(rows) {
    if (!rows || !rows.length) return [];
    const first = rows[0] || [];
    const norm = function (v) { return String(v || '').trim().toLowerCase().replace(/[\s-]+/g, '_'); };
    const hasCurrencyRulesHeader = norm(first[0]) === 'rule_id' || first.map(norm).indexOf('stat_column') !== -1;
    const hasLegacyHeader = String(first[0] || '').trim().toLowerCase() === 'rule id' ||
                            String(first[1] || '').trim().toLowerCase() === 'rule name';
    const rowsOnly = rows.slice((hasCurrencyRulesHeader || hasLegacyHeader) ? 1 : 0);

    // Current OFS bot source-of-truth sheet: currency_rules
    // Rule_ID | Stat_Column | Snapshot_Column | Currency_Type | Amount_Per_Unit | Min_Role | Enabled | Notes
    if (hasCurrencyRulesHeader) {
      return rowsOnly.map(function (row) {
        return {
          id: String(row[0] || '').trim(),
          ruleId: String(row[0] || '').trim(),
          statColumn: String(row[1] || '').trim(),
          snapshotColumn: String(row[2] || '').trim(),
          currencyType: String(row[3] || '').trim(),
          amountPerUnit: Number(row[4]) || 0,
          minRole: String(row[5] || '').trim(),
          enabled: parseBool(row[6], true),
          notes: String(row[7] || '').trim()
        };
      }).filter(function (rule) {
        const id = String(rule.ruleId || rule.id || '').toLowerCase();
        return id && id !== 'rule_id' && id !== 'instructions';
      });
    }

    // Backward compatibility for the first-pass Shop Pay Rules sheet, if present locally.
    return rowsOnly.map(function (row) {
      return {
        id: String(row[0] || '').trim(),
        ruleId: String(row[0] || '').trim(),
        statColumn: String(row[2] || '').trim(),
        snapshotColumn: '',
        currencyType: String(row[2] || '').trim(),
        amountPerUnit: Number(row[3]) || Number(row[4]) || Number(row[5]) || 0,
        minRole: String(row[6] || '').trim(),
        enabled: parseBool(row[7], true),
        notes: String(row[9] || '').trim()
      };
    }).filter(function (rule) { return rule.id && String(rule.id).toLowerCase() !== 'rule id'; });
  }

  function getShipRegistry() { return _shipRegistry || []; }
  function getFleets() { return _fleets || []; }
  function getFleetStructure() { return _fleetStructure || []; }
  function getShopItems() { return _shopItems || []; }
  function getShopPayRules() { return _shopPayRules || []; }
  function getRanks() { return _ranks || []; }

  function friendlySheetMessage(message) {
    const raw = String(message || 'Live sheet refresh failed');
    if (/429|quota|rate.?limit|read requests/i.test(raw)) {
      return 'OFS records are temporarily busy. Showing last known data where available.';
    }
    if (/network|fetch|failed/i.test(raw)) {
      return 'OFS records could not be refreshed. Showing last known data where available.';
    }
    return raw;
  }

  function _fallbackToCache(message) {
    const friendlyMessage = friendlySheetMessage(message);
    const cachedRef = loadReferenceDataCache();
    const cachedTavern = loadTavernDataCache();
    const cached = loadCache({ allowStale: true });
    if (cachedRef) {
      applyReferenceData(cachedRef.data);
    }
    if (cachedTavern) {
      _tavernData = cachedTavern.data;
    }
    _lastLoadInfo = {
      source: cached || cachedTavern || cachedRef ? 'cache-stale' : 'empty-cache',
      ts: Math.max(
        cached ? (cached.ts || 0) : 0,
        cachedTavern ? (cachedTavern.ts || 0) : 0,
        cachedRef ? (cachedRef.ts || 0) : 0
      ),
      message: friendlyMessage,
      rawMessage: String(message || '')
    };

    if (cached && global.OFSData) global.OFSData.savePlayers(cached.players);
    return cached ? cached.players : [];
  }

  /* ── Write helper ────────────────────────────────────
   * POSTs JSON to the Worker and throws on network errors, non-2xx
   * responses, or responses that come back with {ok:false}. Every write
   * path goes through here so callers' try/catch actually fires on
   * server-side failures (not just network drops). */
  function getSessionToken() {
    let raw = null;
    try { raw = global.localStorage && global.localStorage.getItem('ofs_discord_session'); } catch (e) { raw = null; }
    if (!raw) {
      try { raw = global.sessionStorage && global.sessionStorage.getItem('ofs_discord_session'); } catch (e) { raw = null; }
    }
    try {
      const session = raw ? JSON.parse(raw) : null;
      return session && session.token ? String(session.token) : '';
    } catch (e) { return ''; }
  }

  function authHeaders(extra) {
    const headers = Object.assign({}, extra || {});
    const token = getSessionToken();
    if (token) headers.Authorization = 'Bearer ' + token;
    return headers;
  }

  async function _apiGet(path) {
    const res = await fetch(WORKER_URL + path, {
      method: 'GET',
      headers: authHeaders({ 'Accept': 'application/json' })
    });
    let data = null;
    try { data = await res.json(); } catch (e) { data = null; }
    if (!res.ok) throw new Error((data && (data.error || data.reason)) || ('Server ' + res.status));
    if (!data || !data.ok) throw new Error((data && (data.error || data.reason)) || 'Request rejected');
    return data;
  }

  async function _apiPost(path, body) {
    const res = await fetch(WORKER_URL + path, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    });
    let data = null;
    try { data = await res.json(); } catch (e) { data = null; }
    if (!res.ok) throw new Error((data && (data.error || data.reason)) || ('Server ' + res.status));
    if (!data || !data.ok) throw new Error((data && (data.error || data.reason)) || 'Write rejected');
    return data;
  }

  /**
   * Append a stat-adjustment row to Patrols_User_Adjustments.
   * @param {string} userId
   * @param {object} deltas  — keys matching player.stats fields, values are +/- numbers
   * @param {string} reason
   * @param {string} adminId
   */
  async function appendStatAdjustment(userId, deltas, reason, adminId) {
    const now = new Date().toISOString();
    const deltaStr = Object.entries(deltas)
      .filter(function (kv) { return kv[1] !== 0; })
      .map(function (kv) { return kv[0] + ' ' + (kv[1] > 0 ? '+' : '') + kv[1]; })
      .join(', ');

    const row = [
      userId,
      deltas.PatrolCount            || 0,
      deltas.TotalLength            || 0,
      deltas.FPS_Kills_Total        || 0,
      deltas.Ship_Kills_Total       || 0,
      deltas.Crusades_Total         || 0,
      deltas.Turret_Kills_Total     || 0,
      deltas.Quest_Total            || 0,
      deltas.Led_Completed_Quests   || 0,
      deltas.Led_Completed_Crusades || 0,
      deltaStr,
      reason  || '',
      adminId || '',
      now
    ];

    return _apiPost('/write', { op: 'append', sheet: 'Patrols_User_Adjustments', row: row });
  }

  /**
   * Update or create a player's wallet in the Bank sheet.
   * Existing users are updated by User ID; missing users get a new Bank row.
   * @param {string} userId
   * @param {{ gold: number, silver: number, copper: number }} wallet
   */
  async function updateWallet(userId, wallet) {
    return _apiPost('/write', {
      op: 'upsert',
      sheet: 'Bank',
      keyCol: 0,
      keyVal: String(userId),
      data: { Gold: wallet.gold, Silver: wallet.silver, Copper: wallet.copper }
    });
  }

  /**
   * Append a bank transaction log entry to "The bank (logs)".
   * @param {string} userId
   * @param {number} gold
   * @param {number} silver
   * @param {number} copper
   * @param {string} action   e.g. 'COLLECT_PAY' | 'MANUAL_ADJUST'
   * @param {object} balanceAfter  { gold, silver, copper } after transaction
   * @param {string} source   e.g. 'admin_ui'
   */
  async function appendBankLog(userId, gold, silver, copper, action, balanceAfter, source) {
    const now     = new Date().toISOString();
    const eventId = 'CP-' + userId + '-' + Math.floor(Date.now() / 1000);

    const row = [
      userId,
      now,
      eventId,
      action || 'MANUAL_ADJUST',
      gold   || 0,
      silver || 0,
      copper || 0,
      JSON.stringify(balanceAfter || {}),
      source || 'admin_ui'
    ];

    return _apiPost('/write', { op: 'append', sheet: 'The bank (logs)', row: row });
  }

  /**
   * Update (or create) the user's row in "Banners points per user".
   * @param {string} userId
   * @param {object} changedBanners  { "The Fang": 22, "The Guardian": 15 } — only changed banners
   */
  async function updateBannerPoints(userId, changedBanners) {
    return _apiPost('/write', {
      op:     'upsert',
      sheet:  'Banners points per user',
      keyCol: 0,
      keyVal: String(userId),
      data:   changedBanners
    });
  }

  /**
   * Update the "Medals" cell in Member Log for this user.
   * @param {string}   userId
   * @param {string[]} medalBanners  Array of banner names the user currently holds medals for.
   *                                  Pass [] to clear all medals.
   */
  async function updateMedals(userId, medalBanners) {
    return _apiPost('/write', {
      op:     'update',
      sheet:  'Member Log',
      keyCol: 0,
      keyVal: String(userId),
      data:   { Medals: medalBanners.join(',') }
    });
  }

  /**
   * Update self-editable public profile fields in Member Log.
   * Bio uses the existing "Back Story" column; Ship Image is derived from Ship Registry.
   * @param {string} userId
   * @param {{ backStory?: string, ship?: string, shipImage?: string }} profile
   */
  async function updateMemberProfile(userId, profile) {
    const safeProfile = profile || {};
    return _apiPost('/write', {
      op:     'update',
      sheet:  'Member Log',
      keyCol: 0,
      keyVal: String(userId),
      data:   {
        'Back Story': String(safeProfile.backStory || ''),
        'Ship':       String(safeProfile.ship || ''),
        'Ship Image': String(safeProfile.shipImage || '')
      }
    });
  }

  /* ── Patrols (quest) helpers ─────────────────────────
   * Patrols rows are keyed on the composite (Patrol ID + Player ID):
   *   - Participant row: playerId = that player's Discord ID
   *   - Leader metadata row: playerId = '' (empty string)
   * These call two Worker ops that don't exist in the generic /write
   * switch — they must be added server-side (see /docs for the handler).
   */

  /**
   * Update specific cells on a Patrols row identified by (Patrol ID, Player ID).
   * @param {string} patrolId
   * @param {string} playerId  — '' to target the leader metadata row
   * @param {object} data      — { ColumnHeader: value, … } using Patrols header names
   */
  async function updatePatrolRow(patrolId, playerId, data) {
    return _apiPost('/write', {
      op:       'updatePatrol',
      patrolId: String(patrolId),
      playerId: String(playerId || ''),
      data:     data
    });
  }

  /**
   * Delete a participant row from Patrols. Refuses empty playerId to avoid
   * deleting the leader metadata row.
   * @param {string} patrolId
   * @param {string} playerId  — must be non-empty
   */
  async function deletePatrolRow(patrolId, playerId) {
    if (!playerId) return Promise.reject(new Error('Cannot delete leader metadata row'));
    return _apiPost('/write', {
      op:       'deletePatrolRow',
      patrolId: String(patrolId),
      playerId: String(playerId)
    });
  }

  /**
   * Append a Banner points log row (audit trail applied on approve).
   * Schema: 19 columns, see quest-edit flow for field order.
   * @param {any[]} row  full 19-cell row array
   */
  async function appendBannerPointsLog(row) {
    return _apiPost('/write', { op: 'append', sheet: 'Banner points log', row: row });
  }

  /**
   * Overwrite (or append) a Tavern row in the sheet.
   * @param {string} sheetName  e.g. 'Tavern_Announcements'
   * @param {string} id         Value in column A (used to find existing row)
   * @param {any[]}  row        Full row array to write
   */
  async function overwriteTavernRow(sheetName, id, row) {
    return _apiPost('/write', { op: 'overwrite', sheet: sheetName, keyCol: 0, keyVal: id, row: row });
  }

  /**
   * Delete a Tavern row from the sheet by its ID.
   * @param {string} sheetName  e.g. 'Tavern_Announcements'
   * @param {string} id         Value in column A (used to find the row)
   */
  async function deleteTavernRow(sheetName, id) {
    return _apiPost('/write', { op: 'deleteRow', sheet: sheetName, keyCol: 0, keyVal: id });
  }

  /**
   * Save a banner definition to the Banners sheet.
   * @param {object} def  { name, subRank0, subRank1, subRank2, subRankMaster, medalName, medalUrl, description }
   * @param {boolean} isNew  true = append new row, false = overwrite existing by name
   */
  function bannerDefRow(def) {
    const legacyRow = [
      def.name, def.subRank0, def.subRank1, def.subRank2,
      def.subRankMaster, def.medalName, def.medalUrl, def.description, def.bannerImageUrl || ''
    ];
    // Default to appending Role ID at the far right so existing Banners columns
    // do not shift. If the live sheet has Role ID explicitly in column B, honor
    // that schema to avoid overwriting the wrong fields.
    if (_bannerRoleIdIndex === 1) {
      return [
        def.name, def.roleId || '', def.subRank0, def.subRank1, def.subRank2,
        def.subRankMaster, def.medalName, def.medalUrl, def.description, def.bannerImageUrl || ''
      ];
    }
    legacyRow[_bannerRoleIdIndex >= 0 ? _bannerRoleIdIndex : 9] = def.roleId || '';
    return legacyRow;
  }

  async function saveBannerDef(def, isNew, oldName) {
    const row = bannerDefRow(def);
    if (isNew) {
      return _apiPost('/write', { op: 'append', sheet: 'Banners', row: row });
    }
    return overwriteTavernRow('Banners', oldName || def.name, row);
  }

  async function updateMemberBanner(userId, bannerName, medalsValue) {
    const data = { Banner: String(bannerName || '') };
    if (medalsValue != null) data.Medals = String(medalsValue || '');
    return _apiPost('/write', {
      op:     'update',
      sheet:  'Member Log',
      keyCol: 0,
      keyVal: String(userId),
      data:   data
    });
  }

  async function appendBannerRenameRequest(row) {
    return _apiPost('/write', { op: 'append', sheet: 'Banner Rename Requests', row: row });
  }

  async function saveBannerRenameAlias(oldName, newName) {
    const oldKey = String(oldName || '').trim().toLowerCase();
    const next = String(newName || '').trim();
    if (!oldKey || !next) return { ok: true, skipped: true };
    const aliases = Object.assign({}, _bannerAliases || {});
    aliases[oldKey] = next;
    _bannerAliases = aliases;
    saveBannerAliasesCache(aliases);
    return _apiPost('/content', { key: 'banner_rename_aliases', value: aliases });
  }

  /** Delete a banner row from the Banners sheet by name. */
  async function deleteBannerDef(name) {
    return deleteTavernRow('Banners', name);
  }

  function fleetAssignmentRow(item) {
    return [
      item.id, item.fleetName, item.userId, item.username, item.house, item.banner,
      item.shipModel, item.shipMake, item.shipImageUrl, item.role, item.sortOrder || 0, item.notes || '',
      item.active === false ? 'FALSE' : 'TRUE',
      item.fighterCap || 0, item.medEvacCap || 0, item.commandCap || 0, item.supportCap || 0
    ];
  }

  function saveFleetAssignment(item) {
    return _apiPost('/write', { op: 'overwrite', sheet: 'Fleets', keyCol: 0, keyVal: item.id, row: fleetAssignmentRow(item) });
  }

  function shipRegistryRow(ship) {
    return [
      ship.model || '',
      ship.make || '',
      ship.imageUrl || '',
      ship.verified || '',
      ship.wikiUrl || '',
      ship.role || '',
      ship.category || '',
      ship.size || '',
      ship.crew || '',
      ship.status || '',
      ship.description || ''
    ];
  }

  function saveShipRegistryShip(ship, oldModel) {
    return _apiPost('/write', { op: 'overwrite', sheet: 'Ship Registry', keyCol: 0, keyVal: oldModel || ship.model, row: shipRegistryRow(ship) });
  }

  function deleteShipRegistryShip(model) {
    return _apiPost('/write', { op: 'deleteRow', sheet: 'Ship Registry', keyCol: 0, keyVal: model });
  }

  async function saveFleetAssignments(items) {
    for (const item of (items || [])) await saveFleetAssignment(item);
    return { ok: true };
  }

  function deleteFleetAssignment(id) {
    return _apiPost('/write', { op: 'deleteRow', sheet: 'Fleets', keyCol: 0, keyVal: id });
  }

  async function deleteFleetByName(name) {
    name = String(name || '').trim();
    if (!name) return { ok: false, reason: 'Missing fleet name' };
    const assignments = _fleets.filter(function (row) { return String(row.fleetName || '') === name; });
    const structureRows = _fleetStructure.filter(function (row) { return String(row.fleetName || '') === name; });
    for (const row of assignments) {
      if (row.id) await _apiPost('/write', { op: 'deleteRow', sheet: 'Fleets', keyCol: 0, keyVal: row.id });
    }
    for (let i = 0; i < structureRows.length; i++) {
      await _apiPost('/write', { op: 'deleteRow', sheet: 'Fleet Structure', keyCol: 0, keyVal: name });
    }
    _fleets = _fleets.filter(function (row) { return String(row.fleetName || '') !== name; });
    _fleetStructure = _fleetStructure.filter(function (row) { return String(row.fleetName || '') !== name; });
    return { ok: true, assignmentsDeleted: assignments.length, structureDeleted: structureRows.length };
  }

  function fleetStructureRow(item) {
    return [
      item.fleetName || '', item.section || '', item.slotLabel || '',
      item.userId || '', item.username || '', item.title || '',
      item.house || '', item.banner || '', item.sortOrder || 0,
      item.active === false ? 'FALSE' : 'TRUE', item.notes || ''
    ];
  }

  function fleetStructureWriteKey(item) {
    return [item.fleetName || '', item.section || '', item.slotLabel || ''].join('|');
  }

  function saveFleetStructureSlot(item) {
    return _apiPost('/write', { op: 'overwrite', sheet: 'Fleet Structure', keyCol: 2, keyVal: item.slotLabel, row: fleetStructureRow(item), match: { fleetName: item.fleetName || '', section: item.section || '', slotLabel: item.slotLabel || '' } });
  }

  function saveFleetStructureRows(items) {
    const rows = (items || []).map(function (item) { return { key: fleetStructureWriteKey(item), match: { fleetName: item.fleetName || '', section: item.section || '', slotLabel: item.slotLabel || '' }, row: fleetStructureRow(item) }; });
    return _apiPost('/admin/fleet-structure', { rows: rows });
  }

  function deleteFleetStructureSlot(slotLabel) {
    return _apiPost('/write', { op: 'deleteRow', sheet: 'Fleet Structure', keyCol: 2, keyVal: slotLabel });
  }

  function shopItemRow(item) {
    const itemId = item.itemId || item.id || '';
    const row = [
      item.name || '',
      item.imageUrl || '',
      item.rollBuyInAmount || '',
      item.canAuction || '',
      item.tradeable || '',
      item.marketValue || '',
      itemId,
      item.enabled === false || item.active === false ? 'N' : 'Y',
      item.notes || '',
      item.description || '',
      item.priceGold || 0,
      item.priceSilver || 0,
      item.priceCopper || 0,
      item.stock || 0,
      item.category || item.type || item.classification || ''
    ];
    return row.concat(item.extra || []);
  }

  function saveShopItem(item) {
    const itemId = item.itemId || item.id;
    return _apiPost('/write', { op: 'overwrite', sheet: 'Item List', keyCol: 6, keyVal: itemId, row: shopItemRow(item) });
  }

  function deleteShopItem(id) {
    return _apiPost('/write', { op: 'deleteRow', sheet: 'Item List', keyCol: 6, keyVal: id });
  }

  function shopPayRuleRow(rule) {
    return [
      rule.ruleId || rule.id,
      rule.statColumn || '',
      rule.snapshotColumn || '',
      rule.currencyType || '',
      rule.amountPerUnit || 0,
      rule.minRole || '',
      rule.enabled === false ? 'FALSE' : 'TRUE',
      rule.notes || ''
    ];
  }

  function saveShopPayRule(rule) {
    const ruleId = rule.ruleId || rule.id;
    return _apiPost('/write', { op: 'overwrite', sheet: 'currency_rules', keyCol: 0, keyVal: ruleId, row: shopPayRuleRow(rule) });
  }

  function deleteShopPayRule(id) {
    return _apiPost('/write', { op: 'deleteRow', sheet: 'currency_rules', keyCol: 0, keyVal: id });
  }

  function saveAdminPermissions(item) {
    return _apiPost('/admin/permissions', {
      discordId: String(item.discordId || ''),
      permissions: {
        roster: !!item.roster,
        banners: !!item.banners,
        fleet: !!item.fleet,
        shop: !!item.shop,
        questReview: !!item.questReview,
        auditLog: !!item.auditLog,
        pages: !!item.pages,
        tavern: !!item.tavern
      }
    });
  }

  /** Return the cached timeline block overrides keyed by original block title/id. */
  function getTimelineBlocks() {
    return _timelineBlocks;
  }

  /**
   * Persist a timeline block edit to the /content store.
   * Key: "tl-block:<blockId>", Value: block data object.
   * Also updates the local cache.
   */
  async function saveTimelineBlock(blockId, data) {
    _timelineBlocks[blockId] = data;
    return _apiPost('/content', { key: 'tl-block:' + blockId, value: data });
  }

  global.OFSSheets = {
    load,
    getTavernData,
    getLoadInfo,
    getShipRegistry,
    getFleets,
    getFleetStructure,
    getShopItems,
    getShopPayRules,
    getRanks,
    getAdminWhitelist,
    loadAdminPermissions,
    loadCurrentAdminSession,
    getBannerDefs,
    getBannerAliases,
    resolveBannerName,
    saveBannerDef,
    deleteBannerDef,
    updateMemberBanner,
    appendBannerRenameRequest,
    saveBannerRenameAlias,
    saveFleetAssignment,
    saveShipRegistryShip,
    deleteShipRegistryShip,
    saveFleetAssignments,
    deleteFleetAssignment,
    deleteFleetByName,
    saveFleetStructureSlot,
    saveFleetStructureRows,
    deleteFleetStructureSlot,
    saveShopItem,
    deleteShopItem,
    saveShopPayRule,
    deleteShopPayRule,
    saveAdminPermissions,
    appendStatAdjustment,
    updateWallet,
    appendBankLog,
    updateBannerPoints,
    updateMedals,
    updateMemberProfile,
    updatePatrolRow,
    deletePatrolRow,
    appendBannerPointsLog,
    overwriteTavernRow,
    deleteTavernRow,
    getTimelineBlocks,
    saveTimelineBlock,
    WORKER_URL
  };

}(window));
