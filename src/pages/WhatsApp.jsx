import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

const ACCENT = "#C8A96E";

export default function WhatsApp() {
  const navigate = useNavigate();
  const [salon, setSalon]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [saveMsg, setSaveMsg]       = useState("");
  const [conversations, setConversations] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);

  const [form, setForm] = useState({
    account_sid:  "",
    auth_token:   "",
    phone_number: "",
    enabled:      false,
  });

  // ── Load salon + integration ─────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return navigate("/login");

      const { data: salonData } = await supabase
        .from("salons")
        .select("id, name")
        .eq("owner_id", user.id)
        .single();

      if (!salonData) { setLoading(false); return; }
      setSalon(salonData);

      const { data: intg } = await supabase
        .from("salon_integrations")
        .select("*")
        .eq("salon_id", salonData.id)
        .eq("provider", "twilio")
        .maybeSingle();

      if (intg) {
        setForm({
          account_sid:  intg.account_sid  || "",
          auth_token:   intg.auth_token   || "",
          phone_number: intg.phone_number || "",
          enabled:      intg.enabled      || false,
        });
      }

      // Load unique client phones from conversations
      const { data: convs } = await supabase
        .from("whatsapp_conversations")
        .select("client_phone, role, message, action_taken, created_at")
        .eq("salon_id", salonData.id)
        .order("created_at", { ascending: false })
        .limit(200);

      if (convs) {
        // Group by client phone
        const grouped = {};
        for (const c of convs) {
          if (!grouped[c.client_phone]) grouped[c.client_phone] = [];
          grouped[c.client_phone].push(c);
        }
        setConversations(
          Object.entries(grouped).map(([phone, msgs]) => ({
            phone,
            lastMsg: msgs[0],
            messages: msgs.reverse(),
          }))
        );
      }
      setLoading(false);
    });
  }, [navigate]);

  // ── Save integration ─────────────────────────────────────────────────────
  async function handleSave(e) {
    e.preventDefault();
    if (!salon) return;
    setSaving(true); setSaveMsg("");
    const payload = {
      salon_id:     salon.id,
      provider:     "twilio",
      account_sid:  form.account_sid.trim(),
      auth_token:   form.auth_token.trim(),
      phone_number: form.phone_number.trim(),
      enabled:      form.enabled,
      updated_at:   new Date().toISOString(),
    };
    const { error } = await supabase
      .from("salon_integrations")
      .upsert(payload, { onConflict: "salon_id,provider" });
    setSaveMsg(error ? `Error: ${error.message}` : "✓ Settings saved");
    setSaving(false);
    setTimeout(() => setSaveMsg(""), 3000);
  }

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) return <div style={styles.center}>Loading…</div>;
  if (!salon)  return (
    <div style={styles.center}>
      <p>No salon found. <Link to="/salon-setup">Create your salon first →</Link></p>
    </div>
  );

  const webhookUrl = `${window.location.origin}/api/whatsapp-webhook`;

  return (
    <div style={styles.page}>
      {/* Nav */}
      <nav style={styles.nav}>
        <Link to="/dashboard" style={styles.navLink}>← Dashboard</Link>
        <span style={styles.navTitle}>WhatsApp AI</span>
        <span />
      </nav>

      <div style={styles.container}>
        <h1 style={styles.h1}>WhatsApp AI Administrator</h1>
        <p style={styles.sub}>
          Connect your Twilio WhatsApp number so clients can book appointments
          directly via WhatsApp — 24/7, in their language.
        </p>

        {/* Status badge */}
        <div style={{ ...styles.badge, background: form.enabled ? "#d4edda" : "#f8f9fa" }}>
          <span style={{ ...styles.dot, background: form.enabled ? "#28a745" : "#aaa" }} />
          {form.enabled ? "Active — accepting WhatsApp bookings" : "Inactive — not connected yet"}
        </div>

        {/* ── Settings form ── */}
        <section style={styles.card}>
          <h2 style={styles.h2}>Twilio Configuration</h2>

          <div style={styles.infoBox}>
            <strong>Webhook URL</strong> — paste this in Twilio console:
            <div style={styles.code}>{webhookUrl}</div>
            <button style={styles.copyBtn} onClick={() => navigator.clipboard.writeText(webhookUrl)}>
              Copy
            </button>
          </div>

          <form onSubmit={handleSave}>
            <label style={styles.label}>Account SID</label>
            <input
              style={styles.input}
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={form.account_sid}
              onChange={(e) => setForm({ ...form, account_sid: e.target.value })}
            />

            <label style={styles.label}>Auth Token</label>
            <input
              style={styles.input}
              type="password"
              placeholder="Your Twilio Auth Token"
              value={form.auth_token}
              onChange={(e) => setForm({ ...form, auth_token: e.target.value })}
            />

            <label style={styles.label}>WhatsApp Phone Number</label>
            <input
              style={styles.input}
              placeholder="whatsapp:+14155238886"
              value={form.phone_number}
              onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
            />
            <p style={styles.hint}>Format: <code>whatsapp:+1XXXXXXXXXX</code></p>

            <div style={styles.toggleRow}>
              <label style={styles.label}>Enable integration</label>
              <button
                type="button"
                style={{ ...styles.toggle, background: form.enabled ? ACCENT : "#ddd" }}
                onClick={() => setForm({ ...form, enabled: !form.enabled })}
              >
                {form.enabled ? "ON" : "OFF"}
              </button>
            </div>

            <button type="submit" style={styles.saveBtn} disabled={saving}>
              {saving ? "Saving…" : "Save settings"}
            </button>
            {saveMsg && <p style={{ color: saveMsg.startsWith("✓") ? "green" : "red", marginTop: 8 }}>{saveMsg}</p>}
          </form>
        </section>

        {/* ── Setup instructions ── */}
        <section style={styles.card}>
          <h2 style={styles.h2}>How to Connect (Twilio Sandbox)</h2>
          <ol style={styles.ol}>
            <li>Go to <strong>console.twilio.com</strong> → Messaging → Try it out → Send a WhatsApp message.</li>
            <li>Follow sandbox instructions: your clients send <code>join [keyword]</code> to <strong>+1 415 523 8886</strong>.</li>
            <li>In sandbox settings, set <strong>Webhook URL</strong> to:<br/>
              <code style={styles.codeInline}>{webhookUrl}</code>
            </li>
            <li>Copy your <strong>Account SID</strong> and <strong>Auth Token</strong> from the Twilio dashboard and paste above.</li>
            <li>Phone number for sandbox: <code>whatsapp:+14155238886</code></li>
            <li>Toggle <strong>Enable integration</strong> ON and save.</li>
          </ol>
          <p style={styles.hint}>
            For production: apply for a WhatsApp Business number in Twilio, get approval, then update the phone number above.
          </p>
        </section>

        {/* ── Conversation logs ── */}
        <section style={styles.card}>
          <h2 style={styles.h2}>Recent Conversations</h2>
          {conversations.length === 0 ? (
            <p style={{ color: "#999", textAlign: "center", padding: "24px 0" }}>
              No conversations yet. Waiting for first WhatsApp message…
            </p>
          ) : (
            <div style={styles.convList}>
              {/* Client list */}
              <div style={styles.clientList}>
                {conversations.map((c) => (
                  <div
                    key={c.phone}
                    style={{
                      ...styles.clientItem,
                      background: selectedClient === c.phone ? "#f5f0e8" : "#fff",
                      borderLeft: selectedClient === c.phone ? `3px solid ${ACCENT}` : "3px solid transparent",
                    }}
                    onClick={() => setSelectedClient(c.phone)}
                  >
                    <div style={styles.clientPhone}>{formatPhone(c.phone)}</div>
                    <div style={styles.clientLast}>
                      {c.lastMsg.role === "user" ? "📱 " : "🤖 "}
                      {c.lastMsg.message.slice(0, 40)}{c.lastMsg.message.length > 40 ? "…" : ""}
                    </div>
                    {c.lastMsg.action_taken && (
                      <span style={styles.actionTag}>{c.lastMsg.action_taken}</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Message thread */}
              <div style={styles.thread}>
                {selectedClient ? (
                  conversations.find((c) => c.phone === selectedClient)?.messages.map((m, i) => (
                    <div key={i} style={m.role === "user" ? styles.msgUser : styles.msgBot}>
                      <span style={styles.msgText}>{m.message}</span>
                      <span style={styles.msgTime}>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  ))
                ) : (
                  <p style={{ color: "#999", textAlign: "center", paddingTop: 40 }}>
                    Select a conversation
                  </p>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function formatPhone(raw) {
  return raw.replace("whatsapp:", "").replace(/(\+\d)(\d{3})(\d{3})(\d{4})/, "$1 ($2) $3-$4");
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = {
  page:    { minHeight: "100vh", background: "#fafafa", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  center:  { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "#666" },
  nav:     { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", borderBottom: "1px solid #eee", background: "#fff" },
  navLink: { color: ACCENT, textDecoration: "none", fontSize: 14 },
  navTitle:{ fontWeight: 600, fontSize: 16 },
  container: { maxWidth: 860, margin: "0 auto", padding: "32px 24px" },
  h1:      { fontSize: 28, fontWeight: 700, marginBottom: 8, color: "#111" },
  h2:      { fontSize: 18, fontWeight: 600, marginBottom: 16, color: "#222" },
  sub:     { color: "#666", marginBottom: 20, lineHeight: 1.5 },
  card:    { background: "#fff", borderRadius: 12, padding: "24px", marginBottom: 20, border: "1px solid #eee" },
  badge:   { display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 20, padding: "6px 14px", fontSize: 13, marginBottom: 24, border: "1px solid #e0e0e0" },
  dot:     { width: 8, height: 8, borderRadius: "50%", display: "inline-block" },
  infoBox: { background: "#f9f6f1", borderRadius: 8, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#555", position: "relative" },
  code:    { fontFamily: "monospace", fontSize: 12, background: "#efefef", borderRadius: 4, padding: "4px 8px", marginTop: 6, wordBreak: "break-all" },
  codeInline: { fontFamily: "monospace", fontSize: 12, background: "#efefef", borderRadius: 4, padding: "2px 6px" },
  copyBtn: { marginTop: 8, fontSize: 12, padding: "4px 10px", border: `1px solid ${ACCENT}`, background: "transparent", color: ACCENT, borderRadius: 4, cursor: "pointer" },
  label:   { display: "block", fontSize: 13, fontWeight: 500, color: "#333", marginBottom: 4, marginTop: 16 },
  input:   { width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, boxSizing: "border-box", outline: "none" },
  hint:    { fontSize: 12, color: "#999", marginTop: 4 },
  toggleRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16 },
  toggle:  { padding: "6px 16px", border: "none", borderRadius: 20, color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 13 },
  saveBtn: { marginTop: 20, padding: "10px 24px", background: ACCENT, color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", width: "100%" },
  ol:      { paddingLeft: 20, lineHeight: 2, color: "#444", fontSize: 14 },
  convList: { display: "flex", gap: 0, height: 400, border: "1px solid #eee", borderRadius: 8, overflow: "hidden" },
  clientList: { width: 220, borderRight: "1px solid #eee", overflowY: "auto", flexShrink: 0 },
  clientItem: { padding: "12px 14px", cursor: "pointer", borderBottom: "1px solid #f5f5f5", transition: "background .15s" },
  clientPhone: { fontSize: 13, fontWeight: 600, color: "#222", marginBottom: 2 },
  clientLast: { fontSize: 12, color: "#888", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  actionTag: { display: "inline-block", marginTop: 4, fontSize: 10, background: ACCENT, color: "#fff", borderRadius: 4, padding: "1px 6px" },
  thread:  { flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 8 },
  msgUser: { alignSelf: "flex-start", maxWidth: "75%", display: "flex", flexDirection: "column", gap: 2 },
  msgBot:  { alignSelf: "flex-end", maxWidth: "75%", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 },
  msgText: { background: "#f0f0f0", borderRadius: 10, padding: "8px 12px", fontSize: 13, lineHeight: 1.4, display: "block", whiteSpace: "pre-wrap" },
  msgTime: { fontSize: 10, color: "#bbb" },
};
