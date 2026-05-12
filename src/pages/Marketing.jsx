import { useState } from "react";
import { Link } from "react-router-dom";
import { generatePosts } from "../lib/aiMarketer";

export default function Marketing() {
  const [posts, setPosts] = useState(() => generatePosts(5));
  const [copied, setCopied] = useState(null);

  function regenerate() {
    setPosts(generatePosts(5));
    setCopied(null);
  }

  function copyPost(id, text, hashtags) {
    navigator.clipboard.writeText(text + "\n\n" + hashtags);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  const typeLabel = { promo: "🎯 Promo", engagement: "💬 Engagement", tip: "💡 Tip" };
  const typeColor = {
    promo: { bg: "#FFF8ED", border: "#F0DDB5" },
    engagement: { bg: "#F0F7FF", border: "#C5DBEF" },
    tip: { bg: "#F2FFF5", border: "#C5E8CE" },
  };

  return (
    <main style={{
      minHeight: "100vh", background: "#FFF", color: "#111",
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: 32,
    }}>      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <header style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 28,
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 34, fontWeight: 600, letterSpacing: "-0.02em" }}>
              📸 AI Marketer
            </h1>
            <p style={{ margin: "8px 0 0", color: "#555", fontSize: 15 }}>
              Ready-to-post Instagram content generated for your salon
            </p>
          </div>
          <nav style={{ display: "flex", gap: 12 }}>
            <Link to="/dashboard" style={{
              textDecoration: "none", padding: "10px 14px",
              borderRadius: 999, border: "1px solid #EAEAEA",
              color: "#111", fontSize: 14, fontWeight: 500,
            }}>Dashboard</Link>
            <button onClick={regenerate} style={{
              padding: "10px 14px", borderRadius: 999,
              background: "#C8A96E", border: "none",
              color: "#111", fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}>🔄 Generate New</button>
          </nav>
        </header>
        <div style={{ display: "grid", gap: 16 }}>
          {posts.map((post) => {
            const colors = typeColor[post.type] || typeColor.tip;
            return (
              <article key={post.id} style={{
                border: "1px solid " + colors.border,
                borderRadius: 20, padding: 24, background: "#FFF",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 999, background: colors.bg, border: "1px solid " + colors.border }}>{typeLabel[post.type]}</span>
                  <span style={{ fontSize: 12, color: "#999" }}>Best time: {post.bestTime}</span>
                </div>
                <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6 }}>{post.text}</p>
                <p style={{ margin: "12px 0 0", fontSize: 13, color: "#C8A96E" }}>{post.hashtags}</p>
                <button onClick={() => copyPost(post.id, post.text, post.hashtags)} style={{
                  marginTop: 14, padding: "8px 16px", borderRadius: 10,
                  border: "1px solid #EAEAEA",
                  background: copied === post.id ? "#111" : "#FAFAFA",
                  color: copied === post.id ? "#FFF" : "#111",
                  fontSize: 13, fontWeight: 500, cursor: "pointer",
                }}>{copied === post.id ? "Copied!" : "Copy to clipboard"}</button>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}