# RRA DNA Profile

**Standalone Player Onboarding, 8-Pillar Assessment Engine & DNA Report Cards**

Extracted from the Rajasthan Royals Academy management system as a self-contained application focused on player DNA profiling.

## What It Does

1. **Player Onboarding** — 7-step survey capturing demographics, competition history, playing style, self-assessment, player voice, medical info, and goals
2. **Coach Assessment** — Domain-by-domain skill ratings using a standardised 1-5 rubric across technical, tactical, mental, and physical domains
3. **8-Pillar Rating Engine** — Calculates Player Development Index (PDI), Competition Context Multiplier (CCM), Self-Awareness Gap Index (SAGI), Archetype DNA, and Growth Delta
4. **DNA Report Cards** — Auto-generated 3-page A4 landscape PDF with radar charts, domain bars, and development plans

## Tech Stack

- **Frontend**: React 19 + Vite 6
- **Database**: Supabase (PostgreSQL + Auth + RLS)
- **PDF**: html2canvas + jsPDF
- **Testing**: Vitest

## Setup

```bash
npm install
```

Create a `.env` file:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Run the consolidated schema in your Supabase SQL Editor:

```
schema.sql
```

## Development

```bash
npm run dev        # Start dev server
npm run test       # Run engine unit tests
npm run build      # Production build
```

## Project Structure

```
src/
├── App.jsx                    # App shell — login, portal routing
├── supabaseClient.js          # Supabase client init
├── main.jsx                   # React entry point
│
├── engine/
│   └── ratingEngine.js        # 8-pillar PDI calculation engine
│
├── data/
│   ├── theme.js               # Colors, fonts, style tokens
│   ├── skillItems.js           # Roles, archetypes, skill items
│   ├── skillDefinitions.js     # Rating rubric descriptions
│   ├── fallbacks.js            # Fallback engine constants
│   ├── competitionData.js      # Competition tiers & associations
│   └── mockPlayers.js          # Dev/test data
│
├── db/
│   ├── playerDb.js             # Player CRUD & assessments
│   ├── adminDb.js              # Engine config management
│   ├── idpDb.js                # Development plan goals
│   ├── journalDb.js            # Session journals
│   ├── observationDb.js        # Coach observations
│   ├── squadDb.js              # Squad management
│   └── programDb.js            # Program data
│
├── auth/
│   └── authHelpers.js          # Username→email auth flow
│
├── context/
│   ├── AuthContext.jsx          # Auth provider
│   └── EngineContext.jsx        # Engine data provider
│
├── shared/
│   ├── FormComponents.jsx       # Reusable UI components
│   └── ErrorBoundary.jsx        # Error boundary
│
├── analytics/
│   └── tracker.js               # Event analytics
│
├── player/
│   ├── PlayerOnboarding.jsx     # 7-step onboarding
│   ├── PlayerPortal.jsx         # Player dashboard
│   ├── IDPView.jsx              # Development plan viewer
│   └── Journal.jsx              # Player journal
│
└── coach/
    ├── CoachAssessment.jsx      # Coach assessment flow
    ├── ReportCard.jsx           # DNA Report Card renderer
    └── reportGenerator.js       # PDF generation

tests/
└── ratingEngine.test.js         # 563-line engine test suite

schema.sql                       # Consolidated Supabase schema + RLS
```

## Engine Architecture

The 8-pillar model evaluates players across:

| # | Pillar | Weight (Batter) | Source |
|---|--------|-----------------|--------|
| 1 | Technical Primary | 35% | Coach rating |
| 2 | Technical Secondary | incl. above | Coach rating |
| 3 | Game Intelligence | 25% | Coach rating |
| 4 | Mental & Character | 20% | Coach rating |
| 5 | Physical & Athletic | 10% | Coach rating |
| 6 | Phase Effectiveness | 10% | Coach rating |
| 7 | Self-Awareness (SAGI) | P8 modifier | Coach vs Player gap |
| 8 | Match Impact | Statistical | Competition stats |

Weights vary by role (pace bowler, spin bowler, wicketkeeper, allrounder).
