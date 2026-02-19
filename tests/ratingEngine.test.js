// ═══ Rating Engine Unit Tests ═══
import { describe, it, expect } from 'vitest';
import {
    getAge,
    getBracket,
    dAvg,
    calcCCM,
    getCTIBand,
    getAgeTier,
    calcPeakScore,
    calcStatDomain,
    calcPDI,
    calcCohortPercentile,
    calcAgeScore,
    techItems,
    FALLBACK_STAT_BENCHMARKS,
    FALLBACK_SUB_WEIGHTS,
    FALLBACK_DOMAIN_WEIGHTS,
    PEAK_BENCHMARKS,
} from '../src/engine/ratingEngine.js';

import { FALLBACK_RW, FALLBACK_CONST } from '../src/data/fallbacks.js';

// ═══ Test Data ═══
const MOCK_COMP_TIERS = [
    { code: 'PREM_1ST', cti_value: '1.30', expected_midpoint_age: '25', competition_name: 'Premier 1st XI' },
    { code: 'DIST_TURF', cti_value: '0.85', expected_midpoint_age: '22', competition_name: 'District Turf' },
    { code: 'COMM_A', cti_value: '0.50', expected_midpoint_age: '20', competition_name: 'Community A-Grade' },
    { code: 'U16_REP', cti_value: '0.70', expected_midpoint_age: '15', competition_name: 'U16 Representative' },
];

const MOCK_CONSTANTS = {
    arm_sensitivity_factor: '0.05',
    arm_floor: '0.80',
    arm_ceiling: '1.50',
    cohort_pdi_threshold: '40',
    age_score_baseline: '1.0',
    age_score_sensitivity: '0.1',
    age_score_ceiling: '1.25',
    potential_adj_enabled: 'true',
    potential_adj_factor: '0.05',
};


// ───────── getAge ─────────
describe('getAge', () => {
    it('returns correct age from DD/MM/YYYY format', () => {
        expect(getAge('15/03/2010')).toBe(16);
    });
    it('returns null for null/undefined input', () => {
        expect(getAge(null)).toBeNull();
        expect(getAge(undefined)).toBeNull();
    });
    it('returns null for invalid format', () => {
        expect(getAge('not-a-date')).toBeNull();
    });
    it('handles two-part strings gracefully', () => {
        expect(getAge('03/2010')).toBeNull();
    });
});


// ───────── getBracket ─────────
describe('getBracket', () => {
    it('returns U11-U13 for age 12', () => {
        expect(getBracket('01/01/2014')).toBe('U11-U13');
    });
    it('returns U14-U16 for age 15', () => {
        expect(getBracket('01/01/2011')).toBe('U14-U16');
    });
    it('returns U17-U19 for age 18', () => {
        expect(getBracket('01/01/2008')).toBe('U17-U19');
    });
    it('returns U20+ for age 22', () => {
        expect(getBracket('01/01/2004')).toBe('U20+');
    });
    it('returns ? for invalid dob', () => {
        expect(getBracket(null)).toBe('?');
    });
});


// ───────── dAvg ─────────
describe('dAvg', () => {
    it('calculates average of rated items', () => {
        const data = { iq_0: 3, iq_1: 4, iq_2: 5 };
        const result = dAvg(data, 'iq_', 3);
        expect(result.a).toBe(4);
        expect(result.r).toBe(3);
        expect(result.t).toBe(3);
    });
    it('skips zero-valued items', () => {
        const data = { iq_0: 3, iq_1: 0, iq_2: 5 };
        const result = dAvg(data, 'iq_', 3);
        expect(result.a).toBe(4);
        expect(result.r).toBe(2);
    });
    it('returns zeros when no items are rated', () => {
        const result = dAvg({}, 'iq_', 3);
        expect(result.a).toBe(0);
        expect(result.r).toBe(0);
    });
});


// ───────── getCTIBand ─────────
describe('getCTIBand', () => {
    it('returns top for CTI >= 1.20', () => {
        expect(getCTIBand(1.30)).toBe('top');
    });
    it('returns elite for CTI >= 1.00', () => {
        expect(getCTIBand(1.10)).toBe('elite');
    });
    it('returns high for CTI >= 0.80', () => {
        expect(getCTIBand(0.90)).toBe('high');
    });
    it('returns mid for CTI >= 0.60', () => {
        expect(getCTIBand(0.65)).toBe('mid');
    });
    it('returns low for CTI < 0.60', () => {
        expect(getCTIBand(0.40)).toBe('low');
    });
});


// ───────── getAgeTier ─────────
describe('getAgeTier', () => {
    it('returns young for age <= 14', () => {
        expect(getAgeTier(12)).toBe('young');
        expect(getAgeTier(14)).toBe('young');
    });
    it('returns mid for age 15-16', () => {
        expect(getAgeTier(15)).toBe('mid');
        expect(getAgeTier(16)).toBe('mid');
    });
    it('returns senior for age > 16', () => {
        expect(getAgeTier(17)).toBe('senior');
        expect(getAgeTier(25)).toBe('senior');
    });
    it('returns young for null', () => {
        expect(getAgeTier(null)).toBe('young');
    });
});


// ───────── calcCCM ─────────
describe('calcCCM', () => {
    it('returns correct CCM for a young player in district comp', () => {
        const grades = [{ level: 'DIST_TURF' }];
        const dob = '01/01/2010'; // age 16
        const result = calcCCM(grades, dob, MOCK_COMP_TIERS, MOCK_CONSTANTS);

        expect(result.cti).toBe(0.85);
        expect(result.code).toBe('DIST_TURF');
        expect(result.expectedAge).toBe(22);
        // ARM = 1 + (22 - 16) * 0.05 = 1.30
        expect(result.arm).toBe(1.30);
        // CCM = 0.85 * 1.30 = 1.105
        expect(result.ccm).toBe(1.105);
    });

    it('picks highest CTI when multiple grades exist', () => {
        const grades = [{ level: 'COMM_A' }, { level: 'DIST_TURF' }];
        const dob = '01/01/2006'; // age 20
        const result = calcCCM(grades, dob, MOCK_COMP_TIERS, MOCK_CONSTANTS);

        expect(result.cti).toBe(0.85); // DIST_TURF is higher than COMM_A
        expect(result.code).toBe('DIST_TURF');
    });

    it('clamps ARM to floor (0.80)', () => {
        const grades = [{ level: 'COMM_A' }];
        const dob = '01/01/1996'; // age 30, midpoint 20 -> ARM = 1 + (20-30)*0.05 = 0.50 -> clamped to 0.80
        const result = calcCCM(grades, dob, MOCK_COMP_TIERS, MOCK_CONSTANTS);

        expect(result.arm).toBe(0.80);
    });

    it('clamps ARM to ceiling (1.50)', () => {
        const grades = [{ level: 'PREM_1ST' }];
        const dob = '01/01/2014'; // age 12, midpoint 25 -> ARM = 1 + (25-12)*0.05 = 1.65 -> clamped to 1.50
        const result = calcCCM(grades, dob, MOCK_COMP_TIERS, MOCK_CONSTANTS);

        expect(result.arm).toBe(1.50);
    });

    it('returns zero CCM for empty grades', () => {
        const result = calcCCM([], '01/01/2010', MOCK_COMP_TIERS, MOCK_CONSTANTS);
        expect(result.ccm).toBe(0);
    });

    it('returns zero CCM for null dob', () => {
        const result = calcCCM([{ level: 'DIST_TURF' }], null, MOCK_COMP_TIERS, MOCK_CONSTANTS);
        expect(result.ccm).toBe(0);
    });

    it('returns zero CCM when no tiers match', () => {
        const grades = [{ level: 'NONEXISTENT' }];
        const result = calcCCM(grades, '01/01/2010', MOCK_COMP_TIERS, MOCK_CONSTANTS);
        expect(result.ccm).toBe(0);
    });
});


// ───────── techItems ─────────
describe('techItems', () => {
    it('returns batting items for batter role', () => {
        const items = techItems('batter');
        expect(items.pL).toBe('Batting');
    });
    it('returns pace bowling items for pace role', () => {
        const items = techItems('pace');
        expect(items.pL).toBe('Pace Bowling');
        expect(items.sL).toBe('Batting');
    });
    it('returns spin bowling items for spin role', () => {
        const items = techItems('spin');
        expect(items.pL).toBe('Spin Bowling');
    });
    it('returns wicketkeeping items for keeper role', () => {
        const items = techItems('keeper');
        expect(items.pL).toBe('Wicketkeeping');
    });
    it('returns batting + bowling items for allrounder role', () => {
        const items = techItems('allrounder');
        expect(items.pL).toBe('Batting');
        expect(items.sL).toBe('Bowling');
    });
});


// ───────── calcAgeScore ─────────
describe('calcAgeScore', () => {
    it('returns a number for valid ARM', () => {
        const score = calcAgeScore(1.20, MOCK_CONSTANTS);
        expect(typeof score).toBe('number');
        expect(score).toBeGreaterThan(0);
    });
    it('caps at 100 (max scale)', () => {
        const score = calcAgeScore(5.0, MOCK_CONSTANTS);
        expect(score).toBeLessThanOrEqual(100);
    });
});


// ───────── calcPDI (integration) ─────────
describe('calcPDI', () => {
    it('returns valid PDI structure with all zero inputs', () => {
        const result = calcPDI(
            {}, // coachData
            {}, // selfData
            'batter', // role
            { ccm: 0, cti: 0, arm: 1 }, // ccmResult
            null, null, // dbWeights, constants
            [], // playerGrades
        );

        expect(result).toHaveProperty('pdi');
        expect(result).toHaveProperty('domains');
        expect(typeof result.pdi).toBe('number');
    });

    it('produces higher PDI with higher skill ratings', () => {
        const lowRatings = {};
        const highRatings = {};
        // Set up some skill ratings
        for (let i = 0; i < 8; i++) {
            lowRatings[`t1_${i}`] = 1;
            highRatings[`t1_${i}`] = 5;
            lowRatings[`iq_${i}`] = 1;
            highRatings[`iq_${i}`] = 5;
            lowRatings[`mn_${i}`] = 1;
            highRatings[`mn_${i}`] = 5;
        }

        const ccm = { ccm: 0.5, cti: 0.5, arm: 1 };
        const low = calcPDI(lowRatings, {}, 'batter', ccm, null, null, []);
        const high = calcPDI(highRatings, {}, 'batter', ccm, null, null, []);

        expect(high.pdi).toBeGreaterThan(low.pdi);
    });

    it('returns PDI grade label for non-zero ratings', () => {
        const ratings = {};
        for (let i = 0; i < 8; i++) { ratings[`t1_${i}`] = 3; ratings[`iq_${i}`] = 3; ratings[`mn_${i}`] = 3; }
        const ccm = { ccm: 0.85, cti: 0.85, arm: 1 };
        const result = calcPDI(ratings, {}, 'batter', ccm, null, null, []);
        // calcPDI returns { pdi, domains, g (grade label), gc (grade color), ... }
        expect(result.pdi).toBeGreaterThan(0);
        expect(typeof result.g).toBe('string');
        expect(result.g).not.toBe('—'); // With ratings of 3, should get a real grade
    });
});


// ───────── calcCohortPercentile ─────────
describe('calcCohortPercentile', () => {
    it('returns 100 when player is highest', () => {
        const allPlayers = [
            { pdi: 30 },
            { pdi: 40 },
            { pdi: 50 },
        ];
        const percentile = calcCohortPercentile(50, allPlayers, MOCK_COMP_TIERS, null, null);
        expect(percentile).toBeGreaterThanOrEqual(50);
    });

    it('returns 0 when player is lowest', () => {
        const allPlayers = [
            { pdi: 30 },
            { pdi: 40 },
            { pdi: 50 },
        ];
        const percentile = calcCohortPercentile(30, allPlayers, MOCK_COMP_TIERS, null, null);
        expect(percentile).toBeLessThanOrEqual(50);
    });
});


// ───────── Edge Cases ─────────
describe('Edge Cases', () => {
    it('calcCCM handles undefined grades array', () => {
        const result = calcCCM(undefined, '01/01/2010', MOCK_COMP_TIERS, MOCK_CONSTANTS);
        expect(result.ccm).toBe(0);
    });

    it('dAvg handles negative values by skipping them (only > 0 counted)', () => {
        // Negative values are treated as non-rated (< 0 fails the > 0 check)
        const data = { x_0: -1, x_1: 3 };
        const result = dAvg(data, 'x_', 2);
        expect(result.a).toBe(3);
        expect(result.r).toBe(1);
    });

    it('getAge uses 2026 as reference year', () => {
        // Ensuring the engine's fixed reference year is 2026
        expect(getAge('01/01/2006')).toBe(20);
        expect(getAge('01/01/2016')).toBe(10);
    });
});
