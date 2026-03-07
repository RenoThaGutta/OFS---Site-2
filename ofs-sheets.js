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

  const WORKER_URL   = 'https://ofs-api.orderofthefallenstar.workers.dev';
  const CACHE_KEY    = 'ofs_sheets_cache';
  const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

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
    // T (19): "Ship Image"     — not imported
    // U (20): "Verified"       — not imported
    // V (21): "RSI User Name"  — not imported
    // W-AB (22-27): quest tracking — not imported
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

    // Build player list from Member Log rows
    const players = [];
    for (const row of data.memberLog.slice(1)) {
      const uid = cell(row, ML.USER_ID).trim();
      if (!uid) continue;
      const rank = cell(row, ML.RANK).trim();
      if (!rank) continue; // skip bots and unranked users

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
        avatarUrl:     cell(row, ML.PROFILE_PIC),
        ship:          cell(row, ML.SHIP),
        activeBanner:  cell(row, ML.BANNER),
        reputationXP:  num(row, ML.REPUTATION_XP),
        stats: {
          PatrolCount:            num(patrolRow, PT.PATROL_COUNT),
          TotalLength:            num(patrolRow, PT.TOTAL_LENGTH),
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

  /* ── Banner definitions cache (in-memory) ─────────── */
  let _bannerDefs = [];

  function parseBannerDefs(rows) {
    if (!rows || rows.length < 3) return [];
    return rows.slice(2)
      .map(function (row) { return String(row[0] || '').trim(); })
      .filter(Boolean)
      .map(function (_, i) {
        var row = rows[i + 2];
        return {
          name:          String(row[0] || '').trim(),
          subRank0:      String(row[1] || '').trim() || 'Apprentice',
          subRank1:      String(row[2] || '').trim() || 'Sub Rank 1',
          subRank2:      String(row[3] || '').trim() || 'Sub Rank 2',
          subRankMaster: String(row[4] || '').trim() || 'Sub Rank Master',
          medalName:       String(row[5] || '').trim(),
          medalUrl:        String(row[6] || '').trim(),
          description:     String(row[7] || '').trim(),
          bannerImageUrl:  String(row[8] || '').trim(),
        };
      });
  }

  function getBannerDefs() { return _bannerDefs; }

  /* ── Tavern data cache (in-memory, set on each load) ─ */
  let _tavernData = null;

  /* ── Cache ───────────────────────────────────────── */
  function saveCache(players) {
    try {
      global.localStorage.setItem(CACHE_KEY, JSON.stringify({
        ts: Date.now(),
        players: players
      }));
    } catch (e) { /* storage full */ }
  }

  function loadCache() {
    try {
      const raw = global.localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || !Array.isArray(obj.players)) return null;
      if (Date.now() - obj.ts > CACHE_TTL_MS) return null;
      return obj.players;
    } catch (e) {
      return null;
    }
  }

  /* ── Public API ──────────────────────────────────── */

  /**
   * Fetch all sheets, merge, normalize, cache.
   * Falls back to cached data on network error.
   * @returns {Promise<object[]>} Normalized player array.
   */
  async function load() {
    let data;
    try {
      const res = await fetch(WORKER_URL + '/data');
      if (!res.ok) throw new Error('Worker /data ' + res.status);
      data = await res.json();
    } catch (err) {
      console.warn('OFSSheets: fetch failed, using cache.', err.message);
      return _fallbackToCache();
    }

    if (!data.ok) {
      console.warn('OFSSheets: Worker error:', data);
      return _fallbackToCache();
    }

    const raw = buildPlayers(data);
    if (!raw) {
      console.warn('OFSSheets: Member Log is empty.');
      return _fallbackToCache();
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
    }

    // Cache tavern data for OFS_TavernHall.html to consume
    _tavernData = {
      quests:           data.quests           || [],
      tavAnnouncements: data.tavAnnouncements || [],
      tavEvents:        data.tavEvents        || [],
      tavMedia:         data.tavMedia         || [],
    };

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
    return _tavernData;
  }

  function _fallbackToCache() {
    const cached = loadCache();
    if (cached && global.OFSData) global.OFSData.savePlayers(cached);
    return cached || [];
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

    const res = await fetch(WORKER_URL + '/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op: 'append', sheet: 'Patrols_User_Adjustments', row: row })
    });
    return res.json();
  }

  /**
   * Update a player's wallet in the Bank sheet (find-and-update).
   * @param {string} userId
   * @param {{ gold: number, silver: number, copper: number }} wallet
   */
  async function updateWallet(userId, wallet) {
    const res = await fetch(WORKER_URL + '/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        op: 'update',
        sheet: 'Bank',
        keyCol: 0,
        keyVal: String(userId),
        data: { Gold: wallet.gold, Silver: wallet.silver, Copper: wallet.copper }
      })
    });
    return res.json();
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

    const res = await fetch(WORKER_URL + '/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op: 'append', sheet: 'The bank (logs)', row: row })
    });
    return res.json();
  }

  /**
   * Update (or create) the user's row in "Banners points per user".
   * @param {string} userId
   * @param {object} changedBanners  { "The Fang": 22, "The Guardian": 15 } — only changed banners
   */
  async function updateBannerPoints(userId, changedBanners) {
    const res = await fetch(WORKER_URL + '/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        op:     'upsert',
        sheet:  'Banners points per user',
        keyCol: 0,
        keyVal: String(userId),
        data:   changedBanners
      })
    });
    return res.json();
  }

  /**
   * Update the "Medals" cell in Member Log for this user.
   * @param {string}   userId
   * @param {string[]} medalBanners  Array of banner names the user currently holds medals for.
   *                                  Pass [] to clear all medals.
   */
  async function updateMedals(userId, medalBanners) {
    const res = await fetch(WORKER_URL + '/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        op:     'update',
        sheet:  'Member Log',
        keyCol: 0,
        keyVal: String(userId),
        data:   { Medals: medalBanners.join(',') }
      })
    });
    return res.json();
  }

  /**
   * Overwrite (or append) a Tavern row in the sheet.
   * @param {string} sheetName  e.g. 'Tavern_Announcements'
   * @param {string} id         Value in column A (used to find existing row)
   * @param {any[]}  row        Full row array to write
   */
  async function overwriteTavernRow(sheetName, id, row) {
    const res = await fetch(WORKER_URL + '/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op: 'overwrite', sheet: sheetName, keyCol: 0, keyVal: id, row }),
    });
    return res.json();
  }

  /**
   * Delete a Tavern row from the sheet by its ID.
   * @param {string} sheetName  e.g. 'Tavern_Announcements'
   * @param {string} id         Value in column A (used to find the row)
   */
  async function deleteTavernRow(sheetName, id) {
    const res = await fetch(WORKER_URL + '/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op: 'deleteRow', sheet: sheetName, keyCol: 0, keyVal: id }),
    });
    return res.json();
  }

  /**
   * Save a banner definition to the Banners sheet.
   * @param {object} def  { name, subRank0, subRank1, subRank2, subRankMaster, medalName, medalUrl, description }
   * @param {boolean} isNew  true = append new row, false = overwrite existing by name
   */
  async function saveBannerDef(def, isNew) {
    const row = [
      def.name, def.subRank0, def.subRank1, def.subRank2,
      def.subRankMaster, def.medalName, def.medalUrl, def.description, def.bannerImageUrl || ''
    ];
    if (isNew) {
      const res = await fetch(WORKER_URL + '/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'append', sheet: 'Banners', row }),
      });
      return res.json();
    }
    return overwriteTavernRow('Banners', def.name, row);
  }

  /** Delete a banner row from the Banners sheet by name. */
  async function deleteBannerDef(name) {
    return deleteTavernRow('Banners', name);
  }

  global.OFSSheets = {
    load,
    getTavernData,
    getBannerDefs,
    saveBannerDef,
    deleteBannerDef,
    appendStatAdjustment,
    updateWallet,
    appendBankLog,
    updateBannerPoints,
    updateMedals,
    overwriteTavernRow,
    deleteTavernRow,
    WORKER_URL
  };

}(window));
