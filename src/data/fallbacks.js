// ═══ FALLBACK DATA — Used when Supabase fetch fails ═══

export const FALLBACK_RW = {
    batter: { t: .35, i: .25, m: .20, h: .10, ph: .10 },
    pace: { t: .30, i: .20, m: .20, h: .20, ph: .10 },
    spin: { t: .35, i: .25, m: .20, h: .10, ph: .10 },
    keeper: { t: .35, i: .20, m: .20, h: .15, ph: .10 },
    allrounder: { t: .30, i: .25, m: .20, h: .15, ph: .10 },
};

export const FALLBACK_CONST = {
    arm_sensitivity_factor: 0.05,
    arm_floor: 0.80,
    arm_ceiling: 1.50,
    coach_weight: 0.75,
    player_weight: 0.25,
    sagi_aligned_min: -0.5,
    sagi_aligned_max: 0.5,
    trajectory_age_threshold: 1.5,
    pdi_scale_max: 5,
};
