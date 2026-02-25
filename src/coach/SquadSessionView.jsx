import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { loadPrograms, loadWeekBlocks } from "../db/programDb";
import { loadAttendanceForSession, markAttendance, saveObservation } from "../db/observationDb";

// ═══ SQUAD SESSION VIEW ═══
// Handles taking attendance and writing observation notes for a specific squad & session

export default function SquadSessionView({
    userSession,
    squad,
    squadPlayers,
    onBack,
    B, F, sGrad
}) {
    const [programs, setPrograms] = useState([]);
    const [selectedProgram, setSelectedProgram] = useState("");
    const [weeks, setWeeks] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [selectedSession, setSelectedSession] = useState("");

    const [attendance, setAttendance] = useState({}); // playerId -> status
    const [loading, setLoading] = useState(true);

    // Observation modal
    const [obsPlayer, setObsPlayer] = useState(null);
    const [obsData, setObsData] = useState({ domain: "Technical", skill: "", rating: 3, context: "training", free_text: "", tags: [] });
    const [savingObs, setSavingObs] = useState(false);

    useEffect(() => {
        loadPrograms().then(data => {
            setPrograms(data);
            setLoading(false);
            // Default select the most recent program if exists
            if (data.length > 0) setSelectedProgram(data[0].id);
        });
    }, []);

    useEffect(() => {
        if (!selectedProgram) {
            setWeeks([]);
            setSessions([]);
            setSelectedSession("");
            return;
        }

        // Fetch weeks and sessions for this program
        async function fetchProgData() {
            setLoading(true);
            try {
                const wks = await loadWeekBlocks(selectedProgram);
                setWeeks(wks);

                const { data: sessData } = await supabase
                    .from('sessions')
                    .select('*')
                    .eq('program_id', selectedProgram)
                    .order('week_number')
                    .order('session_number');
                setSessions(sessData || []);
                if (sessData && sessData.length > 0) {
                    setSelectedSession(sessData[0].id);
                } else {
                    setSelectedSession("");
                }
            } catch (e) { console.error(e); }
            setLoading(false);
        }
        fetchProgData();
    }, [selectedProgram]);

    useEffect(() => {
        if (!selectedSession) {
            setAttendance({});
            return;
        }
        // Load attendance for this session and these players
        const pIds = squadPlayers.map(p => p.id);
        loadAttendanceForSession(selectedSession, pIds).then(data => {
            const attMap = {};
            data.forEach(d => { attMap[d.player_id] = d.status; });
            setAttendance(attMap);
        });
    }, [selectedSession, squadPlayers]);

    // Handle attendance toggle
    const handleToggleAttendance = async (playerId, currentStatus) => {
        if (!selectedSession) return;
        const nextStatus = currentStatus === 'present' ? 'absent' : (currentStatus === 'absent' ? 'excused' : 'present');
        // Optimistic update
        setAttendance(prev => ({ ...prev, [playerId]: nextStatus }));
        try {
            await markAttendance({
                playerId,
                sessionId: selectedSession,
                status: nextStatus,
                markedBy: userSession.user.id
            });
        } catch (e) {
            console.error(e);
            // Revert on error
            setAttendance(prev => ({ ...prev, [playerId]: currentStatus }));
            alert("Failed to save attendance");
        }
    };

    // Save observation note
    const handleSaveObservation = async () => {
        if (!obsPlayer || !selectedSession) return;
        setSavingObs(true);
        try {
            await saveObservation({
                player_id: obsPlayer.id,
                coach_id: userSession.user.id,
                session_id: selectedSession,
                program_id: selectedProgram,
                ...obsData
            });
            setObsPlayer(null);
            setObsData({ domain: "Technical", skill: "", rating: 3, context: "training", free_text: "", tags: [] });
            alert("Observation saved");
        } catch (e) {
            console.error(e);
            alert("Error saving observation");
        }
        setSavingObs(false);
    };

    const cardDk = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 16, marginBottom: 16 };
    const btnStyle = (active, color) => ({
        padding: "6px 12px", borderRadius: 6, border: `1px solid ${active ? color : 'rgba(255,255,255,0.2)'}`,
        background: active ? `${color}20` : 'transparent', color: active ? color : 'rgba(255,255,255,0.5)',
        fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: F
    });

    const attColor = (status) => {
        if (status === 'present') return B.grn;
        if (status === 'absent') return B.red;
        if (status === 'excused') return B.amb;
        return 'rgba(255,255,255,0.2)';
    };

    return (
        <div style={{ maxWidth: 800, margin: "0 auto", padding: 20, fontFamily: F }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                    <button onClick={onBack} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 11, padding: 0, marginBottom: 8, fontFamily: F }}>← Back to Squads</button>
                    <h2 style={{ color: B.w, margin: 0, fontSize: 22, fontWeight: 900 }}>{squad.name} — Session Manager</h2>
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{squadPlayers.length} Players</div>
            </div>

            {/* Selectors */}
            <div style={{ ...cardDk, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>Program</div>
                    <select
                        value={selectedProgram}
                        onChange={e => setSelectedProgram(e.target.value)}
                        style={{ width: "100%", padding: "8px", borderRadius: 6, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: B.w, outline: "none" }}
                    >
                        <option value="">Select Program...</option>
                        {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>

                <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>Session</div>
                    <select
                        value={selectedSession}
                        onChange={e => setSelectedSession(e.target.value)}
                        style={{ width: "100%", padding: "8px", borderRadius: 6, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: B.w, outline: "none" }}
                        disabled={!selectedProgram}
                    >
                        <option value="">Select Session...</option>
                        {sessions.map(s => {
                            const date = s.session_date ? new Date(s.session_date).toLocaleDateString() : "No Date";
                            return <option key={s.id} value={s.id}>Week {s.week_number} : Sess {s.session_number} ({date})</option>;
                        })}
                    </select>
                </div>
            </div>

            {loading && <div style={{ textAlign: "center", padding: 20, color: "rgba(255,255,255,0.4)" }}>Loading...</div>}

            {/* Players List */}
            {!loading && selectedSession && squadPlayers.map(p => {
                const status = attendance[p.id] || null;
                const statusLabel = status ? status.charAt(0).toUpperCase() + status.slice(1) : "Mark";

                return (
                    <div key={p.id} style={{ ...cardDk, display: "flex", alignItems: "center", gap: 16, padding: "12px 16px" }}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", ...sGrad, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <span style={{ color: B.w, fontSize: 12, fontWeight: 800 }}>{(p.name || "?").substring(0, 2).toUpperCase()}</span>
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: B.w }}>{p.name}</div>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{p.role}</div>
                        </div>

                        <div style={{ display: "flex", gap: 8 }}>
                            <button
                                onClick={() => handleToggleAttendance(p.id, status)}
                                style={btnStyle(!!status, attColor(status))}
                            >
                                {statusLabel}
                            </button>

                            <button
                                onClick={() => setObsPlayer(p)}
                                style={{ ...btnStyle(false, B.bl), background: "rgba(255,255,255,0.05)" }}
                            >
                                📝 Note
                            </button>
                        </div>
                    </div>
                );
            })}

            {!loading && selectedSession && squadPlayers.length === 0 && (
                <div style={{ textAlign: "center", padding: 20, color: "rgba(255,255,255,0.4)" }}>No players in this squad.</div>
            )}

            {!loading && !selectedSession && (
                <div style={{ textAlign: "center", padding: 20, color: "rgba(255,255,255,0.4)" }}>Please select a program and session above.</div>
            )}

            {/* Observation Modal */}
            {obsPlayer && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
                    <div style={{ background: B.nvD, border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 16, width: "100%", maxWidth: 500, padding: 24 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                            <h3 style={{ margin: 0, color: B.w, fontSize: 18 }}>Coach Note: {obsPlayer.name}</h3>
                            <button onClick={() => setObsPlayer(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 16 }}>✕</button>
                        </div>

                        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>Domain</div>
                                <select
                                    value={obsData.domain} onChange={e => setObsData({ ...obsData, domain: e.target.value })}
                                    style={{ width: "100%", padding: "8px", borderRadius: 6, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: B.w, outline: "none" }}
                                >
                                    <option>Technical</option><option>Tactical / Game Sense</option><option>Physical</option><option>Mental / Character</option>
                                </select>
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>Skill (Optional)</div>
                                <input
                                    value={obsData.skill} onChange={e => setObsData({ ...obsData, skill: e.target.value })}
                                    placeholder="e.g. Cover Drive"
                                    style={{ width: "100%", padding: "8px", borderRadius: 6, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: B.w, outline: "none", boxSizing: "border-box" }}
                                />
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>Rating (1-5)</div>
                                <div style={{ display: "flex", gap: 4 }}>
                                    {[1, 2, 3, 4, 5].map(v => (
                                        <button key={v} onClick={() => setObsData({ ...obsData, rating: v })} style={{
                                            flex: 1, padding: "6px 0", borderRadius: 4, cursor: "pointer",
                                            background: obsData.rating === v ? `${B.bl}40` : "rgba(255,255,255,0.05)",
                                            border: `1px solid ${obsData.rating === v ? B.bl : "rgba(255,255,255,0.1)"}`,
                                            color: B.w, fontWeight: 700
                                        }}>{v}</button>
                                    ))}
                                </div>
                            </div>
                            <div style={{ width: 120 }}>
                                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>Context</div>
                                <select
                                    value={obsData.context} onChange={e => setObsData({ ...obsData, context: e.target.value })}
                                    style={{ width: "100%", padding: "8px", borderRadius: 6, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: B.w, outline: "none" }}
                                >
                                    <option value="training">Training</option>
                                    <option value="match">Match</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>Notes</div>
                            <textarea
                                value={obsData.free_text} onChange={e => setObsData({ ...obsData, free_text: e.target.value })}
                                placeholder="Write your observation here..."
                                rows={4}
                                style={{ width: "100%", padding: "10px", borderRadius: 6, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: B.w, outline: "none", resize: "vertical", fontFamily: F, boxSizing: "border-box" }}
                            />
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                            <button onClick={() => setObsPlayer(null)} style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: B.w, cursor: "pointer", fontFamily: F, fontSize: 12, fontWeight: 600 }}>Cancel</button>
                            <button onClick={handleSaveObservation} disabled={savingObs} style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: B.pk, color: B.w, cursor: "pointer", fontFamily: F, fontSize: 12, fontWeight: 700, opacity: savingObs ? 0.7 : 1 }}>
                                {savingObs ? "Saving..." : "Save Note"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
