import { useState, useMemo } from "react";

// ═══ COACH DASHBOARD ═══
// Props: { players, compTiers, dbWeights, engineConst, onBack, onSelectPlayer,
//          calcPDI, calcCCM, calcCohortPercentile, calcAgeScore, getAge, getBracket,
//          techItems, ROLES, B, F, LOGO, IQ_ITEMS, MN_ITEMS, PH_MAP, Ring, sGrad }

export default function CoachDashboard({
    players, compTiers, dbWeights, engineConst,
    onBack, onSelectPlayer,
    calcPDI, calcCCM, calcCohortPercentile, calcAgeScore,
    getAge, getBracket, techItems,
    ROLES, B, F, LOGO, IQ_ITEMS, MN_ITEMS, PH_MAP, Ring, sGrad
}) {
    const [selId, setSelId] = useState(null);
    const [tab, setTab] = useState("overview");
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState(null);
    const [sideOpen, setSideOpen] = useState(false);
    const [compareA, setCompareA] = useState(null);
    const [compareB, setCompareB] = useState(null);
    const [sortCol, setSortCol] = useState("pdi");
    const [sortDir, setSortDir] = useState("desc");
    const [tipOpen, setTipOpen] = useState(null);

    const _isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;

    // ═══ EXPLAINER TOOLTIPS ═══
    const TIPS = {
        pdi: "Player Development Index — weighted composite of domain skill scores contextualised by competition level. Scale: 0–5.0",
        ccm: "Competition Context Multiplier — adjusts scores based on the difficulty of competitions played (CTI) and the player's age relative to expected midpoint (ARM)",
        cti: "Competition Tier Index — numerical value assigned to each competition level reflecting its relative quality and challenge",
        arm: "Age Relativity Modifier — adjusts for players competing above or below their age group's expected competition level",
        sagi: "Self-Awareness Gap Index — difference between player self-ratings and coach ratings. Positive = over-estimates, negative = under-estimates",
        trajectory: "🚀 Flagged when a young player's PDI exceeds cohort average while competing above age expectations — suggests high upside potential",
        core: "Pathway measures absolute development level. Cohort measures rank among peers. Age measures competition-age fit. Overall is the composite average.",
        domain_wt: "Each domain is weighted based on the player's role. For example, Technical carries more weight for specialist batters, while Physical is weighted higher for pace bowlers.",
        cohort_total: "Total number of players who have submitted their survey and are in the active cohort",
        avg_pdi: "The mean PDI across all assessed players in the cohort — shows overall program development level",
        progress: "How many players have been assessed by a coach out of the total submitted players",
        traj_flags: "Players flagged as accelerated development candidates based on age-competition PDI analysis",
        pathway: "How far along the pathway from Foundation to Elite this player has progressed (0–100)",
        cohort_score: "Where this player sits relative to all other assessed players in the cohort (percentile rank)",
        age_score: "How age-appropriate is this player's competition level — higher means playing above expected age level",
        overall: "Composite average of Pathway, Cohort, and Age scores — a single number summarising development position",
    };

    const InfoTip = ({ id, style }) => {
        const isOpen = tipOpen === id;
        return (
            <span style={{ position: "relative", display: "inline-block", ...style }}>
                <button
                    onClick={e => { e.stopPropagation(); setTipOpen(isOpen ? null : id); }}
                    style={{
                        width: 16, height: 16, borderRadius: "50%", border: `1.5px solid ${isOpen ? B.pk : "rgba(255,255,255,0.25)"}`,
                        background: isOpen ? `${B.pk}25` : "transparent", cursor: "pointer",
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        fontSize: 9, fontWeight: 800, color: isOpen ? B.pk : "rgba(255,255,255,0.4)",
                        fontFamily: F, padding: 0, lineHeight: 1, verticalAlign: "middle", marginLeft: 4
                    }}
                >ⓘ</button>
                {isOpen && (
                    <div style={{
                        position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)",
                        background: B.nvD, border: `1px solid ${B.pk}40`, borderRadius: 8, padding: "8px 10px",
                        fontSize: 10, color: "rgba(255,255,255,0.8)", fontFamily: F, lineHeight: 1.5,
                        width: 220, zIndex: 1000, boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                        pointerEvents: "auto"
                    }}>
                        {TIPS[id]}
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

    // Light-themed InfoTip for sections with light backgrounds
    const InfoTipLight = ({ id, style }) => {
        const isOpen = tipOpen === id;
        return (
            <span style={{ position: "relative", display: "inline-block", ...style }}>
                <button
                    onClick={e => { e.stopPropagation(); setTipOpen(isOpen ? null : id); }}
                    style={{
                        width: 16, height: 16, borderRadius: "50%", border: `1.5px solid ${isOpen ? B.pk : B.g400}`,
                        background: isOpen ? `${B.pk}15` : "transparent", cursor: "pointer",
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        fontSize: 9, fontWeight: 800, color: isOpen ? B.pk : B.g400,
                        fontFamily: F, padding: 0, lineHeight: 1, verticalAlign: "middle", marginLeft: 4
                    }}
                >ⓘ</button>
                {isOpen && (
                    <div style={{
                        position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)",
                        background: B.nvD, border: `1px solid ${B.pk}40`, borderRadius: 8, padding: "8px 10px",
                        fontSize: 10, color: "rgba(255,255,255,0.85)", fontFamily: F, lineHeight: 1.5,
                        width: 220, zIndex: 1000, boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                    }}>
                        {TIPS[id]}
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

    // ═══ COMPUTED DATA ═══
    const submitted = useMemo(() => players.filter(p => p.submitted), [players]);

    const playerData = useMemo(() => {
        return submitted.map(p => {
            const ccmR = calcCCM(p.grades, p.dob, compTiers, engineConst);
            const hasCd = Object.keys(p.cd || {}).some(k => k.match(/^t1_/));
            const hasSelf = Object.keys(p.self_ratings || {}).some(k => k.match(/^t1_/));
            const hasData = hasCd || hasSelf || (p.grades?.length > 0);
            const dn = hasData ? calcPDI({ ...p.cd, _dob: p.dob }, p.self_ratings, p.role, ccmR, dbWeights, engineConst, p.grades, {}, p.topBat, p.topBowl, compTiers) : null;
            const age = getAge(p.dob);
            const bracket = getBracket(p.dob);
            const ro = ROLES.find(r => r.id === p.role);
            const ini = p.name ? p.name.split(" ").map(w => w[0]).join("").slice(0, 2) : "?";
            return { ...p, ccmR, hasCd, dn, age, bracket, ro, ini };
        });
    }, [submitted, compTiers, dbWeights, engineConst, calcPDI, calcCCM, getAge, getBracket, ROLES]);

    const cohortStats = useMemo(() => {
        const assessed = playerData.filter(p => p.dn && p.dn.pdi > 0);
        const avgPdi = assessed.length > 0 ? assessed.reduce((s, p) => s + p.dn.pdi, 0) / assessed.length : 0;
        const trajCount = assessed.filter(p => p.dn.trajectory).length;
        return {
            total: playerData.length,
            assessed: assessed.length,
            avgPdi: Math.round(avgPdi * 100) / 100,
            trajCount,
        };
    }, [playerData]);

    // ═══ FILTERED & SORTED LIST ═══
    const filteredPlayers = useMemo(() => {
        let list = playerData;
        if (search) list = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
        if (roleFilter) list = list.filter(p => p.role === roleFilter);
        return list;
    }, [playerData, search, roleFilter]);

    const sel = selId ? playerData.find(p => p.id === selId) : null;

    // Sorted table data for Compare tab
    const sortedTable = useMemo(() => {
        const assessed = playerData.filter(p => p.dn && p.dn.pdi > 0);
        return [...assessed].sort((a, b) => {
            let va, vb;
            switch (sortCol) {
                case "name": va = a.name; vb = b.name; return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
                case "age": va = a.age || 0; vb = b.age || 0; break;
                case "role": va = a.ro?.sh || ""; vb = b.ro?.sh || ""; return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
                case "pdi": va = a.dn?.pdi || 0; vb = b.dn?.pdi || 0; break;
                case "ccm": va = a.ccmR?.ccm || 0; vb = b.ccmR?.ccm || 0; break;
                case "sagi": va = a.dn?.sagi ?? 0; vb = b.dn?.sagi ?? 0; break;
                default: va = a.dn?.pdi || 0; vb = b.dn?.pdi || 0;
            }
            return sortDir === "asc" ? va - vb : vb - va;
        });
    }, [playerData, sortCol, sortDir]);

    // ═══ STYLES ═══
    const dbBg = `linear-gradient(180deg, ${B.nvD} 0%, #0a1628 100%)`;
    const cardDk = {
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12, padding: 14, marginBottom: 10
    };
    const pill = (active, col = B.pk) => ({
        padding: "4px 10px", borderRadius: 20, border: active ? `1.5px solid ${col}` : "1.5px solid rgba(255,255,255,0.12)",
        background: active ? `${col}20` : "transparent", color: active ? col : "rgba(255,255,255,0.4)",
        fontSize: 10, fontWeight: 700, fontFamily: F, cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap"
    });
    const tabStyle = (active) => ({
        padding: "6px 14px", borderRadius: 20, border: "none",
        background: active ? B.pk : "transparent", color: active ? B.w : "rgba(255,255,255,0.4)",
        fontSize: 11, fontWeight: 700, fontFamily: F, cursor: "pointer", transition: "all 0.2s"
    });

    // ═══ PLAYER SIDEBAR ═══
    const renderSidebar = () => (
        <div style={{
            width: _isDesktop ? 280 : "100%", flexShrink: 0,
            background: "rgba(255,255,255,0.02)", borderRight: _isDesktop ? "1px solid rgba(255,255,255,0.06)" : "none",
            display: "flex", flexDirection: "column", height: _isDesktop ? "calc(100vh - 120px)" : "auto",
            ...(_isDesktop ? {} : { position: "fixed", top: 0, left: sideOpen ? 0 : "-100%", width: "85%", height: "100vh", zIndex: 200, background: B.nvD, transition: "left 0.3s", boxShadow: sideOpen ? "4px 0 30px rgba(0,0,0,0.5)" : "none" })
        }}>
            {/* Search */}
            <div style={{ padding: "12px 12px 8px" }}>
                <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "rgba(255,255,255,0.3)" }}>🔍</span>
                    <input
                        value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search players..."
                        style={{
                            width: "100%", padding: "7px 8px 7px 28px", borderRadius: 8,
                            border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)",
                            fontSize: 11, fontFamily: F, color: B.w, outline: "none", boxSizing: "border-box"
                        }}
                    />
                </div>
                {/* Role filters */}
                <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
                    <button onClick={() => setRoleFilter(null)} style={pill(!roleFilter, B.w)}>All</button>
                    {ROLES.map(r => (
                        <button key={r.id} onClick={() => setRoleFilter(roleFilter === r.id ? null : r.id)}
                            style={pill(roleFilter === r.id, r.id === "pace" ? B.bl : r.id === "spin" ? B.prp : r.id === "keeper" ? B.sky : B.pk)}>
                            {r.sh}
                        </button>
                    ))}
                </div>
            </div>
            {/* Player list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 8px" }}>
                {filteredPlayers.map(p => (
                    <div
                        key={p.id}
                        onClick={() => { setSelId(p.id); setSideOpen(false); setTab("overview"); }}
                        style={{
                            display: "flex", gap: 8, alignItems: "center", padding: "8px 10px", borderRadius: 8,
                            cursor: "pointer", marginBottom: 2, transition: "all 0.15s",
                            background: selId === p.id ? `${B.pk}15` : "transparent",
                            borderLeft: selId === p.id ? `3px solid ${B.pk}` : "3px solid transparent",
                        }}
                    >
                        <div style={{ width: 32, height: 32, borderRadius: "50%", ...sGrad, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <span style={{ color: B.w, fontSize: 10, fontWeight: 800, fontFamily: F }}>{p.ini}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: B.w, fontFamily: F, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", fontFamily: F }}>{p.age}yo · {p.ro?.sh}</div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "flex-end" }}>
                            {p.dn && <span style={{ fontSize: 9, fontWeight: 800, color: p.dn.gc, fontFamily: F }}>{p.dn.pdi.toFixed(1)}</span>}
                            {p.dn?.trajectory && <span style={{ fontSize: 8 }}>🚀</span>}
                        </div>
                    </div>
                ))}
                {filteredPlayers.length === 0 && (
                    <div style={{ padding: 20, textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: F }}>No players match filters</div>
                )}
            </div>
            {/* Mobile close */}
            {!_isDesktop && sideOpen && (
                <button onClick={() => setSideOpen(false)} style={{
                    position: "absolute", top: 10, right: 10, width: 28, height: 28, borderRadius: "50%",
                    border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: B.w,
                    fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"
                }}>✕</button>
            )}
        </div>
    );

    // ═══ COHORT SUMMARY BAR ═══
    const renderCohortBar = () => (
        <div style={{ display: "flex", gap: 8, padding: "12px 0", overflowX: "auto", flexWrap: "wrap" }}>
            {[
                { label: "Total Players", value: cohortStats.total, icon: "👥", color: B.w, tipId: "cohort_total" },
                { label: "Avg PDI", value: cohortStats.avgPdi.toFixed(2), icon: "📊", color: B.pk, tipId: "avg_pdi" },
                { label: "Assessed", value: `${cohortStats.assessed}/${cohortStats.total}`, icon: "✏️", color: B.bl, tipId: "progress" },
                { label: "Trajectory", value: `${cohortStats.trajCount} 🚀`, icon: "", color: B.grn, tipId: "traj_flags" },
            ].map(m => (
                <div key={m.label} style={{ ...cardDk, flex: "1 1 120px", minWidth: 110, textAlign: "center", padding: "10px 8px" }}>
                    <div style={{ fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.35)", fontFamily: F, letterSpacing: 1, textTransform: "uppercase" }}>
                        {m.icon} {m.label}
                        <InfoTip id={m.tipId} />
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: m.color, fontFamily: F, marginTop: 4 }}>{m.value}</div>
                </div>
            ))}
        </div>
    );

    // ═══ OVERVIEW TAB ═══
    const renderOverview = () => {
        if (!sel) return <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.3)", fontFamily: F }}>← Select a player from the sidebar</div>;
        if (!sel.dn) return (
            <div style={{ padding: 40, textAlign: "center" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.4)", fontFamily: F }}>No assessment data yet</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontFamily: F, marginTop: 4 }}>Complete the assessment to see scores</div>
                <button onClick={() => onSelectPlayer && onSelectPlayer(sel.id)} style={{
                    marginTop: 12, padding: "8px 16px", borderRadius: 8, border: "none",
                    background: `linear-gradient(135deg,${B.bl},${B.pk})`, color: B.w,
                    fontSize: 11, fontWeight: 700, fontFamily: F, cursor: "pointer"
                }}>Begin Assessment →</button>
            </div>
        );

        const dn = sel.dn;
        const ccmR = sel.ccmR;
        const pathwayScore = dn.pdiPct;
        const cohortScore = calcCohortPercentile(dn.pdi, players, compTiers, dbWeights, engineConst);
        const ageScore = calcAgeScore(ccmR.arm, engineConst);
        const overallScore = Math.round((pathwayScore + cohortScore + ageScore) / 3);

        const coreScores = [
            { label: "Pathway", value: pathwayScore, color: B.pk, icon: "🛤️", tipId: "pathway" },
            { label: "Cohort", value: cohortScore, color: B.bl, icon: "👥", tipId: "cohort_score" },
            { label: "Age", value: ageScore, color: B.prp, icon: "🎂", tipId: "age_score" },
            { label: "Overall", value: overallScore, color: B.grn, icon: "⭐", tipId: "overall" },
        ];

        return (
            <div>
                {/* Player Header */}
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
                    <div style={{ width: 48, height: 48, borderRadius: "50%", ...sGrad, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ color: B.w, fontSize: 16, fontWeight: 800, fontFamily: F }}>{sel.ini}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 120 }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: B.w, fontFamily: F }}>{sel.name}</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontFamily: F }}>{sel.age}yo · {sel.bracket} · {sel.ro?.label} · {sel.club}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 800, background: `${dn.gc}20`, color: dn.gc, fontFamily: F }}>{dn.g}</span>
                        {dn.trajectory && <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 800, background: `${B.grn}20`, color: B.grn, fontFamily: F }}>🚀 TRAJECTORY</span>}
                    </div>
                    {onSelectPlayer && (
                        <button onClick={() => onSelectPlayer(sel.id)} style={{
                            padding: "5px 10px", borderRadius: 6, border: `1px solid ${B.bl}40`,
                            background: "transparent", color: B.bl, fontSize: 9, fontWeight: 600, fontFamily: F, cursor: "pointer"
                        }}>View Survey →</button>
                    )}
                </div>

                {/* Core Scores */}
                <div style={{ ...cardDk, padding: 16 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.35)", fontFamily: F, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12, textAlign: "center" }}>
                        CORE SCORES <InfoTip id="core" />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                        {coreScores.map(sc => (
                            <div key={sc.label} style={{ textAlign: "center", minWidth: 65 }}>
                                <Ring value={sc.value} size={sc.label === "Overall" ? 76 : 64} color={sc.color} label={null} />
                                <div style={{ fontSize: 8, fontWeight: 800, color: B.w, fontFamily: F, marginTop: 3 }}>
                                    {sc.icon} {sc.label} <InfoTip id={sc.tipId} />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div style={{ textAlign: "center", padding: "8px 0", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                        <div style={{ fontSize: 22, fontWeight: 900, color: B.w, fontFamily: F }}>{overallScore}<span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>/100</span></div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.4)", fontFamily: F, letterSpacing: 1 }}>OVERALL PLAYER SCORE</div>
                    </div>
                </div>

                {/* PDI Detail + SAGI side-by-side on desktop */}
                <div style={_isDesktop ? { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 } : {}}>
                    {/* PDI Detail */}
                    <div style={cardDk}>
                        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
                            <Ring value={dn.pdiPct} size={72} color={dn.gc} label="PDI" />
                            <div style={{ flex: 1, minWidth: 80 }}>
                                <div style={{ fontSize: 14, fontWeight: 800, color: dn.gc, fontFamily: F }}>{dn.g}</div>
                                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: F }}>{dn.tr}/{dn.ti} rated ({dn.cp}%){dn.provisional ? " · Provisional" : ""}</div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: B.w, fontFamily: F, marginTop: 2 }}>
                                    PDI: {dn.pdi.toFixed(2)}/5.00 <InfoTip id="pdi" />
                                </div>
                            </div>
                        </div>
                        {/* Domain bars */}
                        {dn.domains.map(d => (
                            <div key={d.k} style={{ marginBottom: 6 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                                    <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.6)", fontFamily: F }}>
                                        {d.l} <span style={{ fontSize: 8, color: "rgba(255,255,255,0.25)" }}>×{Math.round(d.wt * 100)}%</span>
                                        <InfoTip id="domain_wt" />
                                    </span>
                                    <span style={{ fontSize: 11, fontWeight: 800, color: d.r > 0 ? d.c : "rgba(255,255,255,0.2)", fontFamily: F }}>{d.r > 0 ? Math.round(d.s100) : "—"}</span>
                                </div>
                                <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.06)" }}>
                                    <div style={{ height: "100%", borderRadius: 3, background: d.r > 0 ? d.c : "transparent", width: `${d.s100}%`, transition: "width 0.8s" }} />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* SAGI + Competition Context */}
                    <div>
                        {dn.sagi !== null && (
                            <div style={{ ...cardDk, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                    <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.35)", fontFamily: F, letterSpacing: 1 }}>
                                        SELF-AWARENESS (SAGI) <InfoTip id="sagi" />
                                    </div>
                                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", fontFamily: F, marginTop: 2 }}>Gap: {dn.sagi > 0 ? "+" : ""}{dn.sagi.toFixed(2)}</div>
                                </div>
                                <div style={{ padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 800, background: `${dn.sagiColor}20`, color: dn.sagiColor, fontFamily: F }}>{dn.sagiLabel}</div>
                            </div>
                        )}
                        {/* Competition Context */}
                        <div style={cardDk}>
                            <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.35)", fontFamily: F, letterSpacing: 1, marginBottom: 8 }}>
                                COMPETITION CONTEXT <InfoTip id="ccm" />
                            </div>
                            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                                <div>
                                    <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", fontFamily: F }}>CTI <InfoTip id="cti" /></div>
                                    <div style={{ fontSize: 18, fontWeight: 800, color: B.w, fontFamily: F }}>{ccmR.cti.toFixed(2)}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", fontFamily: F }}>ARM <InfoTip id="arm" /></div>
                                    <div style={{ fontSize: 18, fontWeight: 800, color: B.w, fontFamily: F }}>{ccmR.arm.toFixed(2)}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", fontFamily: F }}>CCM</div>
                                    <div style={{ fontSize: 18, fontWeight: 800, color: B.bl, fontFamily: F }}>{ccmR.ccm.toFixed(3)}</div>
                                </div>
                                {ccmR.code && <div>
                                    <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", fontFamily: F }}>Top Comp</div>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: B.w, fontFamily: F, marginTop: 4 }}>{ccmR.code}</div>
                                </div>}
                            </div>
                        </div>
                        {/* Trajectory */}
                        {dn.trajectory && (
                            <div style={{ ...cardDk, background: `${B.grn}12`, borderColor: `${B.grn}25` }}>
                                <div style={{ fontSize: 11, fontWeight: 800, color: B.grn, fontFamily: F }}>🚀 TRAJECTORY FLAG <InfoTip id="trajectory" /></div>
                                <div style={{ fontSize: 10, color: `${B.grn}cc`, fontFamily: F, marginTop: 3 }}>Young for competition level with strong PDI — accelerated development candidate</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // ═══ DOMAINS TAB ═══
    const renderDomains = () => {
        if (!sel || !sel.dn) return <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.3)", fontFamily: F }}>Select an assessed player to view domain details</div>;

        const dn = sel.dn;
        const t = techItems(sel.role);
        const cd = sel.cd || {};
        const sr = sel.self_ratings || {};
        const allDomains = [
            { label: t.pL, items: t.pri, prefix: "t1_", color: B.pk },
            { label: t.sL, items: t.sec, prefix: "t2_", color: B.bl },
            { label: "Game Intelligence", items: IQ_ITEMS, prefix: "iq_", color: B.sky },
            { label: "Mental & Character", items: MN_ITEMS, prefix: "mn_", color: B.prp },
            { label: "Physical & Athletic", items: PH_MAP[sel.role] || PH_MAP.batter, prefix: "ph_", color: B.nv },
        ];

        return (
            <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: B.w, fontFamily: F, marginBottom: 10 }}>{sel.name} — Domain Breakdown</div>
                {allDomains.map(domain => (
                    <div key={domain.label} style={{ ...cardDk, marginBottom: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: domain.color, fontFamily: F, marginBottom: 8, letterSpacing: 0.5 }}>{domain.label.toUpperCase()}</div>
                        {domain.items.map((item, i) => {
                            const coachVal = cd[`${domain.prefix}${i}`] || 0;
                            const selfVal = sr[`${domain.prefix}${i}`] || 0;
                            return (
                                <div key={item} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, padding: "3px 0" }}>
                                    <div style={{ flex: 1, fontSize: 10, color: "rgba(255,255,255,0.6)", fontFamily: F, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item}</div>
                                    {/* Coach bar */}
                                    <div style={{ width: 70, display: "flex", alignItems: "center", gap: 3 }}>
                                        <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)" }}>
                                            <div style={{ height: "100%", borderRadius: 2, background: coachVal > 0 ? domain.color : "transparent", width: `${(coachVal / 5) * 100}%`, transition: "width 0.5s" }} />
                                        </div>
                                        <span style={{ fontSize: 9, fontWeight: 700, color: coachVal > 0 ? domain.color : "rgba(255,255,255,0.15)", fontFamily: F, width: 12, textAlign: "right" }}>{coachVal || "—"}</span>
                                    </div>
                                    {/* Self bar */}
                                    <div style={{ width: 55, display: "flex", alignItems: "center", gap: 3 }}>
                                        <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)" }}>
                                            <div style={{ height: "100%", borderRadius: 2, background: selfVal > 0 ? "rgba(255,255,255,0.35)" : "transparent", width: `${(selfVal / 5) * 100}%`, transition: "width 0.5s" }} />
                                        </div>
                                        <span style={{ fontSize: 8, color: selfVal > 0 ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)", fontFamily: F, width: 10, textAlign: "right" }}>{selfVal || ""}</span>
                                    </div>
                                </div>
                            );
                        })}
                        {/* Legend */}
                        <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 8, color: "rgba(255,255,255,0.3)", fontFamily: F }}>
                            <span><span style={{ display: "inline-block", width: 8, height: 3, borderRadius: 1, background: domain.color, marginRight: 3 }} />Coach</span>
                            <span><span style={{ display: "inline-block", width: 8, height: 3, borderRadius: 1, background: "rgba(255,255,255,0.35)", marginRight: 3 }} />Self</span>
                        </div>
                    </div>
                ))}

                {/* ═══ STATISTICAL PERFORMANCE DOMAIN ═══ */}
                {(() => {
                    const statDomain = dn.domains.find(d => d.k === "s");
                    const bd = statDomain?.breakdown;
                    if (!statDomain || !bd || statDomain.r === 0) return (
                        <div style={{ ...cardDk, marginBottom: 8, opacity: 0.5 }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: B.grn, fontFamily: F, marginBottom: 6, letterSpacing: 0.5 }}>STATISTICAL PERFORMANCE</div>
                            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: F }}>Insufficient data — requires ≥{5} matches, ≥{5} batting innings, or ≥{20} overs bowled</div>
                        </div>
                    );

                    const metrics = [
                        { label: "RPI (Runs/Inn)", score: bd.batMean, color: B.pk, weight: `${Math.round(bd.subWeights[0] * 100)}%` },
                        { label: "Bowling", score: bd.bowlMean, color: B.bl, weight: `${Math.round(bd.subWeights[1] * 100)}%` },
                        { label: "Fielding Impact", score: bd.fieldScore, color: B.nv, weight: `${Math.round(bd.subWeights[2] * 100)}%` },
                    ];

                    return (
                        <div style={{ ...cardDk, marginBottom: 8 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                <div style={{ fontSize: 11, fontWeight: 800, color: B.grn, fontFamily: F, letterSpacing: 0.5 }}>STATISTICAL PERFORMANCE</div>
                                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", fontFamily: F, background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 4 }}>
                                    CTI Band: {bd.band.toUpperCase()} • Score: {statDomain.raw}/5
                                </div>
                            </div>
                            {metrics.map(m => (
                                <div key={m.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                    <div style={{ width: 90, fontSize: 10, color: "rgba(255,255,255,0.6)", fontFamily: F }}>{m.label}</div>
                                    <div style={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)" }}>
                                        <div style={{
                                            height: "100%", borderRadius: 3,
                                            background: m.score > 0 ? `linear-gradient(90deg, ${m.color}, ${m.color}88)` : "transparent",
                                            width: `${(m.score / 5) * 100}%`, transition: "width 0.6s ease"
                                        }} />
                                    </div>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: m.score > 0 ? m.color : "rgba(255,255,255,0.15)", fontFamily: F, width: 24, textAlign: "right" }}>
                                        {m.score > 0 ? m.score.toFixed(1) : "—"}
                                    </span>
                                    <span style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", fontFamily: F, width: 24, textAlign: "right" }}>{m.weight}</span>
                                </div>
                            ))}
                            <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", fontFamily: F, marginTop: 4 }}>
                                Domain weight: {Math.round(statDomain.wt * 100)}% • Benchmarks adjusted for {bd.band} competition tier
                            </div>
                        </div>
                    );
                })()}
            </div>
        );
    };

    // ═══ COMPARE TAB ═══
    const renderCompare = () => {
        const assessed = playerData.filter(p => p.dn && p.dn.pdi > 0);

        // PDI distribution
        const buckets = [
            { label: "Foundation", min: 0, max: 1, color: B.g400 },
            { label: "Developing", min: 1, max: 2, color: B.g600 },
            { label: "Emerging", min: 2, max: 2.75, color: B.pk },
            { label: "Competent", min: 2.75, max: 3.5, color: B.amb },
            { label: "Advanced", min: 3.5, max: 4.25, color: B.bl },
            { label: "Elite", min: 4.25, max: 5.01, color: B.grn },
        ];
        const distribution = buckets.map(b => ({
            ...b, count: assessed.filter(p => p.dn.pdi >= b.min && p.dn.pdi < b.max).length
        }));
        const maxBucket = Math.max(...distribution.map(d => d.count), 1);

        // Role averages
        const roleAvgs = ROLES.map(r => {
            const rPlayers = assessed.filter(p => p.role === r.id);
            const avg = rPlayers.length > 0 ? rPlayers.reduce((s, p) => s + p.dn.pdi, 0) / rPlayers.length : 0;
            return { ...r, count: rPlayers.length, avg: Math.round(avg * 100) / 100 };
        });

        // Head-to-head
        const compA = compareA ? assessed.find(p => p.id === compareA) : null;
        const compB = compareB ? assessed.find(p => p.id === compareB) : null;

        const toggleSort = (col) => {
            if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
            else { setSortCol(col); setSortDir("desc"); }
        };

        const thStyle = {
            padding: "6px 8px", textAlign: "left", fontSize: 9, fontWeight: 700,
            color: "rgba(255,255,255,0.4)", fontFamily: F, cursor: "pointer",
            borderBottom: "1px solid rgba(255,255,255,0.08)", whiteSpace: "nowrap", userSelect: "none"
        };
        const tdStyle = {
            padding: "6px 8px", fontSize: 10, fontFamily: F,
            borderBottom: "1px solid rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.7)"
        };
        const sortArrow = (col) => sortCol === col ? (sortDir === "asc" ? " ↑" : " ↓") : "";

        return (
            <div>
                {/* Distribution */}
                <div style={cardDk}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", fontFamily: F, letterSpacing: 1, marginBottom: 10, textTransform: "uppercase" }}>
                        PDI Distribution <InfoTip id="pdi" />
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 80, padding: "0 4px" }}>
                        {distribution.map(d => (
                            <div key={d.label} style={{ flex: 1, textAlign: "center" }}>
                                <div style={{ fontSize: 10, fontWeight: 800, color: d.color, fontFamily: F, marginBottom: 2 }}>{d.count || ""}</div>
                                <div style={{
                                    height: `${Math.max((d.count / maxBucket) * 60, d.count > 0 ? 4 : 0)}px`,
                                    background: `${d.color}60`, borderRadius: "3px 3px 0 0", transition: "height 0.5s",
                                    border: d.count > 0 ? `1px solid ${d.color}40` : "none"
                                }} />
                                <div style={{ fontSize: 7, color: "rgba(255,255,255,0.3)", fontFamily: F, marginTop: 3 }}>{d.label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Role breakdown + Head-to-Head side-by-side */}
                <div style={_isDesktop ? { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 } : {}}>
                    {/* Role breakdown */}
                    <div style={cardDk}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", fontFamily: F, letterSpacing: 1, marginBottom: 10, textTransform: "uppercase" }}>AVG PDI BY ROLE</div>
                        {roleAvgs.map(r => (
                            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                <div style={{ width: 36, fontSize: 10, fontWeight: 700, color: B.w, fontFamily: F }}>{r.sh}</div>
                                <div style={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)" }}>
                                    <div style={{ height: "100%", borderRadius: 3, background: `${B.pk}90`, width: `${(r.avg / 5) * 100}%`, transition: "width 0.5s" }} />
                                </div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: B.w, fontFamily: F, width: 28, textAlign: "right" }}>{r.avg > 0 ? r.avg.toFixed(1) : "—"}</div>
                                <div style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", fontFamily: F, width: 16 }}>({r.count})</div>
                            </div>
                        ))}
                    </div>

                    {/* Head-to-Head */}
                    <div style={cardDk}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", fontFamily: F, letterSpacing: 1, marginBottom: 10, textTransform: "uppercase" }}>HEAD-TO-HEAD</div>
                        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                            <select value={compareA || ""} onChange={e => setCompareA(e.target.value || null)}
                                style={{ flex: 1, padding: "5px 6px", borderRadius: 6, border: `1px solid ${B.pk}30`, background: "rgba(255,255,255,0.04)", color: B.w, fontSize: 10, fontFamily: F, outline: "none" }}>
                                <option value="">Player A</option>
                                {assessed.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 11, alignSelf: "center" }}>vs</span>
                            <select value={compareB || ""} onChange={e => setCompareB(e.target.value || null)}
                                style={{ flex: 1, padding: "5px 6px", borderRadius: 6, border: `1px solid ${B.bl}30`, background: "rgba(255,255,255,0.04)", color: B.w, fontSize: 10, fontFamily: F, outline: "none" }}>
                                <option value="">Player B</option>
                                {assessed.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        {compA && compB ? (
                            <div>
                                {compA.dn.domains.map((d, i) => {
                                    const bDomain = compB.dn.domains[i];
                                    return (
                                        <div key={d.k} style={{ marginBottom: 6 }}>
                                            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", fontFamily: F, textAlign: "center", marginBottom: 2 }}>{d.l}</div>
                                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                                <span style={{ width: 20, fontSize: 9, fontWeight: 700, color: B.pk, fontFamily: F, textAlign: "right" }}>{d.r > 0 ? Math.round(d.s100) : "—"}</span>
                                                <div style={{ flex: 1, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.06)", position: "relative" }}>
                                                    <div style={{ position: "absolute", left: 0, top: 0, height: "100%", borderRadius: 3, background: `${B.pk}80`, width: `${d.s100}%`, transition: "width 0.5s" }} />
                                                </div>
                                                <div style={{ flex: 1, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.06)", position: "relative" }}>
                                                    <div style={{ position: "absolute", right: 0, top: 0, height: "100%", borderRadius: 3, background: `${B.bl}80`, width: `${bDomain?.s100 || 0}%`, transition: "width 0.5s" }} />
                                                </div>
                                                <span style={{ width: 20, fontSize: 9, fontWeight: 700, color: B.bl, fontFamily: F }}>{bDomain?.r > 0 ? Math.round(bDomain.s100) : "—"}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 9, fontFamily: F }}>
                                    <span style={{ color: B.pk, fontWeight: 700 }}>{compA.name} — PDI {compA.dn.pdi.toFixed(2)}</span>
                                    <span style={{ color: B.bl, fontWeight: 700 }}>{compB.name} — PDI {compB.dn.pdi.toFixed(2)}</span>
                                </div>
                            </div>
                        ) : (
                            <div style={{ textAlign: "center", padding: 10, fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: F }}>Select two players above to compare</div>
                        )}
                    </div>
                </div>

                {/* Sortable Table */}
                <div style={{ ...cardDk, overflowX: "auto" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", fontFamily: F, letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>COHORT TABLE</div>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
                        <thead>
                            <tr>
                                {[
                                    { col: "name", label: "Player" },
                                    { col: "age", label: "Age" },
                                    { col: "role", label: "Role" },
                                    { col: "pdi", label: "PDI", tipId: "pdi" },
                                    { col: "ccm", label: "CCM", tipId: "ccm" },
                                    { col: "sagi", label: "SAGI", tipId: "sagi" },
                                    { col: "traj", label: "🚀" },
                                ].map(h => (
                                    <th key={h.col} onClick={() => h.col !== "traj" && toggleSort(h.col)} style={thStyle}>
                                        {h.label}{sortArrow(h.col)}
                                        {h.tipId && <InfoTip id={h.tipId} />}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedTable.map(p => (
                                <tr key={p.id} onClick={() => { setSelId(p.id); setTab("overview"); }}
                                    style={{ cursor: "pointer", background: selId === p.id ? `${B.pk}10` : "transparent" }}>
                                    <td style={{ ...tdStyle, fontWeight: 600, color: B.w }}>{p.name}</td>
                                    <td style={tdStyle}>{p.age}</td>
                                    <td style={tdStyle}><span style={{ padding: "1px 5px", borderRadius: 3, fontSize: 8, fontWeight: 700, background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>{p.ro?.sh}</span></td>
                                    <td style={{ ...tdStyle, fontWeight: 700, color: p.dn?.gc }}>{p.dn?.pdi.toFixed(2)}</td>
                                    <td style={tdStyle}>{p.ccmR?.ccm > 0 ? p.ccmR.ccm.toFixed(2) : "—"}</td>
                                    <td style={tdStyle}>
                                        {p.dn?.sagi !== null ? (
                                            <span style={{ padding: "1px 5px", borderRadius: 3, fontSize: 8, fontWeight: 700, background: `${p.dn.sagiColor}20`, color: p.dn.sagiColor }}>{p.dn.sagiLabel}</span>
                                        ) : "—"}
                                    </td>
                                    <td style={tdStyle}>{p.dn?.trajectory ? "🚀" : ""}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // ═══ MAIN RENDER ═══
    return (
        <div style={{ minHeight: "100vh", fontFamily: F, background: dbBg }} onClick={() => tipOpen && setTipOpen(null)}>
            <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,600;0,700;0,800;0,900&display=swap" rel="stylesheet" />

            {/* Header */}
            <div style={{ ...sGrad, padding: "14px 16px 12px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -20, right: -30, width: 180, height: 180, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.06)" }} />
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <img src={LOGO} alt="" style={{ width: 36, height: 36, objectFit: "contain" }} />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: 2, textTransform: "uppercase", fontFamily: F }}>Rajasthan Royals Academy Melbourne</div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: B.w, fontFamily: F }}>Coach Dashboard</div>
                    </div>
                    {!_isDesktop && (
                        <button onClick={() => setSideOpen(true)} style={{
                            width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)",
                            background: "transparent", color: B.w, fontSize: 16, cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center"
                        }}>☰</button>
                    )}
                    <button onClick={onBack} style={{
                        padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.2)",
                        background: "transparent", color: "rgba(255,255,255,0.6)", fontSize: 9, fontWeight: 600,
                        fontFamily: F, cursor: "pointer"
                    }}>← Roster</button>
                </div>
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: B.pk }} />
            </div>

            {/* Mobile sidebar overlay */}
            {!_isDesktop && sideOpen && (
                <div onClick={() => setSideOpen(false)} style={{
                    position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 199
                }} />
            )}

            {/* Body */}
            <div style={{ display: _isDesktop ? "flex" : "block", maxWidth: 1200, margin: "0 auto" }}>
                {/* Sidebar — always visible on desktop */}
                {(_isDesktop || sideOpen) && renderSidebar()}

                {/* Main content */}
                <div style={{ flex: 1, padding: _isDesktop ? "0 20px 20px" : "0 12px 20px", minWidth: 0 }}>
                    {/* Cohort bar */}
                    {renderCohortBar()}

                    {/* Tabs */}
                    <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
                        {[
                            { id: "overview", label: "Overview" },
                            { id: "domains", label: "Domains" },
                            { id: "compare", label: "Compare" },
                        ].map(t => (
                            <button key={t.id} onClick={() => setTab(t.id)} style={tabStyle(tab === t.id)}>{t.label}</button>
                        ))}
                    </div>

                    {/* Tab content */}
                    {tab === "overview" && renderOverview()}
                    {tab === "domains" && renderDomains()}
                    {tab === "compare" && renderCompare()}
                </div>
            </div>
        </div>
    );
}
