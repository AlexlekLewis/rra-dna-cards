# RRAM DNA Cards App: Player Onboarding Process

This document outlines the complete, end-to-end player onboarding flow as experienced by the user in the DNA Cards application. It details every step, question, requested data point, and the integrated guidance provided to ensure players submit an accurate, thoughtful profile.

## The Pre-Onboarding Guide Modal
Before Step 1 begins, the player is presented with a guidance modal to set their expectations and mindset.
- **Message:** "This is **not a test**. There are no wrong answers. What you're about to fill in helps your coaches understand you — your game, your style, and where you want to go. The more honest and accurate you are, the better we can tailor your coaching to help you grow."
- **Instructions:** 
  - Have PlayHQ profile open for reference.
  - Set aside 15–20 minutes.
  - Be honest—paint an accurate picture of your game *right now*.
- **Privacy Note:** "Everything you share stays between you and your coaching team."

---

## Step 1: Player Profile (Demographics)
Captures baseline contact and demographic information.

**Fields:**
- Full Name `[Text Input] (Required)`
- Date of Birth (DD/MM/YYYY) `[Text Input] (Required)`
- Phone Number `[Text Input]`
- Email `[Text Input]`
- Club `[Text Input]` (e.g., Doncaster CC)
- Association `[Dropdown Menu]` (Driven by `assocList`)
- Gender `[Dropdown Menu]` (M / F)

**Parent/Guardian Section (for Under 18s):**
- Parent Name `[Text Input]`
- Parent Email `[Text Input]`

---

## Step 2: Competition History (Statistical Profile)
Captures the player's recent playing data to provide a baseline for the Rating Engine's statistical benchmarks.

**Guidance:** "Start with your highest level played — Premier, Senior, Rep cricket first. Then add lower competition levels if you played at multiple levels. Only include competitions where you played 6 or more matches in the season."

Players can add up to **3 competition levels**. For each level, they provide:

### Level Setup
- Competition Level `[Dropdown Menu]` (Tiers defined in `compTiers`, dynamically filtered by gender & association)
- Club / Team `[Text Input]`
- Matches Played `[Number Input]`
- Format `[Dropdown Menu]` (Visible to players 16+, e.g., T20, One Day, Two Day)

### Batting Statistics
- Innings (Inn)
- Runs
- Not Outs (NO)
- Highest Score (HS) 
- Average (Avg)
- Balls Faced (BF)
- *Expandable HS Detail:* Balls Faced in HS, Boundaries (4s/6s) in HS.

### Bowling Statistics
- Innings (Inn)
- Overs (Ovrs)
- Wickets (Wkts)
- Strike Rate (SR)
- Average (Avg)
- Economy (Econ)
- Best Bowling Wickets (BB W) & Runs (BB R)

### Fielding Statistics
- Catches (Ct)
- Run Outs (RO)
- Stumpings (St)
- Keeper Catches (KpCt)

### Top Performances
Players enter their **Best 3 Batting Scores** and **Best 3 Bowling Figures** from the season:
- **Batting:** Runs, Balls, 4s, 6s, Not Out (true/false), Competition (Dropdown from added levels), Opposition, Format.
- **Bowling:** Wickets, Runs, Overs, Maidens, Competition, Opposition, Format.

---

## Step 3: T20 Identity (Playing Style)
Captures the player's primary role, skills, and defined archetypes.

### General Identity
- Primary Role `[Dropdown]` (Specialist Batter, Pace Bowler, Spin Bowler, WK-Batter, Batting All-Rounder)
- Batting Hand `[Dropdown]` (Right / Left)
- Bowling Type `[Dropdown]` (Right Arm Fast, Right Arm Medium, Left Arm Orthodox, etc.)

### Batting Identity
- Batting Position `[Dropdown]` (Top Order 1-3, Middle Order 4-5, Lower Order 6-7, Tail 8+)
- Preferred Batting Phases `[Multi-select Chips]` (Powerplay, Middle Overs, Death Overs)
- Go-To Shots `[Multi-select Chips]` (Drive, Pull, Cut, Sweep, Reverse Sweep, Ramp/Scoop, Switch Hit, etc.)
- Pressure Shot `[Text Input]` ("What's your go-to shot when you need runs?")
- Comfort vs Spin `[1-5 Dots Rating]`
- Comfort vs Short Ball `[1-5 Dots Rating]`
- **Batting Archetype Selection:** Players select *one* archetype (The Firestarter, The Controller, The Closer, The Dual Threat, The 360°, Spin Dominator).

### Bowling Identity (If applicable: Pace, Spin, All-Rounder)
- Preferred Bowling Phases `[Multi-select Chips]` (New Ball, Middle Overs, Death Overs)
- Bowling Speed `[Dropdown]` (Pace only: Slow, Medium, Fast, Express)
- Bowling Variations `[Multi-select Chips]` (Pace: Yorker, Slower Ball, Bouncer, Cutter, etc. | Spin: Wrong'un, Arm Ball, Top Spinner, Slider, etc.)
- Shut-Down Delivery `[Text Input]` ("What's your go-to delivery under pressure?")
- **Bowling Archetype Selection:** Players select *one* archetype (Wicket Hunter, The Weapon, The Squeeze, The Developer, Death Specialist, Express Pace, Containing Spinner).

### About You
- Height (cm) `[Number Input]`

---

## Step 4: Self-Assessment (The Rating Engine Input)
This step captures the `CSS` (Current Skill Self-assessment) to be compared against the Coach's `CCM` to generate the `SAGI` (Self-Awareness Gap Index).

**Guidance & 1-5 Scale Definition:**
- **1 = Just Starting** — "I'm still learning what this is"
- **2 = Developing** — "I can do it sometimes, but not every time"
- **3 = Solid** — "I can do this most of the time"
- **4 = Strong** — "I do this well, even under pressure"
- **5 = Elite** — "This is one of the best parts of my game"

### 4.1 Primary Technical Skills (Role Specific)
Players rate 10 role-specific technical attributes on a 1-5 scale.
- *For a Batter:* Stance & Setup, Trigger Movement, Front-Foot Drive, Back-Foot Play, Power Hitting, Sweep, Playing Spin, Playing Pace, Strike Rotation, Death-Over Hitting.
- *(Pace, Spin, and Keeper have their own specific 10 items).*

### 4.2 Game Intelligence
Players rate themselves (1-5) on: Powerplay Awareness, Middle-Over Management, Death-Over Decisions, Match Reading, Field Awareness, Adaptability.

### 4.3 Mental & Character
Players rate themselves (1-5) on: Courage Under Pressure, Curiosity & Learning, Emotional Regulation, Competitive Drive, Communication & Leadership, Coachability, Resilience.

### 4.4 Physical & Athletic
Players rate 5 physical traits tailored to their primary role (e.g., Pace Bowler evaluates Explosive Power, Core Stability, Eccentric Quad Strength, Shoulder Mobility, Aerobic Recovery).

### 4.5 Phase Effectiveness
Players rate their global effectiveness (1-5) across three phases:
- Powerplay (1-6)
- Middle Overs (7-16)
- Death Overs (17-20)
*(Bowlers rate themselves on both Batting and Bowling phase effectiveness).*

---

## Step 5: Player Voice (Narrative)
Open-ended text responses to let the player articulate their mindset.

**Questions:**
1. What part of your game are you most proud of?
2. What's the one thing you most want to improve?
3. Describe a match situation where you feel most confident.
4. What does success look like in the next 12 weeks?
5. How would you describe your batting style in one sentence?
6. What's your go-to shot or delivery under pressure?

---

## Step 6: Medical & Goals
Captures final administrative and developmental context.

- **Injury & Medical:** `[Text Area]` "Current or past injuries..."
- **Goals & Aspirations:** `[Text Area]` "What do you want from the program?"

---

## Step 7: Review & Submit
Provides a summary of the captured data to the player before final submission.

- **Summary Displayed:** Name, Date of Birth, Club, number of competition levels added, number of top scores, number of top bowling figures.
- **Action:** `SUBMIT SURVEY` button (saves data to Supabase and links it to the player's account). 
- **Confirmation:** Success screen confirming data is locked and ready for coaching staff review.

---
*Note: The platform tracks the time taken per step and calculates a completion percentage. If a player abandons the survey mid-way, an analytics event (`SURVEY_ABANDON`) logs their progress level.*
