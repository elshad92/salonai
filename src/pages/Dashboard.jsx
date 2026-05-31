import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { generateInsightsAI, generateInsights } from "../lib/aiAnalyst";
import { useIsMobile } from "../lib/useMediaQuery";

export default function Dashboard() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [userName, setUserName] = useState("");
  const [appointments, setAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [appointmentsError, setAppointmentsError] = useState("");
  const [weekCount, setWeekCount] = useState(null);
  const [monthCount, setMonthCount] = useState(null);
  const [aiMessages, setAiMessages] = useState([
    "3 clients asked for weekend availability. Consider opening one extra slot on Saturday.",
    "Your noon hours are near full capacity. Raise premium service prices by 5-7% next week.",
    "Top add-on today: scalp massage. Bundle it with haircut for higher conversion.",
  ]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [salon, setSalon] = useState(null);
  const [loyalty, setLoyalty] = useState([]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [salonChecked, setSalonChecked] = useState(false);
  const [whatsappActive, setWhatsappActive] = useState(null);
  const [telegramActive, setTelegramActive] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setUserName(user.user_metadata?.full_name || user.email || "");
        const { data: salonData } = await supabase
          .from("salons").select("id, slug, name").eq("owner_id", user.id).single();
        if (salonData) {
          setSalon(salonData);
          const [loyaltyRes, waRes, tgRes] = await Promise.all([
            supabase.from("loyalty").select("*").eq("salon_id", salonData.id).order("visits", { ascending: false }).limit(5),
            supabase.from("salon_integrations").select("enabled").eq("salon_id", salonData.id).eq("provider", "twilio").maybeSingle(),
            supabase.from("salon_integrations").select("enabled, telegram_bot_token").eq("salon_id", salonData.id).eq("provider", "telegram").maybeSingle(),
          ]);
          setLoyalty(loyaltyRes.data || []);
          setWhatsappActive(waRes.data?.enabled ?? false);
          setTelegramActive(tgRes.data?.enabled && !!tgRes.data?.telegram_bot_token);
        }
        setSalonChecked(true);
      }
    });
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/");
  }

  async function cancelAppointment(id) {
    if (!window.confirm("Cancel this appointment?")) return;
    setCancellingId(id);
    await supabase.from("appointments").delete().eq("id", id);
    setAppointments(prev => prev.filter(a => a.id !== id));
    setCancellingId(null);
  }

  function copyBookingLink() {
    if (!salon?.slug) return;
    navigator.clipboard.writeText(window.location.origin + "/s/" + salon.slug);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  useEffect(() => {
    if (!salon) return; // wait until salon is loaded before querying appointments
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const dow = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
    const weekStart = monday.toISOString().slice(0, 10);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

    async function loadAll() {
      setLoadingAppointments(true);
      setAppointmentsError("");

      const [todayRes, weekRes, monthRes] = await Promise.all([
        supabase.from("appointments").select("id, name, service, time, master, date")
          .eq("salon_id", salon.id).eq("date", today).order("time", { ascending: true }),
        supabase.from("appointments").select("*", { count: "exact", head: true })
          .eq("salon_id", salon.id).gte("date", weekStart).lte("date", today),
        supabase.from("appointments").select("*", { count: "exact", head: true })
          .eq("salon_id", salon.id).gte("date", monthStart).lte("date", today),
      ]);

      if (todayRes.error) {
        setAppointmentsError(todayRes.error.message || "Failed to load appointments.");
        setAppointments([]);
      } else {
        setAppointments((todayRes.data ?? []).map(item => ({
          id: item.id,
          client: item.name || "Unknown client",
          service: item.service || "Unknown service",
          time: item.time || "--:--",
          stylist: item.master || "",
        })));
      }
      setWeekCount(weekRes.count ?? 0);
      setMonthCount(monthRes.count ?? 0);
      setLoadingAppointments(false);
    }
    loadAll();
  }, [salon]);

  useEffect(() => {
    if (weekCount === null || monthCount === null || loadingAppointments) return;
    async function loadInsights() {
      setLoadingAI(true);
      const data = { todayAppointments: appointments, weekCount, monthCount };
      try {
        const ai = await generateInsightsAI(data);
        if (ai && ai.length) { setAiMessages(ai); setLoadingAI(false); return; }
      } catch { /* AI insights unavailable, use local fallback */ }
      setAiMessages(generateInsights(data));
      setLoadingAI(false);
    }
    loadInsights();
  }, [weekCount, monthCount, appointments, loadingAppointments]);

  const stats = useMemo(() => [
    { label: "Bookings Today", value: loadingAppointments ? "…" : String(appointments.length), trend: "Live" },
    { label: "This Week", value: weekCount === null ? "…" : String(weekCount), trend: "Mon – Today" },
    { label: "This Month", value: monthCount === null ? "…" : String(monthCount), trend: new Date().toLocaleString("en", { month: "long" }) },
    { label: "Telegram AI",  value: telegramActive === null ? "…" : (telegramActive ? "Active" : "Off"),  trend: telegramActive ? "Answering clients" : "Set up →", link: "/messaging" },
    { label: "WhatsApp AI", value: whatsappActive === null ? "…" : (whatsappActive ? "Active" : "Off"), trend: whatsappActive ? "Active" : "via Twilio", link: "/messaging" },
  ], [appointments.length, loadingAppointments, weekCount, monthCount, whatsappActive, telegramActive]);

  const bookingUrl = salon?.slug ? window.location.origin + "/s/" + salon.slug : null;
  const pad = isMobile ? 16 : 32;

  return (
    <main style={{
      minHeight: "100vh", background: "#FFFFFF", color: "#111111",
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      padding: pad,
    }}>
      <div style={{ maxWidth: 1300, margin: "0 auto" }}>

        {/* Header */}
        <header style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: isMobile ? 26 : 34, fontWeight: 600, letterSpacing: "-0.02em" }}>
                {userName ? `Hello, ${userName.split(" ")[0]}` : "Dashboard"}
              </h1>
              {!isMobile && (
                <p style={{ margin: "8px 0 0", color: "#555", fontSize: 15 }}>
                  Clean overview of salon performance and AI insights
                </p>
              )}
            </div>
            {!isMobile && (
              <nav style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Link to="/booking" style={{ textDecoration: "none", padding: "10px 14px", borderRadius: 999, border: "1px solid #EAEAEA", color: "#111", fontSize: 14, fontWeight: 500 }}>Booking</Link>
                <Link to="/marketing" style={{ textDecoration: "none", padding: "10px 14px", borderRadius: 999, border: "1px solid #EAEAEA", color: "#111", fontSize: 14, fontWeight: 500 }}>Marketing</Link>
                <Link to="/analyst" style={{ textDecoration: "none", padding: "10px 14px", borderRadius: 999, border: "1px solid #EAEAEA", color: "#111", fontSize: 14, fontWeight: 500 }}>Analytics</Link>
                <Link to="/clients" style={{ textDecoration: "none", padding: "10px 14px", borderRadius: 999, border: "1px solid #EAEAEA", color: "#111", fontSize: 14, fontWeight: 500 }}>Clients</Link>
                <Link to="/messaging" style={{ textDecoration: "none", padding: "10px 14px", borderRadius: 999, border: "1px solid #C8A96E", color: "#C8A96E", fontSize: 14, fontWeight: 600 }}>✈️ Messaging AI</Link>
                <Link to="/salon-setup" style={{ textDecoration: "none", padding: "10px 14px", borderRadius: 999, border: "1px solid #EAEAEA", color: "#111", fontSize: 14, fontWeight: 500 }}>Settings</Link>
                <button onClick={handleLogout} style={{ padding: "10px 14px", borderRadius: 999, background: "#C8A96E", color: "#111", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer" }}>Logout</button>
              </nav>
            )}
          </div>
          {/* Mobile nav — horizontal scroll */}
          {isMobile && (
            <div style={{ marginTop: 12, display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, WebkitOverflowScrolling: "touch" }}>
              {[
                { to: "/booking", label: "Booking" },
                { to: "/marketing", label: "Marketing" },
                { to: "/analyst", label: "Analytics" },
                { to: "/clients", label: "Clients" },
                { to: "/messaging", label: "✈️ Messaging AI" },
                { to: "/salon-setup", label: "Settings" },
              ].map(({ to, label }) => (
                <Link key={to} to={to} style={{ textDecoration: "none", padding: "8px 14px", borderRadius: 999, border: "1px solid #EAEAEA", color: "#111", fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", flexShrink: 0 }}>{label}</Link>
              ))}
              <button onClick={handleLogout} style={{ padding: "8px 14px", borderRadius: 999, background: "#C8A96E", color: "#111", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>Logout</button>
            </div>
          )}
        </header>

        {/* Booking link banner */}
        {bookingUrl && (
          <div style={{ background: "#FCFAF5", border: "1px solid #E9DFC9", borderRadius: 16, padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: isMobile ? "flex-start" : "center", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, color: "#888", fontWeight: 500 }}>Your booking link</p>
              <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 600, color: "#111", wordBreak: "break-all" }}>{bookingUrl}</p>
            </div>
            <button onClick={copyBookingLink} style={{
              padding: "10px 20px", borderRadius: 12, border: "1px solid #E9DFC9",
              background: copiedLink ? "#111" : "#FFF", color: copiedLink ? "#FFF" : "#111",
              fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
              alignSelf: isMobile ? "flex-start" : "center",
            }}>
              {copiedLink ? "Copied!" : "Copy Link"}
            </button>
          </div>
        )}

        {/* No salon nudge */}
        {salonChecked && !salon && (
          <div style={{ background: "#F9F9F9", border: "1px solid #EAEAEA", borderRadius: 16, padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <p style={{ margin: 0, fontSize: 15, color: "#555" }}>Complete your salon profile to activate online bookings.</p>
            <Link to="/salon-setup" style={{ textDecoration: "none", padding: "10px 18px", borderRadius: 12, background: "#111", color: "#FFF", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>Set Up Salon →</Link>
          </div>
        )}

        {/* Stats */}
        <section style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 20 }}>
          {stats.map(item => (
            <article key={item.label} style={{ border: "1px solid #EFEFEF", borderRadius: 18, padding: isMobile ? 14 : 18, background: "#FFF", boxShadow: "0 8px 24px rgba(17,17,17,0.03)", cursor: item.link ? "pointer" : "default" }}
              onClick={() => item.link && navigate(item.link)}>
              <p style={{ margin: 0, fontSize: 12, color: "#666" }}>{item.label}</p>
              <p style={{ margin: "8px 0 6px", fontSize: isMobile ? 24 : 30, fontWeight: 600, letterSpacing: "-0.02em",
                color: (item.label === "WhatsApp AI" || item.label === "Telegram AI") ? (item.value === "Active" ? "#22C55E" : "#111") : "#111"
              }}>{item.value}</p>
              <span style={{ display: "inline-block", fontSize: 11, color: "#111", background: "#F6F2E8", border: "1px solid #E9DFC9", borderRadius: 999, padding: "4px 8px" }}>{item.trend}</span>
            </article>
          ))}
        </section>

        {/* Upgrade banner — hidden once VITE_STRIPE_SOLO_LINK is set and user is on a plan */}
        {import.meta.env.VITE_STRIPE_SOLO_LINK && (
          <div style={{ background: "linear-gradient(135deg,#111 0%,#1A1A1A 100%)", borderRadius: 16, padding: "16px 20px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#FFF" }}>🚀 You&apos;re on the free plan</p>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#AAA" }}>Upgrade to unlock unlimited bookings, reminders and AI agents.</p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              {import.meta.env.VITE_STRIPE_SOLO_LINK && (
                <a href={import.meta.env.VITE_STRIPE_SOLO_LINK} target="_blank" rel="noopener noreferrer" style={{ padding: "9px 16px", borderRadius: 999, background: "#C8A96E", color: "#111", fontSize: 13, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>
                  Solo $19/mo →
                </a>
              )}
              {import.meta.env.VITE_STRIPE_PRO_LINK && (
                <a href={import.meta.env.VITE_STRIPE_PRO_LINK} target="_blank" rel="noopener noreferrer" style={{ padding: "9px 16px", borderRadius: 999, border: "1px solid #444", color: "#EEE", fontSize: 13, fontWeight: 500, textDecoration: "none", whiteSpace: "nowrap" }}>
                  Pro $99/mo
                </a>
              )}
            </div>
          </div>
        )}

        {/* Main grid */}
        <section style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 2fr) minmax(300px, 1fr)", gap: 14, marginBottom: 14 }}>
          {/* Today's appointments */}
          <article style={{ border: "1px solid #EFEFEF", borderRadius: 20, padding: isMobile ? 16 : 20, background: "#FFF" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: isMobile ? 18 : 22, fontWeight: 600 }}>Today&apos;s Appointments</h2>
              <span style={{ background: "#C8A96E", color: "#111", borderRadius: 999, fontSize: 12, padding: "6px 10px", fontWeight: 600 }}>
                {appointments.length} total
              </span>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {appointments.map(item => (
                <div key={item.id} style={{ display: "grid", gridTemplateColumns: isMobile ? "72px 1fr" : "92px 1fr auto", alignItems: "center", gap: isMobile ? 10 : 14, padding: "12px 14px", borderRadius: 14, border: "1px solid #F0F0F0" }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{item.time}</span>
                  <div>
                    <p style={{ margin: 0, fontWeight: 500 }}>{item.client}</p>
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: "#666" }}>{item.service}{item.stylist && isMobile ? ` · ${item.stylist}` : ""}</p>
                  </div>
                  {item.stylist && !isMobile && (
                    <span style={{ fontSize: 12, padding: "5px 9px", borderRadius: 999, border: "1px solid #E9DFC9", background: "#F6F2E8", whiteSpace: "nowrap" }}>{item.stylist}</span>
                  )}
                  <button onClick={() => cancelAppointment(item.id)} disabled={cancellingId === item.id} title="Cancel appointment" style={{ background: "none", border: "none", color: "#CCC", cursor: "pointer", fontSize: 16, padding: "4px 6px", lineHeight: 1, flexShrink: 0 }}>✕</button>
                </div>
              ))}
              {!loadingAppointments && !appointmentsError && appointments.length === 0 && (
                <div style={{ textAlign: "center", padding: "32px 16px" }}>
                  <p style={{ margin: "0 0 12px", fontSize: 15, color: "#666" }}>No appointments for today yet.</p>
                  {bookingUrl && (
                    <button onClick={copyBookingLink} style={{ padding: "10px 20px", borderRadius: 12, background: "#C8A96E", border: "none", color: "#111", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                      Share booking link
                    </button>
                  )}
                </div>
              )}
              {loadingAppointments && <p style={{ margin: 0, color: "#666", fontSize: 14 }}>Loading appointments…</p>}
              {appointmentsError && (
                <div style={{ padding: "12px 16px", borderRadius: 12, background: "#FFF5F5", border: "1px solid #FECACA" }}>
                  <p style={{ margin: 0, color: "#C62828", fontSize: 14 }}>Unable to load appointments: {appointmentsError}</p>
                </div>
              )}
            </div>
          </article>

          {/* AI Analyst */}
          <aside style={{ border: "1px solid #EFEFEF", borderRadius: 20, padding: isMobile ? 16 : 20, background: "#FFF", alignSelf: "start" }}>
            <h2 style={{ margin: 0, fontSize: isMobile ? 18 : 22, fontWeight: 600 }}>AI Analyst</h2>
            <p style={{ margin: "8px 0 16px", color: "#666", fontSize: 14 }}>Smart insights based on your real booking data</p>
            {loadingAI ? (
              <p style={{ margin: 0, color: "#999", fontSize: 14 }}>Analyzing your data…</p>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {aiMessages.map(message => (
                  <div key={message} style={{ border: "1px solid #EFE7D6", background: "#FCFAF5", borderRadius: 14, padding: 12, fontSize: 14, lineHeight: 1.45 }}>
                    {message}
                  </div>
                ))}
              </div>
            )}
          </aside>
        </section>

        {/* Loyalty */}
        {loyalty.length > 0 && (
          <section style={{ border: "1px solid #EFEFEF", borderRadius: 20, padding: isMobile ? 16 : 20, background: "#FFF" }}>
            <h2 style={{ margin: "0 0 16px", fontSize: isMobile ? 18 : 22, fontWeight: 600 }}>Top Clients</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
              {loyalty.map(client => (
                <div key={client.id} style={{ border: "1px solid #F0F0F0", borderRadius: 14, padding: "14px 16px" }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>{client.client_name}</p>
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: "#666" }}>{client.client_phone}</p>
                  <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, background: "#F6F2E8", border: "1px solid #E9DFC9", borderRadius: 999, padding: "4px 10px" }}>
                      {client.visits} visit{client.visits !== 1 ? "s" : ""}
                    </span>
                    <span style={{ fontSize: 12, color: "#999" }}>
                      {client.last_visit ? new Date(client.last_visit).toLocaleDateString("en", { month: "short", day: "numeric" }) : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
