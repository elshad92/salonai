import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

const ACCENT      = "#C8A96E";
const WEBHOOK_URL = "https://salonai-app.netlify.app/api/telegram-webhook";

export default function Messaging() {
  const navigate = useNavigate();
  const [salon, setSalon]     = useState(null);
  const [loading, setLoading] = useState(true);

  // Telegram form
  const [tgForm, setTgForm] = useState({
    bot_token:    "",
    bot_username: "",
    enabled:      false,
  });
  const [tgSaving, setTgSaving]     = useState(false);
  const [tgMsg, setTgMsg]           = useState("");
  const [webhookStatus, setWebhookStatus] = useState(null); // null | 'ok' | 'error'
  const [webhookChecking, setWebhookChecking] = useState(false);

  // WhatsApp form (legacy)
  const [waForm, setWaForm] = useState({
    account_sid:  "",
    auth_token:   "",
    phone_number: "",
    enabled:      false,
  });
  const [waSaving, setWaSaving] = useState(false);
  const [waMsg, setWaMsg]       = useState("");

  // Conversations
  const [conversations, setConversations]     = useState([]);
  const [selectedClient, setSelectedClient]   = useState(null);
  const [channelFilter, setChannelFilter]     = useState("all");

  // ── Load ──────────────────────────────────────────────────────────────────
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

      // Load both integrations in parallel
      const [tgRes, waRes, convsRes] = await Promise.all([
        supabase
          .from("salon_integrations")
          .select("*")
          .eq("salon_id", salonData.id)
          .eq("provider", "telegram")
          .maybeSingle(),
        supabase
          .from("salon_integrations")
          .select("*")
          .eq("salon_id", salonData.id)
          .eq("provider", "twilio")
          .maybeSingle(),
        supabase
          .from("whatsapp_conversations")
          .select("client_phone, role, message, action_taken, created_at, channel")
          .eq("salon_id", salonData.id)
          .order("created_at", { ascending: false })
          .limit(200),
      ]);

      if (tgRes.data) {
        setTgForm({
          bot_token:    tgRes.data.telegram_bot_token    || "",
          bot_username: tgRes.data.telegram_bot_username || "",
          enabled:      tgRes.data.enabled               || false,
        });
      }

      if (waRes.data) {
        setWaForm({
          account_sid:  waRes.data.account_sid  || "",
          auth_token:   waRes.data.auth_token   || "",
          phone_number: waRes.data.phone_number || "",
          enabled:      waRes.data.enabled      || false,
        });
      }

      if (convsRes.data) {
        const grouped = {};
        for (const c of convsRes.data) {
          const key = `${c.client_phone}__${c.channel || "whatsapp"}`;
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(c);
        }
        setConversations(
          Object.entries(grouped).map(([key, msgs]) => ({
            key,
            phone:   msgs[0].client_phone,
            channel: msgs[0].channel || "whatsapp",
            lastMsg: msgs[0],
            messages: [...msgs].reverse(),
          }))
        );
      }

      setLoading(false);
    });
  }, [navigate]);

  // ── Save Telegram ─────────────────────────────────────────────────────────
  async function handleTgSave(e) {
    e.preventDefault();
    if (!salon) return;
    setTgSaving(true); setTgMsg(""); setWebhookStatus(null);

    const payload = {
      salon_id:              salon.id,
      provider:              "telegram",
      telegram_bot_token:    tgForm.bot_token.trim(),
      telegram_bot_username: tgForm.bot_username.trim(),
      enabled:               tgForm.enabled,
      updated_at:            new Date().toISOString(),
    };

    const { error } = await supabase
      .from("salon_integrations")
      .upsert(payload, { onConflict: "salon_id,provider" });

    if (error) {
      setTgMsg(`Error: ${error.message}`);
      setTgSaving(false);
      return;
    }

    // Register Telegram webhook if token is provided
    if (tgForm.bot_token.trim() && tgForm.enabled) {
      setWebhookChecking(true);
      try {
        const res = await fetch(
          `https://api.telegram.org/bot${tgForm.bot_token.trim()}/setWebhook`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url:          WEBHOOK_URL,
              secret_token: salon.id,
              allowed_updates: ["message"],
            }),
          }
        );
        const data = await res.json();
        setWebhookStatus(data.ok ? "ok" : "error");
        setTgMsg(data.ok ? "✓ Saved & webhook registered" : `Saved, but webhook error: ${data.description}`);
      } catch {
        setWebhookStatus("error");
        setTgMsg("Saved, but could not reach Telegram API. Check your bot token.");
      }
      setWebhookChecking(false);
    } else {
      setTgMsg("✓ Settings saved");
    }

    setTgSaving(false);
    setTimeout(() => setTgMsg(""), 5000);
  }

  // ── Save WhatsApp (legacy) ────────────────────────────────────────────────
  async function handleWaSave(e) {
    e.preventDefault();
    if (!salon) return;
    setWaSaving(true); setWaMsg("");
    const payload = {
      salon_id:     salon.id,
      provider:     "twilio",
      account_sid:  waForm.account_sid.trim(),
      auth_token:   waForm.auth_token.trim(),
      phone_number: waForm.phone_number.trim(),
      enabled:      waForm.enabled,
      updated_at:   new Date().toISOString(),
    };
    const { error } = await supabase
      .from("salon_integrations")
      .upsert(payload, { onConflict: "salon_id,provider" });
    setWaMsg(error ? `Error: ${error.message}` : "✓ Settings saved");
    setWaSaving(false);
    setTimeout(() => setWaMsg(""), 3000);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return <div style={S.center}>Loading…</div>;
  if (!salon)  return (
    <div style={S.center}>
      <p>No salon found. <Link to="/salon-setup">Create your salon first →</Link></p>
    </div>
  );

  const tgActive   = tgForm.enabled && tgForm.bot_token;
  const waActive   = waForm.enabled;
  const filteredConvs = channelFilter === "all"
    ? conversations
    : conversations.filter((c) => c.channel === channelFilter);

  return (
    <div style={S.page}>
      {/* Nav */}
      <nav style={S.nav}>
        <Link to="/dashboard" style={S.navLink}>← Dashboard</Link>
        <span style={S.navTitle}>Messaging AI</span>
        <span />
      </nav>

      <div style={S.container}>
        <h1 style={S.h1}>Messaging AI Administrator</h1>
        <p style={S.sub}>
          AI receptionist that chats with your clients 24/7 — books appointments, answers questions,
          handles cancellations. Available via Telegram (ready now) and WhatsApp (via Twilio).
        </p>

        {/* ── Telegram section ── */}
        <section style={S.card}>
          <div style={S.sectionHead}>
            <span style={S.channelIcon}>✈️</span>
            <h2 style={S.h2}>Telegram AI</h2>
            <span style={{ ...S.badge, background: tgActive ? "#d4edda" : "#f8f9fa" }}>
              <span style={{ ...S.dot, background: tgActive ? "#28a745" : "#aaa" }} />
              {tgActive ? "Active" : "Not connected"}
            </span>
            {webhookStatus === "ok" && <span style={S.webhookOk}>Webhook ✅</span>}
            {webhookStatus === "error" && <span style={S.webhookErr}>Webhook ❌</span>}
          </div>

          {/* BotFather instructions */}
          <div style={S.infoBox}>
            <strong>How to create a Telegram bot (30 seconds):</strong>
            <ol style={{ margin: "8px 0 0", paddingLeft: 18, lineHeight: 1.9, fontSize: 13, color: "#555" }}>
              <li>Open Telegram → search <strong>@BotFather</strong></li>
              <li>Send <code style={S.code}>/newbot</code></li>
              <li>Choose a display name, then a username ending in <code style={S.code}>bot</code></li>
              <li>Copy the token BotFather gives you → paste below</li>
            </ol>
            <a
              href="https://t.me/BotFather"
              target="_blank"
              rel="noopener noreferrer"
              style={S.openBtn}
            >
              Open @BotFather →
            </a>
          </div>

          <form onSubmit={handleTgSave}>
            <label style={S.label}>Bot Token</label>
            <input
              style={S.input}
              placeholder="1234567890:AAF..."
              value={tgForm.bot_token}
              onChange={(e) => setTgForm({ ...tgForm, bot_token: e.target.value })}
            />

            <label style={S.label}>Bot Username</label>
            <input
              style={S.input}
              placeholder="YourSalonBot"
              value={tgForm.bot_username}
              onChange={(e) => setTgForm({ ...tgForm, bot_username: e.target.value })}
            />
            <p style={S.hint}>Without the @ sign. Example: <code>MyBeautySalonBot</code></p>

            <div style={S.webhookRow}>
              <span style={S.label}>Webhook URL (auto-registered on save):</span>
              <code style={S.codeBlock}>{WEBHOOK_URL}</code>
            </div>

            <div style={S.toggleRow}>
              <label style={S.label}>Enable Telegram AI</label>
              <button
                type="button"
                style={{ ...S.toggle, background: tgForm.enabled ? ACCENT : "#ddd" }}
                onClick={() => setTgForm({ ...tgForm, enabled: !tgForm.enabled })}
              >
                {tgForm.enabled ? "ON" : "OFF"}
              </button>
            </div>

            <button
              type="submit"
              style={S.saveBtn}
              disabled={tgSaving || webhookChecking}
            >
              {tgSaving || webhookChecking ? "Saving…" : "Save & Register Webhook"}
            </button>
            {tgMsg && (
              <p style={{ color: tgMsg.startsWith("✓") ? "green" : "#c00", marginTop: 8 }}>{tgMsg}</p>
            )}
          </form>
        </section>

        {/* ── WhatsApp section (legacy) ── */}
        <details style={S.card}>
          <summary style={{ ...S.h2, cursor: "pointer", userSelect: "none", listStyle: "none" }}>
            <div style={S.sectionHead}>
              <span style={S.channelIcon}>💬</span>
              <span>WhatsApp AI via Twilio</span>
              <span style={{ ...S.badge, background: waActive ? "#d4edda" : "#f8f9fa" }}>
                <span style={{ ...S.dot, background: waActive ? "#28a745" : "#aaa" }} />
                {waActive ? "Active" : "Not connected"}
              </span>
              <span style={S.comingSoonTag}>Optional</span>
            </div>
          </summary>

          <p style={{ ...S.sub, marginTop: 12 }}>
            Requires a Twilio account with WhatsApp Business approval. Expand to configure.
          </p>

          <div style={S.infoBox}>
            <strong>Webhook URL</strong> — paste this in Twilio console:
            <code style={S.codeBlock}>{window.location.origin}/api/whatsapp-webhook</code>
          </div>

          <form onSubmit={handleWaSave}>
            <label style={S.label}>Account SID</label>
            <input
              style={S.input}
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={waForm.account_sid}
              onChange={(e) => setWaForm({ ...waForm, account_sid: e.target.value })}
            />

            <label style={S.label}>Auth Token</label>
            <input
              style={S.input}
              type="password"
              placeholder="Your Twilio Auth Token"
              value={waForm.auth_token}
              onChange={(e) => setWaForm({ ...waForm, auth_token: e.target.value })}
            />

            <label style={S.label}>WhatsApp Phone Number</label>
            <input
              style={S.input}
              placeholder="whatsapp:+14155238886"
              value={waForm.phone_number}
              onChange={(e) => setWaForm({ ...waForm, phone_number: e.target.value })}
            />

            <div style={S.toggleRow}>
              <label style={S.label}>Enable WhatsApp</label>
              <button
                type="button"
                style={{ ...S.toggle, background: waForm.enabled ? ACCENT : "#ddd" }}
                onClick={() => setWaForm({ ...waForm, enabled: !waForm.enabled })}
              >
                {waForm.enabled ? "ON" : "OFF"}
              </button>
            </div>

            <button type="submit" style={S.saveBtn} disabled={waSaving}>
              {waSaving ? "Saving…" : "Save WhatsApp Settings"}
            </button>
            {waMsg && <p style={{ color: waMsg.startsWith("✓") ? "green" : "#c00", marginTop: 8 }}>{waMsg}</p>}
          </form>
        </details>

        {/* ── Conversation logs ── */}
        <section style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ ...S.h2, margin: 0 }}>Conversations</h2>
            <div style={{ display: "flex", gap: 6 }}>
              {["all", "telegram", "whatsapp"].map((ch) => (
                <button
                  key={ch}
                  onClick={() => { setChannelFilter(ch); setSelectedClient(null); }}
                  style={{
                    ...S.filterBtn,
                    background: channelFilter === ch ? ACCENT : "#f5f5f5",
                    color:      channelFilter === ch ? "#fff"  : "#666",
                    border:     channelFilter === ch ? `1px solid ${ACCENT}` : "1px solid #e0e0e0",
                  }}
                >
                  {ch === "all" ? "All" : ch === "telegram" ? "✈️ Telegram" : "💬 WhatsApp"}
                </button>
              ))}
            </div>
          </div>

          {filteredConvs.length === 0 ? (
            <p style={{ color: "#999", textAlign: "center", padding: "24px 0" }}>
              No conversations yet. Waiting for first message…
            </p>
          ) : (
            <div style={S.convList}>
              <div style={S.clientList}>
                {filteredConvs.map((c) => (
                  <div
                    key={c.key}
                    style={{
                      ...S.clientItem,
                      background:  selectedClient === c.key ? "#f5f0e8" : "#fff",
                      borderLeft:  selectedClient === c.key ? `3px solid ${ACCENT}` : "3px solid transparent",
                    }}
                    onClick={() => setSelectedClient(c.key)}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 11 }}>{c.channel === "telegram" ? "✈️" : "💬"}</span>
                      <div style={S.clientPhone}>{formatPhone(c.phone, c.channel)}</div>
                    </div>
                    <div style={S.clientLast}>
                      {c.lastMsg.role === "user" ? "👤 " : "🤖 "}
                      {c.lastMsg.message.slice(0, 38)}{c.lastMsg.message.length > 38 ? "…" : ""}
                    </div>
                    {c.lastMsg.action_taken && (
                      <span style={S.actionTag}>{c.lastMsg.action_taken}</span>
                    )}
                  </div>
                ))}
              </div>

              <div style={S.thread}>
                {selectedClient ? (
                  filteredConvs.find((c) => c.key === selectedClient)?.messages.map((m, i) => (
                    <div key={i} style={m.role === "user" ? S.msgUser : S.msgBot}>
                      <span style={S.msgText}>{m.message}</span>
                      <span style={S.msgTime}>
                        {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
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

function formatPhone(raw, channel) {
  if (channel === "telegram") return raw.replace("telegram:", "Telegram #");
  return raw.replace("whatsapp:", "").replace(/(\+\d)(\d{3})(\d{3})(\d{4})/, "$1 ($2) $3-$4");
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  page:       { minHeight: "100vh", background: "#fafafa", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  center:     { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "#666" },
  nav:        { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", borderBottom: "1px solid #eee", background: "#fff" },
  navLink:    { color: ACCENT, textDecoration: "none", fontSize: 14 },
  navTitle:   { fontWeight: 600, fontSize: 16 },
  container:  { maxWidth: 860, margin: "0 auto", padding: "32px 24px" },
  h1:         { fontSize: 28, fontWeight: 700, marginBottom: 8, color: "#111" },
  h2:         { fontSize: 18, fontWeight: 600, marginBottom: 0, color: "#222" },
  sub:        { color: "#666", marginBottom: 20, lineHeight: 1.5 },
  card:       { background: "#fff", borderRadius: 12, padding: "24px", marginBottom: 20, border: "1px solid #eee" },
  sectionHead:{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" },
  channelIcon:{ fontSize: 22 },
  badge:      { display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 20, padding: "4px 12px", fontSize: 12, border: "1px solid #e0e0e0" },
  dot:        { width: 7, height: 7, borderRadius: "50%", display: "inline-block" },
  webhookOk:  { fontSize: 12, color: "#1a7f37", background: "#dcfce7", borderRadius: 12, padding: "3px 10px" },
  webhookErr: { fontSize: 12, color: "#c00", background: "#fee2e2", borderRadius: 12, padding: "3px 10px" },
  comingSoonTag: { fontSize: 11, background: "#f3f4f6", borderRadius: 10, padding: "3px 9px", color: "#666" },
  infoBox:    { background: "#f9f6f1", borderRadius: 8, padding: "14px 16px", marginBottom: 20, fontSize: 13, color: "#555" },
  code:       { fontFamily: "monospace", fontSize: 12, background: "#efefef", borderRadius: 4, padding: "2px 6px" },
  codeBlock:  { display: "block", fontFamily: "monospace", fontSize: 12, background: "#efefef", borderRadius: 4, padding: "6px 10px", marginTop: 6, wordBreak: "break-all" },
  openBtn:    { display: "inline-block", marginTop: 12, fontSize: 13, padding: "6px 14px", border: `1px solid ${ACCENT}`, color: ACCENT, borderRadius: 6, textDecoration: "none", fontWeight: 600 },
  label:      { display: "block", fontSize: 13, fontWeight: 500, color: "#333", marginBottom: 4, marginTop: 16 },
  input:      { width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, boxSizing: "border-box", outline: "none" },
  hint:       { fontSize: 12, color: "#999", marginTop: 4 },
  webhookRow: { marginTop: 16 },
  toggleRow:  { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16 },
  toggle:     { padding: "6px 16px", border: "none", borderRadius: 20, color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 13 },
  saveBtn:    { marginTop: 20, padding: "10px 24px", background: ACCENT, color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", width: "100%" },
  filterBtn:  { padding: "5px 12px", borderRadius: 16, fontSize: 12, fontWeight: 500, cursor: "pointer" },
  convList:   { display: "flex", gap: 0, height: 420, border: "1px solid #eee", borderRadius: 8, overflow: "hidden" },
  clientList: { width: 230, borderRight: "1px solid #eee", overflowY: "auto", flexShrink: 0 },
  clientItem: { padding: "12px 14px", cursor: "pointer", borderBottom: "1px solid #f5f5f5", transition: "background .15s" },
  clientPhone:{ fontSize: 13, fontWeight: 600, color: "#222", marginBottom: 2 },
  clientLast: { fontSize: 12, color: "#888", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 },
  actionTag:  { display: "inline-block", marginTop: 4, fontSize: 10, background: ACCENT, color: "#fff", borderRadius: 4, padding: "1px 6px" },
  thread:     { flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 8 },
  msgUser:    { alignSelf: "flex-start", maxWidth: "75%", display: "flex", flexDirection: "column", gap: 2 },
  msgBot:     { alignSelf: "flex-end", maxWidth: "75%", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 },
  msgText:    { background: "#f0f0f0", borderRadius: 10, padding: "8px 12px", fontSize: 13, lineHeight: 1.4, display: "block", whiteSpace: "pre-wrap" },
  msgTime:    { fontSize: 10, color: "#bbb" },
};
