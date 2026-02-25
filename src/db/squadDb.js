import { supabase } from '../supabaseClient';

/**
 * Load all squads, including their player allocations and coach access.
 */
export async function loadSquads() {
    const { data, error } = await supabase
        .from('squad_groups')
        .select(`
            id,
            group_name,
            program_id,
            squad_allocations ( id, player_id ),
            coach_squad_access ( id, coach_id, role )
        `)
        .order('group_name');

    if (error) throw error;
    return data || [];
}

/**
 * Create a new squad.
 */
export async function createSquad(groupName, programId = null) {
    const { data, error } = await supabase
        .from('squad_groups')
        .insert([{ group_name: groupName, program_id: programId }])
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Update an existing squad's name or metadata.
 */
export async function updateSquad(squadId, groupName) {
    const { data, error } = await supabase
        .from('squad_groups')
        .update({ group_name: groupName })
        .eq('id', squadId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Assign a player to a squad.
 */
export async function assignPlayerToSquad(squadId, playerId) {
    // Upsert or insert depending on if strict unique constraints exist
    const { data, error } = await supabase
        .from('squad_allocations')
        .insert([{ squad_id: squadId, player_id: playerId }])
        .select()
        .single();

    if (error && error.code !== '23505') throw error; // Ignore exact unique duplicate error
    return data;
}

/**
 * Remove a player from a squad.
 */
export async function removePlayerFromSquad(squadId, playerId) {
    const { error } = await supabase
        .from('squad_allocations')
        .delete()
        .match({ squad_id: squadId, player_id: playerId });

    if (error) throw error;
}

/**
 * Assign a coach to a squad with a specific role ('squad_coach' or 'cadet_coach').
 */
export async function assignCoachToSquad(squadId, coachId, role = 'squad_coach') {
    const { data, error } = await supabase
        .from('coach_squad_access')
        .upsert(
            { squad_id: squadId, coach_id: coachId, role },
            { onConflict: 'squad_id, coach_id' }
        )
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Remove a coach's access to a squad.
 */
export async function removeCoachFromSquad(squadId, coachId) {
    const { error } = await supabase
        .from('coach_squad_access')
        .delete()
        .match({ squad_id: squadId, coach_id: coachId });

    if (error) throw error;
}

/**
 * Get all squads a specific coach has access to.
 */
export async function getSquadsForCoach(coachId) {
    const { data, error } = await supabase
        .from('coach_squad_access')
        .select(`
            role,
            squad_groups (
                id,
                group_name,
                program_id,
                squad_allocations ( player_id )
            )
        `)
        .eq('coach_id', coachId);

    if (error) throw error;

    // Flatten the result slightly
    return (data || []).map(access => ({
        ...access.squad_groups,
        coach_role: access.role
    }));
}
