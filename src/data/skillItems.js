// ═══ SKILL ITEMS, ARCHETYPES, ROLES, PHASES, VOICE ═══
import { B } from './theme';

export const ROLES = [
    { id: "batter", label: "Specialist Batter", sh: "BAT", dbId: "specialist_batter" },
    { id: "pace", label: "Pace Bowler", sh: "PACE", dbId: "pace_bowler" },
    { id: "spin", label: "Spin Bowler", sh: "SPIN", dbId: "spin_bowler" },
    { id: "keeper", label: "WK-Batter", sh: "WK", dbId: "wicketkeeper_batter" },
    { id: "allrounder", label: "Batting All-Rounder", sh: "AR", dbId: "batting_allrounder" },
];

export const BAT_ARCH = [
    { id: "firestarter", nm: "THE FIRESTARTER", sub: "Lights up the Powerplay.", c: B.pk },
    { id: "controller", nm: "THE CONTROLLER", sub: "Dictates tempo. Finds gaps.", c: B.bl },
    { id: "closer", nm: "THE CLOSER", sub: "Gets the job done under pressure.", c: B.pk },
    { id: "dual", nm: "THE DUAL THREAT", sub: "Dangerous with bat and ball.", c: B.bl },
];

export const BWL_ARCH = [
    { id: "hunter", nm: "WICKET HUNTER", sub: "Hunts breakthroughs. Strike bowler.", c: B.pk },
    { id: "weapon", nm: "THE WEAPON", sub: "Shuts you down AND gets you out.", c: B.bl },
    { id: "squeeze", nm: "THE SQUEEZE", sub: "Suffocates scoring. Builds pressure.", c: B.bl },
    { id: "developer", nm: "THE DEVELOPER", sub: "Building their game. Clear path.", c: B.g400 },
];

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

export const VOICE_QS = ["What part of your game are you most proud of?", "What's the one thing you most want to improve?", "Describe a match situation where you feel most confident.", "What does success look like in the next 12 weeks?"];
