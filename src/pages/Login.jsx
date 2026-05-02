import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleGoogleLogin() {
    setLoading(true);
    setErrorMessage("");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/dashboard",
      },
    });

    if (error) {
      setErrorMessage(error.message || "Unable to sign in with Google.");
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16 }}>
      <section style={{ width: "100%", maxWidth: 420 }}>
        <h1>Login</h1>
        <p>Continue with your Google account.</p>

        <button type="button" onClick={handleGoogleLogin} disabled={loading}>
          {loading ? "Redirecting..." : "Continue with Google"}
        </button>

        {errorMessage ? <p style={{ color: "crimson" }}>{errorMessage}</p> : null}
      </section>
    </main>
  );
}
