import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

const SERVICE_PRICES = {
  haircut: 50,
  color: 150,
  blowout: 80,
  keratin: 180,
};

const SERVICE_LABELS = {
  haircut: "Haircut",
  color: "Color & Tone",
  blowout: "Blowout",
  keratin: "Keratin Treatment",
};

const MASTER_LABELS = {
  emma: "Emma Wilson",
  olivia: "Olivia Brown",
  mia: "Mia Johnson",
};

const STATUS_BY_TIME = (timeStr) => {
  const [h, m] = timeStr.split(":").map(Number);
  const now = new Date();
  const apptMinutes = h * 60 + m;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  if (nowMinutes > apptMinutes + 60) return "Completed";
  if (nowMinutes >= apptMinutes - 5) return "In progress";
  return "Confirmed";
};

const aiMessages = [
  "3 clients asked for weekend availability. Consider opening one extra slot on Saturday.",
  "Your noon hours are near full capacity. Raise premium service prices by 5-7% next week.",
  "Top add-on today: scalp massage. Bundle it with haircut for higher conversion.",
];

export default function Dashboard() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().split("T")[0];
      const { data, error: err } = await supabase
        .from("appointments")
        .select("*")
        .eq("date", today)
        .order("time", { ascending: true });

      if (err) {
        setError(err.message);
      } else {
        setAppointments(data ?? []);
      }
      setLoading(false);
    }
    load();
  }, []);

  const revenue = appointments.reduce(
    (sum, a) => sum + (SERVICE_PRICES[a.service] ?? 0),
    0
  );
  const avgTicket = appointments.length > 0 ? Math.round(revenue / appointments.length) : 0;

  const stats = [
    { label: "Revenue Today", value: `$${revenue.toLocaleString()}` },
    { label: "Bookings", value: String(appointments.length) },
    { label: "Unique Clients", value: String(new Set(appointments.map((a) => a.phone)).size) },
    { label: "Avg. Ticket", value: avgTicket > 0 ? `$${avgTicket}` : "—" },
  ];

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
              Dashboard
            </h1>
            <p style={{ margin: "8px 0 0", color: "#555", fontSize: 15 }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
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
              to="/login"
              style={{
                textDecoration: "none",
                padding: "10px 14px",
                borderRadius: 999,
                background: "#C8A96E",
                color: "#111",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Logout
            </Link>
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
              <p
                style={{
                  margin: "10px 0 6px",
                  fontSize: 30,
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                }}
              >
                {loading ? (
                  <span
                    style={{
                      display: "inline-block",
                      width: 80,
                      height: 32,
                      background: "#F0F0F0",
                      borderRadius: 8,
                      animation: "pulse 1.5s ease-in-out infinite",
                    }}
                  />
                ) : (
                  item.value
                )}
              </p>
              <span
                style={{
                  display: "inline-block",
                  fontSize: 12,
                  color: "#888",
                  background: "#F6F2E8",
                  border: "1px solid #E9DFC9",
                  borderRadius: 999,
                  padding: "5px 10px",
                }}
              >
                Live
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
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>
                Today&apos;s Appointments
              </h2>
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

            {error ? (
              <p style={{ color: "#C62828", fontSize: 14 }}>
                Failed to load appointments: {error}
              </p>
            ) : loading ? (
              <div style={{ display: "grid", gap: 10 }}>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      height: 64,
                      borderRadius: 14,
                      background: "#F5F5F5",
                    }}
                  />
                ))}
              </div>
            ) : appointments.length === 0 ? (
              <p style={{ color: "#888", fontSize: 14 }}>No appointments today.</p>
            ) : (
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
                      <p style={{ margin: 0, fontWeight: 500 }}>{item.name}</p>
                      <p style={{ margin: "4px 0 0", fontSize: 13, color: "#666" }}>
                        {SERVICE_LABELS[item.service] ?? item.service} ·{" "}
                        {MASTER_LABELS[item.master] ?? item.master}
                      </p>
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        padding: "5px 9px",
                        borderRadius: 999,
                        border: "1px solid #E9DFC9",
                        background: "#F6F2E8",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {STATUS_BY_TIME(item.time)}
                    </span>
                  </div>
                ))}
              </div>
            )}
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
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>AI Messages</h2>
            <p style={{ margin: "8px 0 16px", color: "#666", fontSize: 14 }}>
              Actionable insights generated for today
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
