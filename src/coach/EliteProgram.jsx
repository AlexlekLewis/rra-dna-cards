import { useState, useEffect, useCallback, useRef } from 'react';
import { B, F, sGrad, sCard, _isDesktop, dkWrap, LOGO } from '../data/theme';
import {
    loadPrograms, createProgram, toggleProgramLock,
    loadFacilityZones, loadWeekBlocks, upsertWeekBlock, deleteWeekBlock,
    loadDrills, saveDrill, archiveDrill,
    loadSessions, saveSession, deleteSession,
    loadSessionActivities, saveSessionActivity, deleteSessionActivity, reorderSessionActivities
} from '../db/programDb';

// ═══ PHASE CONSTANTS ═══
const PHASES = [
    { id: 'explore', label: 'Explore', weeks: [1, 2, 3, 4], color: '#10B981', bg: '#10B98118' },
    { id: 'challenge', label: 'Challenge', weeks: [5, 6, 7, 8], color: '#F59E0B', bg: '#F59E0B18' },
    { id: 'execute', label: 'Execute', weeks: [9, 10, 11, 12], color: '#EF4444', bg: '#EF444418' },
];

const DEFAULT_STREAMS = [
    { key: 'batting', label: 'Batting', icon: '🏏', color: B.pk },
    { key: 'fast_bowling', label: 'Fast Bowling', icon: '⚡', color: B.bl },
    { key: 'spin_bowling', label: 'Spin Bowling', icon: '🌀', color: B.prp },
    { key: 'wicket_keeping', label: 'Wicket Keeping', icon: '🧤', color: B.org },
];

const DISCIPLINE_OPTS = [
    'batting', 'fast_bowling', 'spin_bowling', 'wicket_keeping',
    'fielding', 'fitness', 'mental', 'mixed'
];

const CATEGORY_OPTS = [
    { id: 'warm_up', label: 'Warm Up', icon: '🔥' },
    { id: 'skill_drill', label: 'Skill Drill', icon: '🎯' },
    { id: 'game_scenario', label: 'Game Scenario', icon: '🏟️' },
    { id: 'fitness', label: 'Fitness', icon: '💪' },
    { id: 'cool_down', label: 'Cool Down', icon: '🧊' },
    { id: 'meeting', label: 'Meeting/Review', icon: '📋' },
];

const DIFFICULTY_OPTS = [
    { id: 'explore', label: 'Explore', color: '#10B981' },
    { id: 'challenge', label: 'Challenge', color: '#F59E0B' },
    { id: 'execute', label: 'Execute', color: '#EF4444' },
];

export default function EliteProgram({ session, isAdmin, onBack }) {
    // ═══ STATE ═══
    const [tab, setTab] = useState('planner'); // planner | sessions | drills
    const [loading, setLoading] = useState(true);
    const [program, setProgram] = useState(null);
    const [zones, setZones] = useState([]);
    const [weekBlocks, setWeekBlocks] = useState([]);
    const [drills, setDrillsList] = useState([]);
    const [sessions, setSessionsList] = useState([]);
    const [error, setError] = useState('');

    const userId = session?.user?.id;

    // ═══ LOAD INITIAL DATA ═══
    const loadData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [progs, zoneData, drillData] = await Promise.all([
                loadPrograms(),
                loadFacilityZones(),
                loadDrills(),
            ]);
            setZones(zoneData);
            setDrillsList(drillData);

            // Use first program or create Elite
            let prog = progs[0];
            if (!prog) {
                try {
                    prog = await createProgram({
                        name: 'Elite Program',
                        slug: 'elite',
                        season: '2026',
                        start_date: null,
                    }, userId);
                } catch (createErr) {
                    // Likely duplicate slug — refetch
                    const retry = await loadPrograms();
                    prog = retry[0];
                    if (!prog) throw createErr; // genuinely no program
                }
            }
            setProgram(prog);

            // Load program-specific data
            const [blocks, sess] = await Promise.all([
                loadWeekBlocks(prog.id),
                loadSessions(prog.id),
            ]);
            setWeekBlocks(blocks);
            setSessionsList(sess);
        } catch (e) {
            console.error('EliteProgram load error:', e);
            setError(e.message || 'Failed to load program data');
        }
        setLoading(false);
    }, [userId]);

    useEffect(() => { loadData(); }, [loadData]);

    // ═══ LOCK TOGGLE ═══
    const handleToggleLock = async () => {
        if (!program || !isAdmin) return;
        try {
            const updated = await toggleProgramLock(program.id, !program.edit_locked, userId);
            setProgram(updated);
        } catch (e) {
            console.error('Lock toggle error:', e);
        }
    };

    const canEdit = !program?.edit_locked || isAdmin;

    // ═══ TAB STYLES ═══
    const tabBtn = (id) => ({
        flex: 1,
        padding: '10px 8px',
        border: 'none',
        cursor: 'pointer',
        fontFamily: F,
        fontSize: 11,
        fontWeight: tab === id ? 800 : 600,
        letterSpacing: 0.5,
        background: tab === id ? `linear-gradient(135deg, ${B.bl}15, ${B.pk}15)` : 'transparent',
        color: tab === id ? B.nvD : B.g400,
        borderBottom: tab === id ? `2px solid ${B.pk}` : '2px solid transparent',
        transition: 'all 0.2s',
    });

    // ═══ LOADING / ERROR ═══
    if (loading) return (
        <div style={{ minHeight: '100vh', ...sGrad, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <img src={LOGO} alt="" style={{ width: 60, height: 60, objectFit: 'contain', marginBottom: 12, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }} />
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: F, fontWeight: 600 }}>Loading Elite Program...</div>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', fontFamily: F, background: B.g50 }}>
            {/* ═══ HEADER ═══ */}
            <div style={{
                ...sGrad,
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
            }}>
                <button
                    onClick={onBack}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 18, padding: 0, lineHeight: 1 }}
                >←</button>
                <img src={LOGO} alt="" style={{ width: 32, height: 32, objectFit: 'contain' }} />
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: B.w, letterSpacing: 0.5 }}>ELITE PROGRAM</div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: 1 }}>
                        {program?.season || '2026'} SEASON
                    </div>
                </div>
                {isAdmin && (
                    <button
                        onClick={handleToggleLock}
                        style={{
                            padding: '6px 12px',
                            borderRadius: 6,
                            border: `1px solid ${program?.edit_locked ? 'rgba(255,255,255,0.3)' : B.grn}`,
                            background: program?.edit_locked ? 'rgba(255,255,255,0.1)' : `${B.grn}30`,
                            color: program?.edit_locked ? 'rgba(255,255,255,0.7)' : B.grn,
                            fontSize: 10,
                            fontWeight: 700,
                            fontFamily: F,
                            cursor: 'pointer',
                            letterSpacing: 0.3,
                        }}
                    >
                        {program?.edit_locked ? '🔒 Locked' : '✏️ Editing'}
                    </button>
                )}
            </div>

            {/* Lock Banner for non-admin */}
            {program?.edit_locked && !isAdmin && (
                <div style={{
                    padding: '6px 16px',
                    background: '#F59E0B15',
                    borderBottom: `1px solid #F59E0B40`,
                    fontSize: 10,
                    fontWeight: 600,
                    color: '#92400E',
                    fontFamily: F,
                    textAlign: 'center',
                }}>
                    🔒 Program planner is locked — view only mode
                </div>
            )}

            {/* ═══ TAB BAR ═══ */}
            <div style={{ display: 'flex', background: B.w, borderBottom: `1px solid ${B.g200}` }}>
                <button onClick={() => setTab('planner')} style={tabBtn('planner')}>📅 Planner</button>
                <button onClick={() => setTab('sessions')} style={tabBtn('sessions')}>📋 Sessions</button>
                <button onClick={() => setTab('drills')} style={tabBtn('drills')}>📚 Drill Library</button>
            </div>

            {/* Error banner */}
            {error && (
                <div style={{ padding: '8px 16px', background: '#FEE2E2', color: B.red, fontSize: 11, fontFamily: F, fontWeight: 600 }}>
                    ⚠ {error}
                </div>
            )}

            {/* ═══ TAB CONTENT ═══ */}
            <div style={{ padding: _isDesktop ? '16px 24px' : 12, ...(tab === 'drills' ? dkWrap : {}) }}>
                {tab === 'planner' && (
                    <WeekPlannerTab
                        program={program}
                        weekBlocks={weekBlocks}
                        setWeekBlocks={setWeekBlocks}
                        canEdit={canEdit}
                        userId={userId}
                    />
                )}
                {tab === 'sessions' && (
                    <SessionsTab
                        program={program}
                        sessions={sessions}
                        setSessions={setSessionsList}
                        drills={drills}
                        zones={zones}
                        canEdit={canEdit}
                        userId={userId}
                        weekBlocks={weekBlocks}
                    />
                )}
                {tab === 'drills' && (
                    <DrillLibraryTab
                        drills={drills}
                        setDrills={setDrillsList}
                        zones={zones}
                        canEdit={canEdit}
                        userId={userId}
                    />
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════
// WEEK PLANNER TAB
// ═══════════════════════════════════════════════════
function WeekPlannerTab({ program, weekBlocks, setWeekBlocks, canEdit, userId }) {
    const [streams, setStreams] = useState(() => {
        // Derive streams from existing blocks or use defaults
        const existing = [...new Set(weekBlocks.map(b => b.stream))];
        if (existing.length > 0) {
            return existing.map(key => {
                const def = DEFAULT_STREAMS.find(d => d.key === key);
                return def || { key, label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), icon: '📌', color: B.g600 };
            });
        }
        return DEFAULT_STREAMS;
    });
    const [editingCell, setEditingCell] = useState(null); // { stream, week }
    const [editText, setEditText] = useState('');
    const [addStream, setAddStream] = useState(false);
    const [newStreamName, setNewStreamName] = useState('');

    const getBlock = (stream, week) =>
        weekBlocks.find(b => b.stream === stream && b.week_start <= week && b.week_end >= week);

    const getPhase = (week) => PHASES.find(p => p.weeks.includes(week));

    const handleCellClick = (stream, week) => {
        if (!canEdit) return;
        const block = getBlock(stream, week);
        setEditingCell({ stream, week });
        setEditText(block?.theme || '');
    };

    const handleCellSave = async () => {
        if (!editingCell || !program) return;
        const { stream, week } = editingCell;
        const existing = getBlock(stream, week);

        try {
            if (editText.trim()) {
                const saved = await upsertWeekBlock({
                    ...(existing ? { id: existing.id } : {}),
                    program_id: program.id,
                    stream,
                    week_start: existing?.week_start || week,
                    week_end: existing?.week_end || week,
                    theme: editText.trim(),
                    sort_order: streams.findIndex(s => s.key === stream),
                    updated_by: userId,
                });
                setWeekBlocks(prev => {
                    const filtered = prev.filter(b => b.id !== saved.id);
                    return [...filtered, saved];
                });
            } else if (existing) {
                await deleteWeekBlock(existing.id);
                setWeekBlocks(prev => prev.filter(b => b.id !== existing.id));
            }
        } catch (e) {
            console.error('Save block error:', e);
        }
        setEditingCell(null);
        setEditText('');
    };

    const handleAddStream = () => {
        if (!newStreamName.trim()) return;
        const key = newStreamName.trim().toLowerCase().replace(/\s+/g, '_');
        if (streams.find(s => s.key === key)) return;
        setStreams(prev => [...prev, { key, label: newStreamName.trim(), icon: '📌', color: B.g600 }]);
        setNewStreamName('');
        setAddStream(false);
    };

    const handleRemoveStream = (key) => {
        if (!canEdit) return;
        const blocksInStream = weekBlocks.filter(b => b.stream === key);
        if (blocksInStream.length > 0 && !confirm(`Remove "${key}" stream and its ${blocksInStream.length} theme(s)?`)) return;
        setStreams(prev => prev.filter(s => s.key !== key));
        // Note: blocks remain in DB but won't display; could batch-delete here
    };

    const weeks = Array.from({ length: 12 }, (_, i) => i + 1);

    return (
        <div>
            {/* Phase Legend */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                {PHASES.map(p => (
                    <div key={p.id} style={{
                        padding: '4px 10px', borderRadius: 4,
                        background: p.bg, border: `1px solid ${p.color}30`,
                        fontSize: 10, fontWeight: 700, color: p.color, fontFamily: F,
                    }}>
                        {p.label} (Wk {p.weeks[0]}–{p.weeks[p.weeks.length - 1]})
                    </div>
                ))}
            </div>

            {/* Grid */}
            <div style={{ overflowX: 'auto', borderRadius: 12, border: `1px solid ${B.g200}`, background: B.w }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700, fontFamily: F }}>
                    <thead>
                        <tr>
                            <th style={{
                                padding: '8px 10px', fontSize: 9, fontWeight: 700, color: B.g400,
                                textAlign: 'left', borderBottom: `2px solid ${B.g200}`, position: 'sticky', left: 0,
                                background: B.w, zIndex: 2, minWidth: 100,
                            }}>
                                STREAM
                            </th>
                            {weeks.map(w => {
                                const phase = getPhase(w);
                                return (
                                    <th key={w} style={{
                                        padding: '6px 4px', fontSize: 9, fontWeight: 700, textAlign: 'center',
                                        borderBottom: `2px solid ${B.g200}`,
                                        background: phase?.bg || B.w,
                                        color: phase?.color || B.g600,
                                        borderLeft: phase?.weeks[0] === w ? `2px solid ${phase.color}40` : `1px solid ${B.g200}`,
                                        minWidth: 50,
                                    }}>
                                        <div>Wk {w}</div>
                                        {phase?.weeks[0] === w && (
                                            <div style={{ fontSize: 7, fontWeight: 600, marginTop: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                                {phase.label}
                                            </div>
                                        )}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {streams.map((stream, si) => (
                            <tr key={stream.key}>
                                <td style={{
                                    padding: '6px 8px', fontSize: 10, fontWeight: 700, color: stream.color,
                                    borderBottom: `1px solid ${B.g200}`, position: 'sticky', left: 0,
                                    background: B.w, zIndex: 1, whiteSpace: 'nowrap',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <span>{stream.icon}</span>
                                        <span>{stream.label}</span>
                                        {canEdit && streams.length > 1 && (
                                            <button
                                                onClick={() => handleRemoveStream(stream.key)}
                                                style={{ background: 'none', border: 'none', color: B.g400, cursor: 'pointer', fontSize: 10, padding: '0 2px', lineHeight: 1 }}
                                                title="Remove stream"
                                            >✕</button>
                                        )}
                                    </div>
                                </td>
                                {weeks.map(w => {
                                    const block = getBlock(stream.key, w);
                                    const phase = getPhase(w);
                                    const isEditing = editingCell?.stream === stream.key && editingCell?.week === w;

                                    return (
                                        <td
                                            key={w}
                                            onClick={() => !isEditing && handleCellClick(stream.key, w)}
                                            style={{
                                                padding: '4px',
                                                borderBottom: `1px solid ${B.g200}`,
                                                borderLeft: phase?.weeks[0] === w ? `2px solid ${phase.color}40` : `1px solid ${B.g100}`,
                                                background: block?.theme ? `${stream.color}08` : 'transparent',
                                                cursor: canEdit ? 'pointer' : 'default',
                                                verticalAlign: 'top',
                                                minHeight: 36,
                                                position: 'relative',
                                            }}
                                        >
                                            {isEditing ? (
                                                <input
                                                    autoFocus
                                                    value={editText}
                                                    onChange={e => setEditText(e.target.value)}
                                                    onBlur={handleCellSave}
                                                    onKeyDown={e => { if (e.key === 'Enter') handleCellSave(); if (e.key === 'Escape') { setEditingCell(null); setEditText(''); } }}
                                                    style={{
                                                        width: '100%', border: `1px solid ${B.pk}`, borderRadius: 3,
                                                        padding: '3px 4px', fontSize: 9, fontFamily: F, outline: 'none',
                                                        background: `${B.pk}08`, boxSizing: 'border-box',
                                                    }}
                                                />
                                            ) : (
                                                <div style={{
                                                    fontSize: 9, color: block?.theme ? B.nvD : B.g400,
                                                    fontWeight: block?.theme ? 600 : 400, lineHeight: 1.3,
                                                    padding: '2px 4px', minHeight: 20,
                                                }}>
                                                    {block?.theme || (canEdit ? '·' : '')}
                                                </div>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add Stream Button */}
            {canEdit && (
                <div style={{ marginTop: 8 }}>
                    {addStream ? (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <input
                                autoFocus
                                value={newStreamName}
                                onChange={e => setNewStreamName(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleAddStream(); if (e.key === 'Escape') setAddStream(false); }}
                                placeholder="Stream name e.g. Fielding"
                                style={{ padding: '6px 10px', borderRadius: 6, border: `1px solid ${B.g200}`, fontSize: 11, fontFamily: F, flex: 1, outline: 'none' }}
                            />
                            <button onClick={handleAddStream} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: B.bl, color: B.w, fontSize: 10, fontWeight: 700, fontFamily: F, cursor: 'pointer' }}>Add</button>
                            <button onClick={() => setAddStream(false)} style={{ padding: '6px 8px', borderRadius: 6, border: `1px solid ${B.g200}`, background: 'none', fontSize: 10, fontWeight: 600, color: B.g400, fontFamily: F, cursor: 'pointer' }}>Cancel</button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setAddStream(true)}
                            style={{ padding: '6px 12px', borderRadius: 6, border: `1px dashed ${B.g400}`, background: 'none', fontSize: 10, fontWeight: 600, color: B.g400, fontFamily: F, cursor: 'pointer' }}
                        >
                            + Add Stream
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════
// SESSIONS TAB — Lane×Time Grid Builder
// ═══════════════════════════════════════════════════
function SessionsTab({ program, sessions, setSessions, drills, zones, canEdit, userId, weekBlocks }) {
    const [activeSession, setActiveSession] = useState(null);
    const [activities, setActivities] = useState([]);
    const [loadingActs, setLoadingActs] = useState(false);
    const [selectedAct, setSelectedAct] = useState(null);
    const weeks = Array.from({ length: 12 }, (_, i) => i + 1);

    // ═══ DRAG STATE ═══
    const gridRef = useRef(null);
    const [drag, setDrag] = useState(null); // { actId, mode:'move'|'resize', origAct, startY, startX }
    const [dragPreview, setDragPreview] = useState(null); // { start_time_mins, duration_mins, zoneCol }

    const getSessionsForWeek = (w) => sessions.filter(s => s.week_number === w);
    const getPhase = (week) => PHASES.find(p => p.weeks.includes(week));

    const handleCreateSession = async (weekNumber) => {
        if (!canEdit || !program) return;
        const existing = getSessionsForWeek(weekNumber);
        const nextNum = existing.length + 1;
        try {
            const saved = await saveSession({
                program_id: program.id,
                week_number: weekNumber,
                session_number: nextNum,
                title: `Wk ${weekNumber} — Session ${nextNum}`,
                total_duration_mins: 120,
            }, userId);
            setSessions(prev => [...prev, saved]);
        } catch (e) {
            console.error('Create session error:', e);
        }
    };

    const openSession = async (s) => {
        setActiveSession(s);
        setLoadingActs(true);
        try {
            const acts = await loadSessionActivities(s.id);
            setActivities(acts);
        } catch (e) {
            console.error('Load activities error:', e);
        }
        setLoadingActs(false);
    };

    // ═══ DRAG EFFECT (must be before conditional returns) ═══
    const dragRef = useRef({ drag: null, dragPreview: null, zones, gridRef, PX_PER_MIN: 4.5, TIME_COL_W: 50, totalMins: 120 });
    // Update ref on each render so the effect closures always read the latest values
    dragRef.current = {
        drag, dragPreview, zones, gridRef,
        PX_PER_MIN: _isDesktop ? 4.5 : 3,
        TIME_COL_W: _isDesktop ? 50 : 40,
        totalMins: activeSession?.total_duration_mins || 120,
        displayZones: zones,
    };

    useEffect(() => {
        if (!drag) return;

        const snapTo = (val, snap) => Math.round(val / snap) * snap;
        const SNAP_MINS = 5;

        const getGridCoords = (e) => {
            const ref = dragRef.current;
            if (!ref.gridRef.current) return { mins: 0, zoneIdx: 0 };
            const rect = ref.gridRef.current.getBoundingClientRect();
            const y = e.clientY - rect.top;
            const x = e.clientX - rect.left - ref.TIME_COL_W;
            const mins = snapTo(Math.max(0, y / ref.PX_PER_MIN), SNAP_MINS);

            // Calculate display zones based on activities
            const actZoneIds = new Set();
            activities.forEach(a => (a.zone_ids || []).forEach(z => actZoneIds.add(z)));
            const dZones = zones.filter(z => activities.length === 0 || actZoneIds.has(z.id));
            const zoneWidth = (rect.width - ref.TIME_COL_W) / dZones.length;
            const zoneIdx = Math.max(0, Math.min(dZones.length - 1, Math.floor(x / zoneWidth)));
            return { mins, zoneIdx, displayZones: dZones };
        };

        const handleMove = (e) => {
            const ref = dragRef.current;
            const d = ref.drag;
            if (!d) return;
            const { mins, zoneIdx, displayZones: dZones } = getGridCoords(e);
            const act = d.origAct;

            if (d.mode === 'move') {
                const deltaMins = mins - d.startMins;
                const newStart = Math.max(0, Math.min(ref.totalMins - (act.duration_mins || 15), snapTo((act.start_time_mins || 0) + deltaMins, SNAP_MINS)));

                const origZones = act.zone_ids || [];
                const origIndices = origZones.map(z => dZones.findIndex(dz => dz.id === z)).filter(i => i >= 0).sort((a, b) => a - b);
                if (origIndices.length === 0) return;
                const origMinCol = origIndices[0];
                const span = origIndices[origIndices.length - 1] - origMinCol + 1;
                const deltaCol = zoneIdx - d.startZoneIdx;
                const newMinCol = Math.max(0, Math.min(dZones.length - span, origMinCol + deltaCol));
                const newZoneIds = Array.from({ length: span }, (_, i) => dZones[newMinCol + i]?.id).filter(Boolean);

                setDragPreview({ start_time_mins: newStart, duration_mins: act.duration_mins || 15, zone_ids: newZoneIds });
            } else if (d.mode === 'resize') {
                const startTime = act.start_time_mins || 0;
                const newDuration = Math.max(5, snapTo(mins - startTime, SNAP_MINS));
                setDragPreview({ start_time_mins: startTime, duration_mins: newDuration, zone_ids: act.zone_ids || [] });
            } else if (d.mode === 'resize_right') {
                // Expand/shrink right edge across zones
                const origZones = act.zone_ids || [];
                const origIndices = origZones.map(z => dZones.findIndex(dz => dz.id === z)).filter(i => i >= 0).sort((a, b) => a - b);
                if (origIndices.length === 0) return;
                const origMinCol = origIndices[0];
                const newMaxCol = Math.max(origMinCol, Math.min(dZones.length - 1, zoneIdx));
                const newZoneIds = Array.from({ length: newMaxCol - origMinCol + 1 }, (_, i) => dZones[origMinCol + i]?.id).filter(Boolean);
                setDragPreview({ start_time_mins: act.start_time_mins || 0, duration_mins: act.duration_mins || 15, zone_ids: newZoneIds });
            } else if (d.mode === 'resize_left') {
                // Expand/shrink left edge across zones
                const origZones = act.zone_ids || [];
                const origIndices = origZones.map(z => dZones.findIndex(dz => dz.id === z)).filter(i => i >= 0).sort((a, b) => a - b);
                if (origIndices.length === 0) return;
                const origMaxCol = origIndices[origIndices.length - 1];
                const newMinCol = Math.max(0, Math.min(origMaxCol, zoneIdx));
                const newZoneIds = Array.from({ length: origMaxCol - newMinCol + 1 }, (_, i) => dZones[newMinCol + i]?.id).filter(Boolean);
                setDragPreview({ start_time_mins: act.start_time_mins || 0, duration_mins: act.duration_mins || 15, zone_ids: newZoneIds });
            }
        };

        const handleUp = async () => {
            const ref = dragRef.current;
            const d = ref.drag;
            const dp = ref.dragPreview;
            if (!d || !dp) { setDrag(null); setDragPreview(null); return; }
            const act = d.origAct;
            const update = {
                id: act.id,
                start_time_mins: dp.start_time_mins,
                duration_mins: dp.duration_mins,
                zone_ids: dp.zone_ids,
            };

            const changed = update.start_time_mins !== (act.start_time_mins || 0) ||
                update.duration_mins !== (act.duration_mins || 15) ||
                JSON.stringify(update.zone_ids) !== JSON.stringify(act.zone_ids || []);

            if (changed) {
                try {
                    await saveSessionActivity(update);
                    setActivities(prev => prev.map(a => a.id === act.id ? { ...a, ...update } : a));
                } catch (err) {
                    console.error('Drag save error:', err);
                }
            }
            setDrag(null);
            setDragPreview(null);
        };

        window.addEventListener('pointermove', handleMove);
        window.addEventListener('pointerup', handleUp);
        return () => {
            window.removeEventListener('pointermove', handleMove);
            window.removeEventListener('pointerup', handleUp);
        };
    }, [drag]); // Only re-attach when drag starts/ends

    // ═══ SESSION LIST VIEW ═══
    if (!activeSession) return (
        <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: B.nvD, fontFamily: F, marginBottom: 12 }}>
                Session Plans
            </div>
            {weeks.map(w => {
                const phase = getPhase(w);
                const wSessions = getSessionsForWeek(w);
                const wThemes = weekBlocks.filter(b => b.week_start <= w && b.week_end >= w);
                return (
                    <div key={w} style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, padding: '4px 8px', borderRadius: 6, background: phase?.bg }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: phase?.color, fontFamily: F }}>Week {w}</div>
                            <div style={{ fontSize: 9, fontWeight: 600, color: phase?.color, fontFamily: F, opacity: 0.7, textTransform: 'uppercase' }}>{phase?.label}</div>
                            {wThemes.length > 0 && (
                                <div style={{ fontSize: 8, color: B.g400, fontFamily: F, flex: 1, textAlign: 'right' }}>
                                    {wThemes.map(t => t.theme).filter(Boolean).join(' · ')}
                                </div>
                            )}
                        </div>
                        {wSessions.map(s => (
                            <div key={s.id} onClick={() => openSession(s)} style={{
                                ...sCard, padding: 12, borderLeft: `3px solid ${phase?.color || B.bl}`,
                                cursor: 'pointer', transition: 'all 0.15s',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: B.nvD, fontFamily: F }}>{s.title}</div>
                                        <div style={{ fontSize: 10, color: B.g400, fontFamily: F, marginTop: 1 }}>
                                            {s.session_date || 'Date TBD'} · {s.total_duration_mins || 120} min
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <div style={{
                                            padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700,
                                            background: s.objectives ? `${B.grn}15` : `${B.g400}10`,
                                            color: s.objectives ? B.grn : B.g400, fontFamily: F,
                                        }}>{s.objectives ? '✓ Planned' : 'Draft'}</div>
                                        <span style={{ fontSize: 14, color: B.g400 }}>▸</span>
                                    </div>
                                </div>
                                {s.objectives && (
                                    <div style={{ fontSize: 9, color: B.g600, fontFamily: F, marginTop: 4, lineHeight: 1.4, fontStyle: 'italic' }}>{s.objectives}</div>
                                )}
                            </div>
                        ))}
                        {canEdit && (
                            <button onClick={() => handleCreateSession(w)} style={{
                                width: '100%', padding: '6px', borderRadius: 6,
                                border: `1px dashed ${B.g400}40`, background: 'none',
                                fontSize: 9, fontWeight: 600, color: B.g400, fontFamily: F, cursor: 'pointer',
                            }}>+ Add Session</button>
                        )}
                    </div>
                );
            })}
        </div>
    );

    // ═══ SESSION DETAIL — Lane×Time Grid ═══
    const session = activeSession;
    const phase = getPhase(session.week_number);
    const totalMins = session.total_duration_mins || 120;
    const PX_PER_MIN = _isDesktop ? 4.5 : 3;
    const TIME_COL_W = _isDesktop ? 50 : 40;

    // Build time slots (every 5 mins)
    const timeSlots = [];
    for (let m = 0; m <= totalMins; m += 5) timeSlots.push(m);

    // Zone columns
    const activeZoneIds = new Set();
    activities.forEach(a => (a.zone_ids || []).forEach(z => activeZoneIds.add(z)));
    const displayZones = zones.filter(z => activities.length === 0 || activeZoneIds.has(z.id));

    const handleDragStart = (e, act, mode = 'move') => {
        if (!canEdit) return;
        e.preventDefault();
        e.stopPropagation();
        if (!gridRef.current) return;
        const rect = gridRef.current.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const x = e.clientX - rect.left - TIME_COL_W;
        const snapTo = (val, snap) => Math.round(val / snap) * snap;
        const mins = snapTo(Math.max(0, y / PX_PER_MIN), 5);
        const zoneWidth = (rect.width - TIME_COL_W) / displayZones.length;
        const zoneIdx = Math.max(0, Math.min(displayZones.length - 1, Math.floor(x / zoneWidth)));
        setDrag({ actId: act.id, mode, origAct: { ...act }, startMins: mins, startZoneIdx: zoneIdx });
        setDragPreview({
            start_time_mins: act.start_time_mins || 0,
            duration_mins: act.duration_mins || 15,
            zone_ids: act.zone_ids || [],
        });
        setSelectedAct(null);
    };
    // Zone colour palette
    const ZONE_COLORS = {
        machine: { bg: '#0075C920', border: '#0075C960', text: B.bl },
        lane: { bg: '#10B98120', border: '#10B98160', text: '#059669' },
        run_up: { bg: '#F59E0B20', border: '#F59E0B60', text: '#D97706' },
        meeting: { bg: '#8B5CF620', border: '#8B5CF660', text: '#7C3AED' },
    };

    // Discipline colours for activity tiles
    const DISC_COLORS = {
        batting: { bg: '#E96BB030', border: '#E96BB0', text: '#C2185B' },
        fast_bowling: { bg: '#0075C930', border: '#0075C9', text: '#0056B3' },
        spin_bowling: { bg: '#8B5CF630', border: '#8B5CF6', text: '#6D28D9' },
        wicket_keeping: { bg: '#FF6B3530', border: '#FF6B35', text: '#E55A2B' },
        fielding: { bg: '#10B98130', border: '#10B981', text: '#059669' },
        mixed: { bg: '#323E4820', border: '#323E48', text: '#323E48' },
        fitness: { bg: '#F59E0B30', border: '#F59E0B', text: '#B45309' },
        mental: { bg: '#06B6D430', border: '#06B6D4', text: '#0891B2' },
    };

    const getDrillInfo = (act) => {
        if (act.drill_id && act.drills) return act.drills;
        if (act.drill_id) return drills.find(d => d.id === act.drill_id);
        return null;
    };

    const getActName = (act) => act.custom_name || getDrillInfo(act)?.short_name || getDrillInfo(act)?.name || 'Activity';
    const getActDisc = (act) => getDrillInfo(act)?.discipline || 'mixed';
    const getActCat = (act) => getDrillInfo(act)?.category || 'skill_drill';

    // Map zone id → column index
    const zoneIndexMap = {};
    displayZones.forEach((z, i) => { zoneIndexMap[z.id] = i; });

    // Format time
    const fmtTime = (mins) => {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return h > 0 ? `${h}:${String(m).padStart(2, '0')}` : `${m}m`;
    };

    // Assign badge
    const assignBadge = (act) => {
        if (act.assign_type === 'all') return '👥 All';
        if (act.assign_type === 'skill') return `🏏 ${(act.assign_skill_roles || []).map(r => r.replace(/_/g, ' ')).join(', ')}`;
        if (act.assign_type === 'squad') return '🏉 Squad';
        if (act.assign_type === 'individual') return '👤 Individual';
        return '';
    };

    return (
        <div>
            {/* ═══ SESSION HEADER ═══ */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <button onClick={() => { setActiveSession(null); setActivities([]); setSelectedAct(null); }}
                    style={{ background: 'none', border: 'none', color: B.bl, cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: F, padding: 0 }}>
                    ← Back
                </button>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: B.nvD, fontFamily: F }}>{session.title}</div>
                    <div style={{ fontSize: 10, color: B.g400, fontFamily: F }}>
                        {session.session_date || 'Date TBD'} · {totalMins} min · <span style={{ color: phase?.color, fontWeight: 700 }}>{phase?.label}</span>
                    </div>
                </div>
            </div>

            {/* Objectives */}
            {session.objectives && (
                <div style={{ ...sCard, padding: 10, marginBottom: 12, borderLeft: `3px solid ${phase?.color}` }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: phase?.color, fontFamily: F, marginBottom: 2 }}>SESSION OBJECTIVES</div>
                    <div style={{ fontSize: 10, color: B.g600, fontFamily: F, lineHeight: 1.4 }}>{session.objectives}</div>
                </div>
            )}

            {loadingActs ? (
                <div style={{ textAlign: 'center', padding: 24, color: B.g400, fontSize: 11, fontFamily: F }}>Loading activities...</div>
            ) : activities.length === 0 ? (
                <div style={{ ...sCard, textAlign: 'center', padding: 32 }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>📋</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: B.g400, fontFamily: F }}>No activities yet</div>
                    <div style={{ fontSize: 10, color: B.g400, fontFamily: F, marginTop: 4 }}>
                        Head to the Drill Library to create drills, then drag them into sessions
                    </div>
                </div>
            ) : (
                <>
                    {/* ═══ LANE×TIME GRID ═══ */}
                    <div style={{ overflowX: 'auto', borderRadius: 12, border: `1px solid ${B.g200}`, background: B.w }}>
                        <div style={{ position: 'relative', minWidth: displayZones.length * 120 + TIME_COL_W + 20 }}>
                            {/* Zone Header Row */}
                            <div style={{ display: 'flex', borderBottom: `2px solid ${B.g200}`, position: 'sticky', top: 0, background: B.w, zIndex: 10 }}>
                                <div style={{ width: TIME_COL_W, flexShrink: 0, padding: '6px 4px', fontSize: 8, fontWeight: 700, color: B.g400, fontFamily: F, textAlign: 'center', borderRight: `1px solid ${B.g200}` }}>
                                    TIME
                                </div>
                                {displayZones.map(z => {
                                    const zc = ZONE_COLORS[z.zone_type] || ZONE_COLORS.lane;
                                    return (
                                        <div key={z.id} style={{
                                            flex: 1, minWidth: _isDesktop ? 130 : 110, padding: '8px 10px', textAlign: 'center',
                                            background: zc.bg, borderRight: `1px solid ${B.g200}`,
                                        }}>
                                            <div style={{ fontSize: _isDesktop ? 11 : 9, fontWeight: 800, color: zc.text, fontFamily: F }}>{z.name}</div>
                                            <div style={{ fontSize: _isDesktop ? 8 : 7, color: zc.text, fontFamily: F, opacity: 0.6 }}>
                                                {z.zone_type.replace(/_/g, ' ')} · {z.capacity} max
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Grid Body — relative positioning for tiles */}
                            <div ref={gridRef} style={{ position: 'relative', height: totalMins * PX_PER_MIN, cursor: drag ? 'grabbing' : 'default', userSelect: drag ? 'none' : 'auto' }}>
                                {/* Time gridlines */}
                                {timeSlots.map(m => (
                                    <div key={m} style={{
                                        position: 'absolute', top: m * PX_PER_MIN, left: 0, right: 0,
                                        display: 'flex', borderTop: m % 15 === 0 ? `1px solid ${B.g200}` : `1px solid ${B.g100}40`,
                                    }}>
                                        <div style={{
                                            width: TIME_COL_W, flexShrink: 0, fontSize: 7, color: m % 15 === 0 ? B.g600 : B.g400,
                                            fontWeight: m % 15 === 0 ? 700 : 400, fontFamily: F,
                                            padding: '1px 4px', textAlign: 'right', borderRight: `1px solid ${B.g200}`,
                                        }}>
                                            {m % 15 === 0 ? fmtTime(m) : ''}
                                        </div>
                                    </div>
                                ))}

                                {/* Zone column dividers */}
                                {displayZones.map((z, i) => (
                                    <div key={`col-${z.id}`} style={{
                                        position: 'absolute', top: 0, bottom: 0,
                                        left: TIME_COL_W + (i + 1) * (100 / displayZones.length) + '%',
                                        borderRight: `1px solid ${B.g100}`,
                                        pointerEvents: 'none',
                                    }} />
                                ))}

                                {/* ═══ ACTIVITY TILES ═══ */}
                                {activities.map(act => {
                                    const isDragging = drag?.actId === act.id;
                                    const displayAct = isDragging && dragPreview ? { ...act, start_time_mins: dragPreview.start_time_mins, duration_mins: dragPreview.duration_mins, zone_ids: dragPreview.zone_ids } : act;

                                    const actZones = (displayAct.zone_ids || []).filter(z => zoneIndexMap[z] !== undefined);
                                    if (actZones.length === 0) return null;

                                    const colIndices = actZones.map(z => zoneIndexMap[z]).sort((a, b) => a - b);
                                    const minCol = colIndices[0];
                                    const maxCol = colIndices[colIndices.length - 1];
                                    const spanCols = maxCol - minCol + 1;

                                    const disc = getActDisc(act);
                                    const dc = DISC_COLORS[disc] || DISC_COLORS.mixed;
                                    const isSelected = selectedAct?.id === act.id;

                                    const colW = 100 / displayZones.length;
                                    const leftPct = (minCol * colW);
                                    const widthPct = (spanCols * colW);
                                    const tileH = Math.max((displayAct.duration_mins || 15) * PX_PER_MIN - 2, 16);

                                    return (
                                        <div
                                            key={act.id}
                                            onPointerDown={(e) => handleDragStart(e, act, 'move')}
                                            onClick={() => !drag && setSelectedAct(isSelected ? null : act)}
                                            style={{
                                                position: 'absolute',
                                                top: (displayAct.start_time_mins || 0) * PX_PER_MIN,
                                                height: tileH,
                                                left: `calc(${TIME_COL_W}px + ${leftPct}%)`,
                                                width: `calc(${widthPct}% - 4px)`,
                                                marginLeft: 2,
                                                background: dc.bg,
                                                border: `1.5px solid ${dc.border}`,
                                                borderRadius: 6,
                                                padding: '3px 6px',
                                                cursor: canEdit ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
                                                overflow: 'hidden',
                                                zIndex: isDragging ? 20 : isSelected ? 5 : 2,
                                                boxShadow: isDragging ? `0 4px 16px ${dc.border}80` : isSelected ? `0 2px 8px ${dc.border}60` : 'none',
                                                opacity: isDragging ? 0.85 : 1,
                                                transition: isDragging ? 'none' : 'box-shadow 0.15s',
                                                touchAction: 'none',
                                            }}
                                        >
                                            {/* Time badge — always visible */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 }}>
                                                <div style={{ fontSize: _isDesktop ? 10 : 8, fontWeight: 800, color: dc.text, fontFamily: F, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                                                    {getActName(act)}
                                                </div>
                                                <div style={{ fontSize: _isDesktop ? 8 : 6, fontWeight: 700, color: dc.text, fontFamily: F, opacity: 0.8, whiteSpace: 'nowrap', background: `${dc.border}18`, padding: '1px 4px', borderRadius: 3, flexShrink: 0 }}>
                                                    {fmtTime(displayAct.start_time_mins || 0)}→{fmtTime((displayAct.start_time_mins || 0) + (displayAct.duration_mins || 0))}
                                                </div>
                                            </div>
                                            {(displayAct.duration_mins || 0) >= 15 && (
                                                <div style={{ fontSize: _isDesktop ? 9 : 7, color: dc.text, fontFamily: F, opacity: 0.7, marginTop: 1 }}>
                                                    {displayAct.duration_mins}m · {assignBadge(act)}
                                                </div>
                                            )}
                                            {(displayAct.duration_mins || 0) >= 20 && act.coaching_notes && (
                                                <div style={{ fontSize: _isDesktop ? 9 : 7, color: dc.text, fontFamily: F, opacity: 0.6, marginTop: 2, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: _isDesktop ? 3 : 2, WebkitBoxOrient: 'vertical' }}>
                                                    {act.coaching_notes}
                                                </div>
                                            )}
                                            {/* Resize handles */}
                                            {canEdit && (
                                                <>
                                                    {/* Bottom edge — resize duration */}
                                                    <div
                                                        onPointerDown={(e) => { e.stopPropagation(); handleDragStart(e, act, 'resize'); }}
                                                        style={{
                                                            position: 'absolute', bottom: 0, left: 6, right: 6, height: 6,
                                                            cursor: 'ns-resize', borderRadius: '0 0 4px 4px',
                                                            background: isDragging && drag?.mode === 'resize' ? `${dc.border}40` : 'transparent',
                                                        }}
                                                    />
                                                    {/* Right edge — expand/shrink lanes right */}
                                                    <div
                                                        onPointerDown={(e) => { e.stopPropagation(); handleDragStart(e, act, 'resize_right'); }}
                                                        style={{
                                                            position: 'absolute', top: 6, bottom: 6, right: 0, width: 6,
                                                            cursor: 'ew-resize', borderRadius: '0 4px 4px 0',
                                                            background: isDragging && drag?.mode === 'resize_right' ? `${dc.border}40` : 'transparent',
                                                        }}
                                                    />
                                                    {/* Left edge — expand/shrink lanes left */}
                                                    <div
                                                        onPointerDown={(e) => { e.stopPropagation(); handleDragStart(e, act, 'resize_left'); }}
                                                        style={{
                                                            position: 'absolute', top: 6, bottom: 6, left: 0, width: 6,
                                                            cursor: 'ew-resize', borderRadius: '4px 0 0 4px',
                                                            background: isDragging && drag?.mode === 'resize_left' ? `${dc.border}40` : 'transparent',
                                                        }}
                                                    />
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* ═══ SELECTED ACTIVITY DETAIL ═══ */}
                    {selectedAct && (() => {
                        const drill = getDrillInfo(selectedAct);
                        const disc = getActDisc(selectedAct);
                        const dc = DISC_COLORS[disc] || DISC_COLORS.mixed;
                        const cat = CATEGORY_OPTS.find(c => c.id === (drill?.category || getActCat(selectedAct)));
                        const diff = DIFFICULTY_OPTS.find(d => d.id === (drill?.difficulty));
                        const actZones = (selectedAct.zone_ids || []).map(zId => zones.find(z => z.id === zId)).filter(Boolean);

                        return (
                            <div style={{ ...sCard, padding: 14, marginTop: 12, borderLeft: `4px solid ${dc.border}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 800, color: dc.text, fontFamily: F }}>{getActName(selectedAct)}</div>
                                        <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                                            <span style={{ padding: '2px 6px', borderRadius: 3, fontSize: 8, fontWeight: 700, background: dc.bg, color: dc.text, fontFamily: F }}>
                                                {disc.replace(/_/g, ' ')}
                                            </span>
                                            {cat && <span style={{ padding: '2px 6px', borderRadius: 3, fontSize: 8, fontWeight: 600, background: B.g100, color: B.g600, fontFamily: F }}>{cat.icon} {cat.label}</span>}
                                            {diff && <span style={{ padding: '2px 6px', borderRadius: 3, fontSize: 8, fontWeight: 700, background: `${diff.color}15`, color: diff.color, fontFamily: F }}>{diff.label}</span>}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: 10, fontWeight: 700, color: B.nvD, fontFamily: F }}>
                                            {fmtTime(selectedAct.start_time_mins || 0)} → {fmtTime((selectedAct.start_time_mins || 0) + (selectedAct.duration_mins || 0))}
                                        </div>
                                        <div style={{ fontSize: 9, color: B.g400, fontFamily: F }}>{selectedAct.duration_mins} min</div>
                                    </div>
                                </div>

                                {/* Zones */}
                                <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                                    {actZones.map(z => (
                                        <span key={z.id} style={{
                                            padding: '2px 6px', borderRadius: 3, fontSize: 8, fontWeight: 600, fontFamily: F,
                                            background: ZONE_COLORS[z.zone_type]?.bg, color: ZONE_COLORS[z.zone_type]?.text,
                                            border: `1px solid ${ZONE_COLORS[z.zone_type]?.border}`,
                                        }}>📍 {z.name}</span>
                                    ))}
                                </div>

                                {/* Assignment */}
                                <div style={{ marginTop: 6, fontSize: 9, fontWeight: 600, color: B.g600, fontFamily: F }}>
                                    {assignBadge(selectedAct)}
                                </div>

                                {/* Coaching Notes */}
                                {selectedAct.coaching_notes && (
                                    <div style={{ marginTop: 8, padding: '6px 8px', background: `${B.pk}08`, borderRadius: 6 }}>
                                        <div style={{ fontSize: 9, fontWeight: 700, color: B.pk, fontFamily: F, marginBottom: 2 }}>🎯 SESSION COACHING NOTES</div>
                                        <div style={{ fontSize: 10, color: B.nvD, fontFamily: F, lineHeight: 1.4 }}>{selectedAct.coaching_notes}</div>
                                    </div>
                                )}

                                {/* Drill Details (from library) */}
                                {drill && (
                                    <>
                                        {drill.coaching_cues && (
                                            <div style={{ marginTop: 8, padding: '6px 8px', background: `${dc.border}10`, borderRadius: 6 }}>
                                                <div style={{ fontSize: 9, fontWeight: 700, color: dc.text, fontFamily: F, marginBottom: 2 }}>🎯 DRILL COACHING CUES</div>
                                                <div style={{ fontSize: 10, color: B.nvD, fontFamily: F, lineHeight: 1.4 }}>{drill.coaching_cues}</div>
                                            </div>
                                        )}
                                        {drill.setup_instructions && (
                                            <div style={{ marginTop: 6 }}>
                                                <div style={{ fontSize: 9, fontWeight: 700, color: B.g400, fontFamily: F, marginBottom: 2 }}>SETUP</div>
                                                <div style={{ fontSize: 10, color: B.g600, fontFamily: F, lineHeight: 1.4 }}>{drill.setup_instructions}</div>
                                            </div>
                                        )}
                                        {drill.success_criteria && (
                                            <div style={{ marginTop: 6 }}>
                                                <div style={{ fontSize: 9, fontWeight: 700, color: B.grn, fontFamily: F, marginBottom: 2 }}>✓ SUCCESS CRITERIA</div>
                                                <div style={{ fontSize: 10, color: B.g600, fontFamily: F, lineHeight: 1.4 }}>{drill.success_criteria}</div>
                                            </div>
                                        )}
                                        {drill.equipment?.length > 0 && (
                                            <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: 9, fontWeight: 700, color: B.g400, fontFamily: F }}>🔧</span>
                                                {drill.equipment.map((e, i) => (
                                                    <span key={i} style={{ padding: '2px 6px', borderRadius: 3, fontSize: 8, background: B.g100, color: B.g600, fontFamily: F }}>{e}</span>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}

                                <button onClick={() => setSelectedAct(null)} style={{
                                    marginTop: 10, padding: '5px 10px', borderRadius: 4,
                                    border: `1px solid ${B.g200}`, background: 'none',
                                    fontSize: 9, fontWeight: 600, color: B.g400, fontFamily: F, cursor: 'pointer',
                                }}>Close</button>
                            </div>
                        );
                    })()}

                    {/* Equipment Summary */}
                    {(() => {
                        const allEquip = {};
                        activities.forEach(act => {
                            const drill = getDrillInfo(act);
                            (drill?.equipment || []).forEach(e => { allEquip[e] = true; });
                        });
                        const equipList = Object.keys(allEquip);
                        if (equipList.length === 0) return null;
                        return (
                            <div style={{ ...sCard, padding: 10, marginTop: 12 }}>
                                <div style={{ fontSize: 9, fontWeight: 700, color: B.g400, fontFamily: F, marginBottom: 4 }}>🔧 SESSION EQUIPMENT (auto-aggregated)</div>
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                    {equipList.map((e, i) => (
                                        <span key={i} style={{ padding: '2px 8px', borderRadius: 4, fontSize: 9, background: B.g100, color: B.g600, fontFamily: F, fontWeight: 600 }}>{e}</span>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Session Notes */}
                    {session.notes && (
                        <div style={{ ...sCard, padding: 10, marginTop: 8 }}>
                            <div style={{ fontSize: 9, fontWeight: 700, color: B.g400, fontFamily: F, marginBottom: 2 }}>📝 SESSION NOTES</div>
                            <div style={{ fontSize: 10, color: B.g600, fontFamily: F, lineHeight: 1.4 }}>{session.notes}</div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════
// DRILL LIBRARY TAB
// ═══════════════════════════════════════════════════
function DrillLibraryTab({ drills, setDrills, zones, canEdit, userId }) {
    const [filter, setFilter] = useState({ discipline: '', category: '', difficulty: '', search: '' });
    const [showCreate, setShowCreate] = useState(false);
    const [editDrill, setEditDrill] = useState(null);
    const [expandedId, setExpandedId] = useState(null);

    const filtered = drills.filter(d => {
        if (filter.discipline && d.discipline !== filter.discipline) return false;
        if (filter.category && d.category !== filter.category) return false;
        if (filter.difficulty && d.difficulty !== filter.difficulty) return false;
        if (filter.search) {
            const s = filter.search.toLowerCase();
            return d.name?.toLowerCase().includes(s) ||
                d.description?.toLowerCase().includes(s) ||
                d.tags?.some(t => t.toLowerCase().includes(s));
        }
        return true;
    });

    const handleSave = async (drill) => {
        try {
            const saved = await saveDrill(drill, userId);
            setDrills(prev => {
                const idx = prev.findIndex(d => d.id === saved.id);
                if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next; }
                return [...prev, saved];
            });
            setShowCreate(false);
            setEditDrill(null);
        } catch (e) {
            console.error('Save drill error:', e);
        }
    };

    const handleArchive = async (id) => {
        if (!confirm('Archive this drill?')) return;
        try {
            await archiveDrill(id);
            setDrills(prev => prev.filter(d => d.id !== id));
        } catch (e) {
            console.error('Archive drill error:', e);
        }
    };

    const catInfo = (catId) => CATEGORY_OPTS.find(c => c.id === catId) || { label: catId, icon: '📌' };
    const diffInfo = (diffId) => DIFFICULTY_OPTS.find(d => d.id === diffId) || { label: diffId, color: B.g400 };

    return (
        <div>
            {/* Filter Bar */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                    value={filter.search}
                    onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
                    placeholder="🔍 Search drills..."
                    style={{ flex: 1, minWidth: 140, padding: '8px 10px', borderRadius: 8, border: `1px solid ${B.g200}`, fontSize: 11, fontFamily: F, outline: 'none' }}
                />
                <select
                    value={filter.discipline}
                    onChange={e => setFilter(f => ({ ...f, discipline: e.target.value }))}
                    style={{ padding: '8px 6px', borderRadius: 6, border: `1px solid ${B.g200}`, fontSize: 10, fontFamily: F, background: B.w }}
                >
                    <option value="">All Disciplines</option>
                    {DISCIPLINE_OPTS.map(d => <option key={d} value={d}>{d.replace(/_/g, ' ')}</option>)}
                </select>
                <select
                    value={filter.category}
                    onChange={e => setFilter(f => ({ ...f, category: e.target.value }))}
                    style={{ padding: '8px 6px', borderRadius: 6, border: `1px solid ${B.g200}`, fontSize: 10, fontFamily: F, background: B.w }}
                >
                    <option value="">All Categories</option>
                    {CATEGORY_OPTS.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                </select>
                <select
                    value={filter.difficulty}
                    onChange={e => setFilter(f => ({ ...f, difficulty: e.target.value }))}
                    style={{ padding: '8px 6px', borderRadius: 6, border: `1px solid ${B.g200}`, fontSize: 10, fontFamily: F, background: B.w }}
                >
                    <option value="">All Levels</option>
                    {DIFFICULTY_OPTS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                </select>
            </div>

            {/* Create Button */}
            {canEdit && !showCreate && !editDrill && (
                <button
                    onClick={() => setShowCreate(true)}
                    style={{
                        width: '100%', padding: '10px', borderRadius: 8, border: 'none', marginBottom: 12,
                        background: `linear-gradient(135deg,${B.bl},${B.pk})`, color: B.w,
                        fontSize: 12, fontWeight: 700, fontFamily: F, cursor: 'pointer', letterSpacing: 0.3,
                    }}
                >
                    + Create New Drill
                </button>
            )}

            {/* Create/Edit Form */}
            {(showCreate || editDrill) && (
                <DrillForm
                    drill={editDrill}
                    zones={zones}
                    onSave={handleSave}
                    onCancel={() => { setShowCreate(false); setEditDrill(null); }}
                />
            )}

            {/* Drill Cards */}
            <div style={{ fontSize: 10, color: B.g400, fontFamily: F, marginBottom: 8 }}>
                {filtered.length} drill{filtered.length !== 1 ? 's' : ''} found
            </div>
            {filtered.map(d => {
                const cat = catInfo(d.category);
                const diff = diffInfo(d.difficulty);
                const isExpanded = expandedId === d.id;

                return (
                    <div
                        key={d.id}
                        style={{
                            ...sCard,
                            borderLeft: `3px solid ${diff.color}`,
                            cursor: 'pointer',
                            transition: 'box-shadow 0.15s',
                        }}
                        onClick={() => setExpandedId(isExpanded ? null : d.id)}
                    >
                        {/* Card Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: B.nvD, fontFamily: F }}>{d.name}</div>
                                <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
                                    <span style={{ padding: '1px 6px', borderRadius: 3, fontSize: 8, fontWeight: 700, background: `${diff.color}15`, color: diff.color, fontFamily: F }}>
                                        {diff.label}
                                    </span>
                                    <span style={{ padding: '1px 6px', borderRadius: 3, fontSize: 8, fontWeight: 600, background: B.g100, color: B.g600, fontFamily: F }}>
                                        {cat.icon} {cat.label}
                                    </span>
                                    <span style={{ padding: '1px 6px', borderRadius: 3, fontSize: 8, fontWeight: 600, background: B.g100, color: B.g600, fontFamily: F }}>
                                        {d.discipline?.replace(/_/g, ' ')}
                                    </span>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <div style={{ fontSize: 9, color: B.g400, fontFamily: F }}>
                                    ⏱ {d.min_duration_mins || '?'}–{d.max_duration_mins || '?'} min
                                </div>
                                <div style={{ fontSize: 9, color: B.g400, fontFamily: F }}>
                                    👥 {d.min_players || '?'}–{d.max_players || '?'}
                                </div>
                            </div>
                        </div>

                        {/* Expanded Detail */}
                        {isExpanded && (
                            <div style={{ marginTop: 10, borderTop: `1px solid ${B.g200}`, paddingTop: 8 }}>
                                {d.description && (
                                    <div style={{ marginBottom: 8 }}>
                                        <div style={{ fontSize: 9, fontWeight: 700, color: B.g400, fontFamily: F, marginBottom: 2 }}>DESCRIPTION</div>
                                        <div style={{ fontSize: 10, color: B.g600, fontFamily: F, lineHeight: 1.4 }}>{d.description}</div>
                                    </div>
                                )}
                                {d.coaching_cues && (
                                    <div style={{ marginBottom: 8, padding: '6px 8px', background: `${B.pk}08`, borderRadius: 6 }}>
                                        <div style={{ fontSize: 9, fontWeight: 700, color: B.pk, fontFamily: F, marginBottom: 2 }}>🎯 COACHING CUES</div>
                                        <div style={{ fontSize: 10, color: B.nvD, fontFamily: F, lineHeight: 1.4 }}>{d.coaching_cues}</div>
                                    </div>
                                )}
                                {d.setup_instructions && (
                                    <div style={{ marginBottom: 8 }}>
                                        <div style={{ fontSize: 9, fontWeight: 700, color: B.g400, fontFamily: F, marginBottom: 2 }}>SETUP</div>
                                        <div style={{ fontSize: 10, color: B.g600, fontFamily: F, lineHeight: 1.4 }}>{d.setup_instructions}</div>
                                    </div>
                                )}
                                {d.success_criteria && (
                                    <div style={{ marginBottom: 8 }}>
                                        <div style={{ fontSize: 9, fontWeight: 700, color: B.grn, fontFamily: F, marginBottom: 2 }}>✓ SUCCESS CRITERIA</div>
                                        <div style={{ fontSize: 10, color: B.g600, fontFamily: F, lineHeight: 1.4 }}>{d.success_criteria}</div>
                                    </div>
                                )}
                                {d.equipment?.length > 0 && (
                                    <div style={{ marginBottom: 8 }}>
                                        <div style={{ fontSize: 9, fontWeight: 700, color: B.g400, fontFamily: F, marginBottom: 2 }}>🔧 EQUIPMENT</div>
                                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                            {d.equipment.map((e, i) => (
                                                <span key={i} style={{ padding: '2px 6px', borderRadius: 3, fontSize: 8, background: B.g100, color: B.g600, fontFamily: F }}>{e}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {d.variations?.length > 0 && (
                                    <div style={{ marginBottom: 8 }}>
                                        <div style={{ fontSize: 9, fontWeight: 700, color: B.bl, fontFamily: F, marginBottom: 2 }}>↕ VARIATIONS</div>
                                        {d.variations.map((v, i) => (
                                            <div key={i} style={{ fontSize: 10, color: B.g600, fontFamily: F, lineHeight: 1.4, paddingLeft: 8, borderLeft: `2px solid ${B.bl}30`, marginBottom: 3 }}>
                                                {typeof v === 'string' ? v : v.description || JSON.stringify(v)}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {/* Action buttons */}
                                {canEdit && (
                                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setEditDrill(d); setExpandedId(null); }}
                                            style={{ padding: '5px 10px', borderRadius: 4, border: `1px solid ${B.bl}`, background: 'none', color: B.bl, fontSize: 9, fontWeight: 700, fontFamily: F, cursor: 'pointer' }}
                                        >✏️ Edit</button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleArchive(d.id); }}
                                            style={{ padding: '5px 10px', borderRadius: 4, border: `1px solid ${B.red}30`, background: 'none', color: B.red, fontSize: 9, fontWeight: 700, fontFamily: F, cursor: 'pointer' }}
                                        >🗑 Archive</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}

            {filtered.length === 0 && (
                <div style={{ ...sCard, textAlign: 'center', padding: 24 }}>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>📚</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: B.g400, fontFamily: F }}>
                        {drills.length === 0 ? 'No drills yet — create your first!' : 'No drills match your filters'}
                    </div>
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════
// DRILL FORM
// ═══════════════════════════════════════════════════
function DrillForm({ drill, zones, onSave, onCancel }) {
    const [fd, setFd] = useState(() => ({
        name: '', short_name: '', category: 'skill_drill', discipline: 'batting', difficulty: 'explore',
        description: '', coaching_cues: '', setup_instructions: '', success_criteria: '',
        min_duration_mins: '', max_duration_mins: '', min_players: '', max_players: '',
        equipment: [], preferred_zones: [], tags: [], variations: [],
        ...(drill || {}),
    }));

    const [tagInput, setTagInput] = useState('');
    const [equipInput, setEquipInput] = useState('');
    const [varInput, setVarInput] = useState('');

    const u = (k, v) => setFd(d => ({ ...d, [k]: v }));

    const addTag = () => { if (tagInput.trim()) { u('tags', [...(fd.tags || []), tagInput.trim()]); setTagInput(''); } };
    const removeTag = (i) => u('tags', fd.tags.filter((_, idx) => idx !== i));
    const addEquip = () => { if (equipInput.trim()) { u('equipment', [...(fd.equipment || []), equipInput.trim()]); setEquipInput(''); } };
    const removeEquip = (i) => u('equipment', fd.equipment.filter((_, idx) => idx !== i));
    const addVar = () => { if (varInput.trim()) { u('variations', [...(fd.variations || []), varInput.trim()]); setVarInput(''); } };
    const removeVar = (i) => u('variations', fd.variations.filter((_, idx) => idx !== i));

    const toggleZone = (zId) => {
        const curr = fd.preferred_zones || [];
        u('preferred_zones', curr.includes(zId) ? curr.filter(z => z !== zId) : [...curr, zId]);
    };

    const inputStyle = { width: '100%', padding: '8px 10px', borderRadius: 6, border: `1px solid ${B.g200}`, fontSize: 11, fontFamily: F, outline: 'none', boxSizing: 'border-box' };
    const labelStyle = { fontSize: 9, fontWeight: 700, color: B.g400, fontFamily: F, marginBottom: 3, display: 'block', textTransform: 'uppercase' };
    const fieldWrap = { marginBottom: 10 };

    return (
        <div style={{ ...sCard, padding: 16, marginBottom: 12, border: `2px solid ${B.pk}30` }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: B.nvD, fontFamily: F, marginBottom: 12 }}>
                {drill ? '✏️ Edit Drill' : '+ New Drill'}
            </div>

            {/* Identity */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ ...fieldWrap, flex: '2 1 160px' }}>
                    <label style={labelStyle}>Drill Name *</label>
                    <input value={fd.name} onChange={e => u('name', e.target.value)} style={inputStyle} placeholder="e.g. Front Foot Drive Off Machine" />
                </div>
                <div style={{ ...fieldWrap, flex: '1 1 100px' }}>
                    <label style={labelStyle}>Short Name</label>
                    <input value={fd.short_name || ''} onChange={e => u('short_name', e.target.value)} style={inputStyle} placeholder="FF Drive" />
                </div>
            </div>

            {/* Classification */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ ...fieldWrap, flex: '1 1 100px' }}>
                    <label style={labelStyle}>Category</label>
                    <select value={fd.category} onChange={e => u('category', e.target.value)} style={inputStyle}>
                        {CATEGORY_OPTS.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                    </select>
                </div>
                <div style={{ ...fieldWrap, flex: '1 1 100px' }}>
                    <label style={labelStyle}>Discipline</label>
                    <select value={fd.discipline} onChange={e => u('discipline', e.target.value)} style={inputStyle}>
                        {DISCIPLINE_OPTS.map(d => <option key={d} value={d}>{d.replace(/_/g, ' ')}</option>)}
                    </select>
                </div>
                <div style={{ ...fieldWrap, flex: '1 1 100px' }}>
                    <label style={labelStyle}>Difficulty</label>
                    <select value={fd.difficulty} onChange={e => u('difficulty', e.target.value)} style={inputStyle}>
                        {DIFFICULTY_OPTS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                    </select>
                </div>
            </div>

            {/* Content */}
            <div style={fieldWrap}>
                <label style={labelStyle}>Description</label>
                <textarea value={fd.description || ''} onChange={e => u('description', e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Full drill description and instructions..." />
            </div>
            <div style={fieldWrap}>
                <label style={{ ...labelStyle, color: B.pk }}>🎯 Coaching Cues</label>
                <textarea value={fd.coaching_cues || ''} onChange={e => u('coaching_cues', e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical', background: `${B.pk}05` }} placeholder="Key coaching points for delivery..." />
            </div>
            <div style={fieldWrap}>
                <label style={labelStyle}>Setup Instructions</label>
                <textarea value={fd.setup_instructions || ''} onChange={e => u('setup_instructions', e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="How to physically set up the drill..." />
            </div>
            <div style={fieldWrap}>
                <label style={{ ...labelStyle, color: B.grn }}>✓ Success Criteria</label>
                <input value={fd.success_criteria || ''} onChange={e => u('success_criteria', e.target.value)} style={inputStyle} placeholder="What does 'good' look like?" />
            </div>

            {/* Logistics */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ ...fieldWrap, flex: '1 1 70px' }}>
                    <label style={labelStyle}>Min Mins</label>
                    <input type="number" value={fd.min_duration_mins || ''} onChange={e => u('min_duration_mins', +e.target.value || null)} style={inputStyle} placeholder="10" />
                </div>
                <div style={{ ...fieldWrap, flex: '1 1 70px' }}>
                    <label style={labelStyle}>Max Mins</label>
                    <input type="number" value={fd.max_duration_mins || ''} onChange={e => u('max_duration_mins', +e.target.value || null)} style={inputStyle} placeholder="25" />
                </div>
                <div style={{ ...fieldWrap, flex: '1 1 70px' }}>
                    <label style={labelStyle}>Min Players</label>
                    <input type="number" value={fd.min_players || ''} onChange={e => u('min_players', +e.target.value || null)} style={inputStyle} placeholder="3" />
                </div>
                <div style={{ ...fieldWrap, flex: '1 1 70px' }}>
                    <label style={labelStyle}>Max Players</label>
                    <input type="number" value={fd.max_players || ''} onChange={e => u('max_players', +e.target.value || null)} style={inputStyle} placeholder="8" />
                </div>
            </div>

            {/* Facility Zones */}
            <div style={fieldWrap}>
                <label style={labelStyle}>Preferred Zones</label>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {zones.map(z => (
                        <button
                            key={z.id}
                            onClick={() => toggleZone(z.id)}
                            style={{
                                padding: '4px 8px', borderRadius: 4, fontSize: 9, fontWeight: 600, fontFamily: F, cursor: 'pointer',
                                border: `1px solid ${(fd.preferred_zones || []).includes(z.id) ? B.bl : B.g200}`,
                                background: (fd.preferred_zones || []).includes(z.id) ? `${B.bl}15` : B.w,
                                color: (fd.preferred_zones || []).includes(z.id) ? B.bl : B.g400,
                            }}
                        >
                            📍 {z.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Equipment */}
            <div style={fieldWrap}>
                <label style={labelStyle}>Equipment</label>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 4 }}>
                    {(fd.equipment || []).map((e, i) => (
                        <span key={i} style={{ padding: '2px 6px', borderRadius: 3, fontSize: 9, background: B.g100, color: B.g600, fontFamily: F, display: 'flex', alignItems: 'center', gap: 3 }}>
                            {e} <button onClick={() => removeEquip(i)} style={{ background: 'none', border: 'none', color: B.red, cursor: 'pointer', fontSize: 10, padding: 0 }}>✕</button>
                        </span>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                    <input value={equipInput} onChange={e => setEquipInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addEquip()} style={{ ...inputStyle, flex: 1 }} placeholder="Add equipment..." />
                    <button onClick={addEquip} style={{ padding: '6px 10px', borderRadius: 6, border: 'none', background: B.g200, fontSize: 9, fontWeight: 700, fontFamily: F, cursor: 'pointer' }}>+</button>
                </div>
            </div>

            {/* Tags */}
            <div style={fieldWrap}>
                <label style={labelStyle}>Tags</label>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 4 }}>
                    {(fd.tags || []).map((t, i) => (
                        <span key={i} style={{ padding: '2px 6px', borderRadius: 3, fontSize: 9, background: `${B.bl}10`, color: B.bl, fontFamily: F, display: 'flex', alignItems: 'center', gap: 3 }}>
                            #{t} <button onClick={() => removeTag(i)} style={{ background: 'none', border: 'none', color: B.red, cursor: 'pointer', fontSize: 10, padding: 0 }}>✕</button>
                        </span>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                    <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag()} style={{ ...inputStyle, flex: 1 }} placeholder="Add tag..." />
                    <button onClick={addTag} style={{ padding: '6px 10px', borderRadius: 6, border: 'none', background: B.g200, fontSize: 9, fontWeight: 700, fontFamily: F, cursor: 'pointer' }}>+</button>
                </div>
            </div>

            {/* Variations */}
            <div style={fieldWrap}>
                <label style={{ ...labelStyle, color: B.bl }}>↕ Variations / Progressions</label>
                {(fd.variations || []).map((v, i) => (
                    <div key={i} style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 3, paddingLeft: 8, borderLeft: `2px solid ${B.bl}30` }}>
                        <div style={{ flex: 1, fontSize: 10, color: B.g600, fontFamily: F }}>{typeof v === 'string' ? v : v.description}</div>
                        <button onClick={() => removeVar(i)} style={{ background: 'none', border: 'none', color: B.red, cursor: 'pointer', fontSize: 10, padding: 0 }}>✕</button>
                    </div>
                ))}
                <div style={{ display: 'flex', gap: 4 }}>
                    <input value={varInput} onChange={e => setVarInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addVar()} style={{ ...inputStyle, flex: 1 }} placeholder="Add variation or progression..." />
                    <button onClick={addVar} style={{ padding: '6px 10px', borderRadius: 6, border: 'none', background: B.g200, fontSize: 9, fontWeight: 700, fontFamily: F, cursor: 'pointer' }}>+</button>
                </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button
                    onClick={() => { if (!fd.name.trim()) return; onSave(fd); }}
                    style={{
                        flex: 1, padding: '10px', borderRadius: 8, border: 'none',
                        background: fd.name.trim() ? `linear-gradient(135deg,${B.bl},${B.pk})` : B.g200,
                        color: fd.name.trim() ? B.w : B.g400,
                        fontSize: 12, fontWeight: 700, fontFamily: F, cursor: fd.name.trim() ? 'pointer' : 'default',
                    }}
                >
                    {drill ? 'Save Changes' : 'Create Drill'}
                </button>
                <button
                    onClick={onCancel}
                    style={{ padding: '10px 16px', borderRadius: 8, border: `1px solid ${B.g200}`, background: 'none', color: B.g600, fontSize: 12, fontWeight: 600, fontFamily: F, cursor: 'pointer' }}
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}
