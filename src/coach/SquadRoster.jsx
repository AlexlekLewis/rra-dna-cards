import { useState, useEffect, useMemo } from "react";
import { supabase } from "../supabaseClient";
import SquadSessionView from "./SquadSessionView";

// ═══ SQUAD ROSTER COMPONENT ═══
// This is the coach's view of their assigned squad(s) and players.

export default function SquadRoster({
    session,
    players,
    onSelectPlayer,
    onOpenDashboard,
    B, F, sGrad
}) {
    const [squads, setSquads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Sub-view state for managing a specific squad's session
    const [managingSquad, setManagingSquad] = useState(null);

    useEffect(() => {
        if (!session?.user?.id) return;

        async function fetchCoachSquads() {
            setLoading(true);
            try {
                // Fetch squads where this coach has access
                const { data: accessData, error: accessErr } = await supabase
                    .from('coach_squad_access')
                    .select(`
                        role,
                        squad_groups (
                            id, name, description, target_size,
                            squad_allocations ( player_id )
                        )
                    `)
                    .eq('coach_id', session.user.id);

                if (accessErr) throw accessErr;

                // Format the data
                const formattedSquads = accessData.map(a => ({
                    id: a.squad_groups.id,
                    name: a.squad_groups.name,
                    description: a.squad_groups.description,
                    target_size: a.squad_groups.target_size,
                    coachRole: a.role,
                    playerIds: a.squad_groups.squad_allocations.map(alloc => alloc.player_id)
                }));

                setSquads(formattedSquads);
            } catch (err) {
                console.error("Error fetching coach squads:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchCoachSquads();
    }, [session]);

    if (loading) {
        return <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.4)", fontFamily: F }}>Loading your squads...</div>;
    }

    if (error) {
        return <div style={{ padding: 40, textAlign: "center", color: B.pk, fontFamily: F }}>Error: {error}</div>;
    }

    if (squads.length === 0) {
        return (
            <div style={{ padding: 40, textAlign: "center", fontFamily: F }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: B.w, marginBottom: 8 }}>No Squads Assigned</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>You haven't been assigned to any squads yet. Please contact an administrator.</div>
            </div>
        );
    }

    const cardDk = {
        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12, padding: 20, marginBottom: 16
    };

    return (
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: 20, fontFamily: F }}>
            {managingSquad ? (
                <SquadSessionView
                    userSession={session}
                    squad={managingSquad}
                    squadPlayers={players.filter(p => managingSquad.playerIds.includes(p.id))}
                    onBack={() => setManagingSquad(null)}
                    B={B} F={F} sGrad={sGrad}
                />
            ) : (
                <>
                    <h2 style={{ color: B.w, marginBottom: 24, fontSize: 24, fontWeight: 900 }}>My Squads</h2>

                    {squads.map(squad => {
                        // Match player IDs to the full player objects
                        const squadPlayers = players.filter(p => squad.playerIds.includes(p.id));

                        return (
                            <div key={squad.id} style={cardDk}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                    <div>
                                        <h3 style={{ margin: 0, color: B.w, fontSize: 20 }}>{squad.name}</h3>
                                        {squad.description && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>{squad.description}</div>}
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                            <div>
                                                <div style={{ fontSize: 11, fontWeight: 700, color: B.bl, textTransform: 'uppercase', letterSpacing: 1 }}>{squad.coachRole.replace('_', ' ')}</div>
                                                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>{squadPlayers.length} / {squad.target_size || '-'} Players</div>
                                            </div>
                                            <button
                                                onClick={() => setManagingSquad(squad)}
                                                style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: B.bl, color: B.w, cursor: "pointer", fontFamily: F, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}
                                            >
                                                Manage Session
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {squadPlayers.length > 0 ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                                        {squadPlayers.map(p => (
                                            <div key={p.id} style={{
                                                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
                                                borderRadius: 8, padding: 12, display: 'flex', alignItems: 'center', gap: 12
                                            }}>
                                                <div style={{ width: 40, height: 40, borderRadius: "50%", ...sGrad, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                                    <span style={{ color: B.w, fontSize: 14, fontWeight: 800 }}>{(p.name || "?").substring(0, 2).toUpperCase()}</span>
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: 14, fontWeight: 700, color: B.w, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                                                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{p.role || "Unassigned Role"}</div>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                    <button onClick={() => onSelectPlayer(p.id)} style={{
                                                        background: B.pk, color: B.w, border: 'none', borderRadius: 6,
                                                        padding: '4px 10px', fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: F
                                                    }}>Score</button>
                                                    <button onClick={() => onOpenDashboard(p.id)} style={{
                                                        background: "rgba(255,255,255,0.1)", color: B.w, border: 'none', borderRadius: 6,
                                                        padding: '4px 10px', fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: F
                                                    }}>Profile</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ padding: 20, textAlign: "center", background: "rgba(255,255,255,0.01)", borderRadius: 8, border: "1px dashed rgba(255,255,255,0.1)" }}>
                                        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>No players assigned to this squad yet.</div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </>
            )}
        </div>
    );
}
