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
