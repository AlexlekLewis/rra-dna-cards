import React from "react";
import { supabase } from "../supabaseClient";

/**
 * Global Error Boundary — catches render errors that would otherwise
 * white-screen the entire app. Logs the error to analytics_events
 * and displays a user-friendly fallback UI.
 */
export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught:", error, errorInfo);

        // Fire-and-forget — log to analytics but never block UI
        (async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user?.id) {
                    await supabase.from("analytics_events").insert({
                        user_id: session.user.id,
                        event_type: "error_boundary",
                        event_detail: {
                            message: error?.message,
                            stack: error?.stack?.slice(0, 500),
                            componentStack: errorInfo?.componentStack?.slice(0, 500),
                        },
                        session_id: sessionStorage.getItem("rra_session_id") || "unknown",
                    });
                }
            } catch {
                // Analytics must never break the error recovery
            }
        })();
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#0a0a14",
                    color: "#ffffff",
                    fontFamily: "'Inter', sans-serif",
                    padding: 32,
                }}>
                    <div style={{
                        maxWidth: 480,
                        textAlign: "center",
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 16,
                        padding: "48px 32px",
                    }}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
                        <h2 style={{ margin: "0 0 12px", fontSize: 22, fontWeight: 600 }}>
                            Something went wrong
                        </h2>
                        <p style={{ margin: "0 0 24px", color: "rgba(255,255,255,0.6)", fontSize: 14, lineHeight: 1.6 }}>
                            The app encountered an unexpected error. Your data is safe.
                            Try refreshing the page — if the problem persists, contact your program coordinator.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            style={{
                                background: "linear-gradient(135deg, #e91e8c, #6b21a8)",
                                color: "#fff",
                                border: "none",
                                borderRadius: 8,
                                padding: "12px 28px",
                                fontSize: 14,
                                fontWeight: 600,
                                cursor: "pointer",
                            }}
                        >
                            Refresh Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
