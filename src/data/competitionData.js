// ═══ COMPETITION DATA ═══

export const FALLBACK_ASSOCS = ["VTCA", "ECA", "RDCA", "DDCA", "BHRDCA", "Peninsula", "Gippsland", "CV Pathway", "Premier Cricket", "Other"];
export const FMTS = ["T20", "One-Day / Limited Overs", "Two-Day / Multi-Day"];

export const TIER_GROUPS = [
    { label: "Premier Cricket", tiers: ["PREMIER", "PREMIER_UAGE"], icon: "🏏" },
    { label: "State / Pathway", tiers: ["NATIONAL", "STATE", "STATE_PATHWAY"], icon: "⭐" },
    { label: "Sub-District (VSDCA / VTCA)", tiers: ["SUB_DISTRICT"], icon: "🏟️" },
    { label: "Community Association", tiers: ["COMMUNITY_SR", "COMMUNITY_JR", "COMMUNITY_WG"], icon: "🏠" },
    { label: "Country Cricket", tiers: ["COUNTRY_SR", "COUNTRY_JR", "COUNTRY_REP"], icon: "🌾" },
    { label: "Representative (VMCU)", tiers: ["VMCU_REP"], icon: "🛡️" },
    { label: "Entry Level / None", tiers: ["ENTRY"], icon: "🌱" },
];

export const BAT_H = ["Right-Hand Bat", "Left-Hand Bat"];
export const BWL_T = ["Right-Arm Fast", "Left-Arm Fast", "Right-Arm Medium", "Left-Arm Medium", "Right-Arm Offspin", "Left-Arm Orthodox", "Right-Arm Legspin", "Left-Arm Wrist", "N/A"];

export const COMMUNITY_TIERS = ['COMMUNITY_SR', 'COMMUNITY_JR', 'COMMUNITY_WG'];
export const isCommunityGroup = g => g && g.tiers.some(t => COMMUNITY_TIERS.includes(t));
