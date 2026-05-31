import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { trackEvent } from "../lib/analytics";

const accent = "#C8A96E";

export default function Login() {
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/dashboard", { replace: true });
    });
  }, [navigate]);

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    setErrorMessage("");
    trackEvent("signup");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/dashboard" },
    });
    if (error) {
      setErrorMessage(error.message || "Unable to sign in with Google.");
      setGoogleLoading(false);
    }
  }

  async function handleEmailSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: window.location.origin + "/dashboard" },
      });
      if (error) {
        setErrorMessage(error.message);
      } else {
        setSuccessMessage("Check your email to confirm your account.");
        trackEvent("signup");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setErrorMessage(error.message);
      } else {
        trackEvent("login");
        navigate("/dashboard", { replace: true });
      }
    }
    setLoading(false);
  }

  const inputStyle = {
    width: "100%", height: 48, borderRadius: 12,
    border: "1px solid #EAEAEA", background: "#FAFAFA",
    padding: "0 14px", fontSize: 14, color: "#111", boxSizing: "border-box",
  };

  return (
    <main style={{
      minHeight: "100vh", background: "#FFFFFF",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      padding: 32,
    }}>
      <div style={{ width: "100%", maxWidth: 440, textAlign: "center" }}>
        <Link to="/" style={{ textDecoration: "none", color: "#111" }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>
            <span style={{ color: accent }}>●</span> SalonAI
          </h1>
        </Link>

        <div style={{
          marginTop: 32, border: "1px solid #EFEFEF", borderRadius: 24,
          padding: 36, background: "#FFF", boxShadow: "0 12px 40px rgba(0,0,0,0.06)",
        }}>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em" }}>
            {mode === "signup" ? "Create account" : "Welcome back"}
          </h2>
          <p style={{ margin: "10px 0 24px", color: "#666", fontSize: 15 }}>
            {mode === "signup" ? "Start your free trial today" : "Sign in to manage your salon"}
          </p>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            style={{
              width: "100%", height: 52, borderRadius: 14,
              border: "1px solid #EAEAEA", background: "#FAFAFA",
              color: "#111", fontSize: 15, fontWeight: 600,
              cursor: googleLoading ? "wait" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {googleLoading ? "Redirecting…" : "Continue with Google"}
          </button>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
            <div style={{ flex: 1, height: 1, background: "#EAEAEA" }} />
            <span style={{ fontSize: 12, color: "#AAA", flexShrink: 0 }}>or continue with email</span>
            <div style={{ flex: 1, height: 1, background: "#EAEAEA" }} />
          </div>

          {/* Email form */}
          <form onSubmit={handleEmailSubmit} style={{ display: "grid", gap: 12, textAlign: "left" }}>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="email@example.com" required style={inputStyle}
            />
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder={mode === "signup" ? "Create password (8+ chars)" : "Password"} required style={inputStyle}
            />
            <button type="submit" disabled={loading} style={{
              height: 50, borderRadius: 12, background: "#111",
              border: "none", color: "#FFF", fontSize: 15, fontWeight: 600,
              cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1,
            }}>
              {loading ? "Please wait…" : mode === "signup" ? "Create Account" : "Sign In"}
            </button>
          </form>

          {errorMessage && (
            <p style={{ margin: "14px 0 0", color: "#C62828", fontSize: 14 }}>{errorMessage}</p>
          )}
          {successMessage && (
            <p style={{ margin: "14px 0 0", color: "#065F46", fontSize: 14 }}>{successMessage}</p>
          )}

          <p style={{ margin: "18px 0 0", fontSize: 13, color: "#888" }}>
            {mode === "signin" ? (
              <>No account? <button onClick={() => { setMode("signup"); setErrorMessage(""); setSuccessMessage(""); }} style={{ background: "none", border: "none", color: accent, fontWeight: 600, cursor: "pointer", fontSize: 13, padding: 0 }}>Sign up free</button></>
            ) : (
              <>Already have one? <button onClick={() => { setMode("signin"); setErrorMessage(""); setSuccessMessage(""); }} style={{ background: "none", border: "none", color: accent, fontWeight: 600, cursor: "pointer", fontSize: 13, padding: 0 }}>Sign in</button></>
            )}
          </p>
        </div>

        <p style={{ marginTop: 20, fontSize: 13, color: "#999" }}>
          By signing in you agree to SalonAI Terms of Service
        </p>
      </div>
    </main>
  );
}
