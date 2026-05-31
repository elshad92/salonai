import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { generateInsightsAI, generateInsights } from "../lib/aiAnalyst";
import { useIsMobile } from "../lib/useMediaQuery";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function BarChart({ data, color = "#C8A96E", maxLabel = "" }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120 }}>
      {data.map((d) => (
        <div key={d.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 11, color: "#999", fontWeight: 500 }}>{d.value || ""}</span>
          <div style={{
            width: "100%", borderRadius: "6px 6px 0 0",
            background: d.value > 0 ? color : "#F3F3F3",
            height: Math.max((d.value / max) * 80, d.value > 0 ? 6 : 0),
            transition: "height 0.4s ease",
          }} />
          <span style={{ fontSize: 11, color: "#888", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%", textAlign: "center" }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function HBar({ label, value, max, color = "#C8A96E" }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 13, color: "#555", minWidth: 120, flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
      <div style={{ flex: 1, height: 10, background: "#F3F3F3", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ width: pct + "%", height: "100%", background: color, borderRadius: 999, transition: "width 0.5s ease" }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#111", minWidth: 28, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{ border: "1px solid #EFEFEF", borderRadius: 18, padding: "18px 20px", background: "#FFF" }}>
      <p style={{ margin: 0, fontSize: 12, color: "#666" }}>{label}</p>
      <p style={{ margin: "8px 0 6px", fontSize: 30, fontWeight: 600, letterSpacing: "-0.02em", color: accent || "#111" }}>{value}</p>
      {sub && <span style={{ fontSize: 11, color: "#888", background: "#F6F2E8", border: "1px solid #E9DFC9", borderRadius: 999, padding: "3px 8px" }}>{sub}</span>}
    </div>
  );
}

export default function Analyst() {
  const isMobile = useIsMobile();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [salonId, setSalonId] = useState(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data: salon } = await supabase.from("salons").select("id").eq("owner_id", user.id).single();
      if (!salon) { setLoading(false); return; }
      setSalonId(salon.id);

      const since = new Date();
      since.setDate(since.getDate() - 90);
      const { data } = await supabase.from("appointments")
        .select("id, service, master, date, time, name")
        .eq("salon_id", salon.id)
        .gte("date", since.toISOString().slice(0, 10))
        .order("date", { ascending: false });

      setAppointments(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const stats = useMemo(() => {
    if (!appointments.length) return null;

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const dow = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
    const weekStart = monday.toISOString().slice(0, 10);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

    const todayCount = appointments.filter(a => a.date === today).length;
    const weekCount = appointments.filter(a => a.date >= weekStart && a.date <= today).length;
    const monthCount = appointments.filter(a => a.date >= monthStart && a.date <= today).length;
    const totalCount = appointments.length;

    // Repeat clients
    const nameCount = {};
    appointments.forEach(a => { if (a.name) nameCount[a.name] = (nameCount[a.name] || 0) + 1; });
    const repeatClients = Object.values(nameCount).filter(v => v > 1).length;
    const repeatRate = totalCount > 0 ? Math.round((repeatClients / Object.keys(nameCount).length) * 100) : 0;

    // Top services
    const svcCount = {};
    appointments.forEach(a => { if (a.service) svcCount[a.service] = (svcCount[a.service] || 0) + 1; });
    const topServices = Object.entries(svcCount).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value]) => ({ label, value }));

    // Top masters
    const masterCount = {};
    appointments.forEach(a => { if (a.master) masterCount[a.master] = (masterCount[a.master] || 0) + 1; });
    const topMasters = Object.entries(masterCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, value]) => ({ label, value }));

    // By day of week
    const byDow = Array(7).fill(0);
    appointments.forEach(a => {
      if (a.date) byDow[new Date(a.date).getDay()]++;
    });
    const byDowData = DAYS.map((label, i) => ({ label, value: byDow[i] }));

    // Last 8 weeks
    const weeks = [];
    for (let w = 7; w >= 0; w--) {
      const wStart = new Date(monday);
      wStart.setDate(monday.getDate() - w * 7);
      const wEnd = new Date(wStart);
      wEnd.setDate(wStart.getDate() + 6);
      const label = wStart.toLocaleDateString("en", { month: "short", day: "numeric" });
      const value = appointments.filter(a => a.date >= wStart.toISOString().slice(0, 10) && a.date <= wEnd.toISOString().slice(0, 10)).length;
      weeks.push({ label, value });
    }

    return { todayCount, weekCount, monthCount, totalCount, repeatRate, topServices, topMasters, byDowData, weeks };
  }, [appointments]);

  useEffect(() => {
    if (!stats || loading) return;
    setLoadingAI(true);
    const data = {
      todayAppointments: appointments.filter(a => a.date === new Date().toISOString().slice(0, 10)),
      weekCount: stats.weekCount,
      monthCount: stats.monthCount,
    };
    generateInsightsAI(data)
      .then(ai => setInsights(ai && ai.length ? ai : generateInsights(data)))
      .catch(() => setInsights(generateInsights(data)))
      .finally(() => setLoadingAI(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const pad = isMobile ? 16 : 32;

  return (
    <main style={{
      minHeight: "100vh", background: "#FFF", color: "#111",
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: pad,
    }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        <header style={{
          display: "flex", justifyContent: "space-between",
          alignItems: isMobile ? "flex-start" : "center",
          flexDirection: isMobile ? "column" : "row",
          gap: 14, marginBottom: 28,
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: isMobile ? 26 : 34, fontWeight: 600, letterSpacing: "-0.02em" }}>
              📊 AI Analyst
            </h1>
            <p style={{ margin: "8px 0 0", color: "#555", fontSize: 15 }}>Last 90 days · real booking data</p>
          </div>
          <Link to="/dashboard" style={{
            textDecoration: "none", padding: "10px 14px",
            borderRadius: 999, border: "1px solid #EAEAEA",
            color: "#111", fontSize: 14, fontWeight: 500,
          }}>← Dashboard</Link>
        </header>

        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 16px" }}>
            <p style={{ margin: 0, color: "#999", fontSize: 15 }}>Loading your analytics…</p>
          </div>
        ) : !stats ? (
          <div style={{ textAlign: "center", padding: "80px 16px", border: "1px dashed #EAEAEA", borderRadius: 20 }}>
            <p style={{ margin: 0, fontSize: 24 }}>📅</p>
            <p style={{ margin: "12px 0 0", color: "#666", fontSize: 15 }}>No appointments yet in the last 90 days.</p>
            <p style={{ margin: "8px 0 0", color: "#AAA", fontSize: 13 }}>Share your booking link to get started.</p>
          </div>
        ) : (
          <>
            {/* KPI row */}
            <section style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
              <StatCard label="Today" value={stats.todayCount} sub="appointments" />
              <StatCard label="This Week" value={stats.weekCount} sub="Mon – Today" />
              <StatCard label="This Month" value={stats.monthCount} sub={new Date().toLocaleString("en", { month: "long" })} />
              <StatCard label="Repeat Rate" value={stats.repeatRate + "%"} sub="returning clients" accent={stats.repeatRate >= 40 ? "#22C55E" : "#111"} />
            </section>

            {/* Charts row */}
            <section style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14, marginBottom: 14 }}>

              {/* Weekly trend */}
              <div style={{ border: "1px solid #EFEFEF", borderRadius: 20, padding: isMobile ? 16 : 22 }}>
                <h2 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 600 }}>Weekly Trend</h2>
                <BarChart data={stats.weeks} />
              </div>

              {/* By day of week */}
              <div style={{ border: "1px solid #EFEFEF", borderRadius: 20, padding: isMobile ? 16 : 22 }}>
                <h2 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 600 }}>By Day of Week</h2>
                <BarChart data={stats.byDowData} color="#A8C4E0" />
              </div>
            </section>

            <section style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14, marginBottom: 20 }}>

              {/* Top services */}
              {stats.topServices.length > 0 && (
                <div style={{ border: "1px solid #EFEFEF", borderRadius: 20, padding: isMobile ? 16 : 22 }}>
                  <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600 }}>Top Services</h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {stats.topServices.map(d => (
                      <HBar key={d.label} label={d.label} value={d.value} max={stats.topServices[0].value} />
                    ))}
                  </div>
                </div>
              )}

              {/* Top masters */}
              {stats.topMasters.length > 0 && (
                <div style={{ border: "1px solid #EFEFEF", borderRadius: 20, padding: isMobile ? 16 : 22 }}>
                  <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600 }}>Top Stylists</h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {stats.topMasters.map(d => (
                      <HBar key={d.label} label={d.label} value={d.value} max={stats.topMasters[0].value} color="#B5D5B0" />
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* AI Insights */}
            <section style={{ border: "1px solid #EFE7D6", borderRadius: 20, padding: isMobile ? 16 : 22, background: "#FCFAF5" }}>
              <h2 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 600 }}>🤖 AI Insights</h2>
              {loadingAI ? (
                <p style={{ margin: 0, color: "#999", fontSize: 14 }}>Analyzing your data…</p>
              ) : (
                <div style={{ display: "grid", gap: 10, gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }}>
                  {insights.map((msg, i) => (
                    <div key={i} style={{ background: "#FFF", border: "1px solid #EFE7D6", borderRadius: 14, padding: "12px 16px", fontSize: 14, lineHeight: 1.5 }}>
                      {msg}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
