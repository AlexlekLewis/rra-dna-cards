// ═══ SKILL ITEMS, ARCHETYPES, ROLES, PHASES, VOICE ═══
import { B } from './theme';

export const ROLES = [
    { id: "batter", label: "Specialist Batter", sh: "BAT", dbId: "specialist_batter" },
    { id: "pace", label: "Pace Bowler", sh: "PACE", dbId: "pace_bowler" },
    { id: "spin", label: "Spin Bowler", sh: "SPIN", dbId: "spin_bowler" },
    { id: "keeper", label: "WK-Batter", sh: "WK", dbId: "wicketkeeper_batter" },
    { id: "allrounder", label: "Batting All-Rounder", sh: "AR", dbId: "batting_allrounder" },
];

// ═══ ARCHETYPES ═══
// TRAP 1: Existing items MUST NOT be reordered or removed. New items appended only.

export const BAT_ARCH = [
    { id: "firestarter", nm: "THE FIRESTARTER", sub: "You score fast from ball one. You back yourself to hit boundaries in the powerplay and put pressure on the bowlers early.", c: B.pk },
    { id: "controller", nm: "THE CONTROLLER", sub: "You control the tempo of the innings. You find gaps, rotate strike, and build partnerships — then accelerate when the time is right.", c: B.bl },
    { id: "closer", nm: "THE CLOSER", sub: "You're the person the team wants at the crease when the game is on the line. You stay calm under pressure and finish the job.", c: B.pk },
    { id: "dual", nm: "THE DUAL THREAT", sub: "You make an impact with both bat and ball. You can change the game in either role and your team relies on your versatility.", c: B.bl },
    // ── Appended v2 ──
    { id: "threesixty", nm: "THE 360°", sub: "You score all around the ground. Bowlers can't set a field to you because you can hit to every part of the boundary.", c: B.sky },
    { id: "spindom", nm: "SPIN DOMINATOR", sub: "You read spin early and score freely. While others struggle against spinners, you dominate them and control the middle overs.", c: B.prp },
];

export const BWL_ARCH = [
    { id: "hunter", nm: "WICKET HUNTER", sub: "Your main job is to take wickets. You attack the stumps, find edges, and break partnerships. You're the strike bowler.", c: B.pk },
    { id: "weapon", nm: "THE WEAPON", sub: "You do both — you take wickets AND you don't go for runs. You're the bowler the captain turns to in any situation.", c: B.bl },
    { id: "squeeze", nm: "THE SQUEEZE", sub: "You stop the scoring. You bowl dots, build pressure, and force the batter into mistakes. Economy is your superpower.", c: B.bl },
    { id: "developer", nm: "THE DEVELOPER", sub: "You're building your bowling game. You have clear areas to improve and you're working hard to get better every session.", c: B.g400 },
    // ── Appended v2 ──
    { id: "death", nm: "DEATH SPECIALIST", sub: "You own the last 4 overs. You nail yorkers, mix up your pace, and stay calm when the batter is trying to hit you out of the ground.", c: B.pk },
    { id: "express", nm: "EXPRESS PACE", sub: "You bowl fast — over 135 km/h. Your raw speed makes batters uncomfortable and you use it to create chances.", c: B.nv },
    { id: "containing", nm: "CONTAINING SPINNER", sub: "You control the game with your accuracy. You don't give away easy runs and you use variations to keep batters guessing.", c: B.sky },
];

// ═══ SKILL ITEMS (position-indexed — NEVER reorder) ═══

export const BAT_ITEMS = ["Stance & Setup", "Trigger Movement & Balance", "Front-Foot Drive", "Back-Foot Play", "Power Hitting", "Sweep & Reverse Sweep", "Playing Spin", "Playing Pace", "Strike Rotation", "Death-Over Hitting"];
export const PACE_ITEMS = ["Run-Up Rhythm", "Action Alignment", "Front-Leg Brace", "Wrist & Seam", "Stock Ball Control", "Yorker Execution", "Slower Ball Variation", "Bouncer Effectiveness", "Wide-Line Strategy", "Bowling to Plans"];
export const SPIN_ITEMS = ["Stock Ball Accuracy", "Revolutions & Spin Rate", "Wrong'un Execution", "Flight & Dip Control", "Use of Crease", "Match-Up Bowling", "Middle-Over Control", "Powerplay Tactics", "Death-Over Spin", "Reading the Batter"];
export const KEEP_ITEMS = ["Stance & Ready Position", "Footwork to Pace", "Standing Up to Spin", "Glove Work", "Stumping Speed", "Diving & Athleticism", "Communication", "Throwing Accuracy"];
export const IQ_ITEMS = ["Powerplay Awareness", "Middle-Over Management", "Death-Over Decisions", "Match Reading", "Field Awareness", "Adaptability"];
export const MN_ITEMS = ["Courage Under Pressure", "Curiosity & Learning", "Emotional Regulation", "Competitive Drive", "Communication & Leadership", "Coachability", "Resilience"];

export const PH_MAP = {
    pace: ["Explosive Power", "Core Stability", "Eccentric Quad Strength", "Shoulder Mobility", "Aerobic Recovery"],
    spin: ["Shoulder Flexibility", "Core & Rotational Power", "Aerobic Endurance", "Balance & Landing", "General Movement"],
    keeper: ["Lateral Movement", "Squat Endurance", "Hand-Eye Coordination", "Core Stability", "Aerobic Fitness"],
    batter: ["Explosive Power", "Agility & Running", "Core Balance", "Upper Body Power", "Aerobic Fitness"],
    allrounder: ["Explosive Power", "Bowling Athleticism", "Core Balance", "Aerobic Fitness", "General Movement"],
};

// ═══ 8-PILLAR: NEW ITEMS ═══
// TRAP 1: Existing items MUST NOT be reordered or removed. New items appended only.

// Athletic Fielding — universal across ALL roles (prefixed fld_)
export const FLD_ITEMS = [
    "Ground Fielding",
    "Catching Reliability",
    "Close / Sharp Catching",
    "Throwing Accuracy & Speed",
    "Running Between Wickets",
];

// Power Hitting — includes 2 items that move FROM BAT_ITEMS indexes 4,9 + 2 new (prefixed pwr_)
// Items at index 0,1 reference BAT_ITEMS[4] ("Power Hitting") and BAT_ITEMS[9] ("Death-Over Hitting")
// Items at index 2,3 are new captures
export const PWR_ITEMS = [
    "Power Hitting",            // Mirrors BAT_ITEMS[4] — scored here for the Power Hitting pillar
    "Death-Over Hitting",       // Mirrors BAT_ITEMS[9] — scored here for the Power Hitting pillar
    "Lofted Hitting Confidence", // NEW: ability to clear the in-field on demand
    "Scoring Arc / Range",       // NEW: 360° range, all-ground scoring
];

// ═══ 8-PILLAR: LABELS & KEYS ═══
export const PILLAR_LABELS = [
    { k: "tm", l: "Technical Mastery", c: B.pk },
    { k: "te", l: "Tactical Execution", c: B.sky },
    { k: "pc", l: "Physical Conditioning", c: B.nv },
    { k: "mr", l: "Mental Resilience", c: B.prp },
    { k: "af", l: "Athletic Fielding", c: B.grn },
    { k: "mi", l: "Match Impact", c: B.org },
    { k: "pw", l: "Power Hitting", c: B.pk },
    { k: "sa", l: "Self-Awareness", c: B.bl },
];

// ═══ ARCHETYPE → PILLAR AFFINITY MAP ═══
// Which pillars each archetype emphasises (used for archetype alignment multiplier)
// Values sum to ~1.0 per archetype — the "expected profile shape"
export const BAT_ARCH_AFFINITY = {
    firestarter: { pw: 0.25, mi: 0.25, mr: 0.15, tm: 0.15, te: 0.10, af: 0.05, pc: 0.05, sa: 0 },
    controller: { te: 0.25, sa: 0.20, tm: 0.15, mr: 0.15, mi: 0.10, af: 0.05, pw: 0.05, pc: 0.05 },
    closer: { mr: 0.25, mi: 0.25, te: 0.15, tm: 0.15, sa: 0.10, pw: 0.05, af: 0.05, pc: 0 },
    dual: { tm: 0.20, af: 0.20, mi: 0.15, te: 0.15, mr: 0.10, pc: 0.10, pw: 0.05, sa: 0.05 },
    threesixty: { te: 0.25, pw: 0.20, tm: 0.15, mi: 0.15, sa: 0.10, mr: 0.05, af: 0.05, pc: 0.05 },
    spindom: { te: 0.25, tm: 0.25, mi: 0.15, sa: 0.10, mr: 0.10, af: 0.05, pw: 0.05, pc: 0.05 },
};

export const BWL_ARCH_AFFINITY = {
    hunter: { tm: 0.25, mi: 0.25, mr: 0.15, te: 0.10, pc: 0.10, pw: 0.05, af: 0.05, sa: 0.05 },
    weapon: { tm: 0.15, mi: 0.15, mr: 0.15, te: 0.15, pc: 0.15, pw: 0.05, af: 0.10, sa: 0.10 },
    squeeze: { te: 0.25, mr: 0.20, tm: 0.15, sa: 0.15, mi: 0.10, pc: 0.05, af: 0.05, pw: 0.05 },
    developer: { sa: 0.20, te: 0.15, tm: 0.15, mr: 0.15, pc: 0.15, af: 0.10, mi: 0.05, pw: 0.05 },
    death: { mr: 0.25, pw: 0.20, mi: 0.15, tm: 0.15, te: 0.10, pc: 0.05, af: 0.05, sa: 0.05 },
    express: { pc: 0.25, mi: 0.20, tm: 0.15, mr: 0.15, pw: 0.10, te: 0.05, af: 0.05, sa: 0.05 },
    containing: { te: 0.25, sa: 0.20, tm: 0.20, mr: 0.10, mi: 0.10, pc: 0.05, af: 0.05, pw: 0.05 },
};

// ═══ ARCHETYPE SIGNAL MAP — onboarding selections → archetype affinity ═══
// Each signal adds weight to specific archetypes when present in the player's onboarding data
export const BAT_SIGNAL_MAP = {
    // go-to shot → archetype affinities
    shots: {
        "Drive": { firestarter: 0.5, controller: 0.3, threesixty: 0.2 },
        "Pull": { firestarter: 0.5, threesixty: 0.3, closer: 0.2 },
        "Cut": { controller: 0.4, threesixty: 0.3, firestarter: 0.3 },
        "Sweep": { spindom: 0.5, controller: 0.3, threesixty: 0.2 },
        "Reverse Sweep": { threesixty: 0.5, spindom: 0.3, firestarter: 0.2 },
        "Ramp / Scoop": { threesixty: 0.6, firestarter: 0.3, closer: 0.1 },
        "Switch Hit": { threesixty: 0.7, firestarter: 0.2, spindom: 0.1 },
        "Flick": { controller: 0.4, threesixty: 0.3, closer: 0.3 },
        "Lap / Paddle": { threesixty: 0.5, controller: 0.3, closer: 0.2 },
        "Lofted Hit": { firestarter: 0.5, threesixty: 0.3, closer: 0.2 },
        "Late Cut": { controller: 0.5, threesixty: 0.3, spindom: 0.2 },
        "Upper Cut": { firestarter: 0.4, threesixty: 0.4, closer: 0.2 },
    },
    // batting phase preference → archetype affinities
    phases: {
        pp: { firestarter: 0.7, threesixty: 0.2, spindom: 0.1 },
        mid: { controller: 0.5, spindom: 0.3, threesixty: 0.2 },
        death: { closer: 0.6, firestarter: 0.2, dual: 0.2 },
    },
    // batting position → archetype affinities
    positions: {
        top: { firestarter: 0.5, controller: 0.3, threesixty: 0.2 },
        middle: { controller: 0.4, closer: 0.3, threesixty: 0.3 },
        lower: { closer: 0.5, dual: 0.3, firestarter: 0.2 },
        tail: { dual: 0.5, closer: 0.3, controller: 0.2 },
    },
    // comfort vs spin (high = 4-5)
    comfortSpin: { spindom: 0.5, controller: 0.3, threesixty: 0.2 },
    // comfort vs pace (high = 4-5)
    comfortPace: { firestarter: 0.4, closer: 0.3, threesixty: 0.3 },
};

export const PHASES = [{ id: "pp", nm: "POWERPLAY (1-6)" }, { id: "mid", nm: "MIDDLE (7-16)" }, { id: "death", nm: "DEATH (17-20)" }];

// ═══ VOICE QUESTIONS (position-indexed — NEVER reorder, append only) ═══

export const VOICE_QS = [
    "What part of your game are you most proud of?",
    "What's the one thing you most want to improve?",
    "Describe a match situation where you feel most confident.",
    "What does success look like in the next 12 weeks?",
    // ── Appended v2 ──
    "How would you describe your batting style in one sentence?",
    "What's your go-to shot or delivery under pressure?",
];

// ═══ T20 IDENTITY DATA (new for v2 onboarding expansion) ═══

export const BAT_POSITIONS = [
    { id: "top", label: "Top Order (1-3)" },
    { id: "middle", label: "Middle Order (4-5)" },
    { id: "lower", label: "Lower Order (6-7)" },
    { id: "tail", label: "Tail (8+)" },
];

export const BATTING_PHASE_PREFS = [
    { id: "pp", label: "Powerplay", icon: "⚡" },
    { id: "mid", label: "Middle Overs", icon: "🎯" },
    { id: "death", label: "Death Overs", icon: "🔥" },
];

export const BOWLING_PHASE_PREFS = [
    { id: "new", label: "New Ball", icon: "🔴" },
    { id: "mid", label: "Middle Overs", icon: "🎯" },
    { id: "death", label: "Death Overs", icon: "🔥" },
];

export const BOWLING_SPEEDS = [
    { id: "slow", label: "Slow (< 100 km/h)", range: "< 100" },
    { id: "medium", label: "Medium (100-120 km/h)", range: "100-120" },
    { id: "fast", label: "Fast (120-135 km/h)", range: "120-135" },
    { id: "express", label: "Express (135+ km/h)", range: "135+" },
];

export const GOTO_SHOTS = [
    "Drive", "Pull", "Cut", "Sweep", "Reverse Sweep",
    "Ramp / Scoop", "Switch Hit", "Flick", "Lap / Paddle",
    "Lofted Hit", "Late Cut", "Upper Cut",
];

export const PACE_VARIATIONS = [
    "Yorker", "Slower Ball", "Bouncer", "Cutter",
    "Knuckle Ball", "Wide-Line", "Back-of-Length",
];

export const SPIN_VARIATIONS = [
    "Wrong'un / Googly", "Arm Ball", "Top Spinner",
    "Slider", "Flipper", "Carrom Ball", "Undercutter",
];
