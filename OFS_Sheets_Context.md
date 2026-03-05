# OFS Google Sheets Integration — Context Map

> Reference document for wiring the OFS site to live spreadsheet data.
> Last updated: 2026-03-03

---

## Spreadsheet Overview

| Property | Value |
|---|---|
| Sheet Name | Member Log |
| GID | `2052923864` |
| Spreadsheet ID | `1YW5A_gk5WwmKbwxqrhIut3JUBSjaTO8vEf09F5QjpLo` |
| Full URL | https://docs.google.com/spreadsheets/d/1YW5A_gk5WwmKbwxqrhIut3JUBSjaTO8vEf09F5QjpLo/edit?gid=2052923864 |
| Access | Public read (Sheets API v4 or CSV export URL) |

**CSV export URL (no API key — requires sheet published to web):**
```
https://docs.google.com/spreadsheets/d/1YW5A_gk5WwmKbwxqrhIut3JUBSjaTO8vEf09F5QjpLo/export?format=csv&gid=2052923864
```

**Sheets API v4 URL (requires API key):**
```
https://sheets.googleapis.com/v4/spreadsheets/1YW5A_gk5WwmKbwxqrhIut3JUBSjaTO8vEf09F5QjpLo/values/Member%20Log?key={API_KEY}
```

---

## Column Map — Member Log (gid: 2052923864)

> ⚠️ **UPDATED 2026-03-04** — Actual column layout confirmed by live Worker fetch (400+ rows).
> Row 1 = headers, Row 2+ = player data.

| # | Column Header | JS Field | Type | Notes |
|---|---|---|---|---|
| A (0) | `User ID` | `player.id` | String | Discord snowflake — join key |
| B (1) | `Username` | `player.username` | String | Discord display name |
| C (2) | `Rank` | `player.rank` | String (enum) | Must match ORG_RANKS |
| D (3) | `Role` | *(not imported)* | String | Display role — distinct from Role Path |
| E (4) | `Current Chapter` | *(not imported)* | String | — |
| F (5) | `Join Date` | `player.joinDate` | String | e.g. `2025-10-12` |
| G (6) | `Time in service` | `player.timeInService` | String | e.g. `0y 0m` |
| H (7) | `Squire_1` | *(not imported)* | String | — |
| I (8) | `Squire_2` | *(not imported)* | String | — |
| J (9) | `Back Story` | `player.backStory` | String | Long text — character bio |
| K (10) | `Profile_Pic` | `player.avatarUrl` | String (URL) | Discord CDN avatar URL |
| L (11) | `Role Requested` | *(not imported)* | String | — |
| M (12) | `Quest` | *(not imported)* | String | — |
| N (13) | `Crusades` | *(not imported)* | String | — |
| O–Q (14–16) | *(empty)* | — | — | — |
| R (17) | `Role Path` | `player.rolePath` | String | Chosen specialization |
| S (18) | `Ship` | `player.ship` | String | Primary ship name |
| T (19) | `Ship Image` | *(not imported)* | String (URL) | — |
| U (20) | `Verified` | *(not imported)* | String | — |
| V (21) | `RSI User Name` | *(not imported)* | String | RSI handle |
| W–AB (22–27) | Quest tracking | *(not imported)* | — | Active quest fields |
| AC (28) | `Banner` | `player.activeBanner` | String (enum) | Must match BANNER_NAMES |
| AD (29) | `Banner Points` | *(not imported)* | Number | Aggregate — use Banners points sheet instead |
| AE (30) | `Banner Medals` | *(not imported)* | Number | Aggregate — use Banners points sheet instead |
| AF (31) | `Reputation XP` | `player.reputationXP` | Number | Raw XP — fed into calcRep() |
| AG (32) | `Medals` | *(not imported)* | String | — |

---

## Field Status in ofs-data.js

### Fields that already exist (rename/remap only)

| Sheet Column | ofs-data.js field | Change needed |
|---|---|---|
| User ID | `player.id` | Switch from sequential `"1","2"` to Discord snowflake ID |
| Username | `player.username` | None |
| Rank | `player.rank` | Validate against `ORG_RANKS` enum |
| Profile_Pic | `player.avatarUrl` | None (field exists, currently empty) |
| Banner | `player.activeBanner` | Validate against `BANNER_NAMES` enum |

### NEW fields — need to be added to `normalizePlayer()` in ofs-data.js

| Sheet Column | New JS field | Display location |
|---|---|---|
| Role Path | `player.rolePath` | Roster card, Player Sheet header |
| Join Date | `player.joinDate` | Player Sheet, Roster table |
| Time in Service | `player.timeInService` | Player Sheet header |
| Back Story | `player.backStory` | Player Sheet "Chronicle" / bio section |
| Ship | `player.ship` | Player Sheet header / stats block |
| Reputation XP | `player.reputationXP` | Feed to `calcRep()` → level + XP bar |

### Fields NOT in Member Log (on other sheets — out of scope for Phase 1)

| ofs-data.js field | Where it lives |
|---|---|
| `player.stats.*` (patrols, kills, quests, crusades etc.) | Separate stats sheet(s) |
| `player.banners.*` (per-banner points + medal flags) | Banner progress sheet |
| `player.wallet` (gold / silver / copper) | Treasury / wallet sheet |
| `player.faction` | Not yet confirmed — may be derived from Rank or separate column |

---

## Normalized Player Object (Phase 1 target shape)

After Member Log integration, a player object will look like:

```js
{
  // --- FROM MEMBER LOG (Google Sheets) ---
  id:            "123456789012345678",  // Discord snowflake
  username:      "Vanderan",
  rank:          "Primarch of Conquest",
  rolePath:      "Conquest",            // NEW
  joinDate:      "2023-04-12",          // NEW
  timeInService: "1 year 11 months",   // NEW
  backStory:     "Born in the void...", // NEW
  avatarUrl:     "https://cdn.discordapp.com/...",
  ship:          "Hammerhead",          // NEW
  activeBanner:  "The Fang",
  reputationXP:  14200,                 // NEW — raw XP total

  // --- STILL FROM localStorage (Phase 2+) ---
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
    "The Fang": { p: 67, m: true },
    // ... all 11 banners
  },
  wallet: { gold: 12, silver: 34, copper: 88 }
}
```

---

## Data Flow — Phase 1 (three read sheets)

```
Google Sheets              Google Sheets               Google Sheets
 Member Log                 Patrols_User_Totals          Reputation
 (gid: 2052923864)          (gid: 1245860458)            (gid: 708840198)
        |                           |                           |
        | fetch() CSV               | fetch() CSV               | fetch() CSV
        v                           v                           v
  profileRows[]               statRows[]                 levelRows[]
        |                           |                           |
        +--------→ merge by UserID ←+          LEVEL_XP[] ←----+
                        |                          |
                 mergedPlayers[]           replaces formula
                        |                  in ofs-data.js
                 normalizePlayer()
                        |
          localStorage cache (ofs_players_data)
                        |
          OFSData.getPlayers() → all pages
                        |
          +-------------+-------------+
          |             |             |
  OFS_Roster.html  OFS_PlayerSheet  OFS_Home.html
```

---

## Fetch Strategy

### Option A — CSV (Recommended for Phase 1, no API key)
- Sheet must be published: **File → Share → Publish to web → CSV**
- Fetch URL: `https://docs.google.com/spreadsheets/d/{ID}/export?format=csv&gid=2052923864`
- Parse with a simple CSV parser (split on newlines + commas, handle quoted fields)
- Cache result in localStorage with a timestamp → refresh every N minutes

### Option B — Sheets API v4 (More robust, requires API key)
- Returns JSON with `values[][]` — easier to map columns
- Requires a Google Cloud project with Sheets API enabled and an API key
- Key can be restricted to the site's origin

**For Phase 1 we will use Option A (CSV).**

---

## Implementation Plan (accumulates as sheets are confirmed)

### Step 1 — Confirm all sheets *(in progress)*
Collecting gid + column maps for all tabs before writing code.

### Step 2 — Add `ofs-sheets.js`
New file: `ofs-sheets.js`
- `SPREADSHEET_ID` + `OFS_APPS_SCRIPT_URL` constants
- `SHEET_URLS` map — one CSV URL per gid
- `fetchCSV(gid)` — fetch + parseCSV → rows array
- `fetchAllSheets()` — fetches Member Log + Patrols_User_Totals in parallel, merges by UserID
- `appendRow(sheetName, rowData)` — POST to Apps Script Web App (for writes)
- `cacheData(players)` / `loadCachedData()` — localStorage fallback with timestamp
- Exposes `OFSSheets.load()` and `OFSSheets.writeStatAdjustment()`

### Step 3 — Update `ofs-data.js`
- Add new fields to `normalizePlayer()`: `rolePath`, `joinDate`, `timeInService`, `backStory`, `ship`, `reputationXP`
- `calcRep()` already accepts XP — ensure it can take `reputationXP` directly

### Step 4 — Update pages
- **OFS_Roster.html** — show `rolePath`, `joinDate`, `ship` in cards/table
- **OFS_PlayerSheet.html** — render `backStory`, `ship`, `timeInService`, `joinDate`

---

## Column Header Exact Match Reference

> These are the exact header strings expected in Row 1 of the sheet.
> If the sheet uses different casing or spacing, update the column map below.

```js
const MEMBER_LOG_COLUMNS = {
  USER_ID:        0,   // A — "User ID"
  USERNAME:       1,   // B — "Username"
  RANK:           2,   // C — "Rank"
  ROLE_PATH:      3,   // D — "Role Path"
  JOIN_DATE:      4,   // E — "Join Date"
  TIME_IN_SERVICE:5,   // F — "Time in Service"
  BACK_STORY:     6,   // G — "Back Story"
  PROFILE_PIC:    7,   // H — "Profile_Pic"
  SHIP:           8,   // I — "Ship"
  BANNER:         9,   // J — "Banner"
  REPUTATION_XP: 10    // K — "Reputation XP"
};
```

> **Note:** Column indices are 0-based. If the sheet has blank leading columns or the headers are in a different row, these offsets will need adjustment.

---

## Column Map — Patrols_User_Totals (gid: 1245860458)

> Combat and activity stats per player. Joined to Member Log via `UserID`.
> Row 1 = headers, Row 2+ = one row per player.

| # | Column Header | JS Field | Type | Description | Notes |
|---|---|---|---|---|---|
| A | `UserID` | `player.id` | String | Discord User ID — **join key** to Member Log | Must match `User ID` in Member Log exactly |
| B | `DisplayName` | *(reference only)* | String | Player's display name | Same as `Username` on Member Log — used for human readability in the sheet, not re-imported |
| C | `PatrolCount` | `player.stats.PatrolCount` | Number | Number of Quests completed (called "Patrols" in sheet) | OFS calls these "Quests" in UI |
| D | `TotalLength` | `player.stats.TotalLength` | Number | Total hours spent on Quests | Passed to `formatPatrolLength()` |
| E | `FPS_Kills_Total` | `player.stats.FPS_Kills_Total` | Number | Cumulative FPS (ground) kills | — |
| F | `Ship_Kills_Total` | `player.stats.Ship_Kills_Total` | Number | Cumulative ship kills | — |
| G | `Crusades_Total` | `player.stats.Crusades_Total` | Number | Total Crusades participated in | — |
| H | `Turret_Kills_Total` | `player.stats.Turret_Kills_Total` | Number | Kills from turret positions | — |
| I | `Quest_Total` | `player.stats.Quest_Total` | Number | Total Quests completed | Distinct from PatrolCount (patrols vs quests) |
| J | `Led_Completed_Quests` | `player.stats.Led_Completed_Quests` | Number | Quests where player was the leader | — |
| K | `Led_Completed_Crusades` | `player.stats.Led_Completed_Crusades` | Number | Crusades where player was the leader | — |

**Status:** All 9 stat fields already exist in `player.stats` in `ofs-data.js`. No new fields needed — this sheet is a **clean remap** of existing data.

**CSV export URL:**
```
https://docs.google.com/spreadsheets/d/1YW5A_gk5WwmKbwxqrhIut3JUBSjaTO8vEf09F5QjpLo/export?format=csv&gid=1245860458
```

```js
const PATROLS_COLUMNS = {
  USER_ID:               0,   // A — "UserID"
  DISPLAY_NAME:          1,   // B — "DisplayName" (ignored on import)
  PATROL_COUNT:          2,   // C — "PatrolCount"
  TOTAL_LENGTH:          3,   // D — "TotalLength"
  FPS_KILLS_TOTAL:       4,   // E — "FPS_Kills_Total"
  SHIP_KILLS_TOTAL:      5,   // F — "Ship_Kills_Total"
  CRUSADES_TOTAL:        6,   // G — "Crusades_Total"
  TURRET_KILLS_TOTAL:    7,   // H — "Turret_Kills_Total"
  QUEST_TOTAL:           8,   // I — "Quest_Total"
  LED_COMPLETED_QUESTS:  9,   // J — "Led_Completed_Quests"
  LED_COMPLETED_CRUSADES:10   // K — "Led_Completed_Crusades"
};
```

---

## Column Map — Patrols_User_Adjustments (gid: 1158591087)

> **Audit log / write sheet.** Never edited in place — only appended to.
> When an admin changes a player's stats, a new row is written here recording the delta, reason, and who made the change.
> `Patrols_User_Totals` is assumed to be a live aggregation (SUMIF) of this log.

| # | Column Header | JS Field | Type | Description | Notes |
|---|---|---|---|---|---|
| A | `User ID` | `player.id` | String | Discord User ID of the player being edited | Join key |
| B | `PatrolCount` | delta value | Number | Change to PatrolCount (+ or −, 0 if unchanged) | |
| C | `TotalLength` | delta value | Number | Change to TotalLength | |
| D | `FPS_Kills_Total` | delta value | Number | Change to FPS kills | |
| E | `Ship_Kills_Total` | delta value | Number | Change to ship kills | |
| F | `Crusades_Total` | delta value | Number | Change to crusades count | |
| G | `Turret_Kills_Total` | delta value | Number | Change to turret kills | |
| H | `Quest_Total` | delta value | Number | Change to quest total | |
| I | `Led_Completed_Quests` | delta value | Number | Change to quests led | |
| J | `Led_Completed_Crusades` | delta value | Number | Change to crusades led | |
| K | `Delta` | *(audit label)* | String | Human-readable summary of the edit (e.g. `"PatrolCount +5"`) | Populated on write — not read back by site |
| L | `Reason` | *(audit label)* | String | Optional reason entered by admin | Shown in Admin audit log view |
| M | `AdminID` | *(audit label)* | String | Discord ID of the admin who made the edit | |
| N | `Timestamp` | *(audit label)* | String | ISO datetime of when the edit was made | Auto-generated on write |

**Status:** This is a **write-only** sheet from the site's perspective. The site never reads from it directly — `Patrols_User_Totals` holds the aggregated result. The Admin page writes new rows here when stats are edited.

**CSV export URL** *(read — for audit log display in Admin page):*
```
https://docs.google.com/spreadsheets/d/1YW5A_gk5WwmKbwxqrhIut3JUBSjaTO8vEf09F5QjpLo/export?format=csv&gid=1158591087
```

---

### ⚠️ Write Strategy — Appending to Google Sheets from a Static Site

Writing to Google Sheets from a `file://` or static hosted page **cannot use the CSV export** — that is read-only. Two viable approaches:

#### Option 1 — Google Apps Script Web App (Recommended)
- Create a bound Apps Script on the spreadsheet with a `doPost(e)` function
- Deploy it as a **Web App** (Execute as: Me, Access: Anyone)
- **No API key needed. No OAuth flow. Works from any static site.**
- Handles two operation types:

```
// Append a new row (stats adjustments, bank log entries)
POST https://script.google.com/macros/s/{SCRIPT_ID}/exec
{ "op": "append", "sheet": "Patrols_User_Adjustments", "row": [...] }

// Find a row by User ID and update specific columns (wallet balances)
POST https://script.google.com/macros/s/{SCRIPT_ID}/exec
{ "op": "update", "sheet": "Bank", "keyCol": 0, "keyVal": "userId", "data": { "Gold": 12, "Silver": 5, "Copper": 0 } }
```

#### Option 2 — Sheets API v4 with OAuth
- Requires the admin to authenticate with their Google account
- More complex — needs OAuth2 flow in the browser
- Not recommended for a simple static site

**We will use Option 1 (Apps Script Web App) for all write operations.**
The Apps Script URL will be stored as `OFS_APPS_SCRIPT_URL` in `ofs-sheets.js`.

---

---

## Column Map — Reputation (gid: 708840198)

> Level threshold lookup table. Defines exactly how much XP is required to reach each level.
> Row 1 = headers (`Lvl`, `Exp`). Rows 2–101 = levels 1–100.

| # | Column Header | JS Field | Type | Description | Notes |
|---|---|---|---|---|---|
| A | `Lvl` | index | Number | Level number (1–100) | Used as the array index |
| B | `Exp` | `LEVEL_XP[lvl-1]` | Number | XP required to reach this level | Source of truth — replaces the formula in `ofs-data.js` |

**Known values (from screenshot):**

| Level | XP Required | Level | XP Required |
|---|---|---|---|
| 1 | 100 | 20 | 20,000 |
| 2 | 1,147 | 30 | 32,222 |
| 3 | 2,195 | 40 | 55,072 |
| 5 | 4,289 | 41 | 58,368 |
| 10 | 9,526 | 42 | 61,984 |

**CSV export URL:**
```
https://docs.google.com/spreadsheets/d/1YW5A_gk5WwmKbwxqrhIut3JUBSjaTO8vEf09F5QjpLo/export?format=csv&gid=708840198
```

```js
const REPUTATION_COLUMNS = {
  LVL: 0,   // A — "Lvl"
  EXP: 1    // B — "Exp"
};
```

### ⚠️ Impact on ofs-data.js

`ofs-data.js` currently **calculates** `LEVEL_XP` using a formula:
```js
// CURRENT — formula-based, to be replaced
const LEVEL_XP = Array.from({ length: 100 }, (_, i) =>
  i === 0 ? 100 : Math.floor(100 * Math.pow(1000000 / 100, i / 99))
);
```

After integration, `LEVEL_XP` will be **loaded from the Reputation sheet**:
```js
// FUTURE — fetched from sheet, not calculated
LEVEL_XP = reputationRows.map(row => Number(row[REPUTATION_COLUMNS.EXP]));
```

This means `calcRep()` will use the exact org-defined thresholds. If leadership ever adjusts the XP curve in the sheet, the site automatically reflects it with no code changes.

**Note:** The XP values in the sheet do NOT match the current formula output — the sheet has its own curve defined by leadership. The sheet values are authoritative.

---

---

## Column Map — Bank (gid: 1552687505)

> **Live wallet balances.** One row per player. Edited in place — find the row by User ID and update Gold/Silver/Copper directly.
> This is NOT append-only — it requires a find-and-update write operation.

| # | Column Header | JS Field | Type | Description | Notes |
|---|---|---|---|---|---|
| A | `User ID` | `player.id` | String | Discord User ID — **join key + row locator** | Used to find the correct row to update |
| B | `Gold` | `player.wallet.gold` | Number | Player's current gold balance | 1 gold = 10 silver |
| C | `Silver` | `player.wallet.silver` | Number | Player's current silver balance | 1 silver = 10 copper |
| D | `Copper` | `player.wallet.copper` | Number | Player's current copper balance | Base currency unit |

**Currency conversion rates:** `1 gold = 10 silver = 100 copper`

**Status:** Maps 1-to-1 to the existing `player.wallet` object in `ofs-data.js`. No new fields needed.

**⚠️ Write method differs from stats sheet** — requires **find row by User ID, then update cells** (not append).
Apps Script must handle two operation types: `appendRow` (stats) and `updateRow` (wallet).

**CSV export URL:**
```
https://docs.google.com/spreadsheets/d/1YW5A_gk5WwmKbwxqrhIut3JUBSjaTO8vEf09F5QjpLo/export?format=csv&gid=1552687505
```

```js
const BANK_COLUMNS = {
  USER_ID: 0,   // A — "User ID"
  GOLD:    1,   // B — "Gold"
  SILVER:  2,   // C — "Silver"
  COPPER:  3    // D — "Copper"
};
```

---

## Column Map — The bank (logs) (gid: 1158834297)

> **Bank transaction audit log.** Append-only. Every wallet change (pay collection, manual edit, etc.) writes a new row here.
> Site reads this for transaction history display on Player Sheet / Admin.

| # | Column Header | JS Field | Type | Description | Notes |
|---|---|---|---|---|---|
| A | `User ID` | `player.id` | String | Discord User ID | Join key |
| B | `Timestamp (UTC)` | — | ISO 8601 string | When the transaction occurred | e.g. `2026-02-12T04:48:44.697408+00:00` |
| C | `Event ID` | — | String | Unique transaction ID | Format: `CP-{userId}-{unix}` |
| D | `Action` | — | String (enum) | Transaction type | e.g. `COLLECT_PAY`, `MANUAL_ADJUST`, etc. |
| E | `Gold` | — | Number | Gold amount in this transaction | Amount paid/deducted, not running total |
| F | `Silver` | — | Number | Silver amount in this transaction | |
| G | `Copper` | — | Number | Copper amount in this transaction | |
| H | `Balance After` | — | JSON string | Wallet balance after this transaction | e.g. `{"gold":57,"silver":7,"copper":8}` |
| I | `Source` | — | String | What triggered the transaction | e.g. `bank_ui`, `auto_pay`, etc. |
| J | `Meta JSON` | *(ignored)* | JSON string | Full pay breakdown — populated by Discord bot | **Site does not read or display this column** |

**CSV export URL:**
```
https://docs.google.com/spreadsheets/d/1YW5A_gk5WwmKbwxqrhIut3JUBSjaTO8vEf09F5QjpLo/export?format=csv&gid=1158834297
```

```js
const BANK_LOG_COLUMNS = {
  USER_ID:       0,   // A
  TIMESTAMP:     1,   // B
  EVENT_ID:      2,   // C
  ACTION:        3,   // D
  GOLD:          4,   // E
  SILVER:        5,   // F
  COPPER:        6,   // G
  BALANCE_AFTER: 7,   // H — JSON string, parse with JSON.parse()
  SOURCE:        8,   // I
  // META_JSON: 9   // J — Discord bot only, site ignores
};
```

---

### Bank Log — Site Use

The site reads columns A–I for display purposes (transaction history in Admin bank tab and Player Sheet).
Column J (`Meta JSON`) is populated by the Discord bot and is **ignored by the site entirely**.

---

---

## Column Map — White list Admin (gid: 1724779249)

> **Admin access control list.** Defines who is allowed into the Admin section of the site.
> Replaces the current hardcoded password login with Discord identity + whitelist check.

| # | Column Header | JS Field | Type | Description | Notes |
|---|---|---|---|---|---|
| A | `Name` | *(display only)* | String | Admin's display name | For human readability in the sheet — not used for auth |
| B | `Discord ID` | auth check key | String | Discord User ID (snowflake) | The value checked against the logged-in user's Discord ID |

**CSV export URL:**
```
https://docs.google.com/spreadsheets/d/1YW5A_gk5WwmKbwxqrhIut3JUBSjaTO8vEf09F5QjpLo/export?format=csv&gid=1724779249
```

```js
const WHITELIST_COLUMNS = {
  NAME:       0,   // A — "Name" (display only)
  DISCORD_ID: 1    // B — "Discord ID" — auth key
};
```

---

### ⚠️ Auth Architecture Change — Password → Discord OAuth + Whitelist

**Current:** OFS_Admin.html has a hardcoded password overlay stored in localStorage.

**Target:** User logs in via Discord → site gets their Discord User ID → checks it against the whitelist CSV → grants or denies access.

#### The Challenge — Static Site + Discord OAuth

Discord OAuth2 requires a **server-side token exchange** (the `client_secret` must never be in the browser). A pure `file://` static site cannot do this directly. The solution is the **Apps Script middleman already planned for write operations**.

#### Auth Flow (via Apps Script)

```
1. Admin clicks "Login with Discord"
         |
         v
2. Redirected to Discord OAuth consent screen
   (scopes: identify — just user ID + username, no email)
         |
         v (Discord redirects back to Apps Script callback URL)
3. Apps Script receives auth code
   → exchanges for access token (server-side, client_secret safe)
   → calls Discord /users/@me to get { id, username }
   → checks id against White list Admin CSV
         |
    ┌────┴────┐
    ✓ on list  ✗ not on list
    |          |
    v          v
4a. Apps Script  4b. Apps Script
    returns          returns
    { ok:true,       { ok:false }
      id, username,    → redirect to
      token }          access denied
    → redirect to
      admin page
      with session token
         |
         v
5. Admin page receives token in URL hash
   → stores in sessionStorage
   → all admin API calls include token
   → Apps Script validates token on every write request
```

#### What the Apps Script Needs (additions to existing plan)

- `doGet(e)` handler — handles Discord OAuth callback (in addition to existing `doPost`)
- Discord app credentials stored as Apps Script **Script Properties** (not in code):
  - `DISCORD_CLIENT_ID`
  - `DISCORD_CLIENT_SECRET`
- `generateSessionToken()` — creates a short-lived signed token for the session
- `validateToken(token)` — called on every write request to verify the session

#### What the Site Needs

- Remove the password overlay from `OFS_Admin.html`
- Add a Discord login button
- On load: check sessionStorage for a valid token → if none, show login
- Pass token with every Apps Script POST request
- Token stored in `sessionStorage` (cleared when browser tab closes)

#### Discord App Setup (one-time, done by Reno)

**Discord Application credentials (confirmed):**

| Property | Value | Where to store |
|---|---|---|
| Client ID | `1429228667564851383` | `ofs-sheets.js` constant (public — safe in code) |
| Client Secret | *(see Script Properties)* | **Apps Script Script Properties only** — NEVER in code |
| Redirect URI | `https://orderofthefallenstar.com/auth/callback` | Discord app OAuth2 settings (already set) |
| Scopes | `identify` | Discord app OAuth2 settings |

> ⚠️ **The client secret must never appear in any JS/HTML file or be committed to any repo.**
> Store it in: Apps Script → Project Settings → Script Properties → key `DISCORD_CLIENT_SECRET`.

**Updated Auth Flow (callback at real domain):**

Because the redirect URI is the real site (not the Apps Script URL), the flow is:

```
1. Admin clicks "Login with Discord"
         |
         v
2. Redirected to Discord OAuth consent (confirmed URL):
   https://discord.com/oauth2/authorize?client_id=1429228667564851383&response_type=code&redirect_uri=https%3A%2F%2Forderofthefallenstar.com%2Fauth%2Fcallback&scope=identify
         |
         v (Discord redirects back to the site)
3. /auth/callback page receives: ?code=XXXX
   → Page JS reads code from URL
   → POST to Apps Script: { op: "discordAuth", code: "XXXX" }
         |
         v (Apps Script — server-side, secret is safe)
4. Apps Script exchanges code for token:
   → POST to Discord /api/oauth2/token (with client_secret)
   → GET Discord /users/@me → { id, username }
   → Check id against White list Admin CSV
         |
    ┌────┴────┐
    ✓ on list  ✗ not on list
    |          |
    v          v
5a. Returns        5b. Returns
    { ok:true,         { ok:false }
      id, username,      → page shows
      token }              "Access Denied"
    → page stores
      token in sessionStorage
      → redirects to OFS_Admin.html
```

**What `/auth/callback` needs to be:**
A minimal HTML page (e.g. `OFS_Auth_Callback.html`) that:
- Reads `?code=` from the URL
- Shows a "Verifying..." spinner
- POSTs to Apps Script
- On success: `sessionStorage.setItem('ofs_admin_token', token)` then `location.replace('OFS_Admin.html')`
- On failure: shows "Access Denied" message

---

## Column Map — Banners points per user (gid: 1528788105)

> Per-player banner point totals. Columns are **dynamic** — new banners will be added as columns beyond L.
> The site must **not** hardcode column indices for banners — read the header row at runtime and build the banner list from it.
> Row 1 = headers, Row 2+ = one row per player.

| # | Column Header | JS Field | Type | Description | Notes |
|---|---|---|---|---|---|
| A | `Banners` | `player.id` | String | **Header is misleading** — column A actually contains Discord User IDs | Join key to Member Log. The header "Banners" is the sheet's own label. |
| B–L | `The Artificer` … `The Talon` | `player.banners["The Fang"].p` etc. | Number | Point total for each banner | **Dynamic** — read header names from row 1 rather than hardcoding column indices |
| M+ | *(future banners)* | — | Number | Additional banner columns as they are added by leadership | Column count will grow — never assume L is the last column |

**Current banners in columns B–L (as of 2026-03-03):**

| Col | Banner Name |
|---|---|
| B | The Artificer |
| C | The Astraeus |
| D | The Engineer |
| E | The Explorer |
| F | The Fang |
| G | The Forager |
| H | The Guardian |
| I | The Merchant |
| J | The Healer |
| K | The Privateer |
| L | The Talon |

**CSV export URL:**
```
https://docs.google.com/spreadsheets/d/1YW5A_gk5WwmKbwxqrhIut3JUBSjaTO8vEf09F5QjpLo/export?format=csv&gid=1528788105
```

### ⚠️ Dynamic Column Handling (critical)

Because banner columns grow over time, the JS parser must:
1. Read row 1 (headers) from the CSV
2. Skip column 0 (User ID join key)
3. Treat **every remaining column** as a banner name → build the banner list dynamically
4. Store as `player.banners[bannerName] = { p: Number(value), m: false }` for each

```js
// Example parse logic (runtime — not hardcoded)
const headers = rows[0];                     // ["Banners", "The Artificer", ...]
const bannerNames = headers.slice(1);        // drop column A
for (const dataRow of rows.slice(1)) {
  const userId = dataRow[0];
  const banners = {};
  bannerNames.forEach((name, i) => {
    banners[name] = { p: Number(dataRow[i + 1]) || 0, m: false };
  });
  bannerMap[userId] = banners;
}
```

> **Note on medal flags (`m`):** The sheet only stores points. Medal flags (`m: true`) are awarded at 60+ points in the current `ofs-data.js` logic. Medal status will continue to be derived client-side from the `p` value — the source of truth for medals is the point threshold, not a separate column (unless a medals sheet is added later).

---

## Column Map — Banners (gid: 1083027486)

> **Banner rank title + threshold lookup table.** Static reference data — does not change per player.
> Used to determine the title name for a given banner sub-rank tier.
> Row 1 = point thresholds, Row 2 = sub-rank column labels, Rows 3–13 = one row per banner.

| # | Row/Col | Content | Notes |
|---|---|---|---|
| Row 1 | B–E | Point thresholds: `0, 15, 30, 60` | B1=0, C1=15, D1=30, E1=60 |
| Row 2 | A–G | Column headers: `Banner Name, Sub Rank 0, Sub Rank 1, Sub Rank 2, Sub Rank Master, Medal, Medal + Sub Rank Master` | |
| Rows 3–13 | A | Banner name (e.g. `The Fang`) | One row per banner |
| Rows 3–13 | B | Sub Rank 0 title | Always `Apprentice` for all banners |
| Rows 3–13 | C | Sub Rank 1 title (15+ pts) | e.g. `Hound` for The Fang |
| Rows 3–13 | D | Sub Rank 2 title (30+ pts) | e.g. `Stalker` for The Fang |
| Rows 3–13 | E | Sub Rank Master title (60 pts + medal) | e.g. `Wolf` for The Fang |
| Rows 3–13 | F | Medal name | e.g. `Medal of the Fang` |
| Rows 3–13 | G | Medal + Sub Rank Master label | Same as E — confirmed master tier |

**Full banner sub-rank title reference (from sheet):**

| Banner | Sub Rank 0 | Sub Rank 1 | Sub Rank 2 | Sub Rank Master | Medal |
|---|---|---|---|---|---|
| The Artificer | Apprentice | Tinkerer | Artisan | Craftsman | Medal of the Artificer |
| The Astraeus | Apprentice | Helion | Archon | Strategos | Medal of the Astraeus |
| The Engineer | Apprentice | Technician | Fabricator | Mechanist | Medal of the Engineer |
| The Explorer | Apprentice | Seeker | Wayfarer | Pathfinder | Medal of the Explorer |
| The Fang | Apprentice | Hound | Stalker | Wolf | Medal of the Fang |
| The Forager | Apprentice | Scavenger | Harvester | Prospector | Medal of the Forager |
| The Guardian | Apprentice | Vanguard | Bulwark | Sentinel | Medal of the Guardian |
| The Merchant | Apprentice | Provisioner | Steward | Quartermaster | Medal of the Merchant |
| The Healer | Apprentice | Apothecary | Physician | Chirurgeon | Medal of the Healer |
| The Privateer | Apprentice | Wayman | Freeblade | Marauder | Medal of the Privateer |
| The Talon | Apprentice | Sparrow | Falcon | Raven | Medal of the Talon |

**CSV export URL:**
```
https://docs.google.com/spreadsheets/d/1YW5A_gk5WwmKbwxqrhIut3JUBSjaTO8vEf09F5QjpLo/export?format=csv&gid=1083027486
```

> ⚠️ **Already implemented in ofs-data.js:** `BANNER_RANKS` (lines 47–59) contains all sub-rank titles exactly matching this sheet. `bannerRankTitle(bannerName, points, medal)` and `bannerRankIndex()` functions already exist and implement the correct threshold logic (0/15/30/60+medal). **No code change needed for this data — it is already correct.**
>
> The sheet will become the source of truth when `ofs-sheets.js` is built — at that point `BANNER_RANKS` will be populated from the CSV instead of being hardcoded.

---

## Sheets Summary

| Tab Name | GID | Read/Write | Purpose |
|---|---|---|---|
| Member Log | `2052923864` | Read | Player identity + profile data |
| Patrols_User_Totals | `1245860458` | Read | Aggregated stats per player |
| Patrols_User_Adjustments | `1158591087` | Read + **Write (append)** | Stat edit audit log |
| Reputation | `708840198` | Read | Level → XP threshold lookup table |
| Bank | `1552687505` | Read + **Write (find+update)** | Live wallet balances |
| The bank (logs) | `1158834297` | Read + **Write (append)** | Transaction history / pay audit log |
| White list Admin | `1724779249` | Read | Admin access control list |
| Banners points per user | `1528788105` | Read | Per-player banner points + dynamic banner list |
| Banners | `1083027486` | Read | Banner sub-rank title + threshold lookup table |

---

## Open Questions (to resolve before coding)

| # | Question | Impact |
|---|---|---|
| 1 | ~~What is the full Google Sheets URL?~~ **RESOLVED** — ID: `1YW5A_gk5WwmKbwxqrhIut3JUBSjaTO8vEf09F5QjpLo` | — |
| 2 | Is the sheet published publicly (CSV export)? Or do we need an API key? | Determines fetch method |
| 3 | ~~Is `Reputation XP` raw XP or derived?~~ **RESOLVED** — Raw total XP stored on Member Log. Thresholds defined in Reputation sheet (gid: 708840198) | — |
| 4 | What is `Role Path`? Is it one of the Banners, or a separate concept (e.g. Conquest / Harmony / Justice)? | Affects enum validation |
| 5 | Does `User ID` (Discord snowflake) replace the current sequential ID as the unique key? | Affects `getPlayerById()` and URL `?player=id` param |
| 6 | ~~Will stats be on a separate sheet?~~ **RESOLVED** — Stats live on `Patrols_User_Totals` (gid: 1245860458) | — |

---

*This document should be updated as the integration progresses.*
*All records maintained in the Codex of the Fallen Star.*
