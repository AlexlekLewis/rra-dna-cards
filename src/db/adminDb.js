// ═══ ADMIN DATA ACCESS LAYER ═══
// All Supabase operations for the admin dashboard.
import { supabase } from '../supabaseClient';

// ──────────────────────────────────
// ENGINE CONSTANTS
// ──────────────────────────────────
export async function loadEngineConstants() {
    const { data, error } = await supabase.from('engine_constants').select('*');
    if (error) throw error;
    return data;
}

export async function updateEngineConstant(constantKey, newValue) {
    const { error } = await supabase
        .from('engine_constants')
        .update({ value: String(newValue) })
        .eq('constant_key', constantKey);
    if (error) throw error;
}

// ──────────────────────────────────
// DOMAIN WEIGHTS
// ──────────────────────────────────
export async function loadDomainWeights() {
    const { data, error } = await supabase.from('domain_weights').select('*');
    if (error) throw error;
    return data;
}

export async function updateDomainWeights(roleId, weights) {
    // weights: { technical_weight, game_iq_weight, mental_weight, physical_weight, phase_weight }
    const { error } = await supabase
        .from('domain_weights')
        .update(weights)
        .eq('role_id', roleId);
    if (error) throw error;
}

// ──────────────────────────────────
// COMPETITION TIERS
// ──────────────────────────────────
export async function loadCompetitionTiers() {
    const { data, error } = await supabase
        .from('competition_tiers')
        .select('*')
        .order('cti_value', { ascending: false });
    if (error) throw error;
    return data;
}

export async function updateCompetitionTier(code, updates) {
    const { error } = await supabase
        .from('competition_tiers')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('code', code);
    if (error) throw error;
}

// ──────────────────────────────────
// SQUAD GROUPS
// ──────────────────────────────────
export async function loadSquadGroups() {
    const { data, error } = await supabase
        .from('squad_groups')
        .select('*')
        .order('sort_order');
    if (error) throw error;
    return data;
}

export async function createSquadGroup(name, description, targetSize) {
    const { data, error } = await supabase
        .from('squad_groups')
        .insert({ name, description, target_size: targetSize })
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function updateSquadGroup(id, updates) {
    const { error } = await supabase
        .from('squad_groups')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
    if (error) throw error;
}

export async function deleteSquadGroup(id) {
    const { error } = await supabase.from('squad_groups').delete().eq('id', id);
    if (error) throw error;
}

// ──────────────────────────────────
// SQUAD ALLOCATIONS
// ──────────────────────────────────
export async function loadSquadAllocations() {
    const { data, error } = await supabase.from('squad_allocations').select('*');
    if (error) throw error;
    return data;
}

export async function allocatePlayerToSquad(squadId, playerId, allocatedBy, notes) {
    // Remove from any existing squad first, then assign
    await supabase.from('squad_allocations').delete().eq('player_id', playerId);
    const { data, error } = await supabase
        .from('squad_allocations')
        .insert({ squad_id: squadId, player_id: playerId, allocated_by: allocatedBy, notes })
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function removePlayerFromSquad(playerId) {
    const { error } = await supabase.from('squad_allocations').delete().eq('player_id', playerId);
    if (error) throw error;
}

// ──────────────────────────────────
// ANALYTICS QUERIES
// ──────────────────────────────────
export async function loadAnalyticsEvents(daysBack = 30) {
    const since = new Date(Date.now() - daysBack * 86400000).toISOString();
    const { data, error } = await supabase
        .from('analytics_events')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(5000);
    if (error) throw error;
    return data || [];
}

export async function loadLoginHistory(daysBack = 30) {
    const since = new Date(Date.now() - daysBack * 86400000).toISOString();
    const { data, error } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('event_type', 'login')
        .gte('created_at', since)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
}

// ──────────────────────────────────
// PROGRAM MEMBERS (read for admin)
// ──────────────────────────────────
export async function loadProgramMembers() {
    const { data, error } = await supabase
        .from('program_members')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
}

export async function updateProgramMember(id, updates) {
    const { error } = await supabase
        .from('program_members')
        .update(updates)
        .eq('id', id);
    if (error) throw error;
}

// ──────────────────────────────────
// USER PROFILES (for admin listing)
// ──────────────────────────────────
export async function loadAllUserProfiles() {
    const { data, error } = await supabase.from('user_profiles').select('*');
    if (error) throw error;
    return data || [];
}

// ──────────────────────────────────
// DELETED MEMBERS (30-day recovery)
// ──────────────────────────────────
export async function loadDeletedMembers() {
    const { data, error } = await supabase
        .from('deleted_members')
        .select('*')
        .order('deleted_at', { ascending: false });
    if (error) throw error;
    return data || [];
}
