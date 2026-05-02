import { Link } from "react-router-dom";

export default function Dashboard() {
  const stats = [
    { label: "Revenue Today", value: "$2,480", trend: "+12%" },
    { label: "Bookings", value: "18", trend: "+4" },
    { label: "New Clients", value: "6", trend: "+2" },
    { label: "Avg. Ticket", value: "$138", trend: "+8%" },
  ];

  const appointments = [
    { time: "09:30", client: "Emma Wilson", service: "Color + Blowout", status: "Confirmed" },
    { time: "11:00", client: "Sophia Lee", service: "Haircut", status: "In progress" },
    { time: "13:15", client: "Olivia Brown", service: "Balayage", status: "Confirmed" },
    { time: "16:00", client: "Mia Johnson", service: "Keratin Treatment", status: "Pending" },
  ];

  const aiMessages = [
    "3 clients asked for weekend availability. Consider opening one extra slot on Saturday.",
    "Your noon hours are near full capacity. Raise premium service prices by 5-7% next week.",
    "Top add-on today: scalp massage. Bundle it with haircut for higher conversion.",
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
            <h1 style={{ margin: 0, fontSize: 34, fontWeight: 600, letterSpacing: "-0.02em" }}>Dashboard</h1>
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
                  key={`${item.time}-${item.client}`}
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
