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
    { id: "firestarter", nm: "THE FIRESTARTER", sub: "Lights up the Powerplay.", c: B.pk },
    { id: "controller", nm: "THE CONTROLLER", sub: "Dictates tempo. Finds gaps.", c: B.bl },
    { id: "closer", nm: "THE CLOSER", sub: "Gets the job done under pressure.", c: B.pk },
    { id: "dual", nm: "THE DUAL THREAT", sub: "Dangerous with bat and ball.", c: B.bl },
    // ── Appended v2 ──
    { id: "threesixty", nm: "THE 360°", sub: "Scores all around the ground. Impossible to set a field.", c: B.sky },
    { id: "spindom", nm: "SPIN DOMINATOR", sub: "Reads and destroys spin. Controls the middle overs.", c: B.prp },
];

export const BWL_ARCH = [
    { id: "hunter", nm: "WICKET HUNTER", sub: "Hunts breakthroughs. Strike bowler.", c: B.pk },
    { id: "weapon", nm: "THE WEAPON", sub: "Shuts you down AND gets you out.", c: B.bl },
    { id: "squeeze", nm: "THE SQUEEZE", sub: "Suffocates scoring. Builds pressure.", c: B.bl },
    { id: "developer", nm: "THE DEVELOPER", sub: "Building their game. Clear path.", c: B.g400 },
    // ── Appended v2 ──
    { id: "death", nm: "DEATH SPECIALIST", sub: "Owns overs 17-20. Yorkers and variations.", c: B.pk },
    { id: "express", nm: "EXPRESS PACE", sub: "Raw speed. Intimidation. Over 135km/h.", c: B.nv },
    { id: "containing", nm: "CONTAINING SPINNER", sub: "Controls the tempo. Economy is the weapon.", c: B.sky },
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
