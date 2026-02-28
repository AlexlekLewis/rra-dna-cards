// ═══ RRA TRIAL DAY — Standalone App with Coach Login ═══
import { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { B, F, sGrad, LOGO, sCard } from './data/theme';
import { SESSIONS } from './data/rotationData';
import TrialAssessment from './coach/TrialAssessment';

// ═══ COACH ROSTER ═══
const COACHES = [
    { id: '11111111-1111-4111-8111-111111111111', name: 'Glenn', isAdmin: false },
    { id: '22222222-2222-4222-8222-222222222222', name: 'Alex L', isAdmin: true }, // Super Admin
    { id: '33333333-3333-4333-8333-333333333333', name: 'Alex T', isAdmin: false },
    { id: '44444444-4444-4444-8444-444444444444', name: 'Addy', isAdmin: false },
    { id: '55555555-5555-4555-8555-555555555555', name: 'Ikroop.D', isAdmin: false },
    { id: '66666666-6666-4666-8666-666666666666', name: 'Shen', isAdmin: false },
    { id: '77777777-7777-4777-8777-777777777777', name: 'Gomey', isAdmin: false },
    { id: '88888888-8888-4888-8888-888888888888', name: 'Ritin', isAdmin: false },
    { id: '99999999-9999-4999-8999-999999999999', name: 'Adam', isAdmin: false },
    { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'Zac', isAdmin: false },
    { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', name: 'Joel', isAdmin: false },
    { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', name: 'Andy', isAdmin: false },
    { id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', name: 'Sid', isAdmin: false },
];
const PASSWORD = 'RoyalsTrial26';

// ═══ BUILD PLAYER LIST FROM ROTATION SPREADSHEET ═══
// All 96 unique players across 3 sessions, each with a stable ID
function buildPlayersFromRotations() {
    const seen = new Map();
    let idx = 0;
    SESSIONS.forEach(session => {
        (session.players || []).forEach(p => {
            if (!seen.has(p.name)) {
                seen.set(p.name, {
                    id: `player-${idx++}`,
                    name: p.name,
                    dob: null,
                    role: null,
                    club: null,
                    submitted: true,
                    sessionId: session.id,
                    age: p.age,
                });
            }
        });
    });
    return Array.from(seen.values());
}

function getAge(dob) {
    if (!dob) return null;
    const parts = typeof dob === 'string' ? dob.split(/[\/\-]/) : null;
    if (!parts || parts.length < 3) return null;
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const year = parseInt(parts[2]);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    const birthDate = new Date(year, month, day);
    const now = new Date();
    let age = now.getFullYear() - birthDate.getFullYear();
    const m = now.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) age--;
    return age;
}

function getBracket(dob) {
    const age = getAge(dob);
    if (!age) return '?';
    if (age <= 13) return 'U11-U13';
    if (age <= 16) return 'U14-U16';
    if (age <= 19) return 'U17-U19';
    return 'U20+';
}

export default function App() {
    const [coach, setCoach] = useState(null);
    const [selectedCoachId, setSelectedCoachId] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [showPw, setShowPw] = useState(false);

    // Players come from the rotation spreadsheet — no Supabase needed
    const players = useMemo(() => buildPlayersFromRotations(), []);

    // Persist login in sessionStorage
    useEffect(() => {
        const saved = sessionStorage.getItem('rra-trial-coach');
        if (saved) {
            const c = COACHES.find(c => c.id === saved);
            if (c) setCoach(c);
        }
    }, []);

    const handleLogin = () => {
        setLoginError('');
        if (!selectedCoachId) { setLoginError('Please select your name'); return; }
        if (password !== PASSWORD) { setLoginError('Incorrect password'); return; }
        const c = COACHES.find(c => c.id === selectedCoachId);
        if (c) {
            setCoach(c);
            sessionStorage.setItem('rra-trial-coach', c.id);
        }
    };

    const handleLogout = () => {
        setCoach(null);
        setPassword('');
        setSelectedCoachId('');
        setShowPw(false);
        sessionStorage.removeItem('rra-trial-coach');
    };

    // ═══ LOGIN SCREEN ═══
    if (!coach) {
        return (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                minHeight: '100vh', fontFamily: F, background: B.g50,
            }}>
                <div style={{ width: '100%', maxWidth: 380, padding: 20 }}>
                    {/* Header */}
                    <div style={{ textAlign: 'center', marginBottom: 28 }}>
                        <img src={LOGO} alt="RRA" style={{ width: 70, height: 70, objectFit: 'contain', marginBottom: 12 }} />
                        <div style={{ fontSize: 22, fontWeight: 900, color: B.nvD, letterSpacing: 0.3 }}>RRA Trial Day</div>
                        <div style={{ fontSize: 11, color: B.g400, lineHeight: 1.5, marginTop: 4 }}>
                            Rajasthan Royals Academy Melbourne<br />Coach Assessment System
                        </div>
                    </div>

                    {/* Login Card */}
                    <div style={{
                        ...sCard, padding: 24,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: B.nvD, marginBottom: 16 }}>Coach Sign In</div>

                        {/* Coach selector */}
                        <div style={{ marginBottom: 14 }}>
                            <label style={{ fontSize: 10, fontWeight: 700, color: B.g600, marginBottom: 4, display: 'block', letterSpacing: 0.3, textTransform: 'uppercase' }}>Your Name</label>
                            <select
                                value={selectedCoachId}
                                onChange={e => { setSelectedCoachId(e.target.value); setLoginError(''); }}
                                style={{
                                    width: '100%', padding: '12px 14px', borderRadius: 10,
                                    border: `1.5px solid ${B.g200}`, fontSize: 14, fontWeight: 600,
                                    fontFamily: F, color: B.nvD, background: B.w,
                                    appearance: 'none', cursor: 'pointer',
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M6 8L1 3h10z' fill='%239CA3AF'/%3E%3C/svg%3E")`,
                                    backgroundRepeat: 'no-repeat',
                                    backgroundPosition: 'right 14px center',
                                }}
                            >
                                <option value="">Select your name...</option>
                                {COACHES.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}{c.isAdmin ? ' ⭐' : ''}</option>
                                ))}
                            </select>
                        </div>

                        {/* Password with show/hide toggle */}
                        <div style={{ marginBottom: 18 }}>
                            <label style={{ fontSize: 10, fontWeight: 700, color: B.g600, marginBottom: 4, display: 'block', letterSpacing: 0.3, textTransform: 'uppercase' }}>Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => { setPassword(e.target.value); setLoginError(''); }}
                                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                                    placeholder="Enter password"
                                    style={{
                                        width: '100%', padding: '12px 44px 12px 14px', borderRadius: 10,
                                        border: `1.5px solid ${B.g200}`, fontSize: 14, fontWeight: 600,
                                        fontFamily: F, color: B.nvD, background: B.w,
                                        boxSizing: 'border-box',
                                    }}
                                />
                                <button
                                    onClick={() => setShowPw(!showPw)}
                                    type="button"
                                    style={{
                                        position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        fontSize: 16, padding: '4px 6px', color: B.g400,
                                        lineHeight: 1,
                                    }}
                                    title={showPw ? 'Hide password' : 'Show password'}
                                >
                                    {showPw ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>

                        {/* Error */}
                        {loginError && (
                            <div style={{
                                padding: '8px 12px', borderRadius: 8, marginBottom: 14,
                                background: `${B.red}10`, border: `1px solid ${B.red}30`,
                                fontSize: 11, fontWeight: 600, color: B.red, fontFamily: F,
                            }}>
                                {loginError}
                            </div>
                        )}

                        {/* Login button */}
                        <button onClick={handleLogin} style={{
                            width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                            ...sGrad, color: B.w, fontSize: 14, fontWeight: 800,
                            fontFamily: F, cursor: 'pointer',
                            boxShadow: `0 4px 20px ${B.bl}30`,
                        }}>
                            Sign In →
                        </button>
                    </div>

                    {/* Player count */}
                    <div style={{ textAlign: 'center', marginTop: 16 }}>
                        <span style={{
                            fontSize: 10, fontWeight: 700, color: B.grn,
                            padding: '4px 12px', borderRadius: 20,
                            background: `${B.grn}10`, border: `1px solid ${B.grn}25`,
                        }}>
                            {players.length} players loaded from rotation sheet
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    // ═══ MAIN APP — LOGGED IN ═══
    const session = { user: { id: coach.id, name: coach.name } };

    return (
        <TrialAssessment
            session={session}
            players={players}
            onBack={handleLogout}
            getAge={getAge}
            getBracket={getBracket}
            isAdmin={coach.isAdmin}
            coachName={coach.name}
            onLogout={handleLogout}
        />
    );
}
