import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { generateInsights } from "../lib/aiAnalyst";

export default function Dashboard() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [appointments, setAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [appointmentsError, setAppointmentsError] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserName(user.user_metadata?.full_name || user.email || "");
    });
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/");
  }
  const [weekCount, setWeekCount] = useState(null);
  const [monthCount, setMonthCount] = useState(null);
  const [aiMessages, setAiMessages] = useState([
    "3 clients asked for weekend availability. Consider opening one extra slot on Saturday.",
    "Your noon hours are near full capacity. Raise premium service prices by 5-7% next week.",
    "Top add-on today: scalp massage. Bundle it with haircut for higher conversion.",
  ]);
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    const dow = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
    const weekStart = monday.toISOString().slice(0, 10);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .slice(0, 10);

    async function loadAll() {
      setLoadingAppointments(true);
      setAppointmentsError("");

      const [todayRes, weekRes, monthRes] = await Promise.all([
        supabase
          .from("appointments")
          .select("id, name, service, time, status, date")
          .eq("date", today)
          .order("time", { ascending: true }),
        supabase
          .from("appointments")
          .select("*", { count: "exact", head: true })
          .gte("date", weekStart)
          .lte("date", today),
        supabase
          .from("appointments")
          .select("*", { count: "exact", head: true })
          .gte("date", monthStart)
          .lte("date", today),
      ]);

      if (todayRes.error) {
        setAppointmentsError(todayRes.error.message || "Failed to load appointments.");
        setAppointments([]);
      } else {
        setAppointments(
          (todayRes.data ?? []).map((item) => ({
            id: item.id,
            client: item.name || "Unknown client",
            service: item.service || "Unknown service",
            time: item.time || "--:--",
            status: item.status || "Pending",
          }))
        );
      }

      setWeekCount(weekRes.count ?? 0);
      setMonthCount(monthRes.count ?? 0);
      setLoadingAppointments(false);
    }

    loadAll();
  }, []);

  useEffect(() => {
    if (weekCount === null || monthCount === null || loadingAppointments) return;

    const insights = generateInsights({
      todayAppointments: appointments,
      weekCount,
      monthCount,
    });
    setAiMessages(insights);
  }, [weekCount, monthCount, appointments, loadingAppointments]);

  const stats = useMemo(
    () => [
      {
        label: "Bookings Today",
        value: loadingAppointments ? "..." : String(appointments.length),
        trend: "Live",
      },
      {
        label: "This Week",
        value: weekCount === null ? "..." : String(weekCount),
        trend: "Mon – Today",
      },
      {
        label: "This Month",
        value: monthCount === null ? "..." : String(monthCount),
        trend: new Date().toLocaleString("en", { month: "long" }),
      },
    ],
    [appointments.length, loadingAppointments, weekCount, monthCount]
  );

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#FFFFFF",
        color: "#111111",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        padding: 32,
      }}
    >
      <div style={{ maxWidth: 1300, margin: "0 auto" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 34, fontWeight: 600, letterSpacing: "-0.02em" }}>
              {userName ? `Hello, ${userName.split(" ")[0]}` : "Dashboard"}
            </h1>
            <p style={{ margin: "8px 0 0", color: "#555", fontSize: 15 }}>
              Clean overview of salon performance and AI insights
            </p>
          </div>

          <nav style={{ display: "flex", gap: 12 }}>
            <Link
              to="/booking"
              style={{
                textDecoration: "none",
                padding: "10px 14px",
                borderRadius: 999,
                border: "1px solid #EAEAEA",
                color: "#111",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              Booking
            </Link>
            <Link
              to="/marketing"
              style={{
                textDecoration: "none",
                padding: "10px 14px",
                borderRadius: 999,
                border: "1px solid #EAEAEA",
                color: "#111",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              📸 Marketing
            </Link>
            <Link
              to="/salon-setup"
              style={{
                textDecoration: "none",
                padding: "10px 14px",
                borderRadius: 999,
                border: "1px solid #EAEAEA",
                color: "#111",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              ⚙️ Salon Setup
            </Link>
            <button
              onClick={handleLogout}
              style={{
                textDecoration: "none",
                padding: "10px 14px",
                borderRadius: 999,
                background: "#C8A96E",
                color: "#111",
                fontSize: 14,
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </nav>
        </header>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14,
            marginBottom: 20,
          }}
        >
          {stats.map((item) => (
            <article
              key={item.label}
              style={{
                border: "1px solid #EFEFEF",
                borderRadius: 18,
                padding: 18,
                background: "#FFF",
                boxShadow: "0 8px 24px rgba(17,17,17,0.03)",
              }}
            >
              <p style={{ margin: 0, fontSize: 13, color: "#666" }}>{item.label}</p>
              <p style={{ margin: "10px 0 6px", fontSize: 30, fontWeight: 600, letterSpacing: "-0.02em" }}>
                {item.value}
              </p>
              <span
                style={{
                  display: "inline-block",
                  fontSize: 12,
                  color: "#111",
                  background: "#F6F2E8",
                  border: "1px solid #E9DFC9",
                  borderRadius: 999,
                  padding: "5px 10px",
                }}
              >
                {item.trend}
              </span>
            </article>
          ))}
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 2fr) minmax(300px, 1fr)",
            gap: 14,
          }}
        >
          <article
            style={{
              border: "1px solid #EFEFEF",
              borderRadius: 20,
              padding: 20,
              background: "#FFF",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>Today&apos;s Appointments</h2>
              <span
                style={{
                  background: "#C8A96E",
                  color: "#111",
                  borderRadius: 999,
                  fontSize: 12,
                  padding: "6px 10px",
                  fontWeight: 600,
                }}
              >
                {appointments.length} total
              </span>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {appointments.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "92px 1fr auto",
                    alignItems: "center",
                    gap: 14,
                    padding: "12px 14px",
                    borderRadius: 14,
                    border: "1px solid #F0F0F0",
                    background: "#FFF",
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{item.time}</span>
                  <div>
                    <p style={{ margin: 0, fontWeight: 500 }}>{item.client}</p>
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: "#666" }}>{item.service}</p>
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      padding: "5px 9px",
                      borderRadius: 999,
                      border: "1px solid #E9DFC9",
                      background: "#F6F2E8",
                    }}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
              {!loadingAppointments && !appointmentsError && appointments.length === 0 ? (
                <p style={{ margin: 0, color: "#666", fontSize: 14 }}>No appointments for today yet.</p>
              ) : null}
              {loadingAppointments ? (
                <p style={{ margin: 0, color: "#666", fontSize: 14 }}>Loading appointments...</p>
              ) : null}
              {appointmentsError ? (
                <p style={{ margin: 0, color: "#C62828", fontSize: 14 }}>{appointmentsError}</p>
              ) : null}
            </div>
          </article>

          <aside
            style={{
              border: "1px solid #EFEFEF",
              borderRadius: 20,
              padding: 20,
              background: "#FFF",
              position: "sticky",
              top: 20,
              alignSelf: "start",
            }}
          >
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>🤖 AI Analyst</h2>
            <p style={{ margin: "8px 0 16px", color: "#666", fontSize: 14 }}>
              Smart insights based on your real booking data
            </p>

            <div style={{ display: "grid", gap: 10 }}>
              {aiMessages.map((message) => (
                <div
                  key={message}
                  style={{
                    border: "1px solid #EFE7D6",
                    background: "#FCFAF5",
                    borderRadius: 14,
                    padding: 12,
                    fontSize: 14,
                    lineHeight: 1.45,
                  }}
                >
                  {message}
                </div>
              ))}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
