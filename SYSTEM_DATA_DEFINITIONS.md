# RRAM DNA Cards App: System Definitions & Data Capture

This document outlines everything the RRAM DNA Cards system captures, tracks, and calculates. It serves as a complete functional data dictionary for the application, explaining the "what" and "why" behind every data point.

---

## 1. Player Profile & Baseline Data
The foundational layer of the system. This data establishes *who* the player is and *where* they currently play.

- **Demographics:** Name, Date of Birth, Age (calculated dynamically relative to the current season).
- **Contact & Admin:** Email, Phone, Parent/Guardian details, Member Status (Active, Archived, Deleted).
- **Club & Competition History:** Detailed tracking of every club, association, and grade the player has participated in over the current/past season.
- **Competition Tier Index (CTI):** A proprietary weighting applied to a player's competition history. For example, playing 1st XI Premier Cricket carries a higher CTI value than Under-16 Community Cricket. This ensures all subsequent statistical analysis is mathematically contextualized.

---

## 2. Statistical Performance
The objective layer. The system captures raw match statistics and converts them into standardized performance metrics using the CTI.

- **Batting Stats:** Innings, Not Outs, Runs, High Score, Average, Strike Rate.
- **Bowling Stats:** Overs, Maidens, Wickets, Runs Conceded, Best Bowling, Average, Strike Rate, Economy Rate.
- **Statistical Benchmarks:** The system cross-references these raw stats against pre-defined, age- and tier-specific benchmarks to generate a 1-5 Performance Score. (e.g., An average of 35.0+ in Premier Cricket scores a 5, while the same average in a lower tier might score a 3).

---

## 3. The "Player Voice" (Subjective Integration)
The system requires active input from the player to understand their mindset, goals, and technical identity.

### 3.1 T20 Role Identity & Archetypes
Players define *how* they impact a game by selecting their primary archetypes.
- **Batting Archetypes:**
  - *The Firestarter:* Powerplay aggression; scores fast from ball one.
  - *The Controller:* Manipulates fields, rotates strike, anchors the innings.
  - *The Closer:* Finishes tight games under pressure; death-over specialist.
  - *The Dual Threat:* Genuine all-rounder impact.
  - *The 360°:* Hits to all parts of the ground; impossible to set fields to.
  - *Spin Dominator:* Controls the middle overs; neutralizes slow bowling.
- **Bowling Archetypes:**
  - *Wicket Hunter:* Strike bowler; attacks stumps and finds edges.
  - *The Weapon:* Elite status; takes wickets while maintaining low economy.
  - *The Squeeze:* Dot-ball specialist; builds immense pressure.
  - *The Developer:* A work-in-progress actively refining their craft.
  - *Death Specialist:* Owns the final 4 overs; executes yorkers under extreme pressure.
  - *Express Pace:* 135+ km/h; relies on raw speed and intimidation.
  - *Containing Spinner:* Accuracy-focused; limits scoring options.

### 3.2 Phase Preferences
Players declare where they believe they are most effective:
- **Batting:** Powerplay (1-6), Middle Overs (7-16), Death Overs (17-20).
- **Bowling:** New Ball, Middle Overs, Death Overs.

### 3.3 The Narrative
Short-form written responses capturing:
- Proudest achievements
- Primary area for improvement
- Ideal match situations
- 12-week definitions of success

---

## 4. The Coach Assessment (The Six Domains)
The core subjective layer. Coaches rate players on a strict 1-5 scale across roughly 40 granular skill items.

**The 1-5 Scale Definition:**
- **1:** Foundational / Needs significant development.
- **2:** Developing / Inconsistent execution.
- **3:** Competent / Executes reliably at current grade level.
- **4:** Advanced / Outperforming current grade; ready for next tier.
- **5:** Elite / Benchmark standard for a pathway/premier player.

**The Six Domains:**
1. **Technical Batting (BAT):** Stance, trigger movements, front/back foot play, power hitting, strike rotation, playing spin/pace.
2. **Technical Pace/Spin Bowling (PACE/SPIN):** Run-up, alignment, wrist position, stock ball control, variations, death bowling.
3. **Fielding & Wicketkeeping (FLD/WK):** Catching, throwing accuracy, lateral movement, standing up to spin.
4. **Game Intelligence (IQ):** Powerplay awareness, field awareness, match reading, adaptability.
5. **Physical & Athletic (PH):** Explosive power, core stability, aerobic fitness, recovery.
6. **Mental & Character (MN):** Courage under pressure, emotional regulation, coachability, resilience.

---

## 5. The Rating Engine (The Logic Layer)
The mathematical heart of the system that blends subjective assessments with objective stats to produce a unified score.

- **Coach Competency Measure (CCM):** The aggregate 1-5 score derived purely from the coach's assessment of the Six Domains.
- **Current Skill Self-assessment (CSS):** The aggregate 1-5 score derived purely from the player's self-assessment during onboarding.
- **Self-Awareness Gap Index (SAGI):** The mathematical difference between the CSS and the CCM. A high SAGI triggers a coaching intervention (perception vs. reality gap).
- **Age Relativity Modifier (ARM):** A dynamic multiplier based on the player's age. It ensures that a 15-year-old scoring a '3' is not judged on the same curve as a 21-year-old scoring a '3'. It mathematically rewards younger players playing higher grades.
- **Player Development Index (PDI):** The final, master output score. It blends the CCM (Coach), CSS (Player), Statistical Performance, CTI, and ARM into a single number representing the player's holistic value and readiness for the next level.

---

## 6. System Outputs & Visualizations
How the data is actioned.

- **The DNA Report Card:** A 3-page, professional PDF generated for the player. It visualizes their PDI, domain breakdowns (radar charts), archetypes, and the exact skills they need to improve (e.g., turning a '2' on Back-Foot Play into a '3').
- **Coach Dashboards:** Analytical grids that allow coaches to view entire squads side-by-side, sort by specific domains (e.g., "Show me all players with high Game IQ but low Physical capability"), and design training sessions based on hard data.
- **Admin & Engagement Tracking:** Tracks how far players are through the onboarding pipeline, when they last updated their profiles, and who needs nudges—ensuring data remains fresh and accurate.
