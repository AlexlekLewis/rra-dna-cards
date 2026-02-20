// ═══ PROGRAM DB — Data access layer for Elite Program tables ═══
import { supabase } from '../supabaseClient';

// ─── PROGRAMS ───

export async function loadPrograms() {
    const { data, error } = await supabase
        .from('programs')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
}

export async function loadProgram(id) {
    const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('id', id)
        .single();
    if (error) throw error;
    return data;
}

export async function createProgram({ name, slug, season, start_date }, userId) {
    const { data, error } = await supabase
        .from('programs')
        .insert({ name, slug, season, start_date, created_by: userId })
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function updateProgram(id, updates) {
    const { data, error } = await supabase
        .from('programs')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function toggleProgramLock(id, locked, userId) {
    return updateProgram(id, {
        edit_locked: locked,
        locked_by: locked ? userId : null,
        locked_at: locked ? new Date().toISOString() : null,
    });
}

// ─── PROGRAM WEEK BLOCKS ───

export async function loadWeekBlocks(programId) {
    const { data, error } = await supabase
        .from('program_week_blocks')
        .select('*')
        .eq('program_id', programId)
        .order('sort_order')
        .order('week_start');
    if (error) throw error;
    return data || [];
}

export async function upsertWeekBlock(block) {
    const { data, error } = await supabase
        .from('program_week_blocks')
        .upsert({ ...block, updated_at: new Date().toISOString() })
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function deleteWeekBlock(id) {
    const { error } = await supabase
        .from('program_week_blocks')
        .delete()
        .eq('id', id);
    if (error) throw error;
}

// ─── FACILITY ZONES ───

export async function loadFacilityZones() {
    const { data, error } = await supabase
        .from('facility_zones')
        .select('*')
        .order('sort_order');
    if (error) throw error;
    return data || [];
}

// ─── DRILLS (Activity Cards) ───

export async function loadDrills(filters = {}) {
    let q = supabase
        .from('drills')
        .select('*')
        .eq('archived', false)
        .order('name');

    if (filters.discipline) q = q.eq('discipline', filters.discipline);
    if (filters.category) q = q.eq('category', filters.category);
    if (filters.difficulty) q = q.eq('difficulty', filters.difficulty);

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
}

export async function loadDrill(id) {
    const { data, error } = await supabase
        .from('drills')
        .select('*')
        .eq('id', id)
        .single();
    if (error) throw error;
    return data;
}

export async function saveDrill(drill, userId) {
    const payload = { ...drill, updated_at: new Date().toISOString() };
    if (!drill.id) {
        payload.created_by = userId;
        const { data, error } = await supabase.from('drills').insert(payload).select().single();
        if (error) throw error;
        return data;
    } else {
        const { data, error } = await supabase.from('drills').update(payload).eq('id', drill.id).select().single();
        if (error) throw error;
        return data;
    }
}

export async function archiveDrill(id) {
    return supabase.from('drills').update({ archived: true, updated_at: new Date().toISOString() }).eq('id', id);
}

// ─── SESSIONS ───

export async function loadSessions(programId) {
    const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('program_id', programId)
        .order('week_number')
        .order('session_number');
    if (error) throw error;
    return data || [];
}

export async function saveSession(session, userId) {
    const payload = { ...session, updated_at: new Date().toISOString() };
    if (!session.id) {
        payload.created_by = userId;
        const { data, error } = await supabase.from('sessions').insert(payload).select().single();
        if (error) throw error;
        return data;
    } else {
        const { data, error } = await supabase.from('sessions').update(payload).eq('id', session.id).select().single();
        if (error) throw error;
        return data;
    }
}

export async function deleteSession(id) {
    const { error } = await supabase.from('sessions').delete().eq('id', id);
    if (error) throw error;
}

// ─── SESSION ACTIVITIES ───

export async function loadSessionActivities(sessionId) {
    const { data, error } = await supabase
        .from('session_activities')
        .select('*, drills(*)')
        .eq('session_id', sessionId)
        .order('sort_order');
    if (error) throw error;
    return data || [];
}

export async function saveSessionActivity(activity) {
    if (!activity.id) {
        const { data, error } = await supabase.from('session_activities').insert(activity).select().single();
        if (error) throw error;
        return data;
    } else {
        const { data, error } = await supabase.from('session_activities').update(activity).eq('id', activity.id).select().single();
        if (error) throw error;
        return data;
    }
}

export async function deleteSessionActivity(id) {
    const { error } = await supabase.from('session_activities').delete().eq('id', id);
    if (error) throw error;
}

export async function reorderSessionActivities(sessionId, orderedIds) {
    const updates = orderedIds.map((id, i) =>
        supabase.from('session_activities').update({ sort_order: i }).eq('id', id)
    );
    await Promise.all(updates);
}
