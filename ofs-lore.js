(function (global) {
  'use strict';

  /* ── Worker URL ───────────────────────────────────────────── */
  var WORKER_URL = 'https://ofs-api.orderofthefallenstar.workers.dev';

  /* ── Home Chronicle ───────────────────────────────────────── */
  var STORAGE_HOME_CHRONICLE = 'ofs_home_chronicle';

  var DEFAULT_HOME_CHRONICLE = {
    tag: 'Chronicle V',
    title: 'The Chronicle of the Broken Mask',
    subtitle: 'Reignition of the War Against TGO — Sixth Age',
    segments: [
      {
        heading: 'Record of Transgression',
        body: 'War did not return by chance, nor by the hunger of conquest, but by transgression. In a season where blades were held at rest and watchfires burned low, the enemy chose deceit over honor. An agent of the Galactic Order moved in shadow and falsehood, donning the name and likeness of a sworn brother of the Order. Knight Ciberking — valued and proven — was impersonated as a tool of manipulation and mockery. This act was not ignorance. It was intent. To wear the name of a Knight is to challenge the Order itself.',
        quote: ''
      },
      {
        heading: 'The Response',
        body: 'The Primarch did not issue warning. No envoys were sent. No public outcry followed. The response was measured not in words, but in fire. The first strike fell above MicroTech, where former Captain Blacklung commanded a vessel bearing a full squad under TGO colors. The ship never made planetfall. Interdiction was swift. Weapons were unleashed with finality. Hulls ruptured. Atmosphere bled into void. The vessel burned until nothing remained but drifting wreckage and frozen silence. There were no survivors.',
        quote: ''
      },
      {
        heading: 'Proclamation of Renewed War',
        body: 'This action was not undertaken for vengeance, nor for spectacle. It was a message, delivered with absolute clarity:\n\nUntil the Galactic Order acknowledges its misstep, dismantles the falsehood it unleashed, and surrenders to terms of correction — the hunt will continue. Wherever their banners rise, they will be challenged. Wherever their ships are found, they will be tested. Wherever their agents walk, they will be watched.',
        quote: '"The Order of the Fallen Star does not tolerate deception. It does not forgive the theft of its names. And it does not forget."\n\n"The blade has been drawn again — not in rage, but in duty. And this war will not end until honor is restored or the enemy is rendered incapable of offense."'
      }
    ],
    decree: 'Thus is the Broken Mask entered into the Chronicle. Thus is the war reignited.'
  };

  function getHomeChronicle() {
    try {
      var stored = localStorage.getItem(STORAGE_HOME_CHRONICLE);
      if (stored) {
        var data = JSON.parse(stored);
        var def  = JSON.parse(JSON.stringify(DEFAULT_HOME_CHRONICLE));
        // Merge with defaults so missing fields don't crash renders
        return Object.assign(def, data);
      }
    } catch (e) {}
    return JSON.parse(JSON.stringify(DEFAULT_HOME_CHRONICLE));
  }

  function saveHomeChronicle(data) {
    localStorage.setItem(STORAGE_HOME_CHRONICLE, JSON.stringify(data));
    return fetch(WORKER_URL + '/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'home_chronicle', value: data })
    }).then(function (r) {
      if (!r.ok) throw new Error('Server ' + r.status);
      return r.json();
    }).then(function (res) {
      if (!res || !res.ok) throw new Error((res && res.error) || 'Save rejected');
      return res;
    });
  }

  /* ── Home Content (hero, about, triumvirate) ──────────────── */
  var STORAGE_HOME_CONTENT = 'ofs_home_content';

  var DEFAULT_HOME_CONTENT = {
    hero: {
      logo:     'ofs_logo.png',
      subtitle: 'Star Citizen Organization',
      title:    'Order of the\nFallen Star',
      motto:    '"From betrayal, we were forged.\nFrom the void, we struck.\nFrom the Fallen Star, we ascended."'
    },
    about: {
      body: 'The Order of the Fallen Star is a Star Citizen organization operating across the verse — disciplined, lore-driven, and built through conflict. What began as a breakaway force from The Galactic Order has grown into a sovereign war structure with its own code of law, ranked hierarchy, and earned legacy.\n\nWe are not defined by numbers. We are defined by resolve. Every member who stands under our banner chose to remain when departure was easier. Every rank was earned through documented action. Every chronicle in our record was written in fire and silence.\n\nWe operate through Quests and Crusades. We govern by the Codex of the Fallen Star. We are led by a Triumvirate of Primarchs — Conquest, Harmony, and Justice — who hold the Order to its founding purpose: to endure, to grow, and to ascend.\n\nThe Galactic Order has fallen. The Fallen Star remains.',
      pillars: [
        { title: 'Discipline',               text: 'Every action is logged. Every rank is earned. The Codex governs all members — without exception — because fairness demands accountability.' },
        { title: 'Lore-Driven Identity',      text: 'Our history is recorded in full. From the First War at Pyro\'s Heart to our homecoming at Nyx, every age and chronicle is preserved in the Codex of the Fallen Star.' },
        { title: 'Earned Unity',              text: 'Authority flows from contribution, not appointment. Eleven Banners serve members of every calling — fighter, medic, merchant, navigator — all under one star.' },
        { title: 'Purpose in the Sixth Age',  text: 'Having defeated and dissolved The Galactic Order, we no longer exist in opposition to an enemy. We exist as ourselves — expanding, building, and enduring.' }
      ]
    },
    aboutSection: {
      label:   'Who We Are',
      heading: 'Forged from the Void'
    },
    services: {
      label:        'What We Do',
      heading:      'Order of the Fallen Star',
      tagAbbr:      '(FALLSTR)',
      intro:        'The Order of the Fallen Star (OFS) is a structured mercenary and security organization operating across the Star Citizen universe. Our focus is providing reliable, organized operational support for individuals, corporations, and organizations requiring professional assistance in hostile or contested environments.\n\nOFS is built around coordinated fleet operations, disciplined command structure, and experienced pilots capable of operating across multiple mission profiles. Our members regularly conduct combat, escort, and security operations in both PvE and PvP environments, allowing us to respond effectively to a wide range of contract requirements.\n\nOur objective is simple: deliver dependable contract services while maintaining operational discipline and client trust.',
      cardsHeading: 'Services We Provide',
      cards: [
        { title: 'Security & Protection', items: 'Escort for cargo, mining, salvage, and transport operations\nFleet and capital ship security\nStation or location security during high-risk activities' },
        { title: 'Combat Operations',     items: 'Organized combat support against hostile players or NPC threats\nLarge-scale fleet engagements\nTactical strike operations' },
        { title: 'Operational Support',   items: 'Event security and protection during large player gatherings\nContracted force presence in contested areas\nStrategic fleet deployment and defensive operations' },
        { title: 'Specialized Contracts', items: 'Custom security operations tailored to client needs\nMulti-ship fleet deployments\nHigh-risk or high-value asset protection' }
      ],
      hire: {
        heading:        'Hiring OFS',
        desc:           'Contract requests and service listings can be submitted through the following platforms. All contracts are reviewed by OFS leadership to determine scope, feasibility, and operational requirements.',
        primaryLabel:   'Hire OFS — UEX Corp',
        primaryUrl:     'https://uexcorp.space/marketplace/orgs/@FALLSTR/',
        secondaryLabel: 'Service Listings — SC Market',
        secondaryUrl:   'https://sc-market.space/contractor/FALLSTR/services'
      },
      policies: [
        { title: 'Operational Standards',  body: 'OFS operates under a clear command structure to maintain efficiency and operational security. Once a contract begins, OFS leadership directs all operational execution. Clients may define objectives during setup; however, operational command remains with OFS during execution.' },
        { title: 'Client Confidentiality', body: 'OFS maintains strict confidentiality regarding its clients and contract details. We do not publicly disclose the identity of organizations or individuals who hire our services, nor do we share operational details of completed contracts.' },
        { title: 'Recruitment',            body: 'OFS is actively recruiting pilots, combat specialists, and crew members who value coordination, discipline, and organized fleet operations. Contact us through our RSI page or the service platforms listed above.', buttonLabel: 'Join Discord', buttonUrl: 'https://discord.gg/zqKtNTNFBR' }
      ],
      disclaimer: {
        title: 'Operational Conduct Disclaimer',
        body:  'The Order of the Fallen Star (OFS) operates strictly as a contract-based mercenary and security organization. All combat operations conducted by OFS are performed in response to client contracts, security obligations, or defensive fleet actions.\n\nIf you encounter OFS forces during an operation, our actions are not personal and are not directed at individuals outside the scope of a contract. Engagements occur solely because OFS has been hired to provide protection, enforce an objective, or operate within a contested area. OFS does not participate in harassment or targeted griefing.\n\nOur operations are conducted within the framework of Star Citizen\'s gameplay systems. We recognize that combat encounters may be frustrating for those involved; however, our members are acting in a professional capacity fulfilling a contracted obligation, and engagements should be viewed as part of normal gameplay rather than personal hostility.\n\nIn order to maintain operational security and protect our clients, OFS does not disclose the identity of individuals or organizations that hire our services, nor do we publicly discuss the details of contracts after they are completed.'
      }
    },
    triumvirate: [
      { domain: 'Primarch of Conquest', name: 'Vanderan',  role: 'Military Operations & War Command' },
      { domain: 'Primarch of Harmony',  name: 'Kraz',      role: 'Diplomacy, Unity & Internal Affairs' },
      { domain: 'Primarch of Justice',  name: 'U-Gen-X',   role: 'Order, Law & Enforcement' }
    ],
    trivSection: {
      label:   'Leadership',
      heading: 'The Triumvirate'
    },
    chronicleSection: {
      label:   'War Chronicle',
      heading: 'Latest Chronicle'
    },
    banners: {
      label:   'The Eleven Banners',
      heading: 'Paths of Service',
      intro:   'Banners are the operational and specialized sub-units of the Order. Each represents a distinct role, profession, or calling. Members align with the Banner that reflects their skills, playstyle, and purpose in service to the Fallen Star.',
      tiles: [
        { icon: '⚒',  name: 'The Artificer',  focus: 'Crafting, engineering & item creation' },
        { icon: '🌌', name: 'The Astraeus',   focus: 'Navigation, exploration & deep-space ops' },
        { icon: '⚙',  name: 'The Engineer',   focus: 'Ship & base maintenance, technical ops' },
        { icon: '🗺', name: 'The Explorer',   focus: 'Scouting, pathfinding & discovery' },
        { icon: '🐺', name: 'The Fang',       focus: 'Close-quarters combat & strike operations' },
        { icon: '⛏',  name: 'The Forager',    focus: 'Resource gathering, salvage & supply' },
        { icon: '🛡',  name: 'The Guardian',   focus: 'Defense, protection & escort duties' },
        { icon: '💊', name: 'The Healer',     focus: 'Medical support & crew recovery' },
        { icon: '📦', name: 'The Merchant',   focus: 'Trade, logistics & economic operations' },
        { icon: '⚔',  name: 'The Privateer',  focus: 'Bounty hunting, interdiction & privateering' },
        { icon: '🦅', name: 'The Talon',      focus: 'Air superiority, dogfighting & fighter ops' }
      ]
    },
    pages: {
      label:   'Navigate the Order',
      heading: 'Pages & Records',
      cards: [
        { icon: '📜', title: 'The Codex',      desc: 'Twelve articles of law. Sacred oaths. The governing doctrine of the Order — its authority, its discipline, and its doctrine of advancement.',             href: 'OFS_Codex.html' },
        { icon: '🏛',  title: 'Chronicles',     desc: 'Six ages of history. Five war chronicles. From the First War at Pyro\'s Heart to the homecoming at Nyx — the full record of the Fallen Star.',         href: 'OFS_Timeline.html' },
        { icon: '👥', title: 'Roster',         desc: 'Browse all active members of the Order. Filter by rank, banner, or chapter. View any player\'s full service record.',                                    href: 'OFS_Roster.html' },
        { icon: '📋', title: 'Player Sheet',   desc: 'Combat stats, banner ranks, medal display, reputation level, and wallet — the complete profile for every Knight of the Order.',                         href: 'OFS_PlayerSheet.html' }
      ]
    }
  };

  function mergeArr(saved, def) {
    // Use saved array only if it's non-empty; otherwise fall back to defaults
    return (saved && saved.length) ? saved : def;
  }

  function getHomeContent() {
    try {
      var stored = localStorage.getItem(STORAGE_HOME_CONTENT);
      if (stored) {
        var data = JSON.parse(stored);
        // Fresh defaults — never mutated
        var d = JSON.parse(JSON.stringify(DEFAULT_HOME_CONTENT));

        var about   = Object.assign({}, d.about,   data.about   || {});
        about.pillars = mergeArr((data.about || {}).pillars, d.about.pillars);

        var banners = Object.assign({}, d.banners, data.banners || {});
        banners.tiles = mergeArr((data.banners || {}).tiles, d.banners.tiles);

        var pages   = Object.assign({}, d.pages,   data.pages   || {});
        pages.cards = mergeArr((data.pages || {}).cards, d.pages.cards);

        var services = Object.assign({}, d.services, data.services || {});
        services.cards    = mergeArr((data.services || {}).cards,    d.services.cards);
        services.policies = mergeArr((data.services || {}).policies, d.services.policies);
        services.hire       = Object.assign({}, d.services.hire,       (data.services || {}).hire       || {});
        services.disclaimer = Object.assign({}, d.services.disclaimer, (data.services || {}).disclaimer || {});

        return {
          hero:             Object.assign({}, d.hero,             data.hero             || {}),
          about:            about,
          aboutSection:     Object.assign({}, d.aboutSection,     data.aboutSection     || {}),
          services:         services,
          triumvirate:      mergeArr(data.triumvirate, d.triumvirate),
          trivSection:      Object.assign({}, d.trivSection,      data.trivSection      || {}),
          chronicleSection: Object.assign({}, d.chronicleSection, data.chronicleSection || {}),
          banners:          banners,
          pages:            pages
        };
      }
    } catch (e) {}
    return JSON.parse(JSON.stringify(DEFAULT_HOME_CONTENT));
  }

  function saveHomeContent(data) {
    localStorage.setItem(STORAGE_HOME_CONTENT, JSON.stringify(data));
    return fetch(WORKER_URL + '/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'home_content', value: data })
    }).then(function (r) {
      if (!r.ok) throw new Error('Server ' + r.status);
      return r.json();
    }).then(function (res) {
      if (!res || !res.ok) throw new Error((res && res.error) || 'Save rejected');
      return res;
    });
  }

  /* ── Auto-sync from Worker on page load ──────────────────── */
  // Fetches latest content from Sheets via Worker and updates localStorage.
  // Dispatches 'ofs-lore-loaded' event when done so pages can re-render.
  (function () {
    fetch(WORKER_URL + '/content')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || !data.ok) return;
        var srv = data.data || {};
        // Mirror server state: write if present, clear if absent.
        // Clearing stale localStorage lets defaults show through instead of
        // a local snapshot outliving its deletion on the server.
        if (srv.home_chronicle) {
          localStorage.setItem(STORAGE_HOME_CHRONICLE, JSON.stringify(srv.home_chronicle));
        } else {
          localStorage.removeItem(STORAGE_HOME_CHRONICLE);
        }
        if (srv.home_content) {
          localStorage.setItem(STORAGE_HOME_CONTENT, JSON.stringify(srv.home_content));
        } else {
          localStorage.removeItem(STORAGE_HOME_CONTENT);
        }
        global.dispatchEvent(new Event('ofs-lore-loaded'));
      })
      .catch(function () {});
  }());

  /* ── Exports ──────────────────────────────────────────────── */
  global.OFSLore = {
    getHomeChronicle:       getHomeChronicle,
    saveHomeChronicle:      saveHomeChronicle,
    STORAGE_HOME_CHRONICLE: STORAGE_HOME_CHRONICLE,
    getHomeContent:         getHomeContent,
    saveHomeContent:        saveHomeContent,
    STORAGE_HOME_CONTENT:   STORAGE_HOME_CONTENT
  };

})(window);
