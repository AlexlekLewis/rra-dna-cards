import { useState, useMemo } from "react";
import {
    createSquadGroup,
    updateSquadGroup,
    deleteSquadGroup,
    allocatePlayerToSquad,
    removePlayerFromSquad,
    assignCoachToSquad,
    removeCoachFromSquad
} from "../db/adminDb";
import { B, F, sGrad, dkWrap } from "../data/theme";

export default function SquadManager({ squads, allocations, members, refresh, showToast, session }) {
    const [newSquadName, setNewSquadName] = useState("");
    const [saving, setSaving] = useState(false);

    // Identify players and coaches
    const activePlayers = useMemo(() => members.filter(m => m.role === 'player' && m.active !== false), [members]);
    const coaches = useMemo(() => members.filter(m => m.role === 'coach' || m.role === 'admin' || m.role === 'super_admin'), [members]);

    const unassignedPlayers = useMemo(() => {
        const allocatedIds = new Set(allocations.map(a => a.player_id));
        return activePlayers.filter(p => !allocatedIds.has(p.id)).sort((a, b) => a.name.localeCompare(b.name));
    }, [activePlayers, allocations]);

    const handleCreateSquad = async () => {
        if (!newSquadName.trim()) return;
        setSaving(true);
        try {
            await createSquadGroup(newSquadName.trim(), null, 20);
            showToast("Squad created");
            setNewSquadName("");
            await refresh();
        } catch (e) {
            console.error(e);
            showToast("Failed to create squad", "error");
        }
        setSaving(false);
    };

    const handleDeleteSquad = async (squadId) => {
        if (!window.confirm("Delete this squad? All player allocations will be removed.")) return;
        setSaving(true);
        try {
            await deleteSquadGroup(squadId);
            showToast("Squad deleted");
            await refresh();
        } catch (e) {
            console.error(e);
            showToast("Failed to delete squad", "error");
        }
        setSaving(false);
    };

    const handleAssignPlayer = async (squadId, playerId) => {
        setSaving(true);
        try {
            await allocatePlayerToSquad(squadId, playerId, session?.user?.id, "Admin assignment relative to Phase 3");
            await refresh();
        } catch (e) {
            console.error(e);
            showToast("Failed to assign player", "error");
        }
        setSaving(false);
    };

    const handleRemovePlayer = async (playerId) => {
        setSaving(true);
        try {
            await removePlayerFromSquad(playerId);
            await refresh();
        } catch (e) {
            console.error(e);
            showToast("Failed to remove player", "error");
        }
        setSaving(false);
    };

    const handleAssignCoach = async (squadId, coachId, role) => {
        if (!coachId) return;
        setSaving(true);
        try {
            await assignCoachToSquad(squadId, coachId, role);
            showToast(`Coach assigned to squad`);
            await refresh();
        } catch (e) {
            console.error(e);
            showToast("Failed to assign coach", "error");
        }
        setSaving(false);
    };

    const handleRemoveCoach = async (squadId, coachId) => {
        setSaving(true);
        try {
            await removeCoachFromSquad(squadId, coachId);
            showToast("Coach removed");
            await refresh();
        } catch (e) {
            console.error(e);
            showToast("Failed to remove coach", "error");
        }
        setSaving(false);
    };

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', gap: 24, padding: 20 }}>
            <div style={{ flex: 1 }}>
                <div style={{ ...dkWrap, marginBottom: 24 }}>
                    <h3 style={{ margin: '0 0 16px', color: F.w }}>Create New Squad</h3>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <input
                            type="text"
                            value={newSquadName}
                            onChange={e => setNewSquadName(e.target.value)}
                            placeholder="e.g. U16 Academy"
                            style={{ flex: 1, padding: '10px 14px', borderRadius: 6, border: `1px solid ${B.b}`, background: B.dk, color: F.w }}
                        />
                        <button
                            onClick={handleCreateSquad}
                            disabled={saving || !newSquadName.trim()}
                            style={{ padding: '0 20px', background: F.RR, color: F.w, border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
                        >
                            Create
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {squads.map(sq => {
                        const sqPlayers = allocations.filter(a => a.squad_id === sq.id).map(a => activePlayers.find(p => p.id === a.player_id)).filter(Boolean);
                        const sqCoaches = sq.coach_squad_access || [];
                        const headCoach = sqCoaches.find(c => c.role === 'squad_coach');
                        const hcd = coaches.find(c => c.id === headCoach?.coach_id);

                        return (
                            <div key={sq.id} style={dkWrap}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                    <h3 style={{ margin: 0, color: F.w, fontSize: 20 }}>{sq.name || sq.group_name}</h3>
                                    <button onClick={() => handleDeleteSquad(sq.id)} style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer' }}>Delete</button>
                                </div>

                                <div style={{ marginBottom: 20, padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <span style={{ color: F.a1, fontSize: 12, textTransform: 'uppercase' }}>Head Coach</span>
                                            <div style={{ color: F.w, fontWeight: 500 }}>
                                                {hcd ? hcd.name : <span style={{ color: '#ffcc00' }}>Unassigned</span>}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <select
                                                onChange={(e) => handleAssignCoach(sq.id, e.target.value, 'squad_coach')}
                                                value=""
                                                style={{ padding: '6px 10px', borderRadius: 4, background: B.dk, color: F.w, border: `1px solid ${B.b}` }}
                                            >
                                                <option value="" disabled>Assign Coach...</option>
                                                {coaches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                            {hcd && (
                                                <button onClick={() => handleRemoveCoach(sq.id, hcd.id)} style={{ padding: '6px 10px', background: 'rgba(255,0,0,0.1)', color: '#ff4444', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Remove</button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                        <span style={{ color: F.w, fontWeight: 500 }}>Roster ({sqPlayers.length})</span>
                                        <select
                                            onChange={(e) => handleAssignPlayer(sq.id, e.target.value)}
                                            value=""
                                            style={{ padding: '6px 10px', borderRadius: 4, background: B.dk, color: F.w, border: `1px solid ${B.b}`, width: 180 }}
                                        >
                                            <option value="" disabled>Add Player...</option>
                                            {unassignedPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                    <div style={{ background: B.dk, border: `1px solid ${B.b}`, borderRadius: 6, maxHeight: 300, overflowY: 'auto' }}>
                                        {sqPlayers.length === 0 ? (
                                            <div style={{ padding: 16, textAlign: 'center', color: F.a1, fontSize: 14 }}>No players assigned</div>
                                        ) : (
                                            sqPlayers.map((p, i) => (
                                                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: i < sqPlayers.length - 1 ? `1px solid ${B.b}` : 'none' }}>
                                                    <span style={{ color: F.w }}>{p.name}</span>
                                                    <button onClick={() => handleRemovePlayer(p.id)} style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: 12 }}>Remove</button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div style={{ width: 340 }}>
                <div style={dkWrap}>
                    <h3 style={{ margin: '0 0 16px', color: F.w }}>Unassigned Players ({unassignedPlayers.length})</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 600, overflowY: 'auto' }}>
                        {unassignedPlayers.length === 0 ? (
                            <div style={{ color: F.a1, fontSize: 13, textAlign: 'center', padding: 20 }}>All active players are mapped to a squad.</div>
                        ) : (
                            unassignedPlayers.map(p => (
                                <div key={p.id} style={{ padding: '10px 12px', background: B.dk, border: `1px solid ${B.b}`, borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: F.w, fontSize: 14 }}>{p.name}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
