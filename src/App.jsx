import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";

// ═══ CONTEXT PROVIDERS ═══
import { AuthProvider, useAuth } from "./context/AuthContext";
import { EngineProvider, useEngine } from "./context/EngineContext";

// ═══ ERROR BOUNDARY ═══
import { ErrorBoundary } from "./shared/ErrorBoundary";

// ═══ LAZY-LOADED PORTAL COMPONENTS (code splitting) ═══
const CoachDashboard = React.lazy(() => import("./CoachDashboard"));
const AdminDashboard = React.lazy(() => import("./AdminDashboard"));
const EliteProgram = React.lazy(() => import("./coach/EliteProgram"));
const PlayerOnboarding = React.lazy(() => import("./player/PlayerOnboarding"));
const PlayerPortal = React.lazy(() => import("./player/PlayerPortal"));

// ═══ EAGERLY LOADED (small, often needed) ═══
import ReportCard from "./coach/ReportCard";
import SquadRoster from "./coach/SquadRoster";
import { generateReportPDF } from "./coach/reportGenerator";

// ═══ DATA & ENGINE ═══
import { B, F, LOGO, sGrad, dkWrap, _isDesktop } from "./data/theme";
import { ROLES, IQ_ITEMS, MN_ITEMS, PH_MAP, PHASES } from "./data/skillItems";
import { getAge, getBracket, calcCCM, calcPDI, calcCohortPercentile, calcAgeScore, techItems } from "./engine/ratingEngine";
import { loadPlayersFromDB, saveAssessmentToDB } from "./db/playerDb";
import { MOCK } from "./data/mockPlayers";
import { COACH_DEFS } from "./data/skillDefinitions";
import { BAT_ARCH, BWL_ARCH } from "./data/skillItems";

// ═══ SHARED UI COMPONENTS ═══
import { Hdr, SecH, Inp, TArea, AssGrid, Ring } from "./shared/FormComponents";

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
  const { compTiers, dbWeights, engineConst, engineLoading } = useEngine();

  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selP, setSelP] = useSessionState('rra_selP', null);
  const [cView, setCView] = useSessionState('rra_cView', "list");
  const [cPage, setCPage] = useSessionState('rra_cPage', 0);
  const [reportPlayer, setReportPlayer] = useState(null);

  const saveTimer = useRef(null);
  const pendingCdRef = useRef({});

  const goTop = () => window.scrollTo(0, 0);
  const btnSty = (ok, full) => ({ padding: full ? "14px 20px" : "8px 16px", borderRadius: 8, border: "none", background: ok ? `linear-gradient(135deg,${B.bl},${B.pk})` : B.g200, color: ok ? B.w : B.g400, fontSize: 13, fontWeight: 800, fontFamily: F, cursor: ok ? "pointer" : "default", letterSpacing: .5, textTransform: "uppercase", width: full ? "100%" : "auto", marginTop: 6 });
  const backBtn = { marginTop: 8, padding: "10px 16px", border: `1px solid ${B.g200}`, borderRadius: 6, background: "transparent", fontSize: 11, fontWeight: 600, color: B.g600, cursor: "pointer", fontFamily: F, width: "100%" };

  const refreshPlayers = useCallback(async () => {
    setLoading(true);
    try { const ps = await loadPlayersFromDB(); setPlayers(ps.length ? ps : MOCK); } catch (e) { console.error(e); setPlayers(MOCK); }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (portal === 'coach' || portal === 'super_admin' || portal === 'admin') refreshPlayers();
  }, [portal, refreshPlayers]);

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

  // ═══ SPLASH / AUTH SCREEN ═══
  if (authLoading || (portal && engineLoading)) return (
    <div style={{ minHeight: "100vh", ...sGrad, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <img src={LOGO} alt="" style={{ width: 80, height: 80, objectFit: "contain", marginBottom: 16, filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.3))" }} />
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontFamily: F, fontWeight: 600 }}>Loading...</div>
    </div>
  );

  if (!portal) return (
    <div style={{ minHeight: "100vh", ...sGrad, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
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

  // ═══ PLAYER PORTAL ═══
  if (portal === "player") {
    if (userProfile?.submitted) {
      return <PlayerPortal />;
    }
    return <PlayerOnboarding />;
  }

  // ═══ COACH / ADMIN PORTAL ═══
  if (["coach", "admin", "super_admin"].includes(portal)) {
    const sp = selP ? players.find(p => p.id === selP) : null;

    // Guard: non-admin users cannot access admin view
    if (cView === "admin" && !isAdmin) setCView("list");

    const PortalSwitcher = () => {
      if (!isAdmin) return null;
      const isOnAdmin = cView === "admin";
      const tabs = [
        { id: "list", label: "🏏 Coach Portal", active: !isOnAdmin },
        { id: "admin", label: "🔧 Admin Portal", active: isOnAdmin },
      ];
      return (
        <div style={{ display: 'flex', background: `linear-gradient(135deg, ${B.nvD}, #1a1b2e)`, borderBottom: `1px solid rgba(255,255,255,0.08)`, padding: '0' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => { setCView(t.id); goTop(); }}
              style={{
                flex: 1, padding: '10px 16px', border: 'none', cursor: 'pointer', fontFamily: F,
                fontSize: 11, fontWeight: t.active ? 800 : 600, letterSpacing: 0.5,
                background: t.active ? `linear-gradient(135deg, ${t.id === 'admin' ? '#f59e0b20' : `${B.bl}20`}, transparent)` : 'transparent',
                color: t.active ? (t.id === 'admin' ? '#fbbf24' : B.w) : 'rgba(255,255,255,0.4)',
                borderBottom: t.active ? `2px solid ${t.id === 'admin' ? '#f59e0b' : B.bl}` : '2px solid transparent',
                transition: 'all 0.2s',
              }}
            >{t.label}</button>
          ))}
        </div>
      );
    };

    // ADMIN DASHBOARD
    if (cView === "admin" && isAdmin) return (
      <AdminDashboard
        players={players}
        compTiers={compTiers}
        dbWeights={dbWeights}
        engineConst={engineConst}
        session={session}
        onBack={() => { setCView("list"); goTop(); }}
        onSwitchToCoach={() => { setCView("list"); goTop(); }}
        isAdmin={isAdmin}
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

    // ELITE PROGRAM
    if (cView === "program") return (
      <EliteProgram
        session={session}
        isAdmin={isAdmin}
        onBack={() => { setCView("list"); goTop(); }}
      />
    );

    // DASHBOARD
    if (cView === "dashboard") return (
      <CoachDashboard
        session={session}
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

    // SQUADS VIEW
    if (cView === "squads") return (
      <div style={{ minHeight: "100vh", fontFamily: F, background: B.g50 }}>
        <Hdr label="COACH PORTAL" onLogoClick={signOut} />
        <PortalSwitcher />
        <div style={{ padding: '4px 12px', background: B.g100, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ fontSize: 9, color: B.g400, fontFamily: F }}>{session?.user?.email}</div>
          </div>
          <button onClick={signOut} style={{ fontSize: 9, fontWeight: 600, color: B.red, background: 'none', border: 'none', cursor: 'pointer', fontFamily: F }}>Sign Out</button>
        </div>

        <SquadRoster
          session={session}
          players={players}
          onSelectPlayer={(id) => { setSelP(id); setCView("survey"); goTop(); }}
          onOpenDashboard={(id) => { setSelP(id); setCView("dashboard"); goTop(); }}
          B={B} F={F} sGrad={sGrad}
        />
        <div style={{ padding: 20 }}>
          <button onClick={() => { setCView("list"); goTop(); }} style={backBtn}>← All Players</button>
        </div>
      </div>
    );

    // LIST VIEW
    if (cView === "list") return (<div style={{ minHeight: "100vh", fontFamily: F, background: B.g50 }}>
      {/* ── HEADER ── */}
      <Hdr label="COACH PORTAL" onLogoClick={signOut} />
      <PortalSwitcher />
      <div style={{ padding: '4px 12px', background: B.g100, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ fontSize: 9, color: B.g400, fontFamily: F }}>{session?.user?.email}</div>
        </div>
        <button onClick={signOut} style={{ fontSize: 9, fontWeight: 600, color: B.red, background: 'none', border: 'none', cursor: 'pointer', fontFamily: F }}>Sign Out</button>
      </div>

      <div style={{ padding: 12, ...dkWrap }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <SecH title={`Player Roster (${players.filter(p => p.submitted).length})`} sub="Tap player to view survey or assess" />
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => { setCView("squads"); goTop(); }} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: `linear-gradient(135deg,${B.pk},${B.prp})`, fontSize: 11, fontWeight: 700, color: B.w, cursor: "pointer", fontFamily: F, whiteSpace: "nowrap" }}>🏟️ My Squads</button>
            <button onClick={() => { setCView("program"); goTop(); }} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: `linear-gradient(135deg,${B.nvD},${B.bl})`, fontSize: 11, fontWeight: 700, color: B.w, cursor: "pointer", fontFamily: F, whiteSpace: "nowrap" }}>📋 Elite Program</button>
            <button onClick={() => { setCView("dashboard"); goTop(); }} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: `linear-gradient(135deg,${B.bl},${B.pk})`, fontSize: 11, fontWeight: 700, color: B.w, cursor: "pointer", fontFamily: F, whiteSpace: "nowrap" }}>📊 Dashboard</button>
          </div>
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
        <button onClick={signOut} style={backBtn}>← Sign Out</button>
      </div>
    </div>);

    // SURVEY VIEW
    if (cView === "survey" && sp) {
      const ccmR = calcCCM(sp.grades, sp.dob, compTiers, engineConst);
      const a = getAge(sp.dob), br = getBracket(sp.dob), ro = ROLES.find(r => r.id === sp.role);

      return (<div style={{ minHeight: "100vh", fontFamily: F, background: B.g50 }}>
        <Hdr label="COACH PORTAL" onLogoClick={signOut} />
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
      // Sync ref to latest cd so debounced save always has current data
      pendingCdRef.current = cd;
      const cU = (k, v) => {
        setPlayers(ps => ps.map(p => p.id === sp.id ? { ...p, cd: { ...p.cd, [k]: v } } : p));
        // Eagerly update the ref so the debounced save always has the latest value
        pendingCdRef.current = { ...pendingCdRef.current, [k]: v };
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          saveAssessmentToDB(sp.id, pendingCdRef.current);
        }, 2000);
      };

      const t = techItems(sp.role);
      const ccmR = calcCCM(sp.grades, sp.dob, compTiers, engineConst);
      const dn = calcPDI({ ...cd, _dob: sp.dob }, sp.self_ratings, sp.role, ccmR, dbWeights, engineConst, sp.grades, {}, sp.topBat, sp.topBowl, compTiers);
      const pgN = ["Identity", "Technical", "Tactical/Mental/Physical", "PDI Summary"];

      const renderAP = () => {
        if (cPage === 0) return (<div style={{ padding: "0 12px 16px", ...dkWrap }}>
          <SecH title="Batting Archetype" sub="Select the one archetype that best describes this player's batting identity" />
          <div style={{ display: "grid", gap: 6, ...(_isDesktop ? { gridTemplateColumns: 'repeat(2, 1fr)' } : {}) }}>{BAT_ARCH.map(a => (<div key={a.id} onClick={() => cU("batA", a.id)}
            style={{ background: cd.batA === a.id ? B.pkL : B.w, border: `2px solid ${cd.batA === a.id ? a.c : B.g200}`, borderLeft: `4px solid ${a.c}`, borderRadius: 8, padding: 10, cursor: "pointer" }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: B.nvD, fontFamily: F }}>{a.nm}</div>
            <div style={{ fontSize: 10, color: B.g600, fontFamily: F }}>{a.sub}</div>
          </div>))}</div>
          <SecH title="Bowling Archetype" sub="Select the one archetype that best describes this player's bowling identity" />
          <div style={{ display: "grid", gap: 6, ...(_isDesktop ? { gridTemplateColumns: 'repeat(2, 1fr)' } : {}) }}>{BWL_ARCH.map(a => (<div key={a.id} onClick={() => cU("bwlA", a.id)}
            style={{ background: cd.bwlA === a.id ? B.blL : B.w, border: `2px solid ${cd.bwlA === a.id ? a.c : B.g200}`, borderLeft: `4px solid ${a.c}`, borderRadius: 8, padding: 10, cursor: "pointer" }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: B.nvD, fontFamily: F }}>{a.nm}</div>
            <div style={{ fontSize: 10, color: B.g600, fontFamily: F }}>{a.sub}</div>
          </div>))}</div>
          <SecH title="Phase Effectiveness" />
          <div style={{ fontSize: 10, fontWeight: 600, color: B.pk, fontFamily: F, marginTop: 4, marginBottom: 6 }}>Batting</div>
          <AssGrid items={PHASES.map(p => p.nm)} values={Object.fromEntries(PHASES.map((p, i) => [`pb_${i}`, cd[`pb_${p.id}`]]))} onRate={(k, v) => { const idx = parseInt(k.split('_').pop()); cU(`pb_${PHASES[idx].id}`, v); }} color={B.pk} SKILL_DEFS={COACH_DEFS} keyPrefix="pb" />
          <div style={{ fontSize: 10, fontWeight: 600, color: B.bl, fontFamily: F, marginTop: 8, marginBottom: 6 }}>Bowling</div>
          <AssGrid items={PHASES.map(p => p.nm)} values={Object.fromEntries(PHASES.map((p, i) => [`pw_${i}`, cd[`pw_${p.id}`]]))} onRate={(k, v) => { const idx = parseInt(k.split('_').pop()); cU(`pw_${PHASES[idx].id}`, v); }} color={B.bl} SKILL_DEFS={COACH_DEFS} keyPrefix="pw" />
        </div>);

        if (cPage === 1) return (<div style={{ padding: "0 12px 16px", ...dkWrap }}>
          <SecH title={t.pL} sub="Rate 1-5" />
          <div style={{ background: B.g100, borderRadius: 8, padding: '8px 12px', marginBottom: 10, lineHeight: 1.6 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: B.nvD, fontFamily: F, marginBottom: 4 }}>Standardised Rating Rubric</div>
            <div style={{ fontSize: 10, color: B.g600, fontFamily: F }}>
              <strong style={{ color: B.g800 }}>1 = Novice</strong> — Fundamental skill gaps. Needs direct instruction.<br />
              <strong style={{ color: B.g800 }}>2 = Developing</strong> — Shows understanding but inconsistent execution.<br />
              <strong style={{ color: B.g800 }}>3 = Competent</strong> — Reliable execution under moderate pressure.<br />
              <strong style={{ color: B.g800 }}>4 = Advanced</strong> — Consistent execution under high pressure. Above-age-group standard.<br />
              <strong style={{ color: B.g800 }}>5 = Elite</strong> — Exceptional. Pathway-ready or representative standard.
            </div>
            <div style={{ fontSize: 9, color: B.pk, fontFamily: F, marginTop: 4, fontWeight: 600 }}>Tap ⓘ next to each item for detailed scoring criteria.</div>
          </div>
          <AssGrid items={t.pri} values={cd} onRate={cU} color={B.pk} SKILL_DEFS={COACH_DEFS} keyPrefix="t1" />
          <SecH title={t.sL} />
          <AssGrid items={t.sec} values={cd} onRate={cU} color={B.bl} SKILL_DEFS={COACH_DEFS} keyPrefix="t2" />
        </div>);

        if (cPage === 2) return (<div style={{ padding: "0 12px 16px", ...dkWrap }}>
          <SecH title="Game Intelligence" />
          <AssGrid items={IQ_ITEMS} values={cd} onRate={cU} color={B.sky} SKILL_DEFS={COACH_DEFS} keyPrefix="iq" />
          <SecH title="Mental & Character" sub="Royals Way aligned" />
          <AssGrid items={MN_ITEMS} values={cd} onRate={cU} color={B.prp} SKILL_DEFS={COACH_DEFS} keyPrefix="mn" />
          <SecH title="Physical & Athletic" />
          <AssGrid items={PH_MAP[sp.role] || PH_MAP.batter} values={cd} onRate={cU} color={B.nv} SKILL_DEFS={COACH_DEFS} keyPrefix="ph" />
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
        <Hdr label="COACH PORTAL" onLogoClick={signOut} />
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: B.w, borderBottom: `1px solid ${B.g200}` }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", ...sGrad, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ color: B.w, fontSize: 11, fontWeight: 800, fontFamily: F }}>{ini}</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: B.nvD, fontFamily: F }}>{sp.name}</div>
            <div style={{ fontSize: 9, color: B.g400, fontFamily: F }}>{ro?.label} • {sp.club}</div>
          </div>
          <button onClick={() => setCView("survey")} style={{ fontSize: 9, fontWeight: 600, color: B.bl, background: "none", border: `1px solid ${B.bl}`, borderRadius: 4, padding: "3px 6px", cursor: "pointer", fontFamily: F }}>Survey</button>
        </div>

        <div style={{ padding: _isDesktop ? '8px 16px' : '6px 12px', background: B.g50, borderBottom: `1px solid ${B.g200}`, display: "flex", gap: _isDesktop ? 6 : 4, overflowX: "auto", justifyContent: _isDesktop ? 'center' : 'flex-start' }}>
          {pgN.map((n, i) => (<button key={i} onClick={() => { setCPage(i); goTop(); }}
            style={{ padding: _isDesktop ? '8px 18px' : '5px 10px', borderRadius: 20, border: "none", background: i === cPage ? B.pk : "transparent", color: i === cPage ? B.w : B.g400, fontSize: _isDesktop ? 12 : 10, fontWeight: 700, fontFamily: F, cursor: "pointer", whiteSpace: "nowrap" }}>{n}</button>))}
        </div>

        <div style={{ paddingBottom: 60 }}>{renderAP()}</div>

        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: B.w, borderTop: `1px solid ${B.g200}`, padding: "8px 12px", display: "flex", justifyContent: "space-between", zIndex: 100 }}>
          <button onClick={() => {
            if (cPage > 0) { setCPage(p => p - 1); goTop(); }
            else { setCView("survey"); goTop(); }
          }} style={{ padding: "8px 14px", borderRadius: 6, border: `1px solid ${B.g200}`, background: "transparent", fontSize: 11, fontWeight: 600, color: B.g600, cursor: "pointer", fontFamily: F }}>
            ← {cPage > 0 ? "Back" : "Survey"}
          </button>

          {cPage < 3 && <button onClick={() => { setCPage(p => p + 1); goTop(); }} style={{ padding: "8px 14px", borderRadius: 6, border: "none", background: `linear-gradient(135deg,${B.bl},${B.pk})`, fontSize: 11, fontWeight: 700, color: B.w, cursor: "pointer", fontFamily: F }}>Next →</button>}

          {cPage === 3 && <button onClick={async () => {
            setReportPlayer(sp);
            await new Promise(r => setTimeout(r, 300));
            const el = document.getElementById('rra-report-card');
            if (el) { try { await generateReportPDF(el, sp.name); } catch (e) { console.error('PDF generation error:', e); } }
            setReportPlayer(null);
          }} style={{ padding: '8px 14px', borderRadius: 6, border: `1px solid ${B.bl}`, background: 'transparent', fontSize: 11, fontWeight: 700, color: B.bl, cursor: 'pointer', fontFamily: F }}>📄 Generate Report</button>}

          {cPage === 3 && <button onClick={() => { setCView("list"); setSelP(null); goTop(); }} style={{ padding: "8px 14px", borderRadius: 6, border: "none", background: B.grn, fontSize: 11, fontWeight: 700, color: B.w, cursor: "pointer", fontFamily: F }}>✓ Done</button>}
        </div>

        {/* Hidden ReportCard for PDF capture */}
        {reportPlayer && (() => {
          const rCd = reportPlayer.cd || {};
          const rCcm = calcCCM(reportPlayer.grades, reportPlayer.dob, compTiers, engineConst);
          const rDn = calcPDI({ ...rCd, _dob: reportPlayer.dob }, reportPlayer.self_ratings, reportPlayer.role, rCcm, dbWeights, engineConst, reportPlayer.grades, {}, reportPlayer.topBat, reportPlayer.topBowl, compTiers);
          const rPathway = rDn.pdiPct;
          const rCohort = calcCohortPercentile(rDn.pdi, players, compTiers, dbWeights, engineConst);
          const rAge = calcAgeScore(rCcm.arm, engineConst);
          const rOverall = Math.round((rPathway + rCohort + rAge) / 3);
          const rGrade = rDn.pdi >= 4 ? 5 : rDn.pdi >= 3 ? 4 : rDn.pdi >= 2 ? 3 : rDn.pdi >= 1 ? 2 : 1;
          const rDomains = (rDn.domains || []).map(d => ({ label: d.l, value: Math.round(d.s100), color: d.c }));
          const rStrengths = [rCd.str1, rCd.str2, rCd.str3].filter(Boolean);
          const rGrowth = [rCd.pri1, rCd.pri2, rCd.pri3].filter(Boolean);
          const rPhase = {};
          PHASES.forEach(p => { rPhase[`batting_${p.id}`] = rCd[`pb_${p.id}`]; rPhase[`bowling_${p.id}`] = rCd[`pw_${p.id}`]; });
          const rPlan = {
            explore: (rCd.pl_explore || '').split('\n').filter(Boolean),
            challenge: (rCd.pl_challenge || '').split('\n').filter(Boolean),
            execute: (rCd.pl_execute || '').split('\n').filter(Boolean),
          };
          return <ReportCard player={reportPlayer} assessment={rCd} engine={{
            overall: rOverall, pathway: rPathway, cohort: rCohort, agePct: rAge,
            pdi: rDn.pdi, grade: rGrade, domains: rDomains,
            strengths: rStrengths, growthAreas: rGrowth,
            sagi: { alignment: rDn.sagiLabel },
            phaseScores: rPhase, narrative: rCd.narrative,
            plan: rPlan, squad: rCd.sqRec,
          }} />;
        })()}
      </div>);
    }
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
