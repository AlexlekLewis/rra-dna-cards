DROP TABLE IF EXISTS public.eligibility_rules CASCADE;
DROP TABLE IF EXISTS public.competition_tiers CASCADE;
DROP TABLE IF EXISTS public.vmcu_associations CASCADE;
DROP TABLE IF EXISTS public.vccl_regions CASCADE;
DROP TABLE IF EXISTS public.domain_weights CASCADE;
DROP TABLE IF EXISTS public.assessment_domains CASCADE;
DROP TABLE IF EXISTS public.engine_constants CASCADE;



CREATE TABLE public.engine_constants (
    constant_key text PRIMARY KEY,
    value text,
    data_type text,
    owner text,
    review_cadence text,
    description text
);

INSERT INTO public.engine_constants (constant_key, value, data_type, owner, review_cadence, description) VALUES ('arm_sensitivity_factor', 0.05, 'float', 'Head Coach', 'After each intake', 'Each year younger = +5% amplification');
INSERT INTO public.engine_constants (constant_key, value, data_type, owner, review_cadence, description) VALUES ('arm_floor', 0.8, 'float', 'Head Coach', 'As needed', 'Minimum ARM — prevents extreme dampening');
INSERT INTO public.engine_constants (constant_key, value, data_type, owner, review_cadence, description) VALUES ('arm_ceiling', 1.5, 'float', 'Head Coach', 'As needed', 'Maximum ARM — prevents extreme inflation');
INSERT INTO public.engine_constants (constant_key, value, data_type, owner, review_cadence, description) VALUES ('coach_weight', 0.75, 'float', 'Head Coach', 'Stable', 'Coach assessment weight in CSS blend');
INSERT INTO public.engine_constants (constant_key, value, data_type, owner, review_cadence, description) VALUES ('player_weight', 0.25, 'float', 'Head Coach', 'Stable', 'Player self-assessment weight in CSS blend');
INSERT INTO public.engine_constants (constant_key, value, data_type, owner, review_cadence, description) VALUES ('trajectory_age_threshold', 1.5, 'float', 'Head Coach', 'Annually', 'Years below midpoint to trigger flag');
INSERT INTO public.engine_constants (constant_key, value, data_type, owner, review_cadence, description) VALUES ('sagi_aligned_min', -0.5, 'float', 'Head Coach', 'Stable', 'SAGI range: aligned self-awareness lower bound');
INSERT INTO public.engine_constants (constant_key, value, data_type, owner, review_cadence, description) VALUES ('sagi_aligned_max', 0.5, 'float', 'Head Coach', 'Stable', 'SAGI range: aligned self-awareness upper bound');
INSERT INTO public.engine_constants (constant_key, value, data_type, owner, review_cadence, description) VALUES ('pdi_scale_max', 5, 'float', 'System', 'Fixed', 'PDI expressed as score out of 5.0');
INSERT INTO public.engine_constants (constant_key, value, data_type, owner, review_cadence, description) VALUES ('cohort_size_target', 120, 'int', 'Program', 'Per intake', 'Target cohort for normalisation');
INSERT INTO public.engine_constants (constant_key, value, data_type, owner, review_cadence, description) VALUES ('benchmark_ceiling_code', 'P1M', 'string', 'Head Coach + DoT', 'Annually', 'Competition code = CTI 1.00');



CREATE TABLE public.assessment_domains (
    domain_id text PRIMARY KEY,
    domain_name text,
    data_tier text,
    source_page text,
    item_count text,
    feeds_algorithm boolean,
    notes text
);

INSERT INTO public.assessment_domains (domain_id, domain_name, data_tier, source_page, item_count, feeds_algorithm, notes) VALUES ('technical', 'Technical Skill', 'TIER_1', 'Page 3', '10-14', TRUE, 'Primary + Secondary skill ratings (1-5)');
INSERT INTO public.assessment_domains (domain_id, domain_name, data_tier, source_page, item_count, feeds_algorithm, notes) VALUES ('game_iq', 'T20 Game Intelligence', 'TIER_1', 'Page 4', '6', TRUE, 'Phase awareness, decision-making');
INSERT INTO public.assessment_domains (domain_id, domain_name, data_tier, source_page, item_count, feeds_algorithm, notes) VALUES ('mental', 'Mental Performance', 'TIER_1', 'Page 4', '7', TRUE, 'Courage, curiosity, resilience, coachability');
INSERT INTO public.assessment_domains (domain_id, domain_name, data_tier, source_page, item_count, feeds_algorithm, notes) VALUES ('physical', 'Physical / Athletic', 'TIER_1', 'Page 4', '5', TRUE, 'Movement quality, athletic potential');
INSERT INTO public.assessment_domains (domain_id, domain_name, data_tier, source_page, item_count, feeds_algorithm, notes) VALUES ('phase', 'Phase Effectiveness', 'TIER_2', 'Page 2', '6', TRUE, '3 phases × 2 (bat + bowl) ratings');
INSERT INTO public.assessment_domains (domain_id, domain_name, data_tier, source_page, item_count, feeds_algorithm, notes) VALUES ('archetype', 'Archetype Profile', 'TIER_3', 'Page 2', NULL, FALSE, 'Classification only — bat & bowl archetype');
INSERT INTO public.assessment_domains (domain_id, domain_name, data_tier, source_page, item_count, feeds_algorithm, notes) VALUES ('player_voice', 'Player Voice', 'TIER_4', 'Page 5', NULL, FALSE, 'Qualitative — IDP narrative only');



CREATE TABLE public.domain_weights (
    role_id text PRIMARY KEY,
    role_label text,
    technical_weight numeric,
    game_iq_weight numeric,
    mental_weight numeric,
    physical_weight numeric,
    phase_weight numeric,
    notes text
);

INSERT INTO public.domain_weights (role_id, role_label, technical_weight, game_iq_weight, mental_weight, physical_weight, phase_weight, notes) VALUES ('specialist_batter', 'Specialist Batter', 0.35, 0.25, 0.2, 0.1, 0.1, 'Technical precision primary differentiator');
INSERT INTO public.domain_weights (role_id, role_label, technical_weight, game_iq_weight, mental_weight, physical_weight, phase_weight, notes) VALUES ('pace_bowler', 'Pace Bowler', 0.3, 0.2, 0.2, 0.2, 0.1, 'Physical elevated — eccentric strength, GRF');
INSERT INTO public.domain_weights (role_id, role_label, technical_weight, game_iq_weight, mental_weight, physical_weight, phase_weight, notes) VALUES ('spin_bowler', 'Spin Bowler', 0.35, 0.25, 0.2, 0.1, 0.1, 'Technical precision for spin');
INSERT INTO public.domain_weights (role_id, role_label, technical_weight, game_iq_weight, mental_weight, physical_weight, phase_weight, notes) VALUES ('wicketkeeper_batter', 'Wicketkeeper-Batter', 0.35, 0.2, 0.2, 0.15, 0.1, 'Physical elevated — lateral movement');
INSERT INTO public.domain_weights (role_id, role_label, technical_weight, game_iq_weight, mental_weight, physical_weight, phase_weight, notes) VALUES ('batting_allrounder', 'Batting All-Rounder', 0.3, 0.25, 0.2, 0.15, 0.1, 'Dual-discipline demands');



CREATE TABLE public.vccl_regions (
    region_code text PRIMARY KEY,
    region_name text,
    associations text,
    linked_premier_club text,
    has_direct_pathway boolean
);

INSERT INTO public.vccl_regions (region_code, region_name, associations, linked_premier_club, has_direct_pathway) VALUES ('R1', 'Barwon Rockets', 'Geelong CA, Bellarine Peninsula CA, Colac DCA, South West CA', 'Geelong CC', TRUE);
INSERT INTO public.vccl_regions (region_code, region_name, associations, linked_premier_club, has_direct_pathway) VALUES ('R2', 'Western Waves', 'Warrnambool DCA, Hamilton DCA, Portland CA', NULL, FALSE);
INSERT INTO public.vccl_regions (region_code, region_name, associations, linked_premier_club, has_direct_pathway) VALUES ('R3', 'Central Highlands', 'Ballarat CA, Buninyong DCA, Hepburn Shire CA, Creswick DCA', NULL, FALSE);
INSERT INTO public.vccl_regions (region_code, region_name, associations, linked_premier_club, has_direct_pathway) VALUES ('R4', 'Mallee Murray Suns', 'Mildura CA, Swan Hill CA, Kerang DCA', NULL, FALSE);
INSERT INTO public.vccl_regions (region_code, region_name, associations, linked_premier_club, has_direct_pathway) VALUES ('R5', 'Northern Rivers', 'Bendigo DCA, Castlemaine DCA, Campaspe Valley CA, Heathcote DCA', NULL, FALSE);
INSERT INTO public.vccl_regions (region_code, region_name, associations, linked_premier_club, has_direct_pathway) VALUES ('R6', 'North-East Knights', 'Albury-Wodonga CA, Benalla DCA, Murray Valley CA, Ovens & Murray CA', NULL, FALSE);
INSERT INTO public.vccl_regions (region_code, region_name, associations, linked_premier_club, has_direct_pathway) VALUES ('R7', 'Gippsland Pride', 'Sale-Maffra CA, Cricket Latrobe Valley, Warragul DCA, Bairnsdale CA, Leongatha DCA', NULL, FALSE);
INSERT INTO public.vccl_regions (region_code, region_name, associations, linked_premier_club, has_direct_pathway) VALUES ('R8', 'SE Country Sharks', 'Mornington Peninsula CA, Westernport CA, Frankston DCA, Bass Coast CA', 'Frankston Peninsula CC', TRUE);



CREATE TABLE public.vmcu_associations (
    abbrev text PRIMARY KEY,
    full_name text,
    type text,
    surface text,
    region_notes text
);

INSERT INTO public.vmcu_associations (abbrev, full_name, type, surface, region_notes) VALUES ('ECA', 'Eastern Cricket Association', 'Sr+Jr+Girls+Vets', 'Turf & Synth', 'Inner/Outer East — 50+ clubs');
INSERT INTO public.vmcu_associations (abbrev, full_name, type, surface, region_notes) VALUES ('BHRDCA', 'Box Hill Reporter District CA', 'Sr+Jr+Girls', 'Turf & Synth', 'Outer East');
INSERT INTO public.vmcu_associations (abbrev, full_name, type, surface, region_notes) VALUES ('DDCA', 'Dandenong District CA', 'Sr+Jr+Girls', 'Turf & Synth', 'South East — large, strong turf');
INSERT INTO public.vmcu_associations (abbrev, full_name, type, surface, region_notes) VALUES ('DVCA', 'Diamond Valley CA', 'Sr+Jr+Girls', 'Turf & Synth', 'North East');
INSERT INTO public.vmcu_associations (abbrev, full_name, type, surface, region_notes) VALUES ('CSB', 'Cricket Southern Bayside', 'Sr+Jr+Girls', 'Turf & Synth', 'Bayside');
INSERT INTO public.vmcu_associations (abbrev, full_name, type, surface, region_notes) VALUES ('FTGDCA', 'Ferntree Gully & District CA', 'Sr+Jr+Girls', 'Turf & Synth', 'Outer East');
INSERT INTO public.vmcu_associations (abbrev, full_name, type, surface, region_notes) VALUES ('MPCA', 'Mornington Peninsula CA', 'Sr+Jr+Girls', 'Turf & Synth', 'Peninsula');
INSERT INTO public.vmcu_associations (abbrev, full_name, type, surface, region_notes) VALUES ('NMCA', 'North Metro CA', 'Sr+Jr', 'Turf & Synth', 'Northern suburbs');
INSERT INTO public.vmcu_associations (abbrev, full_name, type, surface, region_notes) VALUES ('NWMCA', 'North West Metro CA', 'Sr+Jr', 'Turf & Synth', 'NW suburbs');
INSERT INTO public.vmcu_associations (abbrev, full_name, type, surface, region_notes) VALUES ('RDCA', 'Ringwood District CA', 'Sr+Jr+Girls', 'Turf & Synth', 'Outer East');
INSERT INTO public.vmcu_associations (abbrev, full_name, type, surface, region_notes) VALUES ('SECA', 'South East CA', 'Sr+Jr+Girls', 'Mostly Synth', 'SE — 120+ sr, 280+ jr teams');
INSERT INTO public.vmcu_associations (abbrev, full_name, type, surface, region_notes) VALUES ('SCA', 'Southern CA', 'Sr+Jr', 'Synthetic', 'Southern suburbs');
INSERT INTO public.vmcu_associations (abbrev, full_name, type, surface, region_notes) VALUES ('CSMCA', 'Casey South Melbourne CA', 'Sr+Jr', 'Turf & Synth', 'SE growth corridor');
INSERT INTO public.vmcu_associations (abbrev, full_name, type, surface, region_notes) VALUES ('YVCA', 'Yarra Valley CA', 'Sr+Jr', 'Various', 'Outer East semi-regional');
INSERT INTO public.vmcu_associations (abbrev, full_name, type, surface, region_notes) VALUES ('WDCA', 'Williamstown & Districts CA', 'Sr+Jr', 'Various', 'Western suburbs');
INSERT INTO public.vmcu_associations (abbrev, full_name, type, surface, region_notes) VALUES ('WRJCA', 'Western Region Junior CA', 'Junior only', 'Various', 'Western suburbs');
INSERT INTO public.vmcu_associations (abbrev, full_name, type, surface, region_notes) VALUES ('MCA', 'Melbourne CA', 'Senior', 'Various', 'Inner Melbourne');
INSERT INTO public.vmcu_associations (abbrev, full_name, type, surface, region_notes) VALUES ('VTCA', 'Victorian Turf CA', 'Sr+Jr', 'Turf', 'Metro-wide turf — Turner Shield');
INSERT INTO public.vmcu_associations (abbrev, full_name, type, surface, region_notes) VALUES ('Mercantile', 'Mercantile CA', 'Senior', 'Synthetic', 'Midweek format');



CREATE TABLE public.competition_tiers (
    code text PRIMARY KEY,
    tier text,
    competition_name text,
    shield_name text,
    gender text,
    age_group text,
    format text,
    cti_value numeric,
    expected_midpoint_age numeric,
    arm_sensitivity numeric,
    active boolean,
    notes text
);

INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CA-M', 'NATIONAL', 'Australian Men''s Team', NULL, 'M', 'Open', 'All', 1.0, 28.0, 0.05, TRUE, 'Absolute ceiling');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CA-F', 'NATIONAL', 'Australian Women''s Team', NULL, 'F', 'Open', 'All', 1.0, 26.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CA-AM', 'NATIONAL', 'Australia A — Men''s', NULL, 'M', 'Open', 'Multi', 0.97, 24.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CA-AF', 'NATIONAL', 'Australia A — Women''s', NULL, 'F', 'Open', 'Multi', 0.97, 23.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CA-19M', 'NATIONAL', 'U19 National Championships — M', NULL, 'M', 'U19', 'Multi-day+OD', 0.9, 18.0, 0.05, TRUE, 'State teams');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CA-19F', 'NATIONAL', 'U19 National Championships — F', NULL, 'F', 'U19', 'Multi-day+OD', 0.9, 17.5, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CA-17M', 'NATIONAL', 'U17 National Championships', NULL, 'M', 'U17', 'Multi-day', 0.85, 16.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CA-16F', 'NATIONAL', 'U16 National Championships', NULL, 'F', 'U16', 'Multi', 0.85, 15.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CA-ACC', 'NATIONAL', 'Australian Country Championships', NULL, 'M/F', 'Open', 'OD', 0.75, 26.0, 0.05, TRUE, 'VIC Country rep');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CA-SSA15', 'NATIONAL', 'SSA U15 Championships', NULL, 'Mixed', 'U15', 'OD', 0.7, 14.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CA-SSA12', 'NATIONAL', 'SSA U12 Championships', NULL, 'Mixed', 'U12', 'OD', 0.6, 11.5, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('VIC-SS', 'STATE', 'Sheffield Shield', NULL, 'M', 'Open', '4-day FC', 0.98, 27.0, 0.05, TRUE, 'Professional FC');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('VIC-OD', 'STATE', 'Marsh One-Day Cup', NULL, 'M', 'Open', 'OD 50-over', 0.93, 27.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('VIC-BBL', 'STATE', 'BBL (Stars / Renegades)', NULL, 'M', 'Open', 'T20', 0.93, 27.0, 0.05, TRUE, 'Professional T20');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('VIC-WNCL', 'STATE', 'WNCL', NULL, 'F', 'Open', 'OD 50-over', 0.93, 25.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('VIC-WBBL', 'STATE', 'WBBL (Stars / Renegades)', NULL, 'F', 'Open', 'T20', 0.93, 24.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('VIC-2XI', 'STATE', 'Victorian 2nd XI', NULL, 'M', 'Open', 'Multi', 0.88, 22.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('VP-19M', 'STATE_PATHWAY', 'VIC U19 Emerging (Metro)', NULL, 'M', 'U19', 'Multi', 0.85, 18.0, 0.05, TRUE, 'CV selection');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('VP-19MC', 'STATE_PATHWAY', 'VIC U19 Emerging (Country)', NULL, 'M', 'U19', 'Multi', 0.85, 18.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('VP-17M', 'STATE_PATHWAY', 'VIC U17 Emerging (Metro)', NULL, 'M', 'U17', 'Multi', 0.8, 16.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('VP-17MC', 'STATE_PATHWAY', 'VIC U17 Emerging (Country)', NULL, 'M', 'U17', 'Multi', 0.8, 16.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('VP-19F', 'STATE_PATHWAY', 'VIC U19 Female Emerging', NULL, 'F', 'U19', 'Multi', 0.85, 17.5, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('VP-16F', 'STATE_PATHWAY', 'VIC U16 Female Emerging', NULL, 'F', 'U16', 'Multi', 0.8, 15.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('VP-CC16M', 'STATE_PATHWAY', 'Country Cup — U16 Male', NULL, 'M', 'U16', 'OD', 0.7, 15.0, 0.05, TRUE, 'VCCL regions');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('VP-CC15F', 'STATE_PATHWAY', 'Country Cup — U15 Female', NULL, 'F', 'U15', 'OD', 0.7, 14.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('P1M', 'PREMIER', 'Premier Cricket 1st XI — Men''s', NULL, 'M', 'Open', '2-day/OD/T20', 1.0, 24.0, 0.05, TRUE, 'BENCHMARK CEILING — 18 clubs');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('P2M', 'PREMIER', 'Premier Cricket 2nd XI — Men''s', NULL, 'M', 'Open', '2-day/OD/T20', 0.85, 22.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('P3M', 'PREMIER', 'Premier Cricket 3rd XI — Men''s', NULL, 'M', 'Open', '2-day/OD', 0.75, 21.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('P4M', 'PREMIER', 'Premier Cricket 4th XI — Men''s', NULL, 'M', 'Open', 'OD', 0.65, 20.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('P1F', 'PREMIER', 'Premier Cricket 1st XI — Women''s', NULL, 'F', 'Open', 'OD/T20', 0.85, 22.0, 0.05, TRUE, '10 clubs');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('P2F', 'PREMIER', 'Premier Cricket 2nd XI — Women''s', NULL, 'F', 'Open', 'OD', 0.7, 20.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('P18M', 'PREMIER_UAGE', 'Premier U18 — Male', NULL, 'M', 'U18', 'OD', 0.75, 16.5, 0.05, TRUE, 'Ages 16-17 at 1 Sep');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('P18F', 'PREMIER_UAGE', 'Premier U18 — Female', NULL, 'F', 'U18', 'OD', 0.7, 16.0, 0.05, TRUE, 'Ages 15-17 at 1 Sep');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('P16M', 'PREMIER_UAGE', 'Dowling Shield', 'Dowling Shield', 'M', 'U16', 'OD', 0.75, 14.5, 0.05, TRUE, 'Ages 14-15 at 1 Sep');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('P15F', 'PREMIER_UAGE', 'Marg Jennings Cup', 'Marg Jennings Cup', 'F', 'U15', 'OD', 0.65, 13.0, 0.05, TRUE, 'Ages 12-14 at 1 Sep');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('PA', 'PREMIER_UAGE', 'Premier Academy Only', NULL, 'Mixed', 'Varies', 'Training', 0.55, 14.0, 0.05, TRUE, 'No comp matches yet');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('SD1', 'SUB_DISTRICT', 'VSDCA 1st XI', NULL, 'M', 'Open', '2-day/OD', 0.7, 24.0, 0.05, TRUE, '32 clubs');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('SD2', 'SUB_DISTRICT', 'VSDCA 2nd XI', NULL, 'M', 'Open', '2-day/OD', 0.6, 22.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('SD3', 'SUB_DISTRICT', 'VSDCA 3rd XI', NULL, 'M', 'Open', '2-day/OD', 0.55, 21.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('SD4', 'SUB_DISTRICT', 'VSDCA 4th XI', NULL, 'M', 'Open', 'OD', 0.5, 20.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('SD-15', 'SUB_DISTRICT', 'J.G. Craig Shield', 'J.G. Craig Shield', 'M', 'U15', 'OD', 0.6, 14.0, 0.05, TRUE, '32 clubs, Jan');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('SD-V1', 'SUB_DISTRICT', 'VTCA Senior Division', 'Turner Shield', 'M', 'Open', '2-day/OD', 0.7, 24.0, 0.05, TRUE, 'Equal tier with VSDCA');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('SD-V2', 'SUB_DISTRICT', 'VTCA Division 1', NULL, 'M', 'Open', '2-day/OD', 0.6, 23.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('SD-V3', 'SUB_DISTRICT', 'VTCA Division 2+', NULL, 'M', 'Open', 'Various', 0.5, 22.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CS-1T', 'COMMUNITY_SR', 'Association 1st XI — Turf', NULL, 'M', 'Open', '2-day', 0.55, 24.0, 0.05, TRUE, 'e.g. ECA Dunstan, DDCA 1st');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CS-2T', 'COMMUNITY_SR', 'Association 2nd XI — Turf', NULL, 'M', 'Open', '2-day', 0.5, 22.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CS-3T', 'COMMUNITY_SR', 'Association 3rd-4th XI — Turf', NULL, 'M', 'Open', '2-day', 0.45, 21.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CS-5T', 'COMMUNITY_SR', 'Association 5th+ XI — Turf', NULL, 'M', 'Open', 'Reduced', 0.4, 20.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CS-1S', 'COMMUNITY_SR', 'Association 1st XI — Synthetic', NULL, 'M', 'Open', '2-day', 0.5, 23.0, 0.05, TRUE, 'e.g. ECA Macgibbon');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CS-2S', 'COMMUNITY_SR', 'Association 2nd XI — Synthetic', NULL, 'M', 'Open', '2-day', 0.45, 22.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CS-3S', 'COMMUNITY_SR', 'Association 3rd+ XI — Synthetic', NULL, 'M', 'Open', 'Various', 0.4, 21.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CS-LOC', 'COMMUNITY_SR', 'Limited Overs Comp (top grade)', NULL, 'M', 'Open', 'LOC', 0.45, 22.0, 0.05, TRUE, 'LOC1 strongest');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CS-SUN', 'COMMUNITY_SR', 'Sunday Turf Grades', NULL, 'M', 'Open', 'OD', 0.45, 22.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('RY-1T', 'COUNTRY_SR', 'Country Assoc — Premier/1st Turf', NULL, 'M', 'Open', '2-day/OD', 0.55, 24.0, 0.05, TRUE, 'e.g. BDCA Prem, GCA Div1');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('RY-2T', 'COUNTRY_SR', 'Country Assoc — 2nd Grade Turf', NULL, 'M', 'Open', '2-day/OD', 0.45, 22.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('RY-3T', 'COUNTRY_SR', 'Country Assoc — 3rd+ Turf', NULL, 'M', 'Open', 'OD', 0.4, 21.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('RY-1S', 'COUNTRY_SR', 'Country Assoc — 1st Synthetic', NULL, 'M', 'Open', 'OD', 0.45, 24.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('RY-2S', 'COUNTRY_SR', 'Country Assoc — Lower Synthetic', NULL, 'M', 'Open', 'OD', 0.35, 21.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('RY-1F', 'COUNTRY_SR', 'Country Assoc — Women''s Top', NULL, 'F', 'Open', 'OD', 0.45, 22.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('RY-CW', 'COUNTRY_REP', 'VCCL Country Week — Sr Men', NULL, 'M', 'Open', 'OD', 0.6, 26.0, 0.05, TRUE, 'Annual carnival Melb');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('RY-CWF', 'COUNTRY_REP', 'VCCL Country Week — Sr Women', NULL, 'F', 'Open', 'OD', 0.55, 24.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('RY-JCW', 'COUNTRY_REP', 'VCCL Junior Country Week', NULL, 'Mixed', 'U14-U16', 'OD', 0.5, 14.0, 0.05, TRUE, 'Country equiv of VMCU');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('RY-J18', 'COUNTRY_JR', 'Country Assoc — U18/U17', NULL, 'Mixed', 'U17-U18', 'OD', 0.4, 16.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('RY-J16', 'COUNTRY_JR', 'Country Assoc — U16/U15', NULL, 'Mixed', 'U15-U16', 'OD', 0.35, 14.5, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('RY-J14', 'COUNTRY_JR', 'Country Assoc — U14/U13', NULL, 'Mixed', 'U13-U14', 'OD', 0.3, 13.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('RY-J12', 'COUNTRY_JR', 'Country Assoc — U12/U11', NULL, 'Mixed', 'U11-U12', 'Modified', 0.25, 11.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CJ-18A', 'COMMUNITY_JR', 'Association U18 — A Grade', NULL, 'M', 'U18', 'OD', 0.45, 16.5, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CJ-18B', 'COMMUNITY_JR', 'Association U18 — B/C', NULL, 'M', 'U18', 'OD', 0.35, 16.5, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CJ-16A', 'COMMUNITY_JR', 'Association U16 — A Grade', NULL, 'M', 'U16', 'OD', 0.4, 15.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CJ-16B', 'COMMUNITY_JR', 'Association U16 — B Grade', NULL, 'M', 'U16', 'OD', 0.35, 15.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CJ-16C', 'COMMUNITY_JR', 'Association U16 — C+', NULL, 'M', 'U16', 'OD', 0.3, 15.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CJ-14A', 'COMMUNITY_JR', 'Association U14 — A Grade', NULL, 'M', 'U14', 'OD', 0.35, 13.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CJ-14B', 'COMMUNITY_JR', 'Association U14 — B', NULL, 'M', 'U14', 'OD', 0.3, 13.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CJ-14C', 'COMMUNITY_JR', 'Association U14 — C+', NULL, 'M', 'U14', 'OD', 0.25, 13.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CJ-12A', 'COMMUNITY_JR', 'Association U12 — A Grade', NULL, 'M', 'U12', 'OD', 0.3, 11.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CJ-12B', 'COMMUNITY_JR', 'Association U12 — B', NULL, 'M', 'U12', 'OD', 0.25, 11.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CJ-12C', 'COMMUNITY_JR', 'Association U12 — C+', NULL, 'M', 'U12', 'OD', 0.2, 11.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CJ-10', 'COMMUNITY_JR', 'Association U10', NULL, 'Mixed', 'U10', 'Modified', 0.18, 9.5, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CW-1', 'COMMUNITY_WG', 'Association Sr Women — Top', NULL, 'F', 'Open', 'OD', 0.45, 22.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CW-S', 'COMMUNITY_WG', 'Association Sr Women — Social', NULL, 'F', 'Open', 'OD/T20', 0.35, 22.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CG-1', 'COMMUNITY_WG', 'Girls Stage 1 (U18)', NULL, 'F', 'U18', 'Modified', 0.35, 16.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CG-2', 'COMMUNITY_WG', 'Girls Stage 2 (U15)', NULL, 'F', 'U15', 'Modified', 0.3, 14.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CG-3', 'COMMUNITY_WG', 'Girls Stage 3 (U12)', NULL, 'F', 'U12', 'Modified', 0.25, 11.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('REP-17M', 'VMCU_REP', 'Beitzel Shield (U17)', 'Beitzel Shield', 'M', 'U17', 'OD', 0.55, 15.5, 0.05, TRUE, '2026 merged');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('REP-16M', 'VMCU_REP', 'Keith Mackay Shield', 'Keith Mackay Shield', 'M', 'U16', 'OD', 0.45, 15.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('REP-14MT', 'VMCU_REP', 'Russell Allen Shield', 'Russell Allen Shield', 'M', 'U14', 'OD', 0.5, 13.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('REP-13M', 'VMCU_REP', 'Des Nolan Cup (U13)', 'Des Nolan Cup', 'M', 'U13', 'OD', 0.4, 12.5, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('REP-12M', 'VMCU_REP', 'Keith Mitchell Shield', 'Keith Mitchell Shield', 'M', 'U12', 'Modified', 0.35, 11.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('REP-12M2', 'VMCU_REP', 'Josh Browne Plate', 'Josh Browne Plate', 'M', 'U12', 'Modified', 0.3, 11.0, 0.05, TRUE, '2nd tier U12');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('REP-17F', 'VMCU_REP', 'Mel Jones Shield', 'Mel Jones Shield', 'F', 'U17', 'OD', 0.5, 15.5, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('REP-14F', 'VMCU_REP', 'Julie Savage Shield', 'Julie Savage Shield', 'F', 'U14', 'OD', 0.4, 13.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('REP-12F', 'VMCU_REP', 'Claudia Fatone Shield', 'Claudia Fatone Shield', 'F', 'U12', 'Modified', 0.3, 11.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('EN-CB', 'ENTRY', 'Woolworths Cricket Blast', NULL, 'Mixed', 'U7-U12', 'Modified', 0.12, 8.0, 0.05, TRUE, 'Participation');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('EN-SC', 'ENTRY', 'School / In2Cricket', NULL, 'Mixed', 'Various', 'Modified', 0.12, 10.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('EN-NR', 'ENTRY', 'No Recorded History', NULL, 'Mixed', NULL, NULL, 0.1, 12.0, 0.05, TRUE, 'Default for new/unknown');



CREATE TABLE public.eligibility_rules (
    competition_code text PRIMARY KEY REFERENCES public.competition_tiers(code),
    competition_name text,
    eligibility text,
    excluded_from text,
    source text
);

INSERT INTO public.eligibility_rules (competition_code, competition_name, eligibility, excluded_from, source) VALUES ('P16M', 'Dowling Shield', '14-15 yrs at 1 Sep', 'Craig, Beitzel, Mackay, Savage shields', 'CV Pathway');
INSERT INTO public.eligibility_rules (competition_code, competition_name, eligibility, excluded_from, source) VALUES ('P15F', 'Marg Jennings Cup', '12-14 yrs at 1 Sep', 'Craig, Beitzel, Mackay, Savage shields', 'CV Pathway');
INSERT INTO public.eligibility_rules (competition_code, competition_name, eligibility, excluded_from, source) VALUES ('P18M', 'Premier U18 Male', '16-17 yrs at 1 Sep', 'Dowling/Marg Jennings', 'CV Pathway');
INSERT INTO public.eligibility_rules (competition_code, competition_name, eligibility, excluded_from, source) VALUES ('P18F', 'Premier U18 Female', '15-17 yrs at 1 Sep', 'Dowling/Marg Jennings', 'CV Pathway');
INSERT INTO public.eligibility_rules (competition_code, competition_name, eligibility, excluded_from, source) VALUES ('SD-15', 'J.G. Craig Shield', 'Under 15', 'Dowling/Marg Jennings', 'CV Pathway');
INSERT INTO public.eligibility_rules (competition_code, competition_name, eligibility, excluded_from, source) VALUES ('REP-*', 'VMCU Carnival shields', 'Per shield age group', 'Dowling/Marg Jennings', 'CV Pathway');
INSERT INTO public.eligibility_rules (competition_code, competition_name, eligibility, excluded_from, source) VALUES ('PA', 'Premier Academy', 'Club sets criteria', 'Only 1 academy at a time', 'CV Pathway');
INSERT INTO public.eligibility_rules (competition_code, competition_name, eligibility, excluded_from, source) VALUES ('VP-CC*', 'Country Cup', 'U16M/U15F country only', 'Not Barwon/SE Sharks regions', 'CV Pathway');

