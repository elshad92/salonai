import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { generatePostsAI, generatePosts } from "../lib/aiMarketer";
import { useIsMobile } from "../lib/useMediaQuery";
import { trackEvent } from "../lib/analytics";

const SAVED_KEY = "salonai_saved_posts";

function loadSaved() {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) || "[]"); } catch { return []; }
}
function persistSaved(posts) {
  localStorage.setItem(SAVED_KEY, JSON.stringify(posts));
}

export default function Marketing() {
  const isMobile = useIsMobile();
  const [posts, setPosts] = useState(() => generatePosts(5));
  const [copied, setCopied] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [salonName, setSalonName] = useState("your salon");
  const [services, setServices] = useState("");
  const [tone, setTone] = useState("professional");
  const [saved, setSaved] = useState(loadSaved);
  const [tab, setTab] = useState("generated");

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
        const { data } = await supabase.from("salons").select("name,services").eq("owner_id", user.id).single();
        const name = data?.name || "your salon";
        const svc = data?.services?.map(s => s.name).join(", ") || "";
        setSalonName(name);
        setServices(svc);
        const p = await generatePostsAI(name, svc, "professional");
        if (p) setPosts(p);
      } catch {
        // keep fallback posts
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function regenerate() {
    setGenerating(true);
    setCopied(null);
    try {
      const p = await generatePostsAI(salonName, services, tone);
      if (p) { setPosts(p); setTab("generated"); }
      trackEvent("marketing_posts_generated", { tone });
    } catch {
      setPosts(generatePosts(5));
    }
    setGenerating(false);
  }

  function copyPost(key, text, hashtags) {
    navigator.clipboard.writeText(text + "\n\n" + hashtags);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  function savePost(post) {
    if (saved.some(s => s.text === post.text)) return;
    const updated = [{ ...post, savedAt: Date.now() }, ...saved];
    setSaved(updated);
    persistSaved(updated);
    trackEvent("marketing_post_saved");
  }

  function unsavePost(text) {
    const updated = saved.filter(s => s.text !== text);
    setSaved(updated);
    persistSaved(updated);
  }

  const typeLabel = { promo: "🎯 Promo", engagement: "💬 Engagement", tip: "💡 Tip", seasonal: "🌸 Seasonal" };
  const typeColor = {
    promo:      { bg: "#FFF8ED", border: "#F0DDB5" },
    engagement: { bg: "#F0F7FF", border: "#C5DBEF" },
    tip:        { bg: "#F2FFF5", border: "#C5E8CE" },
    seasonal:   { bg: "#FFF0F5", border: "#E8C5D5" },
  };
  const tones = [
    { id: "professional", label: "Professional" },
    { id: "fun",          label: "Fun" },
    { id: "trendy",       label: "Trendy" },
  ];

  const displayPosts = tab === "saved" ? saved : posts;

  return (
    <main style={{
      minHeight: "100vh", background: "#FFF", color: "#111",
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: isMobile ? 16 : 32,
    }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* Header */}
        <header style={{
          display: "flex", justifyContent: "space-between",
          alignItems: isMobile ? "flex-start" : "center",
          flexDirection: isMobile ? "column" : "row",
          gap: 14, marginBottom: 24,
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: isMobile ? 26 : 34, fontWeight: 600, letterSpacing: "-0.02em" }}>
              📸 AI Marketer
            </h1>
            <p style={{ margin: "8px 0 0", color: "#555", fontSize: 15 }}>
              Ready-to-post Instagram content for {salonName}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Link to="/dashboard" style={{
              textDecoration: "none", padding: "10px 14px",
              borderRadius: 999, border: "1px solid #EAEAEA",
              color: "#111", fontSize: 14, fontWeight: 500,
            }}>← Dashboard</Link>
            <button onClick={regenerate} disabled={generating} style={{
              padding: "10px 16px", borderRadius: 999,
              background: generating ? "#E5D5B5" : "#C8A96E", border: "none",
              color: "#111", fontSize: 14, fontWeight: 600,
              cursor: generating ? "wait" : "pointer",
            }}>{generating ? "Generating…" : "🔄 New Posts"}</button>
          </div>
        </header>

        {/* Controls row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          {/* Tone selector */}
          <div style={{ display: "flex", gap: 6 }}>
            {tones.map(t => (
              <button key={t.id} onClick={() => setTone(t.id)} style={{
                padding: "7px 14px", borderRadius: 999,
                border: "1px solid " + (tone === t.id ? "#111" : "#EAEAEA"),
                background: tone === t.id ? "#111" : "#FFF",
                color: tone === t.id ? "#FFF" : "#555",
                fontSize: 13, fontWeight: 500, cursor: "pointer",
              }}>{t.label}</button>
            ))}
          </div>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { id: "generated", label: "Generated" },
              { id: "saved",     label: saved.length > 0 ? `Saved (${saved.length})` : "Saved" },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: "7px 14px", borderRadius: 999,
                border: "1px solid " + (tab === t.id ? "#C8A96E" : "#EAEAEA"),
                background: tab === t.id ? "#FFF8ED" : "#FFF",
                color: tab === t.id ? "#C8A96E" : "#888",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>{t.label}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 16px" }}>
            <p style={{ margin: 0, color: "#999", fontSize: 15 }}>Generating posts for your salon…</p>
          </div>
        ) : tab === "saved" && saved.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 16px", border: "1px dashed #EAEAEA", borderRadius: 20 }}>
            <p style={{ margin: 0, color: "#999", fontSize: 15 }}>No saved posts yet.</p>
            <p style={{ margin: "8px 0 0", color: "#BBB", fontSize: 13 }}>Hit ★ on posts you want to keep.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {displayPosts.map((post) => {
              const key = post.savedAt ?? post.id;
              const colors = typeColor[post.type] || typeColor.tip;
              const isSaved = saved.some(s => s.text === post.text);
              return (
                <article key={key} style={{
                  border: "1px solid " + colors.border,
                  borderRadius: 20, padding: isMobile ? 18 : 24, background: "#FFF",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 999, background: colors.bg, border: "1px solid " + colors.border }}>
                      {typeLabel[post.type] || post.type}
                    </span>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "#999" }}>Best time: {post.bestTime}</span>
                      {tab === "saved" ? (
                        <button onClick={() => unsavePost(post.text)} title="Remove" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#C8A96E", padding: 0, lineHeight: 1 }}>★</button>
                      ) : (
                        <button onClick={() => savePost(post)} title={isSaved ? "Saved" : "Save"} style={{ background: "none", border: "none", cursor: isSaved ? "default" : "pointer", fontSize: 18, color: isSaved ? "#C8A96E" : "#DDD", padding: 0, lineHeight: 1 }}>★</button>
                      )}
                    </div>
                  </div>

                  <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6 }}>{post.text}</p>
                  <p style={{ margin: "12px 0 0", fontSize: 13, color: "#C8A96E" }}>{post.hashtags}</p>

                  {post.visual && (
                    <p style={{ margin: "10px 0 0", fontSize: 13, color: "#888", display: "flex", gap: 6, alignItems: "flex-start" }}>
                      <span style={{ flexShrink: 0 }}>📷</span>
                      <span>{post.visual}</span>
                    </p>
                  )}

                  <button onClick={() => copyPost(key, post.text, post.hashtags)} style={{
                    marginTop: 14, padding: "8px 16px", borderRadius: 10,
                    border: "1px solid #EAEAEA",
                    background: copied === key ? "#111" : "#FAFAFA",
                    color: copied === key ? "#FFF" : "#111",
                    fontSize: 13, fontWeight: 500, cursor: "pointer",
                  }}>{copied === key ? "Copied!" : "Copy to clipboard"}</button>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
