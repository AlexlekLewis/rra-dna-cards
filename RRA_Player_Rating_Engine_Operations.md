# RRA Player Rating Engine — Operations Manual

**Version:** 1.0 · **Status:** DRAFT — Requires calibration sign-off  
**Owner:** Alex Lewis — Head Coach, RRA Melbourne  
**Classification:** Internal — Confidential  

---

## 1. What This System Does

The Player Rating Engine solves one problem: **how do you fairly compare players who come from vastly different competition contexts, age groups, and development stages?**

A raw assessment score of 4/5 for a 15-year-old playing U18 Premier Cricket means something fundamentally different than the same score for a 17-year-old playing U18 Shield 3. Without contextualisation, assessment data is unreliable for comparison, squad placement, pathway recommendations, or progress tracking.

The engine takes raw DNA Report assessment data and normalises it against competition difficulty and age relativity to produce a single comparable score: the **Player Development Index (PDI)**.

---

## 2. System Architecture

Three layers, each feeding the next. Raw data enters at Layer 1; a contextualised, comparable PDI emerges at Layer 3.

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 1: Competition Context Multiplier (CCM)              │
│  Establishes difficulty context BEFORE any assessment data   │
│  Components: Competition Tier Index (CTI) × ARM             │
│  Database table: competition_tiers + engine_constants        │
├─────────────────────────────────────────────────────────────┤
│  LAYER 2: Assessment Integration                            │
│  Weights dual-source ratings and applies CCM                │
│  Components: Coach/Player blend → Contextualised Skill      │
│  Score (CSS)                                                │
│  Database table: engine_constants (coach_weight,             │
│  player_weight)                                             │
├─────────────────────────────────────────────────────────────┤
│  LAYER 3: Composite Scoring & Ranking                       │
│  Aggregates CSS into domain scores → PDI                    │
│  Components: Domain weights by role type                    │
│  Database table: domain_weights + assessment_domains         │
├─────────────────────────────────────────────────────────────┤
│  LAYER 4: Cohort Normalisation                              │
│  Z-scores and percentile ranking within current cohort      │
│  Calculated automatically once all PDIs exist                │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Layer 1 — Competition Context Multiplier (CCM)

### 3.1 Purpose

Before any assessment data is considered, the system establishes how difficult the environment is that a player performs in. The CCM is the product of two sub-components.

### 3.2 Formula

```
CCM = CTI × ARM
```

Where:
- **CTI** = Competition Tier Index (looked up from `competition_tiers` table)
- **ARM** = Age Relativity Modifier (calculated per player)

### 3.3 Competition Tier Index (CTI)

A fixed coefficient assigned to every level of cricket. The benchmark ceiling is **Senior Premier 1st XI (code: P1M) = 1.00**. All other tiers are expressed as a fraction of that difficulty.

**How to look up a CTI value:**

1. Identify the player's **highest** level of competitive cricket
2. Find the matching `code` in the `competition_tiers` table
3. Read the `cti_value` column
4. Read the `expected_midpoint_age` column (needed for ARM)

**If the player competes in multiple tiers:** Use the highest tier as primary CTI. Record the secondary tier in the player record for context.

**If the competition isn't in the table:** Map to the closest equivalent. Interstate players map to Victorian equivalents (e.g., NSW CIS ≈ VP-17M at 0.80). Add the new entry to the database table for future use.

**If the player has no competitive history:** Use code `EN-NR` (CTI = 0.10). Flag for reassessment after 4 weeks.

### 3.4 Age Relativity Modifier (ARM)

The ARM adjusts for how old the player is relative to the competition they play in. A 15-year-old playing U18 Premier is performing in a harder context (for them) than a 17-year-old in the same competition.

**Formula:**

```
raw_ARM = 1 + (expected_midpoint_age − player_age) × arm_sensitivity_factor

ARM = max(arm_floor, min(arm_ceiling, raw_ARM))
```

**Current constants** (from `engine_constants` table):
- `arm_sensitivity_factor` = **0.05** (each year younger = +5% amplification)
- `arm_floor` = **0.80** (prevents extreme dampening)
- `arm_ceiling` = **1.50** (prevents extreme inflation)

**Step-by-step:**

1. Get `expected_midpoint_age` from the `competition_tiers` table for the player's competition code
2. Get `player_age` — calculated from DOB at program start date
3. Calculate: `raw_ARM = 1 + (expected_midpoint_age − player_age) × 0.05`
4. Clamp: if raw_ARM < 0.80, use 0.80. If raw_ARM > 1.50, use 1.50
5. Final ARM is the clamped value

### 3.5 CCM Worked Examples

| Player | Age | Competition (Code) | CTI | Expected Age | ARM Calc | ARM | CCM |
|--------|-----|-------------------|-----|--------------|----------|-----|-----|
| A | 15 | U18 Premier (P18M) | 0.75 | 16.5 | 1+(16.5−15)×0.05 | 1.075 | 0.806 |
| B | 17 | U18 Premier (P18M) | 0.75 | 16.5 | 1+(16.5−17)×0.05 | 0.975 | 0.731 |
| C | 14 | Assoc U14 A (CJ-14A) | 0.35 | 13.0 | 1+(13.0−14)×0.05 | 0.950 | 0.333 |
| D | 12 | Assoc U14 A (CJ-14A) | 0.35 | 13.0 | 1+(13.0−12)×0.05 | 1.050 | 0.368 |
| E | 15 | Senior Sub-Dist (SD1) | 0.70 | 24.0 | 1+(24.0−15)×0.05 | **1.450** | 1.015 |

> **Key insight — Player E:** A 15-year-old playing Senior Sub-District gets a CCM of 1.015 — *higher than the benchmark ceiling*. This is correct: a 15-year-old competing against adults is performing in an exceptionally difficult context. The ARM captures the "underdog effect" from the RAE research.

---

## 4. Layer 2 — Assessment Integration

### 4.1 Purpose

Layer 2 takes raw 1–5 ratings from the DNA Report App (both player self-assessment and coach assessment) and produces a **Contextualised Skill Score (CSS)** for each assessed item.

### 4.2 Assessor Source Weighting

| Scenario | Coach Weight | Player Weight | Notes |
|----------|-------------|---------------|-------|
| Both assessments available | **0.75** (75%) | **0.25** (25%) | Default — coach-dominant |
| Coach assessment only | **1.00** (100%) | N/A | Common for initial intake |
| Player assessment only | N/A | **1.00** (100%)* | *Flagged PROVISIONAL — excluded from ranking until coach assesses |

The gap between player and coach scores is tracked separately as the Self-Awareness Gap Index (SAGI) — see Section 6.

### 4.3 Data Reliability Classification

Not all DNA Report inputs are equal. The system classifies data by reliability tier:

| Tier | Data Type | DNA Report Source | Use in Algorithm |
|------|-----------|-------------------|-----------------|
| **TIER 1** — Quantitative | 1–5 skill ratings | Technical, Tactical, Mental, Physical rows | **Full** — feeds CSS |
| **TIER 2** — Ordinal | 1–5 phase ratings | T20 Phase Effectiveness Map (bat+bowl per phase) | **Full** — feeds Phase domain |
| **TIER 3** — Categorical | Archetype selections, checkboxes | Batting/Bowling archetypes, variations, zones | Classification only — **not scored** |
| **TIER 4** — Qualitative | Free text | Player Voice, DNA Summary, IDP notes | Narrative only — **never enters algorithm** |

### 4.4 CSS Formula

For each TIER 1 or TIER 2 rated item:

```
CSS = (coach_rating × coach_weight + player_rating × player_weight) × CCM
```

With default weights:

```
CSS = (coach_rating × 0.75 + player_rating × 0.25) × CCM
```

### 4.5 CSS Worked Example

Player A (age 15, P18M, CCM = 0.806) — assessed on "Front-Foot Drive":

| Input | Coach | Player | Blended | × CCM | CSS |
|-------|-------|--------|---------|-------|-----|
| Front-Foot Drive | 4 | 3 | (4×0.75)+(3×0.25) = 3.75 | × 0.806 | **3.023** |

Player C (age 14, CJ-14A, CCM = 0.333) — same raw ratings:

| Input | Coach | Player | Blended | × CCM | CSS |
|-------|-------|--------|---------|-------|-----|
| Front-Foot Drive | 4 | 3 | (4×0.75)+(3×0.25) = 3.75 | × 0.333 | **1.249** |

Same raw scores. CSS of 3.02 vs 1.25. The system correctly reflects that Player A's "4" in U18 Premier is worth significantly more than Player C's "4" in U14 District A-Grade.

---

## 5. Layer 3 — Composite Scoring & Ranking

### 5.1 Assessment Domains

The DNA Report items map to five scoring domains (see `assessment_domains` table):

| Domain | DNA Report Source | Typical Items |
|--------|-------------------|---------------|
| Technical Skill | Primary + Secondary skill ratings (Page 3) | 10–14 |
| T20 Game Intelligence | Game IQ section (Page 4) | 6 |
| Mental Performance | Mental Performance section (Page 4) | 7 |
| Physical / Athletic | Physical Profile section (Page 4) | 5 |
| Phase Effectiveness | Phase Map — bat + bowl ratings (Page 2) | 6 (3 phases × 2) |

Each domain score is the **average CSS** of all rated items within that domain:

```
Domain Score = Mean(all CSS values in domain)
```

### 5.2 Domain Weights by Role Type

Domain importance varies by player role (see `domain_weights` table):

| Domain | Specialist Batter | Pace Bowler | Spin Bowler | WK-Batter | Batting AR |
|--------|:-:|:-:|:-:|:-:|:-:|
| Technical | 35% | 30% | 35% | 35% | 30% |
| Game IQ | 25% | 20% | 25% | 20% | 25% |
| Mental | 20% | 20% | 20% | 20% | 20% |
| Physical | 10% | **20%** | 10% | 15% | 15% |
| Phase | 10% | 10% | 10% | 10% | 10% |

Weights sum to 100% for each role.

**Why physical is elevated for pace bowlers:** The T20 Performance Doctrine documents 5–9× body mass ground reaction forces during the delivery stride. Eccentric quad strength, core stability, and run-up power are foundational to a pace bowler's craft — not just "nice to have."

### 5.3 Player Development Index (PDI)

```
PDI = Σ (Domain Score × Domain Weight) for all 5 domains
```

Expressed as a score out of **5.0** (matching the 1–5 assessment scale, contextualised). Can also be scaled to /100 by multiplying by 20.

### 5.4 PDI Worked Example — Player A (Specialist Batter, CCM = 0.806)

| Domain | Domain Score (Avg CSS) | Weight | Contribution |
|--------|:---:|:---:|:---:|
| Technical | 3.02 | 0.35 | 1.057 |
| Game IQ | 2.85 | 0.25 | 0.713 |
| Mental | 3.20 | 0.20 | 0.640 |
| Physical | 2.50 | 0.10 | 0.250 |
| Phase | 2.90 | 0.10 | 0.290 |
| **TOTAL (PDI)** | | | **2.950** |

Player A's PDI is **2.95 / 5.0** (or **59 / 100**). This accounts for raw skill, the difficulty of U18 Premier, and age relativity as a 15-year-old playing up.

---

## 6. Secondary Metrics

### 6.1 Self-Awareness Gap Index (SAGI)

Not part of ranking. Tracked as a developmental indicator.

```
SAGI = Average(all Player Ratings) − Average(all Coach Ratings)
```

| SAGI Range | Interpretation | Coaching Implication |
|:---:|---|---|
| **+1.0 or higher** | Significant over-estimation | Build honest self-reflection habits |
| **+0.5 to +1.0** | Moderate over-estimation | Common in younger players — monitor |
| **−0.5 to +0.5** | Aligned self-awareness | Strong maturity indicator |
| **−0.5 to −1.0** | Under-estimation | Build confidence — player is better than they think |
| **−1.0 or lower** | Significant under-estimation | Possible confidence / anxiety issue |

### 6.2 Trajectory Flag

Identifies high-ceiling younger players whose age-relative performance suggests potential beyond their current absolute score.

```
Trajectory Flag = TRUE when BOTH:
  1. player_age < (expected_midpoint_age − trajectory_age_threshold)
  2. player's average CSS >= cohort mean CSS
```

With the current threshold of **1.5 years**, a flagged player is performing at or above cohort average while being significantly younger than their competition peers. This should influence pathway recommendations even if their absolute PDI is not elite.

---

## 7. Cohort Normalisation (Layer 4)

Once PDI scores exist for all players in the program, normalisation converts them into relative rankings.

### 7.1 Z-Score

```
Z-Score = (Player PDI − Cohort Mean PDI) / Cohort Standard Deviation
```

### 7.2 Percentile Labels

| Percentile | Z-Score (approx) | Position (of 120) | Label |
|:---:|:---:|:---:|---|
| 95th+ | +1.65 or higher | Top 6 | **Exceptional** |
| 75th–95th | +0.67 to +1.65 | 7–30 | **Advanced** |
| 25th–75th | −0.67 to +0.67 | 31–90 | **Developing** |
| 5th–25th | −1.65 to −0.67 | 91–114 | **Emerging** |
| Below 5th | Below −1.65 | 115–120 | **Foundation** |

### 7.3 Role-Group Normalisation

Players are also ranked within their role group (pace bowlers vs pace bowlers, keepers vs keepers). A PDI of 2.8 might be average for the full cohort but top-quartile among spinners. Both rankings are reported.

---

## 8. Output Specification

### 8.1 Coach-Eyes-Only Outputs

These are internal to the coaching team. Players and parents **never** see these:

- **PDI** — overall score /5.0 (or /100)
- **Domain Scores** — CSS average for each of the 5 domains
- **Cohort Percentile** — whole-cohort and role-group percentile ranking
- **Z-Score** — standard deviations from cohort mean
- **SAGI** — player vs coach alignment
- **Trajectory Flag** — high-ceiling age-relative indicator
- **CCM** — the contextualisation factor applied

### 8.2 Player/Parent-Facing Outputs

Qualitative only. No numbers:

- **Archetype Profile** — batting and bowling archetypes with descriptors
- **Top 3 Strengths** — written by coach
- **Top 3 Development Priorities** — written by coach
- **12-Week Development Focus** — phase-mapped goals (Explore / Challenge / Execute)
- **DNA Summary Narrative** — 3–5 sentence written identity
- **Archetype Development Target** — current vs aspirational archetype

> **Communication principle:** Parents see *who* their child is as a cricketer and *where* they're going. Coaches see *how* they compare and *where* they sit. The system serves both audiences without leaking competitive ranking data to families.

---

## 9. Step-by-Step: Scoring a New Player

This is the operational workflow — what actually happens when a new player enters the system.

### Step 1: Player Onboarding (Player Portal)

Player (or parent) completes the DNA Report App player portal:
- Profile: name, DOB, contact, parent details, club, association
- Playing role self-identification
- Competition history (up to 3 grades — association, age group, shield, team, stats)
- Batting/bowling style, variations, scoring zones
- Player Voice self-reflection
- Self-assessment ratings (1–5) for all TIER 1 and TIER 2 items

### Step 2: System Calculates CTI + ARM Automatically

On submission, the system:
1. Reads the player's **highest competition code** from their history
2. Looks up `cti_value` and `expected_midpoint_age` from the `competition_tiers` table
3. Calculates `player_age` from DOB relative to program start date
4. Computes ARM: `1 + (expected_midpoint_age − player_age) × 0.05`, clamped [0.80, 1.50]
5. Computes CCM: `CTI × ARM`
6. Stores CCM on the player record

### Step 3: Coach Assessment (Coach Portal)

Coach opens the player's record in the coach portal. All onboarding data is pre-loaded. Coach then:
- Confirms or re-classifies the player's role
- Assigns batting and bowling archetypes
- Rates all TIER 1 items (1–5): Technical, Game IQ, Mental, Physical
- Rates all TIER 2 items (1–5): Phase Effectiveness
- Writes strengths, priorities, narrative, 12-week plan
- Signs off

### Step 4: System Calculates CSS, Domain Scores, PDI

On coach submission, the system:
1. For each rated item: `CSS = (coach_rating × 0.75 + player_rating × 0.25) × CCM`
2. Groups CSS values by domain
3. Calculates domain score: `Mean(CSS values in domain)`
4. Looks up domain weights from `domain_weights` table based on player's role
5. Calculates PDI: `Σ(Domain Score × Domain Weight)`
6. Calculates SAGI: `Mean(Player Ratings) − Mean(Coach Ratings)`
7. Evaluates Trajectory Flag conditions
8. Stores all calculated values

### Step 5: Cohort Normalisation (Automatic, Batch)

Once enough players are assessed (minimum ~20 for meaningful statistics):
1. Calculate cohort mean PDI and standard deviation
2. For each player: `Z-Score = (PDI − mean) / stdev`
3. Convert Z-Score to percentile and label
4. Repeat within each role group
5. Recalculate whenever a new assessment is submitted

---

## 10. Database Schema Summary

The system uses 7 database tables. Each corresponds to a sheet in the `RRA_Rating_Engine_Database_v1.xlsx` file:

| Table | Purpose | Primary Key | Rows |
|-------|---------|-------------|------|
| `competition_tiers` | CTI lookup — every competition in VIC | `code` | ~90 |
| `domain_weights` | Role-specific domain weights | `role_id` | 5 |
| `assessment_domains` | Maps DNA Report sections to domains | `domain_id` | 7 |
| `engine_constants` | All tuneable system parameters | `constant_key` | 11 |
| `eligibility_rules` | Pathway exclusion rules | `competition_code` | ~8 |
| `vccl_regions` | Country cricket region reference | `region_code` | 8 |
| `vmcu_associations` | Metro association reference | `abbrev` | ~19 |

### Supabase Import Order

1. `engine_constants` (no dependencies)
2. `assessment_domains` (no dependencies)
3. `domain_weights` (no dependencies)
4. `vccl_regions` (no dependencies)
5. `vmcu_associations` (no dependencies)
6. `competition_tiers` (references engine_constants conceptually)
7. `eligibility_rules` (references competition_tiers codes)

---

## 11. How This Connects to the DNA Report App

The existing React app (built in the "Player DNA assessment cards" conversation) handles the **front-end data capture**. This engine provides the **back-end scoring logic** that sits behind it.

### What the app already handles:
- Dual-mode entry (Player Portal / Coach Portal)
- Player onboarding: profile, competition history, self-assessment ratings
- Coach assessment: archetype selection, 1–5 ratings, narrative, IDP
- Phase Effectiveness map
- Player Voice qualitative capture

### What this engine adds:
- Automatic CTI lookup when competition code is selected
- ARM calculation from DOB + competition midpoint age
- CCM computation (CTI × ARM) stored on player record
- CSS calculation for every rated item on coach submit
- Domain score aggregation
- PDI computation with role-specific weights
- SAGI tracking
- Trajectory flag evaluation
- Cohort normalisation batch process
- Coach dashboard: PDI, percentile, z-score, domain radar

### Integration points:

1. **Competition history dropdown** → populated from `competition_tiers` table (code + competition_name)
2. **Association dropdown** → populated from `vmcu_associations` + `vccl_regions` tables
3. **Role selection** → maps to `domain_weights` table (role_id)
4. **On player submit** → system looks up CTI, calculates ARM + CCM, stores
5. **On coach submit** → system calculates all CSS, domain scores, PDI, SAGI, trajectory flag
6. **Coach dashboard** → reads PDI, domain scores, cohort rank from calculated fields

---

## 12. Calibration & Governance

### Who Owns What

| Component | Owner | Review Cadence |
|-----------|-------|---------------|
| Competition Tier Index (CTI values) | Head Coach + Director of Talent | Annually (pre-season) |
| Age Sensitivity Factor | Head Coach | After each program intake |
| Domain Weights by Role | Head Coach + Specialist Coaches | After first intake, then annually |
| ARM Boundaries (floor/ceiling) | Head Coach | As needed |
| Assessor Source Weighting | Head Coach | Stable unless evidence warrants |
| Cohort Normalisation | Automatic | Recalculated with each new assessment |

### Calibration Schedule

1. **Pre-Program (before April 2026):** Finalise CTI table with Steven Crook. Agree domain weights. Confirm ARM sensitivity factor. This document is the record.
2. **Week 4 (end of Explore phase):** Review first batch of coach assessments. Check for scoring inflation/deflation. Adjust if coaches are systematically rating high or low.
3. **Week 12 (end of program):** Full cohort analysis. Compare PDI distributions. Validate that rankings feel intuitively correct to coaching staff. Adjust weights if systematic bias detected.
4. **Post-Program Review:** Document all changes in the Supabase change log. Bump version number.

### EMSH Reporting Alignment

The EMSH agreement requires quarterly business reviews and quarterly coach reviews. The PDI system provides the quantitative backbone. Aggregated cohort data (distributions, progression trends, role-group breakdowns) can be reported to EMSH without exposing individual player rankings.

---

## 13. Edge Cases

| Scenario | How to Handle |
|----------|--------------|
| **No competitive history** | Code = `EN-NR`, CTI = 0.10. Flag for reassessment after 4 weeks |
| **Multiple competition tiers** | Use highest tier as primary CTI. Record secondary in player notes |
| **Interstate player** | Map to closest VIC equivalent. Add to `competition_tiers` table |
| **International player** | Map to equivalent. e.g., English county U17 ≈ VP-17M (0.80) |
| **Adult (18+) at expected level** | ARM will be near 1.0 (no adjustment). If below midpoint age, dampened |
| **Player-only assessment (no coach yet)** | Score marked PROVISIONAL. Excluded from rankings. Retained for SAGI |
| **Competition not in table** | Coach selects closest match. Flag for database addition |
| **Female pathway** | Separate CTI values exist for women's/girls competitions |
| **Country player** | Country codes (RY-*) handle all regional structures |

---

## 14. Design Principles (Royals Way Alignment)

- **Fairness** — Every player assessed relative to their own context, not just against an absolute standard
- **Courage** — The system tells the truth about where a player sits
- **Curiosity** — Trajectory flags ask "what could this player become?" not just "what are they now?"
- **Explainability** — Every score traces back through the formula. A coach can explain to a parent exactly why their child's score is what it is. No black boxes.
- **Repeatability** — Two different coaches assessing the same player with the same inputs produce the same contextualised score

---

*This document is a living reference. It will be updated as the system is calibrated through real-world application during the 2026 Elite Program intake.*

*Last updated: February 2026 · v1.0*
