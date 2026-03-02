import React, { useState, useEffect, useCallback, Suspense } from "react";

// ═══ CONTEXT PROVIDERS ═══
import { AuthProvider, useAuth } from "./context/AuthContext";
import { EngineProvider, useEngine } from "./context/EngineContext";

// ═══ ERROR BOUNDARY ═══
import { ErrorBoundary } from "./shared/ErrorBoundary";

// ═══ LAZY-LOADED PORTAL COMPONENTS ═══
const PlayerOnboarding = React.lazy(() => import("./player/PlayerOnboarding"));
const PlayerPortal = React.lazy(() => import("./player/PlayerPortal"));
const CoachAssessment = React.lazy(() => import("./coach/CoachAssessment"));

// ═══ DATA & ENGINE ═══
import { B, F, LOGO, sGrad } from "./data/theme";

// ═══ SESSION-PERSISTED STATE HOOK ═══
function useSessionState(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = sessionStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : defaultValue;
    } catch { return defaultValue; }
  });
  useEffect(() => {
    try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { }
  }, [key, value]);
  return [value, setValue];
}

function MainApp() {
  const { session, authLoading, authStep, setAuthStep, portal, isAdmin, signIn, signOut, userProfile } = useAuth();
  const { engineLoading } = useEngine();

  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const handleLogin = async () => {
    if (!loginUsername || !loginPassword) {
      setAuthError('Please enter your username and password.');
      return;
    }
    setAuthError('');
    try {
      await signIn(loginUsername, loginPassword);
    } catch (e) {
      setAuthError(e.message || 'Login failed. Please try again.');
    }
  };

  // ═══ LOADING / SPLASH ═══
  if (authLoading || (portal && engineLoading)) return (
    <div style={{ minHeight: "100vh", ...sGrad, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <img src={LOGO} alt="" style={{ width: 80, height: 80, objectFit: "contain", marginBottom: 16, filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.3))" }} />
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontFamily: F, fontWeight: 600 }}>Loading...</div>
    </div>
  );

  // ═══ LOGIN SCREEN ═══
  if (!portal) return (
    <div style={{ minHeight: "100vh", ...sGrad, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <img src={LOGO} alt="" style={{ width: 100, height: 100, objectFit: "contain", marginBottom: 20, filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.3))" }} />
      <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: 3, textTransform: "uppercase", fontFamily: F }}>Rajasthan Royals Academy</div>
      <div style={{ fontSize: 26, fontWeight: 900, color: B.w, fontFamily: F, textAlign: "center", marginTop: 4 }}>Player DNA Profile</div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: F, marginTop: 4, marginBottom: 36 }}>Onboarding & Assessment System</div>

      {authStep === 'login' && <>
        <div style={{ width: "100%", maxWidth: 300 }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", fontFamily: F, marginBottom: 16, lineHeight: 1.4, textAlign: 'center' }}>
            Sign in with your credentials
          </div>
          <input
            type="text"
            value={loginUsername}
            onChange={e => { setLoginUsername(e.target.value); setAuthError(''); }}
            placeholder="Username"
            autoFocus
            autoCapitalize="off"
            autoCorrect="off"
            style={{ width: "100%", padding: "14px 16px", borderRadius: 10, border: authError ? `2px solid ${B.red}` : '2px solid rgba(255,255,255,0.2)', background: "rgba(255,255,255,0.1)", color: B.w, fontSize: 14, fontWeight: 600, fontFamily: F, outline: "none", boxSizing: 'border-box', marginBottom: 8, letterSpacing: 0.5 }}
          />
          <input
            type="password"
            value={loginPassword}
            onChange={e => { setLoginPassword(e.target.value); setAuthError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="Password"
            style={{ width: "100%", padding: "14px 16px", borderRadius: 10, border: authError ? `2px solid ${B.red}` : '2px solid rgba(255,255,255,0.2)', background: "rgba(255,255,255,0.1)", color: B.w, fontSize: 14, fontWeight: 600, fontFamily: F, outline: "none", boxSizing: 'border-box', letterSpacing: 0.5 }}
          />
          {authError && <div style={{ fontSize: 11, color: B.red, fontFamily: F, marginTop: 6, fontWeight: 600 }}>⚠ {authError}</div>}
          <button
            onClick={handleLogin}
            style={{ width: "100%", marginTop: 12, padding: "14px 20px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${B.bl}, ${B.pk})`, color: B.w, fontSize: 13, fontWeight: 800, fontFamily: F, cursor: "pointer", letterSpacing: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            SIGN IN
          </button>
        </div>
      </>}

      {authStep === 'signing-in' && <>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", fontFamily: F, fontWeight: 600 }}>Signing in...</div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: F, marginTop: 6 }}>Please wait.</div>
      </>}
    </div>
  );

  // ═══ PLAYER PORTAL ═══
  if (portal === "player") {
    if (userProfile?.submitted) return <PlayerPortal />;
    return <PlayerOnboarding />;
  }

  // ═══ COACH / ADMIN PORTAL ═══
  if (["coach", "admin", "super_admin"].includes(portal)) {
    return <CoachAssessment />;
  }

  return null;
}

// ═══ SUSPENSE FALLBACK ═══
const PortalLoader = () => (
  <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0a0a14,#1a1a2e)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontFamily: "'Inter',sans-serif", fontWeight: 600 }}>Loading portal...</div>
  </div>
);

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <EngineProvider>
          <Suspense fallback={<PortalLoader />}>
            <MainApp />
          </Suspense>
        </EngineProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
