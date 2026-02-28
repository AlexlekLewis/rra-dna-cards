// ═══ TRIAL SESSION PLANNER — Net Rotation Board ═══
// Generates and manages rotation schedules for 3-zone indoor sessions:
//   🏏 Live Nets (8 players) → 🎯 Bowling Lanes (16 players) → 🤖 Machines (6 players)
// Auto-generates rotations ensuring everyone bats, supports tap-to-move rearrangement

import { useState, useEffect, useCallback, useMemo } from 'react';
import { B, F, sGrad, _isDesktop, dkWrap } from '../data/theme';
import { ROLES } from '../data/skillItems';
import { supabase } from '../supabaseClient';
import { Hdr } from '../shared/FormComponents';

const TODAY = new Date().toISOString().slice(0, 10);

const ZONES = [
    { id: 'nets', label: 'Live Nets', icon: '🏏', color: B.pk, cap: 8, desc: 'Bat vs Ball' },
    { id: 'bowling', label: 'Bowling Lanes', icon: '🎯', color: B.bl, cap: 16, desc: '4 per lane × 4 lanes' },
    { id: 'machines', label: 'Machines', icon: '🤖', color: B.amb, cap: 6, desc: 'Warm-up / prep' },
];

const DEFAULT_CONFIG = {
    rotations: 4,
    minsPerRotation: 12,
    startTime: '10:05',
    bufferMins: 5,
};

// ═══ AUTO-GENERATION ALGORITHM ═══
// Ensures every player bats at least once across 4 rotations
// Flow: Machines → Nets → Bowling → (cycle)
function generateRotations(playerIds, config) {
    const n = playerIds.length;
    if (n === 0) return [];

    const numRot = config.rotations || 4;
    const netsCap = 8;
    const bowlCap = 16;

    // Shuffle for fairness
    const shuffled = [...playerIds].sort(() => Math.random() - 0.5);

    // Create batting groups — ensure everyone bats
    const batGroups = [];
    for (let r = 0; r < numRot; r++) {
        const start = r * netsCap;
        const group = shuffled.slice(start, start + netsCap);
        // If last group is short, pad from start (double-batters)
        if (group.length < netsCap && group.length > 0) {
            let padIdx = 0;
            while (group.length < netsCap && padIdx < shuffled.length) {
                if (!group.includes(shuffled[padIdx])) {
                    group.push(shuffled[padIdx]);
                }
                padIdx++;
            }
        }
        if (group.length > 0) batGroups.push(group);
    }

    // Build rotations
    const rotations = [];
    for (let r = 0; r < numRot; r++) {
        const nets = batGroups[r] || [];
        const netsSet = new Set(nets.map(id => id));

        // Remaining players not batting this rotation
        const remaining = shuffled.filter(id => !netsSet.has(id));

        // Split remaining: first bowlCap → bowling, rest → machines
        const bowling = remaining.slice(0, Math.min(bowlCap, remaining.length));
        const machines = remaining.slice(Math.min(bowlCap, remaining.length));

        rotations.push({
            number: r + 1,
            nets: nets,
            bowling: bowling,
            machines: machines,
        });
    }

    return rotations;
}

// Calculate rotation times from config
function getRotationTimes(config) {
    const [h, m] = (config.startTime || '10:05').split(':').map(Number);
    const times = [];
    for (let r = 0; r < (config.rotations || 4); r++) {
        const startMin = h * 60 + m + r * (config.minsPerRotation || 12);
        const endMin = startMin + (config.minsPerRotation || 12);
        const fmt = (mins) => {
            const hh = Math.floor(mins / 60);
            const mm = mins % 60;
            return `${hh}:${mm.toString().padStart(2, '0')}`;
        };
        times.push({ start: fmt(startMin), end: fmt(endMin) });
    }
    return times;
}

export default function TrialSessionPlanner({ session, players, groupMap, activeGroup, getAge, getBracket, onBack, onAssessPlayer }) {
    const [rotations, setRotations] = useState([]);
    const [config, setConfig] = useState(DEFAULT_CONFIG);
    const [selected, setSelected] = useState(null); // { rotation, zone, idx }
    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);
    const [removedPlayers, setRemovedPlayers] = useState(new Set());
    const [viewRotation, setViewRotation] = useState(null); // null = grid view, number = single rotation

    // Group players
    const groupPlayers = useMemo(() => {
        if (!activeGroup) return players.filter(p => p.submitted);
        return players.filter(p => p.submitted && groupMap[p.id] === activeGroup);
    }, [players, groupMap, activeGroup]);

    const activePlayers = useMemo(() =>
        groupPlayers.filter(p => !removedPlayers.has(p.id)),
        [groupPlayers, removedPlayers]
    );

    const playerMap = useMemo(() => {
        const m = {};
        players.forEach(p => { m[p.id] = p; });
        return m;
    }, [players]);

    const rotTimes = useMemo(() => getRotationTimes(config), [config]);

    // Load from DB
    useEffect(() => {
        if (!activeGroup) return;
        (async () => {
            try {
                const { data } = await supabase
                    .from('trial_session_plans')
                    .select('*')
                    .eq('session_date', TODAY)
                    .eq('session_group', activeGroup)
                    .single();
                if (data?.rotation_data) {
                    setRotations(data.rotation_data);
                    if (data.config) setConfig({ ...DEFAULT_CONFIG, ...data.config });
                }
            } catch (e) {
                // No plan yet — will auto-generate
            }
        })();
    }, [activeGroup]);

    // Save to DB
    const savePlan = useCallback(async (rots, cfg) => {
        if (!activeGroup || !session?.user?.id) return;
        setSaving(true);
        try {
            await supabase.from('trial_session_plans').upsert({
                session_date: TODAY,
                session_group: activeGroup,
                rotation_data: rots,
                config: cfg,
                created_by: session.user.id,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'session_date,session_group' });
            setLastSaved(new Date());
        } catch (e) {
            console.error('Plan save error:', e.message);
        } finally {
            setSaving(false);
        }
    }, [activeGroup, session]);

    // Auto-generate
    const autoGenerate = () => {
        const ids = activePlayers.map(p => p.id);
        const rots = generateRotations(ids, config);
        setRotations(rots);
        savePlan(rots, config);
    };

    // Update config and re-save
    const updateConfig = (key, val) => {
        const newCfg = { ...config, [key]: val };
        setConfig(newCfg);
        if (rotations.length > 0) savePlan(rotations, newCfg);
    };

    // ═══ PDF / PRINT EXPORT ═══
    const printRotations = () => {
        if (!rotations.length) return;
        const times = getRotationTimes(config);
        const sessionStart = config.startTime || '10:05';
        const arrivalTime = (() => {
            const [h, m] = sessionStart.split(':').map(Number);
            const arrival = h * 60 + m - 15;
            return `${Math.floor(arrival / 60)}:${(arrival % 60).toString().padStart(2, '0')}`;
        })();

        // Build per-player schedule
        const playerSchedules = {};
        activePlayers.forEach(p => { playerSchedules[p.id] = { name: p.name, rotations: [] }; });
        rotations.forEach((rot, ri) => {
            const add = (pids, zoneName, zoneIcon) => {
                pids.forEach(pid => {
                    if (playerSchedules[pid]) {
                        playerSchedules[pid].rotations.push({ num: ri + 1, time: times[ri], zone: zoneName, icon: zoneIcon });
                    }
                });
            };
            add(rot.nets, 'Live Nets (Batting)', '\ud83c\udfd0');
            add(rot.bowling, 'Bowling Lanes', '\ud83c\udfaf');
            add(rot.machines, 'Machines', '\ud83e\udd16');
        });

        const groupLabel = activeGroup || 'All Players';
        const rows = Object.values(playerSchedules).sort((a, b) => a.name.localeCompare(b.name));

        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Session Rotation - ${groupLabel}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; padding:20px; color:#1a1a1a; }
h1 { font-size:18px; margin-bottom:4px; }
.sub { font-size:11px; color:#666; margin-bottom:12px; }
.info { background:#f7f7f7; border-radius:8px; padding:10px; margin-bottom:16px; font-size:11px; line-height:1.6; }
.info strong { color:#e53e3e; }
table { width:100%; border-collapse:collapse; margin-bottom:16px; font-size:10px; }
th { background:#1a1a2e; color:#fff; padding:6px 8px; text-align:left; font-size:9px; letter-spacing:1px; text-transform:uppercase; }
td { padding:5px 8px; border-bottom:1px solid #eee; }
tr:nth-child(even) { background:#fafafa; }
.bat { background:#fff5f5 !important; font-weight:700; }
.summary { page-break-before:always; }
@media print { body{padding:10px;} .no-print{display:none;} }
</style></head><body>
<div class="no-print" style="margin-bottom:12px">
  <button onclick="window.print()" style="padding:10px 20px;border-radius:8px;border:none;background:#e53e3e;color:#fff;font-weight:700;cursor:pointer;font-size:13px">Print / Save as PDF</button>
</div>
<h1>RRA Trial Session - ${groupLabel}</h1>
<div class="sub">${TODAY} | Session starts: ${sessionStart} | ${config.rotations} rotations x ${config.minsPerRotation} min</div>
<div class="info">
  <strong>ARRIVAL:</strong> Please arrive by <strong>${arrivalTime}</strong> (15 min before).<br>
  <strong>BATTING:</strong> If your first rotation is Live Nets, pad up <strong>15 minutes prior</strong>.<br>
  <strong>BOWLING:</strong> If your first rotation is Bowling Lanes, start warming up before the session.<br>
  <strong>MACHINES:</strong> Use machine time for shot practice, timing drills, and preparation.
</div>
<h2 style="font-size:13px;margin-bottom:8px">Player Schedules</h2>
<table>
<thead><tr><th>Player</th>${rotations.map((r, i) => `<th>R${r.number} (${times[i]?.start}-${times[i]?.end})</th>`).join('')}</tr></thead>
<tbody>
${rows.map(ps => {
            const cells = ps.rotations.map(r => {
                const isBat = r.zone.includes('Batting');
                return '<td class="' + (isBat ? 'bat' : '') + '">' + r.icon + ' ' + r.zone + '</td>';
            }).join('');
            return '<tr><td><strong>' + ps.name + '</strong></td>' + cells + '</tr>';
        }).join('\n')}
</tbody></table>
<div class="summary">
<h2 style="font-size:13px;margin-bottom:8px">Rotation Overview</h2>
${rotations.map((rot, ri) => {
            return '<div style="margin-bottom:12px"><div style="font-weight:800;font-size:12px;margin-bottom:4px">Rotation ' + rot.number + ' (' + times[ri]?.start + ' - ' + times[ri]?.end + ')</div><table><tr><th>Live Nets (' + rot.nets.length + '/' + ZONES[0].cap + ')</th><th>Bowling Lanes (' + rot.bowling.length + '/' + ZONES[1].cap + ')</th><th>Machines (' + rot.machines.length + '/' + ZONES[2].cap + ')</th></tr><tr><td>' + rot.nets.map(id => playerMap[id]?.name || '?').join('<br>') + '</td><td>' + rot.bowling.map(id => playerMap[id]?.name || '?').join('<br>') + '</td><td>' + rot.machines.map(id => playerMap[id]?.name || '?').join('<br>') + '</td></tr></table></div>';
        }).join('')}
</div></body></html>`;

        const win = window.open('', '_blank');
        if (win) { win.document.write(html); win.document.close(); }
    };

    // ═══ TAP-TO-MOVE ═══
    const handleTapSlot = (rotationIdx, zone, slotIdx, playerId) => {
        if (!selected) {
            // First tap — select this player
            if (playerId) {
                setSelected({ rotationIdx, zone, slotIdx, playerId });
            }
            return;
        }

        // Second tap — move selected player here
        const src = selected;
        const newRots = rotations.map(r => ({
            ...r,
            nets: [...r.nets],
            bowling: [...r.bowling],
            machines: [...r.machines],
        }));

        // Remove from source
        const srcRot = newRots[src.rotationIdx];
        const srcIdx = srcRot[src.zone].indexOf(src.playerId);
        if (srcIdx !== -1) srcRot[src.zone].splice(srcIdx, 1);

        // If destination has a player, swap to source
        const destRot = newRots[rotationIdx];
        if (playerId) {
            const destIdx = destRot[zone].indexOf(playerId);
            if (destIdx !== -1) {
                destRot[zone].splice(destIdx, 1);
                srcRot[src.zone].splice(srcIdx, 0, playerId); // Put dest player in src spot
            }
        }

        // Insert selected player at destination
        destRot[zone].push(src.playerId);

        setRotations(newRots);
        setSelected(null);
        savePlan(newRots, config);
    };

    // Cancel selection
    const cancelSelect = () => setSelected(null);

    // Toggle player removal
    const togglePlayer = (playerId) => {
        setRemovedPlayers(prev => {
            const next = new Set(prev);
            if (next.has(playerId)) next.delete(playerId);
            else next.add(playerId);
            return next;
        });
    };

    // ═══ PLAYER CHIP ═══
    const PlayerChip = ({ playerId, rotationIdx, zone, slotIdx, compact }) => {
        const p = playerMap[playerId];
        if (!p) return <div style={{ padding: 4, fontSize: 9, color: B.g400, fontFamily: F }}>?</div>;

        const isSelected = selected?.playerId === playerId && selected?.rotationIdx === rotationIdx;
        const zoneDef = ZONES.find(z => z.id === zone);

        return (
            <div
                onClick={(e) => { e.stopPropagation(); handleTapSlot(rotationIdx, zone, slotIdx, playerId); }}
                style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: compact ? '3px 6px' : '5px 8px',
                    borderRadius: 6,
                    background: isSelected ? `${zoneDef?.color || B.bl}30` : B.g50,
                    border: isSelected ? `2px solid ${zoneDef?.color || B.bl}` : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    animation: isSelected ? 'pulse 1s infinite' : 'none',
                }}
            >
                <div style={{
                    fontSize: compact ? 9 : 10, fontWeight: 600, color: B.g800, fontFamily: F,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    maxWidth: compact ? 60 : 100,
                }}>
                    {compact ? p.name?.split(' ').map(w => w[0]).join('') : p.name?.split(' ')[0] + ' ' + (p.name?.split(' ')[1]?.[0] || '')}
                </div>
                {onAssessPlayer && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onAssessPlayer(playerId); }}
                        style={{
                            width: 16, height: 16, borderRadius: 4, border: 'none',
                            background: B.grn, color: B.w, fontSize: 8, fontWeight: 800,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: 0, flexShrink: 0,
                        }}
                    >✎</button>
                )}
            </div>
        );
    };

    // ═══ ZONE CELL ═══
    const ZoneCell = ({ rotationIdx, zone, playerIds, zoneDef }) => {
        const overCap = playerIds.length > zoneDef.cap;
        const underCap = playerIds.length < zoneDef.cap;

        return (
            <div
                onClick={() => {
                    if (selected && playerIds.length < zoneDef.cap) {
                        handleTapSlot(rotationIdx, zone.id, playerIds.length, null);
                    }
                }}
                style={{
                    background: B.w,
                    borderRadius: 8,
                    border: selected ? `1.5px dashed ${zone.color}40` : `1px solid ${B.g200}`,
                    padding: 6,
                    minHeight: 40,
                    cursor: selected ? 'pointer' : 'default',
                }}
            >
                <div style={{
                    fontSize: 8, fontWeight: 700, color: zone.color, fontFamily: F,
                    marginBottom: 3, display: 'flex', justifyContent: 'space-between',
                }}>
                    <span>{zone.icon} {zone.label}</span>
                    <span style={{ color: overCap ? B.red : underCap ? B.amb : B.grn }}>
                        {playerIds.length}/{zone.cap}
                    </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                    {playerIds.map((pid, i) => (
                        <PlayerChip
                            key={`${pid}-${i}`}
                            playerId={pid}
                            rotationIdx={rotationIdx}
                            zone={zone.id}
                            slotIdx={i}
                            compact={!_isDesktop}
                        />
                    ))}
                    {selected && playerIds.length < zoneDef.cap && (
                        <div style={{
                            padding: '3px 8px', borderRadius: 6,
                            border: `1.5px dashed ${zone.color}40`,
                            fontSize: 9, color: zone.color, fontFamily: F, fontWeight: 600,
                            cursor: 'pointer',
                        }}>+ Drop here</div>
                    )}
                </div>
            </div>
        );
    };

    // ═══ RENDER ═══
    const hasRotations = rotations.length > 0;

    return (
        <div style={{ minHeight: '100vh', fontFamily: F, background: B.g50 }}>
            <Hdr label={`PLANNER — ${activeGroup || 'ALL'}`} onLogoClick={onBack} />

            {/* Selection banner */}
            {selected && (
                <div style={{
                    padding: '8px 12px', background: `${B.pk}15`, borderBottom: `1px solid ${B.pk}30`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: B.pk, fontFamily: F }}>
                        ✋ Moving: {playerMap[selected.playerId]?.name || '?'} — tap destination
                    </div>
                    <button onClick={cancelSelect} style={{
                        padding: '4px 10px', borderRadius: 6, border: `1px solid ${B.pk}`,
                        background: 'transparent', color: B.pk, fontSize: 10, fontWeight: 700,
                        fontFamily: F, cursor: 'pointer',
                    }}>Cancel</button>
                </div>
            )}

            {/* Config Bar */}
            <div style={{
                padding: '10px 12px', background: `linear-gradient(135deg,${B.nvD},${B.nv})`,
                display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <label style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontFamily: F, fontWeight: 700 }}>START</label>
                    <input type="time" value={config.startTime} onChange={e => updateConfig('startTime', e.target.value)}
                        style={{ padding: '4px 6px', borderRadius: 4, border: 'none', fontSize: 11, fontFamily: F, fontWeight: 600, width: 75 }}
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <label style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontFamily: F, fontWeight: 700 }}>MINS/ROT</label>
                    <input type="number" value={config.minsPerRotation} min={5} max={20}
                        onChange={e => updateConfig('minsPerRotation', parseInt(e.target.value) || 12)}
                        style={{ padding: '4px 6px', borderRadius: 4, border: 'none', fontSize: 11, fontFamily: F, fontWeight: 600, width: 45 }}
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <label style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontFamily: F, fontWeight: 700 }}>ROTATIONS</label>
                    <input type="number" value={config.rotations} min={2} max={8}
                        onChange={e => updateConfig('rotations', parseInt(e.target.value) || 4)}
                        style={{ padding: '4px 6px', borderRadius: 4, border: 'none', fontSize: 11, fontFamily: F, fontWeight: 600, width: 45 }}
                    />
                </div>
                <div style={{ flex: 1 }} />
                <div style={{ display: 'flex', gap: 6 }}>
                    {saving && <div style={{ fontSize: 9, color: B.amb, fontFamily: F, fontWeight: 600, alignSelf: 'center' }}>Saving...</div>}
                    {!saving && lastSaved && <div style={{ fontSize: 9, color: B.grn, fontFamily: F, fontWeight: 600, alignSelf: 'center' }}>✓ Saved</div>}
                </div>
            </div>

            {/* Actions */}
            <div style={{ padding: '8px 12px', display: 'flex', gap: 6, flexWrap: 'wrap', borderBottom: `1px solid ${B.g200}` }}>
                <button onClick={autoGenerate} style={{
                    padding: '8px 14px', borderRadius: 8, border: 'none',
                    background: `linear-gradient(135deg,${B.org},${B.amb})`,
                    color: B.w, fontSize: 11, fontWeight: 700, fontFamily: F, cursor: 'pointer',
                }}>⚡ Auto-Generate</button>
                {hasRotations && (
                    <button onClick={() => savePlan(rotations, config)} style={{
                        padding: '8px 14px', borderRadius: 8, border: `1px solid ${B.grn}`,
                        background: 'transparent', color: B.grn, fontSize: 11, fontWeight: 700,
                        fontFamily: F, cursor: 'pointer',
                    }}>Save Plan</button>
                )}
                {hasRotations && (
                    <button onClick={printRotations} style={{
                        padding: '8px 14px', borderRadius: 8, border: '1px solid #8B5CF6',
                        background: 'transparent', color: '#8B5CF6', fontSize: 11, fontWeight: 700,
                        fontFamily: F, cursor: 'pointer',
                    }}>Print / PDF</button>
                )}
                <div style={{ flex: 1 }} />
                <div style={{ fontSize: 10, color: B.g400, fontFamily: F, alignSelf: 'center' }}>
                    {activePlayers.length} players {config.rotations} rotations {config.minsPerRotation}min each
                </div>
            </div>

            {/* Player management row */}
            <details style={{ padding: '0 12px', borderBottom: `1px solid ${B.g200}` }}>
                <summary style={{
                    padding: '8px 0', fontSize: 10, fontWeight: 700, color: B.g600,
                    fontFamily: F, cursor: 'pointer', listStyle: 'none',
                    display: 'flex', alignItems: 'center', gap: 4,
                }}>
                    <span style={{ fontSize: 8, transform: 'rotate(90deg)', display: 'inline-block', transition: 'transform 0.2s' }}>▶</span>
                    👥 Manage Players ({activePlayers.length} active / {groupPlayers.length} total)
                </summary>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '4px 0 10px' }}>
                    {groupPlayers.map(p => {
                        const removed = removedPlayers.has(p.id);
                        return (
                            <button key={p.id} onClick={() => togglePlayer(p.id)} style={{
                                padding: '4px 8px', borderRadius: 6, border: 'none',
                                background: removed ? B.g100 : `${B.grn}15`,
                                color: removed ? B.g400 : B.g800,
                                fontSize: 9, fontWeight: 600, fontFamily: F, cursor: 'pointer',
                                textDecoration: removed ? 'line-through' : 'none',
                                opacity: removed ? 0.5 : 1,
                            }}>
                                {p.name?.split(' ')[0]} {p.name?.split(' ')[1]?.[0] || ''}
                            </button>
                        );
                    })}
                </div>
            </details>

            {/* ═══ ROTATION GRID ═══ */}
            {!hasRotations ? (
                <div style={{ padding: 40, textAlign: 'center' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: B.nvD, fontFamily: F, marginBottom: 8 }}>No Rotation Plan Yet</div>
                    <div style={{ fontSize: 12, color: B.g400, fontFamily: F, marginBottom: 20, lineHeight: 1.5 }}>
                        Tap "Auto-Generate" to create a rotation schedule for {activePlayers.length} players.
                    </div>
                    <button onClick={autoGenerate} style={{
                        padding: '14px 28px', borderRadius: 10, border: 'none',
                        background: `linear-gradient(135deg,${B.org},${B.amb})`,
                        color: B.w, fontSize: 14, fontWeight: 700, fontFamily: F, cursor: 'pointer',
                        boxShadow: `0 4px 16px ${B.org}30`,
                    }}>⚡ Auto-Generate Rotations</button>
                </div>
            ) : (
                <div style={{ padding: '8px 12px', ...dkWrap }}>
                    {/* Rotation toggle tabs */}
                    <div style={{ display: 'flex', gap: 4, marginBottom: 8, overflowX: 'auto' }}>
                        <button onClick={() => setViewRotation(null)}
                            style={{
                                padding: '6px 12px', borderRadius: 6, border: 'none',
                                background: viewRotation === null ? B.nvD : B.g100,
                                color: viewRotation === null ? B.w : B.g400,
                                fontSize: 10, fontWeight: 700, fontFamily: F, cursor: 'pointer',
                                whiteSpace: 'nowrap',
                            }}
                        >📊 Grid View</button>
                        {rotations.map((r, i) => (
                            <button key={i} onClick={() => setViewRotation(i)}
                                style={{
                                    padding: '6px 12px', borderRadius: 6, border: 'none',
                                    background: viewRotation === i ? B.nvD : B.g100,
                                    color: viewRotation === i ? B.w : B.g400,
                                    fontSize: 10, fontWeight: 700, fontFamily: F, cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                }}
                            >R{r.number} {rotTimes[i]?.start}</button>
                        ))}
                    </div>

                    {viewRotation === null ? (
                        /* ═══ GRID VIEW — all rotations ═══ */
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: _isDesktop ? `repeat(${Math.min(rotations.length, 4)}, 1fr)` : '1fr',
                            gap: 8,
                        }}>
                            {rotations.map((rot, ri) => (
                                <div key={ri} style={{
                                    background: B.w, borderRadius: 10, border: `1px solid ${B.g200}`,
                                    overflow: 'hidden',
                                }}>
                                    <div style={{
                                        padding: '8px 10px', ...sGrad,
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    }}>
                                        <div>
                                            <div style={{ fontSize: 12, fontWeight: 800, color: B.w, fontFamily: F }}>Rotation {rot.number}</div>
                                            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', fontFamily: F }}>{rotTimes[ri]?.start} — {rotTimes[ri]?.end}</div>
                                        </div>
                                        <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', fontFamily: F }}>
                                            {rot.nets.length + rot.bowling.length + rot.machines.length} players
                                        </div>
                                    </div>
                                    <div style={{ padding: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        {ZONES.map(z => (
                                            <ZoneCell
                                                key={z.id}
                                                rotationIdx={ri}
                                                zone={z}
                                                playerIds={rot[z.id] || []}
                                                zoneDef={z}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* ═══ SINGLE ROTATION VIEW ═══ */
                        (() => {
                            const rot = rotations[viewRotation];
                            if (!rot) return null;
                            return (
                                <div>
                                    <div style={{
                                        padding: '12px', ...sGrad, borderRadius: 10, marginBottom: 10,
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    }}>
                                        <div>
                                            <div style={{ fontSize: 18, fontWeight: 900, color: B.w, fontFamily: F }}>Rotation {rot.number}</div>
                                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: F }}>
                                                {rotTimes[viewRotation]?.start} — {rotTimes[viewRotation]?.end}
                                                {' '}({config.minsPerRotation} mins)
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: 24, fontWeight: 900, color: B.w, fontFamily: F }}>
                                                {rot.nets.length + rot.bowling.length + rot.machines.length}
                                            </div>
                                            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontFamily: F }}>players</div>
                                        </div>
                                    </div>

                                    {ZONES.map(z => {
                                        const pids = rot[z.id] || [];
                                        return (
                                            <div key={z.id} style={{ marginBottom: 10 }}>
                                                <div style={{
                                                    fontSize: 11, fontWeight: 800, color: z.color, fontFamily: F,
                                                    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6,
                                                    display: 'flex', alignItems: 'center', gap: 6,
                                                    justifyContent: 'space-between',
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <div style={{ width: 3, height: 14, borderRadius: 2, background: z.color }} />
                                                        {z.icon} {z.label}
                                                    </div>
                                                    <span style={{ fontSize: 9, fontWeight: 700, color: pids.length > z.cap ? B.red : B.g400 }}>{pids.length}/{z.cap}</span>
                                                </div>
                                                <div style={{
                                                    background: B.w, borderRadius: 10, padding: 8,
                                                    border: `1px solid ${B.g200}`,
                                                    display: 'flex', flexDirection: 'column', gap: 4,
                                                }}>
                                                    {pids.map((pid, i) => {
                                                        const p = playerMap[pid];
                                                        if (!p) return null;
                                                        const isSelected = selected?.playerId === pid;
                                                        return (
                                                            <div key={pid}
                                                                onClick={() => handleTapSlot(viewRotation, z.id, i, pid)}
                                                                style={{
                                                                    display: 'flex', alignItems: 'center', gap: 8,
                                                                    padding: '6px 10px', borderRadius: 6,
                                                                    background: isSelected ? `${z.color}15` : B.g50,
                                                                    border: isSelected ? `2px solid ${z.color}` : '1px solid transparent',
                                                                    cursor: 'pointer', transition: 'all 0.15s',
                                                                }}
                                                            >
                                                                <div style={{
                                                                    width: 20, height: 20, borderRadius: '50%',
                                                                    background: z.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    flexShrink: 0,
                                                                }}>
                                                                    <span style={{ fontSize: 9, fontWeight: 800, color: B.w, fontFamily: F }}>{i + 1}</span>
                                                                </div>
                                                                <div style={{ flex: 1 }}>
                                                                    <div style={{ fontSize: 12, fontWeight: 700, color: B.nvD, fontFamily: F }}>{p.name}</div>
                                                                    <div style={{ fontSize: 9, color: B.g400, fontFamily: F }}>
                                                                        {getAge(p.dob)}yo • {getBracket(p.dob)} • {ROLES.find(r => r.id === p.role)?.sh || '?'}
                                                                    </div>
                                                                </div>
                                                                {onAssessPlayer && (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); onAssessPlayer(pid); }}
                                                                        style={{
                                                                            padding: '5px 10px', borderRadius: 6, border: 'none',
                                                                            background: `linear-gradient(135deg,${B.bl},${B.pk})`,
                                                                            color: B.w, fontSize: 9, fontWeight: 700, fontFamily: F,
                                                                            cursor: 'pointer',
                                                                        }}
                                                                    >Assess →</button>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                    {selected && pids.length < z.cap && (
                                                        <div
                                                            onClick={() => handleTapSlot(viewRotation, z.id, pids.length, null)}
                                                            style={{
                                                                padding: '8px 10px', borderRadius: 6,
                                                                border: `1.5px dashed ${z.color}40`, textAlign: 'center',
                                                                fontSize: 10, color: z.color, fontFamily: F, fontWeight: 600,
                                                                cursor: 'pointer',
                                                            }}
                                                        >+ Drop {playerMap[selected.playerId]?.name?.split(' ')[0]} here</div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()
                    )}

                    {/* Batting audit */}
                    {hasRotations && (
                        <div style={{ marginTop: 12, marginBottom: 20, padding: 10, background: B.w, borderRadius: 10, border: `1px solid ${B.g200}` }}>
                            <div style={{ fontSize: 10, fontWeight: 800, color: B.grn, fontFamily: F, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>
                                ✅ BATTING AUDIT
                            </div>
                            {(() => {
                                const batCounts = {};
                                activePlayers.forEach(p => { batCounts[p.id] = 0; });
                                rotations.forEach(r => {
                                    r.nets.forEach(pid => { batCounts[pid] = (batCounts[pid] || 0) + 1; });
                                });
                                const noBat = activePlayers.filter(p => !batCounts[p.id]);
                                const multiBat = activePlayers.filter(p => batCounts[p.id] > 1);

                                return (
                                    <div style={{ fontSize: 10, color: B.g600, fontFamily: F, lineHeight: 1.6 }}>
                                        <div>🏏 <strong>{activePlayers.length - noBat.length}</strong>/{activePlayers.length} players bat at least once</div>
                                        {noBat.length > 0 && (
                                            <div style={{ color: B.red }}>
                                                ⚠️ Not batting: {noBat.map(p => p.name?.split(' ')[0]).join(', ')}
                                            </div>
                                        )}
                                        {multiBat.length > 0 && (
                                            <div style={{ color: B.amb }}>
                                                🔄 Double bat: {multiBat.map(p => p.name?.split(' ')[0]).join(', ')}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                </div>
            )}

            {/* Pulse animation */}
            <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.7; } }`}</style>
        </div>
    );
}
