// ═══ TRIAL DAY — Rapid Coach Assessment ═══
// Mobile-first, single-screen-per-player rapid scoring interface
// Data is sandboxed in trial_assessments table
// Supports 3 session groups for splitting players across time slots

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { B, F, sGrad, sCard, _isDesktop, dkWrap, LOGO } from '../data/theme';
import { BAT_ARCH, BWL_ARCH, ROLES } from '../data/skillItems';
import { supabase } from '../supabaseClient';
import { Hdr } from '../shared/FormComponents';
import TrialSessionPlanner from './TrialSessionPlanner';

// ═══ TRIAL SCORING DIMENSIONS ═══
const TRIAL_ITEMS = [
    {
        group: 'Technical', color: B.pk, items: [
            { key: 'batting_technique', label: 'Batting Technique', icon: '🏏' },
            { key: 'bowling_skill', label: 'Bowling Skill', icon: '🎯' },
            { key: 'power_hitting', label: 'Power Hitting', icon: '💥' },
            { key: 'strike_rotation', label: 'Strike Rotation', icon: '🔄' },
        ]
    },
    {
        group: 'Cricket IQ & Mental', color: B.sky, items: [
            { key: 'game_awareness', label: 'Game Awareness', icon: '🧠' },
            { key: 'decision_making', label: 'Decision Making', icon: '⚡' },
            { key: 'pressure_handling', label: 'Pressure Handling', icon: '🎯' },
            { key: 'coachability', label: 'Coachability', icon: '📋' },
        ]
    },
    {
        group: 'Physical & Fielding', color: B.grn, items: [
            { key: 'athleticism', label: 'Athleticism', icon: '🏃' },
            { key: 'ground_fielding', label: 'Ground Fielding', icon: '🤾' },
            { key: 'catching', label: 'Catching', icon: '🤲' },
            { key: 'running_bw', label: 'Running Between Wickets', icon: '🏃‍♂️' },
        ]
    },
];

const SQUAD_OPTIONS = [
    { id: 'move_up', label: 'Move Up', icon: '⬆️', color: B.grn },
    { id: 'right_level', label: 'Right Level', icon: '✅', color: B.bl },
    { id: 'move_down', label: 'Move Down', icon: '⬇️', color: B.amb },
];

const NET_LANES = [
    {
        id: 'lane4', label: 'Power Play', net: 'Lane 4', overs: 'Overs 1-6', icon: '\u26a1', color: B.pk,
        focus: 'First 6 overs. Aggressive intent. Attacking the new ball.',
        guidance: "If a player is blocking, that is an education opportunity - they need to understand T20 intent. Judge INTENT to score, not just result. A great ball beaten by a better shot = high marks for both."
    },
    {
        id: 'lane2', label: 'Spin to Win', net: 'Lane 2', overs: 'Overs 7-12', icon: '\ud83c\udf00', color: '#8B5CF6',
        focus: 'Playing spin. Finding boundaries. Understanding archetype.',
        guidance: "Look for: smart rotation, boundary-finding ability, comfort vs spin. Punching ones/twos and finding a boundary = excellent. Separate ball quality from shot quality - a great ball AND a great shot can coexist."
    },
    {
        id: 'lane6', label: 'Middle Overs', net: 'Lane 6', overs: 'Overs 10-15', icon: '\ud83c\udfaf', color: B.bl,
        focus: 'Under pressure. Game situation awareness.',
        guidance: "Scenario: 5 down, 60 at the 10th over. How do they respond? Look for composure, risk management, and ability to rebuild while maintaining tempo. Separate good ball/bad shot from bad ball/good shot."
    },
    {
        id: 'lane7', label: 'Finish the Game', net: 'Lane 7', overs: 'Overs 17-20', icon: '\ud83d\udd25', color: B.org,
        focus: 'Last 3 overs. How do you close out the innings?',
        guidance: "Chasing 14 off the last over. Assess finishing ability, shot selection, ability to find boundaries under extreme pressure. Innovation and composure under duress are key markers."
    },
];


const GROUP_DEFS = [
    { id: 'Group 1', label: 'Group 1', color: B.pk, icon: '1️⃣', time: 'Session 1' },
    { id: 'Group 2', label: 'Group 2', color: B.bl, icon: '2️⃣', time: 'Session 2' },
    { id: 'Group 3', label: 'Group 3', color: B.grn, icon: '3️⃣', time: 'Session 3' },
];

const TODAY = new Date().toISOString().slice(0, 10);

export default function TrialAssessment({ session, players, onBack, getAge, getBracket, isAdmin }) {
    const [mode, setMode] = useState('assess'); // 'assess' | 'setup' | 'planner' | 'attendance'
    const [selIdx, setSelIdx] = useState(0);
    const [trialData, setTrialData] = useState({});
    const [groupMap, setGroupMap] = useState({}); // { playerId: 'Group 1' }
    const [attendance, setAttendance] = useState({}); // { playerId: true }
    const [activeGroup, setActiveGroup] = useState(null); // null = all
    const [saving, setSaving] = useState(false);
    const [showList, setShowList] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);
    const [setupSearch, setSetupSearch] = useState('');
    const [coachLane, setCoachLane] = useState(null); // active NET_LANES id
    const [showTopSheet, setShowTopSheet] = useState(false);
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
                const { data } = await supabase
                    .from('trial_assessments')
                    .select('*')
                    .eq('coach_id', session.user.id)
                    .eq('session_date', TODAY);
                if (data) {
                    const map = {};
                    data.forEach(row => {
                        const d = {};
                        TRIAL_ITEMS.forEach(g => g.items.forEach(it => { if (row[it.key]) d[it.key] = row[it.key]; }));
                        if (row.batting_archetype) d.batA = row.batting_archetype;
                        if (row.bowling_archetype) d.bwlA = row.bowling_archetype;
                        if (row.squad_rec) d.squad_rec = row.squad_rec;
                        if (row.quick_note) d.quick_note = row.quick_note;
                        map[row.player_id] = d;
                    });
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
                    const gm = {};
                    const att = {};
                    data.forEach(row => {
                        gm[row.player_id] = row.group_label;
                        if (row.checked_in) att[row.player_id] = true;
                    });
                    setGroupMap(gm);
                    setAttendance(att);
                }
            } catch (e) {
                console.warn('Failed to load group data:', e.message);
            }
        })();
    }, [session, allPlayers.length]);

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
            const row = {
                player_id: playerId,
                coach_id: session.user.id,
                session_date: TODAY,
            };
            TRIAL_ITEMS.forEach(g => g.items.forEach(it => {
                row[it.key] = data[it.key] || null;
            }));
            row.batting_archetype = data.batA || null;
            row.bowling_archetype = data.bwlA || null;
            row.squad_rec = data.squad_rec || null;
            row.quick_note = data.quick_note || null;
            row.updated_at = new Date().toISOString();

            await supabase.from('trial_assessments').upsert(row, {
                onConflict: 'player_id,coach_id,session_date'
            });
            setLastSaved(new Date());
        } catch (e) {
            console.error('Trial save error:', e.message);
        } finally {
            setSaving(false);
        }
    }, [session]);

    const updateField = (key, value) => {
        if (!sp) return;
        const pid = sp.id;
        const updated = { ...pendingRef.current[pid], [key]: value };
        pendingRef.current = { ...pendingRef.current, [pid]: updated };
        setTrialData(prev => ({ ...prev, [pid]: updated }));

        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
            saveTrial(pid, pendingRef.current[pid]);
        }, 1500);
    };

    // ═══ SAVE GROUP ASSIGNMENT ═══
    const setPlayerGroup = async (playerId, groupLabel) => {
        // Optimistic update
        setGroupMap(prev => {
            if (!groupLabel) {
                const next = { ...prev };
                delete next[playerId];
                return next;
            }
            return { ...prev, [playerId]: groupLabel };
        });

        try {
            if (!groupLabel) {
                await supabase.from('trial_player_groups')
                    .delete()
                    .eq('player_id', playerId)
                    .eq('session_date', TODAY);
            } else {
                await supabase.from('trial_player_groups').upsert({
                    player_id: playerId,
                    group_label: groupLabel,
                    session_date: TODAY,
                }, { onConflict: 'player_id,session_date' });
            }
        } catch (e) {
            console.error('Group save error:', e.message);
        }
    };

    // ═══ BULK GROUP ASSIGNMENT ═══
    const autoAssignGroups = async () => {
        const unassigned = allPlayers.filter(p => !groupMap[p.id]);
        const perGroup = Math.ceil(unassigned.length / 3);
        const newMap = { ...groupMap };
        const rows = [];

        unassigned.forEach((p, i) => {
            const gIdx = Math.min(Math.floor(i / perGroup), 2);
            const label = GROUP_DEFS[gIdx].id;
            newMap[p.id] = label;
            rows.push({
                player_id: p.id,
                group_label: label,
                session_date: TODAY,
            });
        });

        setGroupMap(newMap);
        if (rows.length > 0) {
            try {
                await supabase.from('trial_player_groups')
                    .upsert(rows, { onConflict: 'player_id,session_date' });
            } catch (e) {
                console.error('Bulk assign error:', e.message);
            }
        }
    };

    const cd = sp ? (trialData[sp.id] || {}) : {};

    // Count completed players
    const completedInGroup = roster.filter(p => {
        const d = trialData[p.id];
        if (!d) return false;
        return TRIAL_ITEMS.flatMap(g => g.items).filter(it => d[it.key] > 0).length >= 4;
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
            </div>
        );
    }

    // ═══════════════════════════════════════════════════
    // SESSION PLANNER MODE
    // ═══════════════════════════════════════════════════
    if (mode === 'planner') {
        const handleAssessFromPlanner = (playerId) => {
            const idx = roster.findIndex(p => p.id === playerId);
            if (idx >= 0) {
                setSelIdx(idx);
                setMode('assess');
                window.scrollTo(0, 0);
            }
        };
        return (
            <TrialSessionPlanner
                session={session}
                players={allPlayers}
                groupMap={groupMap}
                activeGroup={activeGroup}
                getAge={getAge}
                getBracket={getBracket}
                onBack={() => setMode('assess')}
                onAssessPlayer={handleAssessFromPlanner}
            />
        );
    }

    // ═══════════════════════════════════════════════════
    // GROUP SETUP MODE
    // ═══════════════════════════════════════════════════
    if (mode === 'setup') {
        const filteredPlayers = setupSearch
            ? allPlayers.filter(p => p.name?.toLowerCase().includes(setupSearch.toLowerCase()))
            : allPlayers;

        const groupCounts = {};
        GROUP_DEFS.forEach(g => { groupCounts[g.id] = 0; });
        let unassignedCount = 0;
        allPlayers.forEach(p => {
            if (groupMap[p.id]) groupCounts[groupMap[p.id]] = (groupCounts[groupMap[p.id]] || 0) + 1;
            else unassignedCount++;
        });

        return (
            <div style={{ minHeight: '100vh', fontFamily: F, background: B.g50 }}>
                <Hdr label="TRIAL DAY — SETUP" onLogoClick={() => setMode('assess')} />

                {/* Group summary */}
                <div style={{
                    padding: '12px', display: 'flex', gap: 8, flexWrap: 'wrap',
                    background: `linear-gradient(135deg,${B.nvD},${B.nv})`,
                }}>
                    {GROUP_DEFS.map(g => (
                        <div key={g.id} style={{
                            flex: 1, minWidth: 90, padding: '10px 12px', borderRadius: 10,
                            background: 'rgba(255,255,255,0.1)', textAlign: 'center',
                            border: `2px solid ${g.color}40`,
                        }}>
                            <div style={{ fontSize: 18 }}>{g.icon}</div>
                            <div style={{ fontSize: 12, fontWeight: 800, color: B.w, fontFamily: F }}>{g.label}</div>
                            <div style={{ fontSize: 20, fontWeight: 900, color: g.color, fontFamily: F }}>{groupCounts[g.id] || 0}</div>
                            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', fontFamily: F }}>players</div>
                        </div>
                    ))}
                    {unassignedCount > 0 && (
                        <div style={{
                            flex: 1, minWidth: 90, padding: '10px 12px', borderRadius: 10,
                            background: 'rgba(255,255,255,0.05)', textAlign: 'center',
                            border: `2px dashed rgba(255,255,255,0.2)`,
                        }}>
                            <div style={{ fontSize: 18 }}>❓</div>
                            <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.6)', fontFamily: F }}>Unassigned</div>
                            <div style={{ fontSize: 20, fontWeight: 900, color: B.amb, fontFamily: F }}>{unassignedCount}</div>
                            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', fontFamily: F }}>players</div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div style={{ padding: '12px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={autoAssignGroups} style={{
                        flex: 1, padding: '10px 14px', borderRadius: 8, border: 'none',
                        background: `linear-gradient(135deg,${B.org},${B.amb})`,
                        color: B.w, fontSize: 11, fontWeight: 700, fontFamily: F, cursor: 'pointer',
                    }}>⚡ Auto-Split Evenly</button>
                    <button onClick={() => setMode('assess')} style={{
                        flex: 1, padding: '10px 14px', borderRadius: 8, border: 'none',
                        background: `linear-gradient(135deg,${B.bl},${B.pk})`,
                        color: B.w, fontSize: 11, fontWeight: 700, fontFamily: F, cursor: 'pointer',
                    }}>✅ Done — Start Scoring</button>
                </div>

                {/* Search */}
                <div style={{ padding: '0 12px 8px' }}>
                    <input
                        type="text"
                        value={setupSearch}
                        onChange={e => setSetupSearch(e.target.value)}
                        placeholder="Search players..."
                        style={{
                            width: '100%', padding: '10px 14px', borderRadius: 8,
                            border: `1.5px solid ${B.g200}`, background: B.w,
                            fontSize: 12, fontWeight: 500, fontFamily: F, color: B.g800,
                            outline: 'none', boxSizing: 'border-box',
                        }}
                    />
                </div>

                {/* Player list with group assignment */}
                <div style={{ padding: '0 12px', ...dkWrap }}>
                    {filteredPlayers.map(p => {
                        const currentGroup = groupMap[p.id];
                        return (
                            <div key={p.id} style={{
                                background: B.w, borderRadius: 10, padding: '10px 12px',
                                border: `1px solid ${B.g200}`, marginBottom: 6,
                                borderLeft: currentGroup ? `4px solid ${GROUP_DEFS.find(g => g.id === currentGroup)?.color || B.g400}` : `4px solid ${B.g200}`,
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: B.nvD, fontFamily: F, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                                        <div style={{ fontSize: 9, color: B.g400, fontFamily: F }}>{getAge(p.dob)}yo • {getBracket(p.dob)} • {ROLES.find(r => r.id === p.role)?.sh || '?'}</div>
                                    </div>
                                    {currentGroup && (
                                        <div style={{
                                            fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                                            background: `${GROUP_DEFS.find(g => g.id === currentGroup)?.color || B.g400}20`,
                                            color: GROUP_DEFS.find(g => g.id === currentGroup)?.color || B.g400,
                                            fontFamily: F,
                                        }}>{currentGroup}</div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    {GROUP_DEFS.map(g => (
                                        <button key={g.id}
                                            onClick={() => setPlayerGroup(p.id, currentGroup === g.id ? null : g.id)}
                                            style={{
                                                flex: 1, padding: '6px 4px', borderRadius: 6, border: 'none',
                                                background: currentGroup === g.id ? g.color : B.g100,
                                                color: currentGroup === g.id ? B.w : B.g400,
                                                fontSize: 10, fontWeight: 700, fontFamily: F,
                                                cursor: 'pointer', transition: 'all 0.15s',
                                            }}
                                        >{g.icon} {g.label}</button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
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
                            <>
                                <button onClick={() => setActiveGroup(null)} style={{
                                    padding: '12px 24px', borderRadius: 10, border: 'none',
                                    background: `linear-gradient(135deg,${B.bl},${B.pk})`,
                                    color: B.w, fontSize: 13, fontWeight: 700, fontFamily: F, cursor: 'pointer',
                                }}>Show All Players</button>
                                <button onClick={() => setMode('setup')} style={{
                                    padding: '12px 24px', borderRadius: 10, border: `1px solid ${B.org}`,
                                    background: 'transparent',
                                    color: B.org, fontSize: 13, fontWeight: 700, fontFamily: F, cursor: 'pointer',
                                }}>⚙ Setup Groups</button>
                            </>
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
                    const ratedCount = d ? TRIAL_ITEMS.flatMap(g => g.items).filter(it => d[it.key] > 0).length : 0;
                    const done = ratedCount >= 4;
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
                                    : <span style={{ fontSize: 8, color: B.g400 }}>{ratedCount}</span>
                                }
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: B.nvD, fontFamily: F, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                                <div style={{ fontSize: 9, color: B.g400, fontFamily: F }}>{getAge(p.dob)}yo • {getBracket(p.dob)} • {ROLES.find(r => r.id === p.role)?.sh || '?'}</div>
                            </div>
                            {ratedCount > 0 && !done && (
                                <div style={{ fontSize: 8, fontWeight: 700, color: B.amb, fontFamily: F }}>{ratedCount}/12</div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );

    // ═══ COMPACT RATING ROW ═══
    const RatingRow = ({ item, value, color, onRate }) => (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 0',
            borderBottom: `1px solid ${B.g100}`,
        }}>
            <div style={{ width: 22, textAlign: 'center', fontSize: 14, flexShrink: 0 }}>{item.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: B.g800, fontFamily: F, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</div>
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                {[1, 2, 3, 4, 5].map(n => {
                    const sel = value === n;
                    return (
                        <button key={n} onClick={() => onRate(n)}
                            style={{
                                width: 36, height: 36, borderRadius: 8, border: 'none',
                                background: sel ? color : B.g100,
                                color: sel ? B.w : B.g600,
                                fontSize: 13, fontWeight: 800, fontFamily: F,
                                cursor: 'pointer', transition: 'all 0.15s',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: sel ? `0 2px 8px ${color}40` : 'none',
                            }}
                        >{n}</button>
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
                <button onClick={() => setMode('attendance')}
                    style={{
                        padding: '8px 8px', border: 'none', cursor: 'pointer', fontFamily: F,
                        fontSize: 10, fontWeight: 700, background: 'transparent',
                        color: B.grn, whiteSpace: 'nowrap',
                    }}
                >✅</button>
                <button onClick={() => setMode('planner')}
                    style={{
                        padding: '8px 8px', border: 'none', cursor: 'pointer', fontFamily: F,
                        fontSize: 10, fontWeight: 700, background: 'transparent',
                        color: B.prp, whiteSpace: 'nowrap',
                    }}
                >📋</button>
                <button onClick={() => setShowTopSheet(true)}
                    style={{
                        padding: '8px 8px', border: 'none', cursor: 'pointer', fontFamily: F,
                        fontSize: 10, fontWeight: 700, background: 'transparent',
                        color: B.sky, whiteSpace: 'nowrap',
                    }}
                >🏃</button>
                <button onClick={() => setMode('setup')}
                    style={{
                        padding: '8px 8px', border: 'none', cursor: 'pointer', fontFamily: F,
                        fontSize: 10, fontWeight: 700, background: 'transparent',
                        color: B.org, whiteSpace: 'nowrap',
                    }}
                >⚙</button>
            </div>

            {/* ═══ COACH LANE SELECTOR ═══ */}
            <div style={{
                display: 'flex', gap: 4, padding: '6px 12px', background: B.w,
                borderBottom: `1px solid ${B.g200}`, overflowX: 'auto',
            }}>
                <div style={{ fontSize: 8, fontWeight: 700, color: B.g400, fontFamily: F, alignSelf: 'center', whiteSpace: 'nowrap', marginRight: 4 }}>MY NET:</div>
                {NET_LANES.map(lane => {
                    const isActive = coachLane === lane.id;
                    return (
                        <button key={lane.id} onClick={() => setCoachLane(isActive ? null : lane.id)}
                            style={{
                                padding: '5px 8px', borderRadius: 6, border: 'none',
                                background: isActive ? lane.color : B.g100,
                                color: isActive ? B.w : B.g500,
                                fontSize: 9, fontWeight: 700, fontFamily: F,
                                cursor: 'pointer', transition: 'all 0.15s',
                                whiteSpace: 'nowrap', flexShrink: 0,
                            }}
                        >{lane.icon} {lane.label}</button>
                    );
                })}
            </div>

            {/* Lane context banner */}
            {coachLane && (() => {
                const lane = NET_LANES.find(l => l.id === coachLane);
                if (!lane) return null;
                return (
                    <div style={{
                        padding: '8px 12px', background: `${lane.color}10`,
                        borderBottom: `2px solid ${lane.color}30`,
                    }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: lane.color, fontFamily: F }}>
                            {lane.icon} {lane.net} — {lane.label} ({lane.overs})
                        </div>
                        <div style={{ fontSize: 9, color: B.g600, fontFamily: F, marginTop: 2, lineHeight: 1.4 }}>
                            {lane.focus}
                        </div>
                    </div>
                );
            })()}

            {/* ═══ TOP SHEET OVERLAY ═══ */}
            {showTopSheet && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)', zIndex: 300, overflowY: 'auto',
                }} onClick={() => setShowTopSheet(false)}>
                    <div style={{
                        margin: '40px auto', maxWidth: 500, borderRadius: 16,
                        background: B.w, overflow: 'hidden',
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ padding: '16px', ...sGrad }}>
                            <div style={{ fontSize: 14, fontWeight: 900, color: B.w, fontFamily: F }}>T20 Assessment Guide</div>
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontFamily: F, marginTop: 2 }}>Context-based coaching for each net</div>
                        </div>
                        <div style={{ padding: '12px' }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: B.nvD, fontFamily: F, marginBottom: 8, padding: '8px 10px', background: B.g50, borderRadius: 8, lineHeight: 1.5 }}>
                                Judge each delivery on TWO axes independently: the BALL quality and the SHOT quality. A great ball can still be hit for six (= high marks for both). A poor ball poorly executed = education opportunity.
                            </div>
                            {NET_LANES.map(lane => (
                                <div key={lane.id} style={{
                                    marginBottom: 8, padding: '10px', borderRadius: 10,
                                    border: `1.5px solid ${lane.color}30`, background: `${lane.color}05`,
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                        <div style={{ width: 3, height: 16, borderRadius: 2, background: lane.color }} />
                                        <div style={{ fontSize: 12, fontWeight: 800, color: lane.color, fontFamily: F }}>
                                            {lane.icon} {lane.net} — {lane.label}
                                        </div>
                                        <div style={{ fontSize: 9, fontWeight: 600, color: B.g400, fontFamily: F }}>{lane.overs}</div>
                                    </div>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: B.nvD, fontFamily: F, marginBottom: 3 }}>{lane.focus}</div>
                                    <div style={{ fontSize: 9, color: B.g600, fontFamily: F, lineHeight: 1.5 }}>{lane.guidance}</div>
                                </div>
                            ))}
                        </div>
                        <div style={{ padding: '12px', borderTop: `1px solid ${B.g200}` }}>
                            <button onClick={() => setShowTopSheet(false)} style={{
                                width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                                background: `linear-gradient(135deg,${B.bl},${B.pk})`,
                                color: B.w, fontSize: 12, fontWeight: 700, fontFamily: F, cursor: 'pointer',
                            }}>Got it — Let's Go</button>
                        </div>
                    </div>
                </div>
            )}

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
                    {!saving && lastSaved && <div style={{ fontSize: 9, color: B.grn, fontFamily: F, fontWeight: 600 }}>✓ Saved</div>}
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
                {TRIAL_ITEMS.map(group => (
                    <div key={group.group} style={{ marginTop: 12 }}>
                        <div style={{
                            fontSize: 10, fontWeight: 800, color: group.color, fontFamily: F,
                            letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4,
                            display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                            <div style={{ width: 3, height: 14, borderRadius: 2, background: group.color }} />
                            {group.group}
                        </div>
                        <div style={{ background: B.w, borderRadius: 10, padding: '2px 12px', border: `1px solid ${B.g200}` }}>
                            {group.items.map(item => (
                                <RatingRow
                                    key={item.key}
                                    item={item}
                                    value={cd[item.key] || 0}
                                    color={group.color}
                                    onRate={v => updateField(item.key, v)}
                                />
                            ))}
                        </div>
                    </div>
                ))}

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
                        BOWLING ARCHETYPE
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
