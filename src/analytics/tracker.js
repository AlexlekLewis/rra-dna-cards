// ═══ ANALYTICS EVENT TRACKER ═══
// Lightweight module for logging user actions to the analytics_events table.
// Usage: trackEvent('page_view', { page: 'dashboard' })
// The session_id groups events within one browser session.

import { supabase } from '../supabaseClient';

// Generate a session ID once per tab (survives page reload within same tab)
const SESSION_ID = sessionStorage.getItem('rra_session_id') || (() => {
    const id = crypto.randomUUID();
    sessionStorage.setItem('rra_session_id', id);
    return id;
})();

// ═══ EVENT TYPES (constants for consistency) ═══
export const EVT = {
    LOGIN: 'login',
    LOGOUT: 'logout',
    PAGE_VIEW: 'page_view',
    SURVEY_START: 'survey_start',
    SURVEY_SUBMIT: 'survey_submit',
    ASSESSMENT_SAVE: 'assessment_save',
    DASHBOARD_OPEN: 'dashboard_open',
    ADMIN_OPEN: 'admin_dashboard_open',
    ENGINE_EDIT: 'engine_edit',
    SQUAD_EDIT: 'squad_edit',
    PLAYER_VIEW: 'player_view',
    EXPORT: 'export',
};

/**
 * Log an analytics event. Fire-and-forget — never blocks UI.
 * @param {string} eventType - One of EVT constants
 * @param {object} [detail={}] - Extra metadata (page, player_id, etc.)
 */
export async function trackEvent(eventType, detail = {}) {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return; // not logged in, skip

        await supabase.from('analytics_events').insert({
            user_id: session.user.id,
            event_type: eventType,
            event_detail: detail,
            session_id: SESSION_ID,
        });
    } catch (err) {
        // Analytics should never break the app
        console.warn('[analytics]', err.message);
    }
}
