import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import {
    signInWithUsername,
    signOut as authSignOut,
    getSession,
    onAuthStateChange,
    upsertUserProfile,
    loadUserProfile
} from "../auth/authHelpers";

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [session, setSession] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [authStep, setAuthStep] = useState('login'); // 'login' | 'signing-in'

    useEffect(() => {
        let cancelled = false;

        const resolveProfile = async (user) => {
            const profilePromise = (async () => {
                try {
                    return await upsertUserProfile(user);
                } catch (e) {
                    console.warn('upsertUserProfile failed, trying load:', e.message);
                    try { return await loadUserProfile(user.id); } catch { return null; }
                }
            })();
            const timeout = new Promise(r => setTimeout(() => r(null), 5000));
            return Promise.race([profilePromise, timeout]);
        };

        const buildFallbackProfile = (user) => {
            const role = localStorage.getItem('rra_pending_role') || localStorage.getItem('rra_user_role');
            if (role) return { id: user.id, role };
            return null;
        };

        const sessionPromise = getSession();
        const timeoutPromise = new Promise(r => setTimeout(() => r(null), 1500));

        Promise.race([sessionPromise, timeoutPromise]).then(async (s) => {
            if (cancelled) return;
            if (s?.user) {
                setSession(s);
                const profile = await resolveProfile(s.user);
                if (!cancelled) setUserProfile(profile || buildFallbackProfile(s.user));
            }
            if (!cancelled) setAuthLoading(false);
        }).catch((e) => {
            console.error('Auth init error:', e);
            if (!cancelled) setAuthLoading(false);
        });

        const sub = onAuthStateChange(async (event, s) => {
            if (cancelled) return;
            setSession(s);

            if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && s?.user) {
                const fallback = buildFallbackProfile(s.user);
                if (!cancelled && fallback) setUserProfile(fallback);
                if (!cancelled) setAuthStep('login');

                const profile = await resolveProfile(s.user);
                if (!cancelled && profile) setUserProfile(profile);
                if (!cancelled) setAuthLoading(false);
            }

            if (event === 'SIGNED_OUT') {
                setUserProfile(null);
                setAuthStep('login');
            }
        });

        return () => { cancelled = true; sub.unsubscribe(); };
    }, []);

    const signIn = async (username, password) => {
        setAuthStep('signing-in');
        try {
            return await signInWithUsername(username, password);
        } catch (e) {
            setAuthStep('login');
            throw e;
        }
    };

    const signOut = async () => {
        try {
            ['rra_pStep', 'rra_selP', 'rra_cView', 'rra_cPage'].forEach(k => sessionStorage.removeItem(k));
            await authSignOut();
        } catch (e) {
            console.error('Sign-out error:', e);
        }
    };

    // Derive portal from role (default to role if valid, else null)
    const portal = userProfile?.role || null;

    // Admin access determined solely by DB role in user_profiles
    const isAdmin =
        userProfile?.role === 'admin' ||
        userProfile?.role === 'super_admin';

    const value = {
        session,
        userProfile,
        authLoading,
        authStep,
        setAuthStep,
        portal,
        isAdmin,
        signIn,
        signOut
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
