// ═══ RRA TRIAL DAY — Rotation Editor v3 ═══
// Drag-and-drop editable grid · Live validation · Brand-consistent
import { useState, useMemo, useCallback, useRef } from 'react';
import { B, F, sGrad, sCard, LOGO } from '../data/theme';
import { SESSIONS, ROTATIONS as RAW_ROTATIONS } from '../data/rotationData';

// ═══ BRAND-ALIGNED COLOUR CODES ═══
const ROLE = {
    BAT: { bg: '#d4edda', border: B.grn, text: '#155724', icon: '🏏', label: 'Batting' },
    BOWL: { bg: '#cce5ff', border: B.bl, text: '#004085', icon: '🎯', label: 'Bowling' },
    MACH: { bg: '#fff3cd', border: B.amb, text: '#856404', icon: '⚙️', label: 'Machines' },
};
const ERR = {
    duplicate: { bg: '#fce4ec', border: B.red, text: '#922b21', tag: '⚠️ Duplicate' },
    missingBat: { bg: B.pkL, border: B.pk, text: '#922b21', tag: '❌ No BAT' },
    missingBowl: { bg: B.pkL, border: B.pk, text: '#922b21', tag: '❌ No BOWL' },
    missingMach: { bg: B.pkL, border: B.pk, text: '#922b21', tag: '❌ No MACH' },
    doubleBat: { bg: '#fef5e7', border: B.org, text: '#784212', tag: '🔄 2× BAT' },
    doubleMach: { bg: '#fef5e7', border: B.org, text: '#784212', tag: '🔄 2× MACH' },
    wrongBowl: { bg: '#fef5e7', border: B.org, text: '#784212', tag: '🔄 BOWL ≠ 2' },
};
const LANE_COLORS = [B.red, B.bl, B.grn, B.org];
const LANES = ['Lane 4', 'Lane 5', 'Lane 6', 'Lane 7'];

// ═══ VALIDATION ENGINE ═══
function validate(rotations) {
    const errors = {};
    const counts = {}; // name → { BAT, BOWL, MACH }
    const add = (n, t) => { if (!errors[n]) errors[n] = new Set(); errors[n].add(t); };
    rotations.forEach(rot => {
        const seen = {};
        LANES.forEach(l => (rot.lanes[l] || []).forEach(p => {
            seen[p.name] = (seen[p.name] || 0) + 1;
            if (!counts[p.name]) counts[p.name] = { BAT: 0, BOWL: 0, MACH: 0 };
            counts[p.name][p.role]++;
        }));
        Object.entries(seen).forEach(([n, c]) => { if (c > 1) add(n, 'duplicate'); });
    });
    Object.entries(counts).forEach(([n, c]) => {
        if (c.BAT === 0) add(n, 'missingBat');
        if (c.BOWL === 0) add(n, 'missingBowl');
        if (c.MACH === 0) add(n, 'missingMach');
        if (c.BAT > 1) add(n, 'doubleBat');
        if (c.MACH > 1) add(n, 'doubleMach');
        if (c.BOWL !== 2) add(n, 'wrongBowl');
    });
    return { errors, counts };
}

function detectSession() {
    const m = new Date().getHours() * 60 + new Date().getMinutes();
    return m < 870 ? '130' : m < 930 ? '230' : '330';
}

// ═══ DRAG STATE MANAGER ═══

export default function RotationBoard({ onAssessPlayer, checkPlayerDone }) {
    const dragPayloadRef = useRef(null);
    const [sid, setSid] = useState(detectSession);
    const [data, setData] = useState(() => JSON.parse(JSON.stringify(RAW_ROTATIONS)));
    const [showKey, setShowKey] = useState(false);
    const [activeLane, setActiveLane] = useState(null); // null means show all lanes
    const [dropTarget, setDropTarget] = useState(null); // { rotIdx, lane, slotIdx }
    const [dragSource, setDragSource] = useState(null);

    // Touch drag state
    const touchRef = useRef(null);
    const [touchDrag, setTouchDrag] = useState(null); // { name, x, y }

    const session = SESSIONS.find(s => s.id === sid);
    const rotations = useMemo(() => data[sid] || [], [data, sid]);
    const { errors, counts } = useMemo(() => validate(rotations), [rotations]);

    const errCount = useMemo(() => {
        let n = 0; Object.values(errors).forEach(s => n += s.size); return n;
    }, [errors]);

    const getErrs = useCallback((n) => errors[n] || new Set(), [errors]);

    // ═══ SWAP LOGIC ═══
    const swap = useCallback((src, dst) => {
        if (src.rotIdx === dst.rotIdx && src.lane === dst.lane && src.slotIdx === dst.slotIdx) return;
        setData(prev => {
            const next = JSON.parse(JSON.stringify(prev));
            const a = next[sid][src.rotIdx].lanes[src.lane][src.slotIdx];
            const b = next[sid][dst.rotIdx].lanes[dst.lane][dst.slotIdx];
            [a.name, a.role, b.name, b.role] = [b.name, b.role, a.name, a.role];
            return next;
        });
    }, [sid]);

    // ═══ HTML5 DRAG HANDLERS ═══
    const onDragStart = (e, rotIdx, lane, slotIdx, player) => {
        dragPayloadRef.current = { rotIdx, lane, slotIdx };
        setDragSource({ rotIdx, lane, slotIdx });
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', player.name);
    };
    const onDragOver = (e, rotIdx, lane, slotIdx) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDropTarget({ rotIdx, lane, slotIdx });
    };
    const onDragLeave = () => setDropTarget(null);
    const onDrop = (e, rotIdx, lane, slotIdx) => {
        e.preventDefault();
        if (dragPayloadRef.current) swap(dragPayloadRef.current, { rotIdx, lane, slotIdx });
        dragPayloadRef.current = null;
        setDropTarget(null);
        setDragSource(null);
    };
    const onDragEnd = () => { dragPayloadRef.current = null; setDropTarget(null); setDragSource(null); };

    // ═══ TOUCH DRAG HANDLERS (mobile) ═══
    const onTouchStart = (e, rotIdx, lane, slotIdx, player) => {
        const t = e.touches[0];
        touchRef.current = { rotIdx, lane, slotIdx, startX: t.clientX, startY: t.clientY, moved: false };
        setTouchDrag({ name: player.name, x: t.clientX, y: t.clientY });
        setDragSource({ rotIdx, lane, slotIdx });
    };
    const onTouchMove = (e) => {
        if (!touchRef.current) return;
        const t = e.touches[0];
        const dx = Math.abs(t.clientX - touchRef.current.startX);
        const dy = Math.abs(t.clientY - touchRef.current.startY);
        if (dx > 8 || dy > 8) {
            touchRef.current.moved = true;
            e.preventDefault();
        }
        setTouchDrag(prev => prev ? { ...prev, x: t.clientX, y: t.clientY } : null);
    };
    const onTouchEnd = () => {
        if (!touchRef.current) return;
        const src = touchRef.current;
        if (src.moved && touchDrag) {
            // Find drop target element at finger position
            const el = document.elementFromPoint(touchDrag.x, touchDrag.y);
            if (el) {
                const cell = el.closest('[data-slot]');
                if (cell) {
                    const [ri, ln, si] = cell.dataset.slot.split('|');
                    swap(src, { rotIdx: parseInt(ri), lane: ln, slotIdx: parseInt(si) });
                }
            }
        }
        touchRef.current = null;
        setTouchDrag(null);
        setDragSource(null);
        setDropTarget(null);
    };

    const reset = () => { setData(JSON.parse(JSON.stringify(RAW_ROTATIONS))); };

    // ═══ SUMMARY ROWS ═══
    const summary = useMemo(() =>
        (session?.players || []).map(p => ({
            name: p.name,
            c: counts[p.name] || { BAT: 0, BOWL: 0, MACH: 0 },
            e: errors[p.name] || new Set(),
        })), [session, counts, errors]);

    // ═══ RENDER ═══
    return (
        <div style={{ minHeight: '100vh', background: B.g50, fontFamily: F }}>
            {/* ═══ BRANDED HEADER ═══ */}
            <div style={{ ...sGrad, padding: '16px 16px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <img src={LOGO} alt="RRA" style={{ width: 36, height: 36, objectFit: 'contain' }} />
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: B.w, fontFamily: F, letterSpacing: 0.3 }}>
                        Rotation Editor
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontFamily: F, marginTop: 1 }}>
                        Drag players between slots • Validation runs live
                    </div>
                </div>
                <div style={{
                    padding: '6px 12px', borderRadius: 20,
                    background: errCount > 0 ? `${B.red}25` : `${B.grn}25`,
                    color: errCount > 0 ? B.red : B.grn,
                    fontSize: 11, fontWeight: 800, fontFamily: F,
                    border: `1.5px solid ${errCount > 0 ? B.red : B.grn}`,
                }}>
                    {errCount > 0 ? `⚠ ${errCount}` : '✅ Valid'}
                </div>
            </div>

            {/* ═══ SESSION TABS ═══ */}
            <div style={{ display: 'flex', gap: 4, padding: '10px 12px', background: B.g100 }}>
                {SESSIONS.map(s => {
                    const active = sid === s.id;
                    return (
                        <button key={s.id} onClick={() => { setSid(s.id); setDragSource(null); setDropTarget(null); }}
                            style={{
                                flex: 1, padding: '10px 6px', borderRadius: 10, border: active ? `2px solid ${B.pk}` : `1px solid ${B.g200}`,
                                background: active ? B.nvD : B.w, color: active ? B.w : B.nv,
                                fontSize: 12, fontWeight: 800, fontFamily: F, cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}>
                            {s.label}
                            <span style={{ fontSize: 9, marginLeft: 4, opacity: 0.5, fontWeight: 600 }}>({s.players.length}p)</span>
                        </button>
                    );
                })}
                <button onClick={reset} style={{
                    padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${B.red}`,
                    background: 'transparent', color: B.red, fontSize: 10, fontWeight: 800,
                    fontFamily: F, cursor: 'pointer', whiteSpace: 'nowrap',
                }}>↺ Reset</button>
            </div>

            {/* ═══ LANE SELECTOR ═══ */}
            <div style={{ display: 'flex', gap: 6, padding: '0 12px 10px', background: B.g100, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <button onClick={() => setActiveLane(null)} style={{
                    padding: '8px 14px', borderRadius: 20, border: !activeLane ? `2px solid ${B.nv}` : `1px solid ${B.g300}`,
                    background: !activeLane ? B.nv : B.w, color: !activeLane ? B.w : B.nv,
                    fontSize: 12, fontWeight: 800, fontFamily: F, cursor: 'pointer', flexShrink: 0
                }}>All Lanes</button>
                {LANES.map(lane => (
                    <button key={lane} onClick={() => setActiveLane(lane)} style={{
                        padding: '8px 14px', borderRadius: 20, border: activeLane === lane ? `2px solid ${B.bl}` : `1px solid ${B.g300}`,
                        background: activeLane === lane ? B.bl : B.w, color: activeLane === lane ? B.w : B.nv,
                        fontSize: 12, fontWeight: 800, fontFamily: F, cursor: 'pointer', flexShrink: 0
                    }}>
                        {lane}
                    </button>
                ))}
            </div>

            {/* ═══ COLOUR KEY ═══ */}
            <div style={{ padding: '4px 12px 0' }}>
                <button onClick={() => setShowKey(!showKey)} style={{
                    background: 'none', border: 'none', cursor: 'pointer', fontFamily: F,
                    fontSize: 11, fontWeight: 700, color: B.nv, padding: '6px 0',
                }}>
                    {showKey ? '▼' : '▶'} Colour Key & Validation Legend
                </button>
                {showKey && (
                    <div style={{ ...sCard, padding: '12px 14px', marginTop: 4 }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {Object.entries(ROLE).map(([k, v]) => (
                                <span key={k} style={{
                                    padding: '4px 10px', borderRadius: 6, background: v.bg,
                                    border: `1.5px solid ${v.border}`, color: v.text,
                                    fontSize: 10, fontWeight: 700, fontFamily: F,
                                }}>{v.icon} {v.label}</span>
                            ))}
                        </div>
                        <div style={{ height: 1, background: B.g200, margin: '8px 0' }} />
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                            {Object.entries(ERR).map(([k, v]) => (
                                <span key={k} style={{
                                    padding: '3px 8px', borderRadius: 6, background: v.bg,
                                    border: `1px solid ${v.border}`, color: v.text,
                                    fontSize: 9, fontWeight: 600, fontFamily: F,
                                }}>{v.tag}</span>
                            ))}
                        </div>
                        <div style={{ marginTop: 8, fontSize: 9, color: B.g400, fontFamily: F, lineHeight: 1.5 }}>
                            Expected distribution: <strong>BAT × 1</strong> · <strong>BOWL × 2</strong> · <strong>MACH × 1</strong> per player per session.
                            Drag any player to swap with another. Errors highlighted in real-time.
                        </div>
                    </div>
                )}
            </div>

            {/* ═══ TOUCH DRAG GHOST ═══ */}
            {touchDrag && (
                <div style={{
                    position: 'fixed', left: touchDrag.x - 60, top: touchDrag.y - 20,
                    background: B.nvD, color: B.w, padding: '6px 14px', borderRadius: 8,
                    fontSize: 11, fontWeight: 800, fontFamily: F, zIndex: 9999,
                    pointerEvents: 'none', opacity: 0.9, boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                    border: `2px solid ${B.pk}`,
                }}>
                    {touchDrag.name}
                </div>
            )}

            {/* ═══ ROTATION GRIDS ═══ */}
            {rotations.map((rot, rotIdx) => {
                const visibleLanes = activeLane ? [activeLane] : LANES;
                return (
                    <div key={rotIdx} style={{ padding: '0 12px 14px' }}>
                        {/* Rotation header */}
                        <div style={{
                            ...sGrad, padding: '10px 14px', borderRadius: '12px 12px 0 0',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}>
                            <div style={{ fontSize: 14, fontWeight: 900, color: B.w, fontFamily: F, letterSpacing: 0.5 }}>
                                {rot.label}
                            </div>
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontFamily: F, fontWeight: 600 }}>
                                {rot.timeInfo.split('—')[1]?.trim() || ''}
                            </div>
                        </div>

                        {/* Grid */}
                        <div style={{
                            background: B.w, borderRadius: '0 0 12px 12px', overflow: 'hidden',
                            border: `1px solid ${B.g200}`, borderTop: 'none',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                        }}>
                            {/* Lane headers */}
                            <div style={{ display: 'grid', gridTemplateColumns: `52px repeat(${visibleLanes.length}, 1fr)`, borderBottom: `2px solid ${B.g200}` }}>
                                <div style={{
                                    padding: '8px 4px', background: B.g100, fontSize: 8,
                                    fontWeight: 800, color: B.g400, fontFamily: F, textAlign: 'center',
                                    letterSpacing: 0.5, textTransform: 'uppercase',
                                }}>Role</div>
                                {visibleLanes.map((l) => {
                                    const lIdx = LANES.indexOf(l);
                                    return (
                                        <div key={l} style={{
                                            padding: '8px 4px', background: LANE_COLORS[lIdx], color: B.w,
                                            fontSize: 11, fontWeight: 900, fontFamily: F, textAlign: 'center',
                                            letterSpacing: 0.3,
                                        }}>{l}</div>
                                    )
                                })}
                            </div>

                            {/* Role rows */}
                            {['BAT', 'BOWL', 'MACH'].map(role => {
                                const rc = ROLE[role];
                                const maxN = Math.max(1, ...visibleLanes.map(l =>
                                    (rot.lanes[l] || []).filter(p => p.role === role).length
                                ));
                                return Array.from({ length: maxN }, (_, ri) => (
                                    <div key={`${role}-${ri}`} style={{
                                        display: 'grid', gridTemplateColumns: `52px repeat(${visibleLanes.length}, 1fr)`,
                                        borderBottom: ri === maxN - 1 ? `2px solid ${B.g200}` : `1px solid ${B.g100}`,
                                    }}>
                                        {/* Role cell */}
                                        <div style={{
                                            padding: '7px 4px', background: rc.bg,
                                            borderRight: `2px solid ${rc.border}`,
                                            fontSize: 8, fontWeight: 800, color: rc.text,
                                            fontFamily: F, textAlign: 'center', letterSpacing: 0.3,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2,
                                        }}>
                                            {ri === 0 && <>{rc.icon}<span style={{ fontSize: 7 }}>{role}</span></>}
                                        </div>

                                        {/* Player cells */}
                                        {visibleLanes.map(lane => {
                                            const rolePlayers = (rot.lanes[lane] || []).filter(p => p.role === role);
                                            const player = rolePlayers[ri];
                                            if (!player) return <div key={lane} style={{ padding: 6, background: B.g50 }} />;

                                            const slotIdx = (rot.lanes[lane] || []).indexOf(player);
                                            const pe = getErrs(player.name);
                                            const isDup = pe.has('duplicate');
                                            const isDragSrc = dragSource?.rotIdx === rotIdx && dragSource?.lane === lane && dragSource?.slotIdx === slotIdx;
                                            const isDropTgt = dropTarget?.rotIdx === rotIdx && dropTarget?.lane === lane && dropTarget?.slotIdx === slotIdx;
                                            const isPlayerFinished = checkPlayerDone && checkPlayerDone(player);

                                            const cellBg = isDup ? ERR.duplicate.bg : isDropTgt ? `${B.bl}15` : isDragSrc ? `${B.pk}12` : rc.bg;
                                            const baseBorder = isDup ? ERR.duplicate.border : isDropTgt ? B.bl : isDragSrc ? B.pk : 'transparent';

                                            const isEvaluatedBorder = isPlayerFinished ? `3px solid ${B.amb}` : `3px solid ${baseBorder}`;

                                            return (
                                                <div
                                                    key={lane}
                                                    data-slot={`${rotIdx}|${lane}|${slotIdx}`}
                                                    draggable
                                                    onClick={() => onAssessPlayer && onAssessPlayer(player.name)}
                                                    onDragStart={(e) => onDragStart(e, rotIdx, lane, slotIdx, player)}
                                                    onDragOver={(e) => onDragOver(e, rotIdx, lane, slotIdx)}
                                                    onDragLeave={onDragLeave}
                                                    onDrop={(e) => onDrop(e, rotIdx, lane, slotIdx)}
                                                    onDragEnd={onDragEnd}
                                                    onTouchStart={(e) => onTouchStart(e, rotIdx, lane, slotIdx, player)}
                                                    onTouchMove={onTouchMove}
                                                    onTouchEnd={onTouchEnd}
                                                    style={{
                                                        padding: '5px 6px', cursor: 'grab', position: 'relative',
                                                        background: cellBg,
                                                        borderLeft: isEvaluatedBorder,
                                                        border: isPlayerFinished && !isDragSrc && !isDropTgt ? `1px solid ${B.amb}` : 'none',
                                                        boxShadow: isPlayerFinished ? `0 0 5px ${B.amb}60` : 'none',
                                                        transition: 'background 0.15s, border-color 0.15s',
                                                        opacity: isDragSrc ? 0.5 : 1,
                                                    }}
                                                    title={pe.size > 0 ? [...pe].map(e => ERR[e]?.tag).join(', ') : ''}
                                                >
                                                    <div style={{
                                                        fontSize: 10.5, fontWeight: 700, color: rc.text,
                                                        fontFamily: F, lineHeight: 1.3,
                                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                    }}>
                                                        {player.name}
                                                    </div>
                                                    {pe.size > 0 && (
                                                        <span style={{
                                                            position: 'absolute', top: 1, right: 3,
                                                            fontSize: 8, lineHeight: 1,
                                                        }}>{isDup ? '⚠️' : '⚡'}</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ));
                            })}

                            {/* Changeover */}
                            {rot.changeover && (
                                <div style={{
                                    marginTop: 4, padding: '6px 12px', borderRadius: 8,
                                    background: `${B.amb}15`, border: `1px dashed ${B.amb}`,
                                    fontSize: 10, fontWeight: 600, color: '#856404', fontFamily: F,
                                }}>
                                    ⏱️ <strong>Pad Up Next:</strong> {rot.changeover}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}

            {/* ═══ SESSION SUMMARY ═══ */}
            <div style={{ padding: '0 12px 24px' }}>
                <div style={{
                    ...sCard, overflow: 'hidden', padding: 0,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}>
                    <div style={{
                        ...sGrad, padding: '12px 14px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                        <span style={{ fontSize: 13, fontWeight: 900, color: B.w, fontFamily: F }}>
                            📊 Session Summary
                        </span>
                        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontFamily: F, fontWeight: 600 }}>
                            Expected: BAT×1 · BOWL×2 · MACH×1
                        </span>
                    </div>

                    {/* Header row */}
                    <div style={{
                        display: 'grid', gridTemplateColumns: '2fr 55px 55px 55px 1fr',
                        padding: '8px 12px', background: B.g100, borderBottom: `1px solid ${B.g200}`,
                    }}>
                        {['Player', '🏏', '🎯', '⚙️', 'Status'].map(h => (
                            <div key={h} style={{
                                fontSize: 9, fontWeight: 800, color: B.nv, fontFamily: F,
                                textAlign: h === 'Player' || h === 'Status' ? 'left' : 'center',
                                letterSpacing: 0.3,
                            }}>{h}</div>
                        ))}
                    </div>

                    {/* Player rows */}
                    <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                        {summary.map((r, i) => {
                            const batOk = r.c.BAT === 1, bowlOk = r.c.BOWL === 2, machOk = r.c.MACH === 1;
                            const allOk = batOk && bowlOk && machOk && r.e.size === 0;
                            const pill = (ok) => ({
                                fontSize: 11, fontWeight: 800, fontFamily: F, textAlign: 'center',
                                color: ok ? B.grn : B.red,
                                background: ok ? `${B.grn}15` : `${B.red}15`,
                                borderRadius: 6, padding: '3px 0', margin: '0 6px',
                            });
                            return (
                                <div key={i} style={{
                                    display: 'grid', gridTemplateColumns: '2fr 55px 55px 55px 1fr',
                                    padding: '6px 12px', alignItems: 'center',
                                    borderBottom: `1px solid ${B.g100}`,
                                    background: i % 2 === 0 ? B.w : B.g50,
                                }}>
                                    <div style={{
                                        fontSize: 10.5, fontWeight: 700, color: B.nvD, fontFamily: F,
                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                    }}>{r.name}</div>
                                    <div style={pill(batOk)}>{r.c.BAT}</div>
                                    <div style={pill(bowlOk)}>{r.c.BOWL}</div>
                                    <div style={pill(machOk)}>{r.c.MACH}</div>
                                    <div style={{
                                        fontSize: 9, fontWeight: 700, fontFamily: F,
                                        color: allOk ? B.grn : B.red,
                                    }}>
                                        {allOk ? '✅ Valid' : [...r.e].map(e => ERR[e]?.tag || e).join(', ')}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div >
    );
}
