import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import {
    loadEngineConstants, updateEngineConstant,
    loadDomainWeights, updateDomainWeights,
    loadCompetitionTiers, updateCompetitionTier,
    loadSquadGroups, createSquadGroup, updateSquadGroup, deleteSquadGroup,
    loadSquadAllocations, allocatePlayerToSquad, removePlayerFromSquad,
    loadAnalyticsEvents, loadProgramMembers, loadAllUserProfiles, updateProgramMember, loadDeletedMembers,
} from "./db/adminDb";
import { supabase } from "./supabaseClient";
import { trackEvent, EVT } from "./analytics/tracker";

// ═══════════════════════════════════════════════
// ADMIN DASHBOARD — 7-TAB COMMAND CENTER
// ═══════════════════════════════════════════════

const TABS = [
    { id: "visualizer", icon: "🏠", label: "Engine Visualizer" },
    { id: "controls", icon: "⚙️", label: "Engine Controls" },
    { id: "tiers", icon: "🏏", label: "Competition Tiers" },
    { id: "players", icon: "👥", label: "All Players" },
    { id: "rankings", icon: "🏆", label: "Rankings & Squads" },
    { id: "users", icon: "📨", label: "User Management" },
    { id: "email", icon: "✉️", label: "Email Template" },
    { id: "analytics", icon: "📊", label: "Analytics" },
];

// ═══ EMAIL TEMPLATE DEFAULTS ═══
const EMAIL_DEFAULTS = {
    academyName: "Rajasthan Royals Academy Melbourne",
    senderName: "RRAM Head Coach",
    replyTo: "alex.lewis@rramelbourne.com",
    subject: "Your {{academyName}} Login Credentials",
    heading: "Welcome to the DNA Program",
    body: "You've been registered for the Rajasthan Royals Academy Melbourne Development Program. Below are your login credentials to access the RRA DNA platform.",
    footer: "This is an automated message from the RRAM coaching team. Please do not reply to this email \u2014 if you have questions, contact your head coach directly.",
    loginUrl: "https://rra-dna-cards.vercel.app",
    logoUrl: "https://res.cloudinary.com/dmktzeitu/image/upload/v1771506718/rra_dna/rra_logo.png",
    signature: "",
};

export default function AdminDashboard({
    players, compTiers, dbWeights, engineConst,
    onBack, onSwitchToCoach, session, isAdmin,
    calcPDI, calcCCM, calcCohortPercentile, calcAgeScore,
    getAge, getBracket, ROLES, B, F, LOGO, sGrad,
}) {

    // ═══ STATE ═══
    const [tab, setTab] = useState("rankings");
    const [dbConstants, setDbConstants] = useState([]);
    const [dbDomainWeights, setDbDomainWeights] = useState([]);
    const [dbTiers, setDbTiers] = useState([]);
    const [squads, setSquads] = useState([]);
    const [allocations, setAllocations] = useState([]);
    const [analyticsEvents, setAnalyticsEvents] = useState([]);
    const [members, setMembers] = useState([]);
    const [userProfiles, setUserProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const [tierSearch, setTierSearch] = useState("");
    const [playerSearch, setPlayerSearch] = useState("");
    const [rankSort, setRankSort] = useState("overall");
    const [rankSortDir, setRankSortDir] = useState("desc");
    const [previewPlayer, setPreviewPlayer] = useState(null);
    const [newSquadName, setNewSquadName] = useState("");
    const [analyticsDays, setAnalyticsDays] = useState(30);
    const [hoveredRow, setHoveredRow] = useState(null);

    // Email template state — load from localStorage if previously saved
    const _savedTmpl = (() => { try { return JSON.parse(localStorage.getItem('rra_email_template') || 'null'); } catch { return null; } })();
    const [emailAcademyName, setEmailAcademyName] = useState(_savedTmpl?.academyName ?? EMAIL_DEFAULTS.academyName);
    const [emailSenderName, setEmailSenderName] = useState(_savedTmpl?.senderName ?? EMAIL_DEFAULTS.senderName);
    const [emailReplyTo, setEmailReplyTo] = useState(_savedTmpl?.replyTo ?? EMAIL_DEFAULTS.replyTo);
    const [emailSubject, setEmailSubject] = useState(_savedTmpl?.subject ?? EMAIL_DEFAULTS.subject);
    const [emailHeading, setEmailHeading] = useState(_savedTmpl?.heading ?? EMAIL_DEFAULTS.heading);
    const [emailBody, setEmailBody] = useState(_savedTmpl?.body ?? EMAIL_DEFAULTS.body);
    const [emailFooter, setEmailFooter] = useState(_savedTmpl?.footer ?? EMAIL_DEFAULTS.footer);
    const [emailLoginUrl, setEmailLoginUrl] = useState(_savedTmpl?.loginUrl ?? EMAIL_DEFAULTS.loginUrl);
    const [emailSignature, setEmailSignature] = useState(_savedTmpl?.signature ?? EMAIL_DEFAULTS.signature);

    // Email template helper — get current config as an object
    const getEmailTemplateConfig = () => ({
        academyName: emailAcademyName,
        senderName: emailSenderName,
        replyTo: emailReplyTo,
        subject: emailSubject,
        heading: emailHeading,
        body: emailBody,
        footer: emailFooter,
        loginUrl: emailLoginUrl,
        signature: emailSignature,
    });

    const handleSaveEmailTemplate = () => {
        localStorage.setItem('rra_email_template', JSON.stringify(getEmailTemplateConfig()));
        showToast('✅ Email template saved', 'success');
    };

    const handleResetEmailTemplate = () => {
        setEmailAcademyName(EMAIL_DEFAULTS.academyName);
        setEmailSenderName(EMAIL_DEFAULTS.senderName);
        setEmailReplyTo(EMAIL_DEFAULTS.replyTo);
        setEmailSubject(EMAIL_DEFAULTS.subject);
        setEmailHeading(EMAIL_DEFAULTS.heading);
        setEmailBody(EMAIL_DEFAULTS.body);
        setEmailFooter(EMAIL_DEFAULTS.footer);
        setEmailLoginUrl(EMAIL_DEFAULTS.loginUrl);
        setEmailSignature(EMAIL_DEFAULTS.signature);
        localStorage.removeItem('rra_email_template');
        showToast('Template reset to defaults', 'success');
    };
    const [hoveredTab, setHoveredTab] = useState(null);
    const [tipOpen, setTipOpen] = useState(null);
    const styleRef = useRef(null);

    // ═══ MEMBER MANAGEMENT STATE ═══
    const [addMode, setAddMode] = useState(null); // null | 'single' | 'bulk'
    const [singleForm, setSingleForm] = useState({ name: '', email: '', role: 'player' });
    const [bulkRows, setBulkRows] = useState([]);
    const [bulkFileName, setBulkFileName] = useState('');
    const [creating, setCreating] = useState(false);
    const [createResults, setCreateResults] = useState(null);
    const fileInputRef = useRef(null);

    // ═══ MEMBER REMOVAL STATE ═══
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [deletedMembers, setDeletedMembers] = useState([]);
    const [memberView, setMemberView] = useState('active'); // 'active' | 'archived' | 'deleted'
    const [confirmModal, setConfirmModal] = useState(null); // { action, ids, confirmText }
    const [confirmInput, setConfirmInput] = useState('');

    // ═══ DATA LOAD ═══
    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const [c, dw, t, sg, sa, ev, pm, up, dm] = await Promise.all([
                loadEngineConstants(),
                loadDomainWeights(),
                loadCompetitionTiers(),
                loadSquadGroups(),
                loadSquadAllocations(),
                loadAnalyticsEvents(analyticsDays),
                loadProgramMembers(),
                loadAllUserProfiles(),
                loadDeletedMembers(),
            ]);
            setDbConstants(c || []);
            setDbDomainWeights(dw || []);
            setDbTiers(t || []);
            setSquads(sg || []);
            setAllocations(sa || []);
            setAnalyticsEvents(ev || []);
            setMembers(pm || []);
            setDeletedMembers(dm || []);
            setUserProfiles(up || []);
        } catch (err) {
            console.error('[admin] load error:', err);
            showToast("Failed to load data", "error");
        }
        setLoading(false);
    }, [analyticsDays]);

    useEffect(() => {
        refresh();
        trackEvent(EVT.ADMIN_OPEN);
    }, [refresh]);

    // ═══ TOAST ═══
    const showToast = (msg, type = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    // ═══ PLAYER RANKINGS (computed) ═══
    const rankedPlayers = useMemo(() => {
        return players
            .filter(p => p.submitted)
            .map(p => {
                const ccmR = calcCCM(p.grades, p.dob, compTiers, engineConst);
                const hasCd = Object.keys(p.cd || {}).filter(k => k.match(/^t1_/)).length > 0;
                const hasSelf = Object.keys(p.self_ratings || {}).some(k => k.match(/^t1_/));
                const hasData = hasCd || hasSelf || (p.grades?.length > 0);
                const dn = hasData
                    ? calcPDI({ ...p.cd, _dob: p.dob }, p.self_ratings, p.role, ccmR, dbWeights, engineConst, p.grades, {}, p.topBat, p.topBowl, compTiers)
                    : null;

                let pathwayScore = 0, cohortScore = 0, ageScore = 0, overallScore = 0;
                if (dn && dn.pdi > 0) {
                    pathwayScore = dn.pdiPct;
                    cohortScore = calcCohortPercentile(dn.pdi, players, compTiers, dbWeights, engineConst);
                    ageScore = calcAgeScore(ccmR.arm, engineConst);
                    overallScore = Math.round((pathwayScore + cohortScore + ageScore) / 3);
                }

                return {
                    ...p,
                    ccmR,
                    dn,
                    pathwayScore,
                    cohortScore,
                    ageScore,
                    overallScore,
                    hasCd,
                    hasSelf,
                    age: getAge(p.dob),
                    bracket: getBracket(p.dob),
                    roleObj: ROLES.find(r => r.id === p.role),
                };
            })
            .sort((a, b) => {
                const key = rankSort === "pathway" ? "pathwayScore"
                    : rankSort === "cohort" ? "cohortScore"
                        : rankSort === "age" ? "ageScore"
                            : "overallScore";
                return rankSortDir === "desc" ? b[key] - a[key] : a[key] - b[key];
            });
    }, [players, compTiers, dbWeights, engineConst, calcPDI, calcCCM, calcCohortPercentile, calcAgeScore, getAge, getBracket, ROLES, rankSort, rankSortDir]);

    // ═══ INFOTIP COMPONENT ═══
    const InfoTip = ({ id, text }) => {
        const isOpen = tipOpen === id;
        return (
            <span style={{ position: "relative", display: "inline-block" }}>
                <button
                    onClick={e => { e.stopPropagation(); setTipOpen(isOpen ? null : id); }}
                    style={{
                        width: 16, height: 16, borderRadius: "50%", border: `1.5px solid ${isOpen ? B.pk : "rgba(255,255,255,0.25)"}`,
                        background: isOpen ? `${B.pk}25` : "transparent", cursor: "pointer",
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        fontSize: 9, fontWeight: 800, color: isOpen ? B.pk : "rgba(255,255,255,0.4)",
                        fontFamily: F, padding: 0, lineHeight: 1, verticalAlign: "middle", marginLeft: 6,
                        transition: "all 0.2s",
                    }}
                >ⓘ</button>
                {isOpen && (
                    <div style={{
                        position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)",
                        background: B.nvD, border: `1px solid ${B.pk}40`, borderRadius: 8, padding: "8px 10px",
                        fontSize: 10, color: "rgba(255,255,255,0.8)", fontFamily: F, lineHeight: 1.5,
                        width: 240, zIndex: 1000, boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                    }}>
                        {text}
                        <div style={{
                            position: "absolute", bottom: -5, left: "50%", transform: "translateX(-50%) rotate(45deg)",
                            width: 8, height: 8, background: B.nvD, borderRight: `1px solid ${B.pk}40`,
                            borderBottom: `1px solid ${B.pk}40`
                        }} />
                    </div>
                )}
            </span>
        );
    };

    // ═══ STYLES ═══
    const S = {
        page: {
            minHeight: "100vh", fontFamily: F, color: "#e4e4e7",
            background: `linear-gradient(180deg, ${B.nvD} 0%, #0f1117 30%, #0a0b10 100%)`,
        },
        topBar: {
            background: `linear-gradient(135deg, ${B.nvD}ee 0%, #1a1b2ecc 100%)`,
            backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
            borderBottom: `1px solid ${B.pk}20`,
            padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center",
            position: "sticky", top: 0, zIndex: 100,
        },
        tabBar: {
            display: "flex", gap: 2, padding: "0 12px",
            background: "rgba(15,17,23,0.85)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
            borderBottom: `1px solid rgba(255,255,255,0.06)`,
            overflowX: "auto", position: "sticky", top: 52, zIndex: 99,
        },
        tab: (active, hovered) => ({
            padding: "12px 16px", fontSize: 11, fontWeight: active ? 800 : 600, fontFamily: F, cursor: "pointer",
            color: active ? B.w : hovered ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.4)",
            background: active ? `${B.pk}12` : hovered ? "rgba(255,255,255,0.04)" : "transparent",
            borderBottom: active ? `2px solid ${B.pk}` : "2px solid transparent",
            whiteSpace: "nowrap", border: "none", transition: "all 0.25s ease",
            position: "relative",
        }),
        card: {
            background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 18, marginBottom: 14,
            borderLeft: `3px solid ${B.pk}30`,
            boxShadow: "0 4px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.05)",
            animation: "adminSlideUp 0.35s ease-out both",
        },
        sectionTitle: {
            fontSize: 14, fontWeight: 800, color: "#e4e4e7", fontFamily: F, marginBottom: 8,
            display: "flex", alignItems: "center", gap: 6,
        },
        subText: { fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: F, lineHeight: 1.6 },
        input: {
            background: "rgba(255,255,255,0.06)", border: `1px solid rgba(255,255,255,0.12)`,
            borderRadius: 8, padding: "8px 12px", color: "#e4e4e7", fontSize: 12, fontFamily: F,
            outline: "none", width: "100%", transition: "border-color 0.2s, box-shadow 0.2s",
        },
        btn: (bg = B.pk) => ({
            padding: "8px 18px", borderRadius: 8, border: "none", background: bg, color: B.w,
            fontSize: 11, fontWeight: 700, fontFamily: F, cursor: "pointer",
            transition: "transform 0.15s, box-shadow 0.2s",
            boxShadow: `0 2px 8px ${bg}40`,
        }),
        badge: (col) => ({
            display: "inline-block", padding: "2px 8px", borderRadius: 6, fontSize: 9, fontWeight: 700,
            fontFamily: F, background: `${col}18`, color: col, marginRight: 4,
            border: `1px solid ${col}25`, letterSpacing: 0.3,
        }),
        toastStyle: (type) => ({
            position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 9999,
            padding: "12px 24px", borderRadius: 12, fontSize: 12, fontWeight: 700, fontFamily: F,
            background: type === "error" ? `linear-gradient(135deg, #dc2626, #ef4444)` : `linear-gradient(135deg, #059669, #22c55e)`,
            color: "#fff", boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            backdropFilter: "blur(8px)", animation: "adminSlideUp 0.3s ease-out",
        }),
        statCard: (accent) => ({
            background: "rgba(255,255,255,0.04)", backdropFilter: "blur(8px)",
            border: `1px solid ${accent}30`, borderRadius: 12, padding: "14px 16px",
            borderTop: `2px solid ${accent}`,
            boxShadow: `0 4px 16px ${accent}10`,
            flex: 1, minWidth: 120, textAlign: "center",
        }),
        row: (hovered) => ({
            display: "flex", alignItems: "center", gap: 8, padding: "8px 6px",
            borderBottom: "1px solid rgba(255,255,255,0.04)",
            background: hovered ? "rgba(255,255,255,0.04)" : "transparent",
            borderLeft: hovered ? `2px solid ${B.pk}` : "2px solid transparent",
            transition: "all 0.15s ease", cursor: "pointer", borderRadius: 4,
        }),
    };

    const scoreColor = (val) => val >= 75 ? "#22c55e" : val >= 40 ? "#f59e0b" : val > 0 ? "#ef4444" : "rgba(255,255,255,0.2)";
    const bandLabel = (val) => val >= 75 ? "Top 25%" : val >= 25 ? "Mid 50%" : "Bottom 25%";

    // ═══ SUMMARY STATS (top bar for every tab) ═══
    const StatRow = () => {
        const totalPlayers = rankedPlayers.length;
        const avgPdi = totalPlayers > 0 ? (rankedPlayers.reduce((s, p) => s + (p.dn?.pdi || 0), 0) / totalPlayers).toFixed(1) : "—";
        const assessed = rankedPlayers.filter(p => p.hasCd).length;
        const tierCount = dbTiers.length;
        const stats = [
            { label: "Total Players", value: totalPlayers, accent: B.bl },
            { label: "Avg PDI", value: avgPdi, accent: B.pk },
            { label: "Coach Assessed", value: `${assessed}/${totalPlayers}`, accent: "#22c55e" },
            { label: "Competitions", value: tierCount, accent: B.prp },
        ];
        return (
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
                {stats.map(s => (
                    <div key={s.label} style={S.statCard(s.accent)}>
                        <div style={{ fontSize: 22, fontWeight: 900, color: s.accent, fontFamily: F }}>{s.value}</div>
                        <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 0.8, marginTop: 4 }}>{s.label}</div>
                    </div>
                ))}
            </div>
        );
    };

    // ═══ HANDLER: SAVE ENGINE CONSTANT ═══
    const handleSaveConstant = async (key, val) => {
        setSaving(true);
        try {
            await updateEngineConstant(key, val);
            showToast(`Updated ${key}`);
            trackEvent(EVT.ENGINE_EDIT, { type: "constant", key, value: val });
        } catch (e) { showToast(e.message, "error"); }
        setSaving(false);
    };

    // ═══ HANDLER: SAVE DOMAIN WEIGHTS ═══
    const handleSaveWeights = async (roleId, weights) => {
        setSaving(true);
        try {
            await updateDomainWeights(roleId, weights);
            showToast(`Updated weights for ${roleId}`);
            trackEvent(EVT.ENGINE_EDIT, { type: "domain_weight", roleId });
        } catch (e) { showToast(e.message, "error"); }
        setSaving(false);
    };

    // ═══ HANDLER: SAVE TIER ═══
    const handleSaveTier = async (code, updates) => {
        setSaving(true);
        try {
            await updateCompetitionTier(code, updates);
            showToast(`Updated tier ${code}`);
            trackEvent(EVT.ENGINE_EDIT, { type: "tier", code });
        } catch (e) { showToast(e.message, "error"); }
        setSaving(false);
    };

    // ═══ HANDLER: SQUAD OPS ═══
    const handleCreateSquad = async () => {
        if (!newSquadName.trim()) return;
        try {
            await createSquadGroup(newSquadName.trim(), "", 12);
            setNewSquadName("");
            await refresh();
            showToast("Squad created");
        } catch (e) { showToast(e.message, "error"); }
    };

    const handleAllocate = async (squadId, playerId) => {
        try {
            await allocatePlayerToSquad(squadId, playerId, session?.user?.id, "");
            await refresh();
            showToast("Player assigned");
            trackEvent(EVT.SQUAD_EDIT, { squadId, playerId, action: "allocate" });
        } catch (e) { showToast(e.message, "error"); }
    };

    const handleUnallocate = async (playerId) => {
        try {
            await removePlayerFromSquad(playerId);
            await refresh();
            showToast("Player removed from squad");
        } catch (e) { showToast(e.message, "error"); }
    };

    // ═══════════════════════════════════════════════
    //  RENDER: ENGINE VISUALIZER TAB
    // ═══════════════════════════════════════════════
    const renderVisualizer = () => {
        const sel = previewPlayer || (rankedPlayers.length > 0 ? rankedPlayers[0] : null);
        if (!sel) return <div style={S.card}><div style={S.subText}>No players with data yet.</div></div>;

        const dn = sel.dn;
        const ccmR = sel.ccmR;
        const domains = dn?.domains || {};

        const pipeColor = (val) => {
            if (!val || val <= 0) return "rgba(255,255,255,0.1)";
            if (val >= 4) return "#22c55e";
            if (val >= 3) return "#3b82f6";
            if (val >= 2) return "#f59e0b";
            return "#ef4444";
        };

        const stages = [
            { label: "Raw Skill Ratings", sub: "How good are they at each skill?", value: dn ? `${Object.keys(domains).length} domains` : "—", color: B.bl },
            { label: "Domain Averages", sub: "Average score per domain area", value: dn ? Object.entries(domains).map(([k, v]) => `${k}: ${(v.avg || 0).toFixed(1)}`).join(", ").slice(0, 60) + "..." : "—", color: B.prp },
            { label: "CSS Blend", sub: `Coach ${engineConst.coach_weight * 100 || 75}% + Player ${engineConst.player_weight * 100 || 25}%`, value: dn ? `Blended across ${Object.keys(domains).length} domains` : "—", color: "#f97316" },
            { label: "× CCM Multiplier", sub: `CTI ${ccmR?.cti?.toFixed(2) || '—'} × ARM ${ccmR?.arm?.toFixed(2) || '—'}`, value: ccmR?.ccm > 0 ? `CCM = ${ccmR.ccm.toFixed(3)}` : "—", color: "#06b6d4" },
            { label: "PDI (Final Score)", sub: "Player Development Index → out of 5", value: dn ? `PDI ${dn.pdi.toFixed(2)} (${dn.pdiPct}%)` : "—", color: "#22c55e" },
        ];

        return (
            <div>
                {/* Player picker */}
                <div style={{ ...S.card, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: B.w }}>Select Player:</div>
                    <select
                        value={sel.id}
                        onChange={e => setPreviewPlayer(rankedPlayers.find(p => p.id === e.target.value))}
                        style={{ ...S.input, width: "auto", minWidth: 200 }}
                    >
                        {rankedPlayers.map(p => <option key={p.id} value={p.id}>{p.name} — PDI {p.dn?.pdi?.toFixed(1) || "—"}</option>)}
                    </select>
                    <div style={S.subText}>{sel.age}yo • {sel.bracket} • {sel.roleObj?.label || "?"}</div>
                </div>

                {/* Flow Pipeline */}
                <div style={S.card}>
                    <div style={S.sectionTitle}>Score Pipeline — How {sel.name?.split(" ")[0]}'s Score Is Built <InfoTip id="pipeline" text="This shows the 5-step pipeline that converts raw skill ratings into a final PDI score. Each step feeds into the next — like a production line for player development scores." /></div>
                    <div style={S.subText}>Each step transforms the raw data into the final development score</div>
                    <div style={{ marginTop: 16 }}>
                        {stages.map((s, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "stretch", marginBottom: 2 }}>
                                {/* Step number */}
                                <div style={{ width: 32, display: "flex", flexDirection: "column", alignItems: "center" }}>
                                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: s.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#fff" }}>{i + 1}</div>
                                    {i < stages.length - 1 && <div style={{ flex: 1, width: 2, background: "rgba(255,255,255,0.1)" }} />}
                                </div>
                                {/* Content */}
                                <div style={{ flex: 1, padding: "4px 0 16px 12px" }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: "#e4e4e7" }}>{s.label}</div>
                                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{s.sub}</div>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: s.color, marginTop: 4, background: `${s.color}15`, padding: "4px 10px", borderRadius: 6, display: "inline-block" }}>{s.value}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Domain Breakdown */}
                {dn && (
                    <div style={S.card}>
                        <div style={S.sectionTitle}>Domain Breakdown</div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginTop: 8 }}>
                            {Object.entries(domains).map(([name, d]) => (
                                <div key={name} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: 0.5 }}>{name}</div>
                                    <div style={{ fontSize: 20, fontWeight: 900, color: pipeColor(d.avg), marginTop: 4 }}>{(d.avg || 0).toFixed(1)}</div>
                                    <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", marginTop: 6, overflow: "hidden" }}>
                                        <div style={{ height: "100%", borderRadius: 2, background: `linear-gradient(90deg, ${pipeColor(d.avg)}, ${pipeColor(d.avg)}cc)`, width: `${((d.avg || 0) / 5) * 100}%`, transition: "width 0.5s", animation: "adminBarFill 0.8s ease-out" }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // ═══════════════════════════════════════════════
    //  RENDER: ENGINE CONTROLS TAB
    // ═══════════════════════════════════════════════
    const renderControls = () => {
        const constDescriptions = {
            arm_sensitivity_factor: { label: "Age Bonus Sensitivity", help: "How much extra credit for playing above your age? Higher = bigger bonus." },
            arm_floor: { label: "Minimum Age Modifier", help: "The lowest the age bonus can go. 0.80 = a slight penalty for older players in younger comps." },
            arm_ceiling: { label: "Maximum Age Modifier", help: "The highest the age bonus can go. 1.50 = up to 50% bonus for young players in older comps." },
            coach_weight: { label: "Coach Opinion Weight", help: "How much should the coach's assessment count? (Coach + Player must equal 1.0)" },
            player_weight: { label: "Player Self-Rating Weight", help: "How much should the player's own rating count?" },
            sagi_aligned_min: { label: "SAGI Aligned Min", help: "Below this gap, the player underrates themselves (modest)." },
            sagi_aligned_max: { label: "SAGI Aligned Max", help: "Above this gap, the player overrates themselves (overconfident)." },
            trajectory_age_threshold: { label: "Trajectory Age Threshold", help: "Players younger than this (relative to comp) are flagged as 'on a trajectory'." },
            pdi_scale_max: { label: "PDI Scale Maximum", help: "The top of the PDI scale — currently 5." },
        };

        return (
            <div>
                <div style={S.card}>
                    <div style={S.sectionTitle}>⚙️ Engine Constants <InfoTip id="constants" text="These values control the core engine behaviour. Changing any constant will cascade through every player's score — like adjusting the dials on a mixing desk." /></div>
                    <div style={S.subText}>These values control the core engine behaviour. Changes affect every player's score.</div>
                    <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                        {dbConstants.map(c => {
                            const desc = constDescriptions[c.constant_key] || { label: c.constant_key, help: c.description || "" };
                            return (
                                <div key={c.constant_key} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.02)", padding: "8px 10px", borderRadius: 8 }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: "#e4e4e7" }}>{desc.label}</div>
                                        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>{desc.help}</div>
                                    </div>
                                    <input
                                        type="number"
                                        step="0.01"
                                        defaultValue={c.value}
                                        style={{ ...S.input, width: 80, textAlign: "right" }}
                                        onBlur={e => {
                                            if (e.target.value !== c.value) handleSaveConstant(c.constant_key, e.target.value);
                                        }}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Domain Weights by Role */}
                <div style={S.card}>
                    <div style={S.sectionTitle}>🎯 Domain Weights by Role <InfoTip id="domainweights" text="Each player role emphasises different skills. A specialist batter has higher Technical weight, while a pace bowler has more Physical weight. All weights for a role should sum to 1.0." /></div>
                    <div style={S.subText}>For each player type, how important is each domain? Weights should sum to 1.0.</div>
                    <div style={{ marginTop: 12, overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                            <thead>
                                <tr>
                                    <th style={{ textAlign: "left", padding: 6, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>Role</th>
                                    <th style={{ padding: 6, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>Technical</th>
                                    <th style={{ padding: 6, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>Game IQ</th>
                                    <th style={{ padding: 6, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>Mental</th>
                                    <th style={{ padding: 6, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>Physical</th>
                                    <th style={{ padding: 6, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>Phase</th>
                                    <th style={{ padding: 6, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>Sum</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dbDomainWeights.map(dw => {
                                    const sum = (Number(dw.technical_weight) || 0) + (Number(dw.game_iq_weight) || 0) + (Number(dw.mental_weight) || 0) + (Number(dw.physical_weight) || 0) + (Number(dw.phase_weight) || 0);
                                    return (
                                        <tr key={dw.role_id} style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                                            <td style={{ padding: 6, fontWeight: 700, color: "#e4e4e7" }}>{dw.role_label || dw.role_id}</td>
                                            {["technical_weight", "game_iq_weight", "mental_weight", "physical_weight", "phase_weight"].map(col => (
                                                <td key={col} style={{ padding: 4, textAlign: "center" }}>
                                                    <input type="number" step="0.05" defaultValue={dw[col]}
                                                        style={{ ...S.input, width: 50, textAlign: "center", padding: 4 }}
                                                        onBlur={e => {
                                                            if (Number(e.target.value) !== Number(dw[col])) {
                                                                handleSaveWeights(dw.role_id, { [col]: Number(e.target.value) });
                                                            }
                                                        }}
                                                    />
                                                </td>
                                            ))}
                                            <td style={{ padding: 6, textAlign: "center", fontWeight: 700, color: Math.abs(sum - 1) < 0.01 ? "#22c55e" : "#ef4444" }}>{sum.toFixed(2)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    // ═══════════════════════════════════════════════
    //  RENDER: COMPETITION TIERS TAB
    // ═══════════════════════════════════════════════
    const renderTiers = () => {
        const filtered = dbTiers.filter(t => {
            if (!tierSearch) return true;
            const q = tierSearch.toLowerCase();
            return (t.competition_name || "").toLowerCase().includes(q) ||
                (t.shield_name || "").toLowerCase().includes(q) ||
                (t.code || "").toLowerCase().includes(q) ||
                (t.tier || "").toLowerCase().includes(q);
        });

        const tierColors = {
            NATIONAL: "#fbbf24", STATE: "#60a5fa", STATE_PATHWAY: "#818cf8",
            PREMIER: "#a78bfa", PREMIER_2ND: "#c084fc", SUB_DISTRICT: "#34d399",
            COMMUNITY_A: "#2dd4bf", COMMUNITY_B: "#4ade80", JUNIOR: "#fb923c",
            COMMUNITY: "#22d3ee", CRICKET_BLAST: "#94a3b8",
        };

        return (
            <div>
                <div style={S.card}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <div style={S.sectionTitle}>🏏 Competition Tier Ladder ({filtered.length}) <InfoTip id="tierladder" text="This ladder shows each competition's CTI value — how much that competition level is 'worth'. Premier 1st XI = 1.0 is the benchmark. Higher CTI means tougher competition." /></div>
                        <input
                            type="text"
                            placeholder="Search tiers..."
                            value={tierSearch}
                            onChange={e => setTierSearch(e.target.value)}
                            style={{ ...S.input, width: 200 }}
                        />
                    </div>
                    <div style={{ ...S.subText, marginTop: 4 }}>This ladder shows how much each competition is worth. Premier 1st XI = 1.0 (the benchmark).</div>
                </div>

                <div style={{ display: "grid", gap: 4 }}>
                    {filtered.map(t => {
                        const col = tierColors[t.tier] || "#94a3b8";
                        return (
                            <div key={t.code} style={{ ...S.card, padding: "8px 12px", marginBottom: 0, display: "flex", alignItems: "center", gap: 8 }}>
                                {/* CTI bar */}
                                <div style={{ width: 50, textAlign: "right" }}>
                                    <span style={{ fontSize: 14, fontWeight: 900, color: col }}>{Number(t.cti_value).toFixed(2)}</span>
                                </div>
                                <div style={{ width: 60, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", flexShrink: 0 }}>
                                    <div style={{ height: "100%", borderRadius: 3, background: col, width: `${Number(t.cti_value) * 100}%` }} />
                                </div>
                                {/* Info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: "#e4e4e7", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {t.competition_name} {t.shield_name ? `— ${t.shield_name}` : ""}
                                    </div>
                                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>
                                        {t.code} • {t.tier} • {t.gender || "Open"} • Age {t.expected_midpoint_age || "—"}
                                    </div>
                                </div>
                                <span style={{ ...S.badge(col), fontSize: 8 }}>{t.tier?.replace(/_/g, " ")}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // ═══════════════════════════════════════════════
    //  RENDER: ALL PLAYERS TAB
    // ═══════════════════════════════════════════════
    const renderPlayers = () => {
        const filtered = rankedPlayers.filter(p => {
            if (!playerSearch) return true;
            const q = playerSearch.toLowerCase();
            return (p.name || "").toLowerCase().includes(q) || (p.club || "").toLowerCase().includes(q);
        });

        return (
            <div>
                <div style={S.card}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <div style={S.sectionTitle}>👥 All Players ({filtered.length}) <InfoTip id="allplayers" text="Every player who has submitted their survey. Click any row to preview their score breakdown in the Engine Visualizer tab." /></div>
                        <input
                            type="text"
                            placeholder="Search by name or club..."
                            value={playerSearch}
                            onChange={e => setPlayerSearch(e.target.value)}
                            style={{ ...S.input, width: 200 }}
                        />
                    </div>
                </div>

                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                                {["Name", "Age", "Role", "Club", "PDI", "CCM", "Overall", "Status"].map(h => (
                                    <th key={h} style={{ padding: "8px 6px", textAlign: "left", color: "rgba(255,255,255,0.5)", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(p => (
                                <tr key={p.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer" }}
                                    onClick={() => setPreviewPlayer(p)}>
                                    <td style={{ padding: "8px 6px", fontWeight: 700, color: "#e4e4e7" }}>{p.name}</td>
                                    <td style={{ padding: "8px 6px", color: "rgba(255,255,255,0.5)" }}>{p.age}yo</td>
                                    <td style={{ padding: "8px 6px", color: "rgba(255,255,255,0.5)" }}>{p.roleObj?.sh || "?"}</td>
                                    <td style={{ padding: "8px 6px", color: "rgba(255,255,255,0.5)" }}>{p.club || "—"}</td>
                                    <td style={{ padding: "8px 6px" }}>
                                        {p.dn ? <span style={{ fontWeight: 700, color: p.dn.gc }}>{p.dn.pdi.toFixed(1)}</span> : "—"}
                                    </td>
                                    <td style={{ padding: "8px 6px", color: B.bl }}>{p.ccmR?.ccm > 0 ? p.ccmR.ccm.toFixed(2) : "—"}</td>
                                    <td style={{ padding: "8px 6px" }}>
                                        {p.overallScore > 0 ? <span style={{ fontWeight: 700, color: scoreColor(p.overallScore) }}>{p.overallScore}</span> : "—"}
                                    </td>
                                    <td style={{ padding: "8px 6px" }}>
                                        <span style={S.badge(p.hasCd ? "#22c55e" : p.hasSelf ? "#f59e0b" : "#94a3b8")}>
                                            {p.hasCd ? "Coach" : p.hasSelf ? "Self" : "New"}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // ═══════════════════════════════════════════════
    //  RENDER: RANKINGS & SQUADS TAB
    // ═══════════════════════════════════════════════
    const renderRankings = () => {
        const metrics = [
            { key: "overall", label: "Overall", color: "#f97316" },
            { key: "pathway", label: "Pathway", color: B.pk },
            { key: "cohort", label: "Cohort", color: B.bl },
            { key: "age", label: "Age", color: B.prp },
        ];

        const toggleSort = (key) => {
            if (rankSort === key) setRankSortDir(d => d === "desc" ? "asc" : "desc");
            else { setRankSort(key); setRankSortDir("desc"); }
        };

        const allocMap = {};
        allocations.forEach(a => { allocMap[a.player_id] = a.squad_id; });

        const unallocated = rankedPlayers.filter(p => !allocMap[p.id]);

        return (
            <div>
                {/* Leaderboard */}
                <div style={S.card}>
                    <div style={S.sectionTitle}>🏆 Player Leaderboard <InfoTip id="leaderboard" text="Players ranked by their development scores. Green = top 25%, amber = middle 50%, red = bottom 25%. Click any metric button to re-sort." /></div>
                    <div style={S.subText}>Click any metric to sort. Green = top 25%, amber = middle 50%, red = bottom 25%.</div>

                    {/* Metric toggle */}
                    <div style={{ display: "flex", gap: 4, marginTop: 10, marginBottom: 12 }}>
                        {metrics.map(m => (
                            <button key={m.key} onClick={() => toggleSort(m.key)}
                                style={{
                                    ...S.btn(rankSort === m.key ? m.color : "rgba(255,255,255,0.06)"),
                                    color: rankSort === m.key ? "#fff" : "rgba(255,255,255,0.4)",
                                    fontSize: 10,
                                }}>
                                {m.label} {rankSort === m.key ? (rankSortDir === "desc" ? "↓" : "↑") : ""}
                            </button>
                        ))}
                    </div>

                    {/* Ranked list */}
                    {rankedPlayers.map((p, i) => {
                        const val = rankSort === "pathway" ? p.pathwayScore : rankSort === "cohort" ? p.cohortScore : rankSort === "age" ? p.ageScore : p.overallScore;
                        const assignedSquad = squads.find(s => s.id === allocMap[p.id]);
                        return (
                            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                {/* Rank number */}
                                <div style={{ width: 28, textAlign: "center", fontSize: 13, fontWeight: 900, color: i < 3 ? "#fbbf24" : "rgba(255,255,255,0.3)" }}>
                                    {i + 1}
                                </div>
                                {/* Name */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: "#e4e4e7" }}>{p.name}</div>
                                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>{p.age}yo • {p.roleObj?.sh || "?"} • {p.club || "—"}</div>
                                </div>
                                {/* Score bars */}
                                {metrics.map(m => {
                                    const v = m.key === "pathway" ? p.pathwayScore : m.key === "cohort" ? p.cohortScore : m.key === "age" ? p.ageScore : p.overallScore;
                                    return (
                                        <div key={m.key} style={{ width: 48, textAlign: "center" }}>
                                            <div style={{ fontSize: 11, fontWeight: 700, color: scoreColor(v) }}>{v || "—"}</div>
                                            <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", marginTop: 2 }}>
                                                <div style={{ height: "100%", borderRadius: 2, background: scoreColor(v), width: `${v}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                                {/* Squad badge */}
                                <div style={{ width: 80, textAlign: "right" }}>
                                    {assignedSquad ? (
                                        <span style={S.badge("#3b82f6")}>{assignedSquad.name}</span>
                                    ) : (
                                        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)" }}>Unassigned</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Squad Builder */}
                <div style={S.card}>
                    <div style={S.sectionTitle}>📋 Squad Builder <InfoTip id="squadbuilder" text="Create development squads and assign players based on their rankings. The right grouping accelerates player development — too strong or too weak slows progress." /></div>
                    <div style={S.subText}>Create development squads and assign players from the ranked list above.</div>

                    {/* Create new squad */}
                    <div style={{ display: "flex", gap: 8, marginTop: 10, marginBottom: 12 }}>
                        <input
                            type="text"
                            placeholder="New squad name..."
                            value={newSquadName}
                            onChange={e => setNewSquadName(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleCreateSquad()}
                            style={{ ...S.input, flex: 1 }}
                        />
                        <button onClick={handleCreateSquad} style={S.btn("#3b82f6")}>+ Create</button>
                    </div>

                    {/* Squad lanes */}
                    {squads.map(squad => {
                        const squadPlayers = rankedPlayers.filter(p => allocMap[p.id] === squad.id);
                        return (
                            <div key={squad.id} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 12, marginBottom: 8 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div style={{ fontSize: 12, fontWeight: 800, color: "#e4e4e7" }}>{squad.name}</div>
                                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>{squadPlayers.length}/{squad.target_size || 12} players</div>
                                </div>
                                {/* Role composition */}
                                {squadPlayers.length > 0 && (
                                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                                        {squadPlayers.map(p => (
                                            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.04)", borderRadius: 6, padding: "3px 8px" }}>
                                                <span style={{ fontSize: 10, fontWeight: 600, color: "#e4e4e7" }}>{p.name}</span>
                                                <span style={{ fontSize: 9, color: scoreColor(p.overallScore) }}>{p.overallScore}</span>
                                                <button onClick={() => handleUnallocate(p.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 10, padding: 0 }}>✕</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {/* Add player dropdown */}
                                {unallocated.length > 0 && (
                                    <select
                                        value=""
                                        onChange={e => e.target.value && handleAllocate(squad.id, e.target.value)}
                                        style={{ ...S.input, marginTop: 8, fontSize: 10 }}
                                    >
                                        <option value="">+ Add player to {squad.name}...</option>
                                        {unallocated.map(p => (
                                            <option key={p.id} value={p.id}>{p.name} — Overall {p.overallScore}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        );
                    })}

                    {squads.length === 0 && (
                        <div style={{ ...S.subText, textAlign: "center", padding: 20 }}>No squads created yet. Create one above to start allocating players.</div>
                    )}
                </div>
            </div>
        );
    };

    // ═══════════════════════════════════════════════
    //  MEMBER MANAGEMENT LOGIC
    // ═══════════════════════════════════════════════
    const SUPABASE_URL = 'https://pudldzgmluwoocwxtzhw.supabase.co';

    const callCreateMember = async (membersPayload) => {
        const { data: { session: sess } } = await supabase.auth.getSession();
        const token = sess?.access_token;
        if (!token) throw new Error('Not authenticated');
        const res = await fetch(`${SUPABASE_URL}/functions/v1/create-member`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ members: membersPayload, emailTemplate: getEmailTemplateConfig() }),
        });
        if (!res.ok) {
            const errBody = await res.text();
            throw new Error(`Server error ${res.status}: ${errBody}`);
        }
        return await res.json();
    };

    const handleSingleAdd = async () => {
        const { name, email, role } = singleForm;
        if (!name.trim() || !email.trim()) { showToast('Name and email are required', 'error'); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast('Please enter a valid email', 'error'); return; }
        setCreating(true);
        try {
            const result = await callCreateMember([{ name: name.trim(), email: email.trim(), role }]);
            setCreateResults(result);
            if (result.results?.length > 0) {
                showToast(`✅ ${name} added successfully! Credentials sent.`, 'success');
                setSingleForm({ name: '', email: '', role: 'player' });
                await refreshMemberData();
            }
            if (result.errors?.length > 0) showToast(`❌ Error: ${result.errors[0].error}`, 'error');
        } catch (e) { showToast(`❌ ${e.message}`, 'error'); }
        finally { setCreating(false); }
    };

    const handleFileUpload = (file) => {
        if (!file) return;
        setBulkFileName(file.name);
        setCreateResults(null);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const jsonRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

                // Auto-detect columns (case-insensitive, partial match)
                const mapped = jsonRows.map(row => {
                    const keys = Object.keys(row);
                    const find = (patterns) => {
                        for (const p of patterns) {
                            const k = keys.find(k => k.toLowerCase().includes(p.toLowerCase()));
                            if (k && row[k]) return String(row[k]).trim();
                        }
                        return '';
                    };
                    const name = find(['name', 'full_name', 'display_name', 'player', 'student']);
                    const email = find(['email', 'e-mail', 'mail']);
                    let role = find(['role', 'type', 'position', 'access']).toLowerCase();
                    if (!['player', 'coach'].includes(role)) role = 'player';
                    return { name, email, role, valid: !!(name && email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) };
                }).filter(r => r.name || r.email); // Remove fully empty rows

                setBulkRows(mapped);
                if (mapped.length === 0) {
                    showToast('No valid rows found in spreadsheet. Need Name and Email columns.', 'error');
                } else {
                    showToast(`📋 Found ${mapped.length} rows (${mapped.filter(r => r.valid).length} valid)`, 'info');
                }
            } catch (err) {
                showToast(`Failed to parse file: ${err.message}`, 'error');
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleBulkCreate = async () => {
        const validRows = bulkRows.filter(r => r.valid);
        if (validRows.length === 0) { showToast('No valid rows to create', 'error'); return; }
        setCreating(true);
        try {
            const result = await callCreateMember(validRows.map(r => ({ name: r.name, email: r.email, role: r.role })));
            setCreateResults(result);
            const created = result.results?.length || 0;
            const failed = result.errors?.length || 0;
            showToast(`✅ Created ${created} member${created !== 1 ? 's' : ''}${failed > 0 ? `, ${failed} failed` : ''}`, created > 0 ? 'success' : 'error');
            if (created > 0) await refreshMemberData();
        } catch (e) { showToast(`❌ ${e.message}`, 'error'); }
        finally { setCreating(false); }
    };

    const handleRoleChange = async (memberId, newRole) => {
        setSaving(true);
        try {
            await updateProgramMember(memberId, { role: newRole });
            setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
            showToast(`Role updated to ${newRole}`, 'success');
        } catch (e) { showToast(`Failed to update role: ${e.message}`, 'error'); }
        finally { setSaving(false); }
    };

    const callManageMember = async (action, ids) => {
        const { data: { session: sess } } = await supabase.auth.getSession();
        const token = sess?.access_token;
        if (!token) throw new Error('Not authenticated');
        const res = await fetch(`${SUPABASE_URL}/functions/v1/manage-member`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ action, ids }),
        });
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        return await res.json();
    };

    const refreshMemberData = async () => {
        const [pm, dm] = await Promise.all([loadProgramMembers(), loadDeletedMembers()]);
        setMembers(pm || []);
        setDeletedMembers(dm || []);
        setSelectedIds(new Set());
    };

    const handleArchive = async (ids) => {
        setSaving(true);
        try {
            const result = await callManageMember('archive', ids);
            showToast(`📦 Archived ${result.results?.length || 0} member${(result.results?.length || 0) !== 1 ? 's' : ''}`, 'success');
            await refreshMemberData();
        } catch (e) { showToast(`❌ ${e.message}`, 'error'); }
        finally { setSaving(false); }
    };

    const handleRestore = async (ids) => {
        setSaving(true);
        try {
            const result = await callManageMember('restore', ids);
            showToast(`✅ Restored ${result.results?.length || 0} member${(result.results?.length || 0) !== 1 ? 's' : ''}`, 'success');
            await refreshMemberData();
        } catch (e) { showToast(`❌ ${e.message}`, 'error'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (ids) => {
        setSaving(true);
        try {
            const result = await callManageMember('delete', ids);
            showToast(`🗑️ Deleted ${result.results?.length || 0} member${(result.results?.length || 0) !== 1 ? 's' : ''} (recoverable for 30 days)`, 'success');
            await refreshMemberData();
        } catch (e) { showToast(`❌ ${e.message}`, 'error'); }
        finally { setSaving(false); setConfirmModal(null); setConfirmInput(''); }
    };

    const handleRestoreDeleted = async (ids) => {
        setSaving(true);
        try {
            const result = await callManageMember('restore_deleted', ids);
            showToast(`✅ Restored ${result.results?.length || 0} deleted member${(result.results?.length || 0) !== 1 ? 's' : ''}`, 'success');
            await refreshMemberData();
        } catch (e) { showToast(`❌ ${e.message}`, 'error'); }
        finally { setSaving(false); }
    };

    const toggleSelect = (id) => setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    const toggleSelectAll = (list) => {
        const allIds = list.map(m => m.id);
        const allSelected = allIds.every(id => selectedIds.has(id));
        setSelectedIds(allSelected ? new Set() : new Set(allIds));
    };

    // ═══════════════════════════════════════════════
    //  RENDER: USER MANAGEMENT TAB
    // ═══════════════════════════════════════════════
    const renderUsers = () => {
        const inputSty = { width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e4e4e7', fontSize: 12, fontFamily: F, outline: 'none', boxSizing: 'border-box' };
        const selectSty = { ...inputSty, cursor: 'pointer', appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 12 12%27%3E%3Cpath fill=%27%23999%27 d=%27M6 8L1 3h10z%27/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' };
        const actionBtn = (bg, label, onClick, disabled) => (
            <button onClick={onClick} disabled={disabled} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: disabled ? 'rgba(255,255,255,0.05)' : bg, color: disabled ? 'rgba(255,255,255,0.3)' : '#fff', fontSize: 12, fontWeight: 700, fontFamily: F, cursor: disabled ? 'default' : 'pointer', letterSpacing: 0.3, transition: 'all 0.2s' }}>{label}</button>
        );
        const iconBtn = (emoji, color, onClick, tip) => (
            <button title={tip} onClick={onClick} style={{ padding: '3px 6px', borderRadius: 4, border: 'none', background: `${color}12`, color, fontSize: 12, cursor: 'pointer', lineHeight: 1 }}>{emoji}</button>
        );

        const activeMembers = members.filter(m => m.active);
        const archivedMembers = members.filter(m => !m.active);
        const displayList = memberView === 'active' ? activeMembers : memberView === 'archived' ? archivedMembers : deletedMembers;
        const selArr = [...selectedIds];

        const daysRemaining = (deletedAt) => {
            const diff = 30 - Math.floor((Date.now() - new Date(deletedAt).getTime()) / 86400000);
            return Math.max(0, diff);
        };

        /* ── CONFIRMATION MODAL ── */
        const ConfirmDeleteModal = () => {
            if (!confirmModal) return null;
            const count = confirmModal.ids.length;
            return (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={() => { setConfirmModal(null); setConfirmInput(''); }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: '#1a1b2e', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '28px 32px', maxWidth: 420, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#ef4444', marginBottom: 8, fontFamily: F }}>⚠️ Confirm Deletion</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, marginBottom: 16 }}>
                            You are about to <strong style={{ color: '#ef4444' }}>delete {count} member{count !== 1 ? 's' : ''}</strong>. This will:
                            <ul style={{ paddingLeft: 16, margin: '8px 0' }}>
                                <li>Remove them from the active roster</li>
                                <li>Exclude them from all engine calculations</li>
                                <li>Disable their login access</li>
                            </ul>
                            Data will be recoverable for <strong style={{ color: '#fbbf24' }}>30 days</strong> from the Deleted tab.
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 8, fontWeight: 600 }}>Type <code style={{ color: '#ef4444', fontWeight: 800, fontSize: 12 }}>DELETE</code> to confirm:</div>
                        <input value={confirmInput} onChange={e => setConfirmInput(e.target.value)} placeholder="Type DELETE" autoFocus style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${confirmInput === 'DELETE' ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.3)'}`, borderRadius: 8, color: '#e4e4e7', fontSize: 13, fontFamily: 'monospace', fontWeight: 700, outline: 'none', boxSizing: 'border-box', marginBottom: 16 }} />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button onClick={() => { setConfirmModal(null); setConfirmInput(''); }} style={{ padding: '8px 18px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, fontFamily: F, cursor: 'pointer' }}>Cancel</button>
                            <button onClick={() => { if (confirmInput === 'DELETE') handleDelete(confirmModal.ids); }} disabled={confirmInput !== 'DELETE'} style={{ padding: '8px 18px', borderRadius: 6, border: 'none', background: confirmInput === 'DELETE' ? '#ef4444' : 'rgba(255,255,255,0.05)', color: confirmInput === 'DELETE' ? '#fff' : 'rgba(255,255,255,0.2)', fontSize: 11, fontWeight: 700, fontFamily: F, cursor: confirmInput === 'DELETE' ? 'pointer' : 'default', transition: 'all 0.2s' }}>🗑️ Delete Permanently</button>
                        </div>
                    </div>
                </div>
            );
        };

        return (
            <div>
                <ConfirmDeleteModal />

                {/* ─── ADD MEMBERS SECTION ─── */}
                <div style={S.card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div style={S.sectionTitle}>➕ Add Members</div>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => { setAddMode(addMode === 'single' ? null : 'single'); setCreateResults(null); }} style={{ padding: '6px 14px', borderRadius: 6, border: addMode === 'single' ? `1px solid ${B.pk}` : '1px solid rgba(255,255,255,0.1)', background: addMode === 'single' ? `${B.pk}15` : 'transparent', color: addMode === 'single' ? B.pk : 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 700, fontFamily: F, cursor: 'pointer' }}>👤 Individual</button>
                            <button onClick={() => { setAddMode(addMode === 'bulk' ? null : 'bulk'); setCreateResults(null); setBulkRows([]); setBulkFileName(''); }} style={{ padding: '6px 14px', borderRadius: 6, border: addMode === 'bulk' ? `1px solid ${B.pk}` : '1px solid rgba(255,255,255,0.1)', background: addMode === 'bulk' ? `${B.pk}15` : 'transparent', color: addMode === 'bulk' ? B.pk : 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 700, fontFamily: F, cursor: 'pointer' }}>📁 Bulk Upload</button>
                        </div>
                    </div>

                    {/* SINGLE ADD FORM */}
                    {addMode === 'single' && (
                        <div style={{ padding: '16px 0 0' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, marginBottom: 12 }}>
                                <div>
                                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginBottom: 4, letterSpacing: 1, textTransform: 'uppercase' }}>Full Name *</div>
                                    <input value={singleForm.name} onChange={e => setSingleForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Tom Smith" style={inputSty} />
                                </div>
                                <div>
                                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginBottom: 4, letterSpacing: 1, textTransform: 'uppercase' }}>Email *</div>
                                    <input value={singleForm.email} onChange={e => setSingleForm(f => ({ ...f, email: e.target.value }))} placeholder="e.g. tom@email.com" type="email" style={inputSty} />
                                </div>
                                <div>
                                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginBottom: 4, letterSpacing: 1, textTransform: 'uppercase' }}>Role</div>
                                    <select value={singleForm.role} onChange={e => setSingleForm(f => ({ ...f, role: e.target.value }))} style={selectSty}>
                                        <option value="player">🏏 Player</option>
                                        <option value="coach">📋 Coach</option>
                                    </select>
                                </div>
                            </div>
                            {actionBtn(`linear-gradient(135deg,${B.bl},${B.pk})`, creating ? '⏳ Creating...' : '✅ Create & Send Credentials', handleSingleAdd, creating || !singleForm.name.trim() || !singleForm.email.trim())}
                            {createResults?.results?.length > 0 && addMode === 'single' && (
                                <div style={{ marginTop: 12, padding: 12, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8 }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: '#22c55e', marginBottom: 6 }}>✅ Member Created</div>
                                    {createResults.results.map((r, i) => (<div key={i} style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', lineHeight: 1.8 }}><strong>{r.display_name}</strong> — Username: <code style={{ color: B.pk, fontWeight: 700 }}>{r.username}</code>, Credentials {r.credentials_sent ? '📧 Sent' : '⚠️ Not sent'}</div>))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* BULK UPLOAD */}
                    {addMode === 'bulk' && (
                        <div style={{ padding: '16px 0 0' }}>
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 8, lineHeight: 1.6 }}>Upload a spreadsheet with <strong style={{ color: '#e4e4e7' }}>Name</strong> and <strong style={{ color: '#e4e4e7' }}>Email</strong> columns. Optionally include a <strong style={{ color: '#e4e4e7' }}>Role</strong> column. Supports CSV, XLSX, XLS.</div>
                            <div onClick={() => fileInputRef.current?.click()} onDragOver={e => { e.preventDefault(); e.stopPropagation(); }} onDrop={e => { e.preventDefault(); e.stopPropagation(); const f = e.dataTransfer?.files?.[0]; if (f) handleFileUpload(f); }} style={{ border: '2px dashed rgba(255,255,255,0.12)', borderRadius: 10, padding: '28px 20px', textAlign: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', marginBottom: 12 }}>
                                <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={e => handleFileUpload(e.target.files?.[0])} />
                                <div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', fontFamily: F }}>{bulkFileName ? `📎 ${bulkFileName}` : 'Drop spreadsheet here or click to browse'}</div>
                                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>CSV, XLSX, XLS</div>
                            </div>
                            {bulkRows.length > 0 && (
                                <div>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>📋 Preview ({bulkRows.filter(r => r.valid).length} valid / {bulkRows.length} total)</div>
                                    <div style={{ maxHeight: 240, overflowY: 'auto', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                                            <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
                                                {['', 'Name', 'Email', 'Role'].map(h => (<th key={h} style={{ padding: '8px 6px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 600, fontSize: 10 }}>{h}</th>))}
                                            </tr></thead>
                                            <tbody>{bulkRows.map((r, i) => (
                                                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', opacity: r.valid ? 1 : 0.4 }}>
                                                    <td style={{ padding: '6px', width: 24 }}>{r.valid ? '✅' : '❌'}</td>
                                                    <td style={{ padding: '6px', color: '#e4e4e7', fontWeight: 600 }}>{r.name || '—'}</td>
                                                    <td style={{ padding: '6px', color: 'rgba(255,255,255,0.5)' }}>{r.email || '—'}</td>
                                                    <td style={{ padding: '6px' }}>
                                                        <select value={r.role} onChange={e => setBulkRows(prev => prev.map((row, j) => j === i ? { ...row, role: e.target.value } : row))} style={{ ...selectSty, padding: '4px 8px', fontSize: 10 }}>
                                                            <option value="player">Player</option><option value="coach">Coach</option>
                                                        </select>
                                                    </td>
                                                </tr>
                                            ))}</tbody>
                                        </table>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                                        <button onClick={() => { setBulkRows([]); setBulkFileName(''); setCreateResults(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, fontFamily: F, cursor: 'pointer' }}>Clear</button>
                                        {actionBtn(`linear-gradient(135deg,${B.bl},${B.pk})`, creating ? `⏳ Creating...` : `✅ Create ${bulkRows.filter(r => r.valid).length} Members`, handleBulkCreate, creating || bulkRows.filter(r => r.valid).length === 0)}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ─── MEMBER VIEW TABS ─── */}
                <div style={S.card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <div style={S.sectionTitle}>📨 Program Members</div>
                        <div style={{ display: 'flex', gap: 4 }}>
                            {[
                                { id: 'active', label: `Active (${activeMembers.length})`, color: '#22c55e' },
                                { id: 'archived', label: `Archived (${archivedMembers.length})`, color: '#f59e0b' },
                                { id: 'deleted', label: `Deleted (${deletedMembers.length})`, color: '#ef4444' },
                            ].map(v => (
                                <button key={v.id} onClick={() => { setMemberView(v.id); setSelectedIds(new Set()); }} style={{ padding: '5px 12px', borderRadius: 6, border: `1px solid ${memberView === v.id ? v.color : 'rgba(255,255,255,0.08)'}`, background: memberView === v.id ? `${v.color}15` : 'transparent', color: memberView === v.id ? v.color : 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 700, fontFamily: F, cursor: 'pointer', transition: 'all 0.2s' }}>{v.label}</button>
                            ))}
                        </div>
                    </div>

                    {/* BULK ACTION BAR */}
                    {selArr.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{selArr.length} selected</span>
                            <div style={{ flex: 1 }} />
                            {memberView === 'active' && <>
                                <button onClick={() => handleArchive(selArr)} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontSize: 10, fontWeight: 700, fontFamily: F, cursor: 'pointer' }}>📦 Archive {selArr.length}</button>
                                <button onClick={() => { setConfirmModal({ action: 'delete', ids: selArr }); setConfirmInput(''); }} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: 10, fontWeight: 700, fontFamily: F, cursor: 'pointer' }}>🗑️ Delete {selArr.length}</button>
                            </>}
                            {memberView === 'archived' && <>
                                <button onClick={() => handleRestore(selArr)} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: 'rgba(34,197,94,0.15)', color: '#22c55e', fontSize: 10, fontWeight: 700, fontFamily: F, cursor: 'pointer' }}>✅ Restore {selArr.length}</button>
                                <button onClick={() => { setConfirmModal({ action: 'delete', ids: selArr }); setConfirmInput(''); }} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: 10, fontWeight: 700, fontFamily: F, cursor: 'pointer' }}>🗑️ Delete {selArr.length}</button>
                            </>}
                            {memberView === 'deleted' && (
                                <button onClick={() => handleRestoreDeleted(selArr)} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: 'rgba(34,197,94,0.15)', color: '#22c55e', fontSize: 10, fontWeight: 700, fontFamily: F, cursor: 'pointer' }}>✅ Restore {selArr.length}</button>
                            )}
                            <button onClick={() => setSelectedIds(new Set())} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: F, cursor: 'pointer' }}>Clear</button>
                        </div>
                    )}
                </div>

                {/* ─── MEMBERS TABLE ─── */}
                {displayList.length > 0 ? (
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                            <thead>
                                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                                    <th style={{ padding: '8px 4px', width: 30 }}>
                                        <input type="checkbox" checked={displayList.length > 0 && displayList.every(m => selectedIds.has(m.id))} onChange={() => toggleSelectAll(displayList)} style={{ cursor: 'pointer' }} />
                                    </th>
                                    {(memberView === 'deleted' ? ["Username", "Display Name", "Email", "Role", "Deleted", "Days Left", ""] : ["Username", "Display Name", "Email", "Role", "Season", "Credentials", ""]).map(h => (
                                        <th key={h} style={{ padding: "8px 6px", textAlign: "left", color: "rgba(255,255,255,0.5)", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {displayList.map(m => (
                                    <tr key={m.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                        <td style={{ padding: '6px 4px' }}>
                                            <input type="checkbox" checked={selectedIds.has(m.id)} onChange={() => toggleSelect(m.id)} style={{ cursor: 'pointer' }} />
                                        </td>
                                        <td style={{ padding: "8px 6px", fontWeight: 700, color: "#e4e4e7" }}>{m.username}</td>
                                        <td style={{ padding: "8px 6px", color: "rgba(255,255,255,0.5)" }}>{m.display_name || "—"}</td>
                                        <td style={{ padding: "8px 6px", color: "rgba(255,255,255,0.5)" }}>{m.email || "—"}</td>
                                        <td style={{ padding: "8px 6px" }}>
                                            {memberView === 'active' && isAdmin ? (
                                                <select value={m.role} onChange={e => handleRoleChange(m.id, e.target.value)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: m.role === 'coach' ? '#60a5fa' : '#22c55e', fontSize: 10, fontWeight: 700, padding: '3px 6px', fontFamily: F, cursor: 'pointer' }}>
                                                    <option value="player">player</option><option value="coach">coach</option>
                                                </select>
                                            ) : (
                                                <span style={S.badge(m.role === "coach" ? "#60a5fa" : "#22c55e")}>{m.role}</span>
                                            )}
                                        </td>
                                        {memberView === 'deleted' ? (<>
                                            <td style={{ padding: "8px 6px", color: "rgba(255,255,255,0.3)", fontSize: 10 }}>{new Date(m.deleted_at).toLocaleDateString()}</td>
                                            <td style={{ padding: "8px 6px" }}><span style={S.badge(daysRemaining(m.deleted_at) > 7 ? '#22c55e' : daysRemaining(m.deleted_at) > 3 ? '#f59e0b' : '#ef4444')}>{daysRemaining(m.deleted_at)}d</span></td>
                                        </>) : (<>
                                            <td style={{ padding: "8px 6px", color: "rgba(255,255,255,0.3)" }}>{m.season || "—"}</td>
                                            <td style={{ padding: "8px 6px" }}><span style={S.badge(m.credentials_sent ? "#22c55e" : "#f59e0b")}>{m.credentials_sent ? "Sent" : "Pending"}</span></td>
                                        </>)}
                                        <td style={{ padding: "6px 4px", whiteSpace: 'nowrap' }}>
                                            {memberView === 'active' && <>
                                                {iconBtn('📦', '#f59e0b', () => handleArchive([m.id]), 'Archive')}
                                                {' '}
                                                {iconBtn('🗑️', '#ef4444', () => { setConfirmModal({ action: 'delete', ids: [m.id] }); setConfirmInput(''); }, 'Delete')}
                                            </>}
                                            {memberView === 'archived' && <>
                                                {iconBtn('✅', '#22c55e', () => handleRestore([m.id]), 'Restore')}
                                                {' '}
                                                {iconBtn('🗑️', '#ef4444', () => { setConfirmModal({ action: 'delete', ids: [m.id] }); setConfirmInput(''); }, 'Delete')}
                                            </>}
                                            {memberView === 'deleted' && iconBtn('✅', '#22c55e', () => handleRestoreDeleted([m.id]), 'Restore')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={{ ...S.card, textAlign: "center" }}>
                        <div style={S.subText}>
                            {memberView === 'active' && 'No active members. Use Add Members above.'}
                            {memberView === 'archived' && 'No archived members.'}
                            {memberView === 'deleted' && 'No deleted members in recovery.'}
                        </div>
                    </div>
                )}
            </div>
        );
    };



    // ═══════════════════════════════════════════════
    //  RENDER: ANALYTICS TAB
    // ═══════════════════════════════════════════════
    const renderAnalytics = () => {
        // Group events by type
        const typeCounts = {};
        const userActivity = {};
        const dailyLogins = {};

        analyticsEvents.forEach(ev => {
            typeCounts[ev.event_type] = (typeCounts[ev.event_type] || 0) + 1;

            if (!userActivity[ev.user_id]) userActivity[ev.user_id] = { count: 0, lastSeen: ev.created_at, events: [] };
            userActivity[ev.user_id].count++;
            userActivity[ev.user_id].events.push(ev.event_type);
            if (ev.created_at > userActivity[ev.user_id].lastSeen) userActivity[ev.user_id].lastSeen = ev.created_at;

            if (ev.event_type === "login") {
                const day = ev.created_at.slice(0, 10);
                dailyLogins[day] = (dailyLogins[day] || 0) + 1;
            }
        });

        const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
        const maxCount = sortedTypes.length > 0 ? sortedTypes[0][1] : 1;

        // User engagement levels
        const now = Date.now();
        const engagementList = Object.entries(userActivity).map(([uid, data]) => {
            const daysSince = Math.floor((now - new Date(data.lastSeen).getTime()) / 86400000);
            const level = daysSince <= 7 ? "active" : daysSince <= 30 ? "occasional" : "inactive";
            const profile = userProfiles.find(p => p.id === uid) || members.find(m => m.auth_user_id === uid);
            return { uid, ...data, daysSince, level, name: profile?.full_name || profile?.display_name || profile?.email || uid.slice(0, 8) };
        }).sort((a, b) => b.count - a.count);

        return (
            <div>
                {/* Period selector */}
                <div style={S.card}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <div style={S.sectionTitle}>📊 Analytics <InfoTip id="analytics" text="Track how people use the app. See which features get used most, who's active, and when people log in. Useful for understanding engagement patterns." /></div>
                        <select value={analyticsDays} onChange={e => setAnalyticsDays(Number(e.target.value))} style={{ ...S.input, width: "auto" }}>
                            <option value={7}>Last 7 days</option>
                            <option value={14}>Last 14 days</option>
                            <option value={30}>Last 30 days</option>
                            <option value={90}>Last 90 days</option>
                        </select>
                    </div>
                    <div style={S.subText}>{analyticsEvents.length} events tracked in this period</div>
                </div>

                {/* Feature Usage */}
                <div style={S.card}>
                    <div style={S.sectionTitle}>Feature Usage <InfoTip id="featureusage" text="Which features get used the most? Each bar shows the relative frequency of that action type across all users in the selected period." /></div>
                    <div style={S.subText}>Which features get used the most?</div>
                    <div style={{ marginTop: 10 }}>
                        {sortedTypes.map(([type, count]) => (
                            <div key={type} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                <div style={{ width: 120, fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.6)", textTransform: "uppercase" }}>{type.replace(/_/g, " ")}</div>
                                <div style={{ flex: 1, height: 8, borderRadius: 4, background: "rgba(255,255,255,0.04)", overflow: "hidden" }}>
                                    <div style={{ height: "100%", borderRadius: 4, background: `linear-gradient(90deg, ${B.bl}, ${B.pk})`, width: `${(count / maxCount) * 100}%`, transition: "width 0.4s", animation: "adminBarFill 0.6s ease-out" }} />
                                </div>
                                <div style={{ width: 40, textAlign: "right", fontSize: 11, fontWeight: 700, color: "#e4e4e7" }}>{count}</div>
                            </div>
                        ))}
                        {sortedTypes.length === 0 && <div style={S.subText}>No events recorded yet. Activity will appear here as users interact with the app.</div>}
                    </div>
                </div>

                {/* User Engagement */}
                <div style={S.card}>
                    <div style={S.sectionTitle}>User Engagement <InfoTip id="engagement" text="Shows how recently each user has been active. Green = used the app in the last 7 days, amber = 8-30 days, red = more than 30 days since last activity." /></div>
                    <div style={S.subText}>🟢 Active (last 7 days) • 🟡 Occasional (8-30 days) • 🔴 Inactive (30+ days)</div>
                    <div style={{ marginTop: 10 }}>
                        {engagementList.map(u => (
                            <div key={u.uid} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                <span style={{ fontSize: 12 }}>{u.level === "active" ? "🟢" : u.level === "occasional" ? "🟡" : "🔴"}</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: "#e4e4e7" }}>{u.name}</div>
                                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>{u.count} actions • Last seen {u.daysSince === 0 ? "today" : `${u.daysSince}d ago`}</div>
                                </div>
                            </div>
                        ))}
                        {engagementList.length === 0 && <div style={S.subText}>No user activity recorded yet.</div>}
                    </div>
                </div>

                {/* Login Timeline */}
                <div style={S.card}>
                    <div style={S.sectionTitle}>Login Timeline <InfoTip id="logins" text="A visual chart of daily login counts over the last 14 days. Taller bars = more logins that day. Useful for spotting engagement patterns and drop-offs." /></div>
                    <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 60, marginTop: 10 }}>
                        {Object.entries(dailyLogins).sort().slice(-14).map(([day, count]) => (
                            <div key={day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                                <div style={{ width: "100%", background: `linear-gradient(180deg, ${B.bl}, ${B.pk})`, borderRadius: 3, height: Math.max(4, (count / 10) * 50) }} />
                                <div style={{ fontSize: 7, color: "rgba(255,255,255,0.2)", marginTop: 2 }}>{day.slice(5)}</div>
                            </div>
                        ))}
                    </div>
                    {Object.keys(dailyLogins).length === 0 && <div style={S.subText}>No login events recorded yet.</div>}
                </div>
            </div>
        );
    };

    // ═══════════════════════════════════════════════
    //  RENDER: EMAIL TEMPLATE TAB
    // ═══════════════════════════════════════════════
    const renderEmailTemplate = () => {
        const resolvedSubject = emailSubject.replace("{{academyName}}", emailAcademyName);

        const emailHtml = `
            <div style="max-width:600px;margin:0 auto;font-family:'Segoe UI',Helvetica,Arial,sans-serif;background:#0f1117;color:#e4e4e7;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
                <!-- Header -->
                <div style="background:linear-gradient(135deg,#1a1b2e,#0d1b3e);padding:32px 40px 24px;text-align:center;border-bottom:3px solid #e91e63;">
                    <img src="${LOGO}" alt="RRA" style="width:64px;height:64px;object-fit:contain;margin-bottom:12px;" />
                    <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.5);letter-spacing:3px;text-transform:uppercase;margin-bottom:4px;">${emailAcademyName}</div>
                    <div style="font-size:22px;font-weight:800;color:#ffffff;">${emailHeading}</div>
                </div>
                <!-- Body -->
                <div style="padding:32px 40px;">
                    <p style="font-size:14px;line-height:1.7;color:rgba(255,255,255,0.75);margin:0 0 24px;">
                        Hi <strong style="color:#ffffff;">${"{{playerName}}"}</strong>,
                    </p>
                    <p style="font-size:14px;line-height:1.7;color:rgba(255,255,255,0.75);margin:0 0 28px;">
                        ${emailBody}
                    </p>
                    <!-- Credential Card -->
                    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(233,30,99,0.25);border-radius:10px;padding:20px 24px;margin-bottom:28px;">
                        <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.4);letter-spacing:2px;text-transform:uppercase;margin-bottom:14px;">YOUR LOGIN CREDENTIALS</div>
                        <div style="display:flex;margin-bottom:10px;">
                            <span style="font-size:12px;color:rgba(255,255,255,0.4);width:90px;">Username</span>
                            <span style="font-size:14px;font-weight:700;color:#e91e63;font-family:monospace;">jsmit01</span>
                        </div>
                        <div style="display:flex;">
                            <span style="font-size:12px;color:rgba(255,255,255,0.4);width:90px;">Password</span>
                            <span style="font-size:14px;font-weight:700;color:#3b82f6;font-family:monospace;">xG4k2pQ9</span>
                        </div>
                    </div>
                    <!-- CTA Button -->
                    <div style="text-align:center;margin-bottom:28px;">
                        <a href="${emailLoginUrl}" style="display:inline-block;background:linear-gradient(135deg,#e91e63,#9c27b0);color:#ffffff;text-decoration:none;padding:12px 36px;border-radius:8px;font-size:13px;font-weight:700;letter-spacing:0.5px;">Login to DNA Platform →</a>
                    </div>
                    <p style="font-size:12px;color:rgba(255,255,255,0.35);line-height:1.6;margin:0;border-top:1px solid rgba(255,255,255,0.06);padding-top:20px;">
                        ⚠️ Please keep these credentials safe and do not share them. If you experience any issues logging in, speak to your coach.
                    </p>
                </div>
                <!-- Footer -->
                <div style="background:rgba(255,255,255,0.02);padding:20px 40px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
                    <div style="font-size:10px;color:rgba(255,255,255,0.25);line-height:1.6;">
                        ${emailFooter}<br/>
                        <strong style="color:rgba(255,255,255,0.4);">${emailAcademyName}</strong> &middot; DNA Development Program
                    </div>
                    ${emailSignature ? `
                    <div style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.06);text-align:left;">
                        ${emailSignature}
                    </div>
                    ` : ''}
                </div>
            </div>
        `;

        return (
            <div>
                {/* Config Panel */}
                <div style={S.card}>
                    <div style={S.sectionTitle}>✉️ Email Branding Configuration <InfoTip id="emailconfig" text="Configure how credential emails appear to players and parents. Changes here update the live preview below and will be used when sending credentials." /></div>
                    <div style={S.subText}>These settings control the branding of all outgoing credential emails.</div>

                    <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        {/* Academy Name */}
                        <div>
                            <label style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 4 }}>Academy Name</label>
                            <input
                                value={emailAcademyName}
                                onChange={e => setEmailAcademyName(e.target.value)}
                                style={S.input}
                            />
                        </div>
                        {/* Sender Name */}
                        <div>
                            <label style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 4 }}>Sender Name</label>
                            <input
                                value={emailSenderName}
                                onChange={e => setEmailSenderName(e.target.value)}
                                style={S.input}
                            />
                        </div>
                        {/* Reply-To */}
                        <div>
                            <label style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 4 }}>Reply-To Address</label>
                            <input
                                value={emailReplyTo}
                                onChange={e => setEmailReplyTo(e.target.value)}
                                style={S.input}
                            />
                        </div>
                        {/* Subject */}
                        <div>
                            <label style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 4 }}>Subject Line</label>
                            <input
                                value={emailSubject}
                                onChange={e => setEmailSubject(e.target.value)}
                                style={S.input}
                            />
                        </div>
                        {/* Login URL */}
                        <div style={{ gridColumn: "1 / -1" }}>
                            <label style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 4 }}>Login URL</label>
                            <input
                                value={emailLoginUrl}
                                onChange={e => setEmailLoginUrl(e.target.value)}
                                style={S.input}
                            />
                        </div>
                    </div>

                    {/* Heading */}
                    <div style={{ marginTop: 12 }}>
                        <label style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 4 }}>Email Heading</label>
                        <input
                            value={emailHeading}
                            onChange={e => setEmailHeading(e.target.value)}
                            style={S.input}
                        />
                    </div>

                    {/* Body */}
                    <div style={{ marginTop: 12 }}>
                        <label style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 4 }}>Email Body</label>
                        <textarea
                            value={emailBody}
                            onChange={e => setEmailBody(e.target.value)}
                            rows={3}
                            style={{ ...S.input, resize: "vertical", lineHeight: 1.6 }}
                        />
                    </div>

                    {/* Footer */}
                    <div style={{ marginTop: 12 }}>
                        <label style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 4 }}>Footer Text</label>
                        <textarea
                            value={emailFooter}
                            onChange={e => setEmailFooter(e.target.value)}
                            rows={2}
                            style={{ ...S.input, resize: "vertical", lineHeight: 1.6 }}
                        />
                    </div>

                    {/* Email Signature */}
                    <div style={{ marginTop: 16, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <label style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>✍️ Email Signature (HTML)</label>
                            {emailSignature && (
                                <button
                                    onClick={() => setEmailSignature("")}
                                    style={{ ...S.btn("#ef4444"), padding: "3px 10px", fontSize: 9 }}
                                >Clear Signature</button>
                            )}
                        </div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 8, lineHeight: 1.5 }}>
                            Paste your Outlook signature HTML below. To get it: Open Outlook → Settings → Signatures → Copy your signature → Paste here. It will render in the email footer.
                        </div>
                        <textarea
                            value={emailSignature}
                            onChange={e => setEmailSignature(e.target.value)}
                            placeholder='Paste your Outlook signature HTML here...'
                            rows={5}
                            style={{ ...S.input, resize: "vertical", lineHeight: 1.5, fontFamily: "monospace", fontSize: 10 }}
                        />
                        {emailSignature && (
                            <div style={{ marginTop: 10, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: 12, background: "rgba(255,255,255,0.02)" }}>
                                <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>SIGNATURE PREVIEW</div>
                                <div dangerouslySetInnerHTML={{ __html: emailSignature }} />
                            </div>
                        )}
                    </div>

                    {/* Save / Reset buttons */}
                    <div style={{ marginTop: 20, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 16, display: "flex", gap: 10, justifyContent: "flex-end" }}>
                        <button onClick={handleResetEmailTemplate} style={{ ...S.btn("rgba(255,255,255,0.08)"), color: "rgba(255,255,255,0.5)" }}>Reset to Defaults</button>
                        <button onClick={handleSaveEmailTemplate} style={S.btn("#22c55e")}>💾 Save Template</button>
                    </div>
                </div>

                {/* Envelope Info */}
                <div style={S.card}>
                    <div style={S.sectionTitle}>📬 Envelope Details</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 8 }}>
                        <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "10px 14px" }}>
                            <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>FROM</div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#e4e4e7" }}>{emailSenderName}</div>
                            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>noreply@rramelbourne.com</div>
                        </div>
                        <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "10px 14px" }}>
                            <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>REPLY-TO</div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: B.pk }}>{emailReplyTo}</div>
                        </div>
                        <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "10px 14px" }}>
                            <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>SUBJECT</div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#e4e4e7" }}>{resolvedSubject}</div>
                        </div>
                    </div>
                </div>

                {/* Live Preview */}
                <div style={S.card}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                        <div style={S.sectionTitle}>👁️ Live Email Preview</div>
                        <div style={{ display: "flex", gap: 6 }}>
                            <span style={{ ...S.badge("#22c55e"), fontSize: 9 }}>Sample Data</span>
                            <span style={{ ...S.badge(B.pk), fontSize: 9 }}>Player: Jai Smith</span>
                        </div>
                    </div>
                    <div style={S.subText}>This is exactly what the recipient will see in their inbox. The {"{{ playerName }}"} placeholder will be replaced with the actual player's name.</div>

                    {/* Email frame */}
                    <div style={{
                        marginTop: 16,
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 12,
                        overflow: "hidden",
                        boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                    }}>
                        {/* Fake email client header */}
                        <div style={{
                            background: "rgba(255,255,255,0.06)",
                            padding: "10px 16px",
                            borderBottom: "1px solid rgba(255,255,255,0.08)",
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                        }}>
                            <div style={{ display: "flex", gap: 5 }}>
                                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }} />
                                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b" }} />
                                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e" }} />
                            </div>
                            <div style={{ flex: 1, fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: F, textAlign: "center" }}>
                                ✉️ {resolvedSubject}
                            </div>
                        </div>
                        {/* Rendered email */}
                        <div
                            style={{ padding: 20, background: "#0a0b10" }}
                            dangerouslySetInnerHTML={{ __html: emailHtml.replace(/\{\{playerName\}\}/g, "Jai Smith") }}
                        />
                    </div>
                </div>
            </div>
        );
    };

    // ═══════════════════════════════════════════════
    //  MAIN RENDER
    // ═══════════════════════════════════════════════
    const content = {
        visualizer: renderVisualizer,
        controls: renderControls,
        tiers: renderTiers,
        players: renderPlayers,
        rankings: renderRankings,
        users: renderUsers,
        email: renderEmailTemplate,
        analytics: renderAnalytics,
    };

    return (
        <div style={S.page} onClick={() => tipOpen && setTipOpen(null)}>


            {/* CSS Keyframe Animations */}
            <style ref={styleRef}>{`
                @keyframes adminSlideUp {
                    from { opacity: 0; transform: translateY(12px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes adminGlow {
                    0%, 100% { box-shadow: 0 0 8px ${B.pk}50; }
                    50% { box-shadow: 0 0 20px ${B.pk}80, 0 0 40px ${B.pk}30; }
                }
                @keyframes adminPulse {
                    0%, 100% { opacity: 0.6; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.05); }
                }
                @keyframes adminBarFill {
                    from { width: 0; }
                }
                @keyframes adminLoadPulse {
                    0%, 100% { opacity: 0.3; }
                    50% { opacity: 0.8; }
                }
                @keyframes adminFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>

            {/* Top Bar */}
            <div style={S.topBar}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {/* Logo with glow ring */}
                    <div style={{
                        width: 42, height: 42, borderRadius: "50%",
                        background: `${B.pk}18`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        animation: "adminGlow 3s ease-in-out infinite",
                        border: `2px solid ${B.pk}40`,
                    }}>
                        <img src={LOGO} alt="" style={{ width: 28, height: 28, objectFit: "contain" }} />
                    </div>
                    <div>
                        <div style={{
                            fontSize: 15, fontWeight: 900, color: "#e4e4e7", fontFamily: F,
                            letterSpacing: 0.5,
                        }}>Admin Dashboard</div>
                        <div style={{
                            fontSize: 9, fontWeight: 600, color: B.pk, fontFamily: F,
                            letterSpacing: 1.5, textTransform: "uppercase",
                        }}>RRA DNA Engine Command Center</div>
                    </div>
                </div>
                <button
                    onClick={onSwitchToCoach || onBack}
                    style={{
                        ...S.btn("rgba(255,255,255,0.08)"), color: "rgba(255,255,255,0.6)",
                        border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(8px)",
                        display: 'flex', alignItems: 'center', gap: 6,
                    }}
                >🏏 Coach Portal</button>
            </div>

            {/* Tab Bar */}
            <div style={S.tabBar}>
                {TABS.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        onMouseEnter={() => setHoveredTab(t.id)}
                        onMouseLeave={() => setHoveredTab(null)}
                        style={S.tab(tab === t.id, hoveredTab === t.id)}
                    >
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div style={{ padding: "16px 16px 32px", maxWidth: 1100, margin: "0 auto" }}>
                {loading ? (
                    <div style={{ textAlign: "center", padding: 60 }}>
                        <div style={{
                            width: 48, height: 48, borderRadius: "50%",
                            border: `3px solid ${B.pk}30`, borderTop: `3px solid ${B.pk}`,
                            margin: "0 auto 16px", animation: "adminPulse 1s ease-in-out infinite",
                        }} />
                        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontFamily: F, animation: "adminLoadPulse 1.5s ease-in-out infinite" }}>
                            Loading admin data...
                        </div>
                    </div>
                ) : (
                    <>
                        <StatRow />
                        {content[tab]?.()}
                    </>
                )}
            </div>

            {/* Toast */}
            {toast && <div style={S.toastStyle(toast.type)}>{toast.msg}</div>}

            {/* Saving overlay */}
            {saving && (
                <div style={{
                    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                    background: "rgba(0,0,0,0.3)", backdropFilter: "blur(2px)",
                    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9998,
                }}>
                    <div style={{
                        background: B.nvD, border: `1px solid ${B.pk}40`, borderRadius: 12,
                        padding: "16px 32px", fontFamily: F, fontSize: 12, fontWeight: 700,
                        color: B.pk, boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                    }}>Saving...</div>
                </div>
            )}
        </div>
    );
}
