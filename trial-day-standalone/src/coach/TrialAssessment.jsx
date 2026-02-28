// ═══ TRIAL DAY — Rapid Coach Assessment ═══
// Mobile-first, single-screen-per-player rapid scoring interface
// Data is sandboxed in trial_assessments table
// Supports 3 session groups for splitting players across time slots

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { B, F, sGrad, _isDesktop, dkWrap, LOGO } from '../data/theme';
import { BAT_ARCH, BWL_ARCH, ROLES } from '../data/skillItems';
import { supabase } from '../supabaseClient';
import { Hdr } from '../shared/FormComponents';
import RotationBoard from './RotationBoard';
import { SESSIONS } from '../data/rotationData';

// ═══ TRIAL SCORING SYSTEM ═══
const OVERALL_GRADES = [
    { id: 'gold', title: 'Gold', color: '#FFD700', desc: 'Elite / Scholarship Quality' },
    { id: 'silver', title: 'Silver', color: '#C0C0C0', desc: 'Squad Standard' },
    { id: 'bronze', title: 'Bronze', color: '#cd7f32', desc: 'Development' }
];

const BOWLING_TYPES = [
    { id: 'pace', title: 'Pace', color: B.red },
    { id: 'spin', title: 'Spin', color: B.org }
];

const SQUAD_OPTIONS = [
    { id: 'move_up', label: 'Move Up', icon: '⬆️', color: B.grn },
    { id: 'right_level', label: 'Right Level', icon: '✅', color: B.bl },
    { id: 'move_down', label: 'Move Down', icon: '⬇️', color: B.amb },
];

const GROUP_DEFS = [
    { id: 'Group 1', label: 'Group 1', color: B.pk, icon: '1️⃣', time: 'Session 1' },
    { id: 'Group 2', label: 'Group 2', color: B.bl, icon: '2️⃣', time: 'Session 2' },
    { id: 'Group 3', label: 'Group 3', color: B.grn, icon: '3️⃣', time: 'Session 3' },
];

const TODAY = new Date().toISOString().slice(0, 10);

export default function TrialAssessment({ session, players, onBack, getAge, getBracket, isAdmin, coachName, onLogout }) {
    const [mode, setMode] = useState('rotations'); // 'assess' | 'setup' | 'planner' | 'attendance' | 'rotations'
    const [selIdx, setSelIdx] = useState(0);
    const [trialData, setTrialData] = useState({});

    // Auto-assign groupMap from static SESSIONS
    const groupMap = useMemo(() => {
        const gm = {};
        SESSIONS.forEach((s, idx) => {
            const groupId = `Group ${idx + 1}`;
            s.players.forEach(p => {
                const lp = players.find(x => x.name === p.name);
                if (lp) gm[lp.id] = groupId;
            });
        });
        return gm;
    }, [players]);

    const [attendance, setAttendance] = useState({}); // { playerId: true }
    const [activeGroup, setActiveGroup] = useState(null); // null = all
    const [saving, setSaving] = useState(false);
    const [showList, setShowList] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);
    const [confirmAction, setConfirmAction] = useState(null); // For custom modals instead of window.confirm
    const [undoStack, setUndoStack] = useState([]); // undo history
    const [saveError, setSaveError] = useState(null);
    const saveTimer = useRef(null);
    const pendingRef = useRef({});

    // Only show submitted players
    const allPlayers = useMemo(() =>
        players.filter(p => p.submitted).sort((a, b) => (a.name || '').localeCompare(b.name || '')),
        [players]
    );

    // Filtered by active group
    const roster = useMemo(() => {
        if (!activeGroup) return allPlayers;
        return allPlayers.filter(p => groupMap[p.id] === activeGroup);
    }, [allPlayers, activeGroup, groupMap]);

    const sp = roster[selIdx] || null;

    // ═══ LOAD EXISTING DATA ═══
    useEffect(() => {
        (async () => {
            if (!session?.user?.id || allPlayers.length === 0) return;

            // Load trial assessments
            try {
                let query = supabase
                    .from('trial_assessments')
                    .select('*')
                    .eq('session_date', TODAY);

                if (!isAdmin) {
                    query = query.eq('coach_id', session.user.id);
                }

                const { data } = await query;
                if (data) {
                    const map = {};
                    if (isAdmin) {
                        // Aggregate scores from all coaches for Super Admin
                        const pGroups = {};
                        data.forEach(r => {
                            if (!pGroups[r.player_id]) pGroups[r.player_id] = [];
                            pGroups[r.player_id].push(r);
                        });
                        Object.keys(pGroups).forEach(pid => {
                            const rows = pGroups[pid];
                            const agg = {};
                            agg.overall_grade = rows.find(r => r.overall_grade)?.overall_grade;
                            agg.bowling_type = rows.find(r => r.bowling_type)?.bowling_type;
                            agg.batA = rows.find(r => r.batting_archetype)?.batting_archetype;
                            agg.bwlA = rows.find(r => r.bowling_archetype)?.bowling_archetype;
                            agg.squad_rec = rows.find(r => r.squad_rec)?.squad_rec;
                            const notes = rows.filter(r => r.quick_note).map(r => `${r.coach_id.replace('coach-', '')}: ${r.quick_note}`);
                            if (notes.length) agg.quick_note = notes.join(' | ');
                            map[pid] = agg;
                        });
                    } else {
                        // Single coach view
                        data.forEach(row => {
                            const d = {};
                            if (row.overall_grade) d.overall_grade = row.overall_grade;
                            if (row.bowling_type) d.bowling_type = row.bowling_type;
                            if (row.batting_archetype) d.batA = row.batting_archetype;
                            if (row.bowling_archetype) d.bwlA = row.bowling_archetype;
                            if (row.squad_rec) d.squad_rec = row.squad_rec;
                            if (row.quick_note) d.quick_note = row.quick_note;
                            map[row.player_id] = d;
                        });
                    }
                    setTrialData(map);
                    pendingRef.current = map;
                }
            } catch (e) {
                console.warn('Failed to load trial data:', e.message);
            }

            // Load group assignments + attendance
            try {
                const { data } = await supabase
                    .from('trial_player_groups')
                    .select('player_id, group_label, checked_in')
                    .eq('session_date', TODAY);
                if (data) {
                    const att = {};
                    data.forEach(row => {
                        if (row.checked_in) att[row.player_id] = true;
                    });
                    setAttendance(att);
                }
            } catch (e) {
                console.warn('Failed to load group data:', e.message);
            }
        })();
    }, [session, allPlayers.length, isAdmin]);

    // ═══ CHECK-IN / ATTENDANCE ═══
    const toggleCheckIn = async (playerId) => {
        const wasChecked = attendance[playerId];
        const newAtt = { ...attendance };
        if (wasChecked) delete newAtt[playerId];
        else newAtt[playerId] = true;
        setAttendance(newAtt);

        try {
            await supabase.from('trial_player_groups')
                .update({
                    checked_in: !wasChecked,
                    checked_in_by: wasChecked ? null : session?.user?.id,
                    checked_in_at: wasChecked ? null : new Date().toISOString(),
                })
                .eq('player_id', playerId)
                .eq('session_date', TODAY);
        } catch (e) {
            console.error('Check-in error:', e.message);
        }
    };

    // ═══ SAVE TRIAL ASSESSMENT ═══
    const saveTrial = useCallback(async (playerId, data) => {
        if (!session?.user?.id || !playerId) return;
        try {
            setSaving(true);
            setSaveError(null);
            const row = {
                player_id: playerId,
                coach_id: session.user.id,
                session_date: TODAY,
            };
            row.overall_grade = data.overall_grade || null;
            row.bowling_type = data.bowling_type || null;
            row.batting_archetype = data.batA || null;
            row.bowling_archetype = data.bwlA || null;
            row.squad_rec = data.squad_rec || null;
            row.quick_note = data.quick_note || null;
            row.updated_at = new Date().toISOString();

            const { error } = await supabase.from('trial_assessments').upsert(row, {
                onConflict: 'player_id,coach_id,session_date'
            });
            if (error) throw error;

            setLastSaved(new Date());
        } catch (e) {
            console.error('Trial save error:', e.message);
            setSaveError('Failed to save (Offline?)');
        } finally {
            setSaving(false);
        }
    }, [session]);

    // ═══ UNDO SYSTEM ═══
    const pushUndo = (pid, prevData) => {
        setUndoStack(prev => [...prev.slice(-29), { pid, data: { ...prevData } }]);
    };
    const handleUndo = () => {
        if (undoStack.length === 0) return;
        const last = undoStack[undoStack.length - 1];
        setUndoStack(prev => prev.slice(0, -1));
        const restored = last.data;
        pendingRef.current = { ...pendingRef.current, [last.pid]: restored };
        setTrialData(prev => ({ ...prev, [last.pid]: restored }));
        saveTrial(last.pid, restored);

        // Jump to the affected player if swiped away
        setActiveGroup(null);
        setTimeout(() => {
            const idx = allPlayers.findIndex(p => p.id === last.pid);
            if (idx >= 0) {
                setSelIdx(idx);
                window.scrollTo(0, 0);
            }
        }, 0);
    };

    const updateField = (key, value) => {
        if (!sp) return;
        const pid = sp.id;
        // Push previous state to undo stack
        pushUndo(pid, pendingRef.current[pid] || {});
        const updated = { ...pendingRef.current[pid], [key]: value };
        pendingRef.current = { ...pendingRef.current, [pid]: updated };
        setTrialData(prev => ({ ...prev, [pid]: updated }));

        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
            saveTrial(pid, pendingRef.current[pid]);
        }, 1500);
    };



    const cd = sp ? (trialData[sp.id] || {}) : {};

    // Count completed players
    const completedInGroup = roster.filter(p => {
        const d = trialData[p.id];
        if (!d) return false;
        return !!d.overall_grade;
    }).length;

    const goTo = (idx) => {
        if (sp && pendingRef.current[sp.id]) {
            saveTrial(sp.id, pendingRef.current[sp.id]);
        }
        setSelIdx(Math.max(0, Math.min(idx, roster.length - 1)));
        setShowList(false);
        window.scrollTo(0, 0);
    };

    // Reset index when group filter changes
    useEffect(() => { setSelIdx(0); }, [activeGroup]);

    // ═══════════════════════════════════════════════════
    // ATTENDANCE MODE
    // ═══════════════════════════════════════════════════
    if (mode === 'attendance') {
        const groupPlayersAtt = activeGroup
            ? allPlayers.filter(p => groupMap[p.id] === activeGroup)
            : allPlayers.filter(p => groupMap[p.id]);
        const checkedCount = groupPlayersAtt.filter(p => attendance[p.id]).length;

        return (
            <div style={{ minHeight: '100vh', fontFamily: F, background: B.g50 }}>
                <Hdr label="ATTENDANCE" onLogoClick={() => setMode('assess')} />

                {/* Group tabs */}
                <div style={{ display: 'flex', background: B.w, borderBottom: `1px solid ${B.g200}`, overflowX: 'auto' }}>
                    {GROUP_DEFS.map(g => {
                        const cnt = allPlayers.filter(p => groupMap[p.id] === g.id).length;
                        const checked = allPlayers.filter(p => groupMap[p.id] === g.id && attendance[p.id]).length;
                        const isActive = activeGroup === g.id;
                        return (
                            <button key={g.id} onClick={() => setActiveGroup(isActive ? null : g.id)}
                                style={{
                                    flex: 1, padding: '10px 4px', border: 'none', cursor: 'pointer', fontFamily: F,
                                    fontSize: 10, fontWeight: isActive ? 800 : 600,
                                    background: isActive ? `${g.color}10` : 'transparent',
                                    color: isActive ? g.color : B.g400,
                                    borderBottom: isActive ? `2px solid ${g.color}` : '2px solid transparent',
                                }}>
                                {g.icon} {checked}/{cnt}
                            </button>
                        );
                    })}
                </div>

                {/* Summary */}
                <div style={{
                    padding: '12px', background: `linear-gradient(135deg,${B.nvD},${B.nv})`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                    <div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontFamily: F, fontWeight: 700 }}>CHECKED IN</div>
                        <div style={{ fontSize: 28, fontWeight: 900, color: B.w, fontFamily: F }}>{checkedCount}/{groupPlayersAtt.length}</div>
                    </div>
                    <button onClick={() => setMode('assess')} style={{
                        padding: '10px 18px', borderRadius: 8, border: 'none',
                        background: `linear-gradient(135deg,${B.grn},${B.bl})`,
                        color: B.w, fontSize: 12, fontWeight: 700, fontFamily: F, cursor: 'pointer',
                    }}>{checkedCount === groupPlayersAtt.length ? '\u2705 All Here - Start' : 'Continue to Assess \u2192'}</button>
                </div>

                {/* Player checklist */}
                <div style={{ padding: '8px 12px', ...dkWrap }}>
                    {groupPlayersAtt.map(p => {
                        const checked = attendance[p.id];
                        const gDef = GROUP_DEFS.find(g => g.id === groupMap[p.id]);
                        return (
                            <div key={p.id}
                                onClick={() => toggleCheckIn(p.id)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    padding: '12px', borderRadius: 10, marginBottom: 4,
                                    background: checked ? `${B.grn}08` : B.w,
                                    border: checked ? `2px solid ${B.grn}` : `1px solid ${B.g200}`,
                                    cursor: 'pointer', transition: 'all 0.15s',
                                }}>
                                <div style={{
                                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                                    border: `2px solid ${checked ? B.grn : B.g300}`,
                                    background: checked ? B.grn : 'transparent',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'all 0.2s',
                                }}>
                                    {checked && <span style={{ fontSize: 14, color: B.w }}>\u2713</span>}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: B.nvD, fontFamily: F }}>{p.name}</div>
                                    <div style={{ fontSize: 9, color: B.g400, fontFamily: F }}>
                                        {getAge(p.dob)}yo \u2022 {getBracket(p.dob)} \u2022 {ROLES.find(r => r.id === p.role)?.sh || '?'}
                                    </div>
                                </div>
                                {gDef && (
                                    <div style={{
                                        fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                                        background: `${gDef.color}20`, color: gDef.color, fontFamily: F,
                                    }}>{gDef.icon}</div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* ═══ CUSTOM CONFIRM MODAL OVERLAY ═══ */}
                {confirmAction && (
                    <div style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
                    }}>
                        <div style={{
                            background: B.w, borderRadius: 16, padding: 24, width: '100%', maxWidth: 340,
                            boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
                        }}>
                            <div style={{ fontSize: 16, fontWeight: 900, color: B.nvD, fontFamily: F, marginBottom: 12 }}>
                                {confirmAction.title}
                            </div>
                            <div style={{ fontSize: 12, color: B.g600, fontFamily: F, marginBottom: 24, lineHeight: 1.5 }}>
                                {confirmAction.text}
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button onClick={() => setConfirmAction(null)} style={{
                                    flex: 1, padding: '12px', borderRadius: 10, border: 'none',
                                    background: B.g100, color: B.g600, fontSize: 12, fontWeight: 800, fontFamily: F, cursor: 'pointer'
                                }}>Cancel</button>
                                <button onClick={confirmAction.onConfirm} style={{
                                    flex: 1, padding: '12px', borderRadius: 10, border: 'none',
                                    background: confirmAction.isDanger ? B.red : B.bl, color: B.w,
                                    fontSize: 12, fontWeight: 800, fontFamily: F, cursor: 'pointer'
                                }}>{confirmAction.btnLabel}</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ═══════════════════════════════════════════════════
    // ROTATION BOARD MODE
    // ═══════════════════════════════════════════════════
    if (mode === 'rotations') {
        const handleAssessFromRotations = (playerName) => {
            const pObj = allPlayers.find(p => p.name === playerName);
            if (!pObj) return;

            let currentRoster = roster;
            if (activeGroup && groupMap[pObj.id] !== activeGroup) {
                setActiveGroup(null);
                currentRoster = allPlayers;
            }

            const idx = currentRoster.findIndex(p => p.id === pObj.id);
            if (idx >= 0) {
                setSelIdx(idx);
                setMode('assess');
                window.scrollTo(0, 0);
            }
        };
        const isPlayerDone = (pObj) => {
            if (!pObj) return false;
            const d = trialData[pObj.id];
            if (!d) return false;
            return !!d.overall_grade;
        };

        return <RotationBoard onAssessPlayer={handleAssessFromRotations} checkPlayerDone={isPlayerDone} allPlayers={allPlayers} />;
    }

    // ═══════════════════════════════════════════════════
    // ASSESSMENT MODE — EMPTY STATE
    // ═══════════════════════════════════════════════════
    if (roster.length === 0) {
        const hasPlayers = allPlayers.length > 0;
        return (
            <div style={{ minHeight: '100vh', fontFamily: F, background: B.g50 }}>
                <Hdr label="TRIAL DAY" onLogoClick={onBack} />
                <div style={{ padding: 40, textAlign: 'center' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>{hasPlayers ? '📋' : '🏏'}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: B.nvD, fontFamily: F, marginBottom: 8 }}>
                        {hasPlayers ? 'No Players in This Group' : 'No Players Yet'}
                    </div>
                    <div style={{ fontSize: 12, color: B.g400, fontFamily: F, marginBottom: 24, lineHeight: 1.5 }}>
                        {hasPlayers
                            ? 'No players have been assigned to this group yet. Switch groups or set up group assignments.'
                            : 'Players need to be added to the system before trial assessments can begin.'
                        }
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                        {hasPlayers && (
                            <button onClick={() => setActiveGroup(null)} style={{
                                padding: '12px 24px', borderRadius: 10, border: 'none',
                                background: `linear-gradient(135deg,${B.bl},${B.pk})`,
                                color: B.w, fontSize: 13, fontWeight: 700, fontFamily: F, cursor: 'pointer',
                            }}>Show All Players</button>
                        )}
                        <button onClick={onBack} style={{
                            padding: '12px 24px', borderRadius: 10, border: `1px solid ${B.g200}`,
                            background: 'transparent',
                            color: B.g600, fontSize: 13, fontWeight: 700, fontFamily: F, cursor: 'pointer',
                        }}>← Back</button>
                    </div>
                </div>
            </div>
        );
    }

    // ═══ PLAYER LIST OVERLAY ═══
    const PlayerListPanel = () => (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', zIndex: 200,
            display: showList ? 'block' : 'none',
        }} onClick={() => setShowList(false)}>
            <div style={{
                position: 'absolute', top: 0, left: 0, bottom: 0,
                width: _isDesktop ? 320 : '85%',
                background: B.w, overflowY: 'auto',
                boxShadow: '4px 0 24px rgba(0,0,0,0.2)',
            }} onClick={e => e.stopPropagation()}>
                <div style={{
                    padding: '16px 14px', background: `linear-gradient(135deg,${B.nvD},${B.nv})`,
                    position: 'sticky', top: 0, zIndex: 1,
                }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', fontFamily: F, letterSpacing: 2, textTransform: 'uppercase' }}>
                        {activeGroup || 'ALL PLAYERS'}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: B.w, fontFamily: F, marginTop: 4 }}>{completedInGroup}/{roster.length} assessed</div>
                </div>
                {roster.map((p, i) => {
                    const d = trialData[p.id];
                    const done = d && !!d.overall_grade;
                    const isSel = i === selIdx;
                    return (
                        <div key={p.id} onClick={() => goTo(i)} style={{
                            padding: '10px 14px', cursor: 'pointer',
                            background: isSel ? `${B.bl}10` : 'transparent',
                            borderLeft: isSel ? `4px solid ${B.bl}` : '4px solid transparent',
                            borderBottom: `1px solid ${B.g100}`,
                            display: 'flex', alignItems: 'center', gap: 10,
                            transition: 'all 0.15s',
                        }}>
                            <div style={{
                                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                                border: `2px solid ${done ? B.grn : B.g200}`,
                                background: done ? `${B.grn}15` : 'transparent',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                {done
                                    ? <span style={{ fontSize: 12, color: B.grn, fontWeight: 800 }}>✓</span>
                                    : <span style={{ fontSize: 16, color: B.g300 }}>-</span>
                                }
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: B.nvD, fontFamily: F, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                                <div style={{ fontSize: 9, color: B.g400, fontFamily: F }}>{getAge(p.dob)}yo • {getBracket(p.dob)} • {ROLES.find(r => r.id === p.role)?.sh || '?'}</div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );



    const ro = sp ? ROLES.find(r => r.id === sp.role) : null;
    const age = sp ? getAge(sp.dob) : null;
    const bracket = sp ? getBracket(sp.dob) : null;
    const ini = sp?.name ? sp.name.split(' ').map(w => w[0]).join('').slice(0, 2) : '?';
    const playerGroup = sp ? groupMap[sp.id] : null;
    const groupDef = playerGroup ? GROUP_DEFS.find(g => g.id === playerGroup) : null;

    return (
        <div style={{ minHeight: '100vh', fontFamily: F, background: B.g50, paddingBottom: 70 }}>
            {/* ═══ HEADER ═══ */}
            <Hdr label="TRIAL DAY" onLogoClick={onBack} />

            {/* ═══ COACH IDENTITY BAR ═══ */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 12px', background: B.nvD, borderBottom: `1px solid ${B.g200}`,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                        width: 26, height: 26, borderRadius: '50%',
                        background: `linear-gradient(135deg, ${B.pk}, ${B.bl})`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 900, color: B.w, fontFamily: F,
                    }}>{(coachName || '?')[0]}</div>
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: B.w, fontFamily: F }}>{coachName || 'Coach'}</div>
                        <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', fontFamily: F, fontWeight: 600 }}>
                            {isAdmin ? '⭐ Super Admin' : 'Coach'}
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    {undoStack.length > 0 && (
                        <button onClick={handleUndo} style={{
                            padding: '5px 10px', borderRadius: 8, border: `1px solid ${B.amb}`,
                            background: `${B.amb}20`, color: B.amb, fontSize: 10, fontWeight: 700,
                            fontFamily: F, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                        }}>↩ Undo ({undoStack.length})</button>
                    )}
                    <button onClick={onLogout || onBack} style={{
                        padding: '5px 10px', borderRadius: 8, border: `1px solid ${B.red}60`,
                        background: `${B.red}15`, color: B.red, fontSize: 10, fontWeight: 700,
                        fontFamily: F, cursor: 'pointer',
                    }}>Sign Out</button>
                </div>
            </div>

            {/* ═══ TOP APP NAVIGATION ═══ */}
            <div style={{
                display: 'flex', background: B.w, borderBottom: `1px solid ${B.g200}`,
                padding: '4px 6px', gap: 4, overflowX: 'auto'
            }}>
                <button onClick={() => setMode('attendance')}
                    style={{
                        flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: F,
                        fontSize: 10, fontWeight: 700, background: `${B.grn}15`, color: B.grn, whiteSpace: 'nowrap',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                >✅ Attendance</button>
                <button onClick={() => setMode('rotations')}
                    style={{
                        flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: F,
                        fontSize: 10, fontWeight: 700, background: `${B.grn}15`, color: B.grn, whiteSpace: 'nowrap',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                >🔄 Rotations</button>
            </div>

            {/* ═══ GROUP FILTER TABS ═══ */}
            <div style={{
                display: 'flex', background: B.w, borderBottom: `1px solid ${B.g200}`,
                overflowX: 'auto', gap: 0,
            }}>
                <button onClick={() => setActiveGroup(null)}
                    style={{
                        flex: 1, padding: '8px 4px', border: 'none', cursor: 'pointer', fontFamily: F,
                        fontSize: 10, fontWeight: activeGroup === null ? 800 : 600,
                        background: activeGroup === null ? `${B.org}10` : 'transparent',
                        color: activeGroup === null ? B.org : B.g400,
                        borderBottom: activeGroup === null ? `2px solid ${B.org}` : '2px solid transparent',
                        transition: 'all 0.2s', whiteSpace: 'nowrap',
                    }}
                >All ({allPlayers.length})</button>
                {GROUP_DEFS.map(g => {
                    const cnt = allPlayers.filter(p => groupMap[p.id] === g.id).length;
                    const isActive = activeGroup === g.id;
                    return (
                        <button key={g.id} onClick={() => setActiveGroup(isActive ? null : g.id)}
                            style={{
                                flex: 1, padding: '8px 4px', border: 'none', cursor: 'pointer', fontFamily: F,
                                fontSize: 10, fontWeight: isActive ? 800 : 600,
                                background: isActive ? `${g.color}10` : 'transparent',
                                color: isActive ? g.color : B.g400,
                                borderBottom: isActive ? `2px solid ${g.color}` : '2px solid transparent',
                                transition: 'all 0.2s', whiteSpace: 'nowrap',
                            }}
                        >{g.icon} {g.label} ({cnt})</button>
                    );
                })}
            </div>



            {/* ═══ PROGRESS BAR ═══ */}
            <div style={{
                background: `linear-gradient(135deg,${B.org}15,${B.amb}15)`,
                padding: '8px 12px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: `1px solid ${B.g200}`,
            }}>
                <button onClick={() => setShowList(true)} style={{
                    background: 'none', border: `1px solid ${B.org}`, borderRadius: 6,
                    padding: '4px 10px', fontSize: 10, fontWeight: 700, color: B.org,
                    fontFamily: F, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                }}>
                    ☰ Players
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: B.nvD, fontFamily: F }}>
                        {completedInGroup}/{roster.length}
                    </div>
                    <div style={{
                        width: 80, height: 6, borderRadius: 3, background: B.g200, overflow: 'hidden',
                    }}>
                        <div style={{
                            width: `${roster.length > 0 ? (completedInGroup / roster.length) * 100 : 0}%`,
                            height: '100%', borderRadius: 3,
                            background: `linear-gradient(135deg,${B.org},${B.amb})`,
                            transition: 'width 0.5s',
                        }} />
                    </div>
                    {saving && <div style={{ fontSize: 9, color: B.amb, fontFamily: F, fontWeight: 600 }}>Saving...</div>}
                    {!saving && saveError && <div style={{ fontSize: 9, color: B.red, fontFamily: F, fontWeight: 700 }}>⚠️ {saveError}</div>}
                    {!saving && !saveError && lastSaved && <div style={{ fontSize: 9, color: B.grn, fontFamily: F, fontWeight: 600 }}>✓ Saved</div>}
                </div>
            </div>

            {/* ═══ PLAYER HEADER ═══ */}
            {sp && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    background: B.w, borderBottom: `1px solid ${B.g200}`,
                    ...(_isDesktop ? { maxWidth: 780, margin: '0 auto' } : {}),
                }}>
                    <div style={{
                        width: 38, height: 38, borderRadius: '50%', ...sGrad,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                        <span style={{ color: B.w, fontSize: 13, fontWeight: 800, fontFamily: F }}>{ini}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ fontSize: 15, fontWeight: 800, color: B.nvD, fontFamily: F }}>{sp.name}</div>
                            {groupDef && (
                                <div style={{
                                    fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                                    background: `${groupDef.color}20`, color: groupDef.color, fontFamily: F,
                                }}>{groupDef.label}</div>
                            )}
                        </div>
                        <div style={{ fontSize: 10, color: B.g400, fontFamily: F }}>{age}yo • {bracket} • {ro?.label || '?'} • {sp.club || ''}</div>
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, fontFamily: F, color: B.g400 }}>
                        {selIdx + 1}/{roster.length}
                    </div>
                </div>
            )}

            {/* ═══ ASSESSMENT BODY ═══ */}
            <div style={{ padding: '0 12px', ...dkWrap }}>

                {/* ═══ OVERALL GRADE ═══ */}
                <div style={{ marginTop: 16 }}>
                    <div style={{
                        fontSize: 10, fontWeight: 800, color: B.nv, fontFamily: F,
                        letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6,
                        display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                        <div style={{ width: 3, height: 14, borderRadius: 2, background: B.nv }} />
                        OVERALL GRADE
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8, marginBottom: 12 }}>
                        {OVERALL_GRADES.map(opt => (
                            <button key={opt.id} onClick={() => updateField('overall_grade', cd.overall_grade === opt.id ? null : opt.id)}
                                style={{
                                    padding: '12px 14px', borderRadius: 10, border: 'none',
                                    background: cd.overall_grade === opt.id ? opt.color : B.g100,
                                    color: cd.overall_grade === opt.id ? (opt.id === 'silver' ? '#333' : B.w) : B.g600,
                                    fontSize: 14, fontWeight: 800, fontFamily: F,
                                    cursor: 'pointer', transition: 'all 0.15s',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    boxShadow: cd.overall_grade === opt.id ? `0 4px 12px ${opt.color}40` : 'none',
                                }}
                            >
                                <span>{opt.title}</span>
                                <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.9 }}>{opt.desc}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ═══ ARCHETYPE QUICK-PICK ═══ */}
                <div style={{ marginTop: 16 }}>
                    <div style={{
                        fontSize: 10, fontWeight: 800, color: B.pk, fontFamily: F,
                        letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6,
                        display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                        <div style={{ width: 3, height: 14, borderRadius: 2, background: B.pk }} />
                        BATTING ARCHETYPE
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                        {BAT_ARCH.map(a => (
                            <button key={a.id} onClick={() => updateField('batA', cd.batA === a.id ? null : a.id)}
                                style={{
                                    padding: '7px 12px', borderRadius: 8, border: 'none',
                                    background: cd.batA === a.id ? a.c : B.g100,
                                    color: cd.batA === a.id ? B.w : B.g600,
                                    fontSize: 10, fontWeight: 700, fontFamily: F,
                                    cursor: 'pointer', transition: 'all 0.15s',
                                    boxShadow: cd.batA === a.id ? `0 2px 8px ${a.c}40` : 'none',
                                }}
                            >{a.nm}</button>
                        ))}
                    </div>

                    <div style={{
                        fontSize: 10, fontWeight: 800, color: B.bl, fontFamily: F,
                        letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6,
                        display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                        <div style={{ width: 3, height: 14, borderRadius: 2, background: B.bl }} />
                        BOWLING TYPE & ARCHETYPE
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        {BOWLING_TYPES.map(bt => (
                            <button key={bt.id} onClick={() => updateField('bowling_type', cd.bowling_type === bt.id ? null : bt.id)}
                                style={{
                                    flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none',
                                    background: cd.bowling_type === bt.id ? bt.color : B.g100,
                                    color: cd.bowling_type === bt.id ? B.w : B.g600,
                                    fontSize: 11, fontWeight: 700, fontFamily: F, cursor: 'pointer',
                                }}
                            >{bt.title}</button>
                        ))}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {BWL_ARCH.map(a => (
                            <button key={a.id} onClick={() => updateField('bwlA', cd.bwlA === a.id ? null : a.id)}
                                style={{
                                    padding: '7px 12px', borderRadius: 8, border: 'none',
                                    background: cd.bwlA === a.id ? a.c : B.g100,
                                    color: cd.bwlA === a.id ? B.w : B.g600,
                                    fontSize: 10, fontWeight: 700, fontFamily: F,
                                    cursor: 'pointer', transition: 'all 0.15s',
                                    boxShadow: cd.bwlA === a.id ? `0 2px 8px ${a.c}40` : 'none',
                                }}
                            >{a.nm}</button>
                        ))}
                    </div>
                </div>

                {/* ═══ SQUAD RECOMMENDATION ═══ */}
                <div style={{ marginTop: 16 }}>
                    <div style={{
                        fontSize: 10, fontWeight: 800, color: B.nv, fontFamily: F,
                        letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6,
                        display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                        <div style={{ width: 3, height: 14, borderRadius: 2, background: B.nv }} />
                        SQUAD RECOMMENDATION
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {SQUAD_OPTIONS.map(opt => (
                            <button key={opt.id} onClick={() => updateField('squad_rec', cd.squad_rec === opt.id ? null : opt.id)}
                                style={{
                                    flex: 1, padding: '12px 8px', borderRadius: 10, border: 'none',
                                    background: cd.squad_rec === opt.id ? opt.color : B.g100,
                                    color: cd.squad_rec === opt.id ? B.w : B.g600,
                                    fontSize: 11, fontWeight: 700, fontFamily: F,
                                    cursor: 'pointer', transition: 'all 0.15s',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                                    boxShadow: cd.squad_rec === opt.id ? `0 2px 12px ${opt.color}30` : 'none',
                                }}
                            >
                                <span style={{ fontSize: 18 }}>{opt.icon}</span>
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ═══ QUICK NOTE ═══ */}
                <div style={{ marginTop: 12, marginBottom: 16 }}>
                    <input
                        type="text"
                        value={cd.quick_note || ''}
                        onChange={e => updateField('quick_note', e.target.value)}
                        placeholder="Quick note about this player..."
                        style={{
                            width: '100%', padding: '12px 14px', borderRadius: 10,
                            border: `1.5px solid ${B.g200}`, background: B.w,
                            fontSize: 12, fontWeight: 500, fontFamily: F, color: B.g800,
                            outline: 'none', boxSizing: 'border-box',
                        }}
                    />
                </div>
            </div>

            {/* ═══ FIXED BOTTOM NAV ═══ */}
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                background: B.w, borderTop: `1px solid ${B.g200}`,
                padding: '8px 12px', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', zIndex: 100,
                ...(_isDesktop ? { maxWidth: 780, margin: '0 auto', left: '50%', transform: 'translateX(-50%)' } : {}),
            }}>
                <button
                    onClick={() => { if (selIdx > 0) goTo(selIdx - 1); else onBack(); }}
                    style={{
                        padding: '10px 18px', borderRadius: 8,
                        border: `1px solid ${B.g200}`, background: 'transparent',
                        fontSize: 12, fontWeight: 600, color: B.g600,
                        cursor: 'pointer', fontFamily: F,
                    }}
                >
                    ← {selIdx > 0 ? 'Prev' : 'Exit'}
                </button>

                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: B.nvD, fontFamily: F }}>{selIdx + 1} / {roster.length}</div>
                    <div style={{ fontSize: 8, color: B.g400, fontFamily: F }}>{sp?.name?.split(' ')[0]}</div>
                </div>

                <button
                    onClick={() => { if (selIdx < roster.length - 1) goTo(selIdx + 1); }}
                    disabled={selIdx >= roster.length - 1}
                    style={{
                        padding: '10px 18px', borderRadius: 8,
                        border: 'none',
                        background: selIdx < roster.length - 1
                            ? `linear-gradient(135deg,${B.org},${B.amb})`
                            : B.g200,
                        fontSize: 12, fontWeight: 700,
                        color: selIdx < roster.length - 1 ? B.w : B.g400,
                        cursor: selIdx < roster.length - 1 ? 'pointer' : 'default',
                        fontFamily: F,
                    }}
                >
                    Next →
                </button>
            </div>

            {/* Player list overlay */}
            <PlayerListPanel />
        </div>
    );
}
