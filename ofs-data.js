(function (global) {
  const STORAGE_PLAYERS = 'ofs_players_data';

  const BANNER_NAMES = [
    'The Artificer',
    'The Astraeus',
    'The Engineer',
    'The Explorer',
    'The Fang',
    'The Forager',
    'The Guardian',
    'The Healer',
    'The Merchant',
    'The Privateer',
    'The Talon'
  ];

  const ORG_RANKS = [
    'Serf',
    'Commoner',
    'Page',
    'Squire',
    'Knight',
    'Templar',
    'Praetorian',
    'Commander',
    'Lord',
    'Lord Commander',
    'Chapter Master',
    'Primarch of Conquest',
    'Primarch of Harmony',
    'Primarch of Justice'
  ];

  const STAT_LABELS = {
    PatrolCount: 'Patrols',
    TotalLength: 'Total Patrol Length',
    FPS_Kills_Total: 'FPS Kills',
    Ship_Kills_Total: 'Ship Kills',
    Crusades_Total: 'Crusades',
    Turret_Kills_Total: 'Turret Kills',
    Quest_Total: 'Quests Completed',
    Led_Completed_Quests: 'Quests Led',
    Led_Completed_Crusades: 'Crusades Led'
  };

  const BANNER_RANKS = {
    'The Artificer': ['Apprentice', 'Tinkerer', 'Artisan', 'Craftsman'],
    'The Astraeus': ['Apprentice', 'Helion', 'Archon', 'Strategos'],
    'The Engineer': ['Apprentice', 'Technician', 'Fabricator', 'Mechanic'],
    'The Explorer': ['Apprentice', 'Seeker', 'Wayfarer', 'Pathfinder'],
    'The Fang': ['Apprentice', 'Hound', 'Stalker', 'Wolf'],
    'The Forager': ['Apprentice', 'Scavenger', 'Harvester', 'Prospector'],
    'The Guardian': ['Apprentice', 'Vanguard', 'Bulwark', 'Sentinel'],
    'The Healer': ['Apprentice', 'Apothecary', 'Physician', 'Chirurgeon'],
    'The Merchant': ['Apprentice', 'Provisioner', 'Steward', 'Quartermaster'],
    'The Privateer': ['Apprentice', 'Wayman', 'Freeblade', 'Marauder'],
    'The Talon': ['Apprentice', 'Sparrow', 'Falcon', 'Raven']
  };

  const MEDAL_IMGS = {
    'The Astraeus': 'Medals/The Astraeus - Medal.png',
    'The Explorer': 'Medals/The Explorer - Medal.png',
    'The Fang': 'Medals/The Fang - Medal.png',
    'The Guardian': 'Medals/The Gaurdian - Medal.png',
    'The Healer': 'Medals/The Healer - Medal.png',
    'The Merchant': 'Medals/The Merchant - Medal.png'
  };

  const XP_PER_QUEST = 100;
  const XP_PER_CRUSADE = 300;
  const MAX_LEVEL = 100;
  const XP_MIN = 100;
  const XP_MAX = 1000000;
  const LEVEL_XP = Array.from({ length: MAX_LEVEL }, function (_, index) {
    if (index === 0) {
      return XP_MIN;
    }
    return Math.floor(XP_MIN * Math.pow(XP_MAX / XP_MIN, index / (MAX_LEVEL - 1)));
  });

  const DEFAULT_PLAYERS = [
    {
      id: '1',
      username: 'Vanderan',
      rank: 'Primarch of Conquest',
      faction: 'Iron Reavers',
      activeBanner: 'The Fang',
      stats: {
        PatrolCount: 47,
        TotalLength: 312,
        FPS_Kills_Total: 1840,
        Ship_Kills_Total: 623,
        Crusades_Total: 18,
        Turret_Kills_Total: 294,
        Quest_Total: 112,
        Led_Completed_Quests: 56,
        Led_Completed_Crusades: 12
      },
      banners: {
        'The Artificer': { p: 8, m: false },
        'The Astraeus': { p: 22, m: true },
        'The Engineer': { p: 15, m: false },
        'The Explorer': { p: 38, m: true },
        'The Fang': { p: 67, m: true },
        'The Forager': { p: 12, m: false },
        'The Guardian': { p: 30, m: false },
        'The Healer': { p: 19, m: true },
        'The Merchant': { p: 60, m: true },
        'The Privateer': { p: 5, m: false },
        'The Talon': { p: 44, m: false }
      },
      wallet: { gold: 12, silver: 34, copper: 88 },
      avatarUrl: ''
    },
    {
      id: '2',
      username: 'Kraz',
      rank: 'Primarch of Harmony',
      faction: 'Iron Reavers',
      activeBanner: 'The Merchant',
      stats: {
        PatrolCount: 38,
        TotalLength: 244,
        FPS_Kills_Total: 920,
        Ship_Kills_Total: 411,
        Crusades_Total: 15,
        Turret_Kills_Total: 180,
        Quest_Total: 94,
        Led_Completed_Quests: 44,
        Led_Completed_Crusades: 10
      },
      banners: {
        'The Artificer': { p: 5, m: false },
        'The Astraeus': { p: 14, m: false },
        'The Engineer': { p: 20, m: false },
        'The Explorer': { p: 28, m: true },
        'The Fang': { p: 31, m: true },
        'The Forager': { p: 9, m: false },
        'The Guardian': { p: 22, m: false },
        'The Healer': { p: 11, m: false },
        'The Merchant': { p: 55, m: true },
        'The Privateer': { p: 3, m: false },
        'The Talon': { p: 19, m: false }
      },
      wallet: { gold: 8, silver: 60, copper: 22 },
      avatarUrl: ''
    },
    {
      id: '3',
      username: 'U-Gen-X',
      rank: 'Primarch of Justice',
      faction: 'Iron Reavers',
      activeBanner: 'The Guardian',
      stats: {
        PatrolCount: 52,
        TotalLength: 390,
        FPS_Kills_Total: 2100,
        Ship_Kills_Total: 780,
        Crusades_Total: 22,
        Turret_Kills_Total: 410,
        Quest_Total: 130,
        Led_Completed_Quests: 68,
        Led_Completed_Crusades: 15
      },
      banners: {
        'The Artificer': { p: 3, m: false },
        'The Astraeus': { p: 18, m: true },
        'The Engineer': { p: 12, m: false },
        'The Explorer': { p: 45, m: true },
        'The Fang': { p: 72, m: true },
        'The Forager': { p: 6, m: false },
        'The Guardian': { p: 62, m: true },
        'The Healer': { p: 14, m: false },
        'The Merchant': { p: 40, m: false },
        'The Privateer': { p: 22, m: true },
        'The Talon': { p: 55, m: true }
      },
      wallet: { gold: 20, silver: 10, copper: 55 },
      avatarUrl: ''
    },
    {
      id: '4',
      username: 'Cerulean Nightshade',
      rank: 'Chapter Master',
      faction: 'Iron Reavers',
      activeBanner: 'The Talon',
      stats: {
        PatrolCount: 31,
        TotalLength: 210,
        FPS_Kills_Total: 1100,
        Ship_Kills_Total: 890,
        Crusades_Total: 14,
        Turret_Kills_Total: 220,
        Quest_Total: 78,
        Led_Completed_Quests: 32,
        Led_Completed_Crusades: 8
      },
      banners: {
        'The Artificer': { p: 7, m: false },
        'The Astraeus': { p: 30, m: true },
        'The Engineer': { p: 8, m: false },
        'The Explorer': { p: 22, m: false },
        'The Fang': { p: 48, m: true },
        'The Forager': { p: 4, m: false },
        'The Guardian': { p: 16, m: false },
        'The Healer': { p: 9, m: false },
        'The Merchant': { p: 24, m: false },
        'The Privateer': { p: 18, m: false },
        'The Talon': { p: 61, m: true }
      },
      wallet: { gold: 5, silver: 22, copper: 40 },
      avatarUrl: ''
    },
    {
      id: '5',
      username: 'CiberKing',
      rank: 'Knight',
      faction: 'Second Cohort',
      activeBanner: 'The Fang',
      stats: {
        PatrolCount: 14,
        TotalLength: 88,
        FPS_Kills_Total: 540,
        Ship_Kills_Total: 120,
        Crusades_Total: 6,
        Turret_Kills_Total: 60,
        Quest_Total: 34,
        Led_Completed_Quests: 8,
        Led_Completed_Crusades: 2
      },
      banners: {
        'The Artificer': { p: 2, m: false },
        'The Astraeus': { p: 4, m: false },
        'The Engineer': { p: 0, m: false },
        'The Explorer': { p: 8, m: false },
        'The Fang': { p: 28, m: false },
        'The Forager': { p: 1, m: false },
        'The Guardian': { p: 6, m: false },
        'The Healer': { p: 0, m: false },
        'The Merchant': { p: 3, m: false },
        'The Privateer': { p: 5, m: false },
        'The Talon': { p: 10, m: false }
      },
      wallet: { gold: 0, silver: 8, copper: 15 },
      avatarUrl: ''
    },
    {
      id: '6',
      username: 'Nukeman',
      rank: 'Knight',
      faction: 'Second Cohort',
      activeBanner: 'The Guardian',
      stats: {
        PatrolCount: 12,
        TotalLength: 0,
        FPS_Kills_Total: 19,
        Ship_Kills_Total: 5,
        Crusades_Total: 5,
        Turret_Kills_Total: 0,
        Quest_Total: 7,
        Led_Completed_Quests: 2,
        Led_Completed_Crusades: 1
      },
      banners: {
        'The Artificer': { p: 0, m: false },
        'The Astraeus': { p: 0, m: false },
        'The Engineer': { p: 0, m: false },
        'The Explorer': { p: 0, m: false },
        'The Fang': { p: 0, m: false },
        'The Forager': { p: 3, m: false },
        'The Guardian': { p: 11, m: false },
        'The Healer': { p: 0, m: false },
        'The Merchant': { p: 0, m: false },
        'The Privateer': { p: 0, m: false },
        'The Talon': { p: 0, m: false }
      },
      wallet: { gold: 0, silver: 0, copper: 0 },
      avatarUrl: ''
    },
    {
      id: '7',
      username: 'Lyria Voss',
      rank: 'Templar',
      faction: 'Arditi Cohort',
      activeBanner: 'The Healer',
      stats: {
        PatrolCount: 22,
        TotalLength: 160,
        FPS_Kills_Total: 310,
        Ship_Kills_Total: 88,
        Crusades_Total: 9,
        Turret_Kills_Total: 44,
        Quest_Total: 55,
        Led_Completed_Quests: 18,
        Led_Completed_Crusades: 4
      },
      banners: {
        'The Artificer': { p: 1, m: false },
        'The Astraeus': { p: 10, m: false },
        'The Engineer': { p: 5, m: false },
        'The Explorer': { p: 14, m: false },
        'The Fang': { p: 8, m: false },
        'The Forager': { p: 6, m: false },
        'The Guardian': { p: 20, m: false },
        'The Healer': { p: 42, m: true },
        'The Merchant': { p: 15, m: false },
        'The Privateer': { p: 2, m: false },
        'The Talon': { p: 7, m: false }
      },
      wallet: { gold: 2, silver: 14, copper: 30 },
      avatarUrl: ''
    },
    {
      id: '8',
      username: 'Rook Ashveil',
      rank: 'Squire',
      faction: 'Arditi Cohort',
      activeBanner: 'The Explorer',
      stats: {
        PatrolCount: 6,
        TotalLength: 42,
        FPS_Kills_Total: 88,
        Ship_Kills_Total: 22,
        Crusades_Total: 3,
        Turret_Kills_Total: 10,
        Quest_Total: 14,
        Led_Completed_Quests: 0,
        Led_Completed_Crusades: 0
      },
      banners: {
        'The Artificer': { p: 0, m: false },
        'The Astraeus': { p: 2, m: false },
        'The Engineer': { p: 0, m: false },
        'The Explorer': { p: 15, m: false },
        'The Fang': { p: 4, m: false },
        'The Forager': { p: 0, m: false },
        'The Guardian': { p: 3, m: false },
        'The Healer': { p: 1, m: false },
        'The Merchant': { p: 0, m: false },
        'The Privateer': { p: 0, m: false },
        'The Talon': { p: 5, m: false }
      },
      wallet: { gold: 0, silver: 2, copper: 8 },
      avatarUrl: ''
    }
  ];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeBannerData(value) {
    if (!value || typeof value !== 'object') {
      return { p: 0, m: false };
    }
    if (Object.prototype.hasOwnProperty.call(value, 'p') || Object.prototype.hasOwnProperty.call(value, 'm')) {
      return {
        p: Number(value.p) || 0,
        m: Boolean(value.m)
      };
    }
    return {
      p: Number(value.points) || 0,
      m: Boolean(value.medal)
    };
  }

  function normalizePlayer(player, index) {
    const source = player || {};
    const stats = source.stats || {};
    const wallet = source.wallet || {};
    const normalizedBanners = {};

    BANNER_NAMES.forEach(function (bannerName) {
      normalizedBanners[bannerName] = normalizeBannerData(source.banners && source.banners[bannerName]);
    });

    return {
      id: String(source.id || index + 1),
      username: String(source.username || 'Unknown'),
      rank: String(source.rank || 'Commoner'),
      rolePath: String(source.rolePath || ''),
      joinDate: String(source.joinDate || ''),
      timeInService: String(source.timeInService || ''),
      backStory: String(source.backStory || ''),
      ship: String(source.ship || ''),
      reputationXP: Number(source.reputationXP) || 0,
      faction: String(source.faction || 'Unassigned'),
      activeBanner: BANNER_NAMES.indexOf(source.activeBanner) >= 0 ? source.activeBanner : BANNER_NAMES[0],
      stats: {
        PatrolCount: Number(stats.PatrolCount) || 0,
        TotalLength: Number(stats.TotalLength) || 0,
        FPS_Kills_Total: Number(stats.FPS_Kills_Total) || 0,
        Ship_Kills_Total: Number(stats.Ship_Kills_Total) || 0,
        Crusades_Total: Number(stats.Crusades_Total) || 0,
        Turret_Kills_Total: Number(stats.Turret_Kills_Total) || 0,
        Quest_Total: Number(stats.Quest_Total) || 0,
        Led_Completed_Quests: Number(stats.Led_Completed_Quests) || 0,
        Led_Completed_Crusades: Number(stats.Led_Completed_Crusades) || 0
      },
      banners: normalizedBanners,
      wallet: {
        gold: Number(wallet.gold) || 0,
        silver: Number(wallet.silver) || 0,
        copper: Number(wallet.copper) || 0
      },
      avatarUrl: String(source.avatarUrl || '')
    };
  }

  function readStoredPlayers() {
    try {
      return JSON.parse(global.localStorage.getItem(STORAGE_PLAYERS) || 'null');
    } catch (error) {
      return null;
    }
  }

  function getPlayers() {
    const stored = readStoredPlayers();
    const source = Array.isArray(stored) && stored.length ? stored : DEFAULT_PLAYERS;
    return source.map(normalizePlayer);
  }

  function savePlayers(players) {
    const normalized = (Array.isArray(players) ? players : []).map(normalizePlayer);
    global.localStorage.setItem(STORAGE_PLAYERS, JSON.stringify(normalized));
    return clone(normalized);
  }

  function getPlayerById(id) {
    const target = id == null ? '' : String(id);
    return getPlayers().find(function (player) {
      return player.id === target;
    }) || null;
  }

  function totalBannerPts(player) {
    return Object.values(player.banners).reduce(function (sum, banner) {
      return sum + (Number(banner.p) || 0);
    }, 0);
  }

  function bannerRankIndex(bannerName, points, medal) {
    if (!BANNER_RANKS[bannerName]) {
      return 0;
    }
    if (points >= 60 && medal) {
      return 3;
    }
    if (points >= 30) {
      return 2;
    }
    if (points >= 15) {
      return 1;
    }
    return 0;
  }

  function bannerRankTitle(bannerName, points, medal) {
    const titles = BANNER_RANKS[bannerName];
    if (!titles) {
      return '';
    }
    return titles[bannerRankIndex(bannerName, points, medal)];
  }

  function progressInfo(points, medal) {
    if (points >= 60 && medal) {
      return { pct: 100, cur: 'Master', nxt: null, locked: false, maxed: true };
    }
    if (points >= 30) {
      if (!medal) {
        return { pct: 100, cur: points + ' pts', nxt: 'Medal required for Master', locked: true, maxed: false };
      }
      return {
        pct: Math.min(((points - 30) / 30) * 100, 100),
        cur: points + ' / 60 pts',
        nxt: '-> Master',
        locked: false,
        maxed: false
      };
    }
    if (points >= 15) {
      return {
        pct: ((points - 15) / 15) * 100,
        cur: points + ' / 30 pts',
        nxt: '-> Sub Rank 2',
        locked: false,
        maxed: false
      };
    }
    return {
      pct: (points / 15) * 100,
      cur: points + ' / 15 pts',
      nxt: '-> Sub Rank 1',
      locked: false,
      maxed: false
    };
  }

  function calcRep(quests, crusades) {
    const xp = (Number(quests) || 0) * XP_PER_QUEST + (Number(crusades) || 0) * XP_PER_CRUSADE;
    let level = 1;

    for (let index = 0; index < MAX_LEVEL; index += 1) {
      if (xp >= LEVEL_XP[index]) {
        level = index + 1;
      } else {
        break;
      }
    }

    level = Math.min(level, MAX_LEVEL);
    const isMax = level >= MAX_LEVEL;
    const floorXP = LEVEL_XP[level - 1];
    const ceilXP = isMax ? XP_MAX : LEVEL_XP[level];
    const pct = isMax ? 100 : ((xp - floorXP) / (ceilXP - floorXP)) * 100;
    const toNext = isMax ? 0 : ceilXP - xp;

    return {
      lvl: level,
      xp: xp,
      floorXP: floorXP,
      ceilXP: ceilXP,
      pct: Math.min(pct, 100),
      toNext: toNext,
      isMax: isMax
    };
  }

  function formatPatrolLength(value) {
    const hours = Number(value) || 0;
    return hours + 'h';
  }

  function sortRanks(ranks) {
    return ranks.slice().sort(function (left, right) {
      const leftIndex = ORG_RANKS.indexOf(left);
      const rightIndex = ORG_RANKS.indexOf(right);
      if (leftIndex === -1 && rightIndex === -1) {
        return left.localeCompare(right);
      }
      if (leftIndex === -1) {
        return 1;
      }
      if (rightIndex === -1) {
        return -1;
      }
      return leftIndex - rightIndex;
    });
  }

  global.OFSData = {
    STORAGE_PLAYERS: STORAGE_PLAYERS,
    BANNER_NAMES: BANNER_NAMES,
    ORG_RANKS: ORG_RANKS,
    STAT_LABELS: STAT_LABELS,
    BANNER_RANKS: BANNER_RANKS,
    MEDAL_IMGS: MEDAL_IMGS,
    XP_PER_QUEST: XP_PER_QUEST,
    XP_PER_CRUSADE: XP_PER_CRUSADE,
    MAX_LEVEL: MAX_LEVEL,
    LEVEL_XP: LEVEL_XP,
    DEFAULT_PLAYERS: clone(DEFAULT_PLAYERS),
    getPlayers: getPlayers,
    savePlayers: savePlayers,
    getPlayerById: getPlayerById,
    totalBannerPts: totalBannerPts,
    bannerRankIndex: bannerRankIndex,
    bannerRankTitle: bannerRankTitle,
    progressInfo: progressInfo,
    calcRep: calcRep,
    formatPatrolLength: formatPatrolLength,
    sortRanks: sortRanks
  };
})(window);
