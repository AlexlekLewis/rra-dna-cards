// ═══ useAutoSave — Debounced auto-save with retry + localStorage fallback ═══
import { useEffect, useRef, useCallback } from 'react';

/**
 * Auto-saves data on change with configurable debounce, retry, and localStorage fallback.
 *
 * @param {string}   key       - Unique key for localStorage fallback (e.g. 'rra_draft_<userId>')
 * @param {object}   data      - The data to save (will be deep-compared by JSON.stringify)
 * @param {function} saveFn    - async (data) => void — the Supabase save function
 * @param {object}   opts
 * @param {number}   opts.delay       - Debounce delay in ms (default: 2000)
 * @param {number}   opts.maxRetries  - Max retry attempts (default: 3)
 * @param {object}   opts.saveStatus  - { setSaving, setSaved, setError, setOffline } from useSaveStatus
 * @param {boolean}  opts.enabled     - Whether auto-save is active (default: true)
 */
export function useAutoSave(key, data, saveFn, opts = {}) {
    const { delay = 2000, maxRetries = 3, saveStatus, enabled = true } = opts;
    const timerRef = useRef(null);
    const retriesRef = useRef(0);
    const lastSavedRef = useRef(null);
    const dataRef = useRef(data);
    dataRef.current = data;

    // ── Save with retry ──
    const doSave = useCallback(async (d) => {
        if (!saveFn) return;
        saveStatus?.setSaving?.();

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                await saveFn(d);
                lastSavedRef.current = JSON.stringify(d);
                retriesRef.current = 0;
                saveStatus?.setSaved?.();

                // Clear localStorage draft on successful save
                try { localStorage.removeItem(key); } catch { }
                return;
            } catch (err) {
                console.warn(`Auto-save attempt ${attempt + 1} failed:`, err.message);
                if (attempt < maxRetries) {
                    // Exponential backoff: 1s, 2s, 4s
                    await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
                }
            }
        }

        // All retries exhausted — save to localStorage as fallback
        try {
            localStorage.setItem(key, JSON.stringify(d));
            saveStatus?.setOffline?.();
        } catch {
            saveStatus?.setError?.('Save failed — please check your connection');
        }
    }, [key, saveFn, maxRetries, saveStatus]);

    // ── Debounced trigger ──
    useEffect(() => {
        if (!enabled) return;
        const serialized = JSON.stringify(data);
        if (serialized === lastSavedRef.current) return; // No change

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => doSave(data), delay);

        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, [data, delay, doSave, enabled]);

    // ── beforeunload guard ──
    useEffect(() => {
        const handler = (e) => {
            const serialized = JSON.stringify(dataRef.current);
            if (serialized !== lastSavedRef.current) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes.';
                // Emergency save to localStorage
                try { localStorage.setItem(key, JSON.stringify(dataRef.current)); } catch { }
            }
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [key]);

    // ── Flush: force immediate save ──
    const flush = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        return doSave(dataRef.current);
    }, [doSave]);

    // ── Load draft from localStorage ──
    const loadDraft = useCallback(() => {
        try {
            const stored = localStorage.getItem(key);
            return stored ? JSON.parse(stored) : null;
        } catch { return null; }
    }, [key]);

    // ── Clear draft ──
    const clearDraft = useCallback(() => {
        try { localStorage.removeItem(key); } catch { }
    }, [key]);

    return { flush, loadDraft, clearDraft };
}
