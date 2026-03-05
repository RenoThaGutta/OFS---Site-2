# Loveable Prompt — Order of the Fallen Star Website

---

## Project Overview

Build a multi-page companion website for **Order of the Fallen Star (OFS)** — a Star Citizen player organization. I will attach existing HTML files (OFS_Codex.html and OFS_Timeline.html) and the org logo (ofs_logo.png) — use these as direct reference for the site's content and style.

---

## Visual Design

- **Dark space aesthetic** — near-black background (#0a0a0f or similar), deep navy/charcoal tones
- **Star field** — subtle static or very slow-drifting star particle background on all pages
- **Accent colors** — gold (#c9a84c) and silver/platinum (#b0b8c8) for headings, borders, dividers, and highlights
- **Typography** — serif or semi-serif for headings (something commanding, like Cinzel or Trajan-style); clean sans-serif for body text
- **Medal/card style** — cards should have dark backgrounds with metallic gold/silver borders, subtle inner glow on hover
- **Tone** — dramatic, prestigious, military-lore. Think space-fantasy guild hall, not modern SaaS
- **Logo** — use `ofs_logo.png` in the site header/nav. The motto is: *"From betrayal, we were forged. From the void, we struck. From the Fallen Star, we ascended."*

---

## Pages

### 1. Home / Landing Page
- Full-width hero with the OFS logo centered, the org motto beneath it, and a subtle animated star field behind
- Brief intro paragraph: OFS is a Star Citizen organization — disciplined, lore-driven, and forged through conflict
- Navigation links to all other pages
- Footer with motto and *"Glory to the Fallen Star. Our light endures, unbroken."*

### 2. Codex Page
- Port the content from `OFS_Codex.html` into the site's visual style
- Maintain all article structure, headings, and rank tables

### 3. Chronicles / Timeline Page
- Port the content from `OFS_Timeline.html` into the site's visual style
- Preserve all lore entries, ages, and war chronicles in order

### 4. Player Roster Page
- A searchable, browsable grid of all player cards
- Each card shows: avatar thumbnail, username, org rank, and their highest active banner rank
- Clicking a card opens the full Player Sheet (detail view)

### 5. Player Sheet (detail view)
Full individual player profile. Layout described in detail below.

---

## Player Sheet — Detailed Spec

### Header Section
- Large player **avatar / profile photo**
- **Username** (large, prominent)
- **Org Rank** (from the rank list below — displayed as title + roman numeral, e.g. "Knight — Rank III")
- **Faction / Chapter affiliation** (text field)

**Org Ranks (for dropdown/display):**
Serf (0), Commoner (I-C), Page (I), Squire (II), Knight (III), Templar (IV), Praetorian (IV), Commander (V), Lord (VI), Lord Commander (VII), Chapter Master (VIII)

---

### Combat & Activity Stats Section
Display as a clean stat grid (3 columns on desktop, 2 on mobile). Each stat has a label and a number value:

| Field | Display Label |
|---|---|
| PatrolCount | Patrols |
| TotalLength | Total Patrol Length |
| FPS_Kills_Total | FPS Kills |
| Ship_Kills_Total | Ship Kills |
| Crusades_Total | Crusades |
| Turret_Kills_Total | Turret Kills |
| Quest_Total | Quests Completed |
| Led_Completed_Quests | Quests Led |
| Led_Completed_Crusades | Crusades Led |

---

### Banners Section
Display all 11 banners as cards in a responsive grid (3–4 per row on desktop). Each banner card contains:

1. **Banner name** (e.g. "The Fang")
2. **Current rank title** (derived from points + medal status — see rank logic below)
3. **Points total** (numeric)
4. **Progress bar** showing progress toward next rank tier (fill stops at Sub Rank 2 if no medal; unlocks Master tier once medal is awarded)
5. **Medal display area** — if medal is awarded, show the medal image; if not awarded yet, show a greyed-out locked silhouette/placeholder

**Banner Rank Logic:**
- 0 points → **Apprentice** (all banners)
- 15+ points → Sub Rank 1 (unique title per banner)
- 30+ points → Sub Rank 2 (unique title per banner)
- 60+ points AND medal awarded → **Master** (unique title per banner)
- Note: A player with 60+ points but no medal stays at Sub Rank 2 until the medal is granted by an admin

**Full Banner Rank Table:**

| Banner | 0 pts | 15 pts | 30 pts | 60 pts + Medal |
|---|---|---|---|---|
| The Artificer | Apprentice | Tinkerer | Artisan | Craftsman |
| The Astraeus | Apprentice | Helion | Archon | Strategos |
| The Engineer | Apprentice | Technician | Fabricator | Mechanic |
| The Explorer | Apprentice | Seeker | Wayfarer | Pathfinder |
| The Fang | Apprentice | Hound | Stalker | Wolf |
| The Forager | Apprentice | Scavenger | Harvester | Prospector |
| The Guardian | Apprentice | Vanguard | Bulwark | Sentinel |
| The Merchant | Apprentice | Provisioner | Steward | Quartermaster |
| The Healer | Apprentice | Apothecary | Physician | Chirurgeon |
| The Privateer | Apprentice | Wayman | Freeblade | Marauder |
| The Talon | Apprentice | Sparrow | Falcon | Raven |

**Medal images available** (to be uploaded — named to match banners):
- The Astraeus, The Explorer, The Fang, The Guardian, The Healer, The Merchant
- Remaining 5 banners (The Artificer, The Engineer, The Forager, The Privateer, The Talon) — show locked/greyed silhouette until images are added later

---

## Admin Editing

- All player data (stats, banner points, medal status, rank, avatar) is **admin-only editable**
- Regular visitors see the sheets as read-only
- Include a simple admin login gate (password protected is fine for now)
- Admin can: edit any stat, toggle medal awarded on/off per banner, upload/change player avatar, set org rank

---

## Tech Notes

- Fully responsive (desktop + mobile)
- No external data dependencies needed at launch — player data can be stored in Supabase or a simple built-in database
- The Codex and Timeline pages are content-heavy — make sure long-form text is readable (good line-height, max-width containers, scroll-friendly)
- Prefer a single cohesive design system across all pages — nav, footer, card styles, and typography should be consistent everywhere
