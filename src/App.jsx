import { useState, useEffect, useCallback, useRef } from "react";

// ═══ SESSION-PERSISTED STATE HOOK ═══
// Drop-in replacement for useState that syncs to sessionStorage.
// Survives page reloads but clears when the tab closes.
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
import { supabase } from "./supabaseClient";
import CoachDashboard from "./CoachDashboard";
import AdminDashboard from "./AdminDashboard";
import { trackEvent, EVT } from "./analytics/tracker";
import { signInWithUsername, signOut, getSession, onAuthStateChange, upsertUserProfile, loadUserProfile } from "./auth/authHelpers";

// ═══ DATA MODULES ═══
import { B, F, LOGO, sGrad, sCard, _isDesktop, dkWrap } from "./data/theme";
import { ROLES, BAT_ARCH, BWL_ARCH, BAT_ITEMS, PACE_ITEMS, SPIN_ITEMS, KEEP_ITEMS, IQ_ITEMS, MN_ITEMS, PH_MAP, PHASES, VOICE_QS } from "./data/skillItems";
import { FALLBACK_ASSOCS, FMTS, BAT_H, BWL_T } from "./data/competitionData";
import { FALLBACK_RW, FALLBACK_CONST } from "./data/fallbacks";
import { MOCK } from "./data/mockPlayers";

// ═══ ENGINE ═══
import { getAge, getBracket, DM, techItems, dAvg, calcCCM, calcCSS, calcPDI, calcCohortPercentile, calcAgeScore } from "./engine/ratingEngine";

// ═══ DB LAYER ═══
import { loadPlayersFromDB, savePlayerToDB, saveAssessmentToDB, loadSkillDefs, loadStatBenchmarks, loadStatDomainWeights, loadStatSubWeights } from "./db/playerDb";

// ═══ SHARED UI COMPONENTS ═══
import { Hdr, SecH, Inp, Sel, TArea, NumInp, Dots, AssRow, Ring, CompLevelSel } from "./shared/FormComponents";

export default function App() {
  // ═══ AUTH STATE ═══
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authStep, setAuthStep] = useState('login'); // 'login' | 'signing-in'
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Derive portal from auth
  const portal = userProfile?.role || null;

  // Admin check — master admin username
  const ADMIN_EMAILS = ['alex.lewis@rra.internal', 'alex.lewis@rramelbourne.com', 'lewia26@rra.internal', 'alex@rramelbourne.com'];
  const isAdmin = ADMIN_EMAILS.includes(session?.user?.email) || ADMIN_EMAILS.includes(userProfile?.email);

  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pStep, setPStep] = useSessionState('rra_pStep', 0);
  const [pd, setPd] = useState({ grades: [{}], topBat: [{}], topBowl: [{}] });
  const pu = (k, v) => setPd(d => ({ ...d, [k]: v }));
  const [selP, setSelP] = useSessionState('rra_selP', null);
  const [cView, setCView] = useSessionState('rra_cView', "list");
  const [cPage, setCPage] = useSessionState('rra_cPage', 0);
  const saveTimer = useRef(null);
  // Engine reference data from Supabase
  const [compTiers, setCompTiers] = useState([]);
  const [assocList, setAssocList] = useState(FALLBACK_ASSOCS);
  const [assocComps, setAssocComps] = useState([]);
  const [vmcuAssocs, setVmcuAssocs] = useState([]);
  const [dbWeights, setDbWeights] = useState(null);
  const [engineConst, setEngineConst] = useState(FALLBACK_CONST);

  // ═══ AUTH EFFECTS ═══
  useEffect(() => {
    let cancelled = false;

    // Helper: resolve profile from session
    const resolveProfile = async (user) => {
      try {
        return await upsertUserProfile(user);
      } catch {
        try { return await loadUserProfile(user.id); } catch { return null; }
      }
    };

    // Race getSession against a timeout — never block the login screen
    const AUTH_TIMEOUT_MS = 1500;
    const sessionPromise = getSession();
    const timeoutPromise = new Promise(r => setTimeout(() => r(null), AUTH_TIMEOUT_MS));

    Promise.race([sessionPromise, timeoutPromise]).then(async (s) => {
      if (cancelled) return;
      if (s?.user) {
        setSession(s);
        const profile = await resolveProfile(s.user);
        if (!cancelled) setUserProfile(profile);
      }
      if (!cancelled) setAuthLoading(false);
    }).catch((e) => {
      console.error('Auth init error:', e);
      if (!cancelled) setAuthLoading(false);
    });

    // If getSession resolves AFTER the timeout with a valid session,
    // the onAuthStateChange listener below will pick it up seamlessly.
    const sub = onAuthStateChange(async (event, s) => {
      if (cancelled) return;
      setSession(s);
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && s?.user) {
        const profile = await resolveProfile(s.user);
        if (!cancelled) setUserProfile(profile);
        if (!cancelled) setAuthLoading(false);
      }
      if (event === 'SIGNED_OUT') {
        setUserProfile(null);
        setAuthStep('login');
        setLoginUsername('');
        setLoginPassword('');
        setAuthError('');
      }
    });

    return () => { cancelled = true; sub.unsubscribe(); };
  }, []);

  // Load reference data on mount
  useEffect(() => {
    (async () => {
      try {
        const [tRes, aRes, rRes, wRes, cRes, acRes] = await Promise.all([
          supabase.from('competition_tiers').select('*').order('cti_value', { ascending: false }),
          supabase.from('vmcu_associations').select('abbrev, full_name').order('abbrev'),
          supabase.from('vccl_regions').select('region_name').order('region_code'),
          supabase.from('domain_weights').select('*'),
          supabase.from('engine_constants').select('constant_key, value'),
          supabase.from('association_competitions').select('*').eq('active', true).order('sort_order'),
        ]);
        if (tRes.data?.length) setCompTiers(tRes.data);
        if (aRes.data?.length) setVmcuAssocs(aRes.data);
        if (acRes.data?.length) setAssocComps(acRes.data);
        const aNames = (aRes.data || []).map(a => a.abbrev);
        const rNames = (rRes.data || []).map(r => r.region_name);
        if (aNames.length) setAssocList([...aNames, ...rNames, 'CV Pathway', 'Premier Cricket', 'Other']);
        if (wRes.data?.length) {
          const wm = {};
          wRes.data.forEach(w => { wm[w.role_id] = { t: +w.technical_weight, i: +w.game_iq_weight, m: +w.mental_weight, h: +w.physical_weight, ph: +w.phase_weight }; });
          setDbWeights(wm);
        }
        if (cRes.data?.length) {
          const cm = {}; cRes.data.forEach(c => { cm[c.constant_key] = c.value; }); setEngineConst(cm);
        }
      } catch (e) { console.error('Load engine data:', e); }
    })();
  }, []);

  // Load players from Supabase when entering coach portal
  const refreshPlayers = useCallback(async () => {
    setLoading(true);
    try { const ps = await loadPlayersFromDB(); setPlayers(ps.length ? ps : MOCK); } catch (e) { console.error(e); setPlayers(MOCK); }
    setLoading(false);
  }, []);

  useEffect(() => { if (portal === 'coach') refreshPlayers(); }, [portal, refreshPlayers]);

  // ═══ AUTH HANDLERS ═══
  const handleLogin = async () => {
    if (!loginUsername || !loginPassword) {
      setAuthError('Please enter your username and password.');
      return;
    }
    setAuthError('');
    setAuthStep('signing-in');
    try {
      await signInWithUsername(loginUsername, loginPassword);
      trackEvent(EVT.LOGIN);
    } catch (e) {
      console.error('Login error:', e);
      setAuthError(e.message || 'Login failed. Please try again.');
      setAuthStep('login');
    }
  };

  const handleSignOut = async () => {
    try {
      // Clear persisted navigation so next sign-in starts fresh
      ['rra_pStep', 'rra_selP', 'rra_cView', 'rra_cPage'].forEach(k => sessionStorage.removeItem(k));
      await signOut();
    } catch (e) { console.error('Sign-out error:', e); }
  };

  // ═══ SPLASH / AUTH SCREEN ═══
  if (authLoading) return (
    <div style={{ minHeight: "100vh", ...sGrad, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,600;0,700;0,800;0,900&display=swap" rel="stylesheet" />
      <img src={LOGO} alt="" style={{ width: 80, height: 80, objectFit: "contain", marginBottom: 16, filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.3))" }} />
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontFamily: F, fontWeight: 600 }}>Loading...</div>
    </div>
  );

  if (!portal) return (
    <div style={{ minHeight: "100vh", ...sGrad, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,600;0,700;0,800;0,900&display=swap" rel="stylesheet" />
      <img src={LOGO} alt="" style={{ width: 100, height: 100, objectFit: "contain", marginBottom: 20, filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.3))" }} />
      <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: 3, textTransform: "uppercase", fontFamily: F }}>Rajasthan Royals Academy</div>
      <div style={{ fontSize: 26, fontWeight: 900, color: B.w, fontFamily: F, textAlign: "center", marginTop: 4 }}>Player DNA Report</div>
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

  const goTop = () => window.scrollTo(0, 0);
  const btnSty = (ok, full) => ({ padding: full ? "14px 20px" : "8px 16px", borderRadius: 8, border: "none", background: ok ? `linear-gradient(135deg,${B.bl},${B.pk})` : B.g200, color: ok ? B.w : B.g400, fontSize: 13, fontWeight: 800, fontFamily: F, cursor: ok ? "pointer" : "default", letterSpacing: .5, textTransform: "uppercase", width: full ? "100%" : "auto", marginTop: 6 });
  const backBtn = { marginTop: 8, padding: "10px 16px", border: `1px solid ${B.g200}`, borderRadius: 6, background: "transparent", fontSize: 11, fontWeight: 600, color: B.g600, cursor: "pointer", fontFamily: F, width: "100%" };

  // ═══ PLAYER PORTAL ═══
  if (portal === "player") {
    const stpN = ["Profile", "Competition History", "Playing Style", "Self-Assessment", "Player Voice", "Medical & Goals", "Review"];
    const age = getAge(pd.dob);
    const show16 = age && age >= 16;

    const renderP = () => {
      if (pStep === 0) return (
        <div style={sCard}>
          <SecH title="Player Profile" sub="Tell us about yourself" />
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0 12px" }}>
            <Inp half label="Full Name *" value={pd.name} onChange={v => pu("name", v)} ph="Your full name" />
            <Inp half label="Date of Birth *" value={pd.dob} onChange={v => pu("dob", v)} ph="DD/MM/YYYY" />
            <Inp half label="Phone" value={pd.phone} onChange={v => pu("phone", v)} ph="Mobile" />
            <Inp half label="Email" value={pd.email} onChange={v => pu("email", v)} ph="Email" />
            <Inp half label="Club" value={pd.club} onChange={v => pu("club", v)} ph="e.g. Doncaster CC" />
            <Sel half label="Association" value={pd.assoc} onChange={v => pu("assoc", v)} opts={assocList} />
            <Sel half label="Gender" value={pd.gender} onChange={v => pu("gender", v)} opts={['M', 'F']} />
          </div>
          <SecH title="Parent / Guardian" sub="Required for under 18" />
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0 12px" }}>
            <Inp half label="Parent Name" value={pd.parentName} onChange={v => pu("parentName", v)} ph="Full name" />
            <Inp half label="Parent Email" value={pd.parentEmail} onChange={v => pu("parentEmail", v)} ph="Email" />
          </div>
        </div>
      );

      if (pStep === 1) {
        const gs = pd.grades || [{}];
        const ug = (i, k, v) => { const n = [...gs]; n[i] = { ...n[i], [k]: v }; pu("grades", n); };
        const canAdd = gs.length < 3;
        return (<div>
          <SecH title="Competition History" sub="Your top competition levels from last season (2025/26). Up to 3, highest level first." />
          <div style={{ background: B.pkL, borderRadius: 8, padding: "8px 10px", marginBottom: 10, fontSize: 11, fontFamily: F, color: B.pk, lineHeight: 1.4 }}>
            <strong>Start with your highest level played</strong> — Premier, Senior, Rep cricket first. Then add lower competition levels if you played at multiple levels.<br />
            <span style={{ color: B.g600 }}>Only include competitions where you played <strong>6 or more matches</strong> in the season.</span>
          </div>
          {gs.map((g, gi) => {
            const selTier = (compTiers || []).find(t => t.code === g.level);
            return (<div key={gi} style={{ ...sCard, borderLeft: `3px solid ${[B.pk, B.bl, B.nv][gi] || B.pk}`, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: B.nvD, fontFamily: F }}>COMPETITION LEVEL {gi + 1}</div>
                {gs.length > 1 && <button onClick={() => pu("grades", gs.filter((_, i) => i !== gi))} style={{ fontSize: 9, color: B.red, background: "none", border: "none", cursor: "pointer", fontFamily: F }}>✕ Remove</button>}
              </div>
              <CompLevelSel value={g.level} onChange={v => ug(gi, "level", v)} compTiers={compTiers} gender={pd.gender} assocComps={assocComps} vmcuAssocs={vmcuAssocs} />
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0 8px", marginTop: 8 }}>
                <Inp half label="Club / Team" value={g.team} onChange={v => ug(gi, "team", v)} ph="e.g. Doncaster U14" />
                <Inp half label="Matches" value={g.matches} onChange={v => ug(gi, "matches", v)} type="number" ph="0" />
                {show16 && <Sel half label="Format" value={g.format} onChange={v => ug(gi, "format", v)} opts={FMTS} />}
              </div>
              {/* Compact stat rows — side by side */}
              <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 0", minWidth: 160, padding: "8px 10px", background: B.pkL, borderRadius: 6 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: B.pk, fontFamily: F, marginBottom: 6 }}>BAT</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <NumInp label="Inn" value={g.batInn} onChange={v => ug(gi, "batInn", v)} w={40} />
                    <NumInp label="Runs" value={g.runs} onChange={v => ug(gi, "runs", v)} />
                    <NumInp label="NO" value={g.notOuts} onChange={v => ug(gi, "notOuts", v)} w={36} />
                    <NumInp label="HS" value={g.hs} onChange={v => ug(gi, "hs", v)} w={44} />
                    <NumInp label="Avg" value={g.avg} onChange={v => ug(gi, "avg", v)} w={48} />
                    <NumInp label="BF" value={g.ballsFaced} onChange={v => ug(gi, "ballsFaced", v)} w={48} />
                  </div>
                  {/* HS Detail — expandable */}
                  <details style={{ marginTop: 6 }}>
                    <summary style={{ fontSize: 8, color: B.pk, fontFamily: F, cursor: "pointer", fontWeight: 600 }}>HS Detail ▾</summary>
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      <NumInp label="HS BF" value={g.hsBallsFaced} onChange={v => ug(gi, "hsBallsFaced", v)} w={48} />
                      <NumInp label="HS 4/6" value={g.hsBoundaries} onChange={v => ug(gi, "hsBoundaries", v)} w={48} />
                    </div>
                  </details>
                </div>
                <div style={{ flex: "1.4 1 0", minWidth: 200, padding: "8px 10px", background: B.blL, borderRadius: 6 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: B.bl, fontFamily: F, marginBottom: 6 }}>BOWL</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <NumInp label="Inn" value={g.bowlInn} onChange={v => ug(gi, "bowlInn", v)} w={40} />
                    <NumInp label="Ovrs" value={g.overs} onChange={v => ug(gi, "overs", v)} w={44} />
                    <NumInp label="Wkts" value={g.wkts} onChange={v => ug(gi, "wkts", v)} w={44} />
                    <NumInp label="SR" value={g.sr} onChange={v => ug(gi, "sr", v)} w={40} />
                    <NumInp label="Avg" value={g.bAvg} onChange={v => ug(gi, "bAvg", v)} w={44} />
                    <NumInp label="Econ" value={g.econ} onChange={v => ug(gi, "econ", v)} w={44} />
                    <NumInp label="BB W" value={g.bestBowlWkts} onChange={v => ug(gi, "bestBowlWkts", v)} w={44} />
                    <NumInp label="BB R" value={g.bestBowlRuns} onChange={v => ug(gi, "bestBowlRuns", v)} w={44} />
                  </div>
                </div>
                <div style={{ flex: "0.8 1 0", minWidth: 130, padding: "8px 10px", background: B.g100, borderRadius: 6 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: B.nv, fontFamily: F, marginBottom: 6 }}>FIELD</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <NumInp label="Ct" value={g.ct} onChange={v => ug(gi, "ct", v)} w={40} />
                    <NumInp label="RO" value={g.ro} onChange={v => ug(gi, "ro", v)} w={40} />
                    <NumInp label="St" value={g.st} onChange={v => ug(gi, "st", v)} w={40} />
                    <NumInp label="KpCt" value={g.keeperCatches} onChange={v => ug(gi, "keeperCatches", v)} w={44} />
                  </div>
                </div>
              </div>
            </div>);
          })}
          {canAdd && <button onClick={() => pu("grades", [...gs, {}])} style={{ ...btnSty(true, true), background: B.bl, fontSize: 12 }}>+ ADD COMPETITION LEVEL ({3 - gs.length} remaining)</button>}
          {!canAdd && <div style={{ fontSize: 10, color: B.g400, fontFamily: F, textAlign: "center", marginTop: 4 }}>Maximum 3 competition levels — choose your highest levels played</div>}

          {/* ═══ TOP PERFORMANCES ═══ */}
          <div style={{ marginTop: 20, borderTop: `2px solid ${B.g200}`, paddingTop: 16 }}>
            <SecH title="Top Performances" sub="Your best individual batting scores and bowling figures from the season. Up to 3 each — easily found on your PlayCricket match summary." />

            {/* ── TOP BATTING SCORES ── */}
            <div style={{ fontSize: 11, fontWeight: 800, color: B.pk, fontFamily: F, marginBottom: 6, marginTop: 10 }}>🏏 BEST BATTING SCORES</div>
            <div style={{ fontSize: 10, color: B.g400, fontFamily: F, marginBottom: 8, lineHeight: 1.4 }}>Enter your top innings — runs, balls faced, boundaries. Available from any playing stats page.</div>
            {(pd.topBat || [{}]).map((b, bi) => {
              const uB = (k, v) => { const n = [...(pd.topBat || [{}])]; n[bi] = { ...n[bi], [k]: v }; pu("topBat", n); };
              const compOpts = gs.filter(g => g.level).map(g => {
                const t = (compTiers || []).find(ct => ct.code === g.level);
                return t ? t.competition_name : g.level;
              });
              return (<div key={bi} style={{ background: B.pkL, borderRadius: 8, padding: 10, marginBottom: 6, borderLeft: `3px solid ${B.pk}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: B.pk, fontFamily: F }}>SCORE {bi + 1}</div>
                  {(pd.topBat || []).length > 1 && <button onClick={() => pu("topBat", (pd.topBat || []).filter((_, i) => i !== bi))} style={{ fontSize: 9, color: B.red, background: "none", border: "none", cursor: "pointer", fontFamily: F }}>✕</button>}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <NumInp label="R" value={b.runs} onChange={v => uB("runs", v)} w={44} />
                  <NumInp label="B" value={b.balls} onChange={v => uB("balls", v)} w={44} />
                  <NumInp label="4s" value={b.fours} onChange={v => uB("fours", v)} w={36} />
                  <NumInp label="6s" value={b.sixes} onChange={v => uB("sixes", v)} w={36} />
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <input type="checkbox" checked={!!b.notOut} onChange={e => uB("notOut", e.target.checked)} style={{ width: 14, height: 14, accentColor: B.pk }} />
                    <span style={{ fontSize: 9, fontWeight: 600, color: B.g600, fontFamily: F }}>NO</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                  {compOpts.length > 0 && <div style={{ flex: "1 1 100px" }}><div style={{ fontSize: 8, fontWeight: 600, color: B.g400, fontFamily: F, marginBottom: 2 }}>Competition</div>
                    <select value={b.comp || ''} onChange={e => uB("comp", e.target.value)} style={{ width: "100%", border: `1px solid ${B.g200}`, borderRadius: 4, padding: "4px 6px", fontSize: 10, fontFamily: F, background: B.w }}>
                      <option value="">Select...</option>
                      {compOpts.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>}
                  <div style={{ flex: "1 1 100px" }}><Inp label="vs" value={b.vs} onChange={v => uB("vs", v)} ph="Opposition" /></div>
                  <div style={{ flex: "0 1 80px" }}><Sel label="Fmt" value={b.format} onChange={v => uB("format", v)} opts={FMTS} /></div>
                </div>
              </div>);
            })}
            {(pd.topBat || []).length < 3 && <button onClick={() => pu("topBat", [...(pd.topBat || []), {}])} style={{ ...btnSty(true, true), background: B.pk, fontSize: 11, marginTop: 2 }}>+ ADD BATTING SCORE ({3 - (pd.topBat || []).length} remaining)</button>}

            {/* ── TOP BOWLING FIGURES ── */}
            <div style={{ fontSize: 11, fontWeight: 800, color: B.bl, fontFamily: F, marginBottom: 6, marginTop: 16 }}>🎯 BEST BOWLING FIGURES</div>
            <div style={{ fontSize: 10, color: B.g400, fontFamily: F, marginBottom: 8, lineHeight: 1.4 }}>Enter your best bowling spells — wickets, runs, overs. Available from any playing stats page.</div>
            {(pd.topBowl || [{}]).map((b, bi) => {
              const uW = (k, v) => { const n = [...(pd.topBowl || [{}])]; n[bi] = { ...n[bi], [k]: v }; pu("topBowl", n); };
              const compOpts = gs.filter(g => g.level).map(g => {
                const t = (compTiers || []).find(ct => ct.code === g.level);
                return t ? t.competition_name : g.level;
              });
              return (<div key={bi} style={{ background: B.blL, borderRadius: 8, padding: 10, marginBottom: 6, borderLeft: `3px solid ${B.bl}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: B.bl, fontFamily: F }}>FIGURES {bi + 1}</div>
                  {(pd.topBowl || []).length > 1 && <button onClick={() => pu("topBowl", (pd.topBowl || []).filter((_, i) => i !== bi))} style={{ fontSize: 9, color: B.red, background: "none", border: "none", cursor: "pointer", fontFamily: F }}>✕</button>}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <NumInp label="W" value={b.wkts} onChange={v => uW("wkts", v)} w={40} />
                  <NumInp label="R" value={b.runs} onChange={v => uW("runs", v)} w={44} />
                  <NumInp label="O" value={b.overs} onChange={v => uW("overs", v)} w={44} />
                  <NumInp label="M" value={b.maidens} onChange={v => uW("maidens", v)} w={36} />
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                  {compOpts.length > 0 && <div style={{ flex: "1 1 100px" }}><div style={{ fontSize: 8, fontWeight: 600, color: B.g400, fontFamily: F, marginBottom: 2 }}>Competition</div>
                    <select value={b.comp || ''} onChange={e => uW("comp", e.target.value)} style={{ width: "100%", border: `1px solid ${B.g200}`, borderRadius: 4, padding: "4px 6px", fontSize: 10, fontFamily: F, background: B.w }}>
                      <option value="">Select...</option>
                      {compOpts.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>}
                  <div style={{ flex: "1 1 100px" }}><Inp label="vs" value={b.vs} onChange={v => uW("vs", v)} ph="Opposition" /></div>
                  <div style={{ flex: "0 1 80px" }}><Sel label="Fmt" value={b.format} onChange={v => uW("format", v)} opts={FMTS} /></div>
                </div>
              </div>);
            })}
            {(pd.topBowl || []).length < 3 && <button onClick={() => pu("topBowl", [...(pd.topBowl || []), {}])} style={{ ...btnSty(true, true), background: B.bl, fontSize: 11, marginTop: 2 }}>+ ADD BOWLING FIGURES ({3 - (pd.topBowl || []).length} remaining)</button>}
          </div>
        </div>);
      }

      if (pStep === 2) return (<div style={sCard}>
        <SecH title="Playing Style" />
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0 12px" }}>
          <Sel half label="Primary Role" value={pd.role} onChange={v => pu("role", v)} opts={ROLES.map(r => r.label)} />
          <Sel half label="Batting Hand" value={pd.bat} onChange={v => pu("bat", v)} opts={BAT_H} />
          <Sel half label="Bowling Type" value={pd.bowl} onChange={v => pu("bowl", v)} opts={BWL_T} />
        </div>
      </div>);

      if (pStep === 3) {
        const rid = ROLES.find(r => r.label === pd.role)?.id || 'batter';
        const sT = techItems(rid);
        return (<div style={sCard}>
          <SecH title="Self-Assessment" sub="There are no wrong answers here — just rate yourself honestly (1-5) based on where you feel your game is right now. This is about self-awareness and understanding your own strengths and areas to grow." />
          <div style={{ fontSize: 9, color: B.g400, fontFamily: F, marginBottom: 6 }}>1=Developing 2=Emerging 3=Competent 4=Advanced 5=Elite</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: B.pk, fontFamily: F, marginBottom: 6, marginTop: 10 }}>{sT.pL}</div>
          {sT.pri.map((item, i) => <AssRow key={item} label={item} value={pd[`sr_t1_${i}`]} onR={v => pu(`sr_t1_${i}`, v)} color={B.pk} />)}
          <div style={{ fontSize: 11, fontWeight: 700, color: B.bl, fontFamily: F, marginBottom: 6, marginTop: 10 }}>Game Intelligence</div>
          {IQ_ITEMS.map((item, i) => <AssRow key={item} label={item} value={pd[`sr_iq_${i}`]} onR={v => pu(`sr_iq_${i}`, v)} color={B.sky} />)}
          <div style={{ fontSize: 11, fontWeight: 700, color: B.prp, fontFamily: F, marginBottom: 6, marginTop: 10 }}>Mental & Character</div>
          {MN_ITEMS.map((item, i) => <AssRow key={item} label={item} value={pd[`sr_mn_${i}`]} onR={v => pu(`sr_mn_${i}`, v)} color={B.prp} />)}
        </div>);
      }

      if (pStep === 4) return (<div style={sCard}>
        <SecH title="Player Voice" sub="Tell us about your game" />
        {VOICE_QS.map((q, i) => <TArea key={i} label={q} value={pd[`v_${i}`]} onChange={v => pu(`v_${i}`, v)} rows={2} />)}
      </div>);

      if (pStep === 5) return (<div style={sCard}>
        <SecH title="Injury & Medical" />
        <TArea value={pd.injury} onChange={v => pu("injury", v)} ph="Current or past injuries..." rows={3} />
        <SecH title="Goals & Aspirations" />
        <TArea value={pd.goals} onChange={v => pu("goals", v)} ph="What do you want from the program?" rows={3} />
      </div>);

      if (pStep === 6) {
        const gc = (pd.grades || []).filter(g => g.level).length;
        const tb = (pd.topBat || []).filter(b => +b.runs > 0).length;
        const tw = (pd.topBowl || []).filter(b => +b.wkts > 0 || +b.runs > 0).length;
        return (<div>
          <SecH title="Review & Submit" />
          <div style={sCard}><div style={{ fontSize: 12, fontWeight: 700, color: B.nvD, fontFamily: F }}>{pd.name || "—"}</div><div style={{ fontSize: 11, color: B.g400, fontFamily: F }}>{pd.dob || "—"} • {pd.club || "—"} • {gc} competition level(s){tb > 0 ? ` • ${tb} top score(s)` : ''}{tw > 0 ? ` • ${tw} bowling fig(s)` : ''}</div></div>
          <button onClick={async () => {
            if (!pd.name || !pd.dob) return;
            const saved = await savePlayerToDB(pd, session?.user?.id);
            if (saved) {
              const rid = ROLES.find(r => r.label === pd.role)?.id || "batter";
              setPlayers(p => [...p, {
                id: saved.id, name: pd.name, dob: pd.dob, club: pd.club, assoc: pd.assoc, role: rid, bat: pd.bat, bowl: pd.bowl,
                voice: VOICE_QS.map((_, i) => pd[`v_${i}`] || ""), grades: pd.grades || [], injury: pd.injury, goals: pd.goals, submitted: true, cd: {}
              }]);
            }
            setPStep(7);
          }} style={btnSty(pd.name && pd.dob, true)}>SUBMIT SURVEY</button>
        </div>);
      }

      if (pStep === 7) return (<div style={{ textAlign: "center", padding: 40 }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>✓</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: B.grn, fontFamily: F }}>Survey Submitted!</div>
        <div style={{ fontSize: 12, color: B.g600, fontFamily: F, marginTop: 6 }}>Your coaching team will review your details.</div>
      </div>);
      return null;
    };

    return (<div style={{ minHeight: "100vh", fontFamily: F, background: B.g50 }}>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,600;0,700;0,800;0,900&display=swap" rel="stylesheet" />
      <Hdr label="PLAYER ONBOARDING" />
      {/* Sign-out bar */}
      <div style={{ padding: '4px 12px', background: B.g100, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 9, color: B.g400, fontFamily: F }}>{session?.user?.email}</div>
        <button onClick={handleSignOut} style={{ fontSize: 9, fontWeight: 600, color: B.red, background: 'none', border: 'none', cursor: 'pointer', fontFamily: F }}>Sign Out</button>
      </div>
      {pStep < 7 && <div style={{ padding: "6px 12px", background: B.w, borderBottom: `1px solid ${B.g200}`, display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: B.pk, fontFamily: F }}>STEP {pStep + 1}/7</div>
        <div style={{ fontSize: 11, fontWeight: 600, color: B.nvD, fontFamily: F }}>{stpN[pStep]}</div>
        <div style={{ flex: 1, height: 3, background: B.g200, borderRadius: 2, marginLeft: 6 }}>
          <div style={{ width: `${((pStep + 1) / 7) * 100}%`, height: "100%", background: `linear-gradient(90deg,${B.bl},${B.pk})`, borderRadius: 2, transition: "width 0.3s" }} />
        </div>
      </div>}
      <div style={{ padding: 12, paddingBottom: pStep < 7 ? 70 : 12, ...dkWrap }}>{renderP()}</div>
      {pStep < 7 && <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: B.w, borderTop: `1px solid ${B.g200}`, padding: "8px 12px", display: "flex", justifyContent: "space-between", zIndex: 100 }}>
        <button onClick={() => { if (pStep > 0) { setPStep(s => s - 1); goTop(); } else handleSignOut(); }} style={{ padding: "8px 14px", borderRadius: 6, border: `1px solid ${B.g200}`, background: "transparent", fontSize: 11, fontWeight: 600, color: B.g600, cursor: "pointer", fontFamily: F }}>← Back</button>
        <button onClick={() => { setPStep(s => Math.min(s + 1, 6)); goTop(); }} style={{ padding: "8px 14px", borderRadius: 6, border: "none", background: `linear-gradient(135deg,${B.bl},${B.pk})`, fontSize: 11, fontWeight: 700, color: B.w, cursor: "pointer", fontFamily: F }}>Next →</button>
      </div>}
    </div>);
  }

  // ═══ COACH PORTAL ═══
  if (portal === "coach") {
    const sp = selP ? players.find(p => p.id === selP) : null;

    // ADMIN DASHBOARD (admin only)
    if (cView === "admin" && isAdmin) return (
      <AdminDashboard
        players={players}
        compTiers={compTiers}
        dbWeights={dbWeights}
        engineConst={engineConst}
        session={session}
        onBack={() => { setCView("list"); goTop(); }}
        calcPDI={calcPDI}
        calcCCM={calcCCM}
        calcCohortPercentile={calcCohortPercentile}
        calcAgeScore={calcAgeScore}
        getAge={getAge}
        getBracket={getBracket}
        ROLES={ROLES}
        B={B}
        F={F}
        LOGO={LOGO}
        sGrad={sGrad}
      />
    );

    // DASHBOARD
    if (cView === "dashboard") return (
      <CoachDashboard
        players={players}
        compTiers={compTiers}
        dbWeights={dbWeights}
        engineConst={engineConst}
        onBack={() => { setCView("list"); goTop(); }}
        onSelectPlayer={(id) => { setSelP(id); setCView("survey"); goTop(); }}
        calcPDI={calcPDI}
        calcCCM={calcCCM}
        calcCohortPercentile={calcCohortPercentile}
        calcAgeScore={calcAgeScore}
        getAge={getAge}
        getBracket={getBracket}
        techItems={techItems}
        ROLES={ROLES}
        B={B}
        F={F}
        LOGO={LOGO}
        IQ_ITEMS={IQ_ITEMS}
        MN_ITEMS={MN_ITEMS}
        PH_MAP={PH_MAP}
        Ring={Ring}
        sGrad={sGrad}
      />
    );

    // LIST
    if (cView === "list") return (<div style={{ minHeight: "100vh", fontFamily: F, background: B.g50 }}>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,600;0,700;0,800;0,900&display=swap" rel="stylesheet" />
      <Hdr label="COACH PORTAL" />
      <div style={{ padding: '4px 12px', background: B.g100, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ fontSize: 9, color: B.g400, fontFamily: F }}>{session?.user?.email}</div>
          {isAdmin && <button onClick={() => { setCView("admin"); }} style={{ padding: '3px 10px', borderRadius: 6, border: 'none', background: 'linear-gradient(135deg, #f59e0b, #ef4444)', fontSize: 9, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: F }}>🔧 Admin</button>}
        </div>
        <button onClick={handleSignOut} style={{ fontSize: 9, fontWeight: 600, color: B.red, background: 'none', border: 'none', cursor: 'pointer', fontFamily: F }}>Sign Out</button>
      </div>
      <div style={{ padding: 12, ...dkWrap }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <SecH title={`Player Roster (${players.filter(p => p.submitted).length})`} sub="Tap player to view survey or assess" />
          <button onClick={() => { setCView("dashboard"); goTop(); }} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: `linear-gradient(135deg,${B.bl},${B.pk})`, fontSize: 11, fontWeight: 700, color: B.w, cursor: "pointer", fontFamily: F, whiteSpace: "nowrap" }}>📊 Dashboard</button>
        </div>
        <div style={_isDesktop ? { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 } : {}}>
          {players.filter(p => p.submitted).map(p => {
            const ccmR = calcCCM(p.grades, p.dob, compTiers, engineConst);
            const hasCd = Object.keys(p.cd || {}).filter(k => k.match(/^t1_/)).length > 0;
            const hasSelf = Object.keys(p.self_ratings || {}).some(k => k.match(/^t1_/));
            const hasData = hasCd || hasSelf || (p.grades?.length > 0);
            const dn = hasData ? calcPDI({ ...p.cd, _dob: p.dob }, p.self_ratings, p.role, ccmR, dbWeights, engineConst, p.grades, {}, p.topBat, p.topBowl, compTiers) : null;
            const a = getAge(p.dob), br = getBracket(p.dob), ro = ROLES.find(r => r.id === p.role);
            const ini = p.name ? p.name.split(" ").map(w => w[0]).join("").slice(0, 2) : "?";
            // Core scores for roster badge
            let overallScore = null;
            if (dn && dn.pdi > 0) {
              const pathS = dn.pdiPct;
              const cohortS = calcCohortPercentile(dn.pdi, players, compTiers, dbWeights, engineConst);
              const ageS = calcAgeScore(ccmR.arm, engineConst);
              overallScore = Math.round((pathS + cohortS + ageS) / 3);
            }
            return (<div key={p.id} style={{ ...sCard, cursor: "pointer", display: "flex", gap: 10 }} onClick={() => { setSelP(p.id); setCView("survey"); goTop(); }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", ...sGrad, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ color: B.w, fontSize: 13, fontWeight: 800, fontFamily: F }}>{ini}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: B.nvD, fontFamily: F }}>{p.name}</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {overallScore !== null && <div style={{ padding: "1px 6px", borderRadius: 3, fontSize: 9, fontWeight: 800, fontFamily: F, background: `linear-gradient(135deg,${B.bl}20,${B.pk}20)`, color: B.nvD, border: `1px solid ${B.g200}` }}>⭐ {overallScore}</div>}
                    {dn && <div style={{ padding: "1px 6px", borderRadius: 3, fontSize: 9, fontWeight: 800, fontFamily: F, background: `${dn.gc}20`, color: dn.gc }}>PDI {dn.pdi.toFixed(1)}</div>}
                    {ccmR.ccm > 0 && <div style={{ padding: "1px 6px", borderRadius: 3, fontSize: 9, fontWeight: 800, fontFamily: F, background: `${B.bl}20`, color: B.bl }}>CCM {ccmR.ccm.toFixed(2)}</div>}
                    {dn?.trajectory && <div style={{ padding: "1px 6px", borderRadius: 3, fontSize: 9, fontWeight: 800, fontFamily: F, background: `${B.grn}20`, color: B.grn }}>🚀</div>}
                  </div>
                </div>
                <div style={{ fontSize: 10, color: B.g400, fontFamily: F, marginTop: 1 }}>{a}yo • {br} • {ro?.sh || "?"} • {p.club}</div>
                <div style={{ fontSize: 9, color: B.g400, fontFamily: F }}>{p.grades?.length || 0} competition level(s) • {hasCd ? "Coach assessed" : hasSelf ? "Self-assessed" : "Awaiting"}{dn?.provisional && hasSelf ? " (provisional)" : ""}</div>
              </div>
            </div>);
          })}
        </div>
        <button onClick={handleSignOut} style={backBtn}>← Sign Out</button>
      </div>
    </div>);

    // SURVEY VIEW
    if (cView === "survey" && sp) {
      const ccmR = calcCCM(sp.grades, sp.dob, compTiers, engineConst);
      const a = getAge(sp.dob), br = getBracket(sp.dob), ro = ROLES.find(r => r.id === sp.role);
      return (<div style={{ minHeight: "100vh", fontFamily: F, background: B.g50 }}>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,600;0,700;0,800;0,900&display=swap" rel="stylesheet" />
        <Hdr label="COACH PORTAL" />
        <div style={{ padding: 12, ...dkWrap }}>
          <div style={{ background: `linear-gradient(135deg,${B.nvD},${B.nv})`, borderRadius: 14, padding: 16, marginBottom: 12, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: B.w, fontFamily: F }}>{sp.name}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: F, marginTop: 2 }}>{a}yo • {br} • {ro?.label} • {sp.club}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: F, marginTop: 1 }}>{sp.bat} • {sp.bowl}</div>
            </div>
            {ccmR.ccm > 0 && <Ring value={Math.round(ccmR.ccm * 100)} size={70} color={B.bl} label="CCM" />}
          </div>

          <SecH title="Competition History" sub={`${sp.grades?.length || 0} competition level(s)`} />
          {(sp.grades || []).map((g, gi) => {
            const gTier = (compTiers || []).find(t => t.code === g.level);
            return (<div key={gi} style={{ ...sCard, borderLeft: `3px solid ${gi % 2 === 0 ? B.pk : B.bl}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: B.nvD, fontFamily: F }}>{gTier?.competition_name || g.level}</div>
                <div style={{ padding: "1px 6px", borderRadius: 3, fontSize: 9, fontWeight: 800, background: `${B.pk}15`, color: B.pk, fontFamily: F }}>CTI {gTier?.cti_value || "—"}</div>
              </div>
              <div style={{ fontSize: 10, color: B.g400, fontFamily: F }}>{g.team} • {g.matches}m{g.format ? ` • ${g.format}` : ""}</div>
              <div style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
                {+g.runs > 0 && <div style={{ fontSize: 10, fontFamily: F }}><span style={{ color: B.pk, fontWeight: 700 }}>BAT</span> <span style={{ color: B.g600 }}>{+g.batInn > 0 ? `${g.batInn}inn ` : ""}{g.runs}r{+g.notOuts > 0 ? ` ${g.notOuts}no` : ""} HS {g.hs}{+g.hsBallsFaced > 0 ? `(${g.hsBallsFaced}bf ${g.hsBoundaries || 0}bdy)` : ""} @ {g.avg}{+g.ballsFaced > 0 ? ` BF ${g.ballsFaced}` : ""}</span></div>}
                {+g.overs > 0 && <div style={{ fontSize: 10, fontFamily: F }}><span style={{ color: B.bl, fontWeight: 700 }}>BOWL</span> <span style={{ color: B.g600 }}>{+g.bowlInn > 0 ? `${g.bowlInn}inn ` : ""}{g.wkts}w SR {g.sr} Avg {g.bAvg} Ec {g.econ}{+g.bestBowlWkts > 0 ? ` BB ${g.bestBowlWkts}/${g.bestBowlRuns}` : ""}</span></div>}
                {(+g.ct > 0 || +g.st > 0 || +g.keeperCatches > 0) && <div style={{ fontSize: 10, fontFamily: F }}><span style={{ color: B.nv, fontWeight: 700 }}>FIELD</span> <span style={{ color: B.g600 }}>{g.ct || 0}ct {+g.ro > 0 ? `${g.ro}ro ` : ""}{+g.st > 0 ? `${g.st}st ` : ""}{+g.keeperCatches > 0 ? `${g.keeperCatches}kpct` : ""}</span></div>}
              </div>
            </div>);
          })}

          {/* ═══ TOP PERFORMANCES — Coach View ═══ */}
          {((sp.topBat && sp.topBat.length > 0) || (sp.topBowl && sp.topBowl.length > 0)) && <>
            <SecH title="Top Performances" sub="Best individual innings and bowling figures" />
            {sp.topBat && sp.topBat.filter(b => +b.runs > 0).length > 0 && <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: B.pk, fontFamily: F, marginBottom: 4 }}>🏏 BATTING</div>
              {sp.topBat.filter(b => +b.runs > 0).map((b, i) => (
                <div key={i} style={{ ...sCard, borderLeft: `3px solid ${B.pk}`, padding: "8px 10px", marginBottom: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: B.nvD, fontFamily: F }}>{b.runs}{b.notOut ? '*' : ''}<span style={{ fontSize: 10, fontWeight: 400, color: B.g400 }}> ({b.balls}b, {b.fours}×4, {b.sixes}×6)</span></div>
                    {+b.balls > 0 && <div style={{ fontSize: 10, fontWeight: 700, color: B.pk, fontFamily: F }}>SR {((+b.runs / +b.balls) * 100).toFixed(1)}</div>}
                  </div>
                  <div style={{ fontSize: 9, color: B.g400, fontFamily: F, marginTop: 2 }}>{b.comp}{b.vs ? ` vs ${b.vs}` : ''}{b.format ? ` • ${b.format}` : ''}</div>
                </div>
              ))}
            </div>}
            {sp.topBowl && sp.topBowl.filter(b => +b.wkts > 0 || +b.runs > 0).length > 0 && <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: B.bl, fontFamily: F, marginBottom: 4 }}>🎯 BOWLING</div>
              {sp.topBowl.filter(b => +b.wkts > 0 || +b.runs > 0).map((b, i) => (
                <div key={i} style={{ ...sCard, borderLeft: `3px solid ${B.bl}`, padding: "8px 10px", marginBottom: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: B.nvD, fontFamily: F }}>{b.wkts}/{b.runs}<span style={{ fontSize: 10, fontWeight: 400, color: B.g400 }}> ({b.overs}ov{+b.maidens > 0 ? `, ${b.maidens}m` : ''})</span></div>
                    {+b.overs > 0 && <div style={{ fontSize: 10, fontWeight: 700, color: B.bl, fontFamily: F }}>Econ {(+b.runs / +b.overs).toFixed(1)}</div>}
                  </div>
                  <div style={{ fontSize: 9, color: B.g400, fontFamily: F, marginTop: 2 }}>{b.comp}{b.vs ? ` vs ${b.vs}` : ''}{b.format ? ` • ${b.format}` : ''}</div>
                </div>
              ))}
            </div>}
          </>}

          <SecH title="Player Voice" />
          <div style={sCard}>{VOICE_QS.map((q, i) => (<div key={i} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: B.g400, fontFamily: F }}>{q}</div>
            <div style={{ fontSize: 12, color: B.g800, fontFamily: F, marginTop: 1 }}>{sp.voice?.[i] || "—"}</div>
          </div>))}</div>

          <SecH title="Medical & Goals" />
          <div style={sCard}>
            <div style={{ fontSize: 10, fontWeight: 600, color: B.g400, fontFamily: F }}>Injury</div>
            <div style={{ fontSize: 12, color: B.g800, fontFamily: F, marginBottom: 8 }}>{sp.injury || "None"}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: B.g400, fontFamily: F }}>Goals</div>
            <div style={{ fontSize: 12, color: B.g800, fontFamily: F }}>{sp.goals || "—"}</div>
          </div>

          <button onClick={() => { setCView("assess"); setCPage(0); goTop(); }} style={btnSty(true, true)}>BEGIN ASSESSMENT →</button>
          <button onClick={() => { setCView("list"); setSelP(null); }} style={backBtn}>← Back to roster</button>
        </div>
      </div>);
    }

    // ASSESSMENT
    if (cView === "assess" && sp) {
      const cd = sp.cd || {};
      const cU = (k, v) => {
        setPlayers(ps => ps.map(p => p.id === sp.id ? { ...p, cd: { ...p.cd, [k]: v } } : p));
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          const updated = players.find(p => p.id === sp.id);
          if (updated) saveAssessmentToDB(sp.id, { ...updated.cd, [k]: v });
        }, 2000);
      };
      const t = techItems(sp.role);
      const ccmR = calcCCM(sp.grades, sp.dob, compTiers, engineConst);
      const dn = calcPDI({ ...cd, _dob: sp.dob }, sp.self_ratings, sp.role, ccmR, dbWeights, engineConst, sp.grades, {}, sp.topBat, sp.topBowl, compTiers);
      const pgN = ["Identity", "Technical", "Tactical/Mental/Physical", "PDI Summary"];

      const renderAP = () => {
        if (cPage === 0) return (<div style={{ padding: "0 12px 16px", ...dkWrap }}>
          <SecH title="Batting Archetype" />
          <div style={{ display: "grid", gap: 6, ...(_isDesktop ? { gridTemplateColumns: 'repeat(2, 1fr)' } : {}) }}>{BAT_ARCH.map(a => (<div key={a.id} onClick={() => cU("batA", a.id)}
            style={{ background: cd.batA === a.id ? B.pkL : B.w, border: `2px solid ${cd.batA === a.id ? a.c : B.g200}`, borderLeft: `4px solid ${a.c}`, borderRadius: 8, padding: 10, cursor: "pointer" }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: B.nvD, fontFamily: F }}>{a.nm}</div>
            <div style={{ fontSize: 10, color: B.g600, fontFamily: F }}>{a.sub}</div>
          </div>))}</div>
          <SecH title="Bowling Archetype" />
          <div style={{ display: "grid", gap: 6, ...(_isDesktop ? { gridTemplateColumns: 'repeat(2, 1fr)' } : {}) }}>{BWL_ARCH.map(a => (<div key={a.id} onClick={() => cU("bwlA", a.id)}
            style={{ background: cd.bwlA === a.id ? B.blL : B.w, border: `2px solid ${cd.bwlA === a.id ? a.c : B.g200}`, borderLeft: `4px solid ${a.c}`, borderRadius: 8, padding: 10, cursor: "pointer" }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: B.nvD, fontFamily: F }}>{a.nm}</div>
            <div style={{ fontSize: 10, color: B.g600, fontFamily: F }}>{a.sub}</div>
          </div>))}</div>
          <SecH title="Phase Effectiveness" />
          <div style={_isDesktop ? { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 } : {}}>
            {PHASES.map(ph => (<div key={ph.id} style={{ background: B.g100, borderRadius: 6, padding: 10, marginBottom: _isDesktop ? 0 : 6 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: B.nvD, fontFamily: F, marginBottom: 6 }}>{ph.nm}</div>
              <div style={{ display: "flex", flexDirection: _isDesktop ? 'column' : 'row', gap: _isDesktop ? 8 : 16 }}>
                <div><div style={{ fontSize: 9, fontWeight: 700, color: B.pk, fontFamily: F }}>BAT</div><Dots value={cd[`pb_${ph.id}`] || 0} onChange={v => cU(`pb_${ph.id}`, v)} color={B.pk} /></div>
                <div><div style={{ fontSize: 9, fontWeight: 700, color: B.bl, fontFamily: F }}>BOWL</div><Dots value={cd[`pw_${ph.id}`] || 0} onChange={v => cU(`pw_${ph.id}`, v)} color={B.bl} /></div>
              </div>
            </div>))}
          </div>
        </div>);

        if (cPage === 1) return (<div style={{ padding: "0 12px 16px", ...dkWrap }}>
          <SecH title={t.pL} sub="Rate 1-5" />
          <div style={{ fontSize: 9, color: B.g400, fontFamily: F, marginBottom: 6 }}>1=Developing 2=Emerging 3=Competent 4=Advanced 5=Elite</div>
          {t.pri.map((item, i) => <AssRow key={item} label={item} value={cd[`t1_${i}`]} onR={v => cU(`t1_${i}`, v)} color={B.pk} />)}
          <SecH title={t.sL} />
          {t.sec.map((item, i) => <AssRow key={item} label={item} value={cd[`t2_${i}`]} onR={v => cU(`t2_${i}`, v)} color={B.bl} />)}
        </div>);

        if (cPage === 2) return (<div style={{ padding: "0 12px 16px", ...dkWrap }}>
          <SecH title="Game Intelligence" />
          {IQ_ITEMS.map((item, i) => <AssRow key={item} label={item} value={cd[`iq_${i}`]} onR={v => cU(`iq_${i}`, v)} color={B.sky} />)}
          <SecH title="Mental & Character" sub="Royals Way aligned" />
          {MN_ITEMS.map((item, i) => <AssRow key={item} label={item} value={cd[`mn_${i}`]} onR={v => cU(`mn_${i}`, v)} color={B.prp} />)}
          <SecH title="Physical & Athletic" />
          {(PH_MAP[sp.role] || PH_MAP.batter).map((item, i) => <AssRow key={item} label={item} value={cd[`ph_${i}`]} onR={v => cU(`ph_${i}`, v)} color={B.nv} />)}
        </div>);

        if (cPage === 3) {
          // ═══ CORE SCORES ═══
          const pathwayScore = dn.pdiPct;
          const cohortScore = calcCohortPercentile(dn.pdi, players, compTiers, dbWeights, engineConst);
          const ageScore = calcAgeScore(ccmR.arm, engineConst);
          const overallScore = Math.round((pathwayScore + cohortScore + ageScore) / 3);
          const coreScores = [
            { label: "Pathway", value: pathwayScore, color: B.pk, icon: "🛤️", sub: "vs. whole pathway" },
            { label: "Cohort", value: cohortScore, color: B.bl, icon: "👥", sub: "vs. RRA players" },
            { label: "Age", value: ageScore, color: B.prp, icon: "🎂", sub: "vs. age group" },
            { label: "Overall", value: overallScore, color: B.grn, icon: "⭐", sub: "total average" },
          ];
          return (<div style={{ padding: "0 12px 16px", ...dkWrap }}>
            <SecH title="Score Dashboard" sub="Coach-eyes only" />

            {/* ═══ CORE SCORES SECTION ═══ */}
            <div style={{ background: `linear-gradient(135deg,${B.nvD} 0%,${B.nv} 100%)`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', fontFamily: F, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12, textAlign: 'center' }}>CORE SCORES</div>
              <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {coreScores.map(sc => (
                  <div key={sc.label} style={{ textAlign: 'center', minWidth: 70 }}>
                    <Ring value={sc.value} size={sc.label === 'Overall' ? 80 : 68} color={sc.color} label={null} />
                    <div style={{ fontSize: 9, fontWeight: 800, color: B.w, fontFamily: F, marginTop: 4 }}>{sc.icon} {sc.label}</div>
                    <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.4)', fontFamily: F, marginTop: 1 }}>{sc.sub}</div>
                  </div>
                ))}
              </div>
              <div style={{ textAlign: 'center', padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: B.w, fontFamily: F }}>{overallScore}<span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>/100</span></div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', fontFamily: F, marginTop: 2 }}>OVERALL PLAYER SCORE</div>
              </div>
            </div>

            {/* ═══ PDI DETAIL ═══ */}
            <div style={{ background: `linear-gradient(135deg,${B.nvD},${B.nv})`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
                <Ring value={dn.pdiPct} size={90} color={dn.gc} label="PDI" />
                <Ring value={Math.round(ccmR.ccm * 100)} size={70} color={B.bl} label="CCM" />
                <div style={{ flex: 1, minWidth: 100 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: dn.gc, fontFamily: F }}>{dn.g}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontFamily: F }}>{dn.tr}/{dn.ti} rated ({dn.cp}%){dn.provisional ? ' • Provisional' : ''}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: B.w, fontFamily: F, marginTop: 4 }}>PDI: {dn.pdi.toFixed(2)} / 5.00</div>
                </div>
              </div>
              {/* CCM Breakdown */}
              <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: 10, marginBottom: 6 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', fontFamily: F, marginBottom: 4 }}>CCM BREAKDOWN</div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <div><div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', fontFamily: F }}>CTI</div><div style={{ fontSize: 14, fontWeight: 800, color: B.w, fontFamily: F }}>{ccmR.cti.toFixed(2)}</div></div>
                  <div><div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', fontFamily: F }}>ARM</div><div style={{ fontSize: 14, fontWeight: 800, color: B.w, fontFamily: F }}>{ccmR.arm.toFixed(2)}</div></div>
                  <div><div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', fontFamily: F }}>CCM</div><div style={{ fontSize: 14, fontWeight: 800, color: B.bl, fontFamily: F }}>{ccmR.ccm.toFixed(3)}</div></div>
                  {ccmR.code && <div><div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', fontFamily: F }}>Top Comp</div><div style={{ fontSize: 10, fontWeight: 600, color: B.w, fontFamily: F }}>{ccmR.code}</div></div>}
                </div>
              </div>
              {/* SAGI */}
              {dn.sagi !== null && <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: 10, marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', fontFamily: F }}>SELF-AWARENESS (SAGI)</div><div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontFamily: F, marginTop: 2 }}>Gap: {dn.sagi > 0 ? '+' : ''}{dn.sagi.toFixed(2)}</div></div>
                <div style={{ padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 800, background: `${dn.sagiColor}20`, color: dn.sagiColor, fontFamily: F }}>{dn.sagiLabel}</div>
              </div>}
              {/* Trajectory */}
              {dn.trajectory && <div style={{ background: `${B.grn}20`, borderRadius: 8, padding: 10, marginBottom: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: B.grn, fontFamily: F }}>🚀 TRAJECTORY FLAG</div>
                <div style={{ fontSize: 10, color: B.grn, fontFamily: F, marginTop: 2 }}>Young for competition level with strong PDI — accelerated development candidate</div>
              </div>}
            </div>
            {/* Domain bars */}
            {dn.domains.map(d => (<div key={d.k} style={{ marginBottom: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: B.g800, fontFamily: F }}>{d.l} <span style={{ fontSize: 8, color: B.g400 }}>×{Math.round(d.wt * 100)}%</span></span>
                <span style={{ fontSize: 12, fontWeight: 800, color: d.r > 0 ? d.c : B.g400, fontFamily: F }}>{d.r > 0 ? Math.round(d.s100) : "—"}</span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: B.g100 }}>
                <div style={{ height: "100%", borderRadius: 3, background: d.r > 0 ? d.c : "transparent", width: `${d.s100}%`, transition: "width 0.8s" }} />
              </div>
            </div>))}

            <SecH title="DNA Narrative" sub="Archetype, phase fit, character, ceiling" />
            <TArea value={cd.narrative} onChange={v => cU("narrative", v)} ph="Who is this player right now?" rows={3} />
            <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              <div style={{ flex: 1 }}>
                <SecH title="Strengths" />
                <div style={{ background: B.pkL, borderRadius: 6, padding: 8 }}>{[1, 2, 3].map(n => <Inp key={n} label={`${n}.`} value={cd[`str${n}`]} onChange={v => cU(`str${n}`, v)} />)}</div>
              </div>
              <div style={{ flex: 1 }}>
                <SecH title="Priorities" />
                <div style={{ background: B.blL, borderRadius: 6, padding: 8 }}>{[1, 2, 3].map(n => <Inp key={n} label={`${n}.`} value={cd[`pri${n}`]} onChange={v => cU(`pri${n}`, v)} />)}</div>
              </div>
            </div>
            <SecH title="12-Week Plan" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 8 }}>
              {[{ k: "explore", l: "EXPLORE (1-4)", c: B.pk }, { k: "challenge", l: "CHALLENGE (5-8)", c: B.bl }, { k: "execute", l: "EXECUTE (9-12)", c: B.nvD }].map(ph => (
                <div key={ph.k} style={{ background: B.g100, borderRadius: 6, padding: 8, borderTop: `3px solid ${ph.c}` }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: ph.c, fontFamily: F, marginBottom: 3 }}>{ph.l}</div>
                  <TArea value={cd[`pl_${ph.k}`]} onChange={v => cU(`pl_${ph.k}`, v)} ph="Focus..." rows={2} />
                </div>
              ))}
            </div>
            <SecH title="Squad Recommendation" />
            <Inp value={cd.sqRec} onChange={v => cU("sqRec", v)} ph="e.g. Squad 3 — U14/U16 advanced" />
          </div>);
        }
        return null;
      };

      const ro = ROLES.find(r => r.id === sp.role);
      const ini = sp.name ? sp.name.split(" ").map(w => w[0]).join("").slice(0, 2) : "?";

      return (<div style={{ minHeight: "100vh", fontFamily: F, background: B.g50 }}>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,600;0,700;0,800;0,900&display=swap" rel="stylesheet" />
        <Hdr label="COACH PORTAL" />
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: B.w, borderBottom: `1px solid ${B.g200}` }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", ...sGrad, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ color: B.w, fontSize: 11, fontWeight: 800, fontFamily: F }}>{ini}</span>
          </div>
          <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 700, color: B.nvD, fontFamily: F }}>{sp.name}</div><div style={{ fontSize: 9, color: B.g400, fontFamily: F }}>{ro?.label} • {sp.club}</div></div>
          <button onClick={() => setCView("survey")} style={{ fontSize: 9, fontWeight: 600, color: B.bl, background: "none", border: `1px solid ${B.bl}`, borderRadius: 4, padding: "3px 6px", cursor: "pointer", fontFamily: F }}>Survey</button>
        </div>
        <div style={{ padding: _isDesktop ? '8px 16px' : '6px 12px', background: B.g50, borderBottom: `1px solid ${B.g200}`, display: "flex", gap: _isDesktop ? 6 : 4, overflowX: "auto", justifyContent: _isDesktop ? 'center' : 'flex-start' }}>
          {pgN.map((n, i) => (<button key={i} onClick={() => { setCPage(i); goTop(); }}
            style={{ padding: _isDesktop ? '8px 18px' : '5px 10px', borderRadius: 20, border: "none", background: i === cPage ? B.pk : "transparent", color: i === cPage ? B.w : B.g400, fontSize: _isDesktop ? 12 : 10, fontWeight: 700, fontFamily: F, cursor: "pointer", whiteSpace: "nowrap" }}>{n}</button>))}
        </div>
        <div style={{ paddingBottom: 60 }}>{renderAP()}</div>
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: B.w, borderTop: `1px solid ${B.g200}`, padding: "8px 12px", display: "flex", justifyContent: "space-between", zIndex: 100 }}>
          <button onClick={() => { if (cPage > 0) { setCPage(p => p - 1); goTop(); } else { setCView("survey"); goTop(); } }} style={{ padding: "8px 14px", borderRadius: 6, border: `1px solid ${B.g200}`, background: "transparent", fontSize: 11, fontWeight: 600, color: B.g600, cursor: "pointer", fontFamily: F }}>← {cPage > 0 ? "Back" : "Survey"}</button>
          {cPage < 3 && <button onClick={() => { setCPage(p => p + 1); goTop(); }} style={{ padding: "8px 14px", borderRadius: 6, border: "none", background: `linear-gradient(135deg,${B.bl},${B.pk})`, fontSize: 11, fontWeight: 700, color: B.w, cursor: "pointer", fontFamily: F }}>Next →</button>}
          {cPage === 3 && <button onClick={() => { setCView("list"); setSelP(null); goTop(); }} style={{ padding: "8px 14px", borderRadius: 6, border: "none", background: B.grn, fontSize: 11, fontWeight: 700, color: B.w, cursor: "pointer", fontFamily: F }}>✓ Done</button>}
        </div>
      </div>);
    }
  }
  return null;
}
