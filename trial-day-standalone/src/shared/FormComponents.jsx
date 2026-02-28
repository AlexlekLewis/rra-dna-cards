// ═══ SHARED UI COMPONENTS (minimal extract) ═══
import { B, F, LOGO, sGrad } from '../data/theme';

// ═══ HEADER ═══
export function Hdr({ label, onLogoClick }) {
    return (
        <div style={{ ...sGrad, padding: "16px 16px 14px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -20, right: -30, width: 180, height: 180, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.06)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <img src={LOGO} alt="" onClick={onLogoClick} style={{ width: 40, height: 40, objectFit: "contain", cursor: onLogoClick ? "pointer" : "default", transition: "opacity 0.2s" }} />
                <div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: 2, textTransform: "uppercase", fontFamily: F }}>Rajasthan Royals Academy Melbourne</div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: B.w, fontFamily: F }}>Trial Day</div>
                </div>
            </div>
            <div style={{ display: "inline-block", marginTop: 5, padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, fontFamily: F, background: B.pk, color: B.w }}>{label}</div>
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: B.pk }} />
        </div>
    );
}
