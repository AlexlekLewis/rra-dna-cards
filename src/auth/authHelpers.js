import { supabase } from '../supabaseClient';

/**
 * Sign in with username + password.
 * Looks up the username in program_members to get the internal email,
 * then authenticates via Supabase Auth.
 */
export async function signInWithUsername(username, password) {
    const cleanUsername = username.toLowerCase().trim();

    // Look up the member to verify they exist and are active
    const { data: member, error: lookupError } = await supabase
        .from('program_members')
        .select('auth_user_id, role, active')
        .eq('username', cleanUsername)
        .single();

    if (lookupError || !member) {
        throw new Error('Username not found. Please check your credentials.');
    }

    if (!member.active) {
        throw new Error('This account has been deactivated. Contact your program coordinator.');
    }

    // Store the role for post-login profile setup
    localStorage.setItem('rra_pending_role', member.role);

    // Sign in using the internal email
    const internalEmail = `${cleanUsername}@rra.internal`;
    const { data, error } = await supabase.auth.signInWithPassword({
        email: internalEmail,
        password,
    });

    if (error) {
        throw new Error('Invalid password. Please try again.');
    }

    return data;
}

/**
 * Sign out the current user.
 */
export async function signOut() {
    localStorage.removeItem('rra_pending_role');
    localStorage.removeItem('rra_user_role');
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

/**
 * Get the current session.
 */
export async function getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
}

/**
 * Subscribe to auth state changes.
 * Returns the unsubscribe function.
 */
export function onAuthStateChange(callback) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
    return subscription;
}

/**
 * Upsert a user profile record after sign-in.
 * Uses the pending role from localStorage if available,
 * otherwise falls back to existing profile role.
 */
export async function upsertUserProfile(user) {
    let role = localStorage.getItem('rra_pending_role');

    if (!role) {
        const { data: existing } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single();
        role = existing?.role || 'player';
    }

    const { data, error } = await supabase
        .from('user_profiles')
        .upsert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
            avatar_url: user.user_metadata?.avatar_url || '',
            role,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'id' })
        .select()
        .single();

    if (error) throw error;

    localStorage.setItem('rra_user_role', role);
    localStorage.removeItem('rra_pending_role');

    return data;
}

/**
 * Load the user profile from Supabase.
 */
export async function loadUserProfile(userId) {
    const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
}
