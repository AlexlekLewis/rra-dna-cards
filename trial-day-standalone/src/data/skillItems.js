// ═══ ROLES & ARCHETYPES — minimal extract for trial day ═══
import { B } from './theme';

export const ROLES = [
    { id: "batter", label: "Specialist Batter", sh: "BAT", dbId: "specialist_batter" },
    { id: "pace", label: "Pace Bowler", sh: "PACE", dbId: "pace_bowler" },
    { id: "spin", label: "Spin Bowler", sh: "SPIN", dbId: "spin_bowler" },
    { id: "keeper", label: "WK-Batter", sh: "WK", dbId: "wicketkeeper_batter" },
    { id: "allrounder", label: "Batting All-Rounder", sh: "AR", dbId: "batting_allrounder" },
];

export const BAT_ARCH = [
    { id: "firestarter", nm: "THE FIRESTARTER", sub: "Fast scorer from ball one.", c: B.pk },
    { id: "controller", nm: "THE CONTROLLER", sub: "Controls tempo, builds innings.", c: B.bl },
    { id: "closer", nm: "THE CLOSER", sub: "Calm under pressure, finishes games.", c: B.pk },
    { id: "dual", nm: "THE DUAL THREAT", sub: "Impact with bat and ball.", c: B.bl },
    { id: "threesixty", nm: "THE 360", sub: "Scores all around the ground.", c: B.sky },
    { id: "spindom", nm: "SPIN DOMINATOR", sub: "Dominates spin bowling.", c: B.prp },
];

export const BWL_ARCH = [
    { id: "hunter", nm: "WICKET HUNTER", sub: "Strike bowler, takes wickets.", c: B.pk },
    { id: "weapon", nm: "THE WEAPON", sub: "Takes wickets AND restricts runs.", c: B.bl },
    { id: "squeeze", nm: "THE SQUEEZE", sub: "Economy specialist, builds pressure.", c: B.bl },
    { id: "developer", nm: "THE DEVELOPER", sub: "Building their bowling game.", c: B.g400 },
    { id: "death", nm: "DEATH SPECIALIST", sub: "Owns the last 4 overs.", c: B.pk },
    { id: "express", nm: "EXPRESS PACE", sub: "Raw speed over 135 km/h.", c: B.nv },
    { id: "containing", nm: "CONTAINING SPINNER", sub: "Controls game with accuracy.", c: B.sky },
];
